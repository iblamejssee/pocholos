"use client";

import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

interface PedidoWhatsApp {
    id: string;
    cliente_telefono: string;
    texto_pedido: string;
    metodo_pago: string;
    estado: string;
    creado_en: string;
}

export default function WhatsAppOrdersNotifications() {
    const [pedidos, setPedidos] = useState<PedidoWhatsApp[]>([]);

    useEffect(() => {
        // 1. Cargar pedidos verificados listos para cocinar/cobrar al abrir la caja
        const fetchPedidos = async () => {
            const { data } = await supabase
                .from('pedidos_whatsapp')
                .select('*')
                .eq('estado', 'yape_verificado')
                .order('creado_en', { ascending: true });
            
            if (data) setPedidos(data as PedidoWhatsApp[]);
        };
        fetchPedidos();

        // 2. Suscribirse a nuevos pedidos en tiempo real
        const subscription = supabase
            .channel('pedidos_whatsapp_channel')
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'pedidos_whatsapp' }, (payload) => {
                const updated = payload.new as PedidoWhatsApp;
                // Si la dueña lo pasa a yape_verificado, ¡aparece mágicamente en la laptop!
                if (updated.estado === 'yape_verificado') {
                    setPedidos(prev => {
                        // Evitar duplicados
                        if (!prev.find(p => p.id === updated.id)) {
                             return [...prev, updated];
                        }
                        return prev;
                    });
                } else if (updated.estado !== 'yape_verificado') {
                    // Si se aprueba (se despacha) o rechaza, quitar de la pantalla
                    setPedidos(prev => prev.filter(p => p.id !== updated.id));
                }
            })
            // También escuchar INSERTS directos por si el pago era Efectivo (pasa directo a yape_verificado)
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'pedidos_whatsapp' }, (payload) => {
                const newPedido = payload.new as PedidoWhatsApp;
                if (newPedido.estado === 'yape_verificado') {
                    setPedidos(prev => [...prev, newPedido]);
                }
            })
            .subscribe();

        return () => {
            supabase.removeChannel(subscription);
        };
    }, []);

    const aprobarPedido = async (id: string) => {
        await supabase.from('pedidos_whatsapp').update({ estado: 'aprobado' }).eq('id', id);
        setPedidos(prev => prev.filter(p => p.id !== id));
    };
    
    const rechazarPedido = async (id: string) => {
        await supabase.from('pedidos_whatsapp').update({ estado: 'rechazado' }).eq('id', id);
        setPedidos(prev => prev.filter(p => p.id !== id));
    };

    if (pedidos.length === 0) return null;

    return (
        <div className="fixed bottom-4 right-4 z-[9999] flex flex-col gap-3 w-80 max-h-screen overflow-y-auto p-2">
            {pedidos.map(pedido => (
                <div key={pedido.id} className="bg-white border-l-4 border-yellow-400 shadow-2xl rounded-lg p-4 hover:shadow-xl transition-shadow bg-opacity-95 backdrop-blur-sm">
                    <div className="flex justify-between items-start mb-2">
                        <h4 className="font-bold text-gray-800 flex items-center gap-2 text-sm">
                            <span className="flex h-3 w-3 relative">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                            </span>
                            NUEVO PEDIDO WA
                        </h4>
                    </div>
                    
                    <p className="text-xs text-gray-600 mb-1 font-mono">
                        <span className="font-bold text-gray-700">Telf:</span> {pedido.cliente_telefono}
                    </p>
                    <p className="text-xs text-gray-600 mb-2">
                        <span className="font-bold text-gray-700">A pagar con:</span> <strong className="text-red-600 uppercase bg-red-50 px-1 py-0.5 rounded">{pedido.metodo_pago}</strong>
                    </p>
                    
                    <div className="bg-gray-50 border border-gray-100 p-2 rounded text-sm text-gray-800 font-medium mb-3 shadow-inner">
                        {pedido.texto_pedido}
                    </div>

                    <div className="flex gap-2">
                        <button 
                            onClick={() => aprobarPedido(pedido.id)}
                            className="flex-1 bg-green-500 hover:bg-green-600 text-white font-bold py-2 rounded text-sm shadow-sm transition-colors duration-200"
                        >
                            ✓ Aprobar y Cobrar
                        </button>
                        <button 
                            onClick={() => rechazarPedido(pedido.id)}
                            className="bg-gray-100 hover:bg-gray-200 text-gray-500 hover:text-gray-700 px-3 py-2 rounded transition-colors duration-200"
                            title="Rechazar/Ignorar"
                        >
                            ✕
                        </button>
                    </div>
                </div>
            ))}
        </div>
    );
}
