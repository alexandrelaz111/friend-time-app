-- ============================================
-- CORRECTION : Amitiés manquantes
-- ============================================
-- Vérifie et affiche les amitiés qui existent seulement dans un sens
-- Le code actuel ne devrait créer qu'une ligne par amitié,
-- donc ce script corrige les anciennes données

-- 1. Vérifier les amitiés actuelles
SELECT 
  f1.id as friendship_id,
  f1.user_id,
  p1.username as user_name,
  f1.friend_id,
  p2.username as friend_name,
  f1.status,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM friendships f2 
      WHERE f2.user_id = f1.friend_id 
      AND f2.friend_id = f1.user_id
    ) THEN 'Bidirectionnelle ✓'
    ELSE 'Unidirectionnelle ✗'
  END as type_amitie
FROM friendships f1
JOIN profiles p1 ON p1.id = f1.user_id
JOIN profiles p2 ON p2.id = f1.friend_id
ORDER BY f1.created_at DESC;

-- 2. Note importante :
-- Le code actuel (sendFriendRequest + acceptFriendRequest) ne crée qu'UNE ligne
-- La fonction SQL get_nearby_friends gère déjà les deux sens avec OR
-- Donc AUCUNE action n'est requise si le code fonctionne correctement

-- 3. Si des amitiés unidirectionnelles existent (anciennes données),
-- elles fonctionneront quand même grâce au OR dans get_nearby_friends
