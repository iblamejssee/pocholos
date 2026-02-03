'use client';

import { useState, useEffect } from 'react';
import { supabase, obtenerFechaHoy } from '@/lib/supabase';
import type { StockActual } from '@/lib/database.types';

interface UseInventarioResult {
    stock: StockActual | null;
    loading: boolean;
    error: string | null;
    refetch: () => Promise<void>;
}

/**
 * Hook personalizado para obtener el stock actual del día
 * Se actualiza automáticamente y puede refrescarse manualmente
 */
export const useInventario = (): UseInventarioResult => {
    const [stock, setStock] = useState<StockActual | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchStock = async () => {
        try {
            setLoading(true);
            setError(null);

            const fechaHoy = obtenerFechaHoy();

            // Primero verificar si el inventario del día está cerrado
            const { data: inventario, error: invError } = await supabase
                .from('inventario_diario')
                .select('estado')
                .eq('fecha', fechaHoy)
                .single();

            // Si no hay inventario para hoy, no hay apertura
            if (invError || !inventario) {
                setStock(null);
                setError('No se ha realizado la apertura del día');
                return;
            }

            // Si el inventario está cerrado, no mostramos stock
            if (inventario.estado === 'cerrado') {
                setStock(null);
                setError('La jornada ha finalizado. Realiza una nueva apertura para el siguiente día.');
                return;
            }

            // Si está abierto, obtener el stock completo
            const { data, error: rpcError } = await supabase.rpc('obtener_stock_actual', {
                fecha_consulta: fechaHoy,
            });

            if (rpcError) {
                throw new Error(rpcError.message);
            }

            if (!data || data.length === 0) {
                setStock(null);
                setError('No se ha realizado la apertura del día');
            } else {
                setStock({ ...data[0], estado: 'abierto' });
            }
        } catch (err) {
            console.error('Error al obtener stock:', err);
            setError(err instanceof Error ? err.message : 'Error desconocido');
            setStock(null);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchStock();

        // Suscribirse a cambios en tiempo real
        const channel = supabase
            .channel('stock-changes')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'ventas',
                },
                () => {
                    fetchStock();
                }
            )
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'inventario_diario',
                },
                () => {
                    fetchStock();
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    return {
        stock,
        loading,
        error,
        refetch: fetchStock,
    };
};
