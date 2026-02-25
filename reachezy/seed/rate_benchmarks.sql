-- =============================================================================
-- ReachEzy Rate Benchmarks Seed Data
-- 120 rows: 10 niches x 4 follower buckets x 3 content types
-- Source: INCA 2024 + Wobb industry reports
-- Safe to re-run (ON CONFLICT DO UPDATE).
-- =============================================================================

INSERT INTO rate_benchmarks (niche, follower_bucket, content_type, rate_low, rate_high, source)
VALUES
    -- =========================================================================
    -- Fashion
    -- =========================================================================
    ('Fashion', '5K-10K',   'reel',  1500,  4000,  'INCA 2024 + Wobb'),
    ('Fashion', '5K-10K',   'story',  700,  2000,  'INCA 2024 + Wobb'),
    ('Fashion', '5K-10K',   'post',  1000,  2500,  'INCA 2024 + Wobb'),
    ('Fashion', '10K-25K',  'reel',  4000, 10000,  'INCA 2024 + Wobb'),
    ('Fashion', '10K-25K',  'story', 2000,  5000,  'INCA 2024 + Wobb'),
    ('Fashion', '10K-25K',  'post',  3000,  7000,  'INCA 2024 + Wobb'),
    ('Fashion', '25K-50K',  'reel',  8000, 20000,  'INCA 2024 + Wobb'),
    ('Fashion', '25K-50K',  'story', 4000,  9000,  'INCA 2024 + Wobb'),
    ('Fashion', '25K-50K',  'post',  5000, 12000,  'INCA 2024 + Wobb'),
    ('Fashion', '50K-100K', 'reel', 15000, 40000,  'INCA 2024 + Wobb'),
    ('Fashion', '50K-100K', 'story', 7000, 15000,  'INCA 2024 + Wobb'),
    ('Fashion', '50K-100K', 'post', 10000, 25000,  'INCA 2024 + Wobb'),

    -- =========================================================================
    -- Beauty/Cosmetics
    -- =========================================================================
    ('Beauty/Cosmetics', '5K-10K',   'reel',  2000,  5000,  'INCA 2024 + Wobb'),
    ('Beauty/Cosmetics', '5K-10K',   'story',  800,  2500,  'INCA 2024 + Wobb'),
    ('Beauty/Cosmetics', '5K-10K',   'post',  1200,  3000,  'INCA 2024 + Wobb'),
    ('Beauty/Cosmetics', '10K-25K',  'reel',  5000, 12000,  'INCA 2024 + Wobb'),
    ('Beauty/Cosmetics', '10K-25K',  'story', 2500,  6000,  'INCA 2024 + Wobb'),
    ('Beauty/Cosmetics', '10K-25K',  'post',  3500,  8000,  'INCA 2024 + Wobb'),
    ('Beauty/Cosmetics', '25K-50K',  'reel', 10000, 25000,  'INCA 2024 + Wobb'),
    ('Beauty/Cosmetics', '25K-50K',  'story', 5000, 10000,  'INCA 2024 + Wobb'),
    ('Beauty/Cosmetics', '25K-50K',  'post',  6000, 15000,  'INCA 2024 + Wobb'),
    ('Beauty/Cosmetics', '50K-100K', 'reel', 18000, 50000,  'INCA 2024 + Wobb'),
    ('Beauty/Cosmetics', '50K-100K', 'story', 8000, 18000,  'INCA 2024 + Wobb'),
    ('Beauty/Cosmetics', '50K-100K', 'post', 12000, 30000,  'INCA 2024 + Wobb'),

    -- =========================================================================
    -- Tech
    -- =========================================================================
    ('Tech', '5K-10K',   'reel',  1000,  3000,  'INCA 2024 + Wobb'),
    ('Tech', '5K-10K',   'story',  500,  1500,  'INCA 2024 + Wobb'),
    ('Tech', '5K-10K',   'post',   800,  2000,  'INCA 2024 + Wobb'),
    ('Tech', '10K-25K',  'reel',  3000,  8000,  'INCA 2024 + Wobb'),
    ('Tech', '10K-25K',  'story', 1500,  4000,  'INCA 2024 + Wobb'),
    ('Tech', '10K-25K',  'post',  2000,  5000,  'INCA 2024 + Wobb'),
    ('Tech', '25K-50K',  'reel',  6000, 15000,  'INCA 2024 + Wobb'),
    ('Tech', '25K-50K',  'story', 3000,  7000,  'INCA 2024 + Wobb'),
    ('Tech', '25K-50K',  'post',  4000, 10000,  'INCA 2024 + Wobb'),
    ('Tech', '50K-100K', 'reel', 12000, 35000,  'INCA 2024 + Wobb'),
    ('Tech', '50K-100K', 'story', 6000, 14000,  'INCA 2024 + Wobb'),
    ('Tech', '50K-100K', 'post',  8000, 20000,  'INCA 2024 + Wobb'),

    -- =========================================================================
    -- Fitness/Health
    -- =========================================================================
    ('Fitness/Health', '5K-10K',   'reel',  1200,  3500,  'INCA 2024 + Wobb'),
    ('Fitness/Health', '5K-10K',   'story',  600,  1800,  'INCA 2024 + Wobb'),
    ('Fitness/Health', '5K-10K',   'post',   900,  2200,  'INCA 2024 + Wobb'),
    ('Fitness/Health', '10K-25K',  'reel',  3500,  9000,  'INCA 2024 + Wobb'),
    ('Fitness/Health', '10K-25K',  'story', 1800,  4500,  'INCA 2024 + Wobb'),
    ('Fitness/Health', '10K-25K',  'post',  2500,  6000,  'INCA 2024 + Wobb'),
    ('Fitness/Health', '25K-50K',  'reel',  7000, 18000,  'INCA 2024 + Wobb'),
    ('Fitness/Health', '25K-50K',  'story', 3500,  8000,  'INCA 2024 + Wobb'),
    ('Fitness/Health', '25K-50K',  'post',  4500, 11000,  'INCA 2024 + Wobb'),
    ('Fitness/Health', '50K-100K', 'reel', 14000, 38000,  'INCA 2024 + Wobb'),
    ('Fitness/Health', '50K-100K', 'story', 6500, 14000,  'INCA 2024 + Wobb'),
    ('Fitness/Health', '50K-100K', 'post',  9000, 22000,  'INCA 2024 + Wobb'),

    -- =========================================================================
    -- Food
    -- =========================================================================
    ('Food', '5K-10K',   'reel',  1500,  4000,  'INCA 2024 + Wobb'),
    ('Food', '5K-10K',   'story',  700,  2000,  'INCA 2024 + Wobb'),
    ('Food', '5K-10K',   'post',  1000,  2500,  'INCA 2024 + Wobb'),
    ('Food', '10K-25K',  'reel',  4000, 10000,  'INCA 2024 + Wobb'),
    ('Food', '10K-25K',  'story', 2000,  5000,  'INCA 2024 + Wobb'),
    ('Food', '10K-25K',  'post',  3000,  7000,  'INCA 2024 + Wobb'),
    ('Food', '25K-50K',  'reel',  8000, 20000,  'INCA 2024 + Wobb'),
    ('Food', '25K-50K',  'story', 4000,  9000,  'INCA 2024 + Wobb'),
    ('Food', '25K-50K',  'post',  5000, 12000,  'INCA 2024 + Wobb'),
    ('Food', '50K-100K', 'reel', 15000, 40000,  'INCA 2024 + Wobb'),
    ('Food', '50K-100K', 'story', 7000, 15000,  'INCA 2024 + Wobb'),
    ('Food', '50K-100K', 'post', 10000, 25000,  'INCA 2024 + Wobb'),

    -- =========================================================================
    -- Travel
    -- =========================================================================
    ('Travel', '5K-10K',   'reel',  1500,  4500,  'INCA 2024 + Wobb'),
    ('Travel', '5K-10K',   'story',  700,  2200,  'INCA 2024 + Wobb'),
    ('Travel', '5K-10K',   'post',  1000,  2800,  'INCA 2024 + Wobb'),
    ('Travel', '10K-25K',  'reel',  4500, 11000,  'INCA 2024 + Wobb'),
    ('Travel', '10K-25K',  'story', 2200,  5500,  'INCA 2024 + Wobb'),
    ('Travel', '10K-25K',  'post',  3000,  7500,  'INCA 2024 + Wobb'),
    ('Travel', '25K-50K',  'reel',  9000, 22000,  'INCA 2024 + Wobb'),
    ('Travel', '25K-50K',  'story', 4500, 10000,  'INCA 2024 + Wobb'),
    ('Travel', '25K-50K',  'post',  5500, 13000,  'INCA 2024 + Wobb'),
    ('Travel', '50K-100K', 'reel', 16000, 45000,  'INCA 2024 + Wobb'),
    ('Travel', '50K-100K', 'story', 7500, 16000,  'INCA 2024 + Wobb'),
    ('Travel', '50K-100K', 'post', 10000, 28000,  'INCA 2024 + Wobb'),

    -- =========================================================================
    -- Education
    -- =========================================================================
    ('Education', '5K-10K',   'reel',   800,  2500,  'INCA 2024 + Wobb'),
    ('Education', '5K-10K',   'story',  400,  1200,  'INCA 2024 + Wobb'),
    ('Education', '5K-10K',   'post',   600,  1800,  'INCA 2024 + Wobb'),
    ('Education', '10K-25K',  'reel',  2500,  7000,  'INCA 2024 + Wobb'),
    ('Education', '10K-25K',  'story', 1200,  3500,  'INCA 2024 + Wobb'),
    ('Education', '10K-25K',  'post',  1800,  5000,  'INCA 2024 + Wobb'),
    ('Education', '25K-50K',  'reel',  5000, 14000,  'INCA 2024 + Wobb'),
    ('Education', '25K-50K',  'story', 2500,  6500,  'INCA 2024 + Wobb'),
    ('Education', '25K-50K',  'post',  3500,  9000,  'INCA 2024 + Wobb'),
    ('Education', '50K-100K', 'reel', 10000, 30000,  'INCA 2024 + Wobb'),
    ('Education', '50K-100K', 'story', 5000, 12000,  'INCA 2024 + Wobb'),
    ('Education', '50K-100K', 'post',  7000, 18000,  'INCA 2024 + Wobb'),

    -- =========================================================================
    -- Comedy/Entertainment
    -- =========================================================================
    ('Comedy/Entertainment', '5K-10K',   'reel',  1500,  4500,  'INCA 2024 + Wobb'),
    ('Comedy/Entertainment', '5K-10K',   'story',  700,  2000,  'INCA 2024 + Wobb'),
    ('Comedy/Entertainment', '5K-10K',   'post',  1000,  2800,  'INCA 2024 + Wobb'),
    ('Comedy/Entertainment', '10K-25K',  'reel',  4500, 12000,  'INCA 2024 + Wobb'),
    ('Comedy/Entertainment', '10K-25K',  'story', 2000,  5500,  'INCA 2024 + Wobb'),
    ('Comedy/Entertainment', '10K-25K',  'post',  3000,  8000,  'INCA 2024 + Wobb'),
    ('Comedy/Entertainment', '25K-50K',  'reel',  9000, 25000,  'INCA 2024 + Wobb'),
    ('Comedy/Entertainment', '25K-50K',  'story', 4500, 10000,  'INCA 2024 + Wobb'),
    ('Comedy/Entertainment', '25K-50K',  'post',  6000, 14000,  'INCA 2024 + Wobb'),
    ('Comedy/Entertainment', '50K-100K', 'reel', 18000, 50000,  'INCA 2024 + Wobb'),
    ('Comedy/Entertainment', '50K-100K', 'story', 8000, 18000,  'INCA 2024 + Wobb'),
    ('Comedy/Entertainment', '50K-100K', 'post', 12000, 30000,  'INCA 2024 + Wobb'),

    -- =========================================================================
    -- Lifestyle
    -- =========================================================================
    ('Lifestyle', '5K-10K',   'reel',  1200,  3500,  'INCA 2024 + Wobb'),
    ('Lifestyle', '5K-10K',   'story',  600,  1800,  'INCA 2024 + Wobb'),
    ('Lifestyle', '5K-10K',   'post',   900,  2200,  'INCA 2024 + Wobb'),
    ('Lifestyle', '10K-25K',  'reel',  3500,  9000,  'INCA 2024 + Wobb'),
    ('Lifestyle', '10K-25K',  'story', 1800,  4500,  'INCA 2024 + Wobb'),
    ('Lifestyle', '10K-25K',  'post',  2500,  6000,  'INCA 2024 + Wobb'),
    ('Lifestyle', '25K-50K',  'reel',  7000, 18000,  'INCA 2024 + Wobb'),
    ('Lifestyle', '25K-50K',  'story', 3500,  8000,  'INCA 2024 + Wobb'),
    ('Lifestyle', '25K-50K',  'post',  4500, 11000,  'INCA 2024 + Wobb'),
    ('Lifestyle', '50K-100K', 'reel', 14000, 38000,  'INCA 2024 + Wobb'),
    ('Lifestyle', '50K-100K', 'story', 6500, 14000,  'INCA 2024 + Wobb'),
    ('Lifestyle', '50K-100K', 'post',  9000, 22000,  'INCA 2024 + Wobb'),

    -- =========================================================================
    -- Parenting
    -- =========================================================================
    ('Parenting', '5K-10K',   'reel',  1000,  3000,  'INCA 2024 + Wobb'),
    ('Parenting', '5K-10K',   'story',  500,  1500,  'INCA 2024 + Wobb'),
    ('Parenting', '5K-10K',   'post',   800,  2000,  'INCA 2024 + Wobb'),
    ('Parenting', '10K-25K',  'reel',  3000,  8000,  'INCA 2024 + Wobb'),
    ('Parenting', '10K-25K',  'story', 1500,  4000,  'INCA 2024 + Wobb'),
    ('Parenting', '10K-25K',  'post',  2000,  5500,  'INCA 2024 + Wobb'),
    ('Parenting', '25K-50K',  'reel',  6000, 16000,  'INCA 2024 + Wobb'),
    ('Parenting', '25K-50K',  'story', 3000,  7500,  'INCA 2024 + Wobb'),
    ('Parenting', '25K-50K',  'post',  4000, 10000,  'INCA 2024 + Wobb'),
    ('Parenting', '50K-100K', 'reel', 12000, 35000,  'INCA 2024 + Wobb'),
    ('Parenting', '50K-100K', 'story', 5500, 13000,  'INCA 2024 + Wobb'),
    ('Parenting', '50K-100K', 'post',  8000, 20000,  'INCA 2024 + Wobb')

ON CONFLICT (niche, follower_bucket, content_type) DO UPDATE SET
    rate_low  = EXCLUDED.rate_low,
    rate_high = EXCLUDED.rate_high,
    source    = EXCLUDED.source;
