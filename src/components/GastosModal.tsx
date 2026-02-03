'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { X, Calendar, Plus, Loader2 } from 'lucide-react';
import SolIcon from '@/components/SolIcon';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';

interface GastosModalProps {
    isOpen: boolean;
    onClose: () => void;
    onGastoRegistrado?: () => void;
}

export default function GastosModal({ isOpen, onClose, onGastoRegistrado }: GastosModalProps) {
    const [descripcion, setDescripcion] = useState('');
    const [monto, setMonto] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!descripcion || !monto) return;

        setLoading(true);
        try {
            const { error } = await supabase
                .from('gastos')
                .insert({
                    descripcion,
                    monto: parseFloat(monto),
                    fecha: new Date().toISOString(),
                });

            if (error) throw error;

            toast.success('Gasto registrado correctamente');
            setDescripcion('');
            setMonto('');
            if (onGastoRegistrado) onGastoRegistrado();
            onClose();
        } catch (error) {
            console.error('Error registrando gasto:', error);
            toast.error('Error al registrar el gasto');
        } finally {
            setLoading(false);
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
                    />

                    <motion.div
                        initial={{ scale: 0.95, opacity: 0, y: 20 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.95, opacity: 0, y: 20 }}
                        className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl p-6 overflow-hidden"
                    >
                        <div className="absolute top-0 right-0 p-4">
                            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                                <X size={20} className="text-gray-500" />
                            </button>
                        </div>

                        <div className="mb-6">
                            <div className="w-12 h-12 bg-red-100 rounded-2xl flex items-center justify-center mb-4">
                                <motion.div
                                    whileHover={{ rotate: 360 }}
                                    transition={{ duration: 0.6 }}
                                >
                                    <SolIcon className="text-pocholo-red" size={24} />
                                </motion.div>
                            </div>
                            <h2 className="text-2xl font-bold text-pocholo-brown">Registrar Gasto</h2>
                            <p className="text-pocholo-brown/60 text-sm">Registra una salida de dinero de la caja.</p>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-pocholo-brown mb-1">Descripción</label>
                                <input
                                    type="text"
                                    value={descripcion}
                                    onChange={(e) => setDescripcion(e.target.value)}
                                    placeholder="Ej. Compra de limones, Pago de luz..."
                                    className="w-full px-4 py-3 rounded-xl border-2 border-gray-100 focus:border-pocholo-yellow focus:outline-none transition-colors"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-pocholo-brown mb-1">Monto (S/)</label>
                                <div className="relative">
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold">S/</span>
                                    <input
                                        type="number"
                                        step="0.10"
                                        value={monto}
                                        onChange={(e) => setMonto(e.target.value)}
                                        placeholder="0.00"
                                        className="w-full pl-10 pr-4 py-3 rounded-xl border-2 border-gray-100 focus:border-pocholo-yellow focus:outline-none transition-colors font-mono text-lg"
                                        required
                                    />
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full py-4 mt-2 bg-pocholo-brown text-white font-bold rounded-xl shadow-lg hover:bg-pocholo-brown/90 transition-all active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                                {loading ? <Loader2 className="animate-spin" /> : <Plus size={20} />}
                                Registrar Gasto
                            </button>
                        </form>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
