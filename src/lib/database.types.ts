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
    dinero_cierre_real?: number;
    observaciones_cierre?: string;
    created_at: string;
    updated_at: string;
}

export interface Producto {
    id: string;
    nombre: string;
    tipo: 'pollo' | 'bebida' | 'complemento';
    precio: number;
    fraccion_pollo: number; // 1.0, 0.25, 0.125, 0
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
    created_at: string;
}

export interface ItemVenta {
    producto_id: string;
    nombre: string;
    cantidad: number;
    precio: number;
    fraccion_pollo: number;
}

export interface Venta {
    id: string;
    fecha: string; // ISO date string
    items: ItemVenta[];
    total: number;
    pollos_restados: number;
    gaseosas_restadas: number;
    metodo_pago: 'efectivo' | 'tarjeta' | 'yape' | 'plin';
    estado_pedido: 'pendiente' | 'listo' | 'entregado';
    estado_pago?: 'pendiente' | 'pagado';
    mesa?: string; // Deprecated: usar mesa_id
    mesa_id?: number; // ID de la mesa asignada
    notas?: string; // Comentarios del pedido
    created_at: string;
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
    dinero_inicial: number;
}

// Detailed beverage inventory structure
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
        personal_retornable?: number;
        descartable?: number;
        gordita?: number;
        litro?: number;
        litro_medio?: number;
        tres_litros?: number;
    };
    fanta?: {
        personal_retornable?: number;
        descartable?: number;
        gordita?: number;
        litro?: number;
        litro_medio?: number;
        tres_litros?: number;
    };
    chicha?: {
        litro?: number;
        medio_litro?: number;
    };
}

// Tipos para el carrito de compras
export interface ItemCarrito extends ItemVenta {
    subtotal: number;
    detalles?: {
        parte?: 'pecho' | 'pierna' | 'ala' | 'encuentro';
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
