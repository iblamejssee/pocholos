'use client';

import Image from "next/image";
import Link from 'next/link';
import { ChefHat, ClipboardList, ShoppingCart, TrendingUp, TrendingDown, AlertCircle, Package, RotateCcw, DollarSign, Users, BarChart3, Clock, Wallet, ArrowRight, Activity, Zap, Receipt, Trash2 } from 'lucide-react';
import { useInventario } from '@/hooks/useInventario';
import { useVentas } from '@/hooks/useVentas';
import { useMetricas } from '@/hooks/useMetricas';
import GastosModal from '@/components/GastosModal';
import ProtectedRoute from '@/components/ProtectedRoute';
import { motion } from 'framer-motion';
import { formatearFraccionPollo } from '@/lib/utils';
import { useState, useEffect } from 'react';
import { resetearSistema } from '@/lib/reset';
import { supabase, obtenerFechaHoy } from '@/lib/supabase';
import toast from 'react-hot-toast';

function DashboardContent() {
  const { stock, loading, error, refetch } = useInventario();
  const { ventas, refetch: refetchVentas } = useVentas();
  const metricasReales = useMetricas(ventas);

  // Si no hay stock activo (jornada cerrada o sin apertura), mostrar métricas en 0
  const metricas = stock ? metricasReales : {
    totalIngresos: 0,
    cantidadPedidos: 0,
    promedioPorPedido: 0,
    pollosVendidos: 0,
    gaseosasVendidas: 0,
    loading: false
  };
  const [showGastosModal, setShowGastosModal] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [showBebidasDetalle, setShowBebidasDetalle] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [gastosDelDia, setGastosDelDia] = useState<{ id: string; descripcion: string; monto: number; metodo_pago?: string }[]>([]);

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
    <div className="min-h-screen p-3 sm:p-6 lg:p-8">
      {/* Header Profesional */}
      <div className="mb-4 sm:mb-8">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 sm:gap-4">
          <div className="flex items-center gap-4">
            <div className="relative w-12 h-12 hidden sm:block">
              <img src="/images/logo-pocholos-icon.png" alt="Logo" className="w-full h-full object-contain" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-slate-800 flex items-center gap-2">
                Panel de Control
              </h1>
              <p className="text-sm sm:text-base text-slate-500 capitalize">{fechaHoy}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl">
              <Clock size={16} className="text-slate-400" />
              <span className="text-slate-600 font-medium">{horaActual}</span>
            </div>
            <div className={`flex items-center gap-2 px-4 py-2 rounded-xl ${stock ? 'bg-emerald-50 border border-emerald-200' : 'bg-amber-50 border border-amber-200'}`}>
              <Activity size={16} className={stock ? 'text-emerald-500' : 'text-amber-500'} />
              <span className={`font-medium ${stock ? 'text-emerald-700' : 'text-amber-700'}`}>
                {stock ? 'Sistema operativo' : 'Sin apertura'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Alerta si no hay apertura */}
      {(!stock && !loading) && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-center gap-4"
        >
          <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center">
            <AlertCircle className="text-amber-600" size={20} />
          </div>
          <div className="flex-1">
            <p className="font-semibold text-amber-800">Apertura pendiente</p>
            <p className="text-sm text-amber-600">Realiza la apertura del día para comenzar operaciones</p>
          </div>
          <Link
            href="/apertura"
            className="flex items-center gap-2 bg-amber-500 text-white px-5 py-2.5 rounded-xl font-medium hover:bg-amber-600 transition-colors"
          >
            Apertura
            <ArrowRight size={16} />
          </Link>
        </motion.div>
      )}

      {/* Métricas Principales - Diseño Profesional */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 mb-6 sm:mb-8">
        {/* Ingresos */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white border border-slate-200 rounded-xl p-5 hover:shadow-md transition-shadow"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center">
              <DollarSign size={20} className="text-slate-600" />
            </div>
            <span className="text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full">
              +Hoy
            </span>
          </div>
          <p className="text-2xl font-bold text-slate-800">S/ {metricas.totalIngresos.toFixed(2)}</p>
          <p className="text-sm text-slate-500 mt-1">Ingresos del día</p>
        </motion.div>

        {/* Pedidos */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="bg-white border border-slate-200 rounded-xl p-5 hover:shadow-md transition-shadow"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center">
              <ShoppingCart size={20} className="text-slate-600" />
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-800">{metricas.cantidadPedidos}</p>
          <p className="text-sm text-slate-500 mt-1">Pedidos procesados</p>
        </motion.div>

        {/* Pollos */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white border border-slate-200 rounded-xl p-5 hover:shadow-md transition-shadow"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center">
              <Package size={20} className="text-slate-600" />
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-800">{formatearFraccionPollo(metricas.pollosVendidos)}</p>
          <p className="text-sm text-slate-500 mt-1">Pollos vendidos</p>
        </motion.div>

        {/* Ticket Promedio */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="bg-white border border-slate-200 rounded-xl p-5 hover:shadow-md transition-shadow"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center">
              <BarChart3 size={20} className="text-slate-600" />
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-800">S/ {metricas.promedioPorPedido.toFixed(2)}</p>
          <p className="text-sm text-slate-500 mt-1">Ticket promedio</p>
        </motion.div>
      </div>

      {/* Bóvedas - Montos por Método de Pago */}
      {stock && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6 sm:mb-8">
          {(() => {
            // Calcular montos por método (con soporte pago dividido)
            const montosPorMetodo = ventas.reduce((acc, v) => {
              if (v.estado_pago !== 'pagado') return acc;
              if (v.pago_dividido && v.metodo_pago === 'mixto') {
                for (const [metodo, monto] of Object.entries(v.pago_dividido)) {
                  if (monto && monto > 0) {
                    acc[metodo] = (acc[metodo] || 0) + monto;
                  }
                }
              } else {
                const metodo = v.metodo_pago || 'efectivo';
                acc[metodo] = (acc[metodo] || 0) + v.total;
              }
              return acc;
            }, {} as Record<string, number>);

            // Gastos en efectivo
            const gastosEfectivo = gastosDelDia
              .filter(g => !g.metodo_pago || g.metodo_pago === 'efectivo')
              .reduce((sum, g) => sum + g.monto, 0);

            const cajaChica = (stock.dinero_inicial || 0) + (montosPorMetodo['efectivo'] || 0) - gastosEfectivo;

            const bovedas = [
              {
                label: 'Caja Chica',
                monto: cajaChica,
                icon: '/images/cash-icon.png', // opcional si quieres uno personalizado
                color: 'emerald',
                desc: `Base S/${stock.dinero_inicial?.toFixed(0) || 0} + Ventas - Gastos`
              },
              {
                label: 'Yape',
                monto: montosPorMetodo['yape'] || 0,
                icon: '/images/yape-logo.png',
                color: 'purple',
                desc: 'Cobros por Yape'
              },
              {
                label: 'Plin',
                monto: montosPorMetodo['plin'] || 0,
                icon: '/images/plin-logo.png',
                color: 'cyan',
                desc: 'Cobros por Plin'
              },
              {
                label: 'Tarjeta',
                monto: montosPorMetodo['tarjeta'] || 0,
                icon: '/images/card-icon.png', // opcional
                color: 'blue',
                desc: 'Cobros por Tarjeta'
              },
            ];

            const colorMap: Record<string, { bg: string; border: string; text: string; badge: string }> = {
              emerald: { bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-700', badge: 'bg-emerald-100 text-emerald-600' },
              purple: { bg: 'bg-purple-50', border: 'border-purple-200', text: 'text-purple-700', badge: 'bg-purple-100 text-purple-600' },
              cyan: { bg: 'bg-cyan-50', border: 'border-cyan-200', text: 'text-cyan-700', badge: 'bg-cyan-100 text-cyan-600' },
              blue: { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-700', badge: 'bg-blue-100 text-blue-600' },
            };

            return bovedas.map((b, i) => {
              const c = colorMap[b.color];
              return (
                <motion.div
                  key={b.label}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 + i * 0.05 }}
                  className={`${c.bg} ${c.border} border rounded-xl p-4 hover:shadow-md transition-shadow`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="w-9 h-9 flex items-center justify-center">
                      <Image
                        src={b.icon}
                        alt={b.label}
                        width={28}
                        height={28}
                        className="object-contain"
                      />
                    </div>
                    <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${c.badge}`}>
                      {b.label}
                    </span>
                  </div>
                  <p className={`text-xl sm:text-2xl font-black ${c.text}`}>S/ {b.monto.toFixed(2)}</p>
                  <p className="text-[11px] text-slate-400 mt-1">{b.desc}</p>
                </motion.div>
              );
            });
          })()}
        </div>
      )}

      {/* Grid Principal */}
      <div className="grid lg:grid-cols-3 gap-6 mb-8">
        {/* Stock del Día */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="lg:col-span-2 bg-white border border-slate-200 rounded-xl p-6"
        >
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-slate-800">Inventario del Día</h2>
          </div>

          {loading ? (
            <div className="flex items-center justify-center h-40">
              <div className="w-8 h-8 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin"></div>
            </div>
          ) : !stock ? (
            <div className="text-center py-12 text-slate-400">
              <Package size={40} className="mx-auto mb-3 opacity-50" />
              <p>Sin datos de inventario</p>
              <p className="text-sm">Realiza la apertura del día</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="p-4 bg-slate-50 rounded-xl">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-slate-500">Pollos</span>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${(stock.pollos_disponibles / stock.pollos_iniciales) > 0.3
                      ? 'bg-emerald-100 text-emerald-700'
                      : 'bg-red-100 text-red-700'
                      }`}>
                      {Math.round((stock.pollos_disponibles / stock.pollos_iniciales) * 100)}%
                    </span>
                  </div>
                  <p className="text-xl font-bold text-slate-800">
                    {formatearFraccionPollo(stock.pollos_disponibles)}
                  </p>
                  <p className="text-xs text-slate-400">de {stock.pollos_iniciales} iniciales</p>
                </div>

                <div className="p-4 bg-slate-50 rounded-xl cursor-pointer hover:bg-blue-50 transition-colors" onClick={() => setShowBebidasDetalle(!showBebidasDetalle)}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-slate-500">Bebidas</span>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${(stock.gaseosas_disponibles / stock.gaseosas_iniciales) > 0.3
                      ? 'bg-emerald-100 text-emerald-700'
                      : 'bg-red-100 text-red-700'
                      }`}>
                      {Math.round((stock.gaseosas_disponibles / stock.gaseosas_iniciales) * 100)}%
                    </span>
                  </div>
                  <p className="text-xl font-bold text-slate-800">{stock.gaseosas_disponibles}</p>
                  <p className="text-xs text-blue-500 underline mt-1">{showBebidasDetalle ? 'Ocultar ▲' : 'Ver detalle ▼'}</p>
                </div>

                <div className="p-4 bg-slate-50 rounded-xl">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-slate-500">Base Caja</span>
                  </div>
                  <p className="text-xl font-bold text-slate-800">S/ {stock.dinero_inicial.toFixed(0)}</p>
                  <p className="text-xs text-slate-400">Dinero inicial</p>
                </div>
              </div>

              {/* Panel de Bebidas Inline — profesional */}
              {showBebidasDetalle && stock.bebidas_detalle && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="bg-slate-50 rounded-lg p-3 border border-slate-200"
                >
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {Object.entries(stock.bebidas_detalle).map(([marca, tipos]) => {
                      const MARCA_LABEL: Record<string, string> = { inca_kola: 'Inca Kola', coca_cola: 'Coca Cola', sprite: 'Sprite', fanta: 'Fanta', agua_mineral: 'Agua Mineral' };
                      const MARCA_DOT: Record<string, string> = { inca_kola: 'bg-yellow-500', coca_cola: 'bg-red-600', sprite: 'bg-green-600', fanta: 'bg-orange-500', agua_mineral: 'bg-sky-400' };
                      const TIPO_LABEL: Record<string, string> = { personal_retornable: 'Pers.', descartable: 'Desc.', gordita: 'Gordita', litro: '1L', litro_medio: '1.5L', tres_litros: '3L', mediana: '2.25L', personal: '600ml', grande: '2.5L' };
                      const total = Object.values(tipos as Record<string, number>).reduce((s, n) => s + n, 0);
                      return (
                        <div key={marca} className="bg-white rounded-md p-2.5 border border-slate-150">
                          <div className="flex items-center gap-1.5 mb-1.5 pb-1.5 border-b border-slate-100">
                            <span className={`w-2 h-2 rounded-full ${MARCA_DOT[marca] || 'bg-gray-400'}`}></span>
                            <span className="text-[11px] font-semibold text-slate-600">{MARCA_LABEL[marca] || marca}</span>
                            <span className={`ml-auto text-xs font-bold ${total > 0 ? 'text-slate-800' : 'text-red-500'}`}>{total}</span>
                          </div>
                          <div className="space-y-0.5">
                            {Object.entries(tipos as Record<string, number>).map(([tipo, qty]) => (
                              <div key={tipo} className="flex justify-between text-[11px]">
                                <span className={qty === 0 ? 'text-red-400 line-through' : 'text-slate-500'}>{TIPO_LABEL[tipo] || tipo}</span>
                                <span className={`font-semibold ${qty === 0 ? 'text-red-400' : 'text-slate-700'}`}>{qty}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </motion.div>
              )}

              {/* Barra de Progreso */}
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-slate-600">Stock de pollos</span>
                  <span className="text-slate-500">{formatearFraccionPollo(stock.pollos_disponibles)} / {stock.pollos_iniciales}</span>
                </div>
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${(stock.pollos_disponibles / stock.pollos_iniciales) > 0.5
                      ? 'bg-emerald-500'
                      : (stock.pollos_disponibles / stock.pollos_iniciales) > 0.2
                        ? 'bg-amber-500'
                        : 'bg-red-500'
                      }`}
                    style={{ width: `${(stock.pollos_disponibles / stock.pollos_iniciales) * 100}%` }}
                  ></div>
                </div>
              </div>
            </div>
          )}
        </motion.div>

        {/* Acciones Rápidas */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="bg-white border border-slate-200 rounded-xl p-6"
        >
          <h2 className="text-lg font-semibold text-slate-800 mb-4">Acciones</h2>
          <div className="space-y-3">
            <Link
              href="/pos"
              className="flex items-center gap-3 p-3 bg-slate-800 text-white rounded-xl hover:bg-slate-700 transition-colors"
            >
              <div className="w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center">
                <ShoppingCart size={20} />
              </div>
              <div className="flex-1">
                <p className="font-medium">Pedidos</p>
                <p className="text-xs text-white/60">Nueva venta</p>
              </div>
              <ArrowRight size={18} className="opacity-50" />
            </Link>

            <Link
              href="/apertura"
              className="flex items-center gap-3 p-3 bg-slate-50 border border-slate-200 rounded-xl hover:bg-slate-100 transition-colors"
            >
              <div className="w-10 h-10 bg-white rounded-lg border border-slate-200 flex items-center justify-center">
                <ClipboardList size={20} className="text-slate-600" />
              </div>
              <div className="flex-1">
                <p className="font-medium text-slate-800">Apertura</p>
                <p className="text-xs text-slate-500">Configurar día</p>
              </div>
              <ArrowRight size={18} className="text-slate-400" />
            </Link>

            <Link
              href="/cocina"
              className="flex items-center gap-3 p-3 bg-slate-50 border border-slate-200 rounded-xl hover:bg-slate-100 transition-colors"
            >
              <div className="w-10 h-10 bg-white rounded-lg border border-slate-200 flex items-center justify-center">
                <ChefHat size={20} className="text-slate-600" />
              </div>
              <div className="flex-1">
                <p className="font-medium text-slate-800">Cocina</p>
                <p className="text-xs text-slate-500">Ver pedidos</p>
              </div>
              <ArrowRight size={18} className="text-slate-400" />
            </Link>
          </div>
        </motion.div>
      </div>

      {/* Sección Inferior */}
      <div className="grid lg:grid-cols-2 gap-6 mb-8">
        {/* Resumen Financiero */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-white border border-slate-200 rounded-xl p-6"
        >
          <h2 className="text-lg font-semibold text-slate-800 mb-4">Resumen Financiero</h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between py-3 border-b border-slate-100">
              <span className="text-slate-600">Ingresos del día</span>
              <span className="font-semibold text-slate-800">S/ {metricas.totalIngresos.toFixed(2)}</span>
            </div>
            <div className="flex items-center justify-between py-3 border-b border-slate-100">
              <span className="text-slate-600">Base de caja</span>
              <span className="font-semibold text-slate-800">S/ {stock?.dinero_inicial?.toFixed(2) || '0.00'}</span>
            </div>
            <div className="flex items-center justify-between py-3 border-b border-slate-100">
              <span className="text-slate-600">Ticket promedio</span>
              <span className="font-semibold text-slate-800">S/ {metricas.promedioPorPedido.toFixed(2)}</span>
            </div>
            <div className="flex items-center justify-between py-3">
              <span className="text-slate-600 font-medium">Total en caja</span>
              <span className="font-bold text-lg text-emerald-600">
                S/ {((stock?.dinero_inicial || 0) + metricas.totalIngresos).toFixed(2)}
              </span>
            </div>
          </div>
        </motion.div>

        {/* Accesos Administrativos */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45 }}
          className="bg-white border border-slate-200 rounded-xl p-6"
        >
          <h2 className="text-lg font-semibold text-slate-800 mb-4">Administración</h2>
          <div className="grid grid-cols-2 gap-3">
            <Link
              href="/reportes"
              className="flex flex-col items-center justify-center p-4 bg-slate-50 border border-slate-200 rounded-xl hover:bg-slate-100 transition-colors text-center"
            >
              <BarChart3 size={24} className="text-slate-600 mb-2" />
              <span className="font-medium text-slate-800 text-sm">Reportes</span>
            </Link>

            <Link
              href="/ventas"
              className="flex flex-col items-center justify-center p-4 bg-slate-50 border border-slate-200 rounded-xl hover:bg-slate-100 transition-colors text-center"
            >
              <Package size={24} className="text-slate-600 mb-2" />
              <span className="font-medium text-slate-800 text-sm">Ventas</span>
            </Link>

            <Link
              href="/cierre"
              className="flex flex-col items-center justify-center p-4 bg-slate-50 border border-slate-200 rounded-xl hover:bg-slate-100 transition-colors text-center"
            >
              <Wallet size={24} className="text-slate-600 mb-2" />
              <span className="font-medium text-slate-800 text-sm">Cierre</span>
            </Link>
          </div>

          {/* Botón de Gastos */}
          <button
            onClick={() => setShowGastosModal(true)}
            className="w-full mt-4 flex items-center justify-center gap-2 p-3 bg-slate-800 text-white rounded-xl hover:bg-slate-700 transition-colors font-medium"
          >
            <DollarSign size={18} />
            Registrar Gasto
          </button>

          {/* Lista de Gastos del Día */}
          {gastosDelDia.length > 0 && (
            <div className="mt-4 p-4 bg-red-50 border border-red-100 rounded-xl">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Receipt size={16} className="text-red-600" />
                  <span className="font-medium text-red-700 text-sm">Gastos del Día</span>
                </div>
                <span className="font-bold text-red-600">S/ {totalGastos.toFixed(2)}</span>
              </div>
              <div className="space-y-2 max-h-32 overflow-y-auto">
                {gastosDelDia.map((gasto) => (
                  <div key={gasto.id} className="flex justify-between items-center text-sm bg-white px-3 py-2 rounded-lg">
                    <div>
                      <span className="text-slate-700">{gasto.descripcion}</span>
                      {gasto.metodo_pago && (
                        <span className="ml-2 text-xs text-slate-400">({gasto.metodo_pago})</span>
                      )}
                    </div>
                    <span className="font-medium text-red-600">S/ {gasto.monto.toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </motion.div>
      </div>

      {/* Modal de Gastos */}
      {showGastosModal && (
        <GastosModal
          isOpen={showGastosModal}
          onClose={() => setShowGastosModal(false)}
          onGastoRegistrado={cargarGastos}
        />
      )}

      {/* Modal de Reset */}
      {showResetConfirm && (
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
      )}
    </div>
  );
}

export default function Home() {
  return (
    <ProtectedRoute requiredPermission="dashboard">
      <DashboardContent />
    </ProtectedRoute>
  );
}
