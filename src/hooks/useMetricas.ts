'use client';

import { useState, useEffect } from 'react';
import { calcularMetricas } from '@/lib/reportes';
import type { Venta } from '@/lib/database.types';
import type { Metricas } from '@/lib/reportes';

interface UseMetricasResult extends Metricas {
    loading: boolean;
}

/**
 * Hook para calcular métricas a partir de un array de ventas
 */
export const useMetricas = (ventas: Venta[]): UseMetricasResult => {
    const [metricas, setMetricas] = useState<Metricas>({
        totalIngresos: 0,
        cantidadPedidos: 0,
        promedioPorPedido: 0,
        pollosVendidos: 0,
        gaseosasVendidas: 0,
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        setLoading(true);
        const nuevasMetricas = calcularMetricas(ventas);
        setMetricas(nuevasMetricas);
        setLoading(false);
    }, [ventas]);

    return {
        ...metricas,
        loading,
    };
};
