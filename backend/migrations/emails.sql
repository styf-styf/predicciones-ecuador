-- Tabla de correos recibidos y enviados
-- Ejecutar en Supabase SQL Editor

CREATE TABLE IF NOT EXISTS emails (
  id TEXT PRIMARY KEY, -- ID de Resend
  type TEXT NOT NULL DEFAULT 'received', -- 'received' | 'sent'
  alias TEXT NOT NULL, -- 'info', 'soporte', 'alertas', 'admin'
  from_address TEXT NOT NULL,
  to_address TEXT NOT NULL,
  subject TEXT NOT NULL,
  html TEXT,
  text TEXT,
  message_id TEXT, -- para threading
  in_reply_to TEXT, -- message_id del correo padre
  references TEXT, -- historial de thread
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_emails_alias ON emails (alias, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_emails_read ON emails (read, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_emails_type ON emails (type, created_at DESC);
