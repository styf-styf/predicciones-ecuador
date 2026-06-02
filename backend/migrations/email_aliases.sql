-- Tabla de aliases corporativos dinámicos
-- Ejecutar en Supabase SQL Editor

CREATE TABLE IF NOT EXISTS email_aliases (
  alias TEXT PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO email_aliases (alias) VALUES ('info'), ('soporte'), ('alertas'), ('admin')
ON CONFLICT DO NOTHING;
