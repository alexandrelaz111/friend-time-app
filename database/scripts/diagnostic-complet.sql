-- ============================================
-- DIAGNOSTIC COMPLET EN TEMPS RÉEL
-- ============================================
-- Remplace les UUIDs par ceux de tes utilisateurs

-- ÉTAPE 1: Vérifier les amitiés
SELECT 
  '1. AMITIÉS' as section,
  f.id,
  f.user_id,
  p1.username as user_name,
  f.friend_id,
  p2.username as friend_name,
  f.status,
  f.created_at
FROM friendships f
JOIN profiles p1 ON p1.id = f.user_id
JOIN profiles p2 ON p2.id = f.friend_id
WHERE (f.user_id = '3c5d53a8-783f-42b0-92f9-6d8c76d84408' 
   OR f.friend_id = '3c5d53a8-783f-42b0-92f9-6d8c76d84408'
   OR f.user_id = '3dfac276-aebc-4253-82b2-e7e6fd217710'
   OR f.friend_id = '3dfac276-aebc-4253-82b2-e7e6fd217710');

-- ÉTAPE 2: Vérifier les positions
SELECT 
  '2. POSITIONS' as section,
  p.username,
  ul.user_id,
  ul.latitude,
  ul.longitude,
  ul.recorded_at,
  EXTRACT(EPOCH FROM (NOW() - ul.recorded_at)) as secondes_depuis_maj,
  CASE 
    WHEN ul.recorded_at > NOW() - INTERVAL '2 minutes' THEN '✓ Récente'
    ELSE '✗ Obsolète (> 2 min)'
  END as statut
FROM user_locations ul
JOIN profiles p ON p.id = ul.user_id
WHERE ul.user_id IN ('3c5d53a8-783f-42b0-92f9-6d8c76d84408', '3dfac276-aebc-4253-82b2-e7e6fd217710')
ORDER BY ul.recorded_at DESC;

-- ÉTAPE 3: Test get_nearby_friends pour chaque user
SELECT 
  '3A. Amis proches USER 1' as section,
  *
FROM get_nearby_friends(
  '3c5d53a8-783f-42b0-92f9-6d8c76d84408',
  48.8473,
  2.3719,
  50
);

SELECT 
  '3B. Amis proches USER 2' as section,
  *
FROM get_nearby_friends(
  '3dfac276-aebc-4253-82b2-e7e6fd217710',
  48.8473,
  2.3719,
  50
);

-- ÉTAPE 4: Calcul manuel de distance
SELECT 
  '4. DISTANCE MANUELLE' as section,
  calculate_distance(
    (SELECT latitude FROM user_locations WHERE user_id = '3c5d53a8-783f-42b0-92f9-6d8c76d84408'),
    (SELECT longitude FROM user_locations WHERE user_id = '3c5d53a8-783f-42b0-92f9-6d8c76d84408'),
    (SELECT latitude FROM user_locations WHERE user_id = '3dfac276-aebc-4253-82b2-e7e6fd217710'),
    (SELECT longitude FROM user_locations WHERE user_id = '3dfac276-aebc-4253-82b2-e7e6fd217710')
  ) as distance_metres;
