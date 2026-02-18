'use client';
import Image from "next/image";
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Lock, DollarSign, Package, TrendingDown, AlertCircle, Check, Loader2, Share2, Calculator, FileSpreadsheet } from 'lucide-react';
import { useInventario } from '@/hooks/useInventario';
import { useVentas } from '@/hooks/useVentas';
import { useMetricas } from '@/hooks/useMetricas';
import { formatearCantidadPollos, formatearFraccionPollo } from '@/lib/utils';
import { generarReporteExcel } from '@/lib/excelReport';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import AnimatedCard from '@/components/AnimatedCard';
import { supabase, obtenerFechaHoy } from '@/lib/supabase';
import confetti from 'canvas-confetti';
import ProtectedRoute from '@/components/ProtectedRoute';

export default function CierreCajaPage() {
    return (
        <ProtectedRoute>
            <CierreCajaContent />
        </ProtectedRoute>
    );
}

function CierreCajaContent() {
    const router = useRouter();
    const { stock, loading } = useInventario();
    const { ventas } = useVentas();
    const metricas = useMetricas(ventas);

    // Estado para gastos del día
    const [gastosDelDia, setGastosDelDia] = useState<{ descripcion: string; monto: number; metodo_pago?: string }[]>([]);
    const totalGastos = gastosDelDia.reduce((sum, g) => sum + g.monto, 0);
    const gastosEfectivo = gastosDelDia.filter(g => !g.metodo_pago || g.metodo_pago === 'efectivo').reduce((sum, g) => sum + g.monto, 0);

    // Estados para inputs manuales
    const [pollosAderezados, setPollosAderezados] = useState('');
    const [pollosEnCaja, setPollosEnCaja] = useState('');
    const [stockGaseosasReal, setStockGaseosasReal] = useState('');
    const [stockPapasFinal, setStockPapasFinal] = useState('');
    const [dineroCajaReal, setDineroCajaReal] = useState('');
    const [observaciones, setObservaciones] = useState('');

    // Total de pollos sobrantes
    const stockPollosReal = (parseFloat(pollosAderezados || '0') + parseFloat(pollosEnCaja || '0')).toString();

    const [procesando, setProcesando] = useState(false);
    const [cierreCompletado, setCierreCompletado] = useState(false);
    const [resumenWhatsApp, setResumenWhatsApp] = useState('');

    // Cargar gastos del día
    useEffect(() => {
        const cargarGastos = async () => {
            const { data } = await supabase
                .from('gastos')
                .select('descripcion, monto, metodo_pago')
                .eq('fecha', obtenerFechaHoy());
            setGastosDelDia(data || []);
        };
        cargarGastos();
    }, []);

    // Agrupar ventas por método de pago (con soporte para pago dividido)
    const ventasPorMetodo = ventas.reduce((acc, venta) => {
        if (venta.pago_dividido && venta.metodo_pago === 'mixto') {
            // Distribuir montos a cada método individual
            for (const [metodo, monto] of Object.entries(venta.pago_dividido)) {
                if (monto && monto > 0) {
                    acc[metodo] = (acc[metodo] || 0) + monto;
                }
            }
        } else {
            const metodo = venta.metodo_pago || 'efectivo';
            acc[metodo] = (acc[metodo] || 0) + venta.total;
        }
        return acc;
    }, {} as Record<string, number>);

    // Desglose de pollos por fracción y tipo
    const desglosePollos = ventas.reduce((acc, venta) => {
        venta.items.forEach(item => {
            const nombre = item.nombre.toLowerCase();
            if (nombre.includes('mostrito')) {
                acc.mostritos = (acc.mostritos || 0) + item.cantidad;
            } else if (item.fraccion_pollo === 1) {
                acc.enteros = (acc.enteros || 0) + item.cantidad;
            } else if (item.fraccion_pollo === 0.5) {
                acc.medios = (acc.medios || 0) + item.cantidad;
            } else if (item.fraccion_pollo === 0.25) {
                acc.cuartos = (acc.cuartos || 0) + item.cantidad;
            } else if (item.fraccion_pollo === 0.125) {
                acc.octavos = (acc.octavos || 0) + item.cantidad;
            }
        });
        return acc;
    }, { enteros: 0, medios: 0, cuartos: 0, octavos: 0, mostritos: 0 });

    // Resumen de TODOS los platos vendidos hoy
    const ventasResumen = ventas.reduce((acc, venta) => {
        venta.items.forEach(item => {
            acc[item.nombre] = (acc[item.nombre] || 0) + item.cantidad;
        });
        return acc;
    }, {} as Record<string, number>);

    // Convertir a array y ordenar por cantidad (más vendido primero)
    const listaPlatosVendidos = Object.entries(ventasResumen)
        .map(([nombre, cantidad]) => ({ nombre, cantidad }))
        .sort((a, b) => b.cantidad - a.cantidad);

    const calcularDiferencias = () => {
        if (!stock) return { diffPollos: 0, diffGaseosas: 0 };

        const pollosEsperados = stock.pollos_disponibles;
        const gaseosasEsperadas = stock.gaseosas_disponibles;

        const diffPollos = parseFloat(stockPollosReal || '0') - pollosEsperados;
        const diffGaseosas = parseInt(stockGaseosasReal || '0') - gaseosasEsperadas;

        return { diffPollos, diffGaseosas };
    };

    const { diffPollos, diffGaseosas } = calcularDiferencias();

    const handleConfetti = () => {
        const duration = 3000;
        const end = Date.now() + duration;

        (function frame() {
            confetti({
                particleCount: 5,
                angle: 60,
                spread: 55,
                origin: { x: 0 },
                colors: ['#C8102E', '#F2C94C']
            });
            confetti({
                particleCount: 5,
                angle: 120,
                spread: 55,
                origin: { x: 1 },
                colors: ['#C8102E', '#F2C94C']
            });

            if (Date.now() < end) {
                requestAnimationFrame(frame);
            }
        })();
    };

    const confirmarCierre = async () => {
        if (!stock) return;
        setProcesando(true);

        try {
            const { error } = await supabase
                .from('inventario_diario')
                .update({
                    estado: 'cerrado',
                    stock_pollos_real: parseFloat(stockPollosReal || '0'),
                    stock_gaseosas_real: parseInt(stockGaseosasReal || '0'),
                    papas_finales: parseFloat(stockPapasFinal || '0'),
                    dinero_cierre_real: parseFloat(dineroCajaReal || '0'),
                    observaciones_cierre: observaciones,
                    // GUARDAR las bebidas RESTANTES (ya calculadas como inicial - vendidas)
                    // para que la apertura del siguiente día las cargue correctamente
                    bebidas_detalle: stock.bebidas_detalle || null,
                })
                .eq('fecha', obtenerFechaHoy());

            // Calcular total efectivo esperado (base + ventas efectivo - gastos efectivo)
            const totalEfectivoEsperado = (ventasPorMetodo['efectivo'] || 0) + (stock?.dinero_inicial || 0) - gastosEfectivo;

            // Formatear gastos para el mensaje de WhatsApp
            const gastosTexto = gastosDelDia.length > 0
                ? gastosDelDia.map(g => `- ${g.descripcion}: S/ ${g.monto.toFixed(2)}`).join('\n')
                : 'No hubo gastos registrados.';

            // Formatear platillos vendidos para el mensaje de WhatsApp
            const platillosTexto = listaPlatosVendidos.length > 0
                ? listaPlatosVendidos.map(item => `- ${item.nombre}: ${item.cantidad}`).join('\n')
                : 'No se vendieron platillos hoy.';

            // Formatear detalle de bebidas sobrantes
            const MARCA_LABEL: Record<string, string> = { inca_kola: 'Inca Kola', coca_cola: 'Coca Cola', sprite: 'Sprite', fanta: 'Fanta', agua_mineral: 'Agua Mineral' };
            const TIPO_LABEL: Record<string, string> = { personal_retornable: 'Personal Ret.', descartable: 'Descartable', gordita: 'Gordita', litro: '1L', litro_medio: '1.5L', tres_litros: '3L', mediana: '2.25L', personal: '600ml', grande: '2.5L' };
            let bebidasTexto = '';
            if (stock?.bebidas_detalle) {
                const lineas: string[] = [];
                for (const [marca, tipos] of Object.entries(stock.bebidas_detalle)) {
                    const tiposObj = tipos as Record<string, number>;
                    const items = Object.entries(tiposObj).filter(([, qty]) => qty > 0);
                    if (items.length > 0) {
                        lineas.push(`*${MARCA_LABEL[marca] || marca}*`);
                        for (const [tipo, qty] of items) {
                            lineas.push(`   ${TIPO_LABEL[tipo] || tipo}: ${qty}`);
                        }
                    }
                }
                bebidasTexto = lineas.length > 0 ? lineas.join('\n') : 'Sin bebidas restantes.';
            } else {
                bebidasTexto = 'Sin detalle disponible.';
            }

            if (error) {
                console.error('Error al actualizar inventario diario:', error);
                toast.error('Error al guardar el cierre: ' + error.message);
                setProcesando(false);
                return;
            }

            const mensaje = `🐔 *RESUMEN POCHOLO'S - ${new Date().toLocaleDateString('es-PE')}* 🐔

💰 *VENTAS TOTALES: S/ ${metricas.totalIngresos.toFixed(2)}*
--------------------------------
💵 Efectivo en Caja: S/ ${(ventasPorMetodo['efectivo'] || 0).toFixed(2)}
💳 Tarjeta: S/ ${(ventasPorMetodo['tarjeta'] || 0).toFixed(2)}
📱 Yape: S/ ${(ventasPorMetodo['yape'] || 0).toFixed(2)}
💠 Plin: S/ ${(ventasPorMetodo['plin'] || 0).toFixed(2)}

🫰 *TOTAL EFECTIVO + BASE: S/ ${totalEfectivoEsperado.toFixed(2)}*

📤 *GASTOS DEL DÍA: S/ ${totalGastos.toFixed(2)}*
--------------------------------
${gastosTexto}

💵 *EFECTIVO NETO: S/ ${totalEfectivoEsperado.toFixed(2)}*

🍗 *DESGLOSE DE POLLOS*
--------------------------------
🐣 Pollos Iniciales: ${stock?.pollos_iniciales || 0}
✅ Vendidos (Total): ${formatearCantidadPollos(metricas.pollosVendidos)}
   - Enteros: ${desglosePollos.enteros}
   - Medios: ${desglosePollos.medios}
   - Cuartos: ${desglosePollos.cuartos}
   - Octavos: ${desglosePollos.octavos}
   - Mostritos: ${desglosePollos.mostritos}
❌ Sobrantes Total: ${stockPollosReal}
   - 🍗 Aderezados: ${pollosAderezados || '0'}
   - 📦 En Caja: ${pollosEnCaja || '0'}

🥔 *INVENTARIO PAPAS*
--------------------------------
🥔 Iniciales: ${stock?.papas_iniciales || 0} Kg
🥔 Finales: ${stockPapasFinal || 0} Kg
📉 Consumo Aprox: ${((stock?.papas_iniciales || 0) - (parseFloat(stockPapasFinal) || 0)).toFixed(1)} Kg

📋 *PLATILLOS VENDIDOS*
--------------------------------
${platillosTexto}

🥤 *BEBIDAS SOBRANTES (para mañana)*
--------------------------------
${bebidasTexto}

📊 *CUADRE DE STOCK*
--------------------------------
Gaseosas Total: ${stockGaseosasReal} (Diff: ${diffGaseosas > 0 ? '+' : ''}${diffGaseosas})

📝 Notas: ${observaciones || 'Ninguna'}

_Generado automáticamente por Pocholo's POS_`;

            setResumenWhatsApp(mensaje);
            setCierreCompletado(true);
            handleConfetti();
            toast.success('¡Jornada finalizada exitosamente!', { duration: 5000 });

        } catch (error) {
            console.error('Error al cerrar caja:', error);
            toast.error('Error al cerrar la caja');
        } finally {
            setProcesando(false);
        }
    };

    const copiarWhatsApp = () => {
        navigator.clipboard.writeText(resumenWhatsApp);
        toast.success('Resumen copiado al portapapeles');
        // Abrir WhatsApp Web
        window.open(`https://wa.me/?text=${encodeURIComponent(resumenWhatsApp)}`, '_blank');
    };

    const descargarExcel = async () => {
        if (!stock) return;
        try {
            const fileName = await generarReporteExcel({
                fecha: new Date().toLocaleDateString('es-PE'),
                stock,
                metricas,
                ventasPorMetodo,
                desglosePollos,
                listaPlatosVendidos,
                gastosDelDia,
                totalGastos,
                stockPollosReal,
                pollosAderezados,
                pollosEnCaja,
                stockGaseosasReal,
                stockPapasFinal,
                dineroCajaReal,
                observaciones,
                diffPollos,
                diffGaseosas,
            });
            toast.success(`Excel descargado: ${fileName}`, { icon: '📊' });
        } catch (error) {
            console.error('Error al generar Excel:', error);
            toast.error('Error al generar el reporte Excel');
        }
    };

    if (loading) return <div className="flex justify-center p-20"><Loader2 className="animate-spin text-pocholo-red" /></div>;

    if (cierreCompletado) {
        return (
            <div className="min-h-screen flex items-center justify-center p-4 bg-pocholo-cream/50">
                <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="max-w-md w-full bg-white rounded-3xl shadow-2xl p-8 text-center"
                >
                    <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                        <Check className="text-green-600" size={40} />
                    </div>
                    <h1 className="text-3xl font-bold text-pocholo-brown mb-2">¡Cierre Exitoso!</h1>
                    <p className="text-pocholo-brown/60 mb-8">La jornada ha finalizado correctamente.</p>

                    <button
                        onClick={copiarWhatsApp}
                        className="w-full py-4 bg-[#25D366] text-white font-bold rounded-xl shadow-lg hover:brightness-105 transition-all flex items-center justify-center gap-2 mb-3"
                    >
                        <Share2 size={20} />
                        Compartir en WhatsApp
                    </button>

                    <button
                        onClick={descargarExcel}
                        className="w-full py-4 bg-[#217346] text-white font-bold rounded-xl shadow-lg hover:brightness-105 transition-all flex items-center justify-center gap-2 mb-3"
                    >
                        <FileSpreadsheet size={20} />
                        Descargar Reporte Excel
                    </button>

                    <button
                        onClick={() => router.push('/')}
                        className="w-full py-4 bg-gray-100 text-gray-600 font-bold rounded-xl hover:bg-gray-200 transition-all"
                    >
                        Volver al Inicio
                    </button>
                </motion.div>
            </div>
        );
    }

    return (
        <div className="p-3 sm:p-4 md:p-8 max-w-4xl mx-auto pb-32">
            <header className="mb-4 sm:mb-8">
                <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-pocholo-brown flex items-center gap-3">
                    <Lock className="text-pocholo-red" />
                    Cierre de Jornada
                </h1>
                <p className="text-sm sm:text-base text-pocholo-brown/60 mt-2">
                    Verifica los montos y el inventario antes de finalizar el día.
                </p>
            </header>

            <div className="grid md:grid-cols-2 gap-6">
                {/* Columna Izquierda: Financiero */}
                <div className="space-y-6">
                    <AnimatedCard delay={0.1}>
                        <div className="glass-card p-6 rounded-2xl shadow-3d">
                            <h2 className="text-xl font-bold text-pocholo-brown mb-4 flex items-center gap-2">
                                <DollarSign className="text-pocholo-yellow" /> Resumen Financiero
                            </h2>

                            <div className="space-y-3">
                                <div className="flex justify-between items-center p-3 bg-yellow-50 border border-pocholo-yellow/20 rounded-xl">
                                    <span className="text-pocholo-brown/70 font-medium">Base Inicial (Caja Chica)</span>
                                    <span className="font-bold text-pocholo-brown">S/ {((stock?.dinero_inicial || 0)).toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between items-center p-3 bg-white/50 rounded-xl">
                                    <span className="text-pocholo-brown/70">Efectivo en Caja</span>
                                    <span className="font-bold text-pocholo-brown">S/ {(ventasPorMetodo['efectivo'] || 0).toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between items-center p-3 bg-white/50 rounded-xl">
                                    <span className="text-pocholo-brown/70">Tarjeta (POS)</span>
                                    <span className="font-bold text-pocholo-brown">S/ {(ventasPorMetodo['tarjeta'] || 0).toFixed(2)}</span>
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                    {/* YAPE */}
                                    <div className="flex justify-between items-center p-3 bg-purple-50 border border-purple-100 rounded-xl">
                                        <div className="flex items-center gap-2">
                                            <Image
                                                src="/images/yape-logo.png"
                                                alt="Yape"
                                                width={20}
                                                height={20}
                                                className="object-contain"
                                            />
                                            <span className="text-purple-700 text-xs font-bold">Yape</span>
                                        </div>
                                        <span className="font-bold text-purple-900">
                                            S/ {(ventasPorMetodo['yape'] || 0).toFixed(2)}
                                        </span>
                                    </div>

                                    {/* PLIN */}
                                    <div className="flex justify-between items-center p-3 bg-cyan-50 border border-cyan-100 rounded-xl">
                                        <div className="flex items-center gap-2">
                                            <Image
                                                src="/images/plin-logo.png"
                                                alt="Plin"
                                                width={20}
                                                height={20}
                                                className="object-contain"
                                            />
                                            <span className="text-cyan-700 text-xs font-bold">Plin</span>
                                        </div>
                                        <span className="font-bold text-cyan-900">
                                            S/ {(ventasPorMetodo['plin'] || 0).toFixed(2)}
                                        </span>
                                    </div>
                                </div>
                                <div className="border-t-2 border-dashed border-pocholo-brown/20 my-2 pt-2">
                                    <div className="flex justify-between items-center">
                                        <span className="font-bold text-lg text-pocholo-brown">TOTAL VENTAS</span>
                                        <span className="font-bold text-2xl text-pocholo-red">S/ {metricas.totalIngresos.toFixed(2)}</span>
                                    </div>
                                </div>

                                {/* Gastos del día */}
                                {gastosDelDia.length > 0 && (
                                    <div className="border-t border-pocholo-brown/10 pt-3 mt-3">
                                        <div className="flex justify-between items-center mb-2">
                                            <span className="text-sm font-medium text-red-600">📤 Gastos del Día</span>
                                            <span className="font-bold text-red-600">- S/ {totalGastos.toFixed(2)}</span>
                                        </div>
                                        <div className="space-y-1 max-h-24 overflow-y-auto">
                                            {gastosDelDia.map((g, i) => (
                                                <div key={i} className="flex justify-between text-xs text-pocholo-brown/60 bg-red-50 px-2 py-1 rounded">
                                                    <span>{g.descripcion}</span>
                                                    <span>S/ {g.monto.toFixed(2)}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </AnimatedCard>

                    <AnimatedCard delay={0.2}>
                        <div className="glass-card p-6 rounded-2xl shadow-3d bg-white/80">
                            <h2 className="text-xl font-bold text-pocholo-brown mb-4 flex items-center gap-2">
                                <Calculator className="text-pocholo-red" /> Cuadre de Caja (Efectivo)
                            </h2>
                            <div className="space-y-4">
                                <div>
                                    <label className="text-sm font-medium text-pocholo-brown mb-1 block">
                                        Dinero Físico Contado (S/)
                                    </label>
                                    <input
                                        type="number"
                                        value={dineroCajaReal}
                                        onChange={e => setDineroCajaReal(e.target.value)}
                                        className="w-full p-3 rounded-xl border-2 border-gray-200 focus:border-pocholo-red focus:outline-none text-xl font-bold text-pocholo-brown"
                                        placeholder="0.00"
                                    />
                                </div>
                                {dineroCajaReal && (
                                    <div className={`p-3 rounded-xl flex justify-between items-center ${parseFloat(dineroCajaReal) - ((ventasPorMetodo['efectivo'] || 0) + (stock?.dinero_inicial || 0) - gastosEfectivo) === 0
                                        ? 'bg-green-100 text-green-700'
                                        : 'bg-red-100 text-red-700'
                                        }`}>
                                        <span className="font-medium">Diferencia:</span>
                                        <span className="font-bold">
                                            S/ {(parseFloat(dineroCajaReal) - ((ventasPorMetodo['efectivo'] || 0) + (stock?.dinero_inicial || 0) - gastosEfectivo)).toFixed(2)}
                                        </span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </AnimatedCard>
                </div>

                {/* Columna Derecha: Inventario */}
                <div className="space-y-6">
                    <AnimatedCard delay={0.3}>
                        <div className="glass-card p-6 rounded-2xl shadow-3d">
                            <h2 className="text-xl font-bold text-pocholo-brown mb-4 flex items-center gap-2">
                                <Package className="text-pocholo-brown" /> Control de Stock Físico
                            </h2>

                            <div className="space-y-6">
                                {/* Pollos */}
                                <div>
                                    <div className="flex justify-between mb-3 text-sm">
                                        <span className="text-pocholo-brown/60">Pollos (Sistema): {formatearCantidadPollos(stock?.pollos_disponibles || 0)}</span>
                                    </div>

                                    {/* Pollos Aderezados */}
                                    <div className="mb-4">
                                        <label className="text-sm font-medium text-pocholo-brown mb-1 block">
                                            🍗 Pollos Aderezados
                                        </label>
                                        <input
                                            type="number"
                                            step="0.125"
                                            value={pollosAderezados}
                                            onChange={e => setPollosAderezados(e.target.value)}
                                            className="w-full p-3 rounded-xl border-2 border-orange-200 bg-orange-50 focus:border-orange-400 focus:outline-none text-lg font-bold"
                                            placeholder="0"
                                        />
                                    </div>

                                    {/* Pollos En Caja */}
                                    <div className="mb-3">
                                        <label className="text-sm font-medium text-pocholo-brown mb-1 block">
                                            📦 Pollos en Caja
                                        </label>
                                        <input
                                            type="number"
                                            step="0.125"
                                            value={pollosEnCaja}
                                            onChange={e => setPollosEnCaja(e.target.value)}
                                            className="w-full p-3 rounded-xl border-2 border-blue-200 bg-blue-50 focus:border-blue-400 focus:outline-none text-lg font-bold"
                                            placeholder="0"
                                        />
                                    </div>

                                    {/* Total y diferencia */}
                                    <div className="flex justify-between items-center p-3 bg-gray-100 rounded-xl">
                                        <span className="font-medium text-pocholo-brown">Total Sobrantes:</span>
                                        <div className="flex items-center gap-2">
                                            <span className="font-bold text-lg text-pocholo-red">{stockPollosReal}</span>
                                            {stockPollosReal && diffPollos !== 0 && (
                                                <span className={`px-2 py-1 rounded-full text-xs font-bold ${diffPollos > 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                                    {diffPollos > 0 ? '+' : ''}{formatearFraccionPollo(Math.abs(diffPollos))}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Papas (Kg) */}
                                <div className="p-4 bg-amber-50 rounded-xl border border-amber-100">
                                    <div className="flex justify-between mb-2 text-sm">
                                        <span className="text-pocholo-brown/60">Papas Iniciales: {stock?.papas_iniciales || 0} Kg</span>
                                    </div>
                                    <label className="text-sm font-medium text-pocholo-brown mb-1 block">
                                        🥔 Stock Final Papas (Kg)
                                    </label>
                                    <div className="relative">
                                        <input
                                            type="number"
                                            step="0.1"
                                            value={stockPapasFinal}
                                            onChange={e => setStockPapasFinal(e.target.value)}
                                            className="w-full p-3 rounded-xl border-2 border-amber-200 focus:border-amber-400 focus:outline-none text-lg font-bold"
                                            placeholder="0.0"
                                        />
                                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-pocholo-brown/40 text-sm font-bold">Kg</span>
                                    </div>
                                    {stock?.papas_iniciales && stockPapasFinal && (
                                        <p className="text-xs text-amber-700 mt-2 font-medium">
                                            📉 Consumo del día: {((stock.papas_iniciales) - (parseFloat(stockPapasFinal) || 0)).toFixed(1)} Kg
                                        </p>
                                    )}
                                </div>

                                {/* Gaseosas */}
                                <div>
                                    <div className="flex justify-between mb-2 text-sm">
                                        <span className="text-pocholo-brown/60">Gaseosas (Sistema): {stock?.gaseosas_disponibles || 0}</span>
                                    </div>
                                    <div className="flex gap-4 items-center">
                                        <div className="flex-1">
                                            <label className="text-sm font-medium text-pocholo-brown mb-1 block">
                                                Gaseosas Sobrantes (Real)
                                            </label>
                                            <input
                                                type="number"
                                                value={stockGaseosasReal}
                                                onChange={e => setStockGaseosasReal(e.target.value)}
                                                className="w-full p-3 rounded-xl border-2 border-gray-200 focus:border-pocholo-yellow focus:outline-none text-lg font-bold"
                                                placeholder="0"
                                            />
                                        </div>
                                        {stockGaseosasReal && diffGaseosas !== 0 && (
                                            <span className={`px-3 py-1 rounded-full text-xs font-bold ${diffGaseosas > 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                                {diffGaseosas > 0 ? '+' : ''}{diffGaseosas}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </AnimatedCard>

                    <AnimatedCard delay={0.4}>
                        <div className="glass-card p-6 rounded-2xl shadow-3d bg-white">
                            <h2 className="text-lg font-bold text-pocholo-brown mb-3 flex items-center gap-2">
                                <Package className="text-pocholo-red" size={20} /> Detalle de Platillos Vendidos
                            </h2>
                            <div className="space-y-2 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                                {listaPlatosVendidos.length > 0 ? listaPlatosVendidos.map((plato, idx) => (
                                    <div key={idx} className="flex justify-between items-center py-2 border-b border-gray-100 last:border-0">
                                        <span className="text-sm text-pocholo-brown/80 font-medium">{plato.nombre}</span>
                                        <span className="bg-pocholo-cream px-3 py-1 rounded-full text-sm font-black text-pocholo-red">
                                            x{plato.cantidad}
                                        </span>
                                    </div>
                                )) : (
                                    <p className="text-center py-4 text-pocholo-brown/40 italic text-sm">No hay platos registrados hoy</p>
                                )}
                            </div>
                        </div>
                    </AnimatedCard>

                    <AnimatedCard delay={0.5}>
                        <div className="glass-card p-6 rounded-2xl shadow-3d">
                            <label className="text-sm font-medium text-pocholo-brown mb-2 block">
                                Observaciones Finales
                            </label>
                            <textarea
                                value={observaciones}
                                onChange={e => setObservaciones(e.target.value)}
                                className="w-full p-3 rounded-xl border-2 border-gray-200 focus:border-pocholo-red/50 focus:outline-none h-24 resize-none"
                                placeholder="Incidencias, faltantes, notas para mañana..."
                            />
                        </div>
                    </AnimatedCard>

                    {/* Espaciador para el botón flotante */}
                    <div className="h-24"></div>
                </div>
            </div>

            {/* Botón Flotante de Cierre */}
            <div className="fixed bottom-0 left-0 right-0 p-6 bg-white/80 backdrop-blur-md border-t border-gray-100 md:pl-72 flex justify-end z-40">
                <motion.button
                    onClick={confirmarCierre}
                    disabled={procesando || (pollosAderezados === '' && pollosEnCaja === '') || !stockGaseosasReal || !dineroCajaReal}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="bg-pocholo-red text-white font-bold py-4 px-8 rounded-2xl shadow-lg shadow-red-200 flex items-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-red-700 transition-colors"
                >
                    {procesando ? (
                        <>
                            <Loader2 className="animate-spin" /> Finalizando...
                        </>
                    ) : (
                        <>
                            <Lock /> FINALIZAR JORNADA
                        </>
                    )}
                </motion.button>
            </div>
        </div>
    );
}
