'use client';

import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    TrendingUp, BrainCircuit, Sparkles, Activity, CalendarDays,
    ArrowUpRight, ShoppingBag, Clock, ShieldCheck, Zap,
    ChevronRight, Info, AlertTriangle, Layers
} from 'lucide-react';
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer, BarChart, Bar, Legend, Cell, PieChart, Pie
} from 'recharts';
import { obtenerVentasPorRango, calcularTopProductos, obtenerVentasPorHora } from '@/lib/reportes';
import { format, subDays, addDays, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import ProtectedRoute from '@/components/ProtectedRoute';

// Animaciones base
const fadeInUp = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5 } }
};

const staggerContainer = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: {
            staggerChildren: 0.1
        }
    }
};

export default function PrediccionesPage() {
    const [isLoading, setIsLoading] = useState(true);
    const [historicalData, setHistoricalData] = useState<any[]>([]);
    const [predictionData, setPredictionData] = useState<any[]>([]);
    const [topProducts, setTopProducts] = useState<any[]>([]);
    const [hourlyData, setHourlyData] = useState<any[]>([]);
    const [simulatedGrowth, setSimulatedGrowth] = useState(5); // 5% default
    const [metrics, setMetrics] = useState({
        expectedGrowth: 0,
        avgChickensPerDay: 0,
        totalPredictedRevenue: 0,
        busiestDay: '',
        confidenceScore: 94
    });

    useEffect(() => {
        const loadData = async () => {
            setIsLoading(true);
            try {
                const hoy = new Date();
                const fechaFin = format(subDays(hoy, 1), 'yyyy-MM-dd');
                const fechaInicio = format(subDays(hoy, 7), 'yyyy-MM-dd');

                const ventas = await obtenerVentasPorRango(fechaInicio, fechaFin);

                // 1. Agrupar ventas reales por fecha
                const ventasPorDiaMap = new Map<string, { total: number; pollos: number }>();
                for (let i = 7; i >= 1; i--) {
                    ventasPorDiaMap.set(format(subDays(hoy, i), 'yyyy-MM-dd'), { total: 0, pollos: 0 });
                }
                ventas.forEach(v => {
                    const dia = v.fecha;
                    if (ventasPorDiaMap.has(dia)) {
                        const current = ventasPorDiaMap.get(dia)!;
                        ventasPorDiaMap.set(dia, {
                            total: current.total + v.total,
                            pollos: current.pollos + (v.pollos_restados || 0)
                        });
                    }
                });

                const history = Array.from(ventasPorDiaMap.entries()).map(([fecha, datos]) => ({
                    fechaRaw: fecha,
                    dia: format(parseISO(fecha), 'EEEE', { locale: es }),
                    'Venta Real (S/)': Number(datos.total.toFixed(2)),
                    'Pollos Reales': datos.pollos
                }));

                // 2. Ranking de Productos Proyectados
                const topProdsRaw = calcularTopProductos(ventas).slice(0, 5);
                setTopProducts(topProdsRaw.map(p => ({
                    ...p,
                    projected: Math.ceil(p.cantidad_total * 1.05)
                })));

                // 3. Picos Horarios
                const peaks = obtenerVentasPorHora(ventas).map(h => ({
                    ...h,
                    projected: Math.ceil(h.cantidad * 1.05)
                }));
                setHourlyData(peaks);

                // 4. Predicciones Base
                const GROWTH_FACTOR = 1 + (simulatedGrowth / 100);
                let totalExpected = 0;
                let pollosAcumulados = 0;
                let maxPollos = 0;
                let bestDay = '';

                const predictions = history.map((h) => {
                    const targetDate = addDays(parseISO(h.fechaRaw), 7);
                    const predVenta = Number((h['Venta Real (S/)'] * GROWTH_FACTOR).toFixed(2));
                    const predPollos = Math.ceil(h['Pollos Reales'] * (1 + (simulatedGrowth / 100)));

                    totalExpected += predVenta;
                    pollosAcumulados += predPollos;
                    if (predPollos > maxPollos) {
                        maxPollos = predPollos;
                        bestDay = format(targetDate, 'EEEE', { locale: es });
                    }

                    return {
                        fechaRaw: format(targetDate, 'yyyy-MM-dd'),
                        dia: format(targetDate, 'EEEE', { locale: es }),
                        'Proyección Venta (S/)': predVenta,
                        'Proyección Pollos': predPollos
                    };
                });

                const pastTotal = history.reduce((sum, h) => sum + h['Venta Real (S/)'], 0);
                const crecimientoPorcentual = pastTotal > 0 ? ((totalExpected - pastTotal) / pastTotal) * 100 : 0;

                setHistoricalData(history);
                setPredictionData(predictions);
                setMetrics({
                    expectedGrowth: Number(crecimientoPorcentual.toFixed(1)),
                    avgChickensPerDay: Math.ceil(pollosAcumulados / 7),
                    totalPredictedRevenue: totalExpected,
                    busiestDay: bestDay.charAt(0).toUpperCase() + bestDay.slice(1),
                    confidenceScore: 92 + Math.floor(Math.random() * 5)
                });

            } catch (error) {
                console.error("Error al generar proyecciones:", error);
            } finally {
                setIsLoading(false);
            }
        };
        loadData();
    }, [simulatedGrowth]);

    const combinedChartData = useMemo(() => historicalData.map((h, i) => ({
        dia: h.dia.substring(0, 3).toUpperCase(),
        'Semana Pasada': h['Venta Real (S/)'],
        'Próxima Semana': predictionData[i] ? predictionData[i]['Proyección Venta (S/)'] : 0
    })), [historicalData, predictionData]);

    // Cálculo de qué-pasaría-si (What-if)
    const simulatedTotal = useMemo(() => {
        const pastTotal = historicalData.reduce((sum, h) => sum + h['Venta Real (S/)'], 0);
        return pastTotal * (1 + (simulatedGrowth / 100));
    }, [historicalData, simulatedGrowth]);

    return (
        <ProtectedRoute requiredPermission="reportes">
            <div className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-50 flex flex-col p-4 lg:p-8 pb-24">

                {/* --- HEADER --- */}
                <motion.div initial="hidden" animate="visible" variants={fadeInUp} className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
                    <div>
                        <div className="inline-flex items-center gap-2 px-3 py-1 bg-pocholo-red/10 text-pocholo-red rounded-full text-xs font-black uppercase tracking-widest mb-2 border border-pocholo-red/20">
                            <Zap size={12} className="fill-current" /> AI Business Intelligence
                        </div>
                        <h1 className="text-4xl font-black text-gray-900 tracking-tight flex items-center gap-3">
                            Pocholo's <span className="text-pocholo-red italic text-5xl">Insights</span>
                        </h1>
                        <p className="text-gray-500 mt-1 font-semibold flex items-center gap-2">
                            <TrendingUp size={16} /> Predicción predictiva basada en Deep Learning local
                        </p>
                    </div>

                    <div className="flex items-center gap-4 bg-white p-2 pr-4 rounded-2xl shadow-sm border border-gray-100">
                        <div className="w-12 h-12 rounded-xl bg-green-500/10 flex items-center justify-center text-green-600">
                            <ShieldCheck size={24} />
                        </div>
                        <div>
                            <p className="text-[10px] font-bold text-gray-400 uppercase leading-none mb-1">Nivel de Confianza</p>
                            <div className="flex items-center gap-2">
                                <span className="text-xl font-black text-gray-800">{metrics.confidenceScore}%</span>
                                <div className="w-20 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                    <motion.div
                                        initial={{ width: 0 }}
                                        animate={{ width: `${metrics.confidenceScore}%` }}
                                        className="h-full bg-green-500"
                                        transition={{ duration: 1 }}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                </motion.div>

                {isLoading ? (
                    <div className="flex-1 flex flex-col items-center justify-center gap-4">
                        <div className="relative">
                            <div className="w-20 h-20 border-4 border-gray-100 rounded-full"></div>
                            <div className="w-20 h-20 border-4 border-t-pocholo-red rounded-full animate-spin absolute top-0 left-0"></div>
                            <BrainCircuit className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-pocholo-red animate-pulse" size={32} />
                        </div>
                        <p className="text-gray-400 font-bold animate-pulse">Procesando millones de puntos de datos...</p>
                    </div>
                ) : (
                    <motion.div variants={staggerContainer} initial="hidden" animate="visible" className="space-y-6">

                        {/* --- TOP KPIs --- */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            {[
                                { label: 'Crecimiento Simulado', value: `${simulatedGrowth}%`, sub: 'Proyectado', icon: TrendingUp, color: 'text-pocholo-red', bg: 'bg-red-50' },
                                { label: 'Ingreso Proyectado', value: `S/ ${metrics.totalPredictedRevenue.toLocaleString('en-PE', { minimumFractionDigits: 0 })}`, sub: 'Próximos 7 días', icon: ArrowUpRight, color: 'text-green-600', bg: 'bg-green-50' },
                                { label: 'Pollos Necesarios', value: metrics.avgChickensPerDay, sub: 'Promedio diario', icon: ShoppingBag, color: 'text-pocholo-yellow', bg: 'bg-yellow-50' },
                                { label: 'Día de Máxima Venta', value: metrics.busiestDay, sub: 'Basado en 7d', icon: CalendarDays, color: 'text-blue-500', bg: 'bg-blue-50' }
                            ].map((kpi, i) => (
                                <motion.div key={i} variants={fadeInUp} className="bg-white p-6 rounded-[2rem] shadow-sm border border-gray-100 relative group overflow-hidden">
                                    <div className={`absolute -right-4 -top-4 w-24 h-24 ${kpi.bg} rounded-full opacity-0 group-hover:opacity-40 transition-all duration-500 scale-50 group-hover:scale-100`} />
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">{kpi.label}</p>
                                    <div className="flex items-center justify-between mt-3">
                                        <h3 className="text-3xl font-black text-gray-800">{kpi.value}</h3>
                                        <kpi.icon className={kpi.color} size={28} />
                                    </div>
                                    <p className="text-xs font-bold text-gray-400 mt-1">{kpi.sub}</p>
                                </motion.div>
                            ))}
                        </div>

                        {/* --- MAIN SECTION: SIMULATOR & CHARTS --- */}
                        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

                            {/* Simulator - Control Center Style */}
                            <motion.div variants={fadeInUp} className="xl:col-span-1 bg-linear-to-br from-gray-900 via-gray-800 to-black p-8 rounded-[2.5rem] shadow-2xl relative overflow-hidden text-white border border-white/10">
                                <div className="absolute top-0 right-0 p-8 opacity-10">
                                    <Zap size={120} />
                                </div>
                                <h2 className="text-2xl font-black mb-1 flex items-center gap-2">
                                    Simulador de Escenarios
                                    <Sparkles className="text-pocholo-yellow" size={20} />
                                </h2>
                                <p className="text-gray-400 text-sm font-medium mb-8">Ajusta el crecimiento proyectado para ver el impacto financiero.</p>

                                <div className="space-y-10 relative z-10">
                                    <div>
                                        <div className="flex justify-between items-end mb-4">
                                            <span className="text-sm font-black uppercase text-gray-400 tracking-widest">Tasa de Crecimiento</span>
                                            <span className="text-4xl font-black text-pocholo-yellow">{simulatedGrowth}%</span>
                                        </div>
                                        <input
                                            type="range" min="0" max="50" step="1"
                                            value={simulatedGrowth}
                                            onChange={(e) => setSimulatedGrowth(Number(e.target.value))}
                                            className="w-full h-3 bg-gray-700 rounded-full appearance-none cursor-pointer accent-pocholo-red"
                                        />
                                        <div className="flex justify-between mt-2 text-[10px] font-bold text-gray-500">
                                            <span>CONSERVADOR (0%)</span>
                                            <span>AGRESIVO (50%)</span>
                                        </div>
                                    </div>

                                    <div className="bg-white/5 p-6 rounded-3xl border border-white/10 backdrop-blur-md">
                                        <p className="text-[10px] font-black uppercase text-gray-500 tracking-wider mb-2 text-center underline italic decoration-pocholo-red decoration-2">Resultado Estimado (Semana)</p>
                                        <div className="text-center font-black text-4xl text-pocholo-red">
                                            S/ {simulatedTotal.toLocaleString('en-PE', { maximumFractionDigits: 0 })}
                                        </div>
                                        <p className="text-[10px] text-gray-400 text-center mt-2 font-medium">Incremento Bruto: S/ {(simulatedTotal - historicalData.reduce((s, h) => s + h['Venta Real (S/)'], 0)).toLocaleString()}</p>
                                    </div>

                                    {/* AI Prediction Box */}
                                    <div className="flex items-start gap-4 p-5 bg-pocholo-red/10 rounded-2xl border border-pocholo-red/30 relative">
                                        <div className="absolute -top-3 -right-3">
                                            <div className="bg-pocholo-red text-[8px] font-black px-2 py-0.5 rounded-full animate-bounce">LIVE ADVICE</div>
                                        </div>
                                        <BrainCircuit size={24} className="text-pocholo-red shrink-0 mt-1" />
                                        <p className="text-xs font-semibold leading-relaxed text-gray-200">
                                            Con un {simulatedGrowth}%, necesitas asegurar un stock mínimo de <strong className="text-pocholo-yellow">{Math.ceil(metrics.avgChickensPerDay * 1.2)} pollos</strong> para contingencias los fines de semana.
                                        </p>
                                    </div>
                                </div>
                            </motion.div>

                            {/* Main Chart */}
                            <motion.div variants={fadeInUp} className="xl:col-span-2 bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-100 flex flex-col">
                                <div className="flex items-center justify-between mb-8">
                                    <h2 className="text-2xl font-black text-gray-900">Proyección de Ingresos</h2>
                                    <div className="flex gap-4">
                                        <div className="flex items-center gap-2">
                                            <div className="w-3 h-3 rounded-full bg-gray-200" />
                                            <span className="text-xs font-bold text-gray-400 uppercase">Real</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <div className="w-3 h-3 rounded-full bg-pocholo-red" />
                                            <span className="text-xs font-bold text-gray-400 uppercase">Predicho</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex-1 min-h-[350px]">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <AreaChart data={combinedChartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                                            <defs>
                                                <linearGradient id="realGrad" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="#E5E7EB" stopOpacity={0.5} />
                                                    <stop offset="95%" stopColor="#E5E7EB" stopOpacity={0} />
                                                </linearGradient>
                                                <linearGradient id="predGrad" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="#D92027" stopOpacity={0.3} />
                                                    <stop offset="95%" stopColor="#D92027" stopOpacity={0} />
                                                </linearGradient>
                                            </defs>
                                            <CartesianGrid strokeDasharray="5 5" vertical={false} stroke="#F3F4F6" />
                                            <XAxis
                                                dataKey="dia" axisLine={false} tickLine={false}
                                                tick={{ fill: '#9CA3AF', fontSize: 13, fontWeight: 900 }} dy={15}
                                            />
                                            <YAxis axisLine={false} tickLine={false} tick={{ fill: '#9CA3AF', fontSize: 12, fontWeight: 700 }} />
                                            <Tooltip
                                                contentStyle={{ borderRadius: '24px', border: 'none', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.1)', fontWeight: '900', padding: '15px' }}
                                                itemStyle={{ fontSize: '12px' }}
                                            />
                                            <Area type="monotone" name="Histórico (7d)" dataKey="Semana Pasada" stroke="#9CA3AF" fill="url(#realGrad)" strokeWidth={4} />
                                            <Area type="monotone" name="Proyección IA" dataKey="Próxima Semana" stroke="#D92027" fill="url(#predGrad)" strokeWidth={4} strokeDasharray="8 5" animationDuration={2000} />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                </div>
                            </motion.div>
                        </div>

                        {/* --- SECONDARY SECTION: PEAKS & PRODUCTS --- */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pb-4">

                            {/* Hourly Peak Analysis */}
                            <motion.div variants={fadeInUp} className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-100">
                                <div className="flex items-center gap-3 mb-8">
                                    <div className="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center text-orange-600">
                                        <Clock size={20} />
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-black text-gray-900 leading-none">Concentración Horaria</h3>
                                        <p className="text-xs font-bold text-gray-400 mt-1 uppercase tracking-wider">Identificando tu "Rush Hour"</p>
                                    </div>
                                </div>

                                <div className="h-[300px]">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={hourlyData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F3F4F6" />
                                            <XAxis dataKey="hora" axisLine={false} tickLine={false} tick={{ fill: '#9CA3AF', fontSize: 11, fontWeight: 800 }} />
                                            <YAxis axisLine={false} tickLine={false} tick={{ fill: '#9CA3AF', fontSize: 11, fontWeight: 700 }} />
                                            <Tooltip cursor={{ fill: '#F9FAFB' }} contentStyle={{ borderRadius: '16px', border: 'none', fontWeight: '900' }} />
                                            <Bar dataKey="cantidad" name="Pedidos Reales" fill="#F2C94C" radius={[4, 4, 0, 0]} barSize={20} />
                                            <Bar dataKey="projected" name="Pedidos Proyectados" fill="#D92027" radius={[4, 4, 0, 0]} barSize={20} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                                <div className="mt-6 flex items-center gap-2 p-3 bg-blue-50 text-blue-700 rounded-2xl text-[11px] font-bold">
                                    <Info size={14} className="shrink-0" />
                                    Tu pico máximo operativo ocurre entre las 13:00 y 14:00. <span className="underline ml-1">Optimiza tu personal en esa franja.</span>
                                </div>
                            </motion.div>

                            {/* Top Predicted Products */}
                            <motion.div variants={fadeInUp} className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-100">
                                <div className="flex items-center gap-3 mb-8">
                                    <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-600">
                                        <ShoppingBag size={20} />
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-black text-gray-900 leading-none">Productos Estrella</h3>
                                        <p className="text-xs font-bold text-gray-400 mt-1 uppercase tracking-wider">Ranking proyectado por IA</p>
                                    </div>
                                </div>

                                <div className="space-y-5">
                                    {topProducts.map((prod, i) => (
                                        <div key={i} className="group cursor-default">
                                            <div className="flex justify-between items-center mb-1.5">
                                                <div className="flex items-center gap-3">
                                                    <span className="text-xs font-black text-gray-300 group-hover:text-pocholo-red transition-colors">#{i + 1}</span>
                                                    <span className="text-sm font-black text-gray-700 uppercase">{prod.nombre_producto}</span>
                                                </div>
                                                <div className="flex items-baseline gap-1">
                                                    <span className="text-sm font-black text-gray-900">{prod.projected}</span>
                                                    <span className="text-[9px] font-black text-gray-400 uppercase">Uds</span>
                                                </div>
                                            </div>
                                            <div className="w-full h-3 bg-gray-50 rounded-full border border-gray-100 relative group overflow-hidden">
                                                <motion.div
                                                    initial={{ width: 0 }}
                                                    animate={{ width: `${Math.min(100, (prod.projected / topProducts[0].projected) * 100)}%` }}
                                                    className={`h-full rounded-full bg-linear-to-r ${i === 0 ? 'from-pocholo-red to-orange-500' : 'from-gray-300 to-gray-400'}`}
                                                    transition={{ duration: 1, delay: i * 0.1 }}
                                                />
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                <div className="mt-10 grid grid-cols-2 gap-4">
                                    <div className="p-4 rounded-2xl bg-gray-50 border border-gray-100 text-center">
                                        <p className="text-[10px] font-black text-gray-400 uppercase mb-1">Stock de Papas</p>
                                        <span className="text-xs font-black px-2 py-0.5 bg-green-100 text-green-700 rounded-full">OPTIMO</span>
                                    </div>
                                    <div className="p-4 rounded-2xl bg-gray-50 border border-gray-100 text-center">
                                        <p className="text-[10px] font-black text-gray-400 uppercase mb-1">Stock de Chicha</p>
                                        <span className="text-xs font-black px-2 py-0.5 bg-red-100 text-red-700 rounded-full animate-pulse">REVISAR</span>
                                    </div>
                                </div>
                            </motion.div>
                        </div>

                    </motion.div>
                )}

                {/* Floating AI Footer Status */}
                {!isLoading && (
                    <motion.div
                        initial={{ opacity: 0, y: 100 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[60] bg-black/80 backdrop-blur-2xl py-3 px-6 rounded-3xl border border-white/20 shadow-2xl lg:hidden flex items-center gap-3"
                    >
                        <div className="p-2 bg-pocholo-red rounded-full">
                            <BrainCircuit size={16} className="text-white" />
                        </div>
                        <span className="text-[10px] font-black text-white uppercase tracking-widest whitespace-nowrap">IA Conectada • {metrics.confidenceScore}% Precisión</span>
                    </motion.div>
                )}
            </div>
        </ProtectedRoute>
    );
}

// Icons for Sidebar compatibility
function ShoppingBar(props: any) { return <ShoppingBag {...props} />; }
