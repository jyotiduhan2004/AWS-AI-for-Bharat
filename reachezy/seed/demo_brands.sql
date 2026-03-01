-- ============================================================
-- ReachEzy: Demo Brand Users + Creator User Entries
-- Run AFTER brand_users_schema.sql and demo_creators.sql
-- Password for all demo accounts: "password"
-- SHA-256("password") = 5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8
-- ============================================================

-- ---- 3 Demo Brand Accounts ----

INSERT INTO users (email, password_hash, role, company_name, industry, city, contact_name)
VALUES
  ('brand@nykaa.demo.reachezy.in',
   '5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8',
   'brand', 'Nykaa', 'Beauty & Wellness', 'Mumbai', 'Adwaita Nayar'),
  ('brand@boat.demo.reachezy.in',
   '5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8',
   'brand', 'boAt', 'Electronics & Tech', 'Delhi', 'Aman Gupta'),
  ('brand@zomato.demo.reachezy.in',
   '5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8',
   'brand', 'Zomato', 'Food & Beverage', 'Gurugram', 'Deepinder Goyal')
ON CONFLICT (email) DO NOTHING;

-- ---- Creator User Entries (link existing demo creators to users table) ----

INSERT INTO users (email, password_hash, role, creator_id)
SELECT
  c.username || '@demo.reachezy.in',
  '5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8',
  'creator',
  c.id
FROM creators c
WHERE c.username IN (
  'priyabeauty', 'rahulfashion', 'ananyafood', 'vikramfitness',
  'snehacomedy', 'arjuntech', 'meghnatravel', 'divyalifestyle'
)
ON CONFLICT (email) DO NOTHING;

-- ---- Pre-populated Wishlist for Nykaa ----

INSERT INTO brand_wishlists (user_id, creator_id)
SELECT u.id, c.id
FROM users u, creators c
WHERE u.email = 'brand@nykaa.demo.reachezy.in'
  AND c.username IN ('priyabeauty', 'divyalifestyle')
ON CONFLICT (user_id, creator_id) DO NOTHING;
