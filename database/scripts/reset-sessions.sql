-- ============================================
-- RESET COMPLET DES SESSIONS
-- FriendTime App - 24 janvier 2026
-- ============================================
-- Supprime toutes les sessions terminées pour repartir à zéro
-- Utile pour tester la nouvelle version avec des données propres

-- 1. Afficher le nombre de sessions à supprimer
SELECT 
  COUNT(*) as sessions_a_supprimer,
  MIN(started_at) as plus_ancienne,
  MAX(started_at) as plus_recente
FROM time_sessions
WHERE is_active = FALSE;

-- 2. Supprimer toutes les sessions terminées
DELETE FROM time_sessions
WHERE is_active = FALSE;

-- 3. Vérifier le résultat
SELECT 
  COUNT(*) FILTER (WHERE is_active = TRUE) as sessions_actives_restantes,
  COUNT(*) FILTER (WHERE is_active = FALSE) as sessions_terminees_restantes,
  COUNT(*) as total_sessions
FROM time_sessions;

-- 4. [OPTIONNEL] Réinitialiser aussi les statistiques mensuelles
-- Décommenter si vous voulez également supprimer les stats
/*
TRUNCATE TABLE monthly_stats;
*/
