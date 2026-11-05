-- FASE 1: EXCLUSIVAMENTE DATOS GEOGRAFICOS PUBLICABLES.
-- Prohibido guardar en esta base ubicaciones, nombres, sexo, visitas o cantidades de personas sordas.
CREATE TABLE IF NOT EXISTS territories (
  id TEXT PRIMARY KEY,
  locality TEXT NOT NULL,
  number INTEGER NOT NULL CHECK(number > 0 AND number <= 999999),
  geometry TEXT NOT NULL,
  published INTEGER NOT NULL DEFAULT 0 CHECK(published IN (0,1)),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(number)
);
CREATE INDEX IF NOT EXISTS idx_territories_public ON territories(published, locality);
CREATE TABLE IF NOT EXISTS points (
  id TEXT PRIMARY KEY,
  lat REAL NOT NULL,
  lng REAL NOT NULL,
  title TEXT NOT NULL,
  category TEXT NOT NULL CHECK(category IN ('referencia','acceso','servicio','otro')),
  description TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','approved','rejected')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_points_status ON points(status, created_at);
