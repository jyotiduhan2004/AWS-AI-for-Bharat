-- Fix style_profile format for all demo creators to match frontend StyleProfile interface
-- Run this against the live DB to update existing demo data

UPDATE creators SET style_profile = '{
    "dominant_energy": "high",
    "energy_score": 80,
    "dominant_aesthetic": "vibrant",
    "primary_content_type": "tutorial",
    "style_summary": "Priya walks through a 5-step nighttime skincare routine using affordable Indian drugstore products, focusing on hydration for dry winter skin.",
    "consistency_score": 88,
    "topics": ["skincare", "makeup", "beauty", "indianskin", "affordable"],
    "face_visible_pct": 100,
    "text_overlay_pct": 100,
    "settings": [{"name": "indoor", "pct": 100}]
}'::jsonb WHERE username = 'priyabeauty';

UPDATE creators SET style_profile = '{
    "dominant_energy": "moderate",
    "energy_score": 55,
    "dominant_aesthetic": "professional",
    "primary_content_type": "lifestyle",
    "style_summary": "Rahul showcases curated streetwear looks shot on the streets of Bandra, pairing oversized silhouettes with Indian accessories.",
    "consistency_score": 92,
    "topics": ["fashion", "streetwear", "mensfashion", "style"],
    "face_visible_pct": 100,
    "text_overlay_pct": 0,
    "settings": [{"name": "outdoor", "pct": 33}, {"name": "indoor", "pct": 33}, {"name": "mixed", "pct": 34}]
}'::jsonb WHERE username = 'rahulfashion';

UPDATE creators SET style_profile = '{
    "dominant_energy": "high",
    "energy_score": 80,
    "dominant_aesthetic": "vibrant",
    "primary_content_type": "vlog",
    "style_summary": "Ananya demonstrates her grandmother''s crispy ghee dosa recipe with three chutneys, filmed in her cozy Bangalore kitchen.",
    "consistency_score": 82,
    "topics": ["food", "cooking", "southindian", "recipes", "homecooking"],
    "face_visible_pct": 100,
    "text_overlay_pct": 100,
    "settings": [{"name": "indoor", "pct": 67}, {"name": "outdoor", "pct": 33}]
}'::jsonb WHERE username = 'ananyafood';

UPDATE creators SET style_profile = '{
    "dominant_energy": "chaotic",
    "energy_score": 90,
    "dominant_aesthetic": "minimal",
    "primary_content_type": "tutorial",
    "style_summary": "Vikram breaks down a chest and triceps push day with form tips, filmed raw at a Delhi commercial gym.",
    "consistency_score": 79,
    "topics": ["fitness", "gym", "workout", "health", "bodybuilding"],
    "face_visible_pct": 100,
    "text_overlay_pct": 100,
    "settings": [{"name": "indoor", "pct": 67}, {"name": "outdoor", "pct": 33}]
}'::jsonb WHERE username = 'vikramfitness';

UPDATE creators SET style_profile = '{
    "dominant_energy": "chaotic",
    "energy_score": 90,
    "dominant_aesthetic": "desi",
    "primary_content_type": "comedy",
    "style_summary": "Sneha acts out the classic Indian parent phone call with spot-on accents and facial expressions. Hilarious and relatable.",
    "consistency_score": 85,
    "topics": ["comedy", "funny", "relatable", "desi", "humor"],
    "face_visible_pct": 100,
    "text_overlay_pct": 100,
    "settings": [{"name": "indoor", "pct": 100}]
}'::jsonb WHERE username = 'snehacomedy';

UPDATE creators SET style_profile = '{
    "dominant_energy": "calm",
    "energy_score": 25,
    "dominant_aesthetic": "minimal",
    "primary_content_type": "review",
    "style_summary": "Detailed camera comparison between two flagship phones under Rs 30K with side-by-side samples in day, night, and portrait modes.",
    "consistency_score": 91,
    "topics": ["tech", "gadgets", "reviews", "smartphones", "unboxing"],
    "face_visible_pct": 100,
    "text_overlay_pct": 0,
    "settings": [{"name": "studio", "pct": 100}]
}'::jsonb WHERE username = 'arjuntech';

UPDATE creators SET style_profile = '{
    "dominant_energy": "high",
    "energy_score": 80,
    "dominant_aesthetic": "vibrant",
    "primary_content_type": "vlog",
    "style_summary": "Meghna explores the hidden lanes of Jaipur''s old city: spice markets, step wells, and a rooftop chai with a panoramic Hawa Mahal view.",
    "consistency_score": 87,
    "topics": ["travel", "rajasthan", "explore", "wanderlust", "india"],
    "face_visible_pct": 100,
    "text_overlay_pct": 100,
    "settings": [{"name": "outdoor", "pct": 100}]
}'::jsonb WHERE username = 'meghnatravel';

UPDATE creators SET style_profile = '{
    "dominant_energy": "moderate",
    "energy_score": 55,
    "dominant_aesthetic": "minimal",
    "primary_content_type": "lifestyle",
    "style_summary": "Divya reorganizes her Pune apartment living room with a minimal, earth-tone palette using only thrifted and handmade decor.",
    "consistency_score": 76,
    "topics": ["lifestyle", "minimal", "homeDecor", "aesthetic", "dailylife"],
    "face_visible_pct": 100,
    "text_overlay_pct": 0,
    "settings": [{"name": "indoor", "pct": 100}]
}'::jsonb WHERE username = 'divyalifestyle';
