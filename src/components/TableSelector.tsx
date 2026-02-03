'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { X, Users, ShoppingBag } from 'lucide-react';
import { useMesas } from '@/hooks/useMesas';
import type { Mesa } from '@/lib/database.types';

interface TableSelectorProps {
    isOpen: boolean;
    onClose: () => void;
    onSelectTable: (mesa: Mesa | null) => void; // null = Para llevar
}

export default function TableSelector({ isOpen, onClose, onSelectTable }: TableSelectorProps) {
    const { mesas, loading } = useMesas();

    const handleSelectTable = (mesa: Mesa) => {
        if (mesa.estado === 'libre') {
            onSelectTable(mesa);
            onClose();
        }
    };

    const handleParaLlevar = () => {
        onSelectTable(null);
        onClose();
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
                    />

                    {/* Modal */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 20 }}
                        className="fixed inset-0 z-50 flex items-center justify-center p-4"
                    >
                        <div className="bg-white rounded-3xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden">
                            {/* Header */}
                            <div className="bg-gradient-to-r from-pocholo-red to-pocholo-yellow p-6 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center">
                                        <Users size={24} className="text-pocholo-red" />
                                    </div>
                                    <div>
                                        <h2 className="text-2xl font-bold text-white">Seleccionar Mesa</h2>
                                        <p className="text-white/90 text-sm">Elige una mesa o selecciona "Para Llevar"</p>
                                    </div>
                                </div>
                                <button
                                    onClick={onClose}
                                    className="w-10 h-10 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center transition-colors"
                                >
                                    <X size={24} className="text-white" />
                                </button>
                            </div>

                            {/* Content */}
                            <div className="p-6 overflow-y-auto max-h-[calc(90vh-180px)]">
                                {loading ? (
                                    <div className="text-center py-12">
                                        <div className="animate-spin w-12 h-12 border-4 border-pocholo-yellow border-t-transparent rounded-full mx-auto mb-4" />
                                        <p className="text-pocholo-brown/60">Cargando mesas...</p>
                                    </div>
                                ) : (
                                    <>
                                        {/* Opción Para Llevar - Destacada */}
                                        <motion.button
                                            onClick={handleParaLlevar}
                                            whileHover={{ scale: 1.02 }}
                                            whileTap={{ scale: 0.98 }}
                                            className="w-full mb-6 p-5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 rounded-2xl shadow-lg flex items-center justify-center gap-4 text-white font-bold text-xl transition-all"
                                        >
                                            <ShoppingBag size={32} />
                                            <span>🥡 PARA LLEVAR</span>
                                        </motion.button>

                                        <div className="flex items-center gap-3 mb-4">
                                            <div className="flex-1 h-px bg-pocholo-brown/20" />
                                            <span className="text-pocholo-brown/60 font-semibold text-sm">o selecciona una mesa</span>
                                            <div className="flex-1 h-px bg-pocholo-brown/20" />
                                        </div>

                                        {/* Grid de mesas */}
                                        <div className="grid grid-cols-4 gap-4 mb-6">
                                            {mesas.map((mesa) => (
                                                <motion.button
                                                    key={mesa.id}
                                                    onClick={() => handleSelectTable(mesa)}
                                                    disabled={mesa.estado === 'ocupada'}
                                                    whileHover={mesa.estado === 'libre' ? { scale: 1.05 } : {}}
                                                    whileTap={mesa.estado === 'libre' ? { scale: 0.95 } : {}}
                                                    className={`
                                                        relative h-24 rounded-2xl font-bold text-white text-2xl
                                                        transition-all duration-300 shadow-lg
                                                        ${mesa.estado === 'libre'
                                                            ? 'bg-gradient-to-br from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 cursor-pointer'
                                                            : 'bg-gradient-to-br from-red-500 to-red-600 cursor-not-allowed opacity-75'
                                                        }
                                                    `}
                                                >
                                                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                                                        <Users size={20} className="mb-1" />
                                                        <span>Mesa {mesa.numero}</span>
                                                    </div>

                                                    {/* Indicador de estado */}
                                                    <div className={`
                                                        absolute top-2 right-2 w-3 h-3 rounded-full
                                                        ${mesa.estado === 'libre' ? 'bg-white' : 'bg-white/50'}
                                                    `} />
                                                </motion.button>
                                            ))}
                                        </div>

                                        {/* Leyenda */}
                                        <div className="flex items-center justify-center gap-6 p-4 bg-pocholo-cream rounded-2xl">
                                            <div className="flex items-center gap-2">
                                                <div className="w-4 h-4 bg-amber-500 rounded-full" />
                                                <span className="text-pocholo-brown font-semibold">Para Llevar</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <div className="w-4 h-4 bg-green-500 rounded-full" />
                                                <span className="text-pocholo-brown font-semibold">Libre</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <div className="w-4 h-4 bg-red-500 rounded-full" />
                                                <span className="text-pocholo-brown font-semibold">Ocupada</span>
                                            </div>
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}

