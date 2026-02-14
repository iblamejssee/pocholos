'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Check, Loader2, RefreshCw } from 'lucide-react';
import { supabase, obtenerFechaHoy } from '@/lib/supabase';
import toast from 'react-hot-toast';
import type { BebidasDetalle } from '@/lib/database.types';
import ProtectedRoute from '@/components/ProtectedRoute';
import { motion } from 'framer-motion';

// Configuración de marcas con sus tamaños reales en Perú
const MARCAS_CONFIG = [
    {
        key: 'inca_kola',
        name: 'Inca Kola',
        dot: 'bg-yellow-500',
        sizes: [
            { key: 'personal_retornable', label: 'Personal Ret.', desc: '296ml' },
            { key: 'descartable', label: 'Descartable', desc: '600ml' },
            { key: 'gordita', label: 'Gordita', desc: '625ml' },
            { key: 'litro', label: '1 Litro', desc: '1L' },
            { key: 'litro_medio', label: '1.5 Litros', desc: '1.5L' },
            { key: 'tres_litros', label: '3 Litros', desc: '3L' },
        ],
    },
    {
        key: 'coca_cola',
        name: 'Coca Cola',
        dot: 'bg-red-600',
        sizes: [
            { key: 'personal_retornable', label: 'Personal Ret.', desc: '296ml' },
            { key: 'descartable', label: 'Descartable', desc: '600ml' },
            { key: 'gordita', label: 'Gordita', desc: '625ml' },
            { key: 'litro', label: '1 Litro', desc: '1L' },
            { key: 'litro_medio', label: '1.5 Litros', desc: '1.5L' },
            { key: 'tres_litros', label: '3 Litros', desc: '3L' },
        ],
    },
    {
        key: 'sprite',
        name: 'Sprite',
        dot: 'bg-green-600',
        sizes: [
            { key: 'descartable', label: 'Personal', desc: '500ml' },
            { key: 'litro_medio', label: '1.5 Litros', desc: '1.5L' },
            { key: 'tres_litros', label: '3 Litros', desc: '3L' },
        ],
    },
    {
        key: 'fanta',
        name: 'Fanta',
        dot: 'bg-orange-500',
        sizes: [
            { key: 'descartable', label: 'Personal', desc: '500ml' },
            { key: 'mediana', label: '2.25 Litros', desc: '2.25L' },
            { key: 'tres_litros', label: '3 Litros', desc: '3L' },
        ],
    },
    {
        key: 'agua_mineral',
        name: 'Agua Mineral',
        dot: 'bg-sky-400',
        sizes: [
            { key: 'personal', label: 'Personal', desc: '600ml' },
            { key: 'grande', label: 'Grande', desc: '2.5L' },
        ],
    },
] as const;



export default function AperturaPage() {
    return (
        <ProtectedRoute>
            <AperturaContent />
        </ProtectedRoute>
    );
}

function AperturaContent() {
    const router = useRouter();
    const [pollosEnteros, setPollosEnteros] = useState('');
    const [papasIniciales, setPapasIniciales] = useState('');
    const [dineroInicial, setDineroInicial] = useState('');
    const [loading, setLoading] = useState(false);
    const [loadingPrevious, setLoadingPrevious] = useState(true);
    const [previousDayLoaded, setPreviousDayLoaded] = useState(false);

    // Detailed beverage state
    const [bebidasDetalle, setBebidasDetalle] = useState<BebidasDetalle>({
        inca_kola: { personal_retornable: 0, descartable: 0, gordita: 0, litro: 0, litro_medio: 0, tres_litros: 0 },
        coca_cola: { personal_retornable: 0, descartable: 0, gordita: 0, litro: 0, litro_medio: 0, tres_litros: 0 },
        sprite: { descartable: 0, litro_medio: 0, tres_litros: 0 },
        fanta: { descartable: 0, mediana: 0, tres_litros: 0 },
        agua_mineral: { personal: 0, grande: 0 },
    });
    const [expandedBrands, setExpandedBrands] = useState<Set<string>>(new Set());

    // Cargar stock del día anterior al montar
    useEffect(() => {
        loadPreviousDayStock();
    }, []);

    const loadPreviousDayStock = async () => {
        setLoadingPrevious(true);
        try {
            const { data } = await supabase
                .from('inventario_diario')
                .select('bebidas_detalle')
                .eq('estado', 'cerrado')
                .not('bebidas_detalle', 'is', null) // Asegurar que tenga detalle
                .order('fecha', { ascending: false })
                .limit(1)
                .single();

            if (data) {
                if (data.bebidas_detalle) {
                    setBebidasDetalle(data.bebidas_detalle as BebidasDetalle);
                }
                // Si hay stock de gaseosas disponible, lo usamos como base, pero el detalle es la fuente de verdad.
                // El usuario pidió que se cargue solo una vez y se guarde para el día siguiente.
                // Al cargar el detalle del cierre anterior, ya estamos cumpliendo esto.
                // Solo falta confirmar que esto se guarde como "stock inicial" del nuevo día.
                // En `handleGuardarApertura` se usa `bebidasDetalle` para init.

                setPreviousDayLoaded(true);
                toast.success('Stock de bebidas del día anterior cargado automáticamente (Continuidad)', { icon: '📦' });
            }
        } catch {
            console.log('No se encontró stock previo de bebidas');
        } finally {
            setLoadingPrevious(false);
        }
    };

    const updateBeverage = (brand: keyof BebidasDetalle, size: string, value: string) => {
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

    // Efecto para actualizar el total visual si se carga el detalle
    // No necesitamos state extra, usamos la función en el render.

    const resetBeverages = () => {
        setBebidasDetalle({
            inca_kola: { personal_retornable: 0, descartable: 0, gordita: 0, litro: 0, litro_medio: 0, tres_litros: 0 },
            coca_cola: { personal_retornable: 0, descartable: 0, gordita: 0, litro: 0, litro_medio: 0, tres_litros: 0 },
            sprite: { descartable: 0, litro_medio: 0, tres_litros: 0 },
            fanta: { descartable: 0, mediana: 0, tres_litros: 0 },
            agua_mineral: { personal: 0, grande: 0 },
        });
        setPreviousDayLoaded(false);
        toast.success('Stock de bebidas reiniciado');
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        const pollos = parseFloat(pollosEnteros);
        const papas = parseFloat(papasIniciales) || 0;
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
                // Permitir sobrescribir si el usuario confirma (o implícitamente al enviar de nuevo)
                // Para simplificar UX, haremos un UPDATE si ya existe
                const { error: updateError } = await supabase
                    .from('inventario_diario')
                    .update({
                        pollos_enteros: pollos,
                        papas_iniciales: papas,
                        gaseosas: totalBebidas,
                        dinero_inicial: parseFloat(dineroInicial) || 0,
                        bebidas_detalle: bebidasDetalle,
                        // No tocamos la fecha ni el id
                    })
                    .eq('fecha', fechaHoy);

                if (updateError) throw updateError;

                toast.success(
                    `¡Apertura ACTUALIZADA!\nDatos corregidos para el día de hoy.`,
                    { duration: 4000, icon: '🔄' }
                );

                setTimeout(() => {
                    router.push('/');
                }, 1500);
                return;
            }

            // Insertar nueva apertura
            const { error } = await supabase
                .from('inventario_diario')
                .insert({
                    fecha: fechaHoy,
                    pollos_enteros: pollos,
                    papas_iniciales: papas,
                    gaseosas: totalBebidas,
                    dinero_inicial: parseFloat(dineroInicial) || 0,
                    bebidas_detalle: bebidasDetalle,
                })
                .select()
                .single();

            if (error) throw error;

            toast.success(
                `¡Día iniciado exitosamente!\nPollos: ${pollos} | Papas: ${papas}kg | Bebidas: ${totalBebidas}`,
                { duration: 3000, icon: '✅' }
            );

            setTimeout(() => {
                router.push('/');
            }, 1500);

        } catch (error: unknown) {
            console.error('Error al guardar apertura:', error);
            const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
            toast.error(`Error al iniciar el día: ${errorMessage}`, { duration: 5000 });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-3 sm:p-4 md:p-8 max-w-6xl mx-auto pb-32">
            <div className="mb-4 sm:mb-8">
                <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-pocholo-brown mb-2">
                    Apertura del Día
                </h1>
                <p className="text-sm sm:text-base text-pocholo-brown/70">
                    Registra el stock inicial para comenzar
                </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                {/* Pollos Enteros y Papas */}
                <div className="grid md:grid-cols-2 gap-6">
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

                    {/* Papas (KG) */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.05 }}
                        className="bg-white rounded-2xl shadow-lg p-6 border-l-4 border-amber-500"
                    >
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-14 h-14 bg-amber-100 rounded-xl flex items-center justify-center">
                                <span className="text-3xl">🥔</span>
                            </div>
                            <div>
                                <h2 className="text-xl font-bold text-pocholo-brown">Papas (Kg)</h2>
                                <p className="text-sm text-pocholo-brown/60">Kilos de papa pelada</p>
                            </div>
                        </div>
                        <div className="relative">
                            <input
                                type="number"
                                min="0"
                                step="0.1"
                                value={papasIniciales}
                                onChange={(e) => setPapasIniciales(e.target.value)}
                                placeholder="0.0"
                                disabled={loading}
                                className="w-full px-6 py-4 text-3xl font-bold text-pocholo-brown bg-pocholo-cream/30 border-2 border-pocholo-brown/10 rounded-xl focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition-all"
                            />
                            <span className="absolute right-6 top-1/2 -translate-y-1/2 text-pocholo-brown/40 font-bold">Kg</span>
                        </div>
                    </motion.div>
                </div>

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
                            {/* Marcas como acordeón — click para expandir */}
                            <div className="space-y-1">
                                {MARCAS_CONFIG.map((marca) => {
                                    const brandData = bebidasDetalle[marca.key as keyof BebidasDetalle] as Record<string, number> | undefined;
                                    const brandTotal = marca.sizes.reduce((sum, s) => sum + ((brandData?.[s.key]) || 0), 0);
                                    const isOpen = expandedBrands.has(marca.key);
                                    const toggleBrand = () => {
                                        setExpandedBrands(prev => {
                                            const next = new Set(prev);
                                            if (next.has(marca.key)) next.delete(marca.key);
                                            else next.add(marca.key);
                                            return next;
                                        });
                                    };
                                    return (
                                        <div key={marca.key} className="border border-slate-200 rounded-lg overflow-hidden">
                                            {/* Header de marca — clickeable */}
                                            <button
                                                type="button"
                                                onClick={toggleBrand}
                                                className="w-full flex items-center gap-3 px-4 py-3 bg-white hover:bg-slate-50 transition-colors"
                                            >
                                                <span className={`w-3 h-3 rounded-full shrink-0 ${marca.dot}`}></span>
                                                <span className="text-sm font-bold text-slate-800 flex-1 text-left">{marca.name}</span>
                                                <span className={`text-sm font-semibold ${brandTotal > 0 ? 'text-slate-600' : 'text-slate-400'}`}>{brandTotal} und.</span>
                                                <span className="text-slate-400 text-xs ml-1">{isOpen ? '▲' : '▼'}</span>
                                            </button>
                                            {/* Panel expandible con tamaños */}
                                            {isOpen && (
                                                <div className="px-4 py-3 bg-slate-50 border-t border-slate-100 space-y-2">
                                                    {marca.sizes.map((size) => {
                                                        const val = (brandData?.[size.key]) || 0;
                                                        return (
                                                            <div key={size.key} className="flex items-center gap-3">
                                                                <div className="flex-1 min-w-0">
                                                                    <span className="text-sm text-slate-700">{size.label}</span>
                                                                    <span className="text-[10px] text-slate-400 ml-1.5">{size.desc}</span>
                                                                </div>
                                                                <input
                                                                    type="number"
                                                                    inputMode="numeric"
                                                                    min="0"
                                                                    value={val === 0 ? '' : val}
                                                                    placeholder="0"
                                                                    onChange={(e) => updateBeverage(marca.key as keyof BebidasDetalle, size.key, e.target.value)}
                                                                    onFocus={(e) => e.target.select()}
                                                                    className="w-20 px-2 py-2 text-center text-sm font-semibold text-slate-800 bg-white border border-slate-200 rounded-md transition-all focus:outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-300 hover:border-slate-300 placeholder:text-slate-300"
                                                                />
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
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
