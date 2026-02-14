
-- Script to add updated_at column to ventas table
-- Use this to enable sorting by payment time

ALTER TABLE ventas 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- Create trigger to auto-update updated_at on modification
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_ventas_updated_at ON ventas;

CREATE TRIGGER update_ventas_updated_at
    BEFORE UPDATE ON ventas
    FOR EACH ROW
    EXECUTE PROCEDURE update_updated_at_column();

-- Backfill existing rows
UPDATE ventas SET updated_at = created_at WHERE updated_at IS NULL;
