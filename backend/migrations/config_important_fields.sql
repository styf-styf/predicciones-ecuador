-- Agregar campos importantes a la tabla config
-- Ejecutar en Supabase SQL Editor

ALTER TABLE config
ADD COLUMN IF NOT EXISTS max_changes INTEGER DEFAULT 3,
ADD COLUMN IF NOT EXISTS daily_withdrawal_limit NUMERIC DEFAULT NULL;

-- Establecer valores por defecto en la fila existente
UPDATE config SET
  max_changes = COALESCE(max_changes, 3),
  daily_withdrawal_limit = NULL
WHERE id = 1;
