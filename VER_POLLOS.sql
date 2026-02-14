-- ============================================================
-- VERIFICAR PRODUCTOS DE POLLO
-- ============================================================
-- Este script lista todos los productos de tipo 'pollo'
-- ordenados por nombre y precio, para identificar
-- cuáles son las versiones "SOLO" (más baratas).

SELECT id, nombre, precio, tipo, fraccion_pollo 
FROM productos 
WHERE tipo = 'pollo' 
ORDER BY nombre, precio;
