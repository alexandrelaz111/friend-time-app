-- ============================================
-- NETTOYAGE DES DONNÉES CORROMPUES
-- FriendTime App - 24 janvier 2026
-- ============================================
-- À exécuter dans Supabase SQL Editor pour nettoyer
-- les sessions zombies et données historiques corrompues

-- 1. Terminer toutes les sessions actives obsolètes
-- (positions non mises à jour depuis plus de 3 minutes)
UPDATE time_sessions ts
SET 
  ended_at = COALESCE(
    (SELECT ul.recorded_at 
     FROM user_locations ul 
     WHERE ul.user_id = ts.user_id 
     LIMIT 1),
    NOW()
  ),
  is_active = FALSE
WHERE ts.is_active = TRUE
  AND (
    -- Pas de position utilisateur
    NOT EXISTS (SELECT 1 FROM user_locations ul WHERE ul.user_id = ts.user_id)
    -- OU position utilisateur obsolète (> 3 min)
    OR EXISTS (
      SELECT 1 FROM user_locations ul 
      WHERE ul.user_id = ts.user_id 
      AND ul.recorded_at < NOW() - INTERVAL '3 minutes'
    )
    -- Pas de position ami
    OR NOT EXISTS (SELECT 1 FROM user_locations ul WHERE ul.user_id = ts.friend_id)
    -- OU position ami obsolète (> 3 min)
    OR EXISTS (
      SELECT 1 FROM user_locations ul 
      WHERE ul.user_id = ts.friend_id 
      AND ul.recorded_at < NOW() - INTERVAL '3 minutes'
    )
  );

-- 2. Afficher le résultat du nettoyage
SELECT 
  COUNT(*) as sessions_nettoyees,
  MIN(started_at) as plus_ancienne,
  MAX(started_at) as plus_recente
FROM time_sessions
WHERE is_active = FALSE 
  AND ended_at >= NOW() - INTERVAL '1 minute';

-- 3. [OPTIONNEL] Supprimer complètement les sessions corrompues
-- Décommenter si vous voulez effacer l'historique corrompu
/*
DELETE FROM time_sessions
WHERE is_active = FALSE
  AND duration_seconds = 0
  AND started_at < NOW() - INTERVAL '1 day';
*/

-- 4. Recalculer les durées manquantes (sessions terminées mais duration_seconds = 0)
UPDATE time_sessions
SET duration_seconds = EXTRACT(EPOCH FROM (ended_at - started_at))::INTEGER
WHERE ended_at IS NOT NULL
  AND duration_seconds = 0
  AND ended_at > started_at;

-- 5. Vérifier l'état final
SELECT 
  COUNT(*) FILTER (WHERE is_active = TRUE) as sessions_actives,
  COUNT(*) FILTER (WHERE is_active = FALSE) as sessions_terminees,
  COUNT(*) FILTER (WHERE is_active = FALSE AND duration_seconds = 0) as sessions_sans_duree,
  COUNT(*) FILTER (WHERE is_active = TRUE AND started_at < NOW() - INTERVAL '5 minutes') as sessions_zombies_potentielles
FROM time_sessions;

-- 6. [OPTIONNEL] Réinitialiser complètement les données
-- ATTENTION : Supprime TOUT l'historique !
/*
TRUNCATE TABLE time_sessions CASCADE;
TRUNCATE TABLE monthly_stats CASCADE;
DELETE FROM user_locations;
*/
