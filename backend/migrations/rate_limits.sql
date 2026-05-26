-- Ejecutar en Supabase SQL Editor
-- Tabla para rate limiting persistente (sobrevive reinicios del servidor)

CREATE TABLE IF NOT EXISTS rate_limits (
  id          BIGSERIAL PRIMARY KEY,
  key         TEXT NOT NULL,          -- "ip:action" e.g. "1.2.3.4:login"
  hit_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_rate_limits_key_hit ON rate_limits (key, hit_at);

-- Limpieza automática de registros viejos (cada hora via pg_cron, o se limpia en el código)
-- Opcional: si tienes pg_cron habilitado en Supabase:
-- SELECT cron.schedule('cleanup-rate-limits', '0 * * * *', $$DELETE FROM rate_limits WHERE hit_at < now() - interval '2 hours'$$);
