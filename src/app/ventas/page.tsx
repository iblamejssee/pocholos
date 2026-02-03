'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import type { Venta, Mesa, ItemCarrito, ItemVenta } from '@/lib/database.types';
import { Users, DollarSign, Clock, ShoppingBag } from 'lucide-react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import AnimatedCard from '@/components/AnimatedCard';
import ReceiptModal from '@/components/ReceiptModal';

interface MesaConVenta extends Mesa {
    venta?: Venta;
}

interface VentaParaLlevar extends Venta {
    tipo: 'para_llevar';
}

export default function MesasActivasPage() {
    const [mesasActivas, setMesasActivas] = useState<MesaConVenta[]>([]);
    const [ventasParaLlevar, setVentasParaLlevar] = useState<Venta[]>([]);
    const [loading, setLoading] = useState(true);

    // Estado para el modal de recibo
    const [showReceipt, setShowReceipt] = useState(false);
    const [receiptData, setReceiptData] = useState<{
        items: (ItemCarrito | ItemVenta)[];
        total: number;
        orderId: string;
        mesaNumero?: number;
    } | null>(null);

    useEffect(() => {
        cargarPedidosPendientes();

        // Suscripción en tiempo real
        const channel = supabase
            .channel('mesas-ventas-changes')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'mesas' }, () => {
                cargarPedidosPendientes();
            })
            .on('postgres_changes', { event: '*', schema: 'public', table: 'ventas' }, () => {
                cargarPedidosPendientes();
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    const cargarPedidosPendientes = async () => {
        try {
            setLoading(true);

            // 1. Obtener mesas ocupadas con sus ventas
            const { data: mesas, error: mesasError } = await supabase
                .from('mesas')
                .select('*')
                .eq('estado', 'ocupada')
                .order('numero', { ascending: true });

            if (mesasError) throw mesasError;

            const mesasConVentas: MesaConVenta[] = await Promise.all(
                (mesas || []).map(async (mesa) => {
                    const { data: venta } = await supabase
                        .from('ventas')
                        .select('*')
                        .eq('mesa_id', mesa.id)
                        .eq('estado_pago', 'pendiente')
                        .order('created_at', { ascending: false })
                        .limit(1)
                        .single();

                    return {
                        ...mesa,
                        venta: venta || undefined
                    };
                })
            );

            setMesasActivas(mesasConVentas);

            // 2. Obtener ventas PARA LLEVAR (sin mesa_id) pendientes
            const { data: paraLlevar } = await supabase
                .from('ventas')
                .select('*')
                .is('mesa_id', null)
                .eq('estado_pago', 'pendiente')
                .order('created_at', { ascending: false });

            setVentasParaLlevar(paraLlevar || []);

        } catch (error) {
            console.error('Error al cargar pedidos pendientes:', error);
            toast.error('Error al cargar pedidos');
        } finally {
            setLoading(false);
        }
    };

    const marcarComoPagado = async (ventaId: string, mesaId: number | null, mesaNumero: number | undefined, items: ItemVenta[], total: number, metodoPago: 'efectivo' | 'yape' | 'plin' | 'tarjeta') => {
        try {
            // Actualizar estado de pago
            const { error } = await supabase
                .from('ventas')
                .update({
                    estado_pago: 'pagado',
                    metodo_pago: metodoPago
                })
                .eq('id', ventaId);

            if (error) throw error;

            // Preparar datos para el recibo
            setReceiptData({
                items,
                total,
                orderId: ventaId,
                mesaNumero: mesaNumero
            });

            setShowReceipt(true);

            toast.success(`Pago registrado (${metodoPago.toUpperCase()})`, {
                icon: '💰',
                duration: 3000
            });

            cargarPedidosPendientes();
        } catch (error) {
            console.error('Error al marcar como pagado:', error);
            toast.error('Error al procesar el pago');
        }
    };

    const totalPedidos = mesasActivas.length + ventasParaLlevar.length;

    return (
        <div className="p-3 sm:p-6 lg:p-8">
            <div className="mb-4 sm:mb-8">
                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-pocholo-brown mb-2">
                    Pedidos Pendientes
                </h1>
                <p className="text-sm sm:text-base text-pocholo-brown/60">
                    Gestiona los pedidos de mesas y para llevar
                </p>
            </div>

            {loading ? (
                <div className="text-center py-12">
                    <div className="animate-spin w-12 h-12 border-4 border-pocholo-yellow border-t-transparent rounded-full mx-auto mb-4" />
                    <p className="text-pocholo-brown/60">Cargando pedidos pendientes...</p>
                </div>
            ) : totalPedidos === 0 ? (
                <AnimatedCard>
                    <div className="text-center py-12">
                        <Users size={64} className="mx-auto mb-4 text-pocholo-brown/30" />
                        <h3 className="text-xl font-semibold text-pocholo-brown mb-2">
                            No hay pedidos pendientes
                        </h3>
                        <p className="text-pocholo-brown/60">
                            Todos los pedidos han sido pagados
                        </p>
                    </div>
                </AnimatedCard>
            ) : (
                <>
                    {/* Sección PARA LLEVAR */}
                    {ventasParaLlevar.length > 0 && (
                        <div className="mb-8">
                            <h2 className="text-2xl font-bold text-pocholo-brown mb-4 flex items-center gap-2">
                                <ShoppingBag className="text-amber-500" size={28} />
                                Para Llevar ({ventasParaLlevar.length})
                            </h2>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                                {ventasParaLlevar.map((venta) => (
                                    <motion.div
                                        key={venta.id}
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="bg-white rounded-2xl shadow-lg overflow-hidden border-2 border-amber-500"
                                    >
                                        {/* Header Para Llevar */}
                                        <div className="bg-gradient-to-r from-amber-500 to-orange-500 p-4">
                                            <div className="flex items-center justify-between text-white">
                                                <div className="flex items-center gap-2">
                                                    <ShoppingBag size={24} />
                                                    <h3 className="text-2xl font-bold">🥡 Para Llevar</h3>
                                                </div>
                                                <div className="bg-white/20 px-3 py-1 rounded-full">
                                                    <Clock size={16} className="inline mr-1" />
                                                    <span className="text-sm font-semibold">Pendiente</span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Content */}
                                        <div className="p-4">
                                            {/* Fecha y Hora */}
                                            <div className="mb-3 text-xs text-pocholo-brown/60">
                                                <p>📅 {new Date(venta.created_at).toLocaleDateString('es-PE')}</p>
                                                <p>🕐 {new Date(venta.created_at).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })}</p>
                                            </div>

                                            {/* Items */}
                                            <div className="mb-4">
                                                <h4 className="font-semibold text-pocholo-brown mb-2">Pedido:</h4>
                                                <div className="space-y-1 max-h-40 overflow-y-auto">
                                                    {venta.items.map((item, idx) => (
                                                        <div key={idx} className="flex justify-between text-sm">
                                                            <span className="text-pocholo-brown/70">
                                                                {item.cantidad}x {item.nombre}
                                                            </span>
                                                            <span className="font-semibold text-pocholo-brown">
                                                                S/ {(item.cantidad * item.precio).toFixed(2)}
                                                            </span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>

                                            {/* Total */}
                                            <div className="border-t-2 border-amber-300 pt-3 mb-4">
                                                <div className="flex justify-between items-center">
                                                    <span className="text-lg font-semibold text-pocholo-brown">Total:</span>
                                                    <span className="text-2xl font-bold text-pocholo-red">
                                                        S/ {venta.total.toFixed(2)}
                                                    </span>
                                                </div>
                                            </div>

                                            {/* Botones de pago */}
                                            <div className="space-y-2">
                                                <button
                                                    onClick={() => marcarComoPagado(venta.id, null, undefined, venta.items, venta.total, 'efectivo')}
                                                    className="w-full bg-green-500 hover:bg-green-600 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition-colors shadow-lg"
                                                >
                                                    <DollarSign size={20} />
                                                    Efectivo
                                                </button>
                                                <div className="grid grid-cols-2 gap-2">
                                                    <button
                                                        onClick={() => marcarComoPagado(venta.id, null, undefined, venta.items, venta.total, 'yape')}
                                                        className="bg-purple-500 hover:bg-purple-600 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition-colors shadow-lg"
                                                    >
                                                        📱 Yape
                                                    </button>
                                                    <button
                                                        onClick={() => marcarComoPagado(venta.id, null, undefined, venta.items, venta.total, 'plin')}
                                                        className="bg-cyan-500 hover:bg-cyan-600 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition-colors shadow-lg"
                                                    >
                                                        💠 Plin
                                                    </button>
                                                </div>
                                                <button
                                                    onClick={() => marcarComoPagado(venta.id, null, undefined, venta.items, venta.total, 'tarjeta')}
                                                    className="w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition-colors shadow-lg"
                                                >
                                                    💳 Tarjeta
                                                </button>
                                            </div>
                                        </div>
                                    </motion.div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Sección MESAS */}
                    {mesasActivas.length > 0 && (
                        <div>
                            <h2 className="text-2xl font-bold text-pocholo-brown mb-4 flex items-center gap-2">
                                <Users className="text-red-500" size={28} />
                                Mesas ({mesasActivas.length})
                            </h2>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                                {mesasActivas.map((mesa) => (
                                    <motion.div
                                        key={mesa.id}
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="bg-white rounded-2xl shadow-lg overflow-hidden border-2 border-red-500"
                                    >
                                        {/* Header */}
                                        <div className="bg-gradient-to-r from-red-500 to-red-600 p-4">
                                            <div className="flex items-center justify-between text-white">
                                                <div className="flex items-center gap-2">
                                                    <Users size={24} />
                                                    <h3 className="text-2xl font-bold">Mesa {mesa.numero}</h3>
                                                </div>
                                                <div className="bg-white/20 px-3 py-1 rounded-full">
                                                    <Clock size={16} className="inline mr-1" />
                                                    <span className="text-sm font-semibold">Pendiente</span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Content */}
                                        <div className="p-4">
                                            {mesa.venta ? (
                                                <>
                                                    {/* Fecha y Hora */}
                                                    <div className="mb-3 text-xs text-pocholo-brown/60">
                                                        <p>📅 {new Date(mesa.venta.created_at).toLocaleDateString('es-PE')}</p>
                                                        <p>🕐 {new Date(mesa.venta.created_at).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })}</p>
                                                    </div>

                                                    {/* Items */}
                                                    <div className="mb-4">
                                                        <h4 className="font-semibold text-pocholo-brown mb-2">Pedido:</h4>
                                                        <div className="space-y-1 max-h-40 overflow-y-auto">
                                                            {mesa.venta.items.map((item, idx) => (
                                                                <div key={idx} className="flex justify-between text-sm">
                                                                    <span className="text-pocholo-brown/70">
                                                                        {item.cantidad}x {item.nombre}
                                                                    </span>
                                                                    <span className="font-semibold text-pocholo-brown">
                                                                        S/ {(item.cantidad * item.precio).toFixed(2)}
                                                                    </span>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>

                                                    {/* Total */}
                                                    <div className="border-t-2 border-pocholo-yellow/30 pt-3 mb-4">
                                                        <div className="flex justify-between items-center">
                                                            <span className="text-lg font-semibold text-pocholo-brown">Total:</span>
                                                            <span className="text-2xl font-bold text-pocholo-red">
                                                                S/ {mesa.venta.total.toFixed(2)}
                                                            </span>
                                                        </div>
                                                    </div>

                                                    {/* Botones de pago */}
                                                    <div className="space-y-2">
                                                        <button
                                                            onClick={() => marcarComoPagado(mesa.venta!.id, mesa.id, mesa.numero, mesa.venta!.items, mesa.venta!.total, 'efectivo')}
                                                            className="w-full bg-green-500 hover:bg-green-600 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition-colors shadow-lg"
                                                        >
                                                            <DollarSign size={20} />
                                                            Efectivo
                                                        </button>
                                                        <div className="grid grid-cols-2 gap-2">
                                                            <button
                                                                onClick={() => marcarComoPagado(mesa.venta!.id, mesa.id, mesa.numero, mesa.venta!.items, mesa.venta!.total, 'yape')}
                                                                className="bg-purple-500 hover:bg-purple-600 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition-colors shadow-lg"
                                                            >
                                                                📱 Yape
                                                            </button>
                                                            <button
                                                                onClick={() => marcarComoPagado(mesa.venta!.id, mesa.id, mesa.numero, mesa.venta!.items, mesa.venta!.total, 'plin')}
                                                                className="bg-cyan-500 hover:bg-cyan-600 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition-colors shadow-lg"
                                                            >
                                                                💠 Plin
                                                            </button>
                                                        </div>
                                                        <button
                                                            onClick={() => marcarComoPagado(mesa.venta!.id, mesa.id, mesa.numero, mesa.venta!.items, mesa.venta!.total, 'tarjeta')}
                                                            className="w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition-colors shadow-lg"
                                                        >
                                                            💳 Tarjeta
                                                        </button>
                                                    </div>
                                                </>
                                            ) : (
                                                <div className="text-center py-4 text-pocholo-brown/50">
                                                    <p className="text-sm">Mesa ocupada sin pedido registrado</p>
                                                </div>
                                            )}
                                        </div>
                                    </motion.div>
                                ))}
                            </div>
                        </div>
                    )}
                </>
            )}

            {/* Modal de Recibo para Impresión */}
            {receiptData && (
                <ReceiptModal
                    isOpen={showReceipt}
                    onClose={() => setShowReceipt(false)}
                    items={receiptData.items}
                    total={receiptData.total}
                    orderId={receiptData.orderId}
                    mesaNumero={receiptData.mesaNumero}
                />
            )}
        </div>
    );
}
