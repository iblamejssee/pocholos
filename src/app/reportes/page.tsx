'use client';

import { useState, useEffect } from 'react';
import { DollarSign, ShoppingBag, TrendingUp, TrendingDown, Calendar, Download, Star, Clock, CreditCard, Home, Package, ChevronLeft, ChevronRight, X, Filter, BarChart3 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area } from 'recharts';
import {
    obtenerVentasPorRango,
    obtenerVentasPorDia,
    calcularTopProductos,
    calcularDesgloseMetodoPago,
    calcularConsumoPollosPorDia,
    calcularDistribucionTipoVenta,
    obtenerComparativaSemanal,
    obtenerVentasPorHora,
    type EstadisticaProducto,
    type DesgloseMetodoPago,
    type ConsumoPollosDia,
    type DistribucionTipoVenta,
    type ComparativaSemanal
} from '@/lib/reportes';
import { useMetricas } from '@/hooks/useMetricas';
import type { Venta } from '@/lib/database.types';
import { format, subDays, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addMonths, subMonths, isSameDay, isWithinInterval, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { formatearFraccionPollo } from '@/lib/utils';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';

type TipoRango = 'dia' | 'rango';

export default function ReportesPage() {
    const [tipoRango, setTipoRango] = useState<TipoRango>('dia');
    const [fechaSeleccionada, setFechaSeleccionada] = useState(new Date());
    const [fechaInicio, setFechaInicio] = useState(new Date());
    const [fechaFin, setFechaFin] = useState(new Date());
    const [mesCalendario, setMesCalendario] = useState(new Date());
    const [mostrarCalendario, setMostrarCalendario] = useState(false);
    const [seleccionandoRango, setSeleccionandoRango] = useState<'inicio' | 'fin'>('inicio');

    const [ventas, setVentas] = useState<Venta[]>([]);
    const [ventasPorDia, setVentasPorDia] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const metricas = useMetricas(ventas);
    const [topProductos, setTopProductos] = useState<EstadisticaProducto[]>([]);
    const [desgloseMetodoPago, setDesgloseMetodoPago] = useState<DesgloseMetodoPago[]>([]);
    const [consumoPollos, setConsumoPollos] = useState<ConsumoPollosDia[]>([]);
    const [distribucionTipo, setDistribucionTipo] = useState<DistribucionTipoVenta[]>([]);
    const [comparativa, setComparativa] = useState<ComparativaSemanal | null>(null);
    const [ventasPorHora, setVentasPorHora] = useState<{ hora: string; total: number; cantidad: number }[]>([]);

    // Colores profesionales
    const CHART_COLORS = {
        primary: '#C8102E',
        secondary: '#F2C94C',
        tertiary: '#5A3E2B',
        success: '#10B981',
        warning: '#F59E0B',
        info: '#3B82F6'
    };

    const METODO_COLORS: Record<string, string> = {
        'Efectivo': '#10B981',
        'Yape': '#7C3AED',
        'Plin': '#06B6D4',
        'Tarjeta': '#3B82F6'
    };

    // Rangos predefinidos
    const rangosRapidos = [
        { label: 'Hoy', action: () => { setTipoRango('dia'); setFechaSeleccionada(new Date()); } },
        { label: 'Ayer', action: () => { setTipoRango('dia'); setFechaSeleccionada(subDays(new Date(), 1)); } },
        {
            label: 'Esta semana', action: () => {
                setTipoRango('rango');
                setFechaInicio(startOfWeek(new Date(), { weekStartsOn: 1 }));
                setFechaFin(new Date());
            }
        },
        {
            label: 'Últimos 7 días', action: () => {
                setTipoRango('rango');
                setFechaInicio(subDays(new Date(), 6));
                setFechaFin(new Date());
            }
        },
        {
            label: 'Últimos 30 días', action: () => {
                setTipoRango('rango');
                setFechaInicio(subDays(new Date(), 29));
                setFechaFin(new Date());
            }
        },
        {
            label: 'Este mes', action: () => {
                setTipoRango('rango');
                setFechaInicio(startOfMonth(new Date()));
                setFechaFin(new Date());
            }
        },
        {
            label: 'Mes pasado', action: () => {
                const mesAnterior = subMonths(new Date(), 1);
                setTipoRango('rango');
                setFechaInicio(startOfMonth(mesAnterior));
                setFechaFin(endOfMonth(mesAnterior));
            }
        },
    ];

    useEffect(() => {
        cargarDatos();
    }, [fechaSeleccionada, fechaInicio, fechaFin, tipoRango]);

    const cargarDatos = async () => {
        setLoading(true);
        try {
            let inicio: string, fin: string;

            if (tipoRango === 'dia') {
                inicio = format(fechaSeleccionada, 'yyyy-MM-dd');
                fin = inicio;
            } else {
                inicio = format(fechaInicio, 'yyyy-MM-dd');
                fin = format(fechaFin, 'yyyy-MM-dd');
            }

            console.log('[Reportes] Consultando rango:', { inicio, fin, tipoRango });

            const ventasData = await obtenerVentasPorRango(inicio, fin);
            console.log('[Reportes] Ventas obtenidas:', ventasData.length, ventasData);
            setVentas(ventasData);

            const ventasDia = await obtenerVentasPorDia(inicio, fin);
            setVentasPorDia(ventasDia);

            const top = calcularTopProductos(ventasData);
            setTopProductos(top);

            const desglose = calcularDesgloseMetodoPago(ventasData);
            setDesgloseMetodoPago(desglose);

            const pollos = calcularConsumoPollosPorDia(ventasData);
            setConsumoPollos(pollos);

            const distribucion = calcularDistribucionTipoVenta(ventasData);
            setDistribucionTipo(distribucion);

            const horasData = obtenerVentasPorHora(ventasData);
            setVentasPorHora(horasData);

            const comp = await obtenerComparativaSemanal();
            setComparativa(comp);

        } catch (error) {
            console.error('[Reportes] Error:', error);
        } finally {
            setLoading(false);
        }
    };

    const exportarCSV = () => {
        if (ventas.length === 0) {
            toast.error('No hay datos para exportar');
            return;
        }

        const headers = ['Fecha', 'Hora', 'ID Pedido', 'Items', 'Método Pago', 'Total'];
        const rows = ventas.map(v => [
            format(new Date(v.created_at), 'dd/MM/yyyy'),
            format(new Date(v.created_at), 'HH:mm'),
            v.id.slice(0, 8),
            v.items.length,
            v.metodo_pago || 'Efectivo',
            v.total.toFixed(2)
        ]);

        const csvContent = [headers, ...rows].map(row => row.join(',')).join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `reporte_${format(new Date(), 'yyyyMMdd_HHmm')}.csv`;
        link.click();
        URL.revokeObjectURL(url);
        toast.success('Reporte exportado correctamente');
    };

    // Generar días del calendario
    const generarDiasCalendario = () => {
        const inicio = startOfMonth(mesCalendario);
        const fin = endOfMonth(mesCalendario);
        const inicioSemana = startOfWeek(inicio, { weekStartsOn: 1 });
        const finSemana = endOfWeek(fin, { weekStartsOn: 1 });

        const dias = [];
        let dia = inicioSemana;

        while (dia <= finSemana) {
            dias.push(new Date(dia));
            dia = new Date(dia.getTime() + 24 * 60 * 60 * 1000);
        }

        return dias;
    };

    const handleClickDia = (dia: Date) => {
        if (tipoRango === 'dia') {
            setFechaSeleccionada(dia);
            setMostrarCalendario(false);
        } else {
            if (seleccionandoRango === 'inicio') {
                setFechaInicio(dia);
                setSeleccionandoRango('fin');
            } else {
                if (dia >= fechaInicio) {
                    setFechaFin(dia);
                    setMostrarCalendario(false);
                    setSeleccionandoRango('inicio');
                } else {
                    setFechaInicio(dia);
                    setSeleccionandoRango('fin');
                }
            }
        }
    };

    const esDiaSeleccionado = (dia: Date) => {
        if (tipoRango === 'dia') {
            return isSameDay(dia, fechaSeleccionada);
        } else {
            return isSameDay(dia, fechaInicio) || isSameDay(dia, fechaFin);
        }
    };

    const estaEnRango = (dia: Date) => {
        if (tipoRango === 'rango' && fechaInicio && fechaFin) {
            return isWithinInterval(dia, { start: fechaInicio, end: fechaFin });
        }
        return false;
    };

    const getPeriodoTexto = () => {
        if (tipoRango === 'dia') {
            return format(fechaSeleccionada, "EEEE, d 'de' MMMM yyyy", { locale: es });
        } else {
            return `${format(fechaInicio, 'd MMM', { locale: es })} - ${format(fechaFin, 'd MMM yyyy', { locale: es })}`;
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50">
            <div className="p-3 sm:p-6 lg:p-8 max-w-7xl mx-auto">

                {/* Header Profesional */}
                <div className="mb-8">
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                        <div>
                            <div className="flex items-center gap-3 mb-2">
                                <div className="w-12 h-12 bg-gradient-to-br from-pocholo-red to-red-700 rounded-xl flex items-center justify-center shadow-lg">
                                    <BarChart3 className="text-white" size={24} />
                                </div>
                                <div>
                                    <h1 className="text-3xl font-bold text-slate-800">
                                        Centro de Reportes
                                    </h1>
                                    <p className="text-slate-500 text-sm">
                                        Análisis detallado del rendimiento
                                    </p>
                                </div>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <button
                                onClick={exportarCSV}
                                className="flex items-center gap-2 px-5 py-2.5 bg-slate-800 text-white rounded-xl font-medium hover:bg-slate-700 transition-all shadow-md hover:shadow-lg"
                            >
                                <Download size={18} />
                                Exportar
                            </button>
                        </div>
                    </div>
                </div>

                {/* Panel de Filtros Profesional */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 mb-8">
                    <div className="flex flex-col lg:flex-row gap-6">

                        {/* Tipo de Selección */}
                        <div className="flex-shrink-0">
                            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Tipo de consulta</p>
                            <div className="flex bg-slate-100 rounded-xl p-1">
                                <button
                                    onClick={() => setTipoRango('dia')}
                                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${tipoRango === 'dia'
                                        ? 'bg-white text-slate-800 shadow-sm'
                                        : 'text-slate-500 hover:text-slate-700'
                                        }`}
                                >
                                    Día específico
                                </button>
                                <button
                                    onClick={() => setTipoRango('rango')}
                                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${tipoRango === 'rango'
                                        ? 'bg-white text-slate-800 shadow-sm'
                                        : 'text-slate-500 hover:text-slate-700'
                                        }`}
                                >
                                    Rango de fechas
                                </button>
                            </div>
                        </div>

                        {/* Selector de Fecha */}
                        <div className="flex-shrink-0">
                            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Período</p>
                            <button
                                onClick={() => setMostrarCalendario(!mostrarCalendario)}
                                className="flex items-center gap-3 px-4 py-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl transition-all"
                            >
                                <Calendar size={18} className="text-slate-500" />
                                <span className="text-slate-700 font-medium capitalize">
                                    {getPeriodoTexto()}
                                </span>
                            </button>
                        </div>

                        {/* Rangos Rápidos */}
                        <div className="flex-1">
                            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Acceso rápido</p>
                            <div className="flex flex-wrap gap-2">
                                {rangosRapidos.map((rango, i) => (
                                    <button
                                        key={i}
                                        onClick={rango.action}
                                        className="px-3 py-1.5 text-sm font-medium text-slate-600 bg-slate-50 hover:bg-pocholo-yellow hover:text-pocholo-brown rounded-lg transition-all border border-transparent hover:border-pocholo-yellow/50"
                                    >
                                        {rango.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Calendario Desplegable */}
                    <AnimatePresence>
                        {mostrarCalendario && (
                            <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                className="mt-6 pt-6 border-t border-slate-100"
                            >
                                <div className="max-w-md mx-auto bg-slate-50 rounded-2xl p-4">
                                    {/* Header del Calendario */}
                                    <div className="flex items-center justify-between mb-4">
                                        <button
                                            onClick={() => setMesCalendario(subMonths(mesCalendario, 1))}
                                            className="p-2 hover:bg-white rounded-lg transition-colors"
                                        >
                                            <ChevronLeft size={20} className="text-slate-600" />
                                        </button>
                                        <h3 className="font-bold text-slate-700 capitalize">
                                            {format(mesCalendario, 'MMMM yyyy', { locale: es })}
                                        </h3>
                                        <button
                                            onClick={() => setMesCalendario(addMonths(mesCalendario, 1))}
                                            className="p-2 hover:bg-white rounded-lg transition-colors"
                                        >
                                            <ChevronRight size={20} className="text-slate-600" />
                                        </button>
                                    </div>

                                    {/* Días de la semana */}
                                    <div className="grid grid-cols-7 gap-1 mb-2">
                                        {['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map(dia => (
                                            <div key={dia} className="text-center text-xs font-semibold text-slate-400 py-2">
                                                {dia}
                                            </div>
                                        ))}
                                    </div>

                                    {/* Días del mes */}
                                    <div className="grid grid-cols-7 gap-1">
                                        {generarDiasCalendario().map((dia, i) => {
                                            const esDelMes = dia.getMonth() === mesCalendario.getMonth();
                                            const esHoy = isSameDay(dia, new Date());
                                            const seleccionado = esDiaSeleccionado(dia);
                                            const enRango = estaEnRango(dia);

                                            return (
                                                <button
                                                    key={i}
                                                    onClick={() => handleClickDia(dia)}
                                                    disabled={!esDelMes}
                                                    className={`
                                                        py-2.5 text-sm rounded-lg transition-all font-medium
                                                        ${!esDelMes ? 'text-slate-300 cursor-not-allowed' : 'hover:bg-white'}
                                                        ${esHoy && !seleccionado ? 'ring-2 ring-pocholo-red ring-inset' : ''}
                                                        ${seleccionado ? 'bg-pocholo-red text-white shadow-md' : ''}
                                                        ${enRango && !seleccionado ? 'bg-pocholo-red/10 text-pocholo-red' : ''}
                                                        ${esDelMes && !seleccionado && !enRango ? 'text-slate-700' : ''}
                                                    `}
                                                >
                                                    {dia.getDate()}
                                                </button>
                                            );
                                        })}
                                    </div>

                                    {tipoRango === 'rango' && (
                                        <div className="mt-4 pt-4 border-t border-slate-200 text-center text-sm text-slate-500">
                                            {seleccionandoRango === 'inicio'
                                                ? 'Selecciona la fecha de inicio'
                                                : 'Selecciona la fecha de fin'}
                                        </div>
                                    )}
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {loading ? (
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-16 text-center">
                        <div className="w-12 h-12 border-4 border-pocholo-red border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                        <p className="text-slate-500">Cargando datos...</p>
                    </div>
                ) : (
                    <>
                        {/* Métricas Principales */}
                        <div className="grid md:grid-cols-4 gap-4 mb-8">
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200"
                            >
                                <div className="flex items-center justify-between mb-3">
                                    <span className="text-sm font-medium text-slate-500">Ingresos Totales</span>
                                    <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
                                        <DollarSign size={20} className="text-green-600" />
                                    </div>
                                </div>
                                <p className="text-3xl font-bold text-slate-800">S/ {metricas.totalIngresos.toFixed(2)}</p>
                                <p className="text-xs text-slate-400 mt-1">{getPeriodoTexto()}</p>
                            </motion.div>

                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.1 }}
                                className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200"
                            >
                                <div className="flex items-center justify-between mb-3">
                                    <span className="text-sm font-medium text-slate-500">Total Pedidos</span>
                                    <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                                        <ShoppingBag size={20} className="text-blue-600" />
                                    </div>
                                </div>
                                <p className="text-3xl font-bold text-slate-800">{metricas.cantidadPedidos}</p>
                                <p className="text-xs text-slate-400 mt-1">Pedidos procesados</p>
                            </motion.div>

                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.2 }}
                                className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200"
                            >
                                <div className="flex items-center justify-between mb-3">
                                    <span className="text-sm font-medium text-slate-500">Ticket Promedio</span>
                                    <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center">
                                        <TrendingUp size={20} className="text-amber-600" />
                                    </div>
                                </div>
                                <p className="text-3xl font-bold text-slate-800">S/ {metricas.promedioPorPedido.toFixed(2)}</p>
                                <p className="text-xs text-slate-400 mt-1">Por pedido</p>
                            </motion.div>

                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.3 }}
                                className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200"
                            >
                                <div className="flex items-center justify-between mb-3">
                                    <span className="text-sm font-medium text-slate-500">Pollos Vendidos</span>
                                    <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center">
                                        <Package size={20} className="text-red-600" />
                                    </div>
                                </div>
                                <p className="text-3xl font-bold text-slate-800">{formatearFraccionPollo(metricas.pollosVendidos)}</p>
                                <p className="text-xs text-slate-400 mt-1">Consumo total</p>
                            </motion.div>
                        </div>

                        {/* Comparativa Semanal */}
                        {comparativa && (
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="bg-gradient-to-r from-slate-800 to-slate-900 rounded-2xl p-6 mb-8 text-white"
                            >
                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                    <div>
                                        <p className="text-slate-400 text-sm font-medium mb-1">Rendimiento Semanal</p>
                                        <h3 className="text-xl font-bold">Comparativa vs. Semana Anterior</h3>
                                    </div>
                                    <div className={`flex items-center gap-3 px-5 py-3 rounded-xl ${comparativa.esPositivo ? 'bg-green-500/20' : 'bg-red-500/20'
                                        }`}>
                                        {comparativa.esPositivo ? (
                                            <TrendingUp className="text-green-400" size={28} />
                                        ) : (
                                            <TrendingDown className="text-red-400" size={28} />
                                        )}
                                        <div>
                                            <span className={`text-3xl font-bold ${comparativa.esPositivo ? 'text-green-400' : 'text-red-400'
                                                }`}>
                                                {comparativa.esPositivo ? '+' : ''}{comparativa.porcentajeCambio.toFixed(1)}%
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                <div className="grid grid-cols-3 gap-4 mt-6">
                                    <div className="bg-white/5 backdrop-blur rounded-xl p-4">
                                        <p className="text-slate-400 text-xs mb-1">Esta semana</p>
                                        <p className="text-2xl font-bold">S/ {comparativa.semanaActual.toFixed(2)}</p>
                                    </div>
                                    <div className="bg-white/5 backdrop-blur rounded-xl p-4">
                                        <p className="text-slate-400 text-xs mb-1">Semana anterior</p>
                                        <p className="text-2xl font-bold">S/ {comparativa.semanaAnterior.toFixed(2)}</p>
                                    </div>
                                    <div className="bg-white/5 backdrop-blur rounded-xl p-4">
                                        <p className="text-slate-400 text-xs mb-1">Diferencia</p>
                                        <p className={`text-2xl font-bold ${comparativa.esPositivo ? 'text-green-400' : 'text-red-400'}`}>
                                            {comparativa.esPositivo ? '+' : ''}S/ {comparativa.diferencia.toFixed(2)}
                                        </p>
                                    </div>
                                </div>
                            </motion.div>
                        )}

                        {/* Grid de Análisis */}
                        <div className="grid lg:grid-cols-2 gap-6 mb-8">

                            {/* Métodos de Pago */}
                            <motion.div
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6"
                            >
                                <div className="flex items-center justify-between mb-6">
                                    <div>
                                        <h3 className="font-bold text-slate-800">Métodos de Pago</h3>
                                        <p className="text-sm text-slate-500">Distribución de transacciones</p>
                                    </div>
                                    <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
                                        <CreditCard size={20} className="text-purple-600" />
                                    </div>
                                </div>

                                {desgloseMetodoPago.length > 0 ? (
                                    <>
                                        <ResponsiveContainer width="100%" height={180}>
                                            <PieChart>
                                                <Pie
                                                    data={desgloseMetodoPago.map(d => ({ name: d.metodo, value: d.total }))}
                                                    cx="50%"
                                                    cy="50%"
                                                    innerRadius={45}
                                                    outerRadius={70}
                                                    paddingAngle={4}
                                                    dataKey="value"
                                                >
                                                    {desgloseMetodoPago.map((d, i) => (
                                                        <Cell key={i} fill={METODO_COLORS[d.metodo] || '#94A3B8'} />
                                                    ))}
                                                </Pie>
                                                <Tooltip formatter={(v) => [`S/ ${Number(v).toFixed(2)}`, 'Total']} />
                                            </PieChart>
                                        </ResponsiveContainer>
                                        <div className="space-y-2 mt-4">
                                            {desgloseMetodoPago.map((d, i) => (
                                                <div key={i} className="flex items-center justify-between py-2 px-3 bg-slate-50 rounded-lg">
                                                    <div className="flex items-center gap-3">
                                                        <span className="w-3 h-3 rounded-full" style={{ backgroundColor: METODO_COLORS[d.metodo] || '#94A3B8' }}></span>
                                                        <span className="font-medium text-slate-700">{d.metodo}</span>
                                                    </div>
                                                    <div className="text-right">
                                                        <span className="font-bold text-slate-800">S/ {d.total.toFixed(2)}</span>
                                                        <span className="text-xs text-slate-400 ml-2">({d.porcentaje.toFixed(0)}%)</span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </>
                                ) : (
                                    <div className="py-16 text-center text-slate-400">
                                        Sin transacciones en este período
                                    </div>
                                )}
                            </motion.div>

                            {/* Tipo de Venta */}
                            <motion.div
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6"
                            >
                                <div className="flex items-center justify-between mb-6">
                                    <div>
                                        <h3 className="font-bold text-slate-800">Tipo de Venta</h3>
                                        <p className="text-sm text-slate-500">Mesa vs Para Llevar</p>
                                    </div>
                                    <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center">
                                        <Home size={20} className="text-amber-600" />
                                    </div>
                                </div>

                                {ventas.length > 0 ? (
                                    <>
                                        <ResponsiveContainer width="100%" height={180}>
                                            <PieChart>
                                                <Pie
                                                    data={distribucionTipo.map(d => ({ name: d.tipo, value: d.cantidad }))}
                                                    cx="50%"
                                                    cy="50%"
                                                    innerRadius={45}
                                                    outerRadius={70}
                                                    paddingAngle={4}
                                                    dataKey="value"
                                                >
                                                    <Cell fill="#5A3E2B" />
                                                    <Cell fill="#F2C94C" />
                                                </Pie>
                                                <Tooltip />
                                            </PieChart>
                                        </ResponsiveContainer>
                                        <div className="grid grid-cols-2 gap-3 mt-4">
                                            {distribucionTipo.map((d, i) => (
                                                <div key={i} className={`p-4 rounded-xl ${i === 0 ? 'bg-pocholo-brown/5 border border-pocholo-brown/10' : 'bg-pocholo-yellow/10 border border-pocholo-yellow/20'}`}>
                                                    <p className="text-xs text-slate-500 mb-1">{d.tipo}</p>
                                                    <p className="text-2xl font-bold text-slate-800">{d.cantidad}</p>
                                                    <p className="text-sm text-slate-500">S/ {d.total.toFixed(2)}</p>
                                                </div>
                                            ))}
                                        </div>
                                    </>
                                ) : (
                                    <div className="py-16 text-center text-slate-400">
                                        Sin datos de distribución
                                    </div>
                                )}
                            </motion.div>
                        </div>

                        {/* Ventas por Hora - Gráfico Simple */}
                        {ventasPorHora.length > 0 && (
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 mb-8"
                            >
                                <div className="flex items-center justify-between mb-4">
                                    <div>
                                        <h3 className="font-bold text-slate-800">Ventas por Hora</h3>
                                        <p className="text-sm text-slate-500">
                                            🔥 Hora pico: <span className="font-semibold text-orange-600">
                                                {ventasPorHora.reduce((max, h) => h.cantidad > max.cantidad ? h : max, ventasPorHora[0]).hora}
                                            </span> ({ventasPorHora.reduce((max, h) => h.cantidad > max.cantidad ? h : max, ventasPorHora[0]).cantidad} ventas)
                                        </p>
                                    </div>
                                    <div className="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center">
                                        <Clock size={20} className="text-orange-600" />
                                    </div>
                                </div>

                                <div className="h-48">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={ventasPorHora} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                            <XAxis dataKey="hora" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                                            <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                                            <Tooltip
                                                formatter={(value) => [`${value} ventas`, 'Cantidad']}
                                                contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0' }}
                                            />
                                            <Bar dataKey="cantidad" fill="#f97316" radius={[4, 4, 0, 0]} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            </motion.div>
                        )}

                        {/* Consumo de Pollos */}
                        {consumoPollos.length > 0 && (
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 mb-8"
                            >
                                <div className="flex items-center justify-between mb-6">
                                    <div>
                                        <h3 className="font-bold text-slate-800">Consumo de Pollos</h3>
                                        <p className="text-sm text-slate-500">Histórico diario para planificación de compras</p>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <div className="text-right">
                                            <p className="text-xs text-slate-400">Promedio diario</p>
                                            <p className="text-lg font-bold text-amber-600">
                                                {formatearFraccionPollo(consumoPollos.reduce((s, d) => s + d.pollos, 0) / consumoPollos.length)}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                                <ResponsiveContainer width="100%" height={280}>
                                    <AreaChart data={consumoPollos}>
                                        <defs>
                                            <linearGradient id="colorPollos" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#F59E0B" stopOpacity={0.3} />
                                                <stop offset="95%" stopColor="#F59E0B" stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                                        <XAxis
                                            dataKey="fecha"
                                            tickFormatter={(f) => format(new Date(f), 'dd/MM')}
                                            stroke="#94A3B8"
                                            fontSize={12}
                                        />
                                        <YAxis stroke="#94A3B8" fontSize={12} />
                                        <Tooltip
                                            contentStyle={{ backgroundColor: '#FFF', border: '1px solid #E2E8F0', borderRadius: '12px' }}
                                            formatter={(v) => [`${formatearFraccionPollo(Number(v))} pollos`, 'Consumo']}
                                            labelFormatter={(f) => format(new Date(f), "d 'de' MMMM", { locale: es })}
                                        />
                                        <Area type="monotone" dataKey="pollos" stroke="#F59E0B" strokeWidth={2} fill="url(#colorPollos)" />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </motion.div>
                        )}

                        {/* Ventas por Día */}
                        {ventasPorDia.length > 1 && (
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 mb-8"
                            >
                                <div className="flex items-center justify-between mb-6">
                                    <div>
                                        <h3 className="font-bold text-slate-800">Tendencia de Ventas</h3>
                                        <p className="text-sm text-slate-500">Ingresos por día</p>
                                    </div>
                                </div>
                                <ResponsiveContainer width="100%" height={300}>
                                    <AreaChart data={ventasPorDia}>
                                        <defs>
                                            <linearGradient id="colorVentas" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#C8102E" stopOpacity={0.3} />
                                                <stop offset="95%" stopColor="#C8102E" stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                                        <XAxis
                                            dataKey="fecha"
                                            tickFormatter={(f) => format(new Date(f), 'dd/MM')}
                                            stroke="#94A3B8"
                                            fontSize={12}
                                        />
                                        <YAxis stroke="#94A3B8" fontSize={12} />
                                        <Tooltip
                                            contentStyle={{ backgroundColor: '#FFF', border: '1px solid #E2E8F0', borderRadius: '12px' }}
                                            formatter={(v) => [`S/ ${Number(v).toFixed(2)}`, 'Total']}
                                            labelFormatter={(f) => format(new Date(f), "d 'de' MMMM", { locale: es })}
                                        />
                                        <Area type="monotone" dataKey="total" stroke="#C8102E" strokeWidth={2} fill="url(#colorVentas)" />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </motion.div>
                        )}

                        {/* Top Productos */}
                        {topProductos.length > 0 && (
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 mb-8"
                            >
                                <div className="flex items-center justify-between mb-6">
                                    <div>
                                        <h3 className="font-bold text-slate-800">Productos Más Vendidos</h3>
                                        <p className="text-sm text-slate-500">Ranking del período seleccionado</p>
                                    </div>
                                    <div className="w-10 h-10 bg-yellow-100 rounded-xl flex items-center justify-center">
                                        <Star size={20} className="text-yellow-600" />
                                    </div>
                                </div>
                                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
                                    {topProductos.slice(0, 9).map((p, i) => (
                                        <div key={p.id} className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors">
                                            <span className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold ${i === 0 ? 'bg-yellow-400 text-yellow-900' :
                                                i === 1 ? 'bg-slate-300 text-slate-700' :
                                                    i === 2 ? 'bg-amber-600 text-white' :
                                                        'bg-slate-200 text-slate-600'
                                                }`}>
                                                {i + 1}
                                            </span>
                                            <div className="flex-1 min-w-0">
                                                <p className="font-medium text-slate-800 truncate">{p.nombre_producto}</p>
                                                <p className="text-xs text-slate-500">{p.veces_vendido} ventas</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="font-bold text-slate-800">S/ {Number(p.ingresos_total).toFixed(0)}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </motion.div>
                        )}

                        {/* Tabla de Detalle */}
                        {ventas.length > 0 && (
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden"
                            >
                                <div className="p-6 border-b border-slate-100">
                                    <h3 className="font-bold text-slate-800">Detalle de Transacciones</h3>
                                    <p className="text-sm text-slate-500">{ventas.length} registros encontrados</p>
                                </div>
                                <div className="overflow-x-auto">
                                    <table className="w-full">
                                        <thead className="bg-slate-50">
                                            <tr>
                                                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Fecha</th>
                                                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">ID</th>
                                                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Productos</th>
                                                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Pago</th>
                                                <th className="px-6 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Total</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {ventas.slice(0, 20).map((v, i) => (
                                                <tr key={v.id} className="hover:bg-slate-50 transition-colors">
                                                    <td className="px-6 py-4 text-sm text-slate-600">
                                                        {format(new Date(v.created_at), "dd/MM/yy HH:mm")}
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <span className="text-xs font-mono text-slate-400">#{v.id.slice(0, 8)}</span>
                                                    </td>
                                                    <td className="px-6 py-4 text-sm text-slate-600">
                                                        <div className="max-w-[200px]">
                                                            {v.items.map((item, idx) => (
                                                                <span key={idx} className="inline-block">
                                                                    {item.cantidad}x {item.nombre}{idx < v.items.length - 1 ? ', ' : ''}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${v.metodo_pago === 'yape' ? 'bg-purple-100 text-purple-700' :
                                                            v.metodo_pago === 'plin' ? 'bg-cyan-100 text-cyan-700' :
                                                                v.metodo_pago === 'tarjeta' ? 'bg-blue-100 text-blue-700' :
                                                                    'bg-green-100 text-green-700'
                                                            }`}>
                                                            {v.metodo_pago || 'Efectivo'}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 text-right font-bold text-slate-800">
                                                        S/ {v.total.toFixed(2)}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                                {ventas.length > 20 && (
                                    <div className="p-4 bg-slate-50 text-center text-sm text-slate-500">
                                        Mostrando 20 de {ventas.length} transacciones • Exporta para ver todas
                                    </div>
                                )}
                            </motion.div>
                        )}

                        {ventas.length === 0 && (
                            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-16 text-center">
                                <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                                    <ShoppingBag size={32} className="text-slate-400" />
                                </div>
                                <h3 className="text-xl font-bold text-slate-800 mb-2">Sin transacciones</h3>
                                <p className="text-slate-500">No hay ventas registradas en el período seleccionado</p>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}
