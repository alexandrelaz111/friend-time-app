-- ============================================
-- MIGRATION : Gestion sessions obsolètes
-- Date : 24 janvier 2026
-- ============================================
-- À exécuter dans l'éditeur SQL de Supabase
-- Dashboard > SQL Editor > New Query

-- 1. Fonction pour terminer les sessions avec positions obsolètes
CREATE OR REPLACE FUNCTION end_stale_sessions(
  p_max_inactivity_minutes INTEGER DEFAULT 3
)
RETURNS TABLE (
  session_id UUID,
  user_id UUID,
  friend_id UUID,
  reason TEXT
) AS $$
BEGIN
  RETURN QUERY
  WITH stale_sessions AS (
    SELECT 
      ts.id,
      ts.user_id,
      ts.friend_id,
      CASE 
        WHEN ul_user.recorded_at IS NULL THEN 'user_no_location'
        WHEN ul_friend.recorded_at IS NULL THEN 'friend_no_location'
        WHEN ul_user.recorded_at < NOW() - INTERVAL '1 minute' * p_max_inactivity_minutes THEN 'user_stale_location'
        WHEN ul_friend.recorded_at < NOW() - INTERVAL '1 minute' * p_max_inactivity_minutes THEN 'friend_stale_location'
        ELSE 'unknown'
      END as end_reason
    FROM time_sessions ts
    LEFT JOIN user_locations ul_user ON ul_user.user_id = ts.user_id
    LEFT JOIN user_locations ul_friend ON ul_friend.user_id = ts.friend_id
    WHERE ts.is_active = TRUE
      AND (
        -- Position utilisateur manquante ou obsolète
        ul_user.recorded_at IS NULL 
        OR ul_user.recorded_at < NOW() - INTERVAL '1 minute' * p_max_inactivity_minutes
        -- OU position ami manquante ou obsolète
        OR ul_friend.recorded_at IS NULL
        OR ul_friend.recorded_at < NOW() - INTERVAL '1 minute' * p_max_inactivity_minutes
      )
  )
  UPDATE time_sessions ts
  SET 
    ended_at = NOW(),
    is_active = FALSE
  FROM stale_sessions ss
  WHERE ts.id = ss.id
  RETURNING ts.id, ts.user_id, ts.friend_id, ss.end_reason;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Mise à jour de get_nearby_friends pour réduire le seuil de validité
CREATE OR REPLACE FUNCTION get_nearby_friends(
  p_user_id UUID,
  p_latitude DOUBLE PRECISION,
  p_longitude DOUBLE PRECISION,
  p_threshold_meters DOUBLE PRECISION DEFAULT 50
)
RETURNS TABLE (
  friend_id UUID,
  username TEXT,
  distance_meters DOUBLE PRECISION
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    ul.user_id AS friend_id,
    p.username,
    calculate_distance(p_latitude, p_longitude, ul.latitude, ul.longitude) AS distance_meters
  FROM user_locations ul
  JOIN profiles p ON p.id = ul.user_id
  JOIN friendships f ON (
    (f.user_id = p_user_id AND f.friend_id = ul.user_id)
    OR (f.friend_id = p_user_id AND f.user_id = ul.user_id)
  )
  WHERE f.status = 'accepted'
    AND ul.user_id != p_user_id
    AND ul.recorded_at > NOW() - INTERVAL '2 minutes' -- Réduit de 5 à 2 minutes
    AND calculate_distance(p_latitude, p_longitude, ul.latitude, ul.longitude) <= p_threshold_meters;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Nettoyage immédiat des sessions obsolètes existantes
SELECT 
  session_id,
  user_id,
  friend_id,
  reason
FROM end_stale_sessions(3);

-- 4. Vérification
SELECT 
  COUNT(*) as active_sessions,
  COUNT(*) FILTER (WHERE ended_at IS NULL) as still_null_ended_at
FROM time_sessions
WHERE is_active = TRUE;

-- Si tout va bien, vous devriez voir :
-- active_sessions: nombre de sessions réellement actives avec positions fraîches
-- still_null_ended_at: devrait être égal à active_sessions
