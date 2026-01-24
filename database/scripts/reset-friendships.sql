-- ============================================
-- RESET AMITIÉS
-- ============================================
-- Supprime toutes les amitiés pour repartir à zéro
-- Utile pour tester avec des données propres

-- 1. Afficher les amitiés avant suppression
SELECT 
  COUNT(*) as total_amitiés,
  COUNT(*) FILTER (WHERE status = 'accepted') as acceptées,
  COUNT(*) FILTER (WHERE status = 'pending') as en_attente
FROM friendships;

-- 2. Supprimer TOUTES les amitiés
DELETE FROM friendships;

-- 3. Vérifier le résultat
SELECT COUNT(*) as amitiés_restantes FROM friendships;
