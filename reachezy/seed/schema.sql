-- =============================================================================
-- ReachEzy Database Schema
-- Run once to create all tables, indexes, and views.
-- Requires PostgreSQL with pgcrypto and pgvector extensions.
-- =============================================================================

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "vector";

-- =============================================================================
-- F1: Creators
-- =============================================================================
CREATE TABLE IF NOT EXISTS creators (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cognito_sub VARCHAR(255) UNIQUE NOT NULL,
    instagram_id VARCHAR(50) UNIQUE,
    username VARCHAR(50) NOT NULL,
    display_name VARCHAR(100),
    bio TEXT,
    followers_count INT,
    media_count INT,
    profile_picture_url TEXT,
    niche VARCHAR(50),
    niche_is_custom BOOLEAN DEFAULT FALSE,
    city VARCHAR(100),
    style_profile JSONB,
    mediakit_views INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_creators_username ON creators(username);
CREATE INDEX IF NOT EXISTS idx_creators_niche ON creators(niche);

-- =============================================================================
-- F2: Video Uploads
-- =============================================================================
CREATE TABLE IF NOT EXISTS video_uploads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    creator_id UUID REFERENCES creators(id) ON DELETE CASCADE,
    s3_key TEXT NOT NULL,
    duration_seconds INT,
    file_size_bytes BIGINT,
    status VARCHAR(20) DEFAULT 'uploaded',
    created_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_video_uploads_creator ON video_uploads(creator_id);

-- =============================================================================
-- F3: Video Analyses
-- =============================================================================
CREATE TABLE IF NOT EXISTS video_analyses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    video_id UUID REFERENCES video_uploads(id) ON DELETE CASCADE UNIQUE,
    creator_id UUID REFERENCES creators(id) ON DELETE CASCADE,
    energy_level VARCHAR(20),
    aesthetic VARCHAR(20),
    setting VARCHAR(20),
    production_quality VARCHAR(20),
    content_type VARCHAR(30),
    topics JSONB,
    dominant_colors JSONB,
    has_text_overlay BOOLEAN,
    face_visible BOOLEAN,
    summary TEXT,
    raw_llm_response JSONB,
    analyzed_at TIMESTAMP DEFAULT NOW(),
    created_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_video_analyses_video ON video_analyses(video_id);
CREATE INDEX IF NOT EXISTS idx_video_analyses_creator ON video_analyses(creator_id);

-- =============================================================================
-- F3: Video Embeddings (pgvector)
-- =============================================================================
CREATE TABLE IF NOT EXISTS video_embeddings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    video_id UUID REFERENCES video_uploads(id) ON DELETE CASCADE,
    creator_id UUID REFERENCES creators(id) ON DELETE CASCADE,
    embedding vector(1024),
    embedding_input TEXT,
    is_creator_aggregate BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_embeddings_hnsw ON video_embeddings USING hnsw (embedding vector_cosine_ops);
CREATE UNIQUE INDEX IF NOT EXISTS idx_creator_aggregate_embedding ON video_embeddings (creator_id) WHERE is_creator_aggregate = TRUE;

-- =============================================================================
-- F5: Rate Cards
-- =============================================================================
CREATE TABLE IF NOT EXISTS rate_cards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    creator_id UUID REFERENCES creators(id) ON DELETE CASCADE UNIQUE,
    niche VARCHAR(50),
    follower_bucket VARCHAR(20),
    reel_rate INT,
    story_rate INT,
    post_rate INT,
    is_outlier BOOLEAN DEFAULT FALSE,
    accepts_barter BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_rate_cards_bucket ON rate_cards(niche, follower_bucket);

-- =============================================================================
-- F5: Rate Benchmarks (seed data)
-- =============================================================================
CREATE TABLE IF NOT EXISTS rate_benchmarks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    niche VARCHAR(50) NOT NULL,
    follower_bucket VARCHAR(20) NOT NULL,
    content_type VARCHAR(20) NOT NULL,
    rate_low INT NOT NULL,
    rate_high INT NOT NULL,
    source VARCHAR(100) DEFAULT 'INCA 2024 + Wobb',
    UNIQUE(niche, follower_bucket, content_type)
);

-- =============================================================================
-- F5: Live Percentile View
-- =============================================================================
CREATE OR REPLACE VIEW rate_percentiles AS
SELECT niche, follower_bucket, 'reel' AS content_type, COUNT(*) AS sample_size,
    PERCENTILE_CONT(0.25) WITHIN GROUP (ORDER BY reel_rate) AS p25,
    PERCENTILE_CONT(0.50) WITHIN GROUP (ORDER BY reel_rate) AS p50,
    PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY reel_rate) AS p75
FROM rate_cards WHERE is_outlier = FALSE AND reel_rate IS NOT NULL
GROUP BY niche, follower_bucket
UNION ALL
SELECT niche, follower_bucket, 'story', COUNT(*),
    PERCENTILE_CONT(0.25) WITHIN GROUP (ORDER BY story_rate),
    PERCENTILE_CONT(0.50) WITHIN GROUP (ORDER BY story_rate),
    PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY story_rate)
FROM rate_cards WHERE is_outlier = FALSE AND story_rate IS NOT NULL
GROUP BY niche, follower_bucket
UNION ALL
SELECT niche, follower_bucket, 'post', COUNT(*),
    PERCENTILE_CONT(0.25) WITHIN GROUP (ORDER BY post_rate),
    PERCENTILE_CONT(0.50) WITHIN GROUP (ORDER BY post_rate),
    PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY post_rate)
FROM rate_cards WHERE is_outlier = FALSE AND post_rate IS NOT NULL
GROUP BY niche, follower_bucket;

-- =============================================================================
-- F4: Media Kits
-- =============================================================================
CREATE TABLE IF NOT EXISTS media_kits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    creator_id UUID REFERENCES creators(id) ON DELETE CASCADE UNIQUE,
    pdf_s3_key TEXT,
    last_generated_at TIMESTAMP DEFAULT NOW()
);
