-- Add columns for Ticket numbering if they don't exist
ALTER TABLE configuracion_negocio 
ADD COLUMN IF NOT EXISTS serie_ticket TEXT DEFAULT 'T001',
ADD COLUMN IF NOT EXISTS numero_ticket BIGINT DEFAULT 0;

-- Reset Boleta counter to 0 (so next is 1)
UPDATE configuracion_negocio 
SET numero_correlativo = 0;

-- Reset Ticket counter to 0 (so next is 1)
UPDATE configuracion_negocio 
SET numero_ticket = 0;

-- Ensure serie_ticket is set
UPDATE configuracion_negocio 
SET serie_ticket = 'T001' 
WHERE serie_ticket IS NULL;
