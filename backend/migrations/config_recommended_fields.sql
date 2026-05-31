-- Campos recomendados: alertas y categorías editables
-- Ejecutar en Supabase SQL Editor

ALTER TABLE config
ADD COLUMN IF NOT EXISTS circulation_alert NUMERIC DEFAULT NULL,
ADD COLUMN IF NOT EXISTS pending_tx_alert INTEGER DEFAULT NULL,
ADD COLUMN IF NOT EXISTS market_categories TEXT DEFAULT 'deporte,farandula,politica,elecciones,pais,general';

UPDATE config SET
  market_categories = COALESCE(market_categories, 'deporte,farandula,politica,elecciones,pais,general')
WHERE id = 1;
