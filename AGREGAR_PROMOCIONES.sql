-- ============================================================
-- AGREGAR PROMOCIONES
-- ============================================================
-- Ejecutar en Supabase -> SQL Editor
-- ============================================================

INSERT INTO productos (nombre, tipo, precio, fraccion_pollo, activo, descripcion) VALUES
  ('Promo: Pollo Entero + Chicha 1L', 'promocion', 73, 1, true, 'Pollo entero a la brasa + Chicha de 1 litro'),
  ('Promo: Pollo Entero + Gaseosa 1.5L', 'promocion', 76, 1, true, 'Pollo entero a la brasa + Gaseosa de 1.5 litros'),
  ('Promo: Pollo Entero + Chaufa + Chicha 1L', 'promocion', 83, 1.125, true, 'Pollo entero a la brasa + Chaufa + Chicha de 1 litro'),
  ('Promo: Pollo Entero + 1/4 Pollo', 'promocion', 82, 1.25, true, 'Pollo entero + 1/4 de pollo solo');

-- Verificar que se insertaron correctamente
SELECT id, nombre, tipo, precio, fraccion_pollo FROM productos WHERE tipo = 'promocion' ORDER BY precio;
