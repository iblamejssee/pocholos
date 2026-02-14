import { useState, useEffect } from 'react';
import { X, Save, AlertTriangle, Calculator } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import type { Venta } from '@/lib/database.types';
import toast from 'react-hot-toast';

interface EditPaymentModalProps {
    isOpen: boolean;
    onClose: () => void;
    venta: Venta | null;
    onUpdate: () => void;
}

type MetodoPago = 'efectivo' | 'yape' | 'plin' | 'tarjeta' | 'mixto';

export default function EditPaymentModal({ isOpen, onClose, venta, onUpdate }: EditPaymentModalProps) {
    const [metodoPago, setMetodoPago] = useState<MetodoPago>('efectivo');
    const [splitPago, setSplitPago] = useState({
        efectivo: 0,
        yape: 0,
        plin: 0,
        tarjeta: 0
    });
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (isOpen && venta) {
            setMetodoPago((venta.metodo_pago as MetodoPago) || 'efectivo');
            if (venta.metodo_pago === 'mixto' && venta.pago_dividido) {
                setSplitPago({
                    efectivo: venta.pago_dividido.efectivo || 0,
                    yape: venta.pago_dividido.yape || 0,
                    plin: venta.pago_dividido.plin || 0,
                    tarjeta: venta.pago_dividido.tarjeta || 0
                });
            } else {
                setSplitPago({ efectivo: 0, yape: 0, plin: 0, tarjeta: 0 });
            }
        }
    }, [isOpen, venta]);

    const handleSplitChange = (method: keyof typeof splitPago, value: string) => {
        const numValue = parseFloat(value) || 0;
        setSplitPago(prev => ({ ...prev, [method]: numValue }));
    };

    const totalSplit = Object.values(splitPago).reduce((a, b) => a + b, 0);
    const montoFaltante = venta ? venta.total - totalSplit : 0;

    const handleSave = async () => {
        if (!venta) return;

        if (metodoPago === 'mixto' && Math.abs(montoFaltante) > 0.1) {
            toast.error(`Los montos no coinciden. Faltan S/ ${montoFaltante.toFixed(2)}`);
            return;
        }

        setLoading(true);
        try {
            const updateData: any = {
                metodo_pago: metodoPago
            };

            if (metodoPago === 'mixto') {
                updateData.pago_dividido = splitPago;
            } else {
                updateData.pago_dividido = null;
            }

            const { error } = await supabase
                .from('ventas')
                .update(updateData)
                .eq('id', venta.id);

            if (error) throw error;

            toast.success('Método de pago actualizado');
            onUpdate();
            onClose();
        } catch (error) {
            console.error('Error updating payment:', error);
            toast.error('Error al actualizar');
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen || !venta) return null;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden"
                >
                    <div className="bg-slate-800 text-white p-4 flex justify-between items-center">
                        <h3 className="font-bold flex items-center gap-2">
                            <Calculator size={18} />
                            Editar Pago
                        </h3>
                        <button onClick={onClose} className="hover:bg-white/20 p-1 rounded-full transition-colors">
                            <X size={18} />
                        </button>
                    </div>

                    <div className="p-6">
                        <div className="mb-6">
                            <p className="text-sm text-slate-500 mb-1">Total de la venta</p>
                            <p className="text-3xl font-bold text-slate-800">S/ {venta.total.toFixed(2)}</p>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">Nuevo Método</label>
                                <div className="grid grid-cols-3 gap-2">
                                    {['efectivo', 'yape', 'plin', 'tarjeta', 'mixto'].map((m) => (
                                        <button
                                            key={m}
                                            onClick={() => setMetodoPago(m as MetodoPago)}
                                            className={`px-3 py-2 rounded-lg text-sm font-medium capitalize border-2 transition-all ${metodoPago === m
                                                ? 'border-pocholo-red bg-pocholo-red/5 text-pocholo-red'
                                                : 'border-slate-100 hover:border-slate-200 text-slate-600'
                                                }`}
                                        >
                                            {m}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {metodoPago === 'mixto' && (
                                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-3 animate-in fade-in slide-in-from-top-2">
                                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Desglose de Pago</p>
                                    <div className="grid grid-cols-2 gap-3">
                                        {Object.keys(splitPago).map((key) => (
                                            <div key={key}>
                                                <label className="block text-xs text-slate-500 capitalize mb-1">{key}</label>
                                                <div className="relative">
                                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">S/</span>
                                                    <input
                                                        type="number"
                                                        value={splitPago[key as keyof typeof splitPago] || ''}
                                                        onChange={(e) => handleSplitChange(key as keyof typeof splitPago, e.target.value)}
                                                        className="w-full pl-8 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-pocholo-red focus:border-transparent outline-none"
                                                        placeholder="0.00"
                                                    />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                    <div className={`mt-3 p-2 rounded-lg text-center text-sm font-medium ${Math.abs(montoFaltante) < 0.1 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                        {Math.abs(montoFaltante) < 0.1 ? 'Cuadre Perfecto ✨' : `Faltan: S/ ${montoFaltante.toFixed(2)}`}
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="mt-8 flex gap-3">
                            <button
                                onClick={onClose}
                                className="flex-1 px-4 py-2.5 bg-slate-100 text-slate-700 font-medium rounded-xl hover:bg-slate-200 transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleSave}
                                disabled={loading}
                                className="flex-1 px-4 py-2.5 bg-pocholo-red text-white font-bold rounded-xl hover:bg-red-700 transition-colors shadow-lg shadow-red-900/20 disabled:opacity-50 flex justify-center items-center gap-2"
                            >
                                {loading ? 'Guardando...' : <><Save size={18} /> Guardar Cambios</>}
                            </button>
                        </div>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
}
