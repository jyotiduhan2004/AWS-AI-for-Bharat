-- =============================================================================
-- ReachEzy Demo Creators Seed Data
-- 8 demo creators with realistic Indian influencer profiles.
-- Each creator gets: creators row, rate_cards row, 3 video_uploads, 3 video_analyses.
-- Uses subqueries for FK references so order does not matter.
-- Wrapped in BEGIN/COMMIT for transactional safety.
-- =============================================================================

BEGIN;

-- =============================================================================
-- 1. priyabeauty — Priya Sharma, Beauty/Cosmetics, Lucknow, 30K followers
-- =============================================================================
INSERT INTO creators (cognito_sub, instagram_id, username, display_name, bio, followers_count, media_count, profile_picture_url, niche, city, style_profile, mediakit_views)
VALUES (
    'demo_priyabeauty',
    'demo_ig_priyabeauty',
    'priyabeauty',
    'Priya Sharma',
    'Beauty enthusiast sharing skincare routines, makeup tutorials & affordable glam tips for Indian skin tones.',
    30000, 245,
    'https://demo.reachezy.in/avatars/priyabeauty.jpg',
    'Beauty/Cosmetics', 'Lucknow',
    '{
        "energy_level": "high",
        "aesthetic": "vibrant",
        "setting": "indoor",
        "production_quality": "decent",
        "content_type": "tutorial",
        "consistency_score": 88,
        "dominant_colors": ["#E91E63", "#FF9800", "#FFEB3B"],
        "topics": ["skincare", "makeup", "beauty", "indianskin", "affordable"],
        "face_visible": true,
        "has_text_overlay": true
    }'::jsonb,
    12
)
ON CONFLICT (username) DO NOTHING;

INSERT INTO rate_cards (creator_id, niche, follower_bucket, reel_rate, story_rate, post_rate, accepts_barter)
VALUES (
    (SELECT id FROM creators WHERE username = 'priyabeauty'),
    'Beauty/Cosmetics', '25K-50K', 8000, 3500, 5000, TRUE
)
ON CONFLICT (creator_id) DO UPDATE SET
    reel_rate = EXCLUDED.reel_rate, story_rate = EXCLUDED.story_rate, post_rate = EXCLUDED.post_rate;

-- Videos for priyabeauty
INSERT INTO video_uploads (creator_id, s3_key, duration_seconds, file_size_bytes, status)
VALUES
    ((SELECT id FROM creators WHERE username = 'priyabeauty'), 'demo/priyabeauty/video_1/demo.mp4', 45, 12500000, 'completed'),
    ((SELECT id FROM creators WHERE username = 'priyabeauty'), 'demo/priyabeauty/video_2/demo.mp4', 60, 18200000, 'completed'),
    ((SELECT id FROM creators WHERE username = 'priyabeauty'), 'demo/priyabeauty/video_3/demo.mp4', 30, 8700000,  'completed');

-- Analyses for priyabeauty
INSERT INTO video_analyses (video_id, creator_id, energy_level, aesthetic, setting, production_quality, content_type, topics, dominant_colors, has_text_overlay, face_visible, summary, raw_llm_response)
VALUES
    (
        (SELECT id FROM video_uploads WHERE s3_key = 'demo/priyabeauty/video_1/demo.mp4'),
        (SELECT id FROM creators WHERE username = 'priyabeauty'),
        'high', 'vibrant', 'indoor', 'decent', 'tutorial',
        '["skincare", "nightRoutine", "affordable", "indianskin"]'::jsonb,
        '["#E91E63", "#FF9800", "#FFFFFF"]'::jsonb,
        TRUE, TRUE,
        'Priya walks through a 5-step nighttime skincare routine using affordable Indian drugstore products, focusing on hydration for dry winter skin.',
        '{"model": "demo", "confidence": 0.92}'::jsonb
    ),
    (
        (SELECT id FROM video_uploads WHERE s3_key = 'demo/priyabeauty/video_2/demo.mp4'),
        (SELECT id FROM creators WHERE username = 'priyabeauty'),
        'high', 'vibrant', 'indoor', 'decent', 'tutorial',
        '["makeup", "festive", "diwaliLook", "indianskin"]'::jsonb,
        '["#FFD700", "#E91E63", "#4A148C"]'::jsonb,
        TRUE, TRUE,
        'A festive Diwali glam tutorial featuring gold and pink tones, with product recommendations under Rs 500 each.',
        '{"model": "demo", "confidence": 0.89}'::jsonb
    ),
    (
        (SELECT id FROM video_uploads WHERE s3_key = 'demo/priyabeauty/video_3/demo.mp4'),
        (SELECT id FROM creators WHERE username = 'priyabeauty'),
        'high', 'vibrant', 'indoor', 'decent', 'tutorial',
        '["skincare", "sunscreen", "beauty", "review"]'::jsonb,
        '["#FFF9C4", "#FFEB3B", "#E91E63"]'::jsonb,
        TRUE, TRUE,
        'Honest review of 5 popular Indian sunscreens, testing texture, white cast, and SPF claims on medium Indian skin.',
        '{"model": "demo", "confidence": 0.91}'::jsonb
    );


-- =============================================================================
-- 2. rahulfashion — Rahul Verma, Fashion, Mumbai, 55K followers
-- =============================================================================
INSERT INTO creators (cognito_sub, instagram_id, username, display_name, bio, followers_count, media_count, profile_picture_url, niche, city, style_profile, mediakit_views)
VALUES (
    'demo_rahulfashion',
    'demo_ig_rahulfashion',
    'rahulfashion',
    'Rahul Verma',
    'Mumbai-based style curator. Streetwear meets desi swag. Collab DMs open.',
    55000, 412,
    'https://demo.reachezy.in/avatars/rahulfashion.jpg',
    'Fashion', 'Mumbai',
    '{
        "energy_level": "moderate",
        "aesthetic": "professional",
        "setting": "mixed",
        "production_quality": "polished",
        "content_type": "lifestyle",
        "consistency_score": 92,
        "dominant_colors": ["#212121", "#FFFFFF", "#1565C0"],
        "topics": ["fashion", "streetwear", "mensfashion", "style"],
        "face_visible": true,
        "has_text_overlay": false
    }'::jsonb,
    34
)
ON CONFLICT (username) DO NOTHING;

INSERT INTO rate_cards (creator_id, niche, follower_bucket, reel_rate, story_rate, post_rate, accepts_barter)
VALUES (
    (SELECT id FROM creators WHERE username = 'rahulfashion'),
    'Fashion', '50K-100K', 18000, 8000, 12000, FALSE
)
ON CONFLICT (creator_id) DO UPDATE SET
    reel_rate = EXCLUDED.reel_rate, story_rate = EXCLUDED.story_rate, post_rate = EXCLUDED.post_rate;

INSERT INTO video_uploads (creator_id, s3_key, duration_seconds, file_size_bytes, status)
VALUES
    ((SELECT id FROM creators WHERE username = 'rahulfashion'), 'demo/rahulfashion/video_1/demo.mp4', 55, 16800000, 'completed'),
    ((SELECT id FROM creators WHERE username = 'rahulfashion'), 'demo/rahulfashion/video_2/demo.mp4', 40, 13200000, 'completed'),
    ((SELECT id FROM creators WHERE username = 'rahulfashion'), 'demo/rahulfashion/video_3/demo.mp4', 35, 10500000, 'completed');

INSERT INTO video_analyses (video_id, creator_id, energy_level, aesthetic, setting, production_quality, content_type, topics, dominant_colors, has_text_overlay, face_visible, summary, raw_llm_response)
VALUES
    (
        (SELECT id FROM video_uploads WHERE s3_key = 'demo/rahulfashion/video_1/demo.mp4'),
        (SELECT id FROM creators WHERE username = 'rahulfashion'),
        'moderate', 'professional', 'outdoor', 'polished', 'lifestyle',
        '["streetwear", "ootd", "mensfashion", "mumbai"]'::jsonb,
        '["#212121", "#FFFFFF", "#FF5722"]'::jsonb,
        FALSE, TRUE,
        'Rahul showcases a curated streetwear look shot on the streets of Bandra, pairing oversized silhouettes with Indian accessories.',
        '{"model": "demo", "confidence": 0.94}'::jsonb
    ),
    (
        (SELECT id FROM video_uploads WHERE s3_key = 'demo/rahulfashion/video_2/demo.mp4'),
        (SELECT id FROM creators WHERE username = 'rahulfashion'),
        'moderate', 'professional', 'indoor', 'polished', 'lifestyle',
        '["fashion", "wardrobe", "essentials", "style"]'::jsonb,
        '["#ECEFF1", "#1565C0", "#212121"]'::jsonb,
        FALSE, TRUE,
        'A wardrobe essentials guide for Indian men covering 10 versatile pieces that work across casual and semi-formal settings.',
        '{"model": "demo", "confidence": 0.90}'::jsonb
    ),
    (
        (SELECT id FROM video_uploads WHERE s3_key = 'demo/rahulfashion/video_3/demo.mp4'),
        (SELECT id FROM creators WHERE username = 'rahulfashion'),
        'moderate', 'professional', 'mixed', 'polished', 'lifestyle',
        '["fashion", "sneakers", "mensfashion", "haul"]'::jsonb,
        '["#212121", "#F5F5F5", "#E53935"]'::jsonb,
        FALSE, TRUE,
        'Sneaker haul and styling tips featuring 4 new pairs, each styled into complete outfits for different occasions.',
        '{"model": "demo", "confidence": 0.88}'::jsonb
    );


-- =============================================================================
-- 3. ananyafood — Ananya Reddy, Food, Bangalore, 15K followers
-- =============================================================================
INSERT INTO creators (cognito_sub, instagram_id, username, display_name, bio, followers_count, media_count, profile_picture_url, niche, city, style_profile, mediakit_views)
VALUES (
    'demo_ananyafood',
    'demo_ig_ananyafood',
    'ananyafood',
    'Ananya Reddy',
    'South Indian home cook sharing family recipes, quick meals & honest restaurant reviews from Bangalore.',
    15000, 178,
    'https://demo.reachezy.in/avatars/ananyafood.jpg',
    'Food', 'Bangalore',
    '{
        "energy_level": "high",
        "aesthetic": "vibrant",
        "setting": "indoor",
        "production_quality": "decent",
        "content_type": "vlog",
        "consistency_score": 82,
        "dominant_colors": ["#FF9800", "#4CAF50", "#FFEB3B"],
        "topics": ["food", "cooking", "southindian", "recipes", "homecooking"],
        "face_visible": true,
        "has_text_overlay": true
    }'::jsonb,
    8
)
ON CONFLICT (username) DO NOTHING;

INSERT INTO rate_cards (creator_id, niche, follower_bucket, reel_rate, story_rate, post_rate, accepts_barter)
VALUES (
    (SELECT id FROM creators WHERE username = 'ananyafood'),
    'Food', '10K-25K', 4500, 2000, 3000, TRUE
)
ON CONFLICT (creator_id) DO UPDATE SET
    reel_rate = EXCLUDED.reel_rate, story_rate = EXCLUDED.story_rate, post_rate = EXCLUDED.post_rate;

INSERT INTO video_uploads (creator_id, s3_key, duration_seconds, file_size_bytes, status)
VALUES
    ((SELECT id FROM creators WHERE username = 'ananyafood'), 'demo/ananyafood/video_1/demo.mp4', 75, 22500000, 'completed'),
    ((SELECT id FROM creators WHERE username = 'ananyafood'), 'demo/ananyafood/video_2/demo.mp4', 50, 14800000, 'completed'),
    ((SELECT id FROM creators WHERE username = 'ananyafood'), 'demo/ananyafood/video_3/demo.mp4', 40, 11200000, 'completed');

INSERT INTO video_analyses (video_id, creator_id, energy_level, aesthetic, setting, production_quality, content_type, topics, dominant_colors, has_text_overlay, face_visible, summary, raw_llm_response)
VALUES
    (
        (SELECT id FROM video_uploads WHERE s3_key = 'demo/ananyafood/video_1/demo.mp4'),
        (SELECT id FROM creators WHERE username = 'ananyafood'),
        'high', 'vibrant', 'indoor', 'decent', 'vlog',
        '["southindian", "dosa", "homecooking", "breakfast"]'::jsonb,
        '["#FF9800", "#4CAF50", "#FFF8E1"]'::jsonb,
        TRUE, TRUE,
        'Ananya demonstrates her grandmother''s crispy ghee dosa recipe with three chutneys, filmed in her cozy Bangalore kitchen.',
        '{"model": "demo", "confidence": 0.87}'::jsonb
    ),
    (
        (SELECT id FROM video_uploads WHERE s3_key = 'demo/ananyafood/video_2/demo.mp4'),
        (SELECT id FROM creators WHERE username = 'ananyafood'),
        'high', 'vibrant', 'indoor', 'decent', 'vlog',
        '["food", "mealprep", "lunchbox", "recipes"]'::jsonb,
        '["#FFEB3B", "#8BC34A", "#FF5722"]'::jsonb,
        TRUE, TRUE,
        'A week of Indian lunchbox meal preps: five different rice bowls that stay fresh and taste great reheated.',
        '{"model": "demo", "confidence": 0.85}'::jsonb
    ),
    (
        (SELECT id FROM video_uploads WHERE s3_key = 'demo/ananyafood/video_3/demo.mp4'),
        (SELECT id FROM creators WHERE username = 'ananyafood'),
        'high', 'vibrant', 'outdoor', 'decent', 'vlog',
        '["food", "streetfood", "bangalore", "review"]'::jsonb,
        '["#FF9800", "#F44336", "#FFEB3B"]'::jsonb,
        TRUE, TRUE,
        'Street food crawl through VV Puram, Bangalore covering six iconic stalls from dosa to churmuri to fresh sugarcane juice.',
        '{"model": "demo", "confidence": 0.90}'::jsonb
    );


-- =============================================================================
-- 4. vikramfitness — Vikram Singh, Fitness/Health, Delhi, 42K followers
-- =============================================================================
INSERT INTO creators (cognito_sub, instagram_id, username, display_name, bio, followers_count, media_count, profile_picture_url, niche, city, style_profile, mediakit_views)
VALUES (
    'demo_vikramfitness',
    'demo_ig_vikramfitness',
    'vikramfitness',
    'Vikram Singh',
    'ACE Certified PT. No shortcuts, just science. Fitness for the desi body. Delhi gyms & outdoor workouts.',
    42000, 310,
    'https://demo.reachezy.in/avatars/vikramfitness.jpg',
    'Fitness/Health', 'Delhi',
    '{
        "energy_level": "chaotic",
        "aesthetic": "minimal",
        "setting": "mixed",
        "production_quality": "decent",
        "content_type": "tutorial",
        "consistency_score": 79,
        "dominant_colors": ["#212121", "#F44336", "#FFFFFF"],
        "topics": ["fitness", "gym", "workout", "health", "bodybuilding"],
        "face_visible": true,
        "has_text_overlay": true
    }'::jsonb,
    22
)
ON CONFLICT (username) DO NOTHING;

INSERT INTO rate_cards (creator_id, niche, follower_bucket, reel_rate, story_rate, post_rate, accepts_barter)
VALUES (
    (SELECT id FROM creators WHERE username = 'vikramfitness'),
    'Fitness/Health', '25K-50K', 10000, 5000, 7000, TRUE
)
ON CONFLICT (creator_id) DO UPDATE SET
    reel_rate = EXCLUDED.reel_rate, story_rate = EXCLUDED.story_rate, post_rate = EXCLUDED.post_rate;

INSERT INTO video_uploads (creator_id, s3_key, duration_seconds, file_size_bytes, status)
VALUES
    ((SELECT id FROM creators WHERE username = 'vikramfitness'), 'demo/vikramfitness/video_1/demo.mp4', 65, 19500000, 'completed'),
    ((SELECT id FROM creators WHERE username = 'vikramfitness'), 'demo/vikramfitness/video_2/demo.mp4', 50, 15600000, 'completed'),
    ((SELECT id FROM creators WHERE username = 'vikramfitness'), 'demo/vikramfitness/video_3/demo.mp4', 35, 10200000, 'completed');

INSERT INTO video_analyses (video_id, creator_id, energy_level, aesthetic, setting, production_quality, content_type, topics, dominant_colors, has_text_overlay, face_visible, summary, raw_llm_response)
VALUES
    (
        (SELECT id FROM video_uploads WHERE s3_key = 'demo/vikramfitness/video_1/demo.mp4'),
        (SELECT id FROM creators WHERE username = 'vikramfitness'),
        'chaotic', 'minimal', 'indoor', 'decent', 'tutorial',
        '["gym", "chestDay", "workout", "bodybuilding"]'::jsonb,
        '["#212121", "#F44336", "#BDBDBD"]'::jsonb,
        TRUE, TRUE,
        'Vikram breaks down a chest and triceps push day with form tips, filmed raw at a Delhi commercial gym.',
        '{"model": "demo", "confidence": 0.86}'::jsonb
    ),
    (
        (SELECT id FROM video_uploads WHERE s3_key = 'demo/vikramfitness/video_2/demo.mp4'),
        (SELECT id FROM creators WHERE username = 'vikramfitness'),
        'chaotic', 'minimal', 'outdoor', 'decent', 'tutorial',
        '["fitness", "calisthenics", "outdoor", "noGym"]'::jsonb,
        '["#4CAF50", "#FFFFFF", "#212121"]'::jsonb,
        TRUE, TRUE,
        'Outdoor calisthenics routine in Lodhi Garden using only bodyweight: pull-ups, dips, and pistol squats for beginners.',
        '{"model": "demo", "confidence": 0.84}'::jsonb
    ),
    (
        (SELECT id FROM video_uploads WHERE s3_key = 'demo/vikramfitness/video_3/demo.mp4'),
        (SELECT id FROM creators WHERE username = 'vikramfitness'),
        'chaotic', 'minimal', 'indoor', 'decent', 'tutorial',
        '["health", "nutrition", "diet", "indianFood"]'::jsonb,
        '["#FF9800", "#FFFFFF", "#F44336"]'::jsonb,
        TRUE, TRUE,
        'Myth-busting Indian diet advice: Vikram explains why roti is not the enemy and breaks down macro-friendly desi meals.',
        '{"model": "demo", "confidence": 0.88}'::jsonb
    );


-- =============================================================================
-- 5. snehacomedy — Sneha Patel, Comedy/Entertainment, Ahmedabad, 80K followers
-- =============================================================================
INSERT INTO creators (cognito_sub, instagram_id, username, display_name, bio, followers_count, media_count, profile_picture_url, niche, city, style_profile, mediakit_views)
VALUES (
    'demo_snehacomedy',
    'demo_ig_snehacomedy',
    'snehacomedy',
    'Sneha Patel',
    'Gujju girl making reels your masi will forward. Comedy, satire & desi observations. Brands: DM or email.',
    80000, 520,
    'https://demo.reachezy.in/avatars/snehacomedy.jpg',
    'Comedy/Entertainment', 'Ahmedabad',
    '{
        "energy_level": "chaotic",
        "aesthetic": "desi",
        "setting": "indoor",
        "production_quality": "raw",
        "content_type": "comedy",
        "consistency_score": 85,
        "dominant_colors": ["#FFEB3B", "#E91E63", "#FF5722"],
        "topics": ["comedy", "funny", "relatable", "desi", "humor"],
        "face_visible": true,
        "has_text_overlay": true
    }'::jsonb,
    67
)
ON CONFLICT (username) DO NOTHING;

INSERT INTO rate_cards (creator_id, niche, follower_bucket, reel_rate, story_rate, post_rate, accepts_barter)
VALUES (
    (SELECT id FROM creators WHERE username = 'snehacomedy'),
    'Comedy/Entertainment', '50K-100K', 25000, 10000, 15000, FALSE
)
ON CONFLICT (creator_id) DO UPDATE SET
    reel_rate = EXCLUDED.reel_rate, story_rate = EXCLUDED.story_rate, post_rate = EXCLUDED.post_rate;

INSERT INTO video_uploads (creator_id, s3_key, duration_seconds, file_size_bytes, status)
VALUES
    ((SELECT id FROM creators WHERE username = 'snehacomedy'), 'demo/snehacomedy/video_1/demo.mp4', 30, 8900000,  'completed'),
    ((SELECT id FROM creators WHERE username = 'snehacomedy'), 'demo/snehacomedy/video_2/demo.mp4', 25, 7200000,  'completed'),
    ((SELECT id FROM creators WHERE username = 'snehacomedy'), 'demo/snehacomedy/video_3/demo.mp4', 35, 10100000, 'completed');

INSERT INTO video_analyses (video_id, creator_id, energy_level, aesthetic, setting, production_quality, content_type, topics, dominant_colors, has_text_overlay, face_visible, summary, raw_llm_response)
VALUES
    (
        (SELECT id FROM video_uploads WHERE s3_key = 'demo/snehacomedy/video_1/demo.mp4'),
        (SELECT id FROM creators WHERE username = 'snehacomedy'),
        'chaotic', 'desi', 'indoor', 'raw', 'comedy',
        '["comedy", "desi", "parents", "relatable"]'::jsonb,
        '["#FFEB3B", "#E91E63", "#FFFFFF"]'::jsonb,
        TRUE, TRUE,
        'Sneha acts out the classic Indian parent phone call: "Beta, Sharma ji ka beta..." — spot-on accents and facial expressions.',
        '{"model": "demo", "confidence": 0.93}'::jsonb
    ),
    (
        (SELECT id FROM video_uploads WHERE s3_key = 'demo/snehacomedy/video_2/demo.mp4'),
        (SELECT id FROM creators WHERE username = 'snehacomedy'),
        'chaotic', 'desi', 'indoor', 'raw', 'comedy',
        '["comedy", "funny", "wedding", "gujju"]'::jsonb,
        '["#FF5722", "#FFEB3B", "#4CAF50"]'::jsonb,
        TRUE, TRUE,
        'A hilarious take on Gujarati wedding preparations featuring the chaotic aunty who manages everything and everyone.',
        '{"model": "demo", "confidence": 0.91}'::jsonb
    ),
    (
        (SELECT id FROM video_uploads WHERE s3_key = 'demo/snehacomedy/video_3/demo.mp4'),
        (SELECT id FROM creators WHERE username = 'snehacomedy'),
        'chaotic', 'desi', 'indoor', 'raw', 'comedy',
        '["comedy", "relatable", "office", "humor"]'::jsonb,
        '["#FFEB3B", "#2196F3", "#FF5722"]'::jsonb,
        TRUE, TRUE,
        'Office life in India: from chai breaks to boss encounters. Sneha nails the IT company stereotypes with love.',
        '{"model": "demo", "confidence": 0.90}'::jsonb
    );


-- =============================================================================
-- 6. arjuntech — Arjun Nair, Tech, Chennai, 22K followers
-- =============================================================================
INSERT INTO creators (cognito_sub, instagram_id, username, display_name, bio, followers_count, media_count, profile_picture_url, niche, city, style_profile, mediakit_views)
VALUES (
    'demo_arjuntech',
    'demo_ig_arjuntech',
    'arjuntech',
    'Arjun Nair',
    'Tech reviewer from Chennai. Honest gadget reviews, no sponsored bias. Phones, laptops, audio & smart home.',
    22000, 195,
    'https://demo.reachezy.in/avatars/arjuntech.jpg',
    'Tech', 'Chennai',
    '{
        "energy_level": "calm",
        "aesthetic": "minimal",
        "setting": "studio",
        "production_quality": "polished",
        "content_type": "review",
        "consistency_score": 91,
        "dominant_colors": ["#37474F", "#FFFFFF", "#2196F3"],
        "topics": ["tech", "gadgets", "reviews", "smartphones", "unboxing"],
        "face_visible": true,
        "has_text_overlay": false
    }'::jsonb,
    18
)
ON CONFLICT (username) DO NOTHING;

INSERT INTO rate_cards (creator_id, niche, follower_bucket, reel_rate, story_rate, post_rate, accepts_barter)
VALUES (
    (SELECT id FROM creators WHERE username = 'arjuntech'),
    'Tech', '10K-25K', 5000, 2500, 3500, TRUE
)
ON CONFLICT (creator_id) DO UPDATE SET
    reel_rate = EXCLUDED.reel_rate, story_rate = EXCLUDED.story_rate, post_rate = EXCLUDED.post_rate;

INSERT INTO video_uploads (creator_id, s3_key, duration_seconds, file_size_bytes, status)
VALUES
    ((SELECT id FROM creators WHERE username = 'arjuntech'), 'demo/arjuntech/video_1/demo.mp4', 90, 27000000, 'completed'),
    ((SELECT id FROM creators WHERE username = 'arjuntech'), 'demo/arjuntech/video_2/demo.mp4', 70, 21500000, 'completed'),
    ((SELECT id FROM creators WHERE username = 'arjuntech'), 'demo/arjuntech/video_3/demo.mp4', 55, 16000000, 'completed');

INSERT INTO video_analyses (video_id, creator_id, energy_level, aesthetic, setting, production_quality, content_type, topics, dominant_colors, has_text_overlay, face_visible, summary, raw_llm_response)
VALUES
    (
        (SELECT id FROM video_uploads WHERE s3_key = 'demo/arjuntech/video_1/demo.mp4'),
        (SELECT id FROM creators WHERE username = 'arjuntech'),
        'calm', 'minimal', 'studio', 'polished', 'review',
        '["smartphones", "review", "camera", "comparison"]'::jsonb,
        '["#37474F", "#FFFFFF", "#2196F3"]'::jsonb,
        FALSE, TRUE,
        'Detailed camera comparison between two flagship phones under Rs 30K. Side-by-side samples in day, night, and portrait modes.',
        '{"model": "demo", "confidence": 0.95}'::jsonb
    ),
    (
        (SELECT id FROM video_uploads WHERE s3_key = 'demo/arjuntech/video_2/demo.mp4'),
        (SELECT id FROM creators WHERE username = 'arjuntech'),
        'calm', 'minimal', 'studio', 'polished', 'review',
        '["tech", "laptop", "review", "productivity"]'::jsonb,
        '["#ECEFF1", "#37474F", "#4CAF50"]'::jsonb,
        FALSE, TRUE,
        'Arjun reviews a mid-range productivity laptop for students: build quality, keyboard, battery life, and thermal performance.',
        '{"model": "demo", "confidence": 0.93}'::jsonb
    ),
    (
        (SELECT id FROM video_uploads WHERE s3_key = 'demo/arjuntech/video_3/demo.mp4'),
        (SELECT id FROM creators WHERE username = 'arjuntech'),
        'calm', 'minimal', 'studio', 'polished', 'review',
        '["tech", "gadgets", "unboxing", "earbuds"]'::jsonb,
        '["#37474F", "#FFFFFF", "#FF9800"]'::jsonb,
        FALSE, TRUE,
        'Unboxing and 1-week review of budget TWS earbuds under Rs 2000. ANC test, call quality, and gym durability check.',
        '{"model": "demo", "confidence": 0.92}'::jsonb
    );


-- =============================================================================
-- 7. meghnatravel — Meghna Kapoor, Travel, Jaipur, 35K followers
-- =============================================================================
INSERT INTO creators (cognito_sub, instagram_id, username, display_name, bio, followers_count, media_count, profile_picture_url, niche, city, style_profile, mediakit_views)
VALUES (
    'demo_meghnatravel',
    'demo_ig_meghnatravel',
    'meghnatravel',
    'Meghna Kapoor',
    'Travel storyteller based in Jaipur. Hidden gems, heritage walks & budget-friendly India trips. Let''s explore!',
    35000, 280,
    'https://demo.reachezy.in/avatars/meghnatravel.jpg',
    'Travel', 'Jaipur',
    '{
        "energy_level": "high",
        "aesthetic": "vibrant",
        "setting": "outdoor",
        "production_quality": "decent",
        "content_type": "vlog",
        "consistency_score": 87,
        "dominant_colors": ["#FF9800", "#2196F3", "#4CAF50"],
        "topics": ["travel", "rajasthan", "explore", "wanderlust", "india"],
        "face_visible": true,
        "has_text_overlay": true
    }'::jsonb,
    29
)
ON CONFLICT (username) DO NOTHING;

INSERT INTO rate_cards (creator_id, niche, follower_bucket, reel_rate, story_rate, post_rate, accepts_barter)
VALUES (
    (SELECT id FROM creators WHERE username = 'meghnatravel'),
    'Travel', '25K-50K', 12000, 5500, 7500, TRUE
)
ON CONFLICT (creator_id) DO UPDATE SET
    reel_rate = EXCLUDED.reel_rate, story_rate = EXCLUDED.story_rate, post_rate = EXCLUDED.post_rate;

INSERT INTO video_uploads (creator_id, s3_key, duration_seconds, file_size_bytes, status)
VALUES
    ((SELECT id FROM creators WHERE username = 'meghnatravel'), 'demo/meghnatravel/video_1/demo.mp4', 80, 24000000, 'completed'),
    ((SELECT id FROM creators WHERE username = 'meghnatravel'), 'demo/meghnatravel/video_2/demo.mp4', 60, 18500000, 'completed'),
    ((SELECT id FROM creators WHERE username = 'meghnatravel'), 'demo/meghnatravel/video_3/demo.mp4', 45, 13800000, 'completed');

INSERT INTO video_analyses (video_id, creator_id, energy_level, aesthetic, setting, production_quality, content_type, topics, dominant_colors, has_text_overlay, face_visible, summary, raw_llm_response)
VALUES
    (
        (SELECT id FROM video_uploads WHERE s3_key = 'demo/meghnatravel/video_1/demo.mp4'),
        (SELECT id FROM creators WHERE username = 'meghnatravel'),
        'high', 'vibrant', 'outdoor', 'decent', 'vlog',
        '["rajasthan", "jaipur", "heritage", "travel"]'::jsonb,
        '["#FF9800", "#E91E63", "#2196F3"]'::jsonb,
        TRUE, TRUE,
        'Meghna explores the hidden lanes of Jaipur''s old city: spice markets, step wells, and a rooftop chai with a panoramic Hawa Mahal view.',
        '{"model": "demo", "confidence": 0.91}'::jsonb
    ),
    (
        (SELECT id FROM video_uploads WHERE s3_key = 'demo/meghnatravel/video_2/demo.mp4'),
        (SELECT id FROM creators WHERE username = 'meghnatravel'),
        'high', 'vibrant', 'outdoor', 'decent', 'vlog',
        '["travel", "budget", "udaipur", "wanderlust"]'::jsonb,
        '["#2196F3", "#FFFFFF", "#4CAF50"]'::jsonb,
        TRUE, TRUE,
        'Budget travel guide to Udaipur: Rs 3000/day covering hostels, lake-view cafes, palace entries, and sunset boat rides.',
        '{"model": "demo", "confidence": 0.89}'::jsonb
    ),
    (
        (SELECT id FROM video_uploads WHERE s3_key = 'demo/meghnatravel/video_3/demo.mp4'),
        (SELECT id FROM creators WHERE username = 'meghnatravel'),
        'high', 'vibrant', 'outdoor', 'decent', 'vlog',
        '["travel", "explore", "india", "offbeat"]'::jsonb,
        '["#4CAF50", "#FF9800", "#795548"]'::jsonb,
        TRUE, TRUE,
        'Off-the-beaten-path Rajasthan: a 3-day itinerary covering Bundi, Kumbhalgarh, and the desert village of Khuri near Jaisalmer.',
        '{"model": "demo", "confidence": 0.88}'::jsonb
    );


-- =============================================================================
-- 8. divyalifestyle — Divya Iyer, Lifestyle, Pune, 8K followers
-- =============================================================================
INSERT INTO creators (cognito_sub, instagram_id, username, display_name, bio, followers_count, media_count, profile_picture_url, niche, city, style_profile, mediakit_views)
VALUES (
    'demo_divyalifestyle',
    'demo_ig_divyalifestyle',
    'divyalifestyle',
    'Divya Iyer',
    'Slow living in Pune. Minimal home decor, mindful routines & quiet aesthetics. Less noise, more intention.',
    8000, 92,
    'https://demo.reachezy.in/avatars/divyalifestyle.jpg',
    'Lifestyle', 'Pune',
    '{
        "energy_level": "moderate",
        "aesthetic": "minimal",
        "setting": "indoor",
        "production_quality": "decent",
        "content_type": "lifestyle",
        "consistency_score": 76,
        "dominant_colors": ["#EFEBE9", "#795548", "#FFFFFF"],
        "topics": ["lifestyle", "minimal", "homeDecor", "aesthetic", "dailylife"],
        "face_visible": true,
        "has_text_overlay": false
    }'::jsonb,
    4
)
ON CONFLICT (username) DO NOTHING;

INSERT INTO rate_cards (creator_id, niche, follower_bucket, reel_rate, story_rate, post_rate, accepts_barter)
VALUES (
    (SELECT id FROM creators WHERE username = 'divyalifestyle'),
    'Lifestyle', '5K-10K', 2000, 800, 1200, TRUE
)
ON CONFLICT (creator_id) DO UPDATE SET
    reel_rate = EXCLUDED.reel_rate, story_rate = EXCLUDED.story_rate, post_rate = EXCLUDED.post_rate;

INSERT INTO video_uploads (creator_id, s3_key, duration_seconds, file_size_bytes, status)
VALUES
    ((SELECT id FROM creators WHERE username = 'divyalifestyle'), 'demo/divyalifestyle/video_1/demo.mp4', 50, 14000000, 'completed'),
    ((SELECT id FROM creators WHERE username = 'divyalifestyle'), 'demo/divyalifestyle/video_2/demo.mp4', 40, 11200000, 'completed'),
    ((SELECT id FROM creators WHERE username = 'divyalifestyle'), 'demo/divyalifestyle/video_3/demo.mp4', 35, 9800000,  'completed');

INSERT INTO video_analyses (video_id, creator_id, energy_level, aesthetic, setting, production_quality, content_type, topics, dominant_colors, has_text_overlay, face_visible, summary, raw_llm_response)
VALUES
    (
        (SELECT id FROM video_uploads WHERE s3_key = 'demo/divyalifestyle/video_1/demo.mp4'),
        (SELECT id FROM creators WHERE username = 'divyalifestyle'),
        'moderate', 'minimal', 'indoor', 'decent', 'lifestyle',
        '["homeDecor", "minimal", "aesthetic", "organization"]'::jsonb,
        '["#EFEBE9", "#795548", "#FFFFFF"]'::jsonb,
        FALSE, TRUE,
        'Divya reorganizes her Pune apartment living room with a minimal, earth-tone palette using only thrifted and handmade decor.',
        '{"model": "demo", "confidence": 0.85}'::jsonb
    ),
    (
        (SELECT id FROM video_uploads WHERE s3_key = 'demo/divyalifestyle/video_2/demo.mp4'),
        (SELECT id FROM creators WHERE username = 'divyalifestyle'),
        'moderate', 'minimal', 'indoor', 'decent', 'lifestyle',
        '["lifestyle", "morningRoutine", "dailylife", "mindful"]'::jsonb,
        '["#FFFFFF", "#EFEBE9", "#A1887F"]'::jsonb,
        FALSE, TRUE,
        'A calm 6 AM morning routine: journaling, filter coffee, yoga on the balcony, and meal prepping for the week.',
        '{"model": "demo", "confidence": 0.83}'::jsonb
    ),
    (
        (SELECT id FROM video_uploads WHERE s3_key = 'demo/divyalifestyle/video_3/demo.mp4'),
        (SELECT id FROM creators WHERE username = 'divyalifestyle'),
        'moderate', 'minimal', 'indoor', 'decent', 'lifestyle',
        '["lifestyle", "aesthetic", "bookshelf", "minimal"]'::jsonb,
        '["#795548", "#EFEBE9", "#D7CCC8"]'::jsonb,
        FALSE, TRUE,
        'Bookshelf styling tips for small Indian apartments: how to curate, arrange, and light a reading corner that sparks joy.',
        '{"model": "demo", "confidence": 0.82}'::jsonb
    );

COMMIT;
