-- BASE CONFIDENCIAL: crear como D1 SEPARADA (lambayeque_territorios_privados).
-- Conectar SOLO al Worker de administracion. PROHIBIDO conectar al Worker publico.
-- NO insertar datos reales en GitHub, codigo, logs, URLs, analitica ni GeoJSON publico.
CREATE TABLE IF NOT EXISTS private_person_points (
  id TEXT PRIMARY KEY,
  territory_id TEXT,
  lat REAL NOT NULL,
  lng REAL NOT NULL,
  sex TEXT NOT NULL CHECK(sex IN ('hombre','mujer')),
  note TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_private_point_territory ON private_person_points(territory_id);

-- Protección contra intentos repetidos de acceso al editor.
-- k es un hash HMAC de la IP; nunca se almacena la dirección IP en texto claro.
CREATE TABLE IF NOT EXISTS admin_login_limits (
  k TEXT PRIMARY KEY,
  failed INTEGER NOT NULL DEFAULT 0,
  window_start INTEGER NOT NULL
);
