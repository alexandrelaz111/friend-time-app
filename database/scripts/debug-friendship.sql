-- ============================================
-- DEBUG : Vérification amitié et positions
-- ============================================
-- À exécuter pour diagnostiquer pourquoi get_nearby_friends
-- ne fonctionne que dans un sens

-- 1. Vérifier les amitiés entre les deux utilisateurs
SELECT 
  'Friendships' as table_name,
  user_id,
  friend_id,
  status,
  created_at
FROM friendships
WHERE (user_id = '3c5d53a8-783f-42b0-92f9-6d8c76d84408' AND friend_id = '3dfac276-aebc-4253-82b2-e7e6fd217710')
   OR (user_id = '3dfac276-aebc-4253-82b2-e7e6fd217710' AND friend_id = '3c5d53a8-783f-42b0-92f9-6d8c76d84408');

-- 2. Vérifier les positions des deux utilisateurs
SELECT 
  'User Locations' as table_name,
  ul.user_id,
  p.username,
  ul.latitude,
  ul.longitude,
  ul.recorded_at,
  EXTRACT(EPOCH FROM (NOW() - ul.recorded_at)) as seconds_ago
FROM user_locations ul
LEFT JOIN profiles p ON p.id = ul.user_id
WHERE ul.user_id IN ('3c5d53a8-783f-42b0-92f9-6d8c76d84408', '3dfac276-aebc-4253-82b2-e7e6fd217710')
ORDER BY ul.recorded_at DESC;

-- 3. Test manuel de get_nearby_friends pour user 1
SELECT 
  'Nearby friends for user 1' as test,
  *
FROM get_nearby_friends(
  '3c5d53a8-783f-42b0-92f9-6d8c76d84408',
  48.8473,
  2.3719,
  50
);

-- 4. Test manuel de get_nearby_friends pour user 2
SELECT 
  'Nearby friends for user 2' as test,
  *
FROM get_nearby_friends(
  '3dfac276-aebc-4253-82b2-e7e6fd217710',
  48.8473,
  2.3719,
  50
);
