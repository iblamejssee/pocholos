import { supabase, obtenerFechaHoy } from './supabase';
import type { ItemCarrito, VentaResponse, ItemVenta, BebidasDetalle } from './database.types';

/**
 * Calcula el total de pollos restados y el detalle de bebidas
 */
export const calcularStockRestado = (items: ItemCarrito[]) => {
    let pollosRestados = 0;
    let gaseosasRestadas = 0;
    const bebidasDetalle: BebidasDetalle = {
        inca_kola: {}, coca_cola: {}, sprite: {}, fanta: {}, agua_mineral: {}
    };

    items.forEach((item) => {
        if (item.fraccion_pollo > 0) {
            // Es un producto de pollo
            pollosRestados += item.fraccion_pollo * item.cantidad;
        } else if (item.detalle_bebida) {
            // Es una bebida con detalle específico
            gaseosasRestadas += item.cantidad;
            const { marca, tipo } = item.detalle_bebida;

            // Ignorar chicha ya que no se controla en el inventario detallado de gaseosas
            if (marca !== 'chicha') {
                const marcaKey = marca as keyof BebidasDetalle;

                // Inicializar objeto de marca si no existe
                if (!bebidasDetalle[marcaKey]) {
                    bebidasDetalle[marcaKey] = {};
                }

                // Sumar cantidad (usando any para evitar error de indexación dinámica complejo)
                // @ts-ignore
                bebidasDetalle[marcaKey][tipo] = (bebidasDetalle[marcaKey][tipo] || 0) + item.cantidad;
            }
        } else {
            // Es una bebida genérica o sin detalle mapeado (backward compatibility)
            // Solo suma al total genérico, no al detalle
            if (item.fraccion_pollo === 0 && item.precio > 0) { // Asumimos que si no es pollo y tiene precio, es bebida/otro
                // Por ahora solo contamos como gaseosa si el ID o nombre lo sugiere, o si el usuario lo marca.
                // En la lógica anterior: "else { gaseosasRestadas += item.cantidad }"
                gaseosasRestadas += item.cantidad;
            }
        }
    });

    return { pollosRestados, gaseosasRestadas, bebidasDetalle };
};

/**
 * Valida que haya stock suficiente para realizar la venta
 */
export const validarStockDisponible = async (
    items: ItemCarrito[]
): Promise<{ valido: boolean; mensaje: string; advertenciaGaseosas?: string; gaseosasDisponibles?: number }> => {
    const { pollosRestados, gaseosasRestadas, bebidasDetalle } = calcularStockRestado(items);

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

    // Validar Gaseosas Detalladas
    let advertenciaGaseosas: string | undefined;
    const stockBebidas = stockActual.bebidas_detalle as BebidasDetalle;

    if (stockBebidas) {
        for (const [marca, tipos] of Object.entries(bebidasDetalle)) {
            if (!tipos) continue;
            for (const [tipo, cantidadNecesaria] of Object.entries(tipos)) {
                // @ts-ignore
                const stockDisponible = stockBebidas[marca]?.[tipo] || 0;
                // @ts-ignore
                if (cantidadNecesaria > stockDisponible) {
                    // @ts-ignore
                    advertenciaGaseosas = `⚠️ Stock insuficiente de ${marca} ${tipo} (Disp: ${stockDisponible}).`;
                }
            }
        }
    }

    // Validación genérica si falla la detallada o como respaldo
    if (!advertenciaGaseosas && gaseosasRestadas > stockActual.gaseosas_disponibles) {
        advertenciaGaseosas = `⚠️ Sin stock general de gaseosas (Disponible: ${stockActual.gaseosas_disponibles}).`;
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
        const { pollosRestados, gaseosasRestadas, bebidasDetalle } = calcularStockRestado(items);

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
                bebidas_detalle: bebidasDetalle, // Guardar detalle
                mesa_id: mesaId,
                estado_pedido: 'pendiente',
                estado_pago: 'pendiente',
                notas: notas || null,
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

        let mensaje = `Pedido registrado. Total: S/ ${total.toFixed(2)}.`;
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

/**
 * Actualiza una venta existente
 */
export const actualizarVenta = async (
    ventaId: string,
    itemsActualizados: ItemCarrito[]
): Promise<VentaResponse> => {
    try {
        // 1. Obtener la venta actual
        const { data: ventaActual, error: errorFetch } = await supabase
            .from('ventas')
            .select('*')
            .eq('id', ventaId)
            .single();

        if (errorFetch || !ventaActual) {
            return { success: false, message: 'No se encontró la venta a actualizar' };
        }

        // 2. Preparar la lista final de items (REEMPLAZO TOTAL para permitir eliminaciones)
        // IMPORTANTE: Esto permite borrar items y que el stock retorne.
        // La concurrencia se manejará via Realtime en el frontend.
        const listaFinalItems: ItemVenta[] = itemsActualizados.map(({ subtotal, ...item }) => item);

        // 3. Calcular nuevos valores
        // Reconstruimos ItemCarrito para cálculo correcto
        const itemsParaCalculo: ItemCarrito[] = listaFinalItems.map(it => ({
            ...it,
            subtotal: it.precio * it.cantidad
        }));

        const { pollosRestados: nuevoPollos, gaseosasRestadas: nuevoGaseosas, bebidasDetalle: nuevoDetalle } = calcularStockRestado(itemsParaCalculo);

        // 5. Recalcular total monetario
        const nuevoTotal = itemsParaCalculo.reduce((sum, item) => sum + item.subtotal, 0);

        // 6. Actualizar en BD
        const { data, error: errorUpdate } = await supabase
            .from('ventas')
            .update({
                items: listaFinalItems,
                total: nuevoTotal,
                pollos_restados: nuevoPollos,
                gaseosas_restadas: nuevoGaseosas,
                bebidas_detalle: nuevoDetalle
            })
            .eq('id', ventaId)
            .select()
            .single();

        if (errorUpdate) {
            return { success: false, message: `Error al actualizar: ${errorUpdate.message}` };
        }

        return {
            success: true,
            message: 'Pedido actualizado correctamente',
            data
        };
    } catch (error) {
        return { success: false, message: 'Error inesperado al actualizar' };
    }
};
