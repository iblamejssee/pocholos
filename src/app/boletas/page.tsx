'use client';

import { useState } from 'react';
import { Plus, Trash2, FileText, Printer, Calendar, Clock } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import ReceiptModal from '@/components/ReceiptModal';
import ProtectedRoute from '@/components/ProtectedRoute';
import type { ItemVenta } from '@/lib/database.types';

interface ItemManual {
    id: string;
    nombre: string;
    precio: number;
    cantidad: number;
}

export default function BoletasPage() {
    return (
        <ProtectedRoute requiredPermission="boletas">
            <BoletasContent />
        </ProtectedRoute>
    );
}

function BoletasContent() {
    const [fecha, setFecha] = useState(() => {
        const hoy = new Date();
        return hoy.toISOString().split('T')[0]; // YYYY-MM-DD
    });
    const [hora, setHora] = useState(() => {
        const ahora = new Date();
        return `${String(ahora.getHours()).padStart(2, '0')}:${String(ahora.getMinutes()).padStart(2, '0')}`;
    });
    const [items, setItems] = useState<ItemManual[]>([
        { id: crypto.randomUUID(), nombre: '', precio: 0, cantidad: 1 }
    ]);
    const [tipoComprobante, setTipoComprobante] = useState<'boleta' | 'ticket'>('boleta');
    const [generando, setGenerando] = useState(false);

    // Receipt modal state
    const [showReceipt, setShowReceipt] = useState(false);
    const [receiptItems, setReceiptItems] = useState<ItemVenta[]>([]);
    const [receiptTotal, setReceiptTotal] = useState(0);
    const [receiptFecha, setReceiptFecha] = useState('');
    const [receiptTipo, setReceiptTipo] = useState<'boleta' | 'ticket'>('boleta');
    const [receiptNumero, setReceiptNumero] = useState('');

    const agregarItem = () => {
        setItems([...items, { id: crypto.randomUUID(), nombre: '', precio: 0, cantidad: 1 }]);
    };

    const eliminarItem = (id: string) => {
        if (items.length <= 1) {
            toast.error('Debe haber al menos un producto');
            return;
        }
        setItems(items.filter(item => item.id !== id));
    };

    const actualizarItem = (id: string, campo: keyof ItemManual, valor: string | number) => {
        setItems(items.map(item =>
            item.id === id ? { ...item, [campo]: valor } : item
        ));
    };

    const calcularTotal = () => {
        return items.reduce((sum, item) => sum + (item.precio * item.cantidad), 0);
    };

    const handleGenerar = async () => {
        // Validar
        const itemsValidos = items.filter(item => item.nombre.trim() !== '' && item.precio > 0);
        if (itemsValidos.length === 0) {
            toast.error('Agrega al menos un producto con nombre y precio');
            return;
        }

        setGenerando(true);

        try {
            // 1. Obtener config actual
            const { data: config, error: configError } = await supabase
                .from('configuracion_negocio')
                .select('*')
                .limit(1)
                .single();

            if (configError || !config) {
                toast.error('Error al leer configuración');
                setGenerando(false);
                return;
            }

            let numeroComprobante = '';

            if (tipoComprobante === 'boleta') {
                const nuevoCorrelativo = (config.numero_correlativo || 0) + 1;
                const numStr = String(nuevoCorrelativo).padStart(8, '0');
                numeroComprobante = `${config.serie_boleta || 'B001'}-${numStr}`;

                // Actualizar contador
                await supabase
                    .from('configuracion_negocio')
                    .update({ numero_correlativo: nuevoCorrelativo })
                    .eq('id', config.id);
            } else {
                const nuevoTicket = (config.numero_ticket || 0) + 1;
                const numStr = String(nuevoTicket).padStart(6, '0');
                numeroComprobante = `${config.serie_ticket || 'T001'}-${numStr}`;

                // Actualizar contador
                await supabase
                    .from('configuracion_negocio')
                    .update({ numero_ticket: nuevoTicket })
                    .eq('id', config.id);
            }

            // 2. Preparar items para el receipt
            const itemsParaReceipt: ItemVenta[] = itemsValidos.map(item => ({
                producto_id: `manual-${item.id}`,
                nombre: item.nombre.trim(),
                precio: item.precio,
                cantidad: item.cantidad,
                fraccion_pollo: 0,
            }));

            // 3. Construir fecha ISO completa
            const fechaISO = `${fecha}T${hora}:00`;

            // 4. Abrir el modal
            setReceiptItems(itemsParaReceipt);
            setReceiptTotal(itemsValidos.reduce((s, i) => s + i.precio * i.cantidad, 0));
            setReceiptFecha(fechaISO);
            setReceiptTipo(tipoComprobante);
            setReceiptNumero(numeroComprobante);
            setShowReceipt(true);

            toast.success(`${tipoComprobante === 'boleta' ? 'Boleta' : 'Ticket'} ${numeroComprobante} generado`);
        } catch (err) {
            console.error('Error al generar comprobante:', err);
            toast.error('Error inesperado al generar');
        } finally {
            setGenerando(false);
        }
    };

    const limpiarFormulario = () => {
        setItems([{ id: crypto.randomUUID(), nombre: '', precio: 0, cantidad: 1 }]);
        const ahora = new Date();
        setFecha(ahora.toISOString().split('T')[0]);
        setHora(`${String(ahora.getHours()).padStart(2, '0')}:${String(ahora.getMinutes()).padStart(2, '0')}`);
    };

    return (
        <div className="p-4 sm:p-6 lg:p-8 max-w-3xl mx-auto">
            {/* Header */}
            <div className="mb-6">
                <h1 className="text-2xl sm:text-3xl font-extrabold text-pocholo-brown flex items-center gap-3">
                    <FileText className="text-pocholo-red" size={28} />
                    Generar Boleta Manual
                </h1>
                <p className="text-sm text-pocholo-brown/50 mt-1">
                    Crea boletas o tickets con fecha, hora y productos personalizados
                </p>
            </div>

            {/* Formulario */}
            <div className="glass-card rounded-2xl shadow-3d p-5 sm:p-6 space-y-6">

                {/* Tipo de comprobante */}
                <div>
                    <label className="block text-xs font-bold text-pocholo-brown/60 uppercase tracking-wider mb-2">
                        Tipo de Comprobante
                    </label>
                    <div className="flex gap-2">
                        <button
                            onClick={() => setTipoComprobante('boleta')}
                            className={`flex-1 py-3 rounded-xl font-bold text-sm transition-all ${tipoComprobante === 'boleta'
                                ? 'bg-pocholo-red text-white shadow-lg'
                                : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                                }`}
                        >
                            BOLETA
                        </button>
                        <button
                            onClick={() => setTipoComprobante('ticket')}
                            className={`flex-1 py-3 rounded-xl font-bold text-sm transition-all ${tipoComprobante === 'ticket'
                                ? 'bg-pocholo-red text-white shadow-lg'
                                : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                                }`}
                        >
                            TICKET
                        </button>
                    </div>
                </div>

                {/* Fecha y Hora */}
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-xs font-bold text-pocholo-brown/60 uppercase tracking-wider mb-2">
                            <Calendar size={14} className="inline mr-1" /> Fecha
                        </label>
                        <input
                            type="date"
                            value={fecha}
                            onChange={(e) => setFecha(e.target.value)}
                            className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-pocholo-yellow focus:ring-2 focus:ring-pocholo-yellow/20 transition-all text-pocholo-brown font-semibold"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-pocholo-brown/60 uppercase tracking-wider mb-2">
                            <Clock size={14} className="inline mr-1" /> Hora
                        </label>
                        <input
                            type="time"
                            value={hora}
                            onChange={(e) => setHora(e.target.value)}
                            className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-pocholo-yellow focus:ring-2 focus:ring-pocholo-yellow/20 transition-all text-pocholo-brown font-semibold"
                        />
                    </div>
                </div>

                {/* Productos */}
                <div>
                    <label className="block text-xs font-bold text-pocholo-brown/60 uppercase tracking-wider mb-3">
                        Productos
                    </label>
                    <div className="space-y-3">
                        {items.map((item, index) => (
                            <motion.div
                                key={item.id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="flex gap-2 items-start"
                            >
                                {/* Nombre */}
                                <div className="flex-1 min-w-0">
                                    {index === 0 && (
                                        <span className="text-[10px] text-pocholo-brown/40 font-semibold uppercase">Nombre</span>
                                    )}
                                    <input
                                        type="text"
                                        placeholder="Ej: Pollo a la brasa"
                                        value={item.nombre}
                                        onChange={(e) => actualizarItem(item.id, 'nombre', e.target.value)}
                                        className="w-full px-3 py-2.5 rounded-lg border-2 border-gray-200 focus:border-pocholo-yellow focus:outline-none text-sm text-pocholo-brown"
                                    />
                                </div>
                                {/* Cantidad */}
                                <div className="w-16">
                                    {index === 0 && (
                                        <span className="text-[10px] text-pocholo-brown/40 font-semibold uppercase">Cant</span>
                                    )}
                                    <input
                                        type="number"
                                        min="1"
                                        value={item.cantidad}
                                        onChange={(e) => actualizarItem(item.id, 'cantidad', parseInt(e.target.value) || 1)}
                                        className="w-full px-2 py-2.5 rounded-lg border-2 border-gray-200 focus:border-pocholo-yellow focus:outline-none text-sm text-pocholo-brown text-center"
                                    />
                                </div>
                                {/* Precio */}
                                <div className="w-24">
                                    {index === 0 && (
                                        <span className="text-[10px] text-pocholo-brown/40 font-semibold uppercase">Precio</span>
                                    )}
                                    <div className="relative">
                                        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-gray-400">S/</span>
                                        <input
                                            type="number"
                                            step="0.50"
                                            min="0"
                                            value={item.precio || ''}
                                            onChange={(e) => actualizarItem(item.id, 'precio', parseFloat(e.target.value) || 0)}
                                            className="w-full pl-7 pr-2 py-2.5 rounded-lg border-2 border-gray-200 focus:border-pocholo-yellow focus:outline-none text-sm text-pocholo-brown"
                                        />
                                    </div>
                                </div>
                                {/* Subtotal */}
                                <div className="w-20 text-right">
                                    {index === 0 && (
                                        <span className="text-[10px] text-pocholo-brown/40 font-semibold uppercase">Subtotal</span>
                                    )}
                                    <p className="py-2.5 text-sm font-bold text-pocholo-red">
                                        S/ {(item.precio * item.cantidad).toFixed(2)}
                                    </p>
                                </div>
                                {/* Eliminar */}
                                <div className={index === 0 ? 'mt-4' : ''}>
                                    <button
                                        onClick={() => eliminarItem(item.id)}
                                        className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </motion.div>
                        ))}
                    </div>

                    <button
                        onClick={agregarItem}
                        className="mt-3 w-full py-2.5 border-2 border-dashed border-pocholo-brown/20 rounded-xl text-sm font-semibold text-pocholo-brown/50 hover:border-pocholo-red hover:text-pocholo-red hover:bg-red-50/50 transition-all flex items-center justify-center gap-2"
                    >
                        <Plus size={16} /> Agregar producto
                    </button>
                </div>

                {/* Total */}
                <div className="border-t-2 border-pocholo-yellow/30 pt-4">
                    <div className="flex justify-between items-center">
                        <span className="text-lg font-bold text-pocholo-brown">Total:</span>
                        <span className="text-3xl font-black text-pocholo-red">S/ {calcularTotal().toFixed(2)}</span>
                    </div>
                </div>

                {/* Botones */}
                <div className="flex gap-3">
                    <button
                        onClick={limpiarFormulario}
                        className="flex-1 py-3.5 rounded-xl font-semibold text-gray-500 bg-gray-100 hover:bg-gray-200 transition-colors text-sm"
                    >
                        Limpiar
                    </button>
                    <motion.button
                        onClick={handleGenerar}
                        disabled={generando || calcularTotal() <= 0}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        className="flex-[2] py-3.5 rounded-xl font-bold text-white bg-pocholo-red hover:bg-red-700 shadow-lg transition-all text-sm flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <Printer size={18} />
                        {generando ? 'Generando...' : `Generar ${tipoComprobante === 'boleta' ? 'Boleta' : 'Ticket'}`}
                    </motion.button>
                </div>
            </div>

            {/* Receipt Modal */}
            {showReceipt && (
                <ReceiptModal
                    isOpen={showReceipt}
                    onClose={() => setShowReceipt(false)}
                    items={receiptItems}
                    total={receiptTotal}
                    fechaVenta={receiptFecha}
                    tipoComprobanteBd={receiptTipo}
                    numeroComprobanteBd={receiptNumero}
                />
            )}
        </div>
    );
}
