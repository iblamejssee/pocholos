'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Check } from 'lucide-react';
import type { Producto } from '@/lib/database.types';

interface ProductOptionsModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (producto: Producto, opciones: { parte?: 'pecho' | 'pierna' | 'ala' | 'encuentro', notas: string }) => void;
    producto: Producto | null;
}

export default function ProductOptionsModal({ isOpen, onClose, onConfirm, producto }: ProductOptionsModalProps) {
    const [parte, setParte] = useState<'pecho' | 'pierna' | 'ala' | 'encuentro' | undefined>(undefined);
    const [notas, setNotas] = useState('');

    useEffect(() => {
        if (isOpen) {
            setParte(undefined);
            setNotas('');
        }
    }, [isOpen, producto]);

    if (!producto) return null;

    const esPollo = producto.tipo === 'pollo' || producto.nombre.toLowerCase().includes('pollo') || producto.nombre.toLowerCase().includes('mostrito');
    const permiteParte = esPollo && !producto.nombre.toLowerCase().includes('entero');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onConfirm(producto, { parte, notas });
        onClose();
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="bg-white/90 backdrop-blur-xl rounded-3xl shadow-2xl w-full max-w-md border-2 border-white/50 overflow-hidden"
                    >
                        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gradient-to-r from-pocholo-cream to-white">
                            <div>
                                <h2 className="text-2xl font-bold text-pocholo-brown">{producto.nombre}</h2>
                                <p className="text-pocholo-red font-semibold">S/ {producto.precio.toFixed(2)}</p>
                            </div>
                            <button
                                onClick={onClose}
                                className="p-2 hover:bg-red-50 text-gray-400 hover:text-red-500 rounded-xl transition-colors"
                            >
                                <X size={24} />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-6 space-y-6">
                            {/* Selección de Parte (solo si aplica) */}
                            {permiteParte && (
                                <div className="space-y-3">
                                    <label className="block text-sm font-medium text-pocholo-brown/80 mb-2">
                                        Elegir Parte del Pollo
                                    </label>
                                    <div className="grid grid-cols-2 gap-3">
                                        <button
                                            type="button"
                                            onClick={() => setParte('pecho')}
                                            className={`p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-2 ${parte === 'pecho'
                                                ? 'border-pocholo-red bg-red-50 text-pocholo-red'
                                                : 'border-gray-100 hover:border-pocholo-yellow/50 text-gray-600'
                                                }`}
                                        >
                                            <span className="text-2xl">🍗</span>
                                            <span className="font-semibold">Pecho</span>
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setParte('pierna')}
                                            className={`p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-2 ${parte === 'pierna'
                                                ? 'border-pocholo-red bg-red-50 text-pocholo-red'
                                                : 'border-gray-100 hover:border-pocholo-yellow/50 text-gray-600'
                                                }`}
                                        >
                                            <span className="text-2xl">🍖</span>
                                            <span className="font-semibold">Pierna</span>
                                        </button>
                                    </div>
                                    {!parte && <p className="text-red-400 text-xs mt-1">* Selección recomendada</p>}
                                </div>
                            )}

                            {/* Notas Adicionales */}
                            <div className="space-y-3">
                                <label className="block text-sm font-medium text-pocholo-brown/80">
                                    Notas / Personalización
                                </label>
                                <textarea
                                    value={notas}
                                    onChange={(e) => setNotas(e.target.value)}
                                    placeholder="Ej: Sin ensalada, papas bien fritas, para llevar..."
                                    className="w-full px-4 py-3 rounded-xl bg-gray-50 border-2 border-gray-100 focus:border-pocholo-yellow focus:ring-4 focus:ring-pocholo-yellow/10 transition-all resize-none h-24"
                                />
                                <div className="flex gap-2 text-xs">
                                    <button
                                        type="button"
                                        onClick={() => setNotas(prev => (prev ? prev + ", Sin ensalada" : "Sin ensalada"))}
                                        className="px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded-full text-gray-600 transition-colors"
                                    >
                                        + Sin ensalada
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setNotas(prev => (prev ? prev + ", Para llevar" : "Para llevar"))}
                                        className="px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded-full text-gray-600 transition-colors"
                                    >
                                        + Para llevar
                                    </button>
                                </div>
                            </div>

                            <button
                                type="submit"
                                className="w-full py-4 bg-pocholo-red text-white font-bold rounded-xl shadow-lg hover:bg-pocholo-red-dark hover:shadow-xl active:scale-95 transition-all flex items-center justify-center gap-2"
                            >
                                <Check size={20} strokeWidth={3} />
                                Agregar al Pedido
                            </button>
                        </form>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
