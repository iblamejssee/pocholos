'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import type { Venta, Mesa, ItemCarrito, ItemVenta } from '@/lib/database.types';
import { Users, DollarSign, Clock, ShoppingBag, Trash2, AlertTriangle, Printer } from 'lucide-react';
import { AnimatePresence } from 'framer-motion';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import AnimatedCard from '@/components/AnimatedCard';
import ReceiptModal from '@/components/ReceiptModal';
import SplitPaymentModal from '@/components/SplitPaymentModal';
import ProtectedRoute from '@/components/ProtectedRoute';

interface MesaConVenta extends Mesa {
    venta?: Venta;
}

interface VentaParaLlevar extends Venta {
    tipo: 'para_llevar';
}

export default function MesasActivasPage() {
    return (
        <ProtectedRoute>
            <MesasActivasContent />
        </ProtectedRoute>
    );
}

function MesasActivasContent() {
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
        title?: string;
    } | null>(null);

    // Estado para cancelar pedido
    const [showCancelModal, setShowCancelModal] = useState(false);
    const [cancelData, setCancelData] = useState<{ ventaId: string; mesaId: number | null; label: string } | null>(null);

    // Estado para modal de cobro (pago dividido)
    const [showPayModal, setShowPayModal] = useState(false);
    const [payModalData, setPayModalData] = useState<{
        ventaId: string;
        mesaId: number | null;
        mesaNumero?: number;
        items: ItemVenta[];
        total: number;
    } | null>(null);

    const abrirModalCobro = (ventaId: string, mesaId: number | null, mesaNumero: number | undefined, items: ItemVenta[], total: number) => {
        setPayModalData({ ventaId, mesaId, mesaNumero, items, total });
        setShowPayModal(true);
    };

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

    const handlePrintPreCuenta = (widthMesa: boolean, items: (ItemCarrito | ItemVenta)[], total: number, orderId: string, mesaNumero?: number) => {
        setReceiptData({
            items,
            total,
            orderId,
            mesaNumero,
            title: 'ESTADO DE CUENTA'
        });
        setShowReceipt(true);
    };

    const marcarComoPagado = async (
        metodoPago: 'efectivo' | 'yape' | 'plin' | 'tarjeta' | 'mixto',
        pagoDividido?: { efectivo?: number; yape?: number; plin?: number; tarjeta?: number }
    ) => {
        if (!payModalData) return;
        const { ventaId, mesaId, mesaNumero, items, total } = payModalData;

        try {
            // Actualizar estado de pago
            const updateData: any = {
                estado_pago: 'pagado',
                metodo_pago: metodoPago
            };
            if (pagoDividido) {
                updateData.pago_dividido = pagoDividido;
            }

            const { error } = await supabase
                .from('ventas')
                .update(updateData)
                .eq('id', ventaId);

            if (error) throw error;

            setShowPayModal(false);
            setPayModalData(null);

            // Preparar datos para el recibo
            setReceiptData({
                items,
                total,
                orderId: ventaId,
                mesaNumero: mesaNumero
            });

            setShowReceipt(true);

            if (metodoPago === 'mixto' && pagoDividido) {
                const desglose = Object.entries(pagoDividido)
                    .filter(([, v]) => v && v > 0)
                    .map(([k, v]) => `${k}: S/${v?.toFixed(2)}`)
                    .join(' + ');
                toast.success(`Pago mixto: ${desglose}`, { icon: '💰', duration: 4000 });
            } else {
                toast.success(`Pago registrado (${metodoPago.toUpperCase()})`, { icon: '💰', duration: 3000 });
            }

            cargarPedidosPendientes();
        } catch (error) {
            console.error('Error al marcar como pagado:', error);
            toast.error('Error al procesar el pago');
        }
    };

    const handleCancelClick = (ventaId: string, mesaId: number | null, label: string) => {
        setCancelData({ ventaId, mesaId, label });
        setShowCancelModal(true);
    };

    const confirmCancel = async () => {
        if (!cancelData) return;
        try {
            // Eliminar la venta
            const { error } = await supabase
                .from('ventas')
                .delete()
                .eq('id', cancelData.ventaId);

            if (error) throw error;

            // Liberar la mesa si tenía una asignada
            if (cancelData.mesaId) {
                await supabase
                    .from('mesas')
                    .update({ estado: 'libre' })
                    .eq('id', cancelData.mesaId);
            }

            toast.success('Pedido eliminado — stock restaurado', { icon: '🗑️' });
            cargarPedidosPendientes();
        } catch (error) {
            console.error('Error al cancelar:', error);
            toast.error('Error al eliminar el pedido');
        } finally {
            setShowCancelModal(false);
            setCancelData(null);
        }
    };

    const totalPedidos = mesasActivas.length + ventasParaLlevar.length;

    return (
        <div className="p-4 sm:p-6 lg:p-8">
            <div className="mb-6">
                <h1 className="text-2xl sm:text-3xl font-bold text-slate-800 mb-1">
                    Pedidos Pendientes
                </h1>
                <p className="text-sm text-slate-400">
                    {totalPedidos} pedido{totalPedidos !== 1 ? 's' : ''} por cobrar
                </p>
            </div>

            {loading ? (
                <div className="text-center py-16">
                    <div className="animate-spin w-10 h-10 border-3 border-slate-300 border-t-slate-600 rounded-full mx-auto mb-4" />
                    <p className="text-slate-400 text-sm">Cargando pedidos...</p>
                </div>
            ) : totalPedidos === 0 ? (
                <div className="text-center py-20 bg-white border border-slate-200 rounded-xl">
                    <Users size={48} className="mx-auto mb-3 text-slate-300" />
                    <h3 className="text-lg font-semibold text-slate-600 mb-1">
                        Sin pedidos pendientes
                    </h3>
                    <p className="text-slate-400 text-sm">
                        Todos los pedidos han sido cobrados
                    </p>
                </div>
            ) : (
                <>
                    {/* Sección PARA LLEVAR */}
                    {ventasParaLlevar.length > 0 && (
                        <div className="mb-8">
                            <h2 className="text-lg font-bold text-slate-700 mb-3 flex items-center gap-2">
                                <ShoppingBag size={20} className="text-slate-500" />
                                Para Llevar
                                <span className="text-xs font-medium text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">{ventasParaLlevar.length}</span>
                            </h2>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                {ventasParaLlevar.map((venta) => (
                                    <motion.div
                                        key={venta.id}
                                        initial={{ opacity: 0, y: 12 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-md transition-shadow"
                                    >
                                        {/* Header */}
                                        <div className="bg-slate-800 px-5 py-4">
                                            <div className="flex items-center justify-between">
                                                <h3 className="text-lg font-bold text-white">Para Llevar</h3>
                                                <span className="text-[11px] font-medium text-amber-400 bg-amber-400/15 px-2 py-0.5 rounded-full">Pendiente</span>
                                            </div>
                                        </div>

                                        <div className="p-5">
                                            {/* Hora */}
                                            <p className="text-xs text-slate-400 mb-3">
                                                {new Date(venta.created_at).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })}
                                            </p>

                                            {/* Items */}
                                            <div className="space-y-1 mb-4">
                                                {venta.items.map((item, idx) => (
                                                    <div key={idx} className="flex justify-between text-sm">
                                                        <span className="text-slate-600">{item.cantidad}× {item.nombre}</span>
                                                        <span className="font-semibold text-slate-800">S/ {(item.cantidad * item.precio).toFixed(2)}</span>
                                                    </div>
                                                ))}
                                            </div>

                                            {/* Total */}
                                            <div className="border-t border-slate-100 pt-3 mb-4">
                                                <div className="flex justify-between items-center">
                                                    <span className="text-base font-medium text-slate-500">Total:</span>
                                                    <span className="text-2xl font-bold text-slate-800">S/ {venta.total.toFixed(2)}</span>
                                                </div>
                                            </div>

                                            {/* Botón de cobro */}
                                            <button
                                                onClick={() => abrirModalCobro(venta.id, null, undefined, venta.items, venta.total)}
                                                className="w-full py-4 rounded-xl font-bold text-sm text-white bg-emerald-600 hover:bg-emerald-700 transition-all shadow-md flex items-center justify-center gap-2 mb-2 active:scale-[0.98]"
                                            >
                                                Cobrar S/ {venta.total.toFixed(2)}
                                            </button>

                                            {/* Pre-cuenta */}
                                            <button
                                                onClick={() => handlePrintPreCuenta(false, venta.items, venta.total, venta.id)}
                                                className="w-full py-2 mb-2 rounded-lg text-xs font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 transition-colors flex items-center justify-center gap-1"
                                            >
                                                <Printer size={14} /> Imprimir Pre-Cuenta
                                            </button>

                                            {/* Eliminar */}
                                            <button
                                                onClick={() => handleCancelClick(venta.id, null, 'Para Llevar')}
                                                className="w-full py-2 rounded-lg text-xs font-medium text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors flex items-center justify-center gap-1"
                                            >
                                                <Trash2 size={12} /> Eliminar
                                            </button>
                                        </div>
                                    </motion.div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Sección MESAS */}
                    {mesasActivas.length > 0 && (
                        <div>
                            <h2 className="text-lg font-bold text-slate-700 mb-3 flex items-center gap-2">
                                <Users size={20} className="text-slate-500" />
                                Mesas
                                <span className="text-xs font-medium text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">{mesasActivas.length}</span>
                            </h2>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                {mesasActivas.map((mesa) => (
                                    <motion.div
                                        key={mesa.id}
                                        initial={{ opacity: 0, y: 12 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-md transition-shadow"
                                    >
                                        {/* Header */}
                                        <div className="bg-slate-800 px-5 py-4">
                                            <div className="flex items-center justify-between">
                                                <h3 className="text-lg font-bold text-white">Mesa {mesa.numero}</h3>
                                                <span className="text-[11px] font-medium text-amber-400 bg-amber-400/15 px-2 py-0.5 rounded-full">Pendiente</span>
                                            </div>
                                        </div>

                                        <div className="p-5">
                                            {mesa.venta ? (
                                                <>
                                                    {/* Hora */}
                                                    <p className="text-xs text-slate-400 mb-3">
                                                        {new Date(mesa.venta.created_at).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })}
                                                    </p>

                                                    {/* Items */}
                                                    <div className="space-y-1 mb-4 max-h-36 overflow-y-auto">
                                                        {mesa.venta.items.map((item, idx) => (
                                                            <div key={idx} className="flex justify-between text-sm">
                                                                <span className="text-slate-600">{item.cantidad}× {item.nombre}</span>
                                                                <span className="font-semibold text-slate-800">S/ {(item.cantidad * item.precio).toFixed(2)}</span>
                                                            </div>
                                                        ))}
                                                    </div>

                                                    {/* Total */}
                                                    <div className="border-t border-slate-100 pt-3 mb-4">
                                                        <div className="flex justify-between items-center">
                                                            <span className="text-base font-medium text-slate-500">Total:</span>
                                                            <span className="text-2xl font-bold text-slate-800">S/ {mesa.venta.total.toFixed(2)}</span>
                                                        </div>
                                                    </div>

                                                    {/* Botón de cobro */}
                                                    <button
                                                        onClick={() => abrirModalCobro(mesa.venta!.id, mesa.id, mesa.numero, mesa.venta!.items, mesa.venta!.total)}
                                                        className="w-full py-4 rounded-xl font-bold text-sm text-white bg-emerald-600 hover:bg-emerald-700 transition-all shadow-md flex items-center justify-center gap-2 mb-2 active:scale-[0.98]"
                                                    >
                                                        Cobrar S/ {mesa.venta!.total.toFixed(2)}
                                                    </button>

                                                    {/* Pre-cuenta */}
                                                    <button
                                                        onClick={() => handlePrintPreCuenta(true, mesa.venta!.items, mesa.venta!.total, mesa.venta!.id, mesa.numero)}
                                                        className="w-full py-2 mb-2 rounded-lg text-xs font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 transition-colors flex items-center justify-center gap-1"
                                                    >
                                                        <Printer size={14} /> Imprimir Pre-Cuenta
                                                    </button>

                                                    {/* Eliminar */}
                                                    <button
                                                        onClick={() => handleCancelClick(mesa.venta!.id, mesa.id, `Mesa ${mesa.numero}`)}
                                                        className="w-full py-2 rounded-lg text-xs font-medium text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors flex items-center justify-center gap-1"
                                                    >
                                                        <Trash2 size={12} /> Eliminar
                                                    </button>
                                                </>
                                            ) : (
                                                <div className="text-center py-4 text-slate-400">
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

            {/* Modal de Cobro (Pago Dividido) */}
            {payModalData && (
                <SplitPaymentModal
                    isOpen={showPayModal}
                    onClose={() => { setShowPayModal(false); setPayModalData(null); }}
                    total={payModalData.total}
                    onConfirm={marcarComoPagado}
                />
            )}

            {/* Modal de Recibo para Impresión */}
            {receiptData && (
                <ReceiptModal
                    isOpen={showReceipt}
                    onClose={() => setShowReceipt(false)}
                    items={receiptData.items}
                    total={receiptData.total}
                    orderId={receiptData.orderId}
                    orderId={receiptData.orderId}
                    mesaNumero={receiptData.mesaNumero}
                    title={receiptData.title}
                />
            )}

            {/* Modal de confirmación de cancelación */}
            <AnimatePresence>
                {showCancelModal && cancelData && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6"
                        >
                            <div className="text-center">
                                <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <AlertTriangle size={28} className="text-red-600" />
                                </div>
                                <h3 className="text-lg font-semibold text-gray-800 mb-2">Eliminar Pedido</h3>
                                <p className="text-gray-500 text-sm mb-1">¿Eliminar el pedido de <strong>{cancelData.label}</strong>?</p>
                                <p className="text-gray-400 text-xs mb-6">El stock de pollos y bebidas se restaurará automáticamente.</p>
                                <div className="flex gap-3">
                                    <button
                                        onClick={() => { setShowCancelModal(false); setCancelData(null); }}
                                        className="flex-1 py-2.5 px-4 rounded-lg font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors"
                                    >
                                        No, mantener
                                    </button>
                                    <button
                                        onClick={confirmCancel}
                                        className="flex-1 py-2.5 px-4 rounded-lg font-medium text-white bg-red-600 hover:bg-red-700 transition-colors"
                                    >
                                        Sí, eliminar
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}
