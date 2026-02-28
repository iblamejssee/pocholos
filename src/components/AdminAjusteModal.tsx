'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Save, Loader2, Package, DollarSign } from 'lucide-react';
import { ajustarStockPollos, ajustarCajaChica, ajustarStockChicha, ajustarStockPapas } from '@/lib/inventario';
import toast from 'react-hot-toast';

interface AdminAjusteModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

export default function AdminAjusteModal({ isOpen, onClose, onSuccess }: AdminAjusteModalProps) {
    const [tipo, setTipo] = useState<'pollos' | 'caja' | 'chicha' | 'papas'>('pollos');
    const [valor, setValor] = useState('');
    const [loading, setLoading] = useState(false);

    // Limpiar el valor cuando cambie el tipo para evitar confusiones
    const cambiarTipo = (nuevoTipo: 'pollos' | 'caja' | 'chicha' | 'papas') => {
        setTipo(nuevoTipo);
        setValor('');
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const numValor = parseFloat(valor);

        if (isNaN(numValor) || numValor <= 0) {
            toast.error('Por favor, ingresa un valor válido mayor a 0');
            return;
        }

        setLoading(true);
        try {
            let resultado;
            if (tipo === 'pollos') {
                resultado = await ajustarStockPollos(numValor);
            } else if (tipo === 'chicha') {
                resultado = await ajustarStockChicha(numValor);
            } else if (tipo === 'papas') {
                resultado = await ajustarStockPapas(numValor);
            } else {
                resultado = await ajustarCajaChica(numValor);
            }

            if (resultado.success) {
                toast.success(resultado.message);
                setValor('');
                onSuccess();
                onClose();
            } else {
                toast.error(resultado.message);
            }
        } catch (error) {
            console.error('Error en ajuste manual:', error);
            toast.error('Ocurrió un error inesperado');
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-60 flex items-center justify-center p-4">
                <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.9, opacity: 0 }}
                    className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden"
                >
                    {/* Header */}
                    <div className="bg-linear-to-r from-slate-800 to-slate-900 p-6 text-white flex items-center justify-between">
                        <div>
                            <h2 className="text-xl font-bold flex items-center gap-2">
                                AJUSTE ADMINISTRATIVO
                            </h2>
                            <p className="text-slate-400 text-xs">Carga extra de stock o efectivo</p>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-white/10 rounded-full transition-colors"
                        >
                            <X size={20} />
                        </button>
                    </div>

                    <form onSubmit={handleSubmit} className="p-6 space-y-6">
                        {/* Selector de Tipo */}
                        <div className="flex gap-2 p-1 bg-slate-100 rounded-xl">
                            <button
                                type="button"
                                onClick={() => cambiarTipo('pollos')}
                                className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg font-bold text-sm transition-all ${tipo === 'pollos'
                                    ? 'bg-white text-pocholo-red shadow-md'
                                    : 'text-slate-500 hover:text-slate-700'
                                    }`}
                            >
                                <span className="text-lg">🍗</span>
                                POLLOS
                            </button>
                            <button
                                type="button"
                                onClick={() => cambiarTipo('chicha')}
                                className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg font-bold text-sm transition-all ${tipo === 'chicha'
                                    ? 'bg-white text-purple-600 shadow-md'
                                    : 'text-slate-500 hover:text-slate-700'
                                    }`}
                            >
                                <span className="text-lg">🟣</span>
                                CHICHA
                            </button>
                            <button
                                type="button"
                                onClick={() => cambiarTipo('caja')}
                                className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg font-bold text-sm transition-all ${tipo === 'caja'
                                    ? 'bg-white text-emerald-600 shadow-md'
                                    : 'text-slate-500 hover:text-slate-700'
                                    }`}
                            >
                                <span className="text-[18px] font-bold leading-none">S/</span>
                                CAJA
                            </button>
                            <button
                                type="button"
                                onClick={() => cambiarTipo('papas')}
                                className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg font-bold text-sm transition-all ${tipo === 'papas'
                                    ? 'bg-white text-orange-600 shadow-md'
                                    : 'text-slate-500 hover:text-slate-700'
                                    }`}
                            >
                                <span className="text-lg">🥔</span>
                                PAPAS
                            </button>
                        </div>

                        {/* Input de Valor */}
                        <div className="space-y-2">
                            <label className="text-sm font-semibold text-slate-600 px-1">
                                {tipo === 'pollos' ? 'Cantidad de pollos a añadir' : tipo === 'papas' ? 'Kilos de papa a añadir' : 'Monto de dinero a añadir'}
                            </label>
                            <div className="relative">
                                {tipo === 'caja' && (
                                    <span className="absolute left-6 top-1/2 -translate-y-1/2 text-2xl font-bold text-slate-400">
                                        S/
                                    </span>
                                )}
                                {tipo === 'chicha' && (
                                    <span className="absolute right-6 top-1/2 -translate-y-1/2 text-2xl font-bold text-slate-400">
                                        L
                                    </span>
                                )}
                                {tipo === 'papas' && (
                                    <span className="absolute right-6 top-1/2 -translate-y-1/2 text-2xl font-bold text-slate-400">
                                        Kg
                                    </span>
                                )}
                                <input
                                    type="number"
                                    step={tipo === 'pollos' ? '0.125' : '0.01'}
                                    min="0"
                                    value={valor}
                                    onChange={(e) => setValor(e.target.value)}
                                    placeholder="0.00"
                                    autoFocus
                                    className={`w-full py-6 font-black text-4xl text-center rounded-2xl border-2 transition-all focus:outline-none focus:ring-4 ${tipo === 'pollos'
                                        ? 'text-pocholo-red border-pocholo-red/10 focus:border-pocholo-red focus:ring-pocholo-red/10'
                                        : tipo === 'chicha'
                                            ? 'text-purple-600 border-purple-100 focus:border-purple-500 focus:ring-purple-500/10'
                                            : tipo === 'papas'
                                                ? 'text-orange-600 border-orange-100 focus:border-orange-500 focus:ring-orange-500/10'
                                                : 'text-emerald-600 border-emerald-100 focus:border-emerald-500 focus:ring-emerald-500/10'
                                        } ${tipo === 'caja' ? 'pl-16' : ''} ${tipo === 'chicha' || tipo === 'papas' ? 'pr-16' : ''}`}
                                />
                            </div>
                        </div>

                        <div className="p-4 bg-amber-50 rounded-xl flex gap-3">
                            <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center shrink-0">
                                <span className="text-xl">⚠️</span>
                            </div>
                            <p className="text-xs text-amber-800 leading-relaxed font-medium">
                                Esta acción incrementará el stock/caja total del día y quedará registrado en el historial.
                                Asegúrate de contar físicamente los items antes de confirmar.
                            </p>
                        </div>

                        {/* Botones */}
                        <div className="flex gap-3">
                            <button
                                type="button"
                                onClick={onClose}
                                className="flex-1 py-4 font-bold text-slate-500 bg-slate-50 hover:bg-slate-100 rounded-2xl transition-all"
                            >
                                Cancelar
                            </button>
                            <button
                                type="submit"
                                disabled={loading}
                                className={`flex-2 py-4 text-white font-bold rounded-2xl shadow-lg transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2 ${tipo === 'pollos'
                                    ? 'bg-linear-to-r from-pocholo-red to-red-600 hover:shadow-red-200'
                                    : tipo === 'chicha'
                                        ? 'bg-linear-to-r from-purple-500 to-indigo-600 hover:shadow-purple-200'
                                        : tipo === 'papas'
                                            ? 'bg-linear-to-r from-orange-500 to-amber-600 hover:shadow-orange-200'
                                            : 'bg-linear-to-r from-emerald-500 to-teal-600 hover:shadow-emerald-200'
                                    }`}
                            >
                                {loading ? (
                                    <Loader2 className="animate-spin" size={20} />
                                ) : (
                                    <Save size={20} />
                                )}
                                CONFIRMAR AJUSTE
                            </button>
                        </div>
                    </form>
                </motion.div>
            </div>
        </AnimatePresence>
    );
}
