// Tipos TypeScript para las tablas de Supabase

export interface InventarioDiario {
    id: string;
    fecha: string; // ISO date string
    pollos_enteros: number;
    gaseosas: number;
    dinero_inicial?: number; // Caja chica / Base
    bebidas_detalle?: BebidasDetalle; // Detailed beverage inventory
    estado: 'abierto' | 'cerrado';
    stock_pollos_real?: number;
    stock_gaseosas_real?: number;
    papas_iniciales?: number;
    papas_finales?: number;
    dinero_cierre_real?: number;
    observaciones_cierre?: string;
    created_at: string;
    updated_at: string;
}

export interface Producto {
    id: string;
    nombre: string;
    tipo: 'pollo' | 'bebida' | 'complemento' | 'promocion';
    precio: number;
    fraccion_pollo: number; // 1.0, 0.25, 0.125, 0
    // Campos para trackeo de bebidas
    marca_gaseosa?: 'inca_kola' | 'coca_cola' | 'sprite' | 'fanta' | 'chicha' | null;
    tipo_gaseosa?: 'personal_retornable' | 'descartable' | 'gordita' | 'litro' | 'litro_medio' | 'tres_litros' | 'medio_litro' | null;
    activo: boolean;
    imagen_url?: string; // URL de la imagen del producto
    descripcion?: string; // Descripción detallada del producto
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
    fraccion_pollo: number;
    // Detalle de bebida para este item
    detalle_bebida?: {
        marca: 'inca_kola' | 'coca_cola' | 'sprite' | 'fanta' | 'chicha';
        tipo: 'personal_retornable' | 'descartable' | 'gordita' | 'litro' | 'litro_medio' | 'tres_litros' | 'medio_litro';
    };
    tipo?: 'pollo' | 'bebida' | 'complemento' | 'promocion';
    printed?: boolean;
}

export interface Venta {
    id: string;
    fecha: string; // ISO date string
    items: ItemVenta[];
    total: number;
    pollos_restados: number;
    gaseosas_restadas: number;
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
    mesa?: string; // Deprecated: usar mesa_id
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
    pollos_enteros: number;
    gaseosas: number;
    pollos_disponibles: number;
    gaseosas_disponibles: number;
    pollos_iniciales: number;
    gaseosas_iniciales: number;
    pollos_vendidos: number;
    gaseosas_vendidas: number;
    papas_iniciales?: number;
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
        gordita?: number;
        litro?: number;
        litro_medio?: number;
        tres_litros?: number;
    };
    sprite?: {
        descartable?: number;
        litro_medio?: number;
        tres_litros?: number;
    };
    fanta?: {
        descartable?: number;
        mediana?: number;
        tres_litros?: number;
    };
    agua_mineral?: {
        personal?: number;
        grande?: number;
    };
}

// Tipos para el carrito de compras
export interface ItemCarrito extends ItemVenta {
    subtotal: number;
    detalles?: {
        parte?: string; // pecho, pierna, ala, encuentro, entrepierna, rabadilla
        trozado?: string; // entero, 1/4, 1/8
        notas?: string;
    };
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
