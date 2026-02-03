import { supabase } from './supabase';

export async function resetearSistema(): Promise<{ success: boolean; message: string }> {
    try {
        // 1. Eliminar todas las ventas
        const { error: errorVentas } = await supabase
            .from('ventas')
            .delete()
            .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all

        if (errorVentas) {
            console.error('Error al eliminar ventas:', errorVentas);
            throw new Error('Error al eliminar ventas');
        }

        // 2. Eliminar todos los gastos
        const { error: errorGastos } = await supabase
            .from('gastos')
            .delete()
            .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all

        if (errorGastos) {
            console.error('Error al eliminar gastos:', errorGastos);
            throw new Error('Error al eliminar gastos');
        }

        // 3. Eliminar todo el inventario diario
        const { error: errorInventario } = await supabase
            .from('inventario_diario')
            .delete()
            .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all

        if (errorInventario) {
            console.error('Error al eliminar inventario:', errorInventario);
            throw new Error('Error al eliminar inventario');
        }

        // 4. Resetear todas las mesas a estado 'libre'
        const { error: errorMesas } = await supabase
            .from('mesas')
            .update({ estado: 'libre' })
            .neq('id', 0); // Update all

        if (errorMesas) {
            console.error('Error al liberar mesas:', errorMesas);
            throw new Error('Error al liberar mesas');
        }

        return {
            success: true,
            message: '✅ Sistema restablecido correctamente. Todos los datos han sido eliminados.'
        };

    } catch (error: any) {
        console.error('Error al restablecer sistema:', error);
        return {
            success: false,
            message: `❌ Error al restablecer: ${error.message || 'Error desconocido'}`
        };
    }
}
