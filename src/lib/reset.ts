import { supabase, obtenerFechaHoy } from './supabase';

/**
 * Reinicia SOLO los datos del día actual
 * No afecta el historial de días anteriores
 */
export async function resetearSistema(): Promise<{ success: boolean; message: string }> {
    try {
        const fechaHoy = obtenerFechaHoy();

        // 1. Eliminar ventas SOLO del día actual
        const { error: errorVentas } = await supabase
            .from('ventas')
            .delete()
            .eq('fecha', fechaHoy);

        if (errorVentas) {
            console.error('Error al eliminar ventas del día:', errorVentas);
            throw new Error('Error al eliminar ventas del día');
        }

        // 2. Eliminar gastos SOLO del día actual
        const { error: errorGastos } = await supabase
            .from('gastos')
            .delete()
            .eq('fecha', fechaHoy);

        if (errorGastos) {
            console.error('Error al eliminar gastos del día:', errorGastos);
            throw new Error('Error al eliminar gastos del día');
        }

        // 3. Eliminar inventario SOLO del día actual
        const { error: errorInventario } = await supabase
            .from('inventario_diario')
            .delete()
            .eq('fecha', fechaHoy);

        if (errorInventario) {
            console.error('Error al eliminar inventario del día:', errorInventario);
            throw new Error('Error al eliminar inventario del día');
        }

        // 4. Resetear todas las mesas a estado 'libre'
        const { error: errorMesas } = await supabase
            .from('mesas')
            .update({ estado: 'libre' })
            .neq('id', 0);

        if (errorMesas) {
            console.error('Error al liberar mesas:', errorMesas);
            throw new Error('Error al liberar mesas');
        }

        return {
            success: true,
            message: '✅ Día actual restablecido. Puedes hacer una nueva apertura con los datos correctos.'
        };

    } catch (error: unknown) {
        console.error('Error al restablecer día:', error);
        const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
        return {
            success: false,
            message: `❌ Error al restablecer: ${errorMessage}`
        };
    }
}

