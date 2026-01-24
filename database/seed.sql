-- ============================================
-- SEED DATA - Données de Test
-- FriendTime App
-- ============================================
-- Exécute ce script APRÈS schema.sql pour avoir des données de test

-- 1. Créer des utilisateurs de test
-- Note: Les UUIDs et auth sont gérés par Supabase, ceci est juste pour la doc
INSERT INTO profiles (id, email, username, avatar_url)
VALUES 
  ('3c5d53a8-783f-42b0-92f9-6d8c76d84408', 'alice@test.com', 'alice', NULL),
  ('3dfac276-aebc-4253-82b2-e7e6fd217710', 'bob@test.com', 'bob', NULL),
  ('4afe6387-bfcd-5364-93g0-7e9f87e95509', 'charlie@test.com', 'charlie', NULL)
ON CONFLICT (id) DO NOTHING;

-- 2. Créer les amitiés entre utilisateurs
INSERT INTO friendships (user_id, friend_id, status, created_at)
VALUES
  ('3c5d53a8-783f-42b0-92f9-6d8c76d84408', '3dfac276-aebc-4253-82b2-e7e6fd217710', 'accepted', NOW()),
  ('3c5d53a8-783f-42b0-92f9-6d8c76d84408', '4afe6387-bfcd-5364-93g0-7e9f87e95509', 'pending', NOW())
ON CONFLICT (user_id, friend_id) DO NOTHING;

-- 3. Créer des positions de test (optionnel)
INSERT INTO user_locations (user_id, latitude, longitude, accuracy, recorded_at)
VALUES
  ('3c5d53a8-783f-42b0-92f9-6d8c76d84408', 48.8566, 2.3522, 10, NOW()),
  ('3dfac276-aebc-4253-82b2-e7e6fd217710', 48.8573, 2.3525, 10, NOW()),
  ('4afe6387-bfcd-5364-93g0-7e9f87e95509', 48.8580, 2.3530, 10, NOW())
ON CONFLICT (user_id) DO UPDATE SET 
  latitude = EXCLUDED.latitude,
  longitude = EXCLUDED.longitude,
  recorded_at = EXCLUDED.recorded_at;

-- 4. Verification: Afficher ce qui a été créé
SELECT 
  'Profiles Created' as section,
  COUNT(*) as count
FROM profiles;

SELECT 
  'Friendships Created' as section,
  COUNT(*) as count
FROM friendships;

SELECT 
  'Locations Created' as section,
  COUNT(*) as count
FROM user_locations;
