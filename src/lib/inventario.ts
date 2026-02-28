import { supabase, obtenerFechaHoy } from './supabase';

/**
 * Ajusta el stock de pollos para el día actual sumando la cantidad proporcionada.
 */
export async function ajustarStockPollos(cantidad: number): Promise<{ success: boolean; message: string }> {
    try {
        const fechaHoy = obtenerFechaHoy();

        // 1. Obtener registro actual
        const { data, error: fetchError } = await supabase
            .from('inventario_diario')
            .select('pollos_enteros')
            .eq('fecha', fechaHoy)
            .single();

        if (fetchError || !data) {
            return { success: false, message: 'No se encontró la apertura del día.' };
        }

        const nuevoTotal = (data.pollos_enteros || 0) + cantidad;

        // 2. Actualizar
        const { error: updateError } = await supabase
            .from('inventario_diario')
            .update({ pollos_enteros: nuevoTotal })
            .eq('fecha', fechaHoy);

        if (updateError) throw updateError;

        return { success: true, message: `Se añadieron ${cantidad} pollos al stock.` };
    } catch (error: any) {
        console.error('Error al ajustar stock de pollos:', error);
        return { success: false, message: error.message || 'Error al actualizar el stock.' };
    }
}

/**
 * Ajusta el dinero inicial (Caja Chica) sumando el monto proporcionado.
 */
export async function ajustarCajaChica(monto: number): Promise<{ success: boolean; message: string }> {
    try {
        const fechaHoy = obtenerFechaHoy();

        // 1. Obtener registro actual
        const { data, error: fetchError } = await supabase
            .from('inventario_diario')
            .select('dinero_inicial')
            .eq('fecha', fechaHoy)
            .single();

        if (fetchError || !data) {
            return { success: false, message: 'No se encontró la apertura del día.' };
        }

        const nuevoTotal = (data.dinero_inicial || 0) + monto;

        // 2. Actualizar
        const { error: updateError } = await supabase
            .from('inventario_diario')
            .update({ dinero_inicial: nuevoTotal })
            .eq('fecha', fechaHoy);

        if (updateError) throw updateError;

        return { success: true, message: `Se añadieron S/ ${monto.toFixed(2)} a la caja chica.` };
    } catch (error: any) {
        console.error('Error al ajustar caja chica:', error);
        return { success: false, message: error.message || 'Error al actualizar la caja.' };
    }
}

/**
 * Ajusta el stock de chicha (litros) sumando la cantidad proporcionada.
 */
export async function ajustarStockChicha(cantidad: number): Promise<{ success: boolean; message: string }> {
    try {
        const fechaHoy = obtenerFechaHoy();

        // 1. Obtener registro actual
        const { data, error: fetchError } = await supabase
            .from('inventario_diario')
            .select('chicha_inicial')
            .eq('fecha', fechaHoy)
            .single();

        if (fetchError || !data) {
            return { success: false, message: 'No se encontró la apertura del día.' };
        }

        const nuevoTotal = (data.chicha_inicial || 0) + cantidad;

        // 2. Actualizar
        const { error: updateError } = await supabase
            .from('inventario_diario')
            .update({ chicha_inicial: nuevoTotal })
            .eq('fecha', fechaHoy);

        if (updateError) throw updateError;

        return { success: true, message: `Se añadieron ${cantidad.toFixed(2)}L de chicha al stock.` };
    } catch (error: any) {
        console.error('Error al ajustar stock de chicha:', error);
        return { success: false, message: error.message || 'Error al actualizar el stock.' };
    }
}
/**
 * Ajusta el stock de papas (Kg) sumando la cantidad proporcionada.
 */
export async function ajustarStockPapas(cantidad: number): Promise<{ success: boolean; message: string }> {
    try {
        const fechaHoy = obtenerFechaHoy();

        // 1. Obtener registro actual
        const { data, error: fetchError } = await supabase
            .from('inventario_diario')
            .select('papas_iniciales')
            .eq('fecha', fechaHoy)
            .single();

        if (fetchError || !data) {
            return { success: false, message: 'No se encontró la apertura del día.' };
        }

        const nuevoTotal = (data.papas_iniciales || 0) + cantidad;

        // 2. Actualizar
        const { error: updateError } = await supabase
            .from('inventario_diario')
            .update({ papas_iniciales: nuevoTotal })
            .eq('fecha', fechaHoy);

        if (updateError) throw updateError;

        return { success: true, message: `Se añadieron ${cantidad.toFixed(1)}Kg de papas al stock.` };
    } catch (error: any) {
        console.error('Error al ajustar stock de papas:', error);
        return { success: false, message: error.message || 'Error al actualizar el stock.' };
    }
}
