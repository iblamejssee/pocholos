'use client';

import { useRef, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Printer, X, CheckCircle, Receipt } from 'lucide-react';
import type { ItemCarrito, ItemVenta } from '@/lib/database.types';
import { supabase } from '@/lib/supabase';

interface ReceiptModalProps {
    isOpen: boolean;
    onClose: () => void;
    items: (ItemCarrito | ItemVenta)[];
    total: number;
    orderId?: string;
    mesaNumero?: number;
}

interface ConfigNegocio {
    ruc: string;
    razon_social: string;
    direccion: string;
    telefono: string;
    mensaje_boleta: string;
    serie_boleta: string;
    numero_correlativo: number;
}

export default function ReceiptModal({ isOpen, onClose, items, total, orderId, mesaNumero }: ReceiptModalProps) {
    const [config, setConfig] = useState<ConfigNegocio>({
        ruc: '',
        razon_social: "POCHOLO'S CHICKEN",
        direccion: '',
        telefono: '',
        mensaje_boleta: '¡Gracias por su preferencia!',
        serie_boleta: 'B001',
        numero_correlativo: 1
    });
    const [numeroBoleta, setNumeroBoleta] = useState('');

    useEffect(() => {
        if (isOpen) {
            cargarConfiguracion();
        }
    }, [isOpen]);

    const cargarConfiguracion = async () => {
        try {
            const { data } = await supabase
                .from('configuracion_negocio')
                .select('*')
                .limit(1)
                .single();

            if (data) {
                setConfig(data);
                // Generar número de boleta
                const numero = String(data.numero_correlativo).padStart(8, '0');
                setNumeroBoleta(`${data.serie_boleta}-${numero}`);

                // Incrementar correlativo para próxima boleta
                await supabase
                    .from('configuracion_negocio')
                    .update({ numero_correlativo: data.numero_correlativo + 1 })
                    .eq('id', data.id);
            }
        } catch (error) {
            console.log('Config no encontrada, usando valores por defecto');
            const numero = String(Math.floor(Math.random() * 10000)).padStart(8, '0');
            setNumeroBoleta(`B001-${numero}`);
        }
    };

    const handlePrint = () => {
        window.print();
    };

    const fecha = new Date();
    const fechaFormateada = fecha.toLocaleDateString('es-PE', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    });
    const horaFormateada = fecha.toLocaleTimeString('es-PE', {
        hour: '2-digit',
        minute: '2-digit'
    });

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm print:p-0 print:bg-white print:static print:block">

                    {/* Contenedor Principal (Visible en Pantalla) */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden flex flex-col max-h-[90vh] print:hidden"
                    >
                        {/* Header */}
                        <div className="bg-pocholo-red text-white p-5 text-center">
                            <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-2 p-2 shadow-lg">
                                <img src="/images/logo-pocholos-icon.png" alt="Logo" className="w-full h-full object-contain" />
                            </div>
                            <h2 className="text-xl font-bold">Boleta de Venta</h2>
                            <p className="text-white/80 text-sm">{numeroBoleta}</p>
                        </div>

                        {/* Vista Previa del Ticket */}
                        <div className="flex-1 overflow-y-auto p-4 bg-gray-50">
                            <div className="bg-white shadow-sm border border-gray-200 p-4 rounded-xl text-sm font-mono text-gray-700">
                                {/* Header de Boleta */}
                                <div className="text-center border-b border-dashed border-gray-300 pb-3 mb-3">
                                    <p className="font-black text-base text-black">{config.razon_social}</p>
                                    {config.ruc && <p className="text-xs">RUC: {config.ruc}</p>}
                                    {config.direccion && <p className="text-xs">{config.direccion}</p>}
                                    {config.telefono && <p className="text-xs">Tel: {config.telefono}</p>}
                                    <p className="font-bold mt-2 text-pocholo-red">{numeroBoleta}</p>
                                    <p className="text-xs mt-1">{fechaFormateada} - {horaFormateada}</p>
                                    {mesaNumero && <p className="text-xs bg-pocholo-yellow/20 rounded px-2 py-0.5 inline-block mt-1">Mesa: {mesaNumero}</p>}
                                </div>

                                {/* Items */}
                                <div className="space-y-1 mb-3">
                                    <div className="flex justify-between text-xs font-bold text-gray-500 border-b pb-1">
                                        <span>CANT. DESCRIPCIÓN</span>
                                        <span>TOTAL</span>
                                    </div>
                                    {items.map((item, idx) => {
                                        const cantidad = Number(item.cantidad) || 0;
                                        const precio = Number(item.precio) || 0;
                                        const subtotal = Number((item as any).subtotal) || (cantidad * precio);
                                        return (
                                            <div key={idx} className="py-1">
                                                <div className="flex justify-between text-black">
                                                    <span>{cantidad}x {item.nombre || 'Producto'}</span>
                                                    <span className="font-semibold">S/ {subtotal.toFixed(2)}</span>
                                                </div>
                                                {(item as any).detalles?.parte && (
                                                    <p className="text-xs text-gray-500 pl-4">└ {(item as any).detalles.parte.toUpperCase()}</p>
                                                )}
                                                {(item as any).detalles?.notas && (
                                                    <p className="text-xs text-gray-500 pl-4 italic">└ {(item as any).detalles.notas}</p>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>

                                {/* Total */}
                                <div className="border-t-2 border-black pt-2 flex justify-between text-lg font-black text-black">
                                    <span>TOTAL</span>
                                    <span>S/ {total.toFixed(2)}</span>
                                </div>

                                {/* Footer */}
                                <div className="text-center mt-4 pt-3 border-t border-dashed border-gray-300">
                                    <p className="text-xs">{config.mensaje_boleta}</p>
                                    <p className="text-[10px] text-gray-400 mt-1">La Pasión Hecha Sazón</p>
                                </div>
                            </div>
                        </div>

                        {/* Botones */}
                        <div className="p-4 border-t border-gray-100 grid grid-cols-2 gap-3 bg-white">
                            <button
                                onClick={onClose}
                                className="py-3 px-4 rounded-xl font-semibold text-gray-500 hover:bg-gray-100 transition-colors flex items-center justify-center gap-2"
                            >
                                <X size={20} />
                                Cerrar
                            </button>
                            <button
                                onClick={handlePrint}
                                className="py-3 px-4 rounded-xl font-bold text-white bg-pocholo-red hover:bg-red-700 shadow-lg transition-all flex items-center justify-center gap-2"
                            >
                                <Printer size={20} />
                                Imprimir
                            </button>
                        </div>
                    </motion.div>

                    {/* Área de Impresión Térmica - EPSON TM-T20IIIL (80mm) */}
                    <div className="hidden print:block print-ticket font-mono text-[12px] w-[80mm] leading-snug p-[4mm]">
                        {/* Header */}
                        <div className="text-center mb-2">
                            <h1 className="text-base font-black">{config.razon_social}</h1>
                            {config.ruc && <p>RUC: {config.ruc}</p>}
                            {config.direccion && <p className="text-[10px]">{config.direccion}</p>}
                            {config.telefono && <p className="text-[10px]">Tel: {config.telefono}</p>}
                        </div>

                        <div className="border-b border-black border-dashed my-1"></div>

                        {/* Número de Boleta */}
                        <div className="text-center font-bold my-1">
                            <p className="text-sm">BOLETA DE VENTA</p>
                            <p>{numeroBoleta}</p>
                        </div>

                        <div className="border-b border-black border-dashed my-1"></div>

                        {/* Fecha y Mesa */}
                        <div className="flex justify-between text-[10px] my-1">
                            <span>Fecha: {fechaFormateada}</span>
                            <span>Hora: {horaFormateada}</span>
                        </div>
                        {mesaNumero && (
                            <p className="text-center text-[10px] font-bold">MESA: {mesaNumero}</p>
                        )}

                        <div className="border-b border-black border-dashed my-1"></div>

                        {/* Items */}
                        <div className="my-1">
                            <div className="flex justify-between font-bold text-[10px]">
                                <span>CANT DESCRIPCIÓN</span>
                                <span>P.TOTAL</span>
                            </div>
                        </div>

                        <div className="space-y-1 my-1">
                            {items.map((item, idx) => {
                                const cantidad = Number(item.cantidad) || 0;
                                const precio = Number(item.precio) || 0;
                                const subtotal = Number((item as any).subtotal) || (cantidad * precio);
                                return (
                                    <div key={idx}>
                                        <div className="flex justify-between">
                                            <span className="flex-1">{cantidad} {item.nombre || 'Producto'}</span>
                                            <span>{subtotal.toFixed(2)}</span>
                                        </div>
                                        {(item as any).detalles?.parte && (
                                            <p className="text-[9px] pl-2">({(item as any).detalles.parte})</p>
                                        )}
                                        {(item as any).detalles?.notas && (
                                            <p className="text-[9px] pl-2 italic">*{(item as any).detalles.notas}</p>
                                        )}
                                    </div>
                                );
                            })}
                        </div>

                        <div className="border-b border-black border-dashed my-1"></div>

                        {/* Total */}
                        <div className="flex justify-between text-sm font-black my-2">
                            <span>TOTAL A PAGAR:</span>
                            <span>S/ {total.toFixed(2)}</span>
                        </div>

                        <div className="border-b border-black border-dashed my-1"></div>

                        {/* Pie de página */}
                        <div className="text-center mt-2 text-[10px]">
                            <p>{config.mensaje_boleta}</p>
                            <p className="mt-1">La Pasión Hecha Sazón</p>
                            <p className="text-[8px] mt-2">---</p>
                        </div>
                    </div>
                </div>
            )}
        </AnimatePresence>
    );
}
