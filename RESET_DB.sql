-- 🚨 SCRIPT DE REINICIO DE SISTEMA (BORRA TODO EL HISTORIAL) 🚨
-- Ejecuta esto en el Editor SQL de Supabase para dejar el sistema como nuevo.

-- 1. Borrar Ventas (Historial de pedidos)
TRUNCATE TABLE ventas CASCADE;

-- 2. Borrar Gastos (Historial de egresos)
TRUNCATE TABLE gastos CASCADE;

-- 3. Borrar Inventarios (Aperturas y Cierres diarios)
TRUNCATE TABLE inventario_diario CASCADE;

-- 4. Liberar todas las mesas
UPDATE mesas SET estado = 'libre';

-- NOTA: Esto NO borra tus Productos ni Usuarios. Solo el historial.
