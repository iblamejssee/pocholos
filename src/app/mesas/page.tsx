'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Users, RefreshCw, Loader2 } from 'lucide-react';
import { useMesas } from '@/hooks/useMesas';
import toast from 'react-hot-toast';

export default function MesasPage() {
    const { mesas, loading, ocuparMesa, liberarMesa, refetch } = useMesas();
    const [toggling, setToggling] = useState<number | null>(null);

    const handleToggleMesa = async (mesaId: number, estadoActual: 'libre' | 'ocupada') => {
        setToggling(mesaId);
        try {
            if (estadoActual === 'libre') {
                await ocuparMesa(mesaId);
                toast.success('Mesa marcada como ocupada');
            } else {
                await liberarMesa(mesaId);
                toast.success('Mesa liberada');
            }
        } catch (error) {
            toast.error('Error al cambiar estado de mesa');
        } finally {
            setToggling(null);
        }
    };

    const mesasLibres = mesas.filter(m => m.estado === 'libre').length;
    const mesasOcupadas = mesas.filter(m => m.estado === 'ocupada').length;

    return (
        <div className="p-8 max-w-7xl mx-auto">
            {/* Header */}
            <div className="mb-8">
                <div className="flex items-center justify-between mb-4">
                    <div>
                        <h1 className="text-4xl font-bold text-pocholo-brown mb-2">
                            Gestión de Mesas
                        </h1>
                        <p className="text-pocholo-brown/60">
                            Visualiza y gestiona el estado de todas las mesas
                        </p>
                    </div>
                    <button
                        onClick={refetch}
                        className="p-3 hover:bg-pocholo-cream rounded-xl transition-colors"
                        title="Actualizar"
                    >
                        <RefreshCw size={24} className={loading ? 'animate-spin text-pocholo-red' : 'text-pocholo-brown'} />
                    </button>
                </div>

                {/* Estadísticas */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-white rounded-2xl p-6 shadow-lg border-2 border-pocholo-yellow/30"
                    >
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-pocholo-brown/60 mb-1">Total Mesas</p>
                                <p className="text-4xl font-bold text-pocholo-brown">{mesas.length}</p>
                            </div>
                            <div className="w-16 h-16 bg-pocholo-yellow/20 rounded-xl flex items-center justify-center">
                                <Users size={32} className="text-pocholo-brown" />
                            </div>
                        </div>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className="bg-white rounded-2xl p-6 shadow-lg border-2 border-green-500/30"
                    >
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-600 mb-1">Disponibles</p>
                                <p className="text-4xl font-bold text-green-600">{mesasLibres}</p>
                            </div>
                            <div className="w-16 h-16 bg-green-100 rounded-xl flex items-center justify-center">
                                <span className="text-3xl">✅</span>
                            </div>
                        </div>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className="bg-white rounded-2xl p-6 shadow-lg border-2 border-red-500/30"
                    >
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-600 mb-1">Ocupadas</p>
                                <p className="text-4xl font-bold text-red-600">{mesasOcupadas}</p>
                            </div>
                            <div className="w-16 h-16 bg-red-100 rounded-xl flex items-center justify-center">
                                <span className="text-3xl">🔴</span>
                            </div>
                        </div>
                    </motion.div>
                </div>
            </div>

            {/* Grid de Mesas */}
            {loading ? (
                <div className="flex justify-center py-20">
                    <Loader2 className="animate-spin text-pocholo-red" size={48} />
                </div>
            ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                    {mesas.map((mesa, index) => (
                        <motion.button
                            key={mesa.id}
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: index * 0.03 }}
                            onClick={() => handleToggleMesa(mesa.id, mesa.estado)}
                            disabled={toggling === mesa.id}
                            className={`
                                relative p-6 rounded-2xl shadow-lg transition-all duration-300
                                ${mesa.estado === 'libre'
                                    ? 'bg-gradient-to-br from-green-400 to-green-600 hover:from-green-500 hover:to-green-700'
                                    : 'bg-gradient-to-br from-red-400 to-red-600 hover:from-red-500 hover:to-red-700'
                                }
                                ${toggling === mesa.id ? 'opacity-50 cursor-wait' : 'hover:scale-105 active:scale-95'}
                                disabled:cursor-not-allowed
                            `}
                        >
                            {/* Indicador de estado */}
                            <div className="absolute top-2 right-2">
                                <div className={`w-3 h-3 rounded-full ${mesa.estado === 'libre' ? 'bg-white' : 'bg-yellow-300'} animate-pulse`} />
                            </div>

                            {/* Icono de mesa */}
                            <div className="mb-3">
                                <Users size={32} className="text-white mx-auto" />
                            </div>

                            {/* Número de mesa */}
                            <div className="text-center">
                                <p className="text-2xl font-bold text-white mb-1">
                                    Mesa {mesa.numero}
                                </p>
                                <p className="text-xs text-white/80 font-semibold uppercase tracking-wider">
                                    {mesa.estado}
                                </p>
                            </div>

                            {/* Loader cuando está cambiando */}
                            {toggling === mesa.id && (
                                <div className="absolute inset-0 flex items-center justify-center bg-black/20 rounded-2xl">
                                    <Loader2 className="animate-spin text-white" size={32} />
                                </div>
                            )}
                        </motion.button>
                    ))}
                </div>
            )}

            {/* Instrucciones */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="mt-8 p-6 bg-pocholo-cream/50 rounded-2xl border-2 border-pocholo-yellow/30"
            >
                <p className="text-center text-pocholo-brown">
                    <span className="font-semibold">💡 Tip:</span> Click en cualquier mesa para cambiar su estado entre libre y ocupada
                </p>
            </motion.div>
        </div>
    );
}
