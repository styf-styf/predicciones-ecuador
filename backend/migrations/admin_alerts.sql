-- Tabla de alertas persistentes para el admin
-- Ejecutar en Supabase SQL Editor

CREATE TABLE IF NOT EXISTS admin_alerts (
  id BIGSERIAL PRIMARY KEY,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  details JSONB,
  resolved BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_admin_alerts_resolved ON admin_alerts (resolved, created_at DESC);
