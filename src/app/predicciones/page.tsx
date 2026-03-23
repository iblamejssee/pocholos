'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, BrainCircuit, Sparkles, Activity, CalendarDays } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend } from 'recharts';
import { obtenerVentasPorRango } from '@/lib/reportes';
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
    const [metrics, setMetrics] = useState({
        expectedGrowth: 0,
        avgChickensPerDay: 0,
        totalPredictedRevenue: 0,
        busiestDay: ''
    });

    useEffect(() => {
        const loadData = async () => {
            setIsLoading(true);
            try {
                const hoy = new Date();
                // 7 días atrás al día de ayer (para tener días completos)
                const fechaFin = format(subDays(hoy, 1), 'yyyy-MM-dd');
                const fechaInicio = format(subDays(hoy, 7), 'yyyy-MM-dd');

                const ventas = await obtenerVentasPorRango(fechaInicio, fechaFin);

                // Agrupar ventas reales por fecha
                const ventasPorDiaMap = new Map<string, { total: number; pollos: number }>();

                // Inicializar mapa con ceros
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

                // Generar array histórico
                const history = Array.from(ventasPorDiaMap.entries()).map(([fecha, datos]) => ({
                    fechaRaw: fecha,
                    dia: format(parseISO(fecha), 'EEEE', { locale: es }),
                    'Venta Real (S/)': Number(datos.total.toFixed(2)),
                    'Pollos Reales': datos.pollos
                }));

                // ==========================
                // LÓGICA DE PREDICCIÓN (IA / Heurística de 7 días)
                // ==========================
                // Proyección conservadora: Día equivalente de la semana anterior + 5% de crecimiento
                const GROWTH_FACTOR = 1.05;
                let totalExpected = 0;
                let pollosAcumulados = 0;
                let maxPollos = 0;
                let bestDay = '';

                const predictions = history.map((h) => {
                    // Tomamos el día real y proyectamos para la próxima semana (+7 días)
                    const targetDate = addDays(parseISO(h.fechaRaw), 7);
                    const predVenta = Number((h['Venta Real (S/)'] * GROWTH_FACTOR).toFixed(2));
                    const predPollos = Math.ceil(h['Pollos Reales'] * GROWTH_FACTOR);

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

                // Métricas para tarjetas
                const pastTotal = history.reduce((sum, h) => sum + h['Venta Real (S/)'], 0);
                const crecimientoPorcentual = pastTotal > 0 ? ((totalExpected - pastTotal) / pastTotal) * 100 : 0;

                setHistoricalData(history);
                setPredictionData(predictions);
                setMetrics({
                    expectedGrowth: Number(crecimientoPorcentual.toFixed(1)),
                    avgChickensPerDay: Math.ceil(pollosAcumulados / 7),
                    totalPredictedRevenue: totalExpected,
                    busiestDay: bestDay.charAt(0).toUpperCase() + bestDay.slice(1)
                });

            } catch (error) {
                console.error("Error al generar proyecciones:", error);
            } finally {
                setIsLoading(false);
            }
        };

        loadData();
    }, []);

    // Combinar ambos arrays para un gráfico combinado si se desea (opcional)
    const combinedChartData = historicalData.map((h, i) => ({
        dia: h.dia.substring(0, 3).toUpperCase(),
        'Semana Pasada': h['Venta Real (S/)'],
        'Próxima Semana': predictionData[i] ? predictionData[i]['Proyección Venta (S/)'] : 0
    }));

    return (
        <ProtectedRoute requiredPermission="reportes">
            <div className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-50 flex flex-col p-4 lg:p-8 pb-20 lg:pb-8">

                {/* Header */}
                <motion.div initial="hidden" animate="visible" variants={fadeInUp} className="mb-8">
                    <h1 className="text-3xl font-black text-gray-800 flex items-center gap-3">
                        <BrainCircuit className="text-pocholo-red" size={36} />
                        Predicciones e IA
                    </h1>
                    <p className="text-gray-500 mt-2 font-medium">Proyección automatizada basada en el rendimiento de los últimos 7 días.</p>
                </motion.div>

                {isLoading ? (
                    <div className="flex-1 flex items-center justify-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-pocholo-red"></div>
                    </div>
                ) : (
                    <motion.div
                        variants={staggerContainer}
                        initial="hidden"
                        animate="visible"
                        className="space-y-6"
                    >
                        {/* KPI Cards */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            <motion.div variants={fadeInUp} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 relative overflow-hidden group">
                                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                                    <TrendingUp size={64} className="text-green-500" />
                                </div>
                                <p className="text-sm font-bold text-gray-400 uppercase tracking-wider">Crecimiento Esperado</p>
                                <div className="mt-2 flex items-baseline gap-2">
                                    <h3 className="text-3xl font-black text-gray-800">+{metrics.expectedGrowth}%</h3>
                                    <span className="text-xs font-semibold text-green-500 flex items-center"><TrendingUp size={12} className="mr-1" /> vs anterior</span>
                                </div>
                            </motion.div>

                            <motion.div variants={fadeInUp} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 relative overflow-hidden group">
                                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                                    <Activity size={64} className="text-pocholo-red" />
                                </div>
                                <p className="text-sm font-bold text-gray-400 uppercase tracking-wider">Ingreso Proyectado (7d)</p>
                                <h3 className="text-3xl font-black text-gray-800 mt-2">S/ {metrics.totalPredictedRevenue.toLocaleString('en-US', { minimumFractionDigits: 2 })}</h3>
                            </motion.div>

                            <motion.div variants={fadeInUp} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 relative overflow-hidden group">
                                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                                    <CalendarDays size={64} className="text-pocholo-yellow" />
                                </div>
                                <p className="text-sm font-bold text-gray-400 uppercase tracking-wider">Día Pico Esperado</p>
                                <h3 className="text-3xl font-black text-gray-800 mt-2">{metrics.busiestDay}</h3>
                                <p className="text-xs text-gray-500 mt-1 font-medium">Mayor afluencia de clientes</p>
                            </motion.div>

                            <motion.div variants={fadeInUp} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 relative overflow-hidden group">
                                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                                    <Activity size={64} className="text-blue-500" />
                                </div>
                                <p className="text-sm font-bold text-gray-400 uppercase tracking-wider">Demanda Prom. Diaria</p>
                                <h3 className="text-3xl font-black text-gray-800 mt-2">{metrics.avgChickensPerDay}</h3>
                                <p className="text-xs text-gray-500 mt-1 font-medium">Pollos diarios necesarios</p>
                            </motion.div>
                        </div>

                        {/* IA Insight Box */}
                        <motion.div variants={fadeInUp} className="bg-linear-to-r from-gray-900 to-gray-800 rounded-3xl p-1 shadow-xl">
                            <div className="bg-gray-900/40 backdrop-blur-xl rounded-[22px] p-6 lg:p-8 flex items-start gap-5 border border-white/10 relative overflow-hidden">
                                {/* Decoraciones lumínicas */}
                                <div className="absolute -top-24 -right-24 w-48 h-48 bg-pocholo-red/30 rounded-full blur-3xl opacity-50 animate-pulse" />
                                <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-pocholo-yellow/20 rounded-full blur-3xl opacity-50" />

                                <div className="bg-linear-to-br from-white/20 to-white/5 p-3 rounded-2xl shrink-0 backdrop-blur-md border border-white/10 shadow-[0_0_15px_rgba(255,255,255,0.1)]">
                                    <Sparkles className="text-pocholo-yellow" size={28} />
                                </div>
                                <div className="relative z-10">
                                    <h3 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
                                        Análisis Inteligente de Pocholo's AI
                                    </h3>
                                    <p className="text-gray-300 leading-relaxed text-sm md:text-base">
                                        Basado en el histórico de los últimos 7 días, se proyecta un incremento generalizado del <strong>5%</strong>.
                                        El día <strong>{metrics.busiestDay}</strong> registrará la mayor demanda; te recomendamos asegurar al menos <strong>{Math.ceil(metrics.avgChickensPerDay * 1.3)} pollos</strong> ese día para evitar quedarte sin stock (Sold Out).
                                        El abastecimiento promedio para los días regulares debería mantenerse en <strong>{metrics.avgChickensPerDay} pollos</strong> para optimizar la rotación de tus insumos.
                                    </p>
                                </div>
                            </div>
                        </motion.div>

                        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                            {/* Gráfico Comparativo Venta */}
                            <motion.div variants={fadeInUp} className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
                                <h2 className="text-lg font-black text-gray-800 mb-6 flex items-center gap-2">
                                    Proyección de Ingresos (S/)
                                </h2>
                                <div className="h-72">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <AreaChart data={combinedChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                            <defs>
                                                <linearGradient id="colorPasada" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="#9CA3AF" stopOpacity={0.3} />
                                                    <stop offset="95%" stopColor="#9CA3AF" stopOpacity={0} />
                                                </linearGradient>
                                                <linearGradient id="colorFutura" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="#D92027" stopOpacity={0.4} />
                                                    <stop offset="95%" stopColor="#D92027" stopOpacity={0} />
                                                </linearGradient>
                                            </defs>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                                            <XAxis dataKey="dia" axisLine={false} tickLine={false} tick={{ fill: '#9CA3AF', fontSize: 12, fontWeight: 700 }} dy={10} />
                                            <YAxis axisLine={false} tickLine={false} tick={{ fill: '#9CA3AF', fontSize: 12, fontWeight: 700 }} />
                                            <Tooltip
                                                contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)', fontWeight: 'bold' }}
                                                itemStyle={{ fontWeight: 'bold' }}
                                            />
                                            <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px', fontSize: '12px', fontWeight: 'bold' }} />
                                            <Area type="monotone" name="Real (Últimos 7d)" dataKey="Semana Pasada" stroke="#9CA3AF" fillOpacity={1} fill="url(#colorPasada)" strokeWidth={3} />
                                            <Area type="monotone" name="Proyección (Próximos 7d)" dataKey="Próxima Semana" stroke="#D92027" fillOpacity={1} fill="url(#colorFutura)" strokeWidth={3} strokeDasharray="5 5" />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                </div>
                            </motion.div>

                            {/* Gráfico Predicción de Pollos */}
                            <motion.div variants={fadeInUp} className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
                                <h2 className="text-lg font-black text-gray-800 mb-6 flex items-center gap-2">
                                    Demanda Estimada de Pollos
                                </h2>
                                <div className="h-72">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={predictionData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                                            <XAxis dataKey="dia" axisLine={false} tickLine={false} tickFormatter={(val) => val.substring(0, 3).toUpperCase()} tick={{ fill: '#9CA3AF', fontSize: 12, fontWeight: 700 }} dy={10} />
                                            <YAxis axisLine={false} tickLine={false} tick={{ fill: '#9CA3AF', fontSize: 12, fontWeight: 700 }} />
                                            <Tooltip
                                                cursor={{ fill: '#f9fafb' }}
                                                contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)', fontWeight: 'bold' }}
                                            />
                                            <Bar dataKey="Proyección Pollos" name="Pollos a Vender" fill="#F2C94C" radius={[6, 6, 0, 0]} maxBarSize={50} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            </motion.div>
                        </div>
                    </motion.div>
                )}
            </div>
        </ProtectedRoute>
    );
}
