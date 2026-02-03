import { supabase, obtenerFechaHoy } from './supabase';
import type { Venta } from './database.types';
import { startOfDay, endOfDay, subDays, startOfMonth, endOfMonth, format } from 'date-fns';

export interface Metricas {
    totalIngresos: number;
    cantidadPedidos: number;
    promedioPorPedido: number;
    pollosVendidos: number;
    gaseosasVendidas: number;
}

export interface VentaPorDia {
    fecha: string;
    total: number;
    cantidad: number;
}

export type RangoTiempo = 'hoy' | 'ayer' | 'ultimos7dias' | 'mesPasado' | 'personalizado';

/**
 * Obtiene todas las ventas del día actual
 */
export const obtenerVentasDelDia = async (): Promise<Venta[]> => {
    try {
        const fechaHoy = obtenerFechaHoy();
        const { data, error } = await supabase
            .from('ventas')
            .select('*')
            .eq('fecha', fechaHoy)
            .order('created_at', { ascending: false });

        if (error) throw error;
        return data || [];
    } catch (error) {
        console.error('Error al obtener ventas del día:', error);
        return [];
    }
};

/**
 * Obtiene ventas filtradas por rango de fechas (solo ventas pagadas)
 */
export const obtenerVentasPorRango = async (
    fechaInicio: string,
    fechaFin: string
): Promise<Venta[]> => {
    try {
        console.log('[obtenerVentasPorRango] Consultando:', { fechaInicio, fechaFin });

        const { data, error } = await supabase
            .from('ventas')
            .select('*')
            .gte('fecha', fechaInicio)
            .lte('fecha', fechaFin)
            .order('created_at', { ascending: false });

        console.log('[obtenerVentasPorRango] Resultado:', { error, dataLength: data?.length, data });

        if (error) throw error;
        return data || [];
    } catch (error) {
        console.error('Error al obtener ventas por rango:', error);
        return [];
    }
};

/**
 * Calcula métricas a partir de un array de ventas
 */
export const calcularMetricas = (ventas: Venta[]): Metricas => {
    if (ventas.length === 0) {
        return {
            totalIngresos: 0,
            cantidadPedidos: 0,
            promedioPorPedido: 0,
            pollosVendidos: 0,
            gaseosasVendidas: 0,
        };
    }

    const totalIngresos = ventas.reduce((sum, venta) => sum + venta.total, 0);
    const cantidadPedidos = ventas.length;
    const promedioPorPedido = totalIngresos / cantidadPedidos;
    const pollosVendidos = ventas.reduce((sum, venta) => sum + venta.pollos_restados, 0);
    const gaseosasVendidas = ventas.reduce((sum, venta) => sum + venta.gaseosas_restadas, 0);

    return {
        totalIngresos,
        cantidadPedidos,
        promedioPorPedido,
        pollosVendidos,
        gaseosasVendidas,
    };
};

/**
 * Obtiene ventas agrupadas por día para gráficos (solo ventas pagadas)
 */
export const obtenerVentasPorDia = async (
    fechaInicio: string,
    fechaFin: string
): Promise<VentaPorDia[]> => {
    try {
        const { data, error } = await supabase
            .from('ventas')
            .select('fecha, total')
            .gte('fecha', fechaInicio)
            .lte('fecha', fechaFin)
            .order('fecha', { ascending: true });

        if (error) throw error;

        // Agrupar por fecha
        const ventasAgrupadas = (data || []).reduce((acc, venta) => {
            const fecha = venta.fecha;
            if (!acc[fecha]) {
                acc[fecha] = { fecha, total: 0, cantidad: 0 };
            }
            acc[fecha].total += venta.total;
            acc[fecha].cantidad += 1;
            return acc;
        }, {} as Record<string, VentaPorDia>);

        return Object.values(ventasAgrupadas);
    } catch (error) {
        console.error('Error al obtener ventas por día:', error);
        return [];
    }
};

/**
 * Obtiene el rango de fechas según el filtro seleccionado
 */
export const obtenerRangoFechas = (rango: RangoTiempo): { inicio: string; fin: string } => {
    const hoy = new Date();

    switch (rango) {
        case 'hoy':
            // Para "hoy", usar la fecha actual sin restricción de hora
            const fechaHoy = format(hoy, 'yyyy-MM-dd');
            return {
                inicio: fechaHoy,
                fin: fechaHoy,
            };

        case 'ayer':
            const ayer = subDays(hoy, 1);
            const fechaAyer = format(ayer, 'yyyy-MM-dd');
            return {
                inicio: fechaAyer,
                fin: fechaAyer,
            };

        case 'ultimos7dias':
            return {
                inicio: format(subDays(hoy, 6), 'yyyy-MM-dd'),
                fin: format(hoy, 'yyyy-MM-dd'),
            };

        case 'mesPasado':
            const mesAnterior = subDays(hoy, 30);
            return {
                inicio: format(startOfMonth(mesAnterior), 'yyyy-MM-dd'),
                fin: format(endOfMonth(mesAnterior), 'yyyy-MM-dd'),
            };

        default:
            const fechaDefault = format(hoy, 'yyyy-MM-dd');
            return {
                inicio: fechaDefault,
                fin: fechaDefault,
            };
    }
};

/**
 * Busca ventas por número de mesa o nombre de producto
 */
export const buscarVentas = (ventas: Venta[], termino: string): Venta[] => {
    if (!termino.trim()) return ventas;

    const terminoLower = termino.toLowerCase();

    return ventas.filter((venta) => {
        // Buscar en items (productos)
        const tieneProducto = venta.items.some((item) =>
            item.nombre.toLowerCase().includes(terminoLower)
        );

        // Buscar en método de pago
        const tieneMetodoPago = (venta.metodo_pago || '').toLowerCase().includes(terminoLower);

        // Buscar en ID (como número de pedido)
        const tieneId = venta.id.toLowerCase().includes(terminoLower);

        return tieneProducto || tieneMetodoPago || tieneId;
    });
};

/**
 * Obtiene ventas agrupadas por hora para el mapa de calor
 */
export const obtenerVentasPorHora = (ventas: Venta[]): { hora: string; total: number; cantidad: number }[] => {
    const horasData = Array.from({ length: 24 }, (_, i) => ({
        hora: `${i.toString().padStart(2, '0')}:00`,
        total: 0,
        cantidad: 0
    }));

    ventas.forEach(venta => {
        const hora = new Date(venta.created_at).getHours();
        horasData[hora].total += venta.total;
        horasData[hora].cantidad += 1;
    });

    return horasData.filter(h => h.cantidad > 0);
};

export interface EstadisticaProducto {
    id: string; // usaremos el nombre como id si no hay id real
    nombre_producto: string;
    cantidad_total: number;
    veces_vendido: number;
    ingresos_total: number;
}

/**
 * Calcula el ranking de productos más vendidos basándose en un array de ventas
 */
export const calcularTopProductos = (ventas: Venta[]): EstadisticaProducto[] => {
    const productosMap = new Map<string, EstadisticaProducto>();

    ventas.forEach(venta => {
        venta.items.forEach(item => {
            const key = item.nombre; // Usamos el nombre como clave única

            if (!productosMap.has(key)) {
                productosMap.set(key, {
                    id: item.producto_id || key,
                    nombre_producto: item.nombre,
                    cantidad_total: 0,
                    veces_vendido: 0,
                    ingresos_total: 0
                });
            }

            const stats = productosMap.get(key)!;
            stats.cantidad_total += item.cantidad;
            stats.veces_vendido += 1;
            // Si el item tiene precio, lo usamos. Si no, calculamos proporcional (estimado)
            // En ItemVenta tenemos precio unitario normalmente
            const precio = item.precio || 0;
            stats.ingresos_total += (item.cantidad * precio);
        });
    });

    return Array.from(productosMap.values())
        .sort((a, b) => b.cantidad_total - a.cantidad_total); // Ordenar por cantidad vendida
};

/**
 * 📊 Desglose por Método de Pago
 * Agrupa las ventas por método de pago y calcula totales y porcentajes
 */
export interface DesgloseMetodoPago {
    metodo: string;
    total: number;
    cantidad: number;
    porcentaje: number;
}

export const calcularDesgloseMetodoPago = (ventas: Venta[]): DesgloseMetodoPago[] => {
    const metodoMap = new Map<string, { total: number; cantidad: number }>();
    const totalGeneral = ventas.reduce((sum, v) => sum + v.total, 0);

    ventas.forEach(venta => {
        const metodo = venta.metodo_pago || 'Efectivo';
        if (!metodoMap.has(metodo)) {
            metodoMap.set(metodo, { total: 0, cantidad: 0 });
        }
        const data = metodoMap.get(metodo)!;
        data.total += venta.total;
        data.cantidad += 1;
    });

    return Array.from(metodoMap.entries()).map(([metodo, data]) => ({
        metodo: metodo.charAt(0).toUpperCase() + metodo.slice(1),
        total: data.total,
        cantidad: data.cantidad,
        porcentaje: totalGeneral > 0 ? (data.total / totalGeneral) * 100 : 0
    })).sort((a, b) => b.total - a.total);
};

/**
 * 🍗 Consumo de Pollos por Día
 * Calcula cuántos pollos se usaron cada día
 */
export interface ConsumoPollosDia {
    fecha: string;
    pollos: number;
}

export const calcularConsumoPollosPorDia = (ventas: Venta[]): ConsumoPollosDia[] => {
    const consumoMap = new Map<string, number>();

    ventas.forEach(venta => {
        const fecha = venta.fecha;
        if (!consumoMap.has(fecha)) {
            consumoMap.set(fecha, 0);
        }
        consumoMap.set(fecha, consumoMap.get(fecha)! + venta.pollos_restados);
    });

    return Array.from(consumoMap.entries())
        .map(([fecha, pollos]) => ({ fecha, pollos }))
        .sort((a, b) => a.fecha.localeCompare(b.fecha));
};

/**
 * 🏠 Mesa vs Para Llevar
 * Calcula distribución de pedidos en mesa vs para llevar
 */
export interface DistribucionTipoVenta {
    tipo: string;
    cantidad: number;
    total: number;
    porcentaje: number;
}

export const calcularDistribucionTipoVenta = (ventas: Venta[]): DistribucionTipoVenta[] => {
    let enMesa = { cantidad: 0, total: 0 };
    let paraLlevar = { cantidad: 0, total: 0 };

    ventas.forEach(venta => {
        // Si tiene mesa_id es en mesa, si no es para llevar
        if (venta.mesa_id && venta.mesa_id > 0) {
            enMesa.cantidad += 1;
            enMesa.total += venta.total;
        } else {
            paraLlevar.cantidad += 1;
            paraLlevar.total += venta.total;
        }
    });

    const totalPedidos = ventas.length;

    return [
        {
            tipo: 'En Mesa',
            cantidad: enMesa.cantidad,
            total: enMesa.total,
            porcentaje: totalPedidos > 0 ? (enMesa.cantidad / totalPedidos) * 100 : 0
        },
        {
            tipo: 'Para Llevar',
            cantidad: paraLlevar.cantidad,
            total: paraLlevar.total,
            porcentaje: totalPedidos > 0 ? (paraLlevar.cantidad / totalPedidos) * 100 : 0
        }
    ];
};

/**
 * 📈 Comparativa Semanal
 * Compara esta semana con la anterior
 */
export interface ComparativaSemanal {
    semanaActual: number;
    semanaAnterior: number;
    diferencia: number;
    porcentajeCambio: number;
    esPositivo: boolean;
}

export const obtenerComparativaSemanal = async (): Promise<ComparativaSemanal> => {
    const hoy = new Date();

    // Esta semana (últimos 7 días)
    const finSemanaActual = format(hoy, 'yyyy-MM-dd');
    const inicioSemanaActual = format(subDays(hoy, 6), 'yyyy-MM-dd');

    // Semana anterior (7-14 días atrás)
    const finSemanaAnterior = format(subDays(hoy, 7), 'yyyy-MM-dd');
    const inicioSemanaAnterior = format(subDays(hoy, 13), 'yyyy-MM-dd');

    try {
        const [ventasActual, ventasAnterior] = await Promise.all([
            obtenerVentasPorRango(inicioSemanaActual, finSemanaActual),
            obtenerVentasPorRango(inicioSemanaAnterior, finSemanaAnterior)
        ]);

        const semanaActual = ventasActual.reduce((sum, v) => sum + v.total, 0);
        const semanaAnterior = ventasAnterior.reduce((sum, v) => sum + v.total, 0);
        const diferencia = semanaActual - semanaAnterior;
        const porcentajeCambio = semanaAnterior > 0
            ? ((diferencia / semanaAnterior) * 100)
            : (semanaActual > 0 ? 100 : 0);

        return {
            semanaActual,
            semanaAnterior,
            diferencia,
            porcentajeCambio,
            esPositivo: diferencia >= 0
        };
    } catch (error) {
        console.error('Error al obtener comparativa semanal:', error);
        return {
            semanaActual: 0,
            semanaAnterior: 0,
            diferencia: 0,
            porcentajeCambio: 0,
            esPositivo: true
        };
    }
};
