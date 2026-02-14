-- ============================================================
-- FIX: Configurar correctamente las 'Gorditas'
-- ============================================================
-- El usuario confirmó que NO hay Gordita de Coca Cola.
-- Asumimos que "Gordita" se refiere principalmente a Inca Kola.

-- 1. Configurar tipo y tamaño para todas las gorditas
UPDATE productos
SET 
  tipo = 'bebida',
  tipo_gaseosa = 'gordita',
  marca_gaseosa = 'inca_kola' -- Por defecto, todas las gorditas son Inca Kola
WHERE nombre ILIKE '%gordita%' OR nombre ILIKE '%gorda%';

-- 2. (Opcional) Si hubiera Sprite o Fanta, podrías descomentar esto:
-- UPDATE productos SET marca_gaseosa = 'sprite' WHERE nombre ILIKE '%gordita%' AND nombre ILIKE '%Sprite%';
-- UPDATE productos SET marca_gaseosa = 'fanta' WHERE nombre ILIKE '%gordita%' AND nombre ILIKE '%Fanta%';

-- Verificar cambio
SELECT id, nombre, tipo, tipo_gaseosa, marca_gaseosa 
FROM productos 
WHERE nombre ILIKE '%gordita%' OR nombre ILIKE '%gorda%';
