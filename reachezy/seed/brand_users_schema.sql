-- ============================================================
-- ReachEzy: Unified Users + Brand Wishlists Schema
-- Run AFTER schema.sql (requires creators table to exist)
-- ============================================================

-- Unified auth table for brands and creators
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(64) NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('creator', 'brand')),
    creator_id UUID REFERENCES creators(id) ON DELETE SET NULL,
    company_name VARCHAR(200),
    industry VARCHAR(100),
    city VARCHAR(100),
    contact_name VARCHAR(200),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_creator_id ON users(creator_id);

-- Brand wishlist: brands save creators they're interested in
CREATE TABLE IF NOT EXISTS brand_wishlists (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    creator_id UUID REFERENCES creators(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, creator_id)
);

CREATE INDEX IF NOT EXISTS idx_brand_wishlists_user ON brand_wishlists(user_id);
CREATE INDEX IF NOT EXISTS idx_brand_wishlists_creator ON brand_wishlists(creator_id);
