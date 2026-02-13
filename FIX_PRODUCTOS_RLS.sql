-- Ejecutar en el Editor SQL de Supabase
-- Esto permite actualizar precios de productos desde la app

-- Opción 1: Si RLS está habilitado, agregar política de UPDATE
CREATE POLICY "Permitir actualizar productos" ON productos
  FOR UPDATE USING (true) WITH CHECK (true);

-- Si la política ya existe o da error, puedes usar Opción 2:
-- ALTER TABLE productos DISABLE ROW LEVEL SECURITY;
-- (Esto deshabilita RLS completamente para la tabla productos)
