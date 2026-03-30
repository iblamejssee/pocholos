import { useRef, useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Printer, X, CheckCircle, Receipt, Search, User, RefreshCw, Trash2 } from 'lucide-react';
import type { ItemCarrito, ItemVenta } from '@/lib/database.types';
import { supabase } from '@/lib/supabase';
import { consultarDNI, consultarRUC } from '@/services/apiPeruService';

interface ReceiptModalProps {

    isOpen: boolean;
    onClose: () => void;
    items: (ItemCarrito | ItemVenta)[];
    total: number;
    orderId?: string;
    mesaNumero?: number;
    title?: string;
    isNewSale?: boolean; // Prop to control counter increment
}

interface ConfigNegocio {
    id?: number; // Added ID for reliable updates
    ruc: string;
    razon_social: string;
    direccion: string;
    telefono: string;
    mensaje_boleta: string;
    serie_boleta: string;
    numero_correlativo: number;
    serie_ticket?: string;
    numero_ticket?: number;
}

export default function ReceiptModal({ isOpen, onClose, items, total, orderId, mesaNumero, title = 'BOLETA DE VENTA', isNewSale = false }: ReceiptModalProps) {
    const [config, setConfig] = useState<ConfigNegocio>({
        ruc: '',
        razon_social: "POCHOLO'S CHICKEN",
        direccion: '',
        telefono: '',
        mensaje_boleta: '¡Gracias por su preferencia!',
        serie_boleta: 'B001',
        numero_correlativo: 1,
        serie_ticket: 'T001',
        numero_ticket: 1
    });

    const [numeroBoleta, setNumeroBoleta] = useState('');
    const [tipoComprobante, setTipoComprobante] = useState<'boleta' | 'ticket'>('boleta'); // Nuevo estado
    const [serieTicket, setSerieTicket] = useState('T001'); // Serie interna para tickets
    const [numeroTicket, setNumeroTicket] = useState(''); // Correlativo para tickets
    const [documento, setDocumento] = useState('');
    const [clienteNombre, setClienteNombre] = useState('');
    const [clienteDireccion, setClienteDireccion] = useState('');
    const [isSearching, setIsSearching] = useState(false);
    const [errorDocumento, setErrorDocumento] = useState<string | null>(null);
    const [yaImpreso, setYaImpreso] = useState(false); // Evita sumar múltiple si le dan 2 veces a imprimir

    useEffect(() => {
        if (isOpen) {
            // Reset client data when opening modal
            setClienteNombre('');
            setClienteDireccion('');
            setErrorDocumento(null);
            setYaImpreso(false);

            // Si viene título forzado, respetar, sino default a Boleta
            if (title && title !== 'BOLETA DE VENTA') {
                setTipoComprobante('ticket');
                cargarConfiguracion('ticket');
            } else {
                setTipoComprobante('boleta');
                cargarConfiguracion('boleta');
            }
        }
    }, [isOpen, title]);

    // Cuando el usuario cambia manualmente el tipo
    const handleTipoChange = (tipo: 'boleta' | 'ticket') => {
        setTipoComprobante(tipo);
        cargarConfiguracion(tipo);
    };

    const cargarConfiguracion = async (tipoOverride?: 'boleta' | 'ticket') => {
        try {
            const tipoFinal = tipoOverride || tipoComprobante;
            const { data } = await supabase
                .from('configuracion_negocio')
                .select('*')
                .limit(1)
                .single();

            if (data) {
                setConfig(data);

                if (tipoFinal === 'boleta') {
                    const numero = String(data.numero_correlativo + 1).padStart(8, '0');
                    setNumeroBoleta(`${data.serie_boleta}-${numero}`);
                } else {
                    const serieT = data.serie_ticket || 'T001';
                    const numT = String((data.numero_ticket || 0) + 1).padStart(6, '0');
                    setSerieTicket(serieT);
                    setNumeroTicket(`${serieT}-${numT}`);
                }
            }
        } catch (error) {
            console.error('Error al cargar configuración:', error);
        }
    };
    const handleDocumentSearch = async () => {
        if (documento.length !== 8 && documento.length !== 11) {
            setErrorDocumento('El documento debe tener 8 (DNI) u 11 (RUC) dígitos');
            return;
        }

        setIsSearching(true);
        setErrorDocumento(null);

        try {
            const isRUC = documento.length === 11;
            const response = isRUC ? await consultarRUC(documento) : await consultarDNI(documento);

            if (response.success && response.data) {
                setClienteNombre(response.data.nombre_completo || response.data.razon_social || '');
                const d = response.data as any;
                let dir = d.direccion_completa || d.direccion || '';
                if (d.distrito && d.provincia && d.departamento && dir) {
                    dir += ` - ${d.distrito} - ${d.provincia} - ${d.departamento}`;
                }
                setClienteDireccion(dir);
            } else {
                setErrorDocumento(response.message || `No se encontró el ${isRUC ? 'RUC' : 'DNI'}`);
                setClienteNombre('');
                setClienteDireccion('');
            }
        } catch (error) {
            setErrorDocumento('Error al consultar el documento');
            setClienteNombre('');
        } finally {
            setIsSearching(false);
        }
    };

    const clearClientData = () => {
        setDocumento('');
        setClienteNombre('');
        setClienteDireccion('');
        setErrorDocumento(null);
    };

    const handlePrint = async () => {
        // 1. Validar si debe incrementar correlativo
        // NO incrementar si es "Estado de Cuenta" (Pre-cuenta)
        // NO incrementar si es una re-impresión (ID de venta ya existe y el título sugiere reporte/historial)
        // SÓLO incrementar si es boleta y si NO ha sido impresa ya en esta sesión
        const esPreCuenta = title === 'ESTADO DE CUENTA';
        const debeIncrementar = isNewSale && !esPreCuenta && tipoComprobante === 'boleta' && !yaImpreso;

        if (debeIncrementar) {
            try {
                const { data: freshConfig, error: fetchError } = await supabase
                    .from('configuracion_negocio')
                    .select('*')
                    .limit(1)
                    .single();

                if (!fetchError && freshConfig) {
                    const nuevoCorrelativo = (freshConfig.numero_correlativo || 0) + 1;
                    await supabase
                        .from('configuracion_negocio')
                        .update({ numero_correlativo: nuevoCorrelativo })
                        .eq('id', freshConfig.id);
                    console.log('Boleta incrementada');
                    setYaImpreso(true);

                    // Refrescar localmente para que si imprimen de nuevo aparezca el siguiente
                    await cargarConfiguracion();
                }
            } catch (err) {
                console.error("Error al actualizar correlativo:", err);
            }
        }

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

    // Portal para el ticket de impresión
    const printTicketContent = (
        <div className="hidden print:block print-ticket">
            {/* Encabezado del negocio */}
            <div className="ticket-header" style={{ textAlign: 'center' }}>
                <p className="negocio-nombre" style={{ marginBottom: '2px' }}>{config.razon_social}</p>
                <div className="negocio-info" style={{ marginTop: 0 }}>
                    <p style={{ fontWeight: 'bold', fontSize: '12px' }}>ROJAS PALOMINO LADY LAURA</p>
                    <p>AV. INDEPENDENCIA MZA. A LOTE. 06 URB. LUIS CARRANZA AYARZA</p>
                    <p>FRENTE DE LA DIRECCION REGIONAL DE AGRIC</p>
                    <p>AYACUCHO - HUAMANGA - AYACUCHO</p>
                    {config.ruc && <p style={{ marginTop: '4px', fontWeight: 'bold' }}>RUC: {config.ruc}</p>}
                    {config.telefono && <p>TEL: {config.telefono}</p>}
                </div>
            </div>

            {/* Número de boleta/ticket */}
            <div className="ticket-boleta-num">
                <p className="boleta-titulo">{tipoComprobante === 'boleta' ? 'BOLETA DE VENTA' : 'TICKET DE VENTA'}</p>
                <p className="boleta-numero">
                    {tipoComprobante === 'boleta' ? numeroBoleta : numeroTicket}
                </p>
            </div>

            {/* Fecha, hora, mesa */}
            <div className="ticket-meta">
                <div className="ticket-meta-row">
                    <span>FECHA: {fechaFormateada}</span>
                    <span>HORA: {horaFormateada}</span>
                </div>
            </div>
            {mesaNumero && tipoComprobante === 'ticket' && ( // MESA solo en Ticket, no en Boleta
                <div className="ticket-mesa">
                    MESA: {mesaNumero}
                </div>
            )}

            {/* Datos del cliente */}
            {(documento && clienteNombre) && (
                <div className="ticket-cliente">
                    <p style={{ fontSize: '9pt', textDecoration: 'underline', textTransform: 'uppercase' }}>Datos del Cliente:</p>
                    <p>{documento.length === 11 ? 'RUC' : 'DNI'}: {documento}</p>
                    <p>SR(A): {clienteNombre.toUpperCase()}</p>
                    {clienteDireccion && <p>DIR: {clienteDireccion.toUpperCase()}</p>}
                </div>
            )}

            {/* Cabecera de items */}
            <div className="ticket-items-header">
                <span>CANT  DESCRIPCIÓN</span>
                <span>TOTAL</span>
            </div>

            {/* Items de venta */}
            <div>
                {items.map((item, idx) => {
                    const cantidad = Number(item.cantidad) || 0;
                    const precio = Number(item.precio) || 0;
                    const subtotal = Number((item as any).subtotal) || (cantidad * precio);
                    return (
                        <div key={idx} className="ticket-item">
                            <span className="item-cantidad">{cantidad}</span>
                            <span className="item-nombre">{item.nombre?.toUpperCase()}</span>
                            <span className="item-precio" style={{ whiteSpace: 'nowrap' }}>S/ {subtotal.toFixed(2)}</span>
                        </div>
                    );
                })}
            </div>

            {/* Total */}
            <div className="ticket-total-box">
                <div className="ticket-total-row">
                    <span className="ticket-total-label">TOTAL A PAGAR:</span>
                    <span className="ticket-total-amount">S/ {total.toFixed(2)}</span>
                </div>
            </div>

            {/* Footer */}
            <div className="ticket-footer">
                <p className="footer-mensaje">"{config.mensaje_boleta}"</p>
                <div className="footer-slogan">LA PASIÓN HECHA SAZÓN</div>
                <p className="footer-sistema">SISTEMA POCHOLO'S V1.0</p>
            </div>
        </div>
    );

    // Renderizar el portal solo en el cliente
    const [mounted, setMounted] = useState(false);
    useEffect(() => {
        setMounted(true);
        return () => setMounted(false);
    }, []);

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm print:hidden">

                    {/* Contenedor Principal (Visible en Pantalla) */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden flex flex-col max-h-[96vh]"
                    >
                        {/* Header Visual */}
                        <div className="bg-pocholo-red text-white p-4 text-center">
                            <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center mx-auto mb-1 p-1.5 shadow-lg">
                                <img src="/images/logo-pocholos-icon.png" alt="Logo" className="w-full h-full object-contain" />
                            </div>

                            <h2 className="text-lg font-bold">{tipoComprobante === 'boleta' ? 'BOLETA DE VENTA' : 'TICKET DE VENTA'}</h2>
                            <p className="text-white/80 text-xs">
                                {tipoComprobante === 'boleta' ? numeroBoleta : numeroTicket}
                            </p>

                            {/* Selector de Tipo */}
                            <div className="flex justify-center gap-2 mt-3">
                                <button
                                    onClick={() => handleTipoChange('boleta')}
                                    className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${tipoComprobante === 'boleta'
                                        ? 'bg-white text-pocholo-red shadow-lg'
                                        : 'bg-red-700/50 text-white hover:bg-red-700'
                                        }`}
                                >
                                    BOLETA
                                </button>
                                <button
                                    onClick={() => handleTipoChange('ticket')}
                                    className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${tipoComprobante === 'ticket'
                                        ? 'bg-white text-pocholo-red shadow-lg'
                                        : 'bg-red-700/50 text-white hover:bg-red-700'
                                        }`}
                                >
                                    TICKET
                                </button>
                            </div>
                        </div>

                        {/* Sección de Cliente / DNI */}
                        <div className="p-4 bg-gray-50 border-b border-gray-100">
                            <div className="flex flex-col gap-2">
                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider ml-1">Identificación del Cliente (Opcional)</label>
                                <div className="flex gap-2">
                                    <div className="relative flex-1">
                                        <input
                                            type="text"
                                            value={documento}
                                            onChange={(e) => setDocumento(e.target.value.replace(/\D/g, '').slice(0, 11))}
                                            placeholder="DNI (8) o RUC (11)"
                                            className="w-full pl-9 pr-3 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-pocholo-red/20 focus:border-pocholo-red transition-all"
                                        />
                                        <Search className="absolute left-3 top-2.5 text-gray-400" size={16} />
                                    </div>
                                    <button
                                        onClick={handleDocumentSearch}
                                        disabled={isSearching || (documento.length !== 8 && documento.length !== 11)}
                                        className="bg-pocholo-yellow hover:bg-yellow-500 disabled:bg-gray-200 text-pocholo-red font-bold px-3 py-2 rounded-xl text-xs transition-colors flex items-center gap-1 min-w-[90px] justify-center"
                                    >
                                        {isSearching ? <RefreshCw className="animate-spin" size={14} /> : 'Consultar'}
                                    </button>
                                    {(documento || clienteNombre) && (
                                        <button
                                            onClick={clearClientData}
                                            className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors rounded-xl"
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                    )}
                                </div>

                                {errorDocumento && <p className="text-[10px] text-red-500 ml-1 font-medium">{errorDocumento}</p>}

                                {clienteNombre && (
                                    <>
                                        <motion.div
                                            initial={{ opacity: 0, y: -5 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            className="bg-white p-2 rounded-xl border border-green-100 flex items-center gap-2"
                                        >
                                            <div className="bg-green-100 text-green-600 p-1.5 rounded-lg">
                                                <User size={14} />
                                            </div>
                                            <div className="flex-1 overflow-hidden">
                                                <p className="text-[10px] text-gray-500 leading-none mb-0.5">Nombre Registrado:</p>
                                                <p className="text-[11px] font-bold text-gray-800 truncate uppercase">{clienteNombre}</p>
                                            </div>
                                        </motion.div>

                                        <motion.div
                                            initial={{ opacity: 0, y: -5 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            className="mt-1"
                                        >
                                            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider ml-1 mb-1 block">Dirección (Opcional)</label>
                                            <input
                                                type="text"
                                                value={clienteDireccion}
                                                onChange={(e) => setClienteDireccion(e.target.value)}
                                                placeholder="Ej. Av. Principal 123"
                                                className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-pocholo-red/20 focus:border-pocholo-red transition-all"
                                            />
                                        </motion.div>
                                    </>
                                )}
                            </div>
                        </div>

                        {/* Vista Previa del Ticket en Pantalla */}
                        <div className="flex-1 overflow-y-auto p-4 bg-gray-50/50">
                            <div className="bg-white shadow-sm border border-gray-200 p-5 rounded-xl text-[13px] font-mono text-gray-700">
                                <div className="text-center pb-3 mb-3 border-b-2 border-black">
                                    <p className="font-black text-xl text-black leading-tight mb-1 uppercase tracking-tighter">{config.razon_social}</p>
                                    <div className="space-y-0.5 text-[10px] text-gray-500 font-bold uppercase">
                                        <p className="text-black text-[11px]">ROJAS PALOMINO LADY LAURA</p>
                                        <p className="leading-tight">AV. INDEPENDENCIA MZA. A LOTE. 06 URB. LUIS CARRANZA AYARZA</p>
                                        <p className="leading-tight">FRENTE DE LA DIRECCION REGIONAL DE AGRIC</p>
                                        <p className="leading-tight">AYACUCHO - HUAMANGA - AYACUCHO</p>
                                        {config.ruc && <p className="text-black pt-1">RUC: {config.ruc}</p>}
                                        {config.telefono && <p>TEL: {config.telefono}</p>}
                                    </div>
                                    <div className="mt-3 pt-2 border-t border-gray-100">
                                        <p className="font-black text-base text-pocholo-red tracking-widest">
                                            {tipoComprobante === 'boleta' ? numeroBoleta : numeroTicket}
                                        </p>
                                        <p className="text-[11px] text-gray-400 mt-1">{fechaFormateada} - {horaFormateada}</p>
                                        {mesaNumero && tipoComprobante === 'ticket' && (
                                            <p className="text-[11px] bg-pocholo-red text-white font-bold rounded-full px-3 py-0.5 inline-block mt-2">MESA: {mesaNumero}</p>
                                        )}
                                    </div>
                                </div>

                                {/* Información del Cliente en Ticket On-Screen */}
                                {(documento && clienteNombre) && (
                                    <div className="mb-4 pb-3 border-b-2 border-black text-[11px] space-y-1">
                                        <p className="text-[9px] font-bold text-gray-400 uppercase mb-1">Datos del Cliente</p>
                                        <div className="flex gap-2">
                                            <span className="font-black text-black w-12 italic">{documento.length === 11 ? 'RUC:' : 'DNI:'}</span>
                                            <span className="text-black">{documento}</span>
                                        </div>
                                        <div className="flex gap-2 items-start">
                                            <span className="font-black text-black w-12 italic">SR(A):</span>
                                            <p className="uppercase text-black flex-1 leading-tight">{clienteNombre}</p>
                                        </div>
                                        {clienteDireccion && (
                                            <div className="flex gap-2 items-start">
                                                <span className="font-black text-black w-12 italic">DIR:</span>
                                                <p className="uppercase text-black flex-1 leading-tight">{clienteDireccion}</p>
                                            </div>
                                        )}
                                    </div>
                                )}

                                <div className="mb-4">
                                    <div className="flex justify-between text-[11px] font-black text-black border-b border-black pb-1 mb-2 uppercase">
                                        <span>CANT  DESCRIPCIÓN</span>
                                        <span>TOTAL</span>
                                    </div>
                                    <div className="space-y-2">
                                        {items.map((item, idx) => {
                                            const cantidad = Number(item.cantidad) || 0;
                                            const precio = Number(item.precio) || 0;
                                            const subtotal = Number((item as any).subtotal) || (cantidad * precio);
                                            return (
                                                <div key={idx} className="flex justify-between text-black leading-snug items-start">
                                                    <span className="pr-4"><span className="font-black">{cantidad}</span> {item.nombre?.toUpperCase()}</span>
                                                    <span className="font-black whitespace-nowrap">S/ {subtotal.toFixed(2)}</span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>

                                <div className="border-t-4 border-black pt-3 mb-4">
                                    <div className="flex justify-between items-center">
                                        <span className="font-black text-base text-black uppercase">TOTAL A PAGAR</span>
                                        <span className="text-xl font-black text-black">S/ {total.toFixed(2)}</span>
                                    </div>
                                </div>

                                <div className="text-center mt-6 pt-4 border-t-2 border-black">
                                    <p className="text-[11px] leading-tight font-bold italic mb-2">"{config.mensaje_boleta}"</p>
                                    <div className="bg-black text-white py-1 px-4 inline-block transform -rotate-1">
                                        <p className="text-[10px] uppercase font-black tracking-widest">La Pasión Hecha Sazón</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="p-4 border-t border-gray-100 grid grid-cols-2 gap-3 bg-white">
                            <button onClick={onClose} className="py-3 px-4 rounded-xl font-semibold text-gray-500 hover:bg-gray-100 transition-colors flex items-center justify-center gap-2">
                                <X size={20} /> Cerrar
                            </button>
                            <button onClick={handlePrint} className="py-3 px-4 rounded-xl font-bold text-white bg-pocholo-red hover:bg-red-700 shadow-lg transition-all flex items-center justify-center gap-2">
                                <Printer size={20} /> Imprimir
                            </button>
                        </div>
                    </motion.div>

                    {/* El Ticket ahora se renderiza vía Portal */}
                    {mounted && printTicketContent && createPortal(printTicketContent, document.body)}

                </div>
            )}
        </AnimatePresence >
    );
}
