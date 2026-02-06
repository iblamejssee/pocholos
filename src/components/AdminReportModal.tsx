'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { X, Printer, FileText, TrendingUp, TrendingDown, DollarSign, Package, ShoppingBag, Receipt } from 'lucide-react';
import type { Venta, InventarioDiario, Gasto } from '@/lib/database.types';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { formatearFraccionPollo } from '@/lib/utils';

interface AdminReportModalProps {
    isOpen: boolean;
    onClose: () => void;
    ventas: Venta[];
    inventarios: InventarioDiario[];
    gastos: Gasto[];
    fechaInicio: Date;
    fechaFin: Date;
}

export default function AdminReportModal({
    isOpen,
    onClose,
    ventas,
    inventarios,
    gastos,
    fechaInicio,
    fechaFin
}: AdminReportModalProps) {

    // Cálculos Financieros
    const totalVentas = ventas.reduce((sum, v) => sum + v.total, 0);
    const totalGastos = gastos.reduce((sum, g) => sum + g.monto, 0);
    const utilidadNeta = totalVentas - totalGastos;

    // Desglose Pagos
    const ventasPorMetodo = ventas.reduce((acc, v) => {
        const metodo = v.metodo_pago || 'efectivo';
        acc[metodo] = (acc[metodo] || 0) + v.total;
        return acc;
    }, {} as Record<string, number>);

    // Resumen Inventario (usando el primer inventario del rango como inicial y el último como final si aplica)
    const invInicial = inventarios[0];
    const invFinal = inventarios[inventarios.length - 1];

    const handlePrint = () => {
        window.print();
    };

    const esMismoDia = format(fechaInicio, 'yyyy-MM-dd') === format(fechaFin, 'yyyy-MM-dd');
    const tituloReporte = esMismoDia
        ? `Reporte Administrativo - ${format(fechaInicio, 'dd/MM/yyyy')}`
        : `Reporte Administrativo - ${format(fechaInicio, 'dd/MM')} al ${format(fechaFin, 'dd/MM/yyyy')}`;

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-100 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm print:p-0 print:bg-white print:static print:block">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 20 }}
                        className="bg-white rounded-3xl shadow-2xl w-full max-w-5xl overflow-hidden flex flex-col max-h-[95vh] print:shadow-none print:max-h-none print:rounded-none print:w-full"
                    >
                        {/* Header Modal (No se imprime) */}
                        <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-slate-50 print:hidden">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-pocholo-red rounded-lg text-white">
                                    <FileText size={24} />
                                </div>
                                <h2 className="text-xl font-bold text-slate-800">Vista Previa de Reporte</h2>
                            </div>
                            <div className="flex items-center gap-3">
                                <button
                                    onClick={handlePrint}
                                    className="flex items-center gap-2 px-4 py-2 bg-slate-800 text-white rounded-xl font-medium hover:bg-slate-700 transition-all shadow-md"
                                >
                                    <Printer size={18} />
                                    Imprimir PDF
                                </button>
                                <button
                                    onClick={onClose}
                                    className="p-2 hover:bg-gray-200 rounded-full transition-colors text-slate-500"
                                >
                                    <X size={24} />
                                </button>
                            </div>
                        </div>

                        {/* Contenido del Reporte (Area de Impresión) */}
                        <div className="flex-1 overflow-y-auto p-8 print:p-0 print:overflow-visible">
                            <div className="report-container max-w-4xl mx-auto bg-white print:w-full">

                                {/* Header del Reporte */}
                                <div className="flex justify-between items-start border-b-4 border-pocholo-red pb-6 mb-8">
                                    <div>
                                        <h1 className="text-3xl font-black text-slate-900 mb-1">POCHOLO'S CHICKEN</h1>
                                        <p className="text-slate-500 font-medium">VENTA DE POLLOS A LA BRASA Y PARRILLADAS</p>
                                        <p className="text-xs text-slate-400 mt-2 uppercase tracking-widest">{tituloReporte}</p>
                                    </div>
                                    <div className="text-right">
                                        <div className="w-20 h-20 ml-auto mb-2">
                                            <img src="/images/logo-pocholos-icon.png" alt="Logo" className="w-full h-full object-contain" />
                                        </div>
                                        <p className="text-xs text-slate-400">Generado el: {format(new Date(), 'dd/MM/yyyy HH:mm')}</p>
                                    </div>
                                </div>

                                {/* Secciones Resumen */}
                                <div className="grid grid-cols-3 gap-6 mb-8">
                                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                                        <div className="flex items-center gap-2 mb-2 text-slate-500">
                                            <TrendingUp size={16} className="text-green-600" />
                                            <span className="text-xs font-bold uppercase">Ventas Brutas</span>
                                        </div>
                                        <p className="text-2xl font-black text-slate-900">S/ {totalVentas.toFixed(2)}</p>
                                        <p className="text-[10px] text-slate-400 mt-1">{ventas.length} pedidos realizados</p>
                                    </div>
                                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                                        <div className="flex items-center gap-2 mb-2 text-slate-500">
                                            <TrendingDown size={16} className="text-red-600" />
                                            <span className="text-xs font-bold uppercase">Total Gastos</span>
                                        </div>
                                        <p className="text-2xl font-black text-slate-900">S/ {totalGastos.toFixed(2)}</p>
                                        <p className="text-[10px] text-slate-400 mt-1">{gastos.length} gastos operativos</p>
                                    </div>
                                    <div className="bg-pocholo-red/5 p-4 rounded-2xl border border-pocholo-red/10">
                                        <div className="flex items-center gap-2 mb-2 text-pocholo-red">
                                            <DollarSign size={16} />
                                            <span className="text-xs font-bold uppercase">Utilidad Neta</span>
                                        </div>
                                        <p className={`text-2xl font-black ${utilidadNeta >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                            S/ {utilidadNeta.toFixed(2)}
                                        </p>
                                        <p className="text-[10px] text-slate-400 mt-1">Margen operativo</p>
                                    </div>
                                </div>

                                {/* Detalle Financiero y Métodos */}
                                <div className="grid grid-cols-2 gap-8 mb-10">
                                    <div>
                                        <h3 className="text-sm font-bold text-slate-800 mb-4 border-l-4 border-pocholo-red pl-3">Desglose de Ingresos</h3>
                                        <div className="space-y-2">
                                            {Object.entries(ventasPorMetodo).map(([metodo, total]) => (
                                                <div key={metodo} className="flex justify-between items-center py-2 border-b border-slate-50">
                                                    <span className="text-sm text-slate-600 capitalize">{metodo}</span>
                                                    <span className="font-bold text-slate-800">S/ {total.toFixed(2)}</span>
                                                </div>
                                            ))}
                                            <div className="flex justify-between items-center pt-2 font-black text-slate-900">
                                                <span>TOTAL INGRESOS</span>
                                                <span>S/ {totalVentas.toFixed(2)}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div>
                                        <h3 className="text-sm font-bold text-slate-800 mb-4 border-l-4 border-amber-500 pl-3">Control de Inventario</h3>
                                        {invInicial ? (
                                            <div className="space-y-3">
                                                <div className="p-3 bg-slate-50 rounded-xl">
                                                    <div className="flex justify-between text-xs text-slate-400 mb-2 font-bold uppercase">
                                                        <span>Item</span>
                                                        <span>Inicial</span>
                                                        <span>Final</span>
                                                    </div>
                                                    <div className="space-y-2">
                                                        <div className="flex justify-between text-sm">
                                                            <span className="text-slate-600 font-medium">Pollos (Unid)</span>
                                                            <span className="font-bold">{invInicial.pollos_enteros}</span>
                                                            <span className="font-bold text-pocholo-red">{invFinal?.stock_pollos_real ?? '---'}</span>
                                                        </div>
                                                        <div className="flex justify-between text-sm">
                                                            <span className="text-slate-600 font-medium">Papas (Kg)</span>
                                                            <span className="font-bold">{invInicial.papas_iniciales ?? 0}</span>
                                                            <span className="font-bold text-pocholo-red">{invFinal?.papas_finales ?? '---'}</span>
                                                        </div>
                                                        <div className="flex justify-between text-sm">
                                                            <span className="text-slate-600 font-medium">Gaseosas (Unid)</span>
                                                            <span className="font-bold">{invInicial.gaseosas}</span>
                                                            <span className="font-bold text-pocholo-red">{invFinal?.stock_gaseosas_real ?? '---'}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                                <p className="text-[10px] text-slate-400 italic">
                                                    * Basado en la apertura y cierre del día seleccionado.
                                                </p>
                                            </div>
                                        ) : (
                                            <div className="p-8 text-center bg-slate-50 rounded-2xl text-slate-400 italic text-sm">
                                                No hay datos de inventario para este periodo
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Tabla de Gastos */}
                                <div className="mb-10">
                                    <h3 className="text-sm font-bold text-slate-800 mb-4 border-l-4 border-red-500 pl-3">Detalle de Gastos Operativos</h3>
                                    {gastos.length > 0 ? (
                                        <table className="w-full text-sm">
                                            <thead>
                                                <tr className="bg-slate-50 text-slate-500">
                                                    <th className="px-4 py-2 text-left font-bold uppercase text-[10px]">Descripción</th>
                                                    <th className="px-4 py-2 text-left font-bold uppercase text-[10px]">Método</th>
                                                    <th className="px-4 py-2 text-left font-bold uppercase text-[10px]">Fecha</th>
                                                    <th className="px-4 py-2 text-right font-bold uppercase text-[10px]">Monto</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100">
                                                {gastos.map((g, i) => (
                                                    <tr key={i}>
                                                        <td className="px-4 py-3 text-slate-700 font-medium">{g.descripcion}</td>
                                                        <td className="px-4 py-3 text-slate-500 text-xs capitalize">{g.metodo_pago || 'efectivo'}</td>
                                                        <td className="px-4 py-3 text-slate-400 text-xs">{format(new Date(g.created_at || g.fecha), 'dd/MM/yy')}</td>
                                                        <td className="px-4 py-3 text-right font-bold text-slate-900">S/ {g.monto.toFixed(2)}</td>
                                                    </tr>
                                                ))}
                                                <tr className="bg-slate-50 font-black">
                                                    <td colSpan={3} className="px-4 py-3 text-right">TOTAL GASTOS</td>
                                                    <td className="px-4 py-3 text-right text-red-600">S/ {totalGastos.toFixed(2)}</td>
                                                </tr>
                                            </tbody>
                                        </table>
                                    ) : (
                                        <div className="p-8 text-center bg-slate-50 rounded-2xl text-slate-400 italic text-sm">
                                            No se registraron gastos en este periodo
                                        </div>
                                    )}
                                </div>

                                {/* Resumen de Productos Vendidos */}
                                <div className="mb-10 page-break-avoid">
                                    <h3 className="text-sm font-bold text-slate-800 mb-4 border-l-4 border-blue-500 pl-3">Resumen de Ventas por Producto</h3>
                                    <div className="grid grid-cols-2 gap-x-12 gap-y-2">
                                        {/* Agrupar items de ventas */}
                                        {Array.from(ventas.reduce((acc, v) => {
                                            v.items.forEach(item => {
                                                const key = item.nombre;
                                                if (!acc.has(key)) acc.set(key, { cant: 0, total: 0 });
                                                const d = acc.get(key)!;
                                                d.cant += item.cantidad;
                                                d.total += (item.cantidad * item.precio);
                                            });
                                            return acc;
                                        }, new Map<string, { cant: number; total: number }>()).entries())
                                            .sort((a, b) => b[1].cant - a[1].cant)
                                            .map(([nombre, data], i) => (
                                                <div key={i} className="flex justify-between items-center py-1 border-b border-slate-50 text-sm">
                                                    <span className="text-slate-600 truncate mr-2">{nombre}</span>
                                                    <div className="flex items-center gap-4 shrink-0">
                                                        <span className="font-black text-pocholo-red w-8 text-right underline underline-offset-4 decoration-1 decoration-pocholo-red/30">x{data.cant}</span>
                                                        <span className="font-bold text-slate-800 w-20 text-right">S/ {data.total.toFixed(2)}</span>
                                                    </div>
                                                </div>
                                            ))}
                                    </div>
                                </div>

                                {/* Firma / Pie */}
                                <div className="mt-20 flex justify-between items-end border-t border-slate-100 pt-8 print:mt-12">
                                    <div className="text-center w-64 border-t border-slate-300 pt-2">
                                        <p className="text-xs font-bold text-slate-500">ADMINISTRACIÓN</p>
                                        <p className="text-[10px] text-slate-400">POCHOLO'S CHICKEN</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-[10px] text-slate-400 italic font-medium">"La Pasión Hecha Sazón"</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Footer Modal (No se imprime) */}
                        <div className="p-4 bg-slate-50 border-t border-gray-100 text-center print:hidden">
                            <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">
                                Sistema de Gestión Administrativa Pocholo's v1.0
                            </p>
                        </div>
                    </motion.div>
                </div>
            )}

            {/* Estilos CSS Específicos para Impresión */}
            <style jsx global>{`
                @media print {
                    @page {
                        size: A4;
                        margin: 15mm;
                    }
                    body * {
                        visibility: hidden;
                    }
                    .fixed.inset-0, .fixed.inset-0 * {
                        visibility: hidden !important;
                    }
                    .report-container, .report-container * {
                        visibility: visible !important;
                    }
                    .report-container {
                        position: absolute;
                        left: 0;
                        top: 0;
                        width: 100%;
                    }
                    .page-break-avoid {
                        page-break-inside: avoid;
                    }
                }
            `}</style>
        </AnimatePresence>
    );
}
