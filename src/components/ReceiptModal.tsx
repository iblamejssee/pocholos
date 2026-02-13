import { useRef, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Printer, X, CheckCircle, Receipt, Search, User, RefreshCw, Trash2 } from 'lucide-react';
import type { ItemCarrito, ItemVenta } from '@/lib/database.types';
import { supabase } from '@/lib/supabase';
import { consultarDNI } from '@/services/dniService';

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
    const [dni, setDni] = useState('');
    const [clienteNombre, setClienteNombre] = useState('');
    const [isSearching, setIsSearching] = useState(false);
    const [errorDni, setErrorDni] = useState<string | null>(null);

    useEffect(() => {
        if (isOpen) {
            cargarConfiguracion();
            setDni('');
            setClienteNombre('');
            setErrorDni(null);
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
                const numero = String(data.numero_correlativo).padStart(8, '0');
                setNumeroBoleta(`${data.serie_boleta}-${numero}`);
            }
        } catch (error) {
            console.log('Config no encontrada, usando valores por defecto');
            const numero = String(Math.floor(Math.random() * 10000)).padStart(8, '0');
            setNumeroBoleta(`B001-${numero}`);
        }
    };

    const handleDNISearch = async () => {
        if (dni.length !== 8) {
            setErrorDni('El DNI debe tener 8 dígitos');
            return;
        }
        setIsSearching(true);
        setErrorDni(null);
        try {
            const response = await consultarDNI(dni);
            if (response.success && response.data) {
                setClienteNombre(response.data.nombre_completo);
            } else {
                setErrorDni(response.message || 'No se encontró');
                setClienteNombre('');
            }
        } catch (error) {
            setErrorDni('Error al consultar');
        } finally {
            setIsSearching(false);
        }
    };

    const handlePrint = () => {
        // Pequeño delay para asegurar que el DOM de impresión esté listo
        setTimeout(() => {
            window.print();
        }, 150);
    };

    const fecha = new Date();
    const fechaFormateada = fecha.toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric' });
    const horaFormateada = fecha.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' });

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm print:bg-white print:p-0 print:block">
                    
                    {/* ESTILOS INYECTADOS PARA IMPRESORA TÉRMICA 80mm */}
                    <style dangerouslySetInnerHTML={{ __html: `
                        @media print {
                            @page { margin: 0; size: 80mm auto; }
                            body { margin: 0; padding: 0; background: white; }
                            .print-area { 
                                display: block !important; 
                                width: 80mm; 
                                padding: 4mm;
                                font-family: 'Courier New', Courier, monospace;
                                color: black;
                            }
                            .no-print { display: none !important; }
                            .ticket-header { text-align: center; margin-bottom: 5mm; }
                            .negocio-nombre { font-size: 14pt; font-weight: bold; text-transform: uppercase; margin: 0; }
                            .negocio-info { font-size: 8pt; margin-top: 2mm; }
                            .ticket-divider { border-top: 1px dashed black; margin: 3mm 0; }
                            .ticket-boleta-num { text-align: center; font-weight: bold; margin: 3mm 0; }
                            .ticket-meta { font-size: 8pt; display: flex; justify-content: space-between; }
                            .ticket-items-header { display: flex; justify-content: space-between; font-size: 8pt; font-weight: bold; border-bottom: 1px solid black; }
                            .ticket-item { display: flex; justify-content: space-between; font-size: 8pt; margin-top: 1mm; }
                            .ticket-total-box { border-top: 1px double black; margin-top: 4mm; padding-top: 2mm; text-align: right; }
                            .ticket-total-row { display: flex; justify-content: space-between; font-size: 12pt; font-weight: bold; }
                            .ticket-footer { text-align: center; margin-top: 6mm; font-size: 8pt; }
                        }
                    `}} />

                    {/* VISTA EN PANTALLA (NO SE IMPRIME) */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden flex flex-col max-h-[96vh] print:hidden"
                    >
                        {/* Header */}
                        <div className="bg-pocholo-red text-white p-4 text-center">
                            <h2 className="text-lg font-bold">Boleta de Venta</h2>
                            <p className="text-white/80 text-xs">{numeroBoleta}</p>
                        </div>

                        {/* Buscador DNI */}
                        <div className="p-4 bg-gray-50 border-b border-gray-100">
                            <div className="flex gap-2">
                                <div className="relative flex-1">
                                    <input
                                        type="text"
                                        value={dni}
                                        onChange={(e) => setDni(e.target.value.replace(/\D/g, '').slice(0, 8))}
                                        placeholder="DNI del cliente"
                                        className="w-full pl-9 pr-3 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-pocholo-red/20 outline-none"
                                    />
                                    <Search className="absolute left-3 top-2.5 text-gray-400" size={16} />
                                </div>
                                <button 
                                    onClick={handleDNISearch} 
                                    disabled={isSearching || dni.length !== 8}
                                    className="bg-pocholo-yellow text-pocholo-red font-bold px-4 rounded-xl text-xs disabled:opacity-50"
                                >
                                    {isSearching ? <RefreshCw className="animate-spin" size={16} /> : 'BUSCAR'}
                                </button>
                            </div>
                            {clienteNombre && (
                                <div className="mt-2 text-[11px] font-bold text-gray-700 uppercase bg-white p-2 rounded-lg border border-green-100">
                                    👤 {clienteNombre}
                                </div>
                            )}
                        </div>

                        {/* Preview Scrollable */}
                        <div className="flex-1 overflow-y-auto p-4 bg-gray-100">
                            <div className="bg-white p-4 shadow-sm font-mono text-[12px] text-black">
                                <div className="text-center border-b border-black pb-2 mb-2">
                                    <p className="font-bold text-base">{config.razon_social}</p>
                                    <p className="text-[10px]">RUC: {config.ruc}</p>
                                    <p className="text-[10px]">{config.direccion}</p>
                                </div>
                                <div className="space-y-1 mb-2">
                                    {items.map((item, idx) => (
                                        <div key={idx} className="flex justify-between">
                                            <span>{item.cantidad} x {item.nombre?.substring(0, 15)}</span>
                                            <span>S/ {(Number(item.cantidad) * Number(item.precio)).toFixed(2)}</span>
                                        </div>
                                    ))}
                                </div>
                                <div className="border-t-2 border-black pt-2 flex justify-between font-bold text-sm">
                                    <span>TOTAL</span>
                                    <span>S/ {total.toFixed(2)}</span>
                                </div>
                            </div>
                        </div>

                        {/* Botones */}
                        <div className="p-4 grid grid-cols-2 gap-3">
                            <button onClick={onClose} className="py-3 text-gray-500 font-semibold hover:bg-gray-100 rounded-xl transition-colors">Cerrar</button>
                            <button onClick={handlePrint} className="py-3 bg-pocholo-red text-white font-bold rounded-xl shadow-lg flex items-center justify-center gap-2">
                                <Printer size={18} /> IMPRIMIR
                            </button>
                        </div>
                    </motion.div>

                    {/* ÁREA DE IMPRESIÓN (SOLO VISIBLE AL IMPRIMIR) */}
                    <div className="hidden print:block print-area">
                        <div className="ticket-header">
                            <p className="negocio-nombre">{config.razon_social}</p>
                            <div className="negocio-info">
                                <p>RUC: {config.ruc}</p>
                                <p>{config.direccion}</p>
                                <p>TEL: {config.telefono}</p>
                            </div>
                        </div>

                        <div className="ticket-divider"></div>

                        <div className="ticket-boleta-num">
                            <p>BOLETA DE VENTA</p>
                            <p>{numeroBoleta}</p>
                        </div>

                        <div className="ticket-meta">
                            <span>FECHA: {fechaFormateada}</span>
                            <span>HORA: {horaFormateada}</span>
                        </div>
                        {mesaNumero && <div className="ticket-boleta-num" style={{textAlign: 'left'}}>MESA: {mesaNumero}</div>}

                        <div className="ticket-divider"></div>

                        {clienteNombre && (
                            <div className="negocio-info" style={{marginBottom: '3mm'}}>
                                <p>CLIENTE: {clienteNombre.toUpperCase()}</p>
                                <p>DNI: {dni}</p>
                                <div className="ticket-divider"></div>
                            </div>
                        )}

                        <div className="ticket-items-header">
                            <span>CANT  DESCRIPCION</span>
                            <span>TOTAL</span>
                        </div>

                        {items.map((item, idx) => (
                            <div key={idx} className="ticket-item">
                                <span style={{width: '15%'}}>{item.cantidad}</span>
                                <span style={{width: '55%', textTransform: 'uppercase'}}>{item.nombre}</span>
                                <span style={{width: '30%', textAlign: 'right'}}>S/ {(Number(item.cantidad) * Number(item.precio)).toFixed(2)}</span>
                            </div>
                        ))}

                        <div className="ticket-total-box">
                            <div className="ticket-total-row">
                                <span>TOTAL:</span>
                                <span>S/ {total.toFixed(2)}</span>
                            </div>
                        </div>

                        <div className="ticket-footer">
                            <p className="footer-mensaje">"{config.mensaje_boleta}"</p>
                            <p className="footer-slogan">LA PASIÓN HECHA SAZÓN</p>
                            <p style={{fontSize: '6pt', marginTop: '4mm'}}>KODEFY TECH - SISTEMAS</p>
                        </div>
                    </div>
                </div>
            )}
        </AnimatePresence>
    );
}
