-- 1. Agrega columnas para identificar tipo y marca de gaseosa en la tabla de productos
ALTER TABLE productos 
ADD COLUMN IF NOT EXISTS marca_gaseosa text CHECK (marca_gaseosa IN ('inca_kola', 'coca_cola', 'sprite', 'fanta', 'chicha')),
ADD COLUMN IF NOT EXISTS tipo_gaseosa text CHECK (tipo_gaseosa IN ('personal_retornable', 'descartable', 'gordita', 'litro', 'litro_medio', 'tres_litros', 'medio_litro'));

-- 2. Agrega columna para guardar el detalle exacto de qué bebidas se vendieron en cada venta
ALTER TABLE ventas
ADD COLUMN IF NOT EXISTS bebidas_detalle jsonb;

-- 2.1 Asegurar que inventario_diario tenga la columna bebidas_detalle
ALTER TABLE inventario_diario
ADD COLUMN IF NOT EXISTS bebidas_detalle jsonb;


-- 3. Función para calcular el stock actual detallado
CREATE OR REPLACE FUNCTION obtener_stock_detallado(fecha_consulta date)
RETURNS TABLE (
    fecha date,
    pollos_enteros numeric,
    gaseosas numeric,
    pollos_vendidos numeric,
    gaseosas_vendidas numeric,
    pollos_disponibles numeric,
    gaseosas_disponibles numeric,
    bebidas_detalle jsonb
) AS $$
DECLARE
    apertura record;
    ventas_pollos numeric;
    ventas_gaseosas numeric;
BEGIN
    -- Obtener apertura
    SELECT * INTO apertura FROM inventario_diario WHERE inventario_diario.fecha = fecha_consulta;
    
    IF NOT FOUND THEN
        RETURN;
    END IF;

    -- Calcular totales simples
    SELECT 
        COALESCE(SUM(pollos_restados), 0),
        COALESCE(SUM(gaseosas_restadas), 0)
    INTO ventas_pollos, ventas_gaseosas
    FROM ventas 
    WHERE ventas.fecha = fecha_consulta;

    RETURN QUERY SELECT 
        apertura.fecha,
        apertura.pollos_enteros,
        apertura.gaseosas,
        ventas_pollos,
        ventas_gaseosas,
        (apertura.pollos_enteros - ventas_pollos),
        (apertura.gaseosas - ventas_gaseosas),
        apertura.bebidas_detalle;
END;
$$ LANGUAGE plpgsql;
