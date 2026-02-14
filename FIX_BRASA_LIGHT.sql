-- Busca los productos que contengan 'Brasa Light' y verifica su configuración actual
SELECT id, nombre, fraccion_pollo FROM productos WHERE nombre ILIKE '%Brasa Light%';

-- Actualiza 'Brasa Light' para que descuente 0.25 (1/4 de pollo)
-- Solo si actualmente es 0 o NULL
UPDATE productos 
SET fraccion_pollo = 0.25 
WHERE nombre ILIKE '%Brasa Light%' 
AND (fraccion_pollo = 0 OR fraccion_pollo IS NULL);

-- Verifica el cambio
SELECT id, nombre, fraccion_pollo FROM productos WHERE nombre ILIKE '%Brasa Light%';
