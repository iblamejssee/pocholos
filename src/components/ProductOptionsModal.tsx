'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Check } from 'lucide-react';
import type { Producto } from '@/lib/database.types';

type NivelPicante = 'Sin Ají' | 'Medio' | 'Picante' | 'Extra Picante' | 'Para Niño';

interface ProductOptionsModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (producto: Producto, opciones: { picante?: string, termino?: string, notas: string, detalle_bebida?: { marca: string, tipo: string }, cantidad: number }) => void;
    producto: Producto | null;
}

export default function ProductOptionsModal({ isOpen, onClose, onConfirm, producto }: ProductOptionsModalProps) {
    const [picante, setPicante] = useState<string | undefined>(undefined);
    const [cantidad, setCantidad] = useState(1);
    const [notas, setNotas] = useState('');
    const [termino, setTermino] = useState<string | undefined>(undefined);
    const [marcaGaseosa, setMarcaGaseosa] = useState<'inca_kola' | 'coca_cola'>('inca_kola');
    const [saborInfusion, setSaborInfusion] = useState<string>('');

    useEffect(() => {
        if (isOpen) {
            setPicante(undefined);
            setTermino(undefined);
            setNotas('');
            setMarcaGaseosa('inca_kola');
            setSaborInfusion('');
        }
    }, [isOpen, producto]);

    if (!producto) return null;

    const nombreLower = producto.nombre.toLowerCase();
    const esPromocion = producto.tipo === 'promocion';

    // Mostrar siempre selección de picante para Ceviches y Leches de Tigre
    const esCevicheOLeche = nombreLower.includes('ceviche') || nombreLower.includes('leche');
    const permitePicante = esCevicheOLeche;

    const nivelesPicante: { valor: string; emoji: string; label: string }[] = [
        { valor: 'Sin Ají', emoji: '😇', label: 'Sin Ají' },
        { valor: 'Para Niño', emoji: '👶', label: 'Para Niño' },
        { valor: 'Medio', emoji: '😏', label: 'Medio' },
        { valor: 'Picante', emoji: '🔥', label: 'Picante' },
        { valor: 'Extra Picante', emoji: '💀', label: 'Extra P.' },
    ];

    const terminosCoccion = [
        { valor: 'Bien Cocido', label: 'Cocido' },
        { valor: 'A Punto', label: 'A Punto' },
        { valor: 'Inglés', label: 'Inglés' },
    ];

    // Detectar si la promo incluye gaseosa (no chicha)
    const promoConGaseosa = esPromocion && nombreLower.includes('gaseosa');

    // Detectar si es infusión (té, anis, manzanilla...)
    const esInfusion = !esPromocion && (
        nombreLower.includes('infusion') ||
        nombreLower.includes('te') ||
        nombreLower.includes('té') ||
        nombreLower.includes('mate') ||
        nombreLower.includes('anis') ||
        nombreLower.includes('manzanilla')
    );

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        // Construir notas finales
        let notasFinales = notas;

        // Agregar picante a las notas si se seleccionó
        if (picante) {
            notasFinales = notasFinales ? `${picante}, ${notasFinales}` : picante;
        }

        // Si es promo con gaseosa, agregar la marca seleccionada a las notas
        if (promoConGaseosa) {
            const marcaTexto = marcaGaseosa === 'inca_kola' ? 'Inca Kola' : 'Coca Cola';
            notasFinales = notasFinales ? `${marcaTexto} 1.5L, ${notasFinales}` : `${marcaTexto} 1.5L`;
        }

        // Si es infusión, agregar el sabor
        if (esInfusion && saborInfusion) {
            notasFinales = notasFinales ? `${saborInfusion}, ${notasFinales}` : saborInfusion;
        }

        // Determinar detalle_bebida
        let detalleBebida: { marca: string, tipo: string } | undefined = promoConGaseosa
            ? { marca: marcaGaseosa, tipo: 'litro_medio' }
            : undefined;

        // Auto-detectar Chicha si no es promo
        if (!detalleBebida && nombreLower.includes('chicha')) {
            let tipo: any = 'vaso';
            if (nombreLower.includes('medio') || nombreLower.includes('0.5') || nombreLower.includes('0,5') || nombreLower.includes('1/2')) {
                tipo = 'medio_litro';
            } else if (nombreLower.includes('litro') || nombreLower.includes('1l') || nombreLower.includes('jarra')) {
                tipo = 'litro';
            }
            detalleBebida = { marca: 'chicha', tipo };
        }

        onConfirm(producto, {
            picante: picante,
            termino: termino,
            notas: notasFinales,
            detalle_bebida: detalleBebida,
            cantidad
        });
        onClose();
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-md border border-thebear-cream overflow-hidden max-h-[90vh] overflow-y-auto"
                    >
                        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-linear-to-r from-thebear-cream to-white sticky top-0">
                            <div>
                                <h2 className="text-2xl font-bold text-thebear-dark-blue">{producto.nombre}</h2>
                                <p className="text-thebear-blue font-semibold">S/ {producto.precio.toFixed(2)}</p>
                            </div>
                            <button
                                onClick={onClose}
                                className="p-2 hover:bg-red-50 text-gray-400 hover:text-red-500 rounded-xl transition-colors"
                            >
                                <X size={24} />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-6 space-y-5">
                            {/* Selector de Cantidad */}
                            <div className="flex items-center justify-between bg-thebear-light-blue/10 p-3 rounded-xl border border-thebear-light-blue/20">
                                <span className="font-bold text-thebear-dark-blue">Cantidad</span>
                                <div className="flex items-center gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setCantidad(Math.max(1, cantidad - 1))}
                                        className="w-8 h-8 rounded-full bg-white text-thebear-blue font-bold flex items-center justify-center shadow-sm hover:bg-red-50"
                                    >
                                        -
                                    </button>
                                    <span className="text-xl font-bold text-thebear-blue w-6 text-center">{cantidad}</span>
                                    <button
                                        type="button"
                                        onClick={() => setCantidad(cantidad + 1)}
                                        className="w-8 h-8 rounded-full bg-thebear-blue text-white font-bold flex items-center justify-center shadow-sm hover:bg-red-600"
                                    >
                                        +
                                    </button>
                                </div>
                            </div>

                            {/* Selección de Picante */}
                            {permitePicante && (
                                <div className="space-y-3">
                                    <label className="block text-sm font-medium text-thebear-dark-blue/80 mb-2">
                                        Nivel de Picante 🔥
                                    </label>
                                    <div className="grid grid-cols-5 gap-2">
                                        {nivelesPicante.map((n) => (
                                            <button
                                                key={n.valor}
                                                type="button"
                                                onClick={() => setPicante(n.valor)}
                                                className={`p-2 rounded-xl border-2 transition-all flex flex-col items-center gap-1 ${picante === n.valor
                                                    ? 'border-thebear-blue bg-blue-50 text-thebear-blue'
                                                    : 'border-gray-100 hover:border-thebear-light-blue/50 text-gray-600'
                                                    }`}
                                            >
                                                <span className="text-xl">{n.emoji}</span>
                                                <span className="font-bold text-[10px] whitespace-nowrap">{n.label}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Selección de Término */}
                            {producto.tipo === 'plato' && !esCevicheOLeche && (
                                <div className="space-y-3">
                                    <label className="block text-xs font-black text-thebear-dark-blue/60 uppercase tracking-widest">
                                        Término de Cocción
                                    </label>
                                    <div className="grid grid-cols-3 gap-2">
                                        {terminosCoccion.map((t) => (
                                            <button
                                                key={t.valor}
                                                type="button"
                                                onClick={() => setTermino(t.valor)}
                                                className={`py-3 rounded-2xl border-2 transition-all font-bold text-xs ${termino === t.valor
                                                    ? 'border-thebear-blue bg-blue-50 text-thebear-blue'
                                                    : 'border-slate-100 hover:border-thebear-light-blue/50 text-slate-500 hover:bg-slate-50'
                                                    }`}
                                            >
                                                {t.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Selección de Gaseosa para Promos */}
                            {promoConGaseosa && (
                                <div className="space-y-3">
                                    <label className="block text-sm font-medium text-thebear-dark-blue/80 mb-2">
                                        🍾 Elegir Gaseosa de 1.5L
                                    </label>
                                    <div className="grid grid-cols-2 gap-3">
                                        <button
                                            type="button"
                                            onClick={() => setMarcaGaseosa('inca_kola')}
                                            className={`p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-2 ${marcaGaseosa === 'inca_kola'
                                                ? 'border-yellow-500 bg-yellow-50 text-yellow-700'
                                                : 'border-gray-100 hover:border-yellow-300 text-gray-600'
                                                }`}
                                        >
                                            <span className="text-2xl">🟡</span>
                                            <span className="font-bold text-sm">Inca Kola</span>
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setMarcaGaseosa('coca_cola')}
                                            className={`p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-2 ${marcaGaseosa === 'coca_cola'
                                                ? 'border-red-500 bg-red-50 text-red-700'
                                                : 'border-gray-100 hover:border-red-300 text-gray-600'
                                                }`}
                                        >
                                            <span className="text-2xl">🔴</span>
                                            <span className="font-bold text-sm">Coca Cola</span>
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Selección de Infusiones */}
                            {esInfusion && (
                                <div className="space-y-3">
                                    <label className="block text-sm font-medium text-thebear-dark-blue/80 mb-2">
                                        🍵 Elegir Sabor
                                    </label>
                                    <div className="grid grid-cols-2 gap-2">
                                        {['Manzanilla', 'Anís', 'Té Canela y Clavo'].map((sabor) => (
                                            <button
                                                key={sabor}
                                                type="button"
                                                onClick={() => setSaborInfusion(sabor)}
                                                className={`p-3 rounded-xl border-2 transition-all flex flex-col items-center gap-1 ${saborInfusion === sabor
                                                    ? 'border-green-500 bg-green-50 text-green-700'
                                                    : 'border-gray-100 hover:border-green-300 text-gray-600'
                                                    }`}
                                            >
                                                <span className="font-semibold text-sm">{sabor}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Notas Adicionales */}
                            <div className="space-y-3">
                                <label className="block text-sm font-medium text-thebear-dark-blue/80">
                                    Notas / Personalización
                                </label>
                                <textarea
                                    value={notas}
                                    onChange={(e) => setNotas(e.target.value)}
                                    placeholder="Ej: Sin cebolla, para llevar, poco picante..."
                                    className="w-full px-4 py-3 rounded-xl bg-gray-50 border-2 border-gray-100 focus:border-thebear-light-blue focus:ring-4 focus:ring-thebear-light-blue/10 transition-all resize-none h-20"
                                />
                                <div className="flex flex-wrap gap-2 text-xs">
                                    <button
                                        type="button"
                                        onClick={() => setNotas(prev => (prev ? prev + ", Sin cebolla" : "Sin cebolla"))}
                                        className="px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded-full text-gray-600 transition-colors"
                                    >
                                        + Sin cebolla
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setNotas(prev => (prev ? prev + ", Para llevar" : "Para llevar"))}
                                        className="px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded-full text-gray-600 transition-colors"
                                    >
                                        + Para llevar
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setNotas(prev => (prev ? prev + ", Extra ají" : "Extra ají"))}
                                        className="px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded-full text-gray-600 transition-colors"
                                    >
                                        + Extra ají
                                    </button>
                                </div>
                            </div>

                            <button
                                type="submit"
                                className="w-full py-4 bg-thebear-blue text-white font-bold rounded-xl shadow-lg hover:bg-thebear-blue-dark hover:shadow-xl active:scale-95 transition-all flex items-center justify-center gap-2"
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
