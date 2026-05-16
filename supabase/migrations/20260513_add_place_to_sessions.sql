-- Migration: ajoute les champs de lieu aux sessions de temps
-- Permet le reverse geocoding (Nominatim) pour savoir OÙ les amis ont passé du temps ensemble.

ALTER TABLE time_sessions
  ADD COLUMN IF NOT EXISTS latitude       DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS longitude      DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS place_name     TEXT,
  ADD COLUMN IF NOT EXISTS place_category TEXT,
  ADD COLUMN IF NOT EXISTS place_emoji    TEXT,
  ADD COLUMN IF NOT EXISTS city           TEXT;

-- Index pour les requêtes géographiques futures (optionnel mais utile)
CREATE INDEX IF NOT EXISTS idx_time_sessions_city
  ON time_sessions (city)
  WHERE city IS NOT NULL;

COMMENT ON COLUMN time_sessions.latitude        IS 'Latitude GPS enregistrée au début de la session';
COMMENT ON COLUMN time_sessions.longitude       IS 'Longitude GPS enregistrée au début de la session';
COMMENT ON COLUMN time_sessions.place_name      IS 'Nom du lieu détecté via Nominatim (ex: Restaurant, Cinéma Rex)';
COMMENT ON COLUMN time_sessions.place_category  IS 'Catégorie du lieu (restaurant, cinema, bar, park...)';
COMMENT ON COLUMN time_sessions.place_emoji     IS 'Emoji représentant la catégorie (ex: 🍽️, 🎬, 🍻)';
COMMENT ON COLUMN time_sessions.city            IS 'Ville du lieu (pour détecter les voyages)';
