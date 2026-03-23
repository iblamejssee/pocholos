'use client';

import Image from "next/image";
import Link from 'next/link';
import { ChefHat, ClipboardList, ShoppingCart, TrendingUp, TrendingDown, AlertCircle, Package, RotateCcw, DollarSign, Users, BarChart3, Clock, Wallet, ArrowRight, Activity, Zap, Receipt, Trash2, Lock as LockIcon } from 'lucide-react';
import { useInventario } from '@/hooks/useInventario';
import { useVentas } from '@/hooks/useVentas';
import { useMetricas } from '@/hooks/useMetricas';
import GastosModal from '@/components/GastosModal';
import ProtectedRoute from '@/components/ProtectedRoute';
import { motion, AnimatePresence } from 'framer-motion';
import { formatearFraccionProducto } from '@/lib/utils';
import { useState, useEffect } from 'react';
import { resetearSistema } from '@/lib/reset';
import { supabase, obtenerFechaHoy } from '@/lib/supabase';
import toast from 'react-hot-toast';
import AdminAjusteModal from '@/components/AdminAjusteModal';
import { useAuth } from '@/contexts/AuthContext';

function DashboardContent() {
  const { stock, loading, error, refetch } = useInventario();
  const { ventas, refetch: refetchVentas } = useVentas();
  const metricasReales = useMetricas(ventas);

  // Si no hay stock activo (jornada cerrada o sin apertura), mostrar métricas en 0
  const metricas = stock ? metricasReales : {
    totalIngresos: 0,
    cantidadPedidos: 0,
    promedioPorPedido: 0,
    platosVendidos: 0,
    gaseosasVendidas: 0,
    loading: false
  };
  const [showGastosModal, setShowGastosModal] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [showBebidasDetalle, setShowBebidasDetalle] = useState(false);
  const [showAdminAjusteModal, setShowAdminAjusteModal] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [gastosDelDia, setGastosDelDia] = useState<{ id: string; descripcion: string; monto: number; metodo_pago?: string }[]>([]);
  const { user } = useAuth();

  // Cargar gastos del día
  const cargarGastos = async () => {
    const { data } = await supabase
      .from('gastos')
      .select('id, descripcion, monto, metodo_pago')
      .eq('fecha', obtenerFechaHoy())
      .order('created_at', { ascending: false });
    setGastosDelDia(data || []);
  };

  useEffect(() => {
    cargarGastos();
  }, []);

  const totalGastos = gastosDelDia.reduce((sum, g) => sum + g.monto, 0);

  const handleReset = async () => {
    setResetting(true);
    const resultado = await resetearSistema();

    if (resultado.success) {
      toast.success(resultado.message, { duration: 4000 });
      refetch();
      refetchVentas();
      setShowResetConfirm(false);
    } else {
      toast.error(resultado.message, { duration: 5000 });
    }

    setResetting(false);
  };

  const fechaHoy = new Date().toLocaleDateString('es-PE', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });

  const horaActual = new Date().toLocaleTimeString('es-PE', {
    hour: '2-digit',
    minute: '2-digit'
  });
  return (
    <div className="min-h-screen pb-20 px-4 sm:px-6 lg:px-8">
      {/* Header Profesional */}
      <div className="py-6 sm:py-8">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">

          <div className="flex items-center gap-5">

            {/* LOGO SIN CUADRO */}
            <div className="relative w-16 h-16 group">
              <img
                src="/images/contro-logo.png"
                alt="Logo"
                className="w-full h-full object-contain transition-transform duration-500 group-hover:scale-110"
              />
            </div>

            <div>
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-thebear-dark-blue flex items-center gap-2 tracking-tighter">
                Panel de Control
              </h1>

              <div className="flex items-center gap-2 mt-1">
                <p className="text-sm sm:text-base text-thebear-blue/70 font-bold capitalize">
                  {fechaHoy}
                </p>

                <span className="w-1 h-1 rounded-full bg-thebear-light-blue"></span>

                <div className="flex items-center gap-1.5 px-2 py-0.5 bg-thebear-cream/50 rounded-lg border border-thebear-light-blue/30">
                  <Clock size={12} className="text-thebear-blue" />
                  <span className="text-[11px] font-black text-thebear-blue">
                    {horaActual}
                  </span>
                </div>
              </div>
            </div>

          </div>

          {/* ESTADO */}
          <div className="flex items-center gap-3">
            <div className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl shadow-sm border-2 ${stock
              ? 'bg-white border-emerald-100 text-emerald-700'
              : 'bg-white border-amber-100 text-amber-700'
              }`}>
              <div className={`w-2.5 h-2.5 rounded-full animate-pulse ${stock ? 'bg-emerald-500' : 'bg-amber-500'
                }`}></div>

              <span className="font-black text-xs uppercase tracking-widest">
                {stock ? 'Bahía Abierta' : 'Sin Apertura'}
              </span>
            </div>
          </div>

        </div>
      </div>
      {/* Alerta si no hay apertura */}
      {
        (!stock && !loading) && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="mb-8 p-1 bg-gradient-to-r from-amber-400 to-orange-500 rounded-3xl shadow-lg overflow-hidden"
          >
            <div className="bg-white/95 backdrop-blur-sm p-6 rounded-[22px] flex flex-col md:flex-row items-center gap-6">
              <div className="w-14 h-14 bg-amber-100 rounded-2xl flex items-center justify-center shrink-0">
                <AlertCircle className="text-amber-600" size={28} />
              </div>
              <div className="flex-1 text-center md:text-left">
                <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight">FALTA APERTURAR</h3>
                <p className="text-slate-600 font-medium">Inicia la jornada para registrar el stock de pescado y caja inicial.</p>
              </div>
              <Link
                href="/apertura"
                className="w-full md:w-auto overflow-hidden relative group ocean-button-primary bg-amber-500 hover:bg-amber-600"
              >
                <span className="relative z-10 flex items-center gap-2">
                  Ir a Apertura
                  <ArrowRight size={18} />
                </span>
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
              </Link>
            </div>
          </motion.div>
        )
      }

      {/* Métricas Principales */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {/* Ingresos */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="ocean-card border-l-4 border-l-thebear-blue p-4 sm:p-6"
        >
          <div className="flex items-center justify-between mb-2 sm:mb-4">
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-thebear-cream rounded-xl sm:rounded-2xl flex items-center justify-center shadow-inner">
              <DollarSign size={20} className="sm:text-2xl text-thebear-blue" />
            </div>
            <span className="ocean-badge bg-emerald-100 text-emerald-600 hidden sm:inline-block">Ventas</span>
          </div>
          <p className="text-xl sm:text-3xl font-black text-thebear-dark-blue tracking-tighter">S/ {metricas.totalIngresos.toFixed(2)}</p>
          <p className="text-[10px] sm:text-xs font-bold text-thebear-blue/50 uppercase tracking-widest mt-1">Ingresos de Hoy</p>
        </motion.div>

        {/* Pedidos */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="ocean-card border-l-4 border-l-thebear-light-blue p-4 sm:p-6"
        >
          <div className="flex items-center justify-between mb-2 sm:mb-4">
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-thebear-cream rounded-xl sm:rounded-2xl flex items-center justify-center shadow-inner">
              <ShoppingCart size={20} className="sm:text-2xl text-thebear-blue" />
            </div>
            <span className="ocean-badge bg-blue-100 text-blue-600 hidden sm:inline-block">Ordenes</span>
          </div>
          <p className="text-xl sm:text-3xl font-black text-thebear-dark-blue tracking-tighter">{metricas.cantidadPedidos}</p>
          <p className="text-[10px] sm:text-xs font-bold text-thebear-blue/50 uppercase tracking-widest mt-1">Pedidos Servidos</p>
        </motion.div>

        {/* Platos */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="ocean-card border-l-4 border-l-thebear-blue p-4 sm:p-6"
        >
          <div className="flex items-center justify-between mb-2 sm:mb-4">
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-thebear-cream rounded-xl sm:rounded-2xl flex items-center justify-center shadow-inner">
              <ChefHat size={20} className="sm:text-2xl text-thebear-blue" />
            </div>
            <span className="ocean-badge bg-cyan-100 text-cyan-600 hidden sm:inline-block">Cocina</span>
          </div>
          <p className="text-xl sm:text-3xl font-black text-thebear-dark-blue tracking-tighter">{formatearFraccionProducto(metricas.platosVendidos)}</p>
          <p className="text-[10px] sm:text-xs font-bold text-thebear-blue/50 uppercase tracking-widest mt-1">Platos Vendidos</p>
        </motion.div>

        {/* Ticket Promedio */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="ocean-card border-l-4 border-l-thebear-light-blue p-4 sm:p-6"
        >
          <div className="flex items-center justify-between mb-2 sm:mb-4">
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-thebear-cream rounded-xl sm:rounded-2xl flex items-center justify-center shadow-inner">
              <Activity size={20} className="sm:text-2xl text-thebear-blue" />
            </div>
            <span className="ocean-badge bg-indigo-100 text-indigo-600 hidden sm:inline-block">Ticket</span>
          </div>
          <p className="text-xl sm:text-3xl font-black text-thebear-dark-blue tracking-tighter">S/ {metricas.promedioPorPedido.toFixed(2)}</p>
          <p className="text-[10px] sm:text-xs font-bold text-thebear-blue/50 uppercase tracking-widest mt-1">Promedio por Mesa</p>
        </motion.div>
      </div>

      {/* Bóvedas - Montos por Método de Pago */}
      {
        stock && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {(() => {
              const montosPorMetodo = ventas.reduce((acc, v) => {
                if (v.estado_pago !== 'pagado') return acc;
                if (v.pago_dividido && v.metodo_pago === 'mixto') {
                  for (const [metodo, monto] of Object.entries(v.pago_dividido)) {
                    if (monto && monto > 0) acc[metodo] = (acc[metodo] || 0) + monto;
                  }
                } else {
                  const metodo = v.metodo_pago || 'efectivo';
                  acc[metodo] = (acc[metodo] || 0) + v.total;
                }
                return acc;
              }, {} as Record<string, number>);

              const gastosEfectivo = gastosDelDia.filter(g => !g.metodo_pago || g.metodo_pago === 'efectivo').reduce((sum, g) => sum + g.monto, 0);
              const gastosYape = gastosDelDia.filter(g => g.metodo_pago === 'yape').reduce((sum, g) => sum + g.monto, 0);
              const gastosPlin = gastosDelDia.filter(g => g.metodo_pago === 'plin').reduce((sum, g) => sum + g.monto, 0);
              const cajaChica = (stock.dinero_inicial || 0) + (montosPorMetodo['efectivo'] || 0) - gastosEfectivo;

              const bovedas = [
                { label: 'Caja Chica', monto: cajaChica, icon: '/images/cash-icon.png', color: 'bg-emerald-500', desc: 'Soles físicos' },
                { label: 'Yape', monto: (montosPorMetodo['yape'] || 0) - gastosYape, icon: '/images/yape-logo.png', color: 'bg-purple-600', desc: 'Digital' },
                { label: 'Plin', monto: (montosPorMetodo['plin'] || 0) - gastosPlin, icon: '/images/plin-logo.png', color: 'bg-cyan-500', desc: 'Digital' },
                { label: 'Tarjeta', monto: montosPorMetodo['tarjeta'] || 0, icon: '/images/card-icon.png', color: 'bg-blue-600', desc: 'Pos' },
              ];

              return bovedas.map((b, i) => (
                <motion.div
                  key={b.label}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.4 + i * 0.05 }}
                  className="ocean-card group hover:scale-[1.02] p-3 sm:p-5"
                >
                  <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-3">
                    <div className="w-8 h-8 sm:w-10 sm:h-10 relative flex items-center justify-center shrink-0">
                      <Image src={b.icon} alt={b.label} fill className="object-contain" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-thebear-blue/50 truncate">{b.label}</p>
                      <div className={`h-0.5 sm:h-1 w-full bg-slate-100 rounded-full mt-1 overflow-hidden`}>
                        <div className={`h-full ${b.color}`} style={{ width: '40%' }}></div>
                      </div>
                    </div>
                  </div>
                  <p className="text-lg sm:text-2xl font-black text-thebear-dark-blue tracking-tighter">S/ {b.monto.toFixed(2)}</p>
                  <p className="text-[8px] sm:text-[10px] text-slate-400 font-bold mt-0.5 sm:mt-1 uppercase tracking-tighter truncate">{b.desc}</p>
                </motion.div>
              ));
            })()}
          </div>
        )
      }

      {/* Grid Principal */}
      <div className="grid lg:grid-cols-3 gap-8">
        {/* Inventario */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="lg:col-span-2 ocean-card"
        >
          <div className="flex items-center justify-between mb-8 pb-4 border-b border-thebear-cream/30">
            <h2 className="text-xl font-black text-thebear-dark-blue uppercase tracking-tight flex items-center gap-2">
              <Package size={20} className="text-thebear-blue" />
              Inventario del día
            </h2>
            <div className="flex items-center gap-2 bg-thebear-blue/5 px-4 py-2 rounded-xl border border-thebear-blue/10">
              <span className="text-[10px] font-black text-thebear-blue uppercase">Estado</span>
              <span className="w-2 h-2 rounded-full bg-thebear-light-blue animate-pulse"></span>
            </div>
          </div>

          {!stock ? (
            <div className="text-center py-20">
              <div className="w-20 h-20 bg-thebear-cream rounded-full flex items-center justify-center mx-auto mb-4 border-2 border-dashed border-thebear-blue/20">
                <Package size={32} className="text-thebear-blue/30" />
              </div>
              <p className="font-black text-thebear-dark-blue/30 uppercase tracking-widest">Esperando Apertura</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Platos Card */}
              <div className="p-6 bg-gradient-to-br from-white to-thebear-cream/20 rounded-3xl border border-thebear-cream shadow-sm">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <p className="text-xs font-black text-thebear-blue/60 uppercase tracking-widest mb-1">Ceviches / Platos</p>
                    <p className="text-3xl font-black text-thebear-dark-blue tracking-tighter">
                      {formatearFraccionProducto(stock.platos_disponibles)}
                    </p>
                  </div>
                  <div className={`p-2 rounded-xl ${(stock.platos_disponibles / (stock.platos_iniciales || 1)) > 0.3 ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'}`}>
                    <ChefHat size={20} />
                  </div>
                </div>
                <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden mb-2">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${(stock.platos_disponibles / stock.platos_iniciales) * 100}%` }}
                    className={`h-full rounded-full ${(stock.platos_disponibles / stock.platos_iniciales) > 0.3 ? 'bg-emerald-500' : 'bg-red-500'}`}
                  />
                </div>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">
                  Quedan {formatearFraccionProducto(stock.platos_disponibles)} de {stock.platos_iniciales} {stock.platos_dia > 0 ? 'preparados' : 'estimados (según pescado)'}
                </p>
              </div>

              {/* Chicha Card */}
              <div className="p-6 bg-gradient-to-br from-white to-thebear-cream/20 rounded-3xl border border-thebear-cream shadow-sm">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <p className="text-xs font-black text-thebear-blue/60 uppercase tracking-widest mb-1">Bebida de la Casa</p>
                    <p className="text-3xl font-black text-thebear-dark-blue tracking-tighter">
                      {(stock.chicha_disponible || 0).toFixed(1)}L
                    </p>
                  </div>
                  <div className="p-2 rounded-xl bg-purple-100 text-purple-600 uppercase font-black text-[10px]">Chicha</div>
                </div>
                <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden mb-2">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${((stock.chicha_disponible || 0) / (stock.chicha_inicial || 1)) * 100}%` }}
                    className="bg-purple-500 h-full rounded-full"
                  />
                </div>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">Stock fresco: {(stock.chicha_disponible || 0).toFixed(1)} Litros</p>
              </div>

              {/* Insumos Card */}
              <div className="md:col-span-2 lg:col-span-2 p-6 bg-gradient-to-br from-white to-amber-50 rounded-3xl border border-amber-100 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-amber-100 rounded-2xl flex items-center justify-center shadow-inner">
                    <span className="text-2xl">🐟</span>
                  </div>
                  <div>
                    <p className="text-xs font-black text-amber-600/60 uppercase tracking-widest mb-1">Insumo Base</p>
                    <p className="text-3xl font-black text-amber-900 tracking-tighter">
                      {(stock.insumos_detalle_disponible?.pescado || 0).toFixed(2)} <span className="text-base text-amber-700/50">Kg</span>
                    </p>
                  </div>
                </div>
                <div className="flex flex-col gap-2 min-w-[200px]">
                  <div className="flex justify-between text-[10px] font-black uppercase text-amber-700/70">
                    <span>Pescado Neto</span>
                    <span>{(stock.insumos_detalle_inicial?.pescado || 0).toFixed(2)} Kg</span>
                  </div>
                  <div className="w-full h-2 bg-amber-200/50 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${((stock.insumos_detalle_disponible?.pescado || 0) / (stock.insumos_detalle_inicial?.pescado || 1)) * 100}%` }}
                      className={`h-full rounded-full ${((stock.insumos_detalle_disponible?.pescado || 0) / (stock.insumos_detalle_inicial?.pescado || 1)) > 0.2 ? 'bg-amber-500' : 'bg-red-500'}`}
                    />
                  </div>
                  <p className="text-[9px] text-amber-600/60 font-bold uppercase tracking-tight text-right">
                    Quedan {(stock.insumos_detalle_disponible?.pescado || 0).toFixed(2)} Kg
                  </p>
                </div>
              </div>

              {/* Bebidas Detalle */}
              <div className="md:col-span-2">
                <button
                  onClick={() => setShowBebidasDetalle(!showBebidasDetalle)}
                  className="w-full flex items-center justify-between p-4 bg-thebear-dark-blue text-white rounded-2xl hover:bg-thebear-blue transition-all"
                >
                  <div className="flex items-center gap-3">
                    <Package size={20} className="text-thebear-light-blue" />
                    <span className="font-black text-sm uppercase tracking-widest">Inventario de Bebidas</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-white/60">{stock.gaseosas_disponibles} Unidades</span>
                    <ArrowRight size={18} className={`transition-transform duration-300 ${showBebidasDetalle ? 'rotate-90' : ''}`} />
                  </div>
                </button>

                <AnimatePresence>
                  {showBebidasDetalle && (
                    <motion.div
                      initial={{ opacity: 0, y: -10, height: 0 }}
                      animate={{ opacity: 1, y: 0, height: 'auto' }}
                      exit={{ opacity: 0, y: -10, height: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-4">
                        {Object.entries(stock.bebidas_detalle || {}).map(([marca, tipos]) => {
                          const MARCA_LABEL: any = { inca_kola: 'Inca Kola', coca_cola: 'Coca Cola', sprite: 'Sprite', fanta: 'Fanta', agua_mineral: 'Agua Mineral' };
                          const tiposRecord = tipos as Record<string, number>;
                          const total = Object.values(tiposRecord).reduce((s, n) => s + n, 0);
                          return (
                            <div key={marca} className="ocean-card p-4">
                              <p className="text-[10px] font-black uppercase text-thebear-blue mb-1">{MARCA_LABEL[marca] || marca}</p>
                              <p className="text-xl font-black text-thebear-dark-blue mb-3">{total}</p>
                              <div className="space-y-1">
                                {Object.entries(tiposRecord || {}).map(([tipo, qty]) => (
                                  <div key={tipo} className="flex justify-between text-[9px] border-b border-thebear-cream/30 pb-0.5 last:border-0">
                                    <span className="text-slate-500 font-bold uppercase">{tipo.split('_')[0]}</span>
                                    <span className="font-black text-thebear-blue">{qty}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          )}
        </motion.div>

        {/* Acciones Rápidas */}
        <div className="space-y-6">
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="ocean-card bg-gradient-to-br from-thebear-blue to-thebear-dark-blue border-0 h-full"
          >
            <h2 className="text-xl font-black text-white uppercase tracking-tight mb-6 flex items-center gap-2">
              <Zap size={20} className="text-thebear-light-blue" />
              Acciones de Mando
            </h2>
            <div className="space-y-4">
              <Link href="/pos" className="group ocean-button-primary bg-white/10 hover:bg-white/20 border-2 border-white/20 px-4 py-5 rounded-2xl flex justify-between items-center transition-all">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-thebear-blue shadow-lg group-hover:scale-110 transition-transform">
                    <ShoppingCart size={24} />
                  </div>
                  <div className="text-left">
                    <p className="font-black text-white uppercase tracking-widest text-sm">Nuevo Pedido</p>
                    <p className="text-xs text-white/50 font-bold">Ir al Punto de Venta</p>
                  </div>
                </div>
                <div className="bg-thebear-light-blue/20 p-2 rounded-xl group-hover:bg-thebear-light-blue transition-colors group-hover:text-thebear-dark-blue">
                  <ArrowRight size={20} />
                </div>
              </Link>

              <Link href="/apertura" className="group ocean-button-primary bg-white/5 hover:bg-white/10 border-2 border-white/10 px-4 py-5 rounded-2xl flex justify-between items-center transition-all">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-linear-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-white shadow-lg shadow-emerald-500/20">
                    <Package size={20} />
                  </div>
                  <div className="text-left">
                    <p className="font-black text-white uppercase tracking-widest text-sm">Apertura</p>
                    <p className="text-xs text-white/40 font-bold">Configurar el día</p>
                  </div>
                </div>
                <div className="bg-white/5 p-2 rounded-xl group-hover:bg-white/20">
                  <ArrowRight size={20} />
                </div>
              </Link>

              <Link href="/cocina" className="group ocean-button-primary bg-white/5 hover:bg-white/10 border-2 border-white/10 px-4 py-5 rounded-2xl flex justify-between items-center transition-all">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-white shadow-sm border border-thebear-cream/30 rounded-xl flex items-center justify-center text-thebear-blue group-hover:scale-110 transition-transform">
                    <LockIcon size={20} />
                  </div>
                  <div className="text-left">
                    <p className="font-black text-white uppercase tracking-widest text-sm">Cocina</p>
                    <p className="text-xs text-white/40 font-bold">Ver órdenes activas</p>
                  </div>
                </div>
                <div className="bg-white/5 p-2 rounded-xl group-hover:bg-white/20">
                  <ArrowRight size={20} />
                </div>
              </Link>
            </div>

            <div className="mt-8 pt-6 border-t border-white/10">
              <p className="text-[10px] font-black text-thebear-light-blue uppercase tracking-[0.2em] text-center">The Bear POS • Freshness Control</p>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Resumen de Caja y Administración */}
      <div className="grid lg:grid-cols-2 gap-8 mt-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="ocean-card"
        >
          <div className="flex items-center justify-between mb-8 pb-4 border-b border-thebear-cream/30">
            <h2 className="text-xl font-black text-thebear-dark-blue uppercase tracking-tight flex items-center gap-2">
              <Wallet size={20} className="text-thebear-blue" />
              Consolidado de Caja
            </h2>
            <span className="ocean-badge bg-emerald-100 text-emerald-600 font-black">En Línea</span>
          </div>

          <div className="space-y-4">
            <div className="flex justify-between items-center p-4 bg-thebear-cream/20 rounded-2xl border border-thebear-cream/50">
              <span className="text-sm font-bold text-thebear-blue/70">Ingresos Totales (Hoy)</span>
              <span className="text-xl font-black text-thebear-dark-blue tracking-tighter">S/ {metricas.totalIngresos.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center p-4 bg-white rounded-2xl border border-slate-100 italic">
              <span className="text-sm font-bold text-slate-400">Base Inicial de Caja</span>
              <span className="text-lg font-black text-slate-400 tracking-tighter">S/ {stock?.dinero_inicial?.toFixed(2) || '0.00'}</span>
            </div>
            <div className="flex justify-center py-4 relative">
              <div className="absolute inset-x-0 top-1/2 h-0.5 bg-gradient-to-r from-transparent via-thebear-cream to-transparent"></div>
              <div className="relative z-10 bg-white px-8 py-4 rounded-3xl border-4 border-thebear-blue shadow-xl">
                <p className="text-[10px] font-black text-thebear-blue uppercase tracking-widest text-center mb-1">Total Consolidado</p>
                <p className="text-4xl font-black ocean-gradient-text tracking-tighter">S/ {((stock?.dinero_inicial || 0) + metricas.totalIngresos).toFixed(2)}</p>
              </div>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="ocean-card flex flex-col"
        >
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-black text-thebear-dark-blue uppercase tracking-tight">Administración</h2>
            <div className="flex gap-2">
              <button
                onClick={() => setShowGastosModal(true)}
                className="bg-thebear-dark-blue text-white p-3 rounded-2xl shadow-lg hover:bg-thebear-blue transition-all"
              >
                <span className="text-lg font-black leading-none">+ S/</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4 mb-6">
            <Link href="/reportes" className="ocean-card group p-4 flex flex-col items-center justify-center hover:bg-thebear-blue text-thebear-blue hover:text-white border border-thebear-cream shadow-sm">
              <BarChart3 size={24} className="mb-2 group-hover:scale-110 transition-transform" />
              <span className="text-[10px] font-black uppercase tracking-tight">Reportes</span>
            </Link>
            <Link href="/ventas" className="ocean-card group p-4 flex flex-col items-center justify-center hover:bg-thebear-blue text-thebear-blue hover:text-white border border-thebear-cream shadow-sm">
              <Receipt size={24} className="mb-2 group-hover:scale-110 transition-transform" />
              <span className="text-[10px] font-black uppercase tracking-tight">Ventas</span>
            </Link>
            <Link href="/cierre" className="ocean-card group p-4 flex flex-col items-center justify-center hover:bg-thebear-blue text-thebear-blue hover:text-white border border-thebear-cream shadow-sm">
              <LockIcon size={24} className="mb-2 group-hover:scale-110 transition-transform" />
              <span className="text-[10px] font-black uppercase tracking-tight">Cierre</span>
            </Link>
          </div>

          <div className="flex-1">
            {gastosDelDia.length > 0 ? (
              <div className="bg-red-50/50 rounded-3xl p-6 border-2 border-red-100 flex-1">
                <div className="flex justify-between items-center mb-4 pb-2 border-b border-red-200">
                  <span className="text-sm font-black text-red-700 uppercase tracking-widest flex items-center gap-2">
                    <TrendingDown size={16} />
                    Gastos Salientes
                  </span>
                  <span className="text-xl font-black text-red-600 tracking-tighter">S/ {totalGastos.toFixed(2)}</span>
                </div>
                <div className="space-y-2 max-h-40 overflow-y-auto pr-2 custom-scrollbar">
                  {gastosDelDia.map(g => (
                    <div key={g.id} className="flex justify-between items-center bg-white/80 p-3 rounded-xl border border-red-100 group">
                      <div>
                        <p className="text-xs font-bold text-slate-700 group-hover:text-red-700 transition-colors uppercase">{g.descripcion}</p>
                        <p className="text-[9px] font-bold text-slate-400 tracking-widest uppercase">{g.metodo_pago || 'efectivo'}</p>
                      </div>
                      <p className="text-sm font-black text-red-600 tracking-tighter">S/ {g.monto.toFixed(2)}</p>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200 p-8">
                <Receipt size={32} className="text-slate-200 mb-2" />
                <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Sin Gastos Registrados</p>
              </div>
            )}
          </div>
        </motion.div>
      </div>

      {/* Modal de Gastos */}
      {
        showGastosModal && (
          <GastosModal
            isOpen={showGastosModal}
            onClose={() => setShowGastosModal(false)}
            onGastoRegistrado={cargarGastos}
          />
        )
      }

      {/* Modal de Ajuste Administrativo */}
      {
        showAdminAjusteModal && (
          <AdminAjusteModal
            isOpen={showAdminAjusteModal}
            onClose={() => setShowAdminAjusteModal(false)}
            onSuccess={() => {
              refetch();
              refetchVentas();
            }}
          />
        )
      }

      {/* Modal de Reset */}
      {
        showResetConfirm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-white rounded-xl p-6 max-w-md w-full"
            >
              <h3 className="text-xl font-bold text-slate-800 mb-2">¿Reiniciar sistema?</h3>
              <p className="text-slate-600 mb-6">
                Esto eliminará todas las ventas del día y reiniciará el inventario. Esta acción no se puede deshacer.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowResetConfirm(false)}
                  className="flex-1 px-4 py-2.5 bg-slate-100 text-slate-700 rounded-lg font-medium hover:bg-slate-200 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleReset}
                  disabled={resetting}
                  className="flex-1 px-4 py-2.5 bg-red-500 text-white rounded-lg font-medium hover:bg-red-600 transition-colors disabled:opacity-50"
                >
                  {resetting ? 'Procesando...' : 'Confirmar Reset'}
                </button>
              </div>
            </motion.div>
          </div>
        )
      }
    </div >
  );
}

export default function Home() {
  return (
    <ProtectedRoute requiredPermission="dashboard">
      <DashboardContent />
    </ProtectedRoute>
  );
}
