-- ============================================
-- SCHÉMA DE BASE DE DONNÉES SUPABASE
-- FriendTime App
-- ============================================
-- Exécute ce script dans l'éditeur SQL de Supabase
-- Dashboard > SQL Editor > New Query

-- 1. Table des profils utilisateurs
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  username TEXT UNIQUE NOT NULL,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Table des amitiés
CREATE TABLE IF NOT EXISTS friendships (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  friend_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  status TEXT CHECK (status IN ('pending', 'accepted', 'rejected')) DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  -- Un utilisateur ne peut pas s'ajouter lui-même
  CONSTRAINT no_self_friendship CHECK (user_id != friend_id),
  -- Évite les doublons (A->B et B->A)
  CONSTRAINT unique_friendship UNIQUE (user_id, friend_id)
);

-- 3. Table des localisations (stockage temporaire)
-- On ne garde que la dernière position de chaque utilisateur
CREATE TABLE IF NOT EXISTS user_locations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE UNIQUE NOT NULL,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  accuracy DOUBLE PRECISION,
  recorded_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Table des sessions de temps passé ensemble
CREATE TABLE IF NOT EXISTS time_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  friend_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  duration_seconds INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Table des statistiques mensuelles (agrégées pour performance)
CREATE TABLE IF NOT EXISTS monthly_stats (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  friend_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  month TEXT NOT NULL, -- Format: '2025-01'
  total_seconds INTEGER DEFAULT 0,
  sessions_count INTEGER DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_monthly_stat UNIQUE (user_id, friend_id, month)
);

-- ============================================
-- INDEX POUR PERFORMANCE
-- ============================================

CREATE INDEX IF NOT EXISTS idx_friendships_user_id ON friendships(user_id);
CREATE INDEX IF NOT EXISTS idx_friendships_friend_id ON friendships(friend_id);
CREATE INDEX IF NOT EXISTS idx_friendships_status ON friendships(status);
CREATE INDEX IF NOT EXISTS idx_time_sessions_user_friend ON time_sessions(user_id, friend_id);
CREATE INDEX IF NOT EXISTS idx_time_sessions_active ON time_sessions(is_active) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_monthly_stats_user ON monthly_stats(user_id);
CREATE INDEX IF NOT EXISTS idx_monthly_stats_month ON monthly_stats(month);

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

-- Active RLS sur toutes les tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE friendships ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE time_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE monthly_stats ENABLE ROW LEVEL SECURITY;

-- Policies pour profiles
CREATE POLICY "Les utilisateurs peuvent voir tous les profils"
  ON profiles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Les utilisateurs peuvent modifier leur propre profil"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Les utilisateurs peuvent créer leur profil"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Policies pour friendships
CREATE POLICY "Voir ses propres amitiés"
  ON friendships FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id OR auth.uid() = friend_id);

CREATE POLICY "Créer une demande d'amitié"
  ON friendships FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Modifier ses propres amitiés"
  ON friendships FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id OR auth.uid() = friend_id);

CREATE POLICY "Supprimer ses propres amitiés"
  ON friendships FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id OR auth.uid() = friend_id);

-- Policies pour user_locations
CREATE POLICY "Voir sa propre localisation"
  ON user_locations FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Voir la localisation de ses amis acceptés"
  ON user_locations FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM friendships
      WHERE status = 'accepted'
      AND ((user_id = auth.uid() AND friend_id = user_locations.user_id)
           OR (friend_id = auth.uid() AND user_id = user_locations.user_id))
    )
  );

CREATE POLICY "Mettre à jour sa propre localisation"
  ON user_locations FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Modifier sa propre localisation"
  ON user_locations FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

-- Policies pour time_sessions
CREATE POLICY "Voir ses propres sessions"
  ON time_sessions FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id OR auth.uid() = friend_id);

CREATE POLICY "Créer ses propres sessions"
  ON time_sessions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id OR auth.uid() = friend_id);

CREATE POLICY "Modifier ses propres sessions"
  ON time_sessions FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id OR auth.uid() = friend_id);

-- Policies pour monthly_stats
CREATE POLICY "Voir ses propres stats"
  ON monthly_stats FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id OR auth.uid() = friend_id);

CREATE POLICY "Créer/modifier ses propres stats"
  ON monthly_stats FOR ALL
  TO authenticated
  USING (auth.uid() = user_id);

-- ============================================
-- FONCTIONS ET TRIGGERS
-- ============================================

-- Fonction pour créer automatiquement un profil à l'inscription
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, email, username)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1))
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger pour créer le profil automatiquement
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Fonction pour calculer la distance entre deux points (formule Haversine)
CREATE OR REPLACE FUNCTION calculate_distance(
  lat1 DOUBLE PRECISION,
  lon1 DOUBLE PRECISION,
  lat2 DOUBLE PRECISION,
  lon2 DOUBLE PRECISION
)
RETURNS DOUBLE PRECISION AS $$
DECLARE
  R CONSTANT DOUBLE PRECISION := 6371000; -- Rayon de la Terre en mètres
  dlat DOUBLE PRECISION;
  dlon DOUBLE PRECISION;
  a DOUBLE PRECISION;
  c DOUBLE PRECISION;
BEGIN
  dlat := radians(lat2 - lat1);
  dlon := radians(lon2 - lon1);
  a := sin(dlat/2) * sin(dlat/2) +
       cos(radians(lat1)) * cos(radians(lat2)) *
       sin(dlon/2) * sin(dlon/2);
  c := 2 * atan2(sqrt(a), sqrt(1-a));
  RETURN R * c;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Fonction pour trouver les amis proches
-- Filtre automatiquement les positions obsolètes (> 2 min)
-- Utilise la formule de Haversine pour calculer les distances
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
    AND ul.recorded_at > NOW() - INTERVAL '2 minutes' -- Position récente (réduit de 5 à 2 min)
    AND calculate_distance(p_latitude, p_longitude, ul.latitude, ul.longitude) <= p_threshold_meters;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fonction pour calculer la durée automatiquement (même pour sessions actives)
CREATE OR REPLACE FUNCTION calculate_session_duration()
RETURNS TRIGGER AS $$
BEGIN
  -- Calcule la durée en secondes
  IF NEW.ended_at IS NOT NULL THEN
    -- Session terminée : durée = ended_at - started_at
    NEW.duration_seconds := EXTRACT(EPOCH FROM (NEW.ended_at - NEW.started_at))::INTEGER;
  ELSIF NEW.is_active = TRUE THEN
    -- Session active : durée = maintenant - started_at
    NEW.duration_seconds := EXTRACT(EPOCH FROM (NOW() - NEW.started_at))::INTEGER;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger pour calculer la durée automatiquement à chaque INSERT/UPDATE
DROP TRIGGER IF EXISTS calculate_duration_trigger ON time_sessions;
CREATE TRIGGER calculate_duration_trigger
  BEFORE INSERT OR UPDATE ON time_sessions
  FOR EACH ROW EXECUTE FUNCTION calculate_session_duration();

-- Fonction pour mettre à jour les statistiques mensuelles
CREATE OR REPLACE FUNCTION update_monthly_stats()
RETURNS TRIGGER AS $$
DECLARE
  session_month TEXT;
  session_duration INTEGER;
BEGIN
  -- Seulement quand une session est terminée
  IF NEW.ended_at IS NOT NULL AND OLD.ended_at IS NULL THEN
    session_month := TO_CHAR(NEW.started_at, 'YYYY-MM');
    session_duration := EXTRACT(EPOCH FROM (NEW.ended_at - NEW.started_at))::INTEGER;

    -- Mise à jour ou insertion des stats
    INSERT INTO monthly_stats (user_id, friend_id, month, total_seconds, sessions_count)
    VALUES (NEW.user_id, NEW.friend_id, session_month, session_duration, 1)
    ON CONFLICT (user_id, friend_id, month)
    DO UPDATE SET
      total_seconds = monthly_stats.total_seconds + session_duration,
      sessions_count = monthly_stats.sessions_count + 1,
      updated_at = NOW();

    -- Aussi pour l'ami (relation bidirectionnelle)
    INSERT INTO monthly_stats (user_id, friend_id, month, total_seconds, sessions_count)
    VALUES (NEW.friend_id, NEW.user_id, session_month, session_duration, 1)
    ON CONFLICT (user_id, friend_id, month)
    DO UPDATE SET
      total_seconds = monthly_stats.total_seconds + session_duration,
      sessions_count = monthly_stats.sessions_count + 1,
      updated_at = NOW();
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger pour mettre à jour les stats automatiquement
DROP TRIGGER IF EXISTS on_session_ended ON time_sessions;
CREATE TRIGGER on_session_ended
  AFTER UPDATE ON time_sessions
  FOR EACH ROW EXECUTE FUNCTION update_monthly_stats();

-- Fonction pour terminer les sessions avec positions obsolètes
-- À appeler périodiquement ou avant chaque vérification de proximité
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

-- ============================================
-- RPC POUR SESSIONS ACTIVES AVEC DURÉE CALCULÉE
-- ============================================
-- Calcule la durée au moment du fetch (NOW() - started_at)
-- Évite les requêtes supplémentaires et garantit la précision serveur
CREATE OR REPLACE FUNCTION get_active_sessions_with_duration(p_user_id UUID)
RETURNS TABLE(
  id UUID,
  user_id UUID,
  friend_id UUID,
  started_at TIMESTAMPTZ,
  duration_seconds INTEGER,
  is_active BOOLEAN,
  user_last_position_at TIMESTAMPTZ,
  friend_last_position_at TIMESTAMPTZ,
  friend_id_normalized UUID,
  friend_username TEXT,
  friend_avatar_url TEXT
) AS $$
BEGIN
  -- Récupère les sessions où user est user_id
  -- ET sessions où user est friend_id (bidirectionnel)
  RETURN QUERY
  WITH active_sessions AS (
    -- Sessions où p_user_id est user_id
    SELECT 
      ts.id,
      ts.user_id,
      ts.friend_id,
      ts.started_at,
      EXTRACT(EPOCH FROM (NOW() - ts.started_at))::INTEGER as duration_seconds,
      ts.is_active,
      ul_user.recorded_at as user_last_position_at,
      ul_friend.recorded_at as friend_last_position_at,
      ts.friend_id as friend_id_normalized,
      p.username as friend_username,
      p.avatar_url as friend_avatar_url
    FROM time_sessions ts
    LEFT JOIN user_locations ul_user ON ul_user.user_id = ts.user_id
    LEFT JOIN user_locations ul_friend ON ul_friend.user_id = ts.friend_id
    LEFT JOIN profiles p ON p.id = ts.friend_id
    WHERE ts.user_id = p_user_id AND ts.is_active = TRUE
    
    UNION ALL
    
    -- Sessions où p_user_id est friend_id (inversion pour cohérence)
    SELECT 
      ts.id,
      ts.user_id,
      ts.friend_id,
      ts.started_at,
      EXTRACT(EPOCH FROM (NOW() - ts.started_at))::INTEGER as duration_seconds,
      ts.is_active,
      ul_friend.recorded_at as user_last_position_at,  -- Inversé
      ul_user.recorded_at as friend_last_position_at,  -- Inversé
      ts.user_id as friend_id_normalized,
      p.username as friend_username,
      p.avatar_url as friend_avatar_url
    FROM time_sessions ts
    LEFT JOIN user_locations ul_user ON ul_user.user_id = ts.user_id
    LEFT JOIN user_locations ul_friend ON ul_friend.user_id = ts.friend_id
    LEFT JOIN profiles p ON p.id = ts.user_id
    WHERE ts.friend_id = p_user_id AND ts.is_active = TRUE
  )
  SELECT * FROM active_sessions
  ORDER BY started_at DESC;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;
