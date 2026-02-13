import { useRef, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Printer, X, Search, User, RefreshCw, Trash2, ReceiptText } from 'lucide-react';
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
            const { data } = await supabase.from('configuracion_negocio').select('*').limit(1).single();
            if (data) {
                setConfig(data);
                setNumeroBoleta(`${data.serie_boleta}-${String(data.numero_correlativo).padStart(8, '0')}`);
            }
        } catch (error) {
            setNumeroBoleta(`B001-${Math.floor(Math.random() * 1000000).toString().padStart(8, '0')}`);
        }
    };

    const handleDNISearch = async () => {
        if (dni.length !== 8) return setErrorDni('DNI inválido');
        setIsSearching(true);
        setErrorDni(null);
        try {
            const response = await consultarDNI(dni);
            if (response.success && response.data) setClienteNombre(response.data.nombre_completo);
            else setErrorDni('No encontrado');
        } catch (error) {
            setErrorDni('Error de conexión');
        } finally {
            setIsSearching(false);
        }
    };

    const handlePrint = () => {
        window.print();
    };

    const fecha = new Date();
    const fechaStr = fecha.toLocaleDateString('es-PE');
    const horaStr = fecha.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' });

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md print:static print:bg-white print:p-0">
                    
                    {/* CSS CRÍTICO DE IMPRESIÓN - ESTO ARREGLA LA HOJA EN BLANCO */}
                    <style dangerouslySetInnerHTML={{ __html: `
                        @media print {
                            /* Ocultamos absolutamente todo lo que no sea el ticket */
                            body * { visibility: hidden; }
                            #ticket-impresion, #ticket-impresion * { visibility: visible; }
                            #ticket-impresion {
                                position: absolute;
                                left: 0;
                                top: 0;
                                width: 80mm; /* Ancho real de tu impresora Advance */
                                padding: 2mm;
                                background: white;
                                display: block !important;
                                visibility: visible !important;
                            }
                            @page { size: 80mm auto; margin: 0; }
                        }
                    `}} />

                    {/* MODAL EN PANTALLA (NO SE IMPRIME) */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
                        className="bg-white rounded-[2rem] shadow-2xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh] print:hidden border border-gray-100"
                    >
                        {/* Banner Superior */}
                        <div className="bg-gradient-to-r from-red-600 to-red-700 text-white p-6 text-center relative">
                            <div className="absolute top-4 right-4 text-white/20"><ReceiptText size={48} /></div>
                            <h2 className="text-xl font-black uppercase tracking-tight">Pocholo's Chicken</h2>
                            <p className="text-sm font-medium opacity-90">{numeroBoleta}</p>
                        </div>

                        {/* Buscador de Cliente */}
                        <div className="p-5 bg-gray-50/80 border-b border-gray-100">
                            <div className="flex gap-3">
                                <div className="relative flex-1">
                                    <input
                                        type="text" value={dni} onChange={(e) => setDni(e.target.value.replace(/\D/g, '').slice(0, 8))}
                                        placeholder="Ingrese DNI"
                                        className="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-2xl text-sm focus:ring-4 focus:ring-red-500/10 outline-none transition-all"
                                    />
                                    <Search className="absolute left-3.5 top-3.5 text-gray-400" size={18} />
                                </div>
                                <button onClick={handleDNISearch} disabled={isSearching || dni.length !== 8} className="bg-yellow-400 hover:bg-yellow-500 text-red-700 font-bold px-5 rounded-2xl transition-transform active:scale-95 disabled:opacity-50">
                                    {isSearching ? <RefreshCw className="animate-spin" size={20} /> : 'BUSCAR'}
                                </button>
                            </div>
                            {clienteNombre && (
                                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-3 p-3 bg-white rounded-xl border border-green-100 flex items-center gap-3">
                                    <div className="bg-green-500 text-white p-1.5 rounded-full"><User size={14} /></div>
                                    <p className="text-xs font-bold text-gray-800 uppercase truncate">{clienteNombre}</p>
                                    <button onClick={() => {setDni(''); setClienteNombre('');}} className="ml-auto text-gray-300 hover:text-red-500"><Trash2 size={16} /></button>
                                </motion.div>
                            )}
                        </div>

                        {/* Vista Previa del Contenido */}
                        <div className="flex-1 overflow-y-auto p-6 space-y-4">
                            <div className="border-b border-dashed border-gray-200 pb-4">
                                <p className="text-[10px] font-bold text-gray-400 uppercase mb-2 tracking-widest">Resumen de Orden</p>
                                {items.map((item, idx) => (
                                    <div key={idx} className="flex justify-between items-center text-sm mb-2">
                                        <p className="text-gray-700 font-medium"><span className="text-red-600 font-bold">{item.cantidad}x</span> {item.nombre?.toUpperCase()}</p>
                                        <p className="font-bold text-gray-900">S/ {(Number(item.cantidad) * Number(item.precio)).toFixed(2)}</p>
                                    </div>
                                ))}
                            </div>
                            <div className="flex justify-between items-center pt-2">
                                <p className="text-lg font-black text-gray-900 uppercase">Total a Pagar</p>
                                <p className="text-2xl font-black text-red-600">S/ {total.toFixed(2)}</p>
                            </div>
                        </div>

                        {/* Acciones */}
                        <div className="p-6 bg-white border-t border-gray-100 grid grid-cols-2 gap-4">
                            <button onClick={onClose} className="py-4 text-gray-400 font-bold hover:text-gray-600 hover:bg-gray-50 rounded-2xl transition-all">DESCARTAR</button>
                            <button onClick={handlePrint} className="py-4 bg-red-600 text-white font-black rounded-2xl shadow-xl shadow-red-500/20 hover:bg-red-700 transition-all flex items-center justify-center gap-2">
                                <Printer size={20} /> IMPRIMIR
                            </button>
                        </div>
                    </motion.div>

                    {/* TICKET DE IMPRESIÓN (SOLO VISIBLE AL IMPRIMIR) */}
                    <div id="ticket-impresion" className="hidden">
                        <div style={{ textAlign: 'center', marginBottom: '10px' }}>
                            <p style={{ fontSize: '14pt', fontWeight: 'bold', margin: 0 }}>{config.razon_social}</p>
                            <p style={{ fontSize: '8pt', margin: '2px 0' }}>RUC: {config.ruc}</p>
                            <p style={{ fontSize: '8pt', margin: 0 }}>{config.direccion}</p>
                            <p style={{ fontSize: '8pt', margin: 0 }}>TEL: {config.telefono}</p>
                        </div>

                        <div style={{ borderTop: '1px dashed black', margin: '10px 0' }}></div>

                        <div style={{ textAlign: 'center', fontWeight: 'bold' }}>
                            <p style={{ margin: 0 }}>BOLETA DE VENTA</p>
                            <p style={{ fontSize: '12pt', margin: 0 }}>{numeroBoleta}</p>
                        </div>

                        <div style={{ borderTop: '1px dashed black', margin: '10px 0' }}></div>

                        <div style={{ fontSize: '8pt' }}>
                            <p style={{ margin: 0 }}>FECHA: {fechaStr} - {horaStr}</p>
                            {mesaNumero && <p style={{ margin: 0, fontWeight: 'bold' }}>MESA: {mesaNumero}</p>}
                        </div>

                        {clienteNombre && (
                            <div style={{ fontSize: '8pt', marginTop: '10px' }}>
                                <p style={{ margin: 0 }}>CLIENTE: {clienteNombre.toUpperCase()}</p>
                                <p style={{ margin: 0 }}>DNI: {dni}</p>
                            </div>
                        )}

                        <div style={{ borderTop: '1px dashed black', margin: '10px 0' }}></div>

                        <table style={{ width: '100%', fontSize: '8pt', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr style={{ borderBottom: '1px solid black' }}>
                                    <th style={{ textAlign: 'left' }}>CANT</th>
                                    <th style={{ textAlign: 'left' }}>DESC.</th>
                                    <th style={{ textAlign: 'right' }}>TOTAL</th>
                                </tr>
                            </thead>
                            <tbody>
                                {items.map((item, idx) => (
                                    <tr key={idx}>
                                        <td style={{ verticalAlign: 'top' }}>{item.cantidad}</td>
                                        <td style={{ textTransform: 'uppercase' }}>{item.nombre}</td>
                                        <td style={{ textAlign: 'right', verticalAlign: 'top' }}>{(Number(item.cantidad) * Number(item.precio)).toFixed(2)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>

                        <div style={{ borderTop: '1px double black', marginTop: '10px', paddingTop: '5px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', fontSize: '11pt' }}>
                                <span>TOTAL:</span>
                                <span>S/ {total.toFixed(2)}</span>
                            </div>
                        </div>

                        <div style={{ textAlign: 'center', marginTop: '15px', fontSize: '8pt' }}>
                            <p style={{ fontStyle: 'italic', margin: 0 }}>"{config.mensaje_boleta}"</p>
                            <p style={{ fontWeight: 'bold', marginTop: '5px' }}>LA PASIÓN HECHA SAZÓN</p>
                            <p style={{ fontSize: '6pt', color: '#666', marginTop: '10px' }}>KODEFY TECH - SISTEMAS</p>
                        </div>
                    </div>
                </div>
            )}
        </AnimatePresence>
    );
}
