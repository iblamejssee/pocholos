import { supabase, obtenerFechaHoy } from './supabase';
import type { ItemCarrito, VentaResponse, ItemVenta, BebidasDetalle } from './database.types';

/**
 * Calcula el total de platos restados y el detalle de bebidas
 */
export const calcularStockRestado = (items: ItemCarrito[]) => {
    let platosRestados = 0;
    let gaseosasRestadas = 0;
    let chichaRestada = 0;
    const bebidasDetalle: BebidasDetalle = {
        inca_kola: {}, coca_cola: {}, sprite: {}, fanta: {}, agua_mineral: {}, chicha: {}
    };

    items.forEach((item) => {
        if ((item.fraccion_plato || 0) > 0) {
            // Es un producto de plato
            platosRestados += (item.fraccion_plato || 0) * item.cantidad;
        } else if (item.detalle_bebida) {
            // Es una bebida con detalle específico
            const { marca, tipo } = item.detalle_bebida;

            if (marca === 'chicha') {
                // Descuento en litros según requerimiento
                // vaso: 250ml (0.25L), litro: 1L, medio_litro: 0.5L
                let litros = 0;
                if (tipo === 'vaso') litros = 0.25;
                else if (tipo === 'litro') litros = 1.0;
                else if (tipo === 'medio_litro') litros = 0.5;

                chichaRestada += litros * item.cantidad;

                // También sumar al detalle para visibilidad en el desglose
                if (bebidasDetalle.chicha) {
                    // @ts-ignore
                    bebidasDetalle.chicha[tipo] = (bebidasDetalle.chicha[tipo] || 0) + item.cantidad;
                }
            } else {
                gaseosasRestadas += item.cantidad;
                const marcaKey = marca as keyof BebidasDetalle;

                // Inicializar objeto de marca si no existe
                if (!bebidasDetalle[marcaKey]) {
                    bebidasDetalle[marcaKey] = {};
                }

                // Sumar cantidad 
                // @ts-ignore
                bebidasDetalle[marcaKey][tipo] = (bebidasDetalle[marcaKey][tipo] || 0) + item.cantidad;
            }
        } else {
            // Retrocompatibilidad
            if ((item.fraccion_plato || 0) === 0 && item.precio > 0) {
                gaseosasRestadas += item.cantidad;
            }
        }
    });

    return { platosRestados, gaseosasRestadas, chichaRestada, bebidasDetalle };
};

/**
 * Valida que haya stock suficiente para realizar la venta
 */
export const validarStockDisponible = async (
    items: ItemCarrito[]
): Promise<{ valido: boolean; mensaje: string; advertenciaGaseosas?: string; gaseosasDisponibles?: number }> => {
    const { platosRestados, gaseosasRestadas, bebidasDetalle } = calcularStockRestado(items);

    // 1. Obtener apertura del día directamente
    const { data: inventario, error: invError } = await supabase
        .from('inventario_diario')
        .select('*')
        .eq('fecha', obtenerFechaHoy())
        .maybeSingle();

    if (invError || !inventario) {
        return {
            valido: false,
            mensaje: 'No se ha realizado la apertura del día. Por favor, registra el inventario inicial.',
        };
    }

    // 2. Obtener consumos acumulados del día desde ventas
    // NOTA: Usamos 'insumos_restados' que es el nombre real de la columna en la BD
    const { data: ventasHoy, error: vError } = await supabase
        .from('ventas')
        .select('insumos_restados, gaseosas_restadas, bebidas_detalle')
        .eq('fecha', obtenerFechaHoy());

    if (vError) {
        console.error('Error al verificar stock de ventas:', vError);
        return { valido: false, mensaje: 'Error al verificar stock acumulado.' };
    }

    // 3. Calcular totales acumulados para saber disponibilidad real
    let totalPlatosVendidos = 0;
    let totalGaseosasVendidas = 0;
    const historialBebidas: BebidasDetalle[] = [];

    ventasHoy?.forEach(v => {
        // @ts-ignore
        totalPlatosVendidos += Number(v.insumos_restados || 0);
        totalGaseosasVendidas += Number(v.gaseosas_restadas || 0);
        if (v.bebidas_detalle) historialBebidas.push(v.bebidas_detalle as BebidasDetalle);
    });

    // 4. Calcular stock de bebidas (Lógica para validación)
    const stockBebidasBase = (inventario.bebidas_detalle as BebidasDetalle) || {};
    const stockBebidasActual: BebidasDetalle = JSON.parse(JSON.stringify(stockBebidasBase));

    historialBebidas.forEach(ventaBebida => {
        Object.keys(ventaBebida).forEach(marca => {
            const m = marca as keyof BebidasDetalle;
            const tipos = ventaBebida[m];
            if (tipos && stockBebidasActual[m]) {
                Object.keys(tipos).forEach(tipo => {
                    // @ts-ignore
                    const cantVendida = tipos[tipo] || 0;
                    // @ts-ignore
                    const cantActual = stockBebidasActual[m][tipo] || 0;
                    // @ts-ignore
                    stockBebidasActual[m][tipo] = Math.max(0, cantActual - cantVendida);
                });
            }
        });
    });

    // 5. Validar disponibilidad
    const platosIniciales = Number(inventario.platos_dia || 0);
    const platosDisponibles = platosIniciales - totalPlatosVendidos;
    const gaseosasDisponiblesTotal = Number(inventario.gaseosas || 0) - totalGaseosasVendidas;

    // A. Validar platos (Pescado o Límite manual)
    if (platosIniciales === 0) {
        const insumosDetalle = (inventario.insumos_detalle as Record<string, number>) || {};
        const pescadoInicial = Number(insumosDetalle.pescado || 0);
        const pescadoConsumido = totalPlatosVendidos * 0.150;
        const pescadoDisponible = Math.max(0, pescadoInicial - pescadoConsumido);

        const platosPosibles = pescadoDisponible / 0.150;

        if (platosRestados > platosPosibles) {
            return {
                valido: false,
                mensaje: `Stock insuficiente de Pescado. Estimado: ${Math.floor(platosPosibles)} platos, Necesario: ${platosRestados.toFixed(1)}`,
            };
        }
    } else if (platosRestados > platosDisponibles) {
        return {
            valido: false,
            mensaje: `Stock insuficiente de platos. Disponible: ${platosDisponibles.toFixed(2)}, Necesario: ${platosRestados.toFixed(2)}`,
        };
    }

    // B. Validar Bebidas Detalladas
    let advertenciaGaseosas: string | undefined;
    for (const [marca, tipos] of Object.entries(bebidasDetalle)) {
        if (!tipos) continue;
        for (const [tipo, cantidadNecesaria] of (Object.entries(tipos) as [string, number][])) {
            // @ts-ignore
            const stockDisp = stockBebidasActual[marca]?.[tipo] || 0;
            if (cantidadNecesaria > stockDisp) {
                advertenciaGaseosas = `⚠️ Stock insuficiente de ${marca} ${tipo} (Disp: ${stockDisp}).`;
            }
        }
    }

    // C. Validación genérica de gaseosas
    if (!advertenciaGaseosas && gaseosasRestadas > gaseosasDisponiblesTotal) {
        advertenciaGaseosas = `⚠️ Sin stock general de gaseosas (Disponible: ${gaseosasDisponiblesTotal}).`;
    }

    return {
        valido: true,
        mensaje: 'Stock suficiente',
        advertenciaGaseosas,
        gaseosasDisponibles: gaseosasDisponiblesTotal
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
        const { platosRestados, gaseosasRestadas, chichaRestada, bebidasDetalle } = calcularStockRestado(items);

        // Preparar items para guardar (sin el campo subtotal)
        const itemsParaGuardar: ItemVenta[] = items.map(({ subtotal, ...item }) => item);

        // Insertar venta
        const { data, error } = await supabase
            .from('ventas')
            .insert({
                fecha: obtenerFechaHoy(),
                items: itemsParaGuardar,
                total: total,
                insumos_restados: platosRestados, // Usar nombre real de columna
                gaseosas_restadas: gaseosasRestadas,
                chicha_restada: chichaRestada,
                bebidas_detalle: bebidasDetalle,
                mesa_id: mesaId,
                estado_pedido: 'pendiente',
                estado_pago: 'pendiente',
                notas: notas || null,
                metodo_pago: 'efectivo' // Valor por defecto obligatorio según schema
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

        // 2. Preparar la lista final de items
        const listaFinalItems: ItemVenta[] = itemsActualizados.map(({ subtotal, ...item }) => item);

        // 3. Calcular nuevos valores
        const itemsParaCalculo: ItemCarrito[] = listaFinalItems.map(it => ({
            ...it,
            subtotal: it.precio * it.cantidad
        }));

        const { platosRestados: nuevoPlatos, gaseosasRestadas: nuevoGaseosas, chichaRestada: nuevoChicha, bebidasDetalle: nuevoDetalle } = calcularStockRestado(itemsParaCalculo);

        // 5. Recalcular total monetario
        const nuevoTotal = itemsParaCalculo.reduce((sum, item) => sum + item.subtotal, 0);

        // 6. Actualizar en BD
        const { data, error: errorUpdate } = await supabase
            .from('ventas')
            .update({
                items: listaFinalItems,
                total: nuevoTotal,
                insumos_restados: nuevoPlatos, // Usar nombre real de columna
                gaseosas_restadas: nuevoGaseosas,
                chicha_restada: nuevoChicha,
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

/**
 * Finaliza el pago de una venta y libera la mesa
 */
export const finalizarPagoVenta = async (
    ventaId: string,
    metodoPago: 'efectivo' | 'tarjeta' | 'yape' | 'plin' | 'mixto',
    mesaId?: number
): Promise<{ success: boolean; message: string }> => {
    try {
        // 1. Marcar venta como pagada
        const { error: errorVenta } = await supabase
            .from('ventas')
            .update({
                estado_pago: 'pagado',
                metodo_pago: metodoPago,
                updated_at: new Date().toISOString()
            })
            .eq('id', ventaId);

        if (errorVenta) throw errorVenta;

        // 2. Liberar mesa si existe
        if (mesaId) {
            const { error: errorMesa } = await supabase
                .from('mesas')
                .update({ estado: 'libre' })
                .eq('id', mesaId);

            if (errorMesa) throw errorMesa;
        }

        return { success: true, message: 'Venta finalizada y mesa liberada' };
    } catch (error: any) {
        console.error('Error al finalizar pago:', error);
        return { success: false, message: `Error: ${error.message || 'Error desconocido'}` };
    }
};
