'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Check, Drumstick, Loader2, RefreshCw } from 'lucide-react';
import { supabase, obtenerFechaHoy } from '@/lib/supabase';
import toast from 'react-hot-toast';
import type { BebidasDetalle } from '@/lib/database.types';
import { motion } from 'framer-motion';
import Image from 'next/image';

// Marcas de gaseosas
const MARCAS = ['inca_kola', 'coca_cola', 'sprite', 'fanta'] as const;
type MarcaGaseosa = typeof MARCAS[number];

// Tamaños disponibles para gaseosas
const TAMANOS_GASEOSA = [
    { key: 'personal_retornable', label: 'Personal Ret.', desc: '350ml' },
    { key: 'descartable', label: 'Descartable', desc: '500ml' },
    { key: 'gordita', label: 'Gordita', desc: '625ml' },
    { key: 'litro', label: '1 Litro', desc: '1L' },
    { key: 'litro_medio', label: '1.5 Litros', desc: '1.5L' },
    { key: 'tres_litros', label: '3 Litros', desc: '3L' },
];

// Configuración de marcas con colores
const MARCA_CONFIG: Record<MarcaGaseosa, { name: string; color: string; bgColor: string; borderColor: string }> = {
    inca_kola: { name: 'Inca Kola', color: 'text-yellow-700', bgColor: 'bg-yellow-50', borderColor: 'border-yellow-300' },
    coca_cola: { name: 'Coca Cola', color: 'text-red-700', bgColor: 'bg-red-50', borderColor: 'border-red-300' },
    sprite: { name: 'Sprite', color: 'text-green-700', bgColor: 'bg-green-50', borderColor: 'border-green-300' },
    fanta: { name: 'Fanta', color: 'text-orange-700', bgColor: 'bg-orange-50', borderColor: 'border-orange-300' },
};

export default function AperturaPage() {
    const router = useRouter();
    const [pollosEnteros, setPollosEnteros] = useState('');
    const [dineroInicial, setDineroInicial] = useState('');
    const [loading, setLoading] = useState(false);
    const [loadingPrevious, setLoadingPrevious] = useState(true);
    const [previousDayLoaded, setPreviousDayLoaded] = useState(false);

    // Detailed beverage state
    const [bebidasDetalle, setBebidasDetalle] = useState<BebidasDetalle>({
        inca_kola: { personal_retornable: 0, descartable: 0, gordita: 0, litro: 0, litro_medio: 0, tres_litros: 0 },
        coca_cola: { personal_retornable: 0, descartable: 0, gordita: 0, litro: 0, litro_medio: 0, tres_litros: 0 },
        sprite: { personal_retornable: 0, descartable: 0, gordita: 0, litro: 0, litro_medio: 0, tres_litros: 0 },
        fanta: { personal_retornable: 0, descartable: 0, gordita: 0, litro: 0, litro_medio: 0, tres_litros: 0 },
        chicha: { litro: 0, medio_litro: 0 }
    });

    // Cargar stock del día anterior al montar
    useEffect(() => {
        loadPreviousDayStock();
    }, []);

    const loadPreviousDayStock = async () => {
        setLoadingPrevious(true);
        try {
            // Buscar el último inventario cerrado
            const { data, error } = await supabase
                .from('inventario_diario')
                .select('bebidas_detalle, gaseosas_disponibles')
                .eq('estado', 'cerrado')
                .order('fecha', { ascending: false })
                .limit(1)
                .single();

            if (data && data.bebidas_detalle) {
                setBebidasDetalle(data.bebidas_detalle as BebidasDetalle);
                setPreviousDayLoaded(true);
                toast.success('Stock de bebidas del día anterior cargado', { icon: '📦' });
            }
        } catch (error) {
            // No hay día anterior o error, usar valores vacíos
            console.log('No se encontró stock previo de bebidas');
        } finally {
            setLoadingPrevious(false);
        }
    };

    const updateBeverage = (brand: keyof BebidasDetalle, size: string, value: string) => {
        // Permitir vacío para facilitar edición
        const numValue = value === '' ? 0 : parseInt(value) || 0;
        setBebidasDetalle(prev => ({
            ...prev,
            [brand]: {
                ...prev[brand],
                [size]: numValue
            }
        }));
    };

    const calculateTotalBeverages = (): number => {
        let total = 0;
        Object.values(bebidasDetalle).forEach(brand => {
            if (brand) {
                Object.values(brand).forEach(qty => {
                    total += (qty as number) || 0;
                });
            }
        });
        return total;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        const pollos = parseFloat(pollosEnteros);
        const totalBebidas = calculateTotalBeverages();

        if (isNaN(pollos) || pollos < 0) {
            toast.error('La cantidad de pollos debe ser un número válido');
            return;
        }

        setLoading(true);

        try {
            const fechaHoy = obtenerFechaHoy();

            // Verificar si ya existe apertura para hoy
            const { data: existente } = await supabase
                .from('inventario_diario')
                .select('*')
                .eq('fecha', fechaHoy)
                .single();

            if (existente) {
                toast.error('Ya se realizó la apertura del día de hoy', { duration: 4000 });
                setLoading(false);
                return;
            }

            // Insertar nueva apertura
            const { error } = await supabase
                .from('inventario_diario')
                .insert({
                    fecha: fechaHoy,
                    pollos_enteros: pollos,
                    gaseosas: totalBebidas,
                    dinero_inicial: parseFloat(dineroInicial) || 0,
                    bebidas_detalle: bebidasDetalle,
                })
                .select()
                .single();

            if (error) throw error;

            toast.success(
                `¡Día iniciado exitosamente!\nPollos: ${pollos} | Bebidas: ${totalBebidas}`,
                { duration: 3000, icon: '✅' }
            );

            setTimeout(() => {
                router.push('/');
            }, 1500);

        } catch (error: any) {
            console.error('Error al guardar apertura:', error);
            toast.error(`Error al iniciar el día: ${error.message || 'Error desconocido'}`, { duration: 5000 });
        } finally {
            setLoading(false);
        }
    };

    const resetBeverages = () => {
        setBebidasDetalle({
            inca_kola: { personal_retornable: 0, descartable: 0, gordita: 0, litro: 0, litro_medio: 0, tres_litros: 0 },
            coca_cola: { personal_retornable: 0, descartable: 0, gordita: 0, litro: 0, litro_medio: 0, tres_litros: 0 },
            sprite: { personal_retornable: 0, descartable: 0, gordita: 0, litro: 0, litro_medio: 0, tres_litros: 0 },
            fanta: { personal_retornable: 0, descartable: 0, gordita: 0, litro: 0, litro_medio: 0, tres_litros: 0 },
            chicha: { litro: 0, medio_litro: 0 }
        });
        setPreviousDayLoaded(false);
        toast.success('Stock de bebidas reiniciado');
    };

    return (
        <div className="p-4 md:p-8 max-w-6xl mx-auto pb-32">
            <div className="mb-8">
                <h1 className="text-3xl md:text-4xl font-bold text-pocholo-brown mb-2">
                    Apertura del Día
                </h1>
                <p className="text-pocholo-brown/70">
                    Registra el stock inicial para comenzar
                </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                {/* Pollos Enteros */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white rounded-2xl shadow-lg p-6 border-l-4 border-pocholo-red"
                >
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-14 h-14 rounded-xl flex items-center justify-center overflow-hidden">
                            <img
                                src="/images/pollo-brasa.png"
                                alt="Pollo a la Brasa"
                                className="w-14 h-14 object-contain"
                            />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-pocholo-brown">Pollos Enteros</h2>
                            <p className="text-sm text-pocholo-brown/60">Cantidad de pollos para hoy</p>
                        </div>
                    </div>
                    <input
                        type="number"
                        min="0"
                        step="0.125"
                        value={pollosEnteros}
                        onChange={(e) => setPollosEnteros(e.target.value)}
                        placeholder="0"
                        disabled={loading}
                        className="w-full px-6 py-4 text-3xl font-bold text-pocholo-brown bg-pocholo-cream/30 border-2 border-pocholo-brown/10 rounded-xl focus:outline-none focus:border-pocholo-red focus:ring-2 focus:ring-pocholo-red/20 transition-all"
                        required
                    />
                </motion.div>

                {/* Bebidas - Grid Compacto */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="bg-white rounded-2xl shadow-lg p-6 border-l-4 border-blue-500"
                >
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                                <span className="text-2xl">🧊</span>
                            </div>
                            <div>
                                <h2 className="text-xl font-bold text-pocholo-brown">Bebidas</h2>
                                <p className="text-sm text-pocholo-brown/60">
                                    Total: <span className="font-bold text-blue-600">{calculateTotalBeverages()}</span> unidades
                                    {previousDayLoaded && <span className="ml-2 text-green-600">✓ Del día anterior</span>}
                                </p>
                            </div>
                        </div>
                        <button
                            type="button"
                            onClick={resetBeverages}
                            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                            title="Reiniciar a cero"
                        >
                            <RefreshCw size={18} />
                        </button>
                    </div>

                    {loadingPrevious ? (
                        <div className="text-center py-8 text-pocholo-brown/50">
                            <Loader2 className="animate-spin mx-auto mb-2" />
                            Cargando stock anterior...
                        </div>
                    ) : (
                        <>
                            {/* Header de marcas */}
                            <div className="grid grid-cols-5 gap-2 mb-3">
                                <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">Tamaño</div>
                                {MARCAS.map(marca => (
                                    <div
                                        key={marca}
                                        className={`text-center py-2 px-1 rounded-lg ${MARCA_CONFIG[marca].bgColor} ${MARCA_CONFIG[marca].color} font-bold text-xs`}
                                    >
                                        {MARCA_CONFIG[marca].name.split(' ')[0]}
                                    </div>
                                ))}
                            </div>

                            {/* Filas de tamaños - MÁS GRANDES PARA TOUCH */}
                            <div className="space-y-3">
                                {TAMANOS_GASEOSA.map(tamano => (
                                    <div key={tamano.key} className="grid grid-cols-5 gap-2 items-center">
                                        <div className="text-sm text-pocholo-brown">
                                            <span className="font-medium">{tamano.label}</span>
                                            <span className="text-xs text-gray-400 ml-1 hidden md:inline">{tamano.desc}</span>
                                        </div>
                                        {MARCAS.map(marca => {
                                            const val = bebidasDetalle[marca]?.[tamano.key as keyof typeof bebidasDetalle[typeof marca]] || 0;
                                            return (
                                                <input
                                                    key={`${marca}-${tamano.key}`}
                                                    type="number"
                                                    inputMode="numeric"
                                                    min="0"
                                                    value={val === 0 ? '' : val}
                                                    placeholder="0"
                                                    onChange={(e) => updateBeverage(marca, tamano.key, e.target.value)}
                                                    onFocus={(e) => e.target.select()}
                                                    className={`w-full px-2 py-3 text-center text-lg font-bold border-2 rounded-xl transition-all focus:outline-none focus:ring-2 focus:scale-105 ${MARCA_CONFIG[marca].borderColor} ${MARCA_CONFIG[marca].bgColor}`}
                                                />
                                            );
                                        })}
                                    </div>
                                ))}
                            </div>

                            {/* Chicha Morada - Separada */}
                            <div className="mt-6 pt-4 border-t border-gray-200">
                                <div className="flex items-center gap-3 mb-3">
                                    <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                                        <span className="text-lg">🟣</span>
                                    </div>
                                    <span className="font-bold text-pocholo-brown">Chicha Morada</span>
                                </div>
                                <div className="grid grid-cols-2 gap-4 max-w-sm">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-600 mb-2">1 Litro</label>
                                        <input
                                            type="number"
                                            inputMode="numeric"
                                            min="0"
                                            value={(bebidasDetalle.chicha?.litro || 0) === 0 ? '' : bebidasDetalle.chicha?.litro}
                                            placeholder="0"
                                            onChange={(e) => updateBeverage('chicha', 'litro', e.target.value)}
                                            onFocus={(e) => e.target.select()}
                                            className="w-full px-4 py-3 text-center text-xl font-bold border-2 border-purple-300 bg-purple-50 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-300 focus:scale-105 transition-all"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-600 mb-2">½ Litro</label>
                                        <input
                                            type="number"
                                            inputMode="numeric"
                                            min="0"
                                            value={(bebidasDetalle.chicha?.medio_litro || 0) === 0 ? '' : bebidasDetalle.chicha?.medio_litro}
                                            placeholder="0"
                                            onChange={(e) => updateBeverage('chicha', 'medio_litro', e.target.value)}
                                            onFocus={(e) => e.target.select()}
                                            className="w-full px-4 py-3 text-center text-xl font-bold border-2 border-purple-300 bg-purple-50 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-300 focus:scale-105 transition-all"
                                        />
                                    </div>
                                </div>
                            </div>
                        </>
                    )}
                </motion.div>

                {/* Caja Chica */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="bg-white rounded-2xl shadow-lg p-6 border-l-4 border-green-500"
                >
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                            <span className="text-2xl">💵</span>
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-pocholo-brown">Caja Chica</h2>
                            <p className="text-sm text-pocholo-brown/60">Dinero inicial en caja</p>
                        </div>
                    </div>
                    <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-2xl text-pocholo-brown/50">S/</span>
                        <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={dineroInicial}
                            onChange={(e) => setDineroInicial(e.target.value)}
                            placeholder="0.00"
                            disabled={loading}
                            className="w-full pl-14 pr-6 py-4 text-3xl font-bold text-pocholo-brown bg-pocholo-cream/30 border-2 border-pocholo-brown/10 rounded-xl focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/20 transition-all"
                        />
                    </div>
                </motion.div>

                {/* Botón Submit */}
                <motion.button
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    type="submit"
                    disabled={loading || loadingPrevious}
                    className="w-full py-5 bg-gradient-to-r from-pocholo-red to-red-600 text-white font-bold text-xl rounded-2xl shadow-lg hover:shadow-xl active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
                >
                    {loading ? (
                        <>
                            <Loader2 size={24} className="animate-spin" />
                            Guardando...
                        </>
                    ) : (
                        <>
                            <Check size={24} />
                            Iniciar Día
                        </>
                    )}
                </motion.button>
            </form>
        </div>
    );
}
