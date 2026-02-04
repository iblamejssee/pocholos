import { supabase, obtenerFechaHoy } from './supabase';

// Reinicia solo los datos del día actual
export async function resetearSistema(): Promise<{ success: boolean; message: string }> {
    try {
        const fechaHoy = obtenerFechaHoy();

        const { error: errorVentas } = await supabase
            .from('ventas')
            .delete()
            .eq('fecha', fechaHoy);

        if (errorVentas) throw new Error('Error al eliminar ventas');

        const { error: errorGastos } = await supabase
            .from('gastos')
            .delete()
            .eq('fecha', fechaHoy);

        if (errorGastos) throw new Error('Error al eliminar gastos');

        const { error: errorInventario } = await supabase
            .from('inventario_diario')
            .delete()
            .eq('fecha', fechaHoy);

        if (errorInventario) throw new Error('Error al eliminar inventario');

        const { error: errorMesas } = await supabase
            .from('mesas')
            .update({ estado: 'libre' })
            .neq('id', 0);

        if (errorMesas) throw new Error('Error al liberar mesas');

        return {
            success: true,
            message: '✅ Día actual restablecido. Puedes hacer una nueva apertura.'
        };

    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
        return {
            success: false,
            message: `❌ Error al restablecer: ${errorMessage}`
        };
    }
}
