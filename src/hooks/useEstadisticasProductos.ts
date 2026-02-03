'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export interface EstadisticaProducto {
    id: string;
    producto_id: string;
    nombre_producto: string;
    cantidad_total: number;
    veces_vendido: number;
    ingresos_total: number;
    ultima_venta: string;
}

export function useEstadisticasProductos() {
    const [topProductos, setTopProductos] = useState<EstadisticaProducto[]>([]);
    const [loading, setLoading] = useState(true);

    const cargarEstadisticas = async () => {
        try {
            const { data, error } = await supabase
                .from('estadisticas_productos')
                .select('*')
                .order('veces_vendido', { ascending: false })
                .limit(8);

            if (error) {
                console.log('Tabla estadisticas_productos no existe o está vacía');
                setTopProductos([]);
            } else {
                setTopProductos(data || []);
            }
        } catch (error) {
            console.log('Error cargando estadísticas');
        } finally {
            setLoading(false);
        }
    };

    // Actualizar estadísticas cuando se vende un producto
    const registrarVentaProducto = async (productoId: string, nombreProducto: string, cantidad: number, precio: number) => {
        try {
            // Verificar si ya existe
            const { data: existente } = await supabase
                .from('estadisticas_productos')
                .select('*')
                .eq('producto_id', productoId)
                .single();

            if (existente) {
                // Actualizar existente
                await supabase
                    .from('estadisticas_productos')
                    .update({
                        cantidad_total: existente.cantidad_total + cantidad,
                        veces_vendido: existente.veces_vendido + 1,
                        ingresos_total: existente.ingresos_total + (cantidad * precio),
                        ultima_venta: new Date().toISOString()
                    })
                    .eq('producto_id', productoId);
            } else {
                // Crear nuevo
                await supabase
                    .from('estadisticas_productos')
                    .insert({
                        producto_id: productoId,
                        nombre_producto: nombreProducto,
                        cantidad_total: cantidad,
                        veces_vendido: 1,
                        ingresos_total: cantidad * precio,
                        ultima_venta: new Date().toISOString()
                    });
            }

            // Recargar estadísticas
            cargarEstadisticas();
        } catch (error) {
            console.log('Error registrando estadística de venta');
        }
    };

    useEffect(() => {
        cargarEstadisticas();
    }, []);

    return {
        topProductos,
        loading,
        refetch: cargarEstadisticas,
        registrarVentaProducto
    };
}
