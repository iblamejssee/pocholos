import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import type { Mesa } from '@/lib/database.types';

export function useMesas() {
    const [mesas, setMesas] = useState<Mesa[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Fetch mesas
    const fetchMesas = async () => {
        try {
            setLoading(true);
            const { data, error: fetchError } = await supabase
                .from('mesas')
                .select('*')
                .order('numero', { ascending: true });

            if (fetchError) throw fetchError;
            setMesas(data || []);
            setError(null);
        } catch (err) {
            console.error('Error fetching mesas:', err);
            setError('Error al cargar las mesas');
        } finally {
            setLoading(false);
        }
    };

    // Ocupar mesa
    const ocuparMesa = async (mesaId: number): Promise<boolean> => {
        try {
            const { error: updateError } = await supabase
                .from('mesas')
                .update({ estado: 'ocupada' })
                .eq('id', mesaId);

            if (updateError) throw updateError;

            // Actualizar estado local
            setMesas(prev => prev.map(mesa =>
                mesa.id === mesaId ? { ...mesa, estado: 'ocupada' } : mesa
            ));

            return true;
        } catch (err) {
            console.error('Error ocupando mesa:', err);
            return false;
        }
    };

    // Liberar mesa
    const liberarMesa = async (mesaId: number): Promise<boolean> => {
        try {
            const { error: updateError } = await supabase
                .from('mesas')
                .update({ estado: 'libre' })
                .eq('id', mesaId);

            if (updateError) throw updateError;

            // Actualizar estado local
            setMesas(prev => prev.map(mesa =>
                mesa.id === mesaId ? { ...mesa, estado: 'libre' } : mesa
            ));

            return true;
        } catch (err) {
            console.error('Error liberando mesa:', err);
            return false;
        }
    };

    // Cambiar mesa (transferir pedido de una mesa a otra)
    const cambiarMesa = async (mesaOrigenId: number, mesaDestinoId: number): Promise<boolean> => {
        try {
            // 1. Actualizar la venta pendiente para que apunte a la nueva mesa
            const { error: ventaError } = await supabase
                .from('ventas')
                .update({ mesa_id: mesaDestinoId })
                .eq('mesa_id', mesaOrigenId)
                .eq('estado_pago', 'pendiente');

            if (ventaError) throw ventaError;

            // 2. Liberar la mesa de origen
            const { error: liberarError } = await supabase
                .from('mesas')
                .update({ estado: 'libre' })
                .eq('id', mesaOrigenId);

            if (liberarError) throw liberarError;

            // 3. Ocupar la mesa de destino
            const { error: ocuparError } = await supabase
                .from('mesas')
                .update({ estado: 'ocupada' })
                .eq('id', mesaDestinoId);

            if (ocuparError) throw ocuparError;

            // Actualizar estado local
            setMesas(prev => prev.map(mesa => {
                if (mesa.id === mesaOrigenId) return { ...mesa, estado: 'libre' };
                if (mesa.id === mesaDestinoId) return { ...mesa, estado: 'ocupada' };
                return mesa;
            }));

            return true;
        } catch (err) {
            console.error('Error cambiando mesa:', err);
            return false;
        }
    };

    // Suscripción en tiempo real a cambios en mesas
    useEffect(() => {
        fetchMesas();

        // Suscribirse a cambios en tiempo real
        const channel = supabase
            .channel('mesas-changes')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'mesas'
                },
                (payload) => {
                    console.log('Mesa actualizada:', payload);
                    fetchMesas(); // Refrescar todas las mesas
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    return {
        mesas,
        loading,
        error,
        refetch: fetchMesas,
        ocuparMesa,
        liberarMesa,
        cambiarMesa
    };
}
