import { supabase, obtenerFechaHoy } from './supabase';
import type { ItemCarrito, VentaResponse, ItemVenta } from './database.types';

/**
 * Calcula el total de pollos restados según el Chicken Math
 * 1.0 por pollo entero, 0.25 por 1/4, 0.125 por 1/8
 */
export const calcularStockRestado = (items: ItemCarrito[]) => {
    let pollosRestados = 0;
    let gaseosasRestadas = 0;

    items.forEach((item) => {
        if (item.fraccion_pollo > 0) {
            // Es un producto de pollo
            pollosRestados += item.fraccion_pollo * item.cantidad;
        } else {
            // Es una bebida
            gaseosasRestadas += item.cantidad;
        }
    });

    return { pollosRestados, gaseosasRestadas };
};

/**
 * Valida que haya stock suficiente para realizar la venta
 * Retorna advertencia para gaseosas pero no bloquea
 */
export const validarStockDisponible = async (
    items: ItemCarrito[]
): Promise<{ valido: boolean; mensaje: string; advertenciaGaseosas?: string; gaseosasDisponibles?: number }> => {
    const { pollosRestados, gaseosasRestadas } = calcularStockRestado(items);

    // Obtener stock actual usando la función SQL
    const { data, error } = await supabase.rpc('obtener_stock_actual', {
        fecha_consulta: obtenerFechaHoy(),
    });

    if (error || !data || data.length === 0) {
        return {
            valido: false,
            mensaje: 'No se ha realizado la apertura del día. Por favor, registra el inventario inicial.',
        };
    }

    const stockActual = data[0];

    // Validar pollos (esta validación SÍ bloquea la venta)
    if (pollosRestados > stockActual.pollos_disponibles) {
        return {
            valido: false,
            mensaje: `Stock insuficiente de pollos. Disponible: ${stockActual.pollos_disponibles.toFixed(2)}, Necesario: ${pollosRestados.toFixed(2)}`,
        };
    }

    // Gaseosas: Advertir pero NO bloquear
    let advertenciaGaseosas: string | undefined;
    if (gaseosasRestadas > stockActual.gaseosas_disponibles) {
        advertenciaGaseosas = `⚠️ Sin stock de gaseosas (Disponible: ${stockActual.gaseosas_disponibles}). Se venderán solo las disponibles.`;
    }

    return {
        valido: true,
        mensaje: 'Stock suficiente',
        advertenciaGaseosas,
        gaseosasDisponibles: stockActual.gaseosas_disponibles
    };
};

/**
 * Registra una nueva venta en Supabase
 * El método de pago se define después cuando el cajero cobra
 */
export const registrarVenta = async (
    items: ItemCarrito[],
    mesaId?: number,
    notas?: string
): Promise<VentaResponse> => {
    try {
        // Validar stock disponible
        const validacion = await validarStockDisponible(items);
        if (!validacion.valido) {
            return {
                success: false,
                message: validacion.mensaje,
            };
        }

        // Calcular totales
        const total = items.reduce((sum, item) => sum + item.subtotal, 0);
        let { pollosRestados, gaseosasRestadas } = calcularStockRestado(items);

        // Limitar gaseosas restadas al máximo disponible (no negativo)
        const gaseosasDisponibles = validacion.gaseosasDisponibles ?? 0;
        if (gaseosasRestadas > gaseosasDisponibles) {
            gaseosasRestadas = gaseosasDisponibles; // Solo restar las disponibles
        }

        // Preparar items para guardar (sin el campo subtotal)
        const itemsParaGuardar: ItemVenta[] = items.map(({ subtotal, ...item }) => item);

        // Insertar venta
        const { data, error } = await supabase
            .from('ventas')
            .insert({
                fecha: obtenerFechaHoy(),
                items: itemsParaGuardar,
                total: total,
                pollos_restados: pollosRestados,
                gaseosas_restadas: gaseosasRestadas,
                mesa_id: mesaId,
                estado_pago: 'pendiente', // Pendiente hasta que cajero cobre
                notas: notas || null, // Incluir notas del pedido
            })
            .select()
            .single();

        if (error) {
            console.error('Error al registrar venta:', error);
            return {
                success: false,
                message: `Error al registrar la venta: ${error.message}`,
            };
        }

        // Si hay advertencia de gaseosas, incluirla en el mensaje
        let mensaje = `Pedido registrado. Total: S/ ${total.toFixed(2)}. Pendiente de pago.`;
        if (validacion.advertenciaGaseosas) {
            mensaje += ` ${validacion.advertenciaGaseosas}`;
        }

        return {
            success: true,
            message: mensaje,
            data,
        };
    } catch (error) {
        console.error('Error inesperado:', error);
        return {
            success: false,
            message: 'Error inesperado al procesar la venta',
        };
    }
};
