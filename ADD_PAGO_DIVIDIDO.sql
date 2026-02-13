-- Agregar columna pago_dividido a tabla ventas (para pagos divididos)
-- Ejecutar en el SQL Editor de Supabase
ALTER TABLE ventas ADD COLUMN IF NOT EXISTS pago_dividido JSONB DEFAULT NULL;

-- Ejemplo de valor: {"efectivo": 20, "yape": 20}
-- Si es NULL, significa pago normal (un solo método)
