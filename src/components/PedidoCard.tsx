'use client';

import { motion, useMotionValue, useTransform, PanInfo } from 'framer-motion';
import { Clock, CheckCircle, ChefHat, Printer, Trash2, Edit3 } from 'lucide-react';
import { useState, useEffect } from 'react';
import { Venta } from '@/lib/database.types';

interface PedidoCardProps {
    venta: Venta;
    onComplete: (id: string) => void;
    onPrint?: (venta: Venta) => void;
    onCancel?: (id: string) => void;
    onEdit?: (venta: Venta) => void;
}

export default function PedidoCard({ venta, onComplete, onPrint, onCancel, onEdit }: PedidoCardProps) {
    const [elapsedMinutes, setElapsedMinutes] = useState(0);

    const x = useMotionValue(0);
    const opacity = useTransform(x, [0, 200], [1, 0]);
    const background = useTransform(x, [0, 200], ['#ffffff', '#4a5568']);
    const checkOpacity = useTransform(x, [50, 150], [0, 1]);

    useEffect(() => {
        const updateTime = () => {
            const created = new Date(venta.created_at).getTime();
            const now = new Date().getTime();
            setElapsedMinutes(Math.floor((now - created) / 60000));
        };

        updateTime();
        const interval = setInterval(updateTime, 60000);
        return () => clearInterval(interval);
    }, [venta.created_at]);

    const handleDragEnd = (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
        if (info.offset.x > 150) {
            onComplete(venta.id);
        }
    };

    const isDelayed = elapsedMinutes >= 15;

    return (
        <motion.div
            style={{ x, opacity, background }}
            drag="x"
            dragConstraints={{ left: 0, right: 300 }}
            dragSnapToOrigin={true}
            onDragEnd={handleDragEnd}
            className={`
                relative overflow-hidden rounded-xl p-5 shadow-sm mb-3 cursor-grab active:cursor-grabbing 
                border border-gray-200 bg-white
                ${isDelayed ? 'border-l-4 border-l-gray-800' : 'border-l-4 border-l-gray-300'}
            `}
        >
            {/* Check icon al deslizar */}
            <motion.div
                style={{ opacity: checkOpacity }}
                className="absolute left-6 top-1/2 -translate-y-1/2 z-0"
            >
                <CheckCircle size={40} className="text-white" />
            </motion.div>

            {/* Contenido */}
            <div className="relative z-10 pointer-events-none">
                <div className="flex justify-between items-start mb-4">
                    <div>
                        <h3 className="text-xl font-bold text-gray-800">
                            Mesa {(venta as any).mesas?.numero || venta.mesa_id || 'Mostrador'}
                        </h3>
                        <p className="text-xs text-gray-400">
                            #{venta.id.slice(0, 8)}
                        </p>
                    </div>

                    <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${isDelayed ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-600'}`}>
                        <Clock size={12} />
                        <span>{elapsedMinutes} min</span>
                    </div>
                </div>

                <div className="space-y-2">
                    {venta.items.map((item, idx) => (
                        <div key={idx} className="pb-2 border-b border-gray-50 last:border-0 last:pb-0">
                            <div className="flex items-center gap-2">
                                <span className="w-6 h-6 rounded bg-gray-100 flex items-center justify-center text-gray-700 font-semibold text-sm">
                                    {item.cantidad}
                                </span>
                                <span className="text-gray-700 font-medium">
                                    {item.nombre}
                                </span>
                            </div>
                            {(item as any).detalles && (
                                <div className="ml-8 mt-1 space-y-1">
                                    {(item as any).detalles.parte && (
                                        <span className="inline-block px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded">
                                            {(item as any).detalles.parte}
                                        </span>
                                    )}
                                    {(item as any).detalles.notas && (
                                        <p className="text-xs text-gray-500 italic">
                                            {(item as any).detalles.notas}
                                        </p>
                                    )}
                                </div>
                            )}
                        </div>
                    ))}
                </div>

                {/* Notas */}
                {venta.notas && (
                    <div className="mt-3 p-2.5 bg-gray-50 border-l-2 border-gray-300 rounded-r">
                        <p className="text-xs text-gray-500 font-medium mb-0.5">Notas:</p>
                        <p className="text-sm text-gray-700">{venta.notas}</p>
                    </div>
                )}

                {/* Acciones */}
                <div className="mt-4 flex items-center justify-between gap-2">
                    <div className="flex gap-1.5">
                        {onPrint && (
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onPrint(venta);
                                }}
                                className="pointer-events-auto p-2 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-lg transition-colors"
                                title="Imprimir"
                            >
                                <Printer size={16} />
                            </button>
                        )}
                        {onEdit && (
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onEdit(venta);
                                }}
                                className="pointer-events-auto p-2 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-lg transition-colors"
                                title="Editar"
                            >
                                <Edit3 size={16} />
                            </button>
                        )}
                        {onCancel && (
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onCancel(venta.id);
                                }}
                                className="pointer-events-auto p-2 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-lg transition-colors"
                                title="Cancelar"
                            >
                                <Trash2 size={16} />
                            </button>
                        )}
                    </div>
                    <span className="text-xs text-gray-400 flex items-center gap-1">
                        Desliza para completar <ChefHat size={12} />
                    </span>
                </div>
            </div>
        </motion.div>
    );
}
