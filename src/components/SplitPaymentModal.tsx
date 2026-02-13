'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, DollarSign, CreditCard, Smartphone, Check, AlertCircle } from 'lucide-react';

interface PagoDividido {
    efectivo?: number;
    yape?: number;
    plin?: number;
    tarjeta?: number;
}

interface SplitPaymentModalProps {
    isOpen: boolean;
    onClose: () => void;
    total: number;
    onConfirm: (metodo: 'efectivo' | 'yape' | 'plin' | 'tarjeta' | 'mixto', pagoDividido?: PagoDividido) => void;
}

const METODOS = [
    { key: 'efectivo' as const, label: 'Efectivo', icon: DollarSign, color: 'bg-emerald-500', lightColor: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    { key: 'yape' as const, label: 'Yape', icon: Smartphone, color: 'bg-purple-500', lightColor: 'bg-purple-50 text-purple-700 border-purple-200' },
    { key: 'plin' as const, label: 'Plin', icon: Smartphone, color: 'bg-cyan-500', lightColor: 'bg-cyan-50 text-cyan-700 border-cyan-200' },
    { key: 'tarjeta' as const, label: 'Tarjeta', icon: CreditCard, color: 'bg-blue-500', lightColor: 'bg-blue-50 text-blue-700 border-blue-200' },
];

export default function SplitPaymentModal({ isOpen, onClose, total, onConfirm }: SplitPaymentModalProps) {
    const [montos, setMontos] = useState<PagoDividido>({});
    const [modoRapido, setModoRapido] = useState(true);

    useEffect(() => {
        if (isOpen) {
            setMontos({});
            setModoRapido(true);
        }
    }, [isOpen]);

    const sumaActual = Object.values(montos).reduce((sum, v) => sum + (v || 0), 0);
    const diferencia = total - sumaActual;
    const esValido = Math.abs(diferencia) < 0.01;

    const metodosUsados = Object.entries(montos).filter(([, v]) => v && v > 0);
    const esMetodoUnico = metodosUsados.length === 1;

    const handleMontoChange = (key: keyof PagoDividido, valor: string) => {
        const num = valor === '' ? 0 : parseFloat(valor);
        if (isNaN(num) || num < 0) return;
        setMontos(prev => ({ ...prev, [key]: num }));
    };

    const handleQuickPay = (metodo: 'efectivo' | 'yape' | 'plin' | 'tarjeta') => {
        onConfirm(metodo, undefined);
    };

    const handleConfirm = () => {
        if (!esValido) return;

        if (esMetodoUnico) {
            const metodo = metodosUsados[0][0] as 'efectivo' | 'yape' | 'plin' | 'tarjeta';
            onConfirm(metodo, undefined);
        } else {
            // Limpiar montos en 0
            const pagoLimpio: PagoDividido = {};
            for (const [k, v] of Object.entries(montos)) {
                if (v && v > 0) {
                    pagoLimpio[k as keyof PagoDividido] = v;
                }
            }
            onConfirm('mixto', pagoLimpio);
        }
    };

    // Auto-completar el restante en el último campo tocado
    const handleAutoCompletar = (key: keyof PagoDividido) => {
        if (diferencia > 0) {
            setMontos(prev => ({
                ...prev,
                [key]: (prev[key] || 0) + diferencia
            }));
        }
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-[90] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 20 }}
                    className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
                >
                    {/* Header */}
                    <div className="bg-slate-800 px-6 py-4 flex items-center justify-between">
                        <div>
                            <h2 className="text-lg font-bold text-white">Cobrar Pedido</h2>
                            <p className="text-slate-400 text-sm">Total: <span className="text-white font-bold text-lg">S/ {total.toFixed(2)}</span></p>
                        </div>
                        <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors p-1">
                            <X size={22} />
                        </button>
                    </div>

                    <div className="p-5">
                        {modoRapido ? (
                            <>
                                {/* MODO RÁPIDO: Botones de pago único */}
                                <p className="text-xs text-slate-400 uppercase font-semibold tracking-wide mb-3">Pago con un solo método</p>
                                <div className="grid grid-cols-2 gap-3 mb-4">
                                    {METODOS.map(m => (
                                        <button
                                            key={m.key}
                                            onClick={() => handleQuickPay(m.key)}
                                            className="py-5 rounded-xl font-semibold text-sm text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 transition-all flex flex-col items-center justify-center gap-2 active:scale-95"
                                        >
                                            <m.icon size={22} className="text-slate-500" />
                                            {m.label}
                                        </button>
                                    ))}
                                </div>

                                {/* Separator */}
                                <div className="relative my-5">
                                    <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-200"></div></div>
                                    <div className="relative flex justify-center">
                                        <span className="bg-white px-4 text-xs text-slate-400 uppercase font-semibold">o</span>
                                    </div>
                                </div>

                                {/* Botón dividir */}
                                <button
                                    onClick={() => setModoRapido(false)}
                                    className="w-full py-4 rounded-xl font-bold text-sm text-white bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 transition-all shadow-md active:scale-[0.98] flex items-center justify-center gap-2"
                                >

                                    Dividir Pago (Mixto)
                                </button>
                            </>
                        ) : (
                            <>
                                {/* MODO DIVIDIDO: Inputs por método */}
                                <button
                                    onClick={() => { setModoRapido(true); setMontos({}); }}
                                    className="text-xs text-slate-400 hover:text-slate-600 mb-4 flex items-center gap-1 transition-colors"
                                >
                                    ← Volver a pago simple
                                </button>

                                <div className="space-y-3 mb-5">
                                    {METODOS.map(m => (
                                        <div key={m.key} className={`flex items-center gap-3 p-3 rounded-xl border ${montos[m.key] ? m.lightColor : 'border-slate-100 bg-white'} transition-all`}>
                                            <div className={`w-9 h-9 rounded-lg ${m.color} flex items-center justify-center flex-shrink-0`}>
                                                <m.icon size={18} className="text-white" />
                                            </div>
                                            <span className="text-sm font-semibold text-slate-700 flex-1">{m.label}</span>
                                            <div className="flex items-center gap-1">
                                                <span className="text-xs text-slate-400">S/</span>
                                                <input
                                                    type="number"
                                                    inputMode="decimal"
                                                    step="0.01"
                                                    min="0"
                                                    value={montos[m.key] || ''}
                                                    onChange={(e) => handleMontoChange(m.key, e.target.value)}
                                                    placeholder="0.00"
                                                    className="w-24 text-right font-bold text-slate-800 bg-transparent border-b-2 border-slate-200 focus:border-slate-500 outline-none py-1 text-base transition-colors"
                                                />
                                                {/* Auto-completar */}
                                                {diferencia > 0.01 && (
                                                    <button
                                                        onClick={() => handleAutoCompletar(m.key)}
                                                        title={`Poner S/ ${diferencia.toFixed(2)} restantes aquí`}
                                                        className="text-[10px] text-amber-600 bg-amber-50 hover:bg-amber-100 px-1.5 py-0.5 rounded font-bold transition-colors ml-1"
                                                    >
                                                        +{diferencia.toFixed(0)}
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                {/* Resumen */}
                                <div className={`p-4 rounded-xl mb-4 ${esValido ? 'bg-green-50 border border-green-200' : diferencia > 0 ? 'bg-amber-50 border border-amber-200' : 'bg-red-50 border border-red-200'}`}>
                                    <div className="flex justify-between items-center text-sm">
                                        <span className="font-medium text-slate-600">Total pedido:</span>
                                        <span className="font-bold text-slate-800">S/ {total.toFixed(2)}</span>
                                    </div>
                                    <div className="flex justify-between items-center text-sm mt-1">
                                        <span className="font-medium text-slate-600">Ingresado:</span>
                                        <span className="font-bold text-slate-800">S/ {sumaActual.toFixed(2)}</span>
                                    </div>
                                    {!esValido && (
                                        <div className={`flex items-center gap-1.5 mt-2 pt-2 border-t ${diferencia > 0 ? 'border-amber-200 text-amber-700' : 'border-red-200 text-red-700'}`}>
                                            <AlertCircle size={14} />
                                            <span className="text-xs font-semibold">
                                                {diferencia > 0 ? `Falta S/ ${diferencia.toFixed(2)}` : `Excede S/ ${Math.abs(diferencia).toFixed(2)}`}
                                            </span>
                                        </div>
                                    )}
                                    {esValido && (
                                        <div className="flex items-center gap-1.5 mt-2 pt-2 border-t border-green-200 text-green-700">
                                            <Check size={14} />
                                            <span className="text-xs font-semibold">¡Monto correcto!</span>
                                        </div>
                                    )}
                                </div>

                                {/* Confirmar */}
                                <button
                                    onClick={handleConfirm}
                                    disabled={!esValido}
                                    className="w-full py-4 rounded-xl font-bold text-white bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-200 disabled:text-slate-400 transition-all shadow-md active:scale-[0.98] flex items-center justify-center gap-2"
                                >
                                    <Check size={20} />
                                    Confirmar Pago
                                </button>
                            </>
                        )}
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
}
