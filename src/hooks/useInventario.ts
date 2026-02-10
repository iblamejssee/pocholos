'use client';

import { useState, useEffect } from 'react';
import { supabase, obtenerFechaHoy } from '@/lib/supabase';
import type { StockActual, BebidasDetalle } from '@/lib/database.types';

interface UseInventarioResult {
    stock: StockActual | null;
    loading: boolean;
    error: string | null;
    refetch: () => Promise<void>;
}

// Estructura por defecto - siempre se muestra, aunque todo sea 0
const DEFAULT_BEBIDAS: BebidasDetalle = {
    inca_kola: { personal_retornable: 0, descartable: 0, gordita: 0, litro: 0, litro_medio: 0, tres_litros: 0 },
    coca_cola: { personal_retornable: 0, descartable: 0, gordita: 0, litro: 0, litro_medio: 0, tres_litros: 0 },
    sprite: { descartable: 0, litro_medio: 0, tres_litros: 0 },
    fanta: { descartable: 0, mediana: 0, tres_litros: 0 },
    agua_mineral: { personal: 0, grande: 0 },
};

/** Resta las bebidas vendidas del stock inicial */
function calcularBebidasActuales(inicial: BebidasDetalle, ventasArray: BebidasDetalle[]): BebidasDetalle {
    // Clonar para no mutar
    const resultado: BebidasDetalle = JSON.parse(JSON.stringify(inicial));

    for (const venta of ventasArray) {
        if (!venta) continue;
        for (const marcaKey of Object.keys(venta)) {
            const marca = marcaKey as keyof BebidasDetalle;
            const tiposVenta = venta[marca];
            if (!tiposVenta || !resultado[marca]) continue;

            for (const tipoKey of Object.keys(tiposVenta)) {
                const cantidadVendida = (tiposVenta as Record<string, number>)[tipoKey] || 0;
                const actual = ((resultado[marca] as Record<string, number>)[tipoKey]) || 0;
                (resultado[marca] as Record<string, number>)[tipoKey] = Math.max(0, actual - cantidadVendida);
            }
        }
    }

    return resultado;
}

/**
 * Hook personalizado para obtener el stock actual del día
 * Obtiene datos DIRECTAMENTE de las tablas, sin depender de funciones RPC
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

            // 1. Obtener inventario del día directamente de la tabla
            const { data: inventario, error: invError } = await supabase
                .from('inventario_diario')
                .select('*')
                .eq('fecha', fechaHoy)
                .single();

            // Si no hay inventario para hoy, no hay apertura
            if (invError || !inventario) {
                setStock(null);
                if (invError && invError.code !== 'PGRST116') {
                    setError(`Error verificando apertura: ${invError.message}`);
                } else {
                    setError('No se ha realizado la apertura del día');
                }
                return;
            }

            // Si el inventario está cerrado
            if (inventario.estado === 'cerrado') {
                setStock(null);
                setError('La jornada ha finalizado. Realiza una nueva apertura para el siguiente día.');
                return;
            }

            // 2. Obtener TODAS las ventas del día para calcular restas
            const { data: ventasDelDia, error: ventasError } = await supabase
                .from('ventas')
                .select('pollos_restados, gaseosas_restadas, bebidas_detalle')
                .eq('fecha', fechaHoy);

            if (ventasError) {
                console.error('Error obteniendo ventas:', ventasError);
            }

            // 3. Calcular totales de pollos y gaseosas vendidos
            let pollosVendidos = 0;
            let gaseosasVendidas = 0;
            const ventasBebidasArray: BebidasDetalle[] = [];

            if (ventasDelDia) {
                for (const v of ventasDelDia) {
                    pollosVendidos += v.pollos_restados || 0;
                    gaseosasVendidas += v.gaseosas_restadas || 0;
                    if (v.bebidas_detalle) {
                        ventasBebidasArray.push(v.bebidas_detalle as BebidasDetalle);
                    }
                }
            }

            // 4. Calcular bebidas actuales (inicial - vendidas)
            const bebidasInicial: BebidasDetalle = inventario.bebidas_detalle
                ? (inventario.bebidas_detalle as BebidasDetalle)
                : { ...JSON.parse(JSON.stringify(DEFAULT_BEBIDAS)) };

            const bebidasActuales = ventasBebidasArray.length > 0
                ? calcularBebidasActuales(bebidasInicial, ventasBebidasArray)
                : bebidasInicial;

            // 5. Armar el stock completo
            const stockCalculado: StockActual = {
                fecha: inventario.fecha,
                pollos_enteros: inventario.pollos_enteros || 0,
                gaseosas: inventario.gaseosas || 0,
                pollos_disponibles: (inventario.pollos_enteros || 0) - pollosVendidos,
                gaseosas_disponibles: (inventario.gaseosas || 0) - gaseosasVendidas,
                pollos_iniciales: inventario.pollos_enteros || 0,
                gaseosas_iniciales: inventario.gaseosas || 0,
                pollos_vendidos: pollosVendidos,
                gaseosas_vendidas: gaseosasVendidas,
                papas_iniciales: inventario.papas_iniciales || 0,
                dinero_inicial: inventario.dinero_inicial || 0,
                estado: 'abierto',
                bebidas_detalle: bebidasActuales,
            };

            setStock(stockCalculado);

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
