-- ==========================================
-- SCRIPT DE REPARACIÓN DE BASE DE DATOS
-- Ejecuta TODO este script en el SQL Editor de Supabase
-- ==========================================

-- 1. Asegurar columnas en table 'productos'
ALTER TABLE productos 
ADD COLUMN IF NOT EXISTS marca_gaseosa text CHECK (marca_gaseosa IN ('inca_kola', 'coca_cola', 'sprite', 'fanta', 'chicha')),
ADD COLUMN IF NOT EXISTS tipo_gaseosa text CHECK (tipo_gaseosa IN ('personal_retornable', 'descartable', 'gordita', 'litro', 'litro_medio', 'tres_litros', 'medio_litro'));

-- 2. Asegurar columnas en tabla 'ventas'
ALTER TABLE ventas
ADD COLUMN IF NOT EXISTS bebidas_detalle jsonb;

-- 3. Asegurar columnas en tabla 'inventario_diario'
ALTER TABLE inventario_diario
ADD COLUMN IF NOT EXISTS bebidas_detalle jsonb;

-- 4. ELIMINAR la función anterior para evitar conflictos de tipos
DROP FUNCTION IF EXISTS obtener_stock_detallado(date);

-- 5. CREAR la función completa y corregida
CREATE OR REPLACE FUNCTION obtener_stock_detallado(fecha_consulta date)
RETURNS TABLE (
    fecha date,
    pollos_enteros numeric,
    gaseosas numeric,
    pollos_vendidos numeric,
    gaseosas_vendidas numeric,
    pollos_disponibles numeric,
    gaseosas_disponibles numeric,
    bebidas_detalle jsonb,
    bebidas_ventas jsonb[] -- NUEVO: Array de ventas para restar en frontend
) AS $$
DECLARE
    apertura record;
    ventas_pollos numeric;
    ventas_gaseosas numeric;
    ventas_detalle_array jsonb[];
BEGIN
    -- Obtener datos de apertura del día
    SELECT * INTO apertura 
    FROM inventario_diario 
    WHERE inventario_diario.fecha = fecha_consulta;
    
    -- Si no hay apertura, no devolver nada
    IF NOT FOUND THEN
        RETURN;
    END IF;

    -- Calcular totales de ventas del día y obtener array de detalles
    SELECT 
        COALESCE(SUM(pollos_restados), 0),
        COALESCE(SUM(gaseosas_restadas), 0),
        array_agg(bebidas_detalle) FILTER (WHERE bebidas_detalle IS NOT NULL)
    INTO ventas_pollos, ventas_gaseosas, ventas_detalle_array
    FROM ventas 
    WHERE ventas.fecha = fecha_consulta;

    -- Retornar la estructura combinada
    RETURN QUERY SELECT 
        apertura.fecha,
        apertura.pollos_enteros,
        apertura.gaseosas,
        ventas_pollos,
        ventas_gaseosas,
        (apertura.pollos_enteros - ventas_pollos),
        (apertura.gaseosas - ventas_gaseosas),
        apertura.bebidas_detalle,
        COALESCE(ventas_detalle_array, ARRAY[]::jsonb[]); -- Retornar array vacío si es null
END;
$$ LANGUAGE plpgsql;

-- 6. Confirmación (Opcional, solo para verificar)
SELECT 'Base de datos reparada correctamente' as mensaje;
