-- ============================================
-- MIGRATION: Ajout fonction de nettoyage sessions
-- Date: 2026-01-24
-- Description: Ajoute la fonction end_stale_sessions pour terminer
--              automatiquement les sessions avec positions obsolètes
-- ============================================

-- Fonction pour terminer les sessions avec positions obsolètes
-- À appeler périodiquement (toutes les 5 min côté client)
-- ou avant chaque vérification de proximité
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

-- Mise à jour de la fonction get_nearby_friends pour filtrer 2 min (au lieu de 5 min)
-- Suppression de l'ancienne version si elle existe
DROP FUNCTION IF EXISTS get_nearby_friends(uuid, double precision, double precision, double precision);

CREATE OR REPLACE FUNCTION get_nearby_friends(
  p_user_id UUID,
  p_latitude DOUBLE PRECISION,
  p_longitude DOUBLE PRECISION,
  p_threshold_meters DOUBLE PRECISION DEFAULT 50
)
RETURNS TABLE (
  friend_id UUID,
  username TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  distance DOUBLE PRECISION,
  recorded_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    f.friend_id,
    p.username,
    ul.latitude,
    ul.longitude,
    calculate_distance(p_latitude, p_longitude, ul.latitude, ul.longitude) as distance,
    ul.recorded_at
  FROM friendships f
  INNER JOIN profiles p ON p.id = f.friend_id
  INNER JOIN user_locations ul ON ul.user_id = f.friend_id
  WHERE f.user_id = p_user_id
    AND f.status = 'accepted'
    AND ul.recorded_at > NOW() - INTERVAL '2 minutes'  -- Filtre positions < 2 min
    AND calculate_distance(p_latitude, p_longitude, ul.latitude, ul.longitude) <= p_threshold_meters
  ORDER BY distance ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
