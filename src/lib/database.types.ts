// Tipos TypeScript para las tablas de Supabase

export interface InventarioDiario {
    id: string;
    fecha: string; // ISO date string
    platos_dia: number; // Stock inicial de platos preparados
    gaseosas: number;
    dinero_inicial?: number; // Caja chica / Base
    bebidas_detalle?: BebidasDetalle; // Detailed beverage inventory
    estado: 'abierto' | 'cerrado';
    stock_platos_real?: number;
    stock_gaseosas_real?: number;
    insumos_principales_inicial?: number; // Para pescado/insumo base
    insumos_principales_final?: number;
    insumos_detalle?: Record<string, number>; // Detailed fish/raw materials
    consumo_personal?: number;
    merma_platos?: number;
    dinero_cierre_real?: number;
    chicha_inicial?: number; // Litros de chicha
    observaciones_cierre?: string;
    created_at: string;
    updated_at: string;
}

export interface Producto {
    id: string;
    nombre: string;
    tipo: 'plato' | 'bebida' | 'complemento' | 'promocion';
    precio: number;
    activo: boolean;
    marca_gaseosa?: 'inca_kola' | 'coca_cola' | 'sprite' | 'fanta' | 'chicha' | null;
    tipo_gaseosa?: 'personal_retornable' | 'descartable' | 'gordita' | 'litro' | 'litro_medio' | 'tres_litros' | 'medio_litro' | 'vaso' | null;
    imagen_url?: string; // URL de la imagen del producto
    descripcion?: string; // Descripción detallada del producto
    fraccion_plato?: number; // Equivalencia en porciones
    receta_detalle?: Record<string, number>; // Ingredientes consumidos (ej. { pescado: 0.150 })
    created_at: string;
}

export interface Merma {
    id: string;
    fecha: string;
    insumo: string;
    cantidad: number;
    motivo?: string;
    usuario_id?: string;
    created_at: string;
}

export interface Gasto {
    id: string;
    descripcion: string;
    monto: number;
    fecha: string;
    metodo_pago?: 'efectivo' | 'yape' | 'plin';
    created_at: string;
}

export interface ItemVenta {
    producto_id: string;
    nombre: string;
    cantidad: number;
    precio: number;
    detalles?: {
        picante?: string;
        termino?: string;
        notas?: string;
    };
    detalle_bebida?: {
        marca: string;
        tipo: string;
    };
    tipo?: 'plato' | 'bebida' | 'complemento' | 'promocion';
    fraccion_plato?: number;
    printed?: boolean;
}

export interface Venta {
    id: string;
    fecha: string; // ISO date string
    items: ItemVenta[];
    total: number;
    insumos_restados?: number;
    gaseosas_restadas: number;
    chicha_restada?: number; // Litros restados en esta venta
    bebidas_detalle?: BebidasDetalle; // Consolidado de bebidas restadas en esta venta
    metodo_pago: 'efectivo' | 'tarjeta' | 'yape' | 'plin' | 'mixto';
    pago_dividido?: {
        efectivo?: number;
        yape?: number;
        plin?: number;
        tarjeta?: number;
    };
    estado_pedido: 'pendiente' | 'listo' | 'entregado';
    estado_pago?: 'pendiente' | 'pagado';
    mesa_id?: number; // ID de la mesa asignada
    notas?: string; // Comentarios del pedido
    created_at: string;
    updated_at?: string; // Add updated_at
    mesas?: { numero: number } | null; // Join result
}

export interface Mesa {
    id: number;
    numero: number;
    estado: 'libre' | 'ocupada';
    created_at: string;
}


export interface StockActual {
    fecha: string;
    gaseosas: number;
    gaseosas_disponibles: number;
    gaseosas_iniciales: number;
    gaseosas_vendidas: number;
    platos_dia: number;
    platos_disponibles: number;
    platos_iniciales: number;
    platos_vendidos: number;
    chicha_inicial?: number;
    chicha_vendida?: number;
    chicha_disponible?: number;
    insumos_principales_inicial?: number;
    insumos_detalle_inicial?: Record<string, number>;
    insumos_detalle_disponible?: Record<string, number>;
    insumos_detalle_vendido?: Record<string, number>;
    dinero_inicial: number;
    estado: 'abierto' | 'cerrado';
    bebidas_detalle?: BebidasDetalle; // Initial stock
    bebidas_ventas?: BebidasDetalle[]; // Array of sales to subtract
}

// Detailed beverage inventory structure (tamaños reales Perú)
export interface BebidasDetalle {
    inca_kola?: {
        personal_retornable?: number;
        descartable?: number;
        gordita?: number;
        litro?: number;
        litro_medio?: number;
        tres_litros?: number;
    };
    coca_cola?: {
        personal_retornable?: number;
        descartable?: number;
        litro?: number;
        litro_medio?: number;
        tres_litros?: number;
    };
    sprite?: {
        personal_retornable?: number;
        descartable?: number;
        litro?: number;
        litro_medio?: number;
        tres_litros?: number;
    };
    fanta?: {
        descartable?: number;
    };
    agua_mineral?: {
        personal?: number;
    };
    chicha?: {
        vaso?: number;
        litro?: number;
        medio_litro?: number;
    };
    maracuya?: {
        vaso?: number;
        litro?: number;
        medio_litro?: number;
    };
    maracumango?: {
        vaso?: number;
        litro?: number;
        medio_litro?: number;
    };
    limonada?: {
        vaso?: number;
        litro?: number;
        medio_litro?: number;
    };
}

export interface ConfiguracionNegocio {
    id: number;
    ruc?: string;
    razon_social?: string;
    direccion?: string;
    telefono?: string;
    mensaje_boleta?: string;
    serie_boleta?: string;
    numero_correlativo?: number;
    serie_ticket?: string;
    numero_ticket?: number;
    printer_ip?: string;
    printer_port?: number;
    updated_at: string;
}

// Tipos para el carrito de compras
export interface ItemCarrito extends ItemVenta {
    subtotal: number;
}

// Tipo para la respuesta de inserción
export interface AperturaResponse {
    success: boolean;
    message: string;
    data?: InventarioDiario;
}

export interface VentaResponse {
    success: boolean;
    message: string;
    data?: Venta;
}
