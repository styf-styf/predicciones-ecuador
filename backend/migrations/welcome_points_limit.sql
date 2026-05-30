-- Agregar columna de límite de usuarios con saldo de bienvenida
-- Ejecutar en Supabase SQL Editor

ALTER TABLE config
ADD COLUMN IF NOT EXISTS welcome_points_limit INTEGER DEFAULT NULL;

-- NULL = sin límite (todos los usuarios reciben el saldo de bienvenida)
-- N    = solo los primeros N usuarios registrados reciben el saldo
