-- Verificar si RLS está bloqueando los updates
-- Opción 1: Deshabilitar RLS para configuracion_negocio (más simple)
ALTER TABLE configuracion_negocio DISABLE ROW LEVEL SECURITY;

-- Opción 2: Si prefieres mantener RLS, crear una política que permita updates
-- CREATE POLICY "allow_all_updates" ON configuracion_negocio FOR UPDATE USING (true) WITH CHECK (true);
-- CREATE POLICY "allow_all_select" ON configuracion_negocio FOR SELECT USING (true);

-- Verificar que las columnas existen y tienen datos
SELECT id, serie_boleta, numero_correlativo, serie_ticket, numero_ticket FROM configuracion_negocio;
