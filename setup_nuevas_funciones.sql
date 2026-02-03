-- Script para implementar estadísticas de productos más vendidos
-- IMPORTANTE: Esta tabla NO se reinicia con cierre de caja ni restablecer sistema

-- Tabla para estadísticas de productos (persistente)
CREATE TABLE IF NOT EXISTS estadisticas_productos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    producto_id UUID REFERENCES productos(id),
    nombre_producto VARCHAR(255) NOT NULL,
    cantidad_total NUMERIC DEFAULT 0,
    veces_vendido INTEGER DEFAULT 0,
    ingresos_total NUMERIC DEFAULT 0,
    ultima_venta TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Crear índice para mejor rendimiento
CREATE INDEX IF NOT EXISTS idx_estadisticas_cantidad ON estadisticas_productos(cantidad_total DESC);
CREATE INDEX IF NOT EXISTS idx_estadisticas_veces ON estadisticas_productos(veces_vendido DESC);

-- Habilitar RLS
ALTER TABLE estadisticas_productos ENABLE ROW LEVEL SECURITY;

-- Política de acceso total
DROP POLICY IF EXISTS "Allow all on estadisticas_productos" ON estadisticas_productos;
CREATE POLICY "Allow all on estadisticas_productos" ON estadisticas_productos
    FOR ALL USING (true) WITH CHECK (true);

-- Tabla para notas de inventario
CREATE TABLE IF NOT EXISTS notas_inventario (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    mensaje TEXT NOT NULL,
    prioridad VARCHAR(20) DEFAULT 'normal' CHECK (prioridad IN ('baja', 'normal', 'urgente')),
    estado VARCHAR(20) DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'completado')),
    created_by VARCHAR(100) DEFAULT 'Cajera',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla para stock de productos del inventario
CREATE TABLE IF NOT EXISTS stock_productos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    producto_id VARCHAR(50) UNIQUE NOT NULL,
    nombre VARCHAR(100) NOT NULL,
    cantidad NUMERIC DEFAULT 0,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Políticas para las tablas
ALTER TABLE notas_inventario ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_productos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all on notas_inventario" ON notas_inventario;
CREATE POLICY "Allow all on notas_inventario" ON notas_inventario
    FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all on stock_productos" ON stock_productos;
CREATE POLICY "Allow all on stock_productos" ON stock_productos
    FOR ALL USING (true) WITH CHECK (true);

-- Configuración del negocio para impresión de boletas
CREATE TABLE IF NOT EXISTS configuracion_negocio (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ruc VARCHAR(11),
    razon_social VARCHAR(255) DEFAULT 'POCHOLO''S CHICKEN',
    direccion TEXT,
    telefono VARCHAR(20),
    mensaje_boleta TEXT DEFAULT '¡Gracias por su preferencia!',
    serie_boleta VARCHAR(10) DEFAULT 'B001',
    numero_correlativo INTEGER DEFAULT 1,
    igv_incluido BOOLEAN DEFAULT true,
    porcentaje_igv NUMERIC DEFAULT 18,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE configuracion_negocio ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all on configuracion_negocio" ON configuracion_negocio;
CREATE POLICY "Allow all on configuracion_negocio" ON configuracion_negocio
    FOR ALL USING (true) WITH CHECK (true);

-- Insertar configuración inicial
INSERT INTO configuracion_negocio (ruc, razon_social, direccion, mensaje_boleta)
VALUES ('', 'POCHOLO''S CHICKEN', '', '¡Gracias por su preferencia! La Pasión Hecha Sazón')
ON CONFLICT DO NOTHING;

SELECT 'Tablas creadas correctamente' as resultado;
