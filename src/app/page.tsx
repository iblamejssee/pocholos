'use client';

import Link from 'next/link';
import { ChefHat, ClipboardList, ShoppingCart, TrendingUp, TrendingDown, AlertCircle, Package, RotateCcw, DollarSign, Users, BarChart3, Clock, Wallet, ArrowRight, Activity, Zap } from 'lucide-react';
import { useInventario } from '@/hooks/useInventario';
import { useVentas } from '@/hooks/useVentas';
import { useMetricas } from '@/hooks/useMetricas';
import GastosModal from '@/components/GastosModal';
import ProtectedRoute from '@/components/ProtectedRoute';
import { motion } from 'framer-motion';
import { formatearFraccionPollo } from '@/lib/utils';
import { useState } from 'react';
import { resetearSistema } from '@/lib/reset';
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
  const [resetting, setResetting] = useState(false);

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
          <div>
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-slate-800">
              Panel de Control
            </h1>
            <p className="text-sm sm:text-base text-slate-500 capitalize">{fechaHoy}</p>
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
            {stock && (
              <span className="text-xs text-slate-400">
                Última actualización hace {Math.floor((Date.now() - new Date(stock.fecha).getTime()) / 60000)} min
              </span>
            )}
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
            <div className="space-y-6">
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

                <div className="p-4 bg-slate-50 rounded-xl">
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
                  <p className="text-xs text-slate-400">de {stock.gaseosas_iniciales} iniciales</p>
                </div>

                <div className="p-4 bg-slate-50 rounded-xl">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-slate-500">Base Caja</span>
                  </div>
                  <p className="text-xl font-bold text-slate-800">S/ {stock.dinero_inicial.toFixed(0)}</p>
                  <p className="text-xs text-slate-400">Dinero inicial</p>
                </div>
              </div>

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
                <p className="font-medium">Punto de Venta</p>
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

            <Link
              href="/mesas"
              className="flex items-center gap-3 p-3 bg-slate-50 border border-slate-200 rounded-xl hover:bg-slate-100 transition-colors"
            >
              <div className="w-10 h-10 bg-white rounded-lg border border-slate-200 flex items-center justify-center">
                <Users size={20} className="text-slate-600" />
              </div>
              <div className="flex-1">
                <p className="font-medium text-slate-800">Mesas</p>
                <p className="text-xs text-slate-500">Gestionar mesas</p>
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
              href="/inventario"
              className="flex flex-col items-center justify-center p-4 bg-slate-50 border border-slate-200 rounded-xl hover:bg-slate-100 transition-colors text-center"
            >
              <ClipboardList size={24} className="text-slate-600 mb-2" />
              <span className="font-medium text-slate-800 text-sm">Inventario</span>
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
        </motion.div>
      </div>

      {/* Modal de Gastos */}
      {showGastosModal && (
        <GastosModal isOpen={showGastosModal} onClose={() => setShowGastosModal(false)} />
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
