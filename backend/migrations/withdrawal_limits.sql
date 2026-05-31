-- Agregar columnas de límites de retiro y predicción a la tabla config
-- Ejecutar en Supabase SQL Editor

ALTER TABLE config
ADD COLUMN IF NOT EXISTS min_withdrawal NUMERIC DEFAULT 10,
ADD COLUMN IF NOT EXISTS max_withdrawal NUMERIC DEFAULT 1000;

-- min_bet y max_bet ya deberían existir, pero por seguridad:
ALTER TABLE config
ADD COLUMN IF NOT EXISTS min_bet NUMERIC DEFAULT 1,
ADD COLUMN IF NOT EXISTS max_bet NUMERIC DEFAULT 10;

-- Establecer valores por defecto en la fila existente
UPDATE config SET
  min_withdrawal = COALESCE(min_withdrawal, 10),
  max_withdrawal = COALESCE(max_withdrawal, 1000),
  min_bet = COALESCE(min_bet, 1),
  max_bet = COALESCE(max_bet, 10)
WHERE id = 1;
