-- ============================================================
-- FIX: Corregir fracciones de pollo en productos
-- ============================================================
-- PROBLEMA: Algunos productos tienen fraccion_pollo con valores
-- imprecisos (ej: 0.13 en vez de 0.125).
-- Esto causa errores acumulados y muestra decimales confusos.
--
-- SOLUCIÓN: Redondear al octavo (1/8 = 0.125) más cercano.
-- ============================================================

-- 1. VER VALORES ACTUALES (ejecutar primero para verificar)
SELECT id, nombre, fraccion_pollo, 
       ROUND(fraccion_pollo * 8) / 8.0 AS fraccion_corregida
FROM productos
WHERE fraccion_pollo > 0
ORDER BY nombre;

-- 2. CORREGIR VALORES (redondear al octavo más cercano)
UPDATE productos
SET fraccion_pollo = ROUND(fraccion_pollo * 8) / 8.0
WHERE fraccion_pollo > 0;

-- 3. VERIFICAR CORRECCIÓN
SELECT id, nombre, fraccion_pollo
FROM productos
WHERE fraccion_pollo > 0
ORDER BY nombre;

-- 4. CORREGIR VENTAS EXISTENTES DEL DÍA (opcional, para que el dashboard se corrija hoy)
-- Esto recalcula pollos_restados de ventas pendientes basándose en los items guardados.
-- Solo necesitas ejecutar esto si quieres que las ventas de hoy ya hechas se corrijan.
UPDATE ventas v
SET pollos_restados = (
    SELECT COALESCE(SUM(
        ROUND((item->>'fraccion_pollo')::numeric * 8) / 8.0 * (item->>'cantidad')::integer
    ), 0)
    FROM jsonb_array_elements(v.items::jsonb) AS item
    WHERE (item->>'fraccion_pollo')::numeric > 0
)
WHERE fecha = CURRENT_DATE
AND estado_pago = 'pendiente';
