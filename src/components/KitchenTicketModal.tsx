'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Printer, X, ChefHat } from 'lucide-react';
import type { Venta } from '@/lib/database.types';

interface KitchenTicketModalProps {
    isOpen: boolean;
    onClose: () => void;
    venta: Venta | null;
}

export default function KitchenTicketModal({ isOpen, onClose, venta }: KitchenTicketModalProps) {
    if (!venta) return null;

    const fecha = new Date(venta.created_at);
    const horaFormateada = fecha.toLocaleTimeString('es-PE', {
        hour: '2-digit',
        minute: '2-digit'
    });

    const mesaNumero = (venta as any).mesas?.numero || venta.mesa_id || null;

    // Función de impresión que abre ventana emergente
    const handlePrint = () => {
        // Construir el HTML del ticket
        let itemsHtml = '';
        venta.items.forEach((item) => {
            const detalles = (item as any).detalles;
            itemsHtml += `
                <div class="item">
                    <div class="item-row">
                        <span class="item-qty">${item.cantidad}x</span>
                        <span class="item-name">${item.nombre}</span>
                    </div>
                    ${detalles?.parte ? `<p class="item-detail item-parte">→ ${detalles.parte.toUpperCase()}</p>` : ''}
                    ${detalles?.notas ? `<p class="item-detail item-nota">* ${detalles.notas}</p>` : ''}
                </div>
            `;
        });

        const ticketHtml = `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <title>Comanda - Mesa ${mesaNumero || 'Para Llevar'}</title>
                <style>
                    @page {
                        size: 80mm auto;
                        margin: 0;
                    }
                    * {
                        box-sizing: border-box;
                    }
                    body {
                        font-family: 'Courier New', monospace;
                        font-size: 14px;
                        width: 80mm;
                        margin: 0 auto;
                        padding: 3mm;
                        line-height: 1.4;
                        color: black;
                        background: white;
                    }
                    .header {
                        text-align: center;
                        margin-bottom: 10px;
                        padding-bottom: 8px;
                        border-bottom: 2px dashed black;
                    }
                    .header h1 {
                        font-size: 20px;
                        margin: 0 0 4px 0;
                        font-weight: bold;
                    }
                    .header .hora {
                        font-size: 12px;
                    }
                    .mesa {
                        text-align: center;
                        font-size: 18px;
                        font-weight: bold;
                        margin: 12px 0;
                    }
                    .mesa span {
                        border: 3px solid black;
                        padding: 8px 20px;
                        display: inline-block;
                        font-size: 20px;
                    }
                    .divider {
                        border-bottom: 2px dashed black;
                        margin: 10px 0;
                    }
                    .items {
                        margin: 10px 0;
                    }
                    .item {
                        border-bottom: 1px dashed #999;
                        padding: 8px 0;
                    }
                    .item:last-child {
                        border-bottom: none;
                    }
                    .item-row {
                        display: flex;
                        align-items: flex-start;
                    }
                    .item-qty {
                        font-weight: bold;
                        font-size: 16px;
                        margin-right: 10px;
                        min-width: 35px;
                    }
                    .item-name {
                        font-weight: bold;
                        font-size: 15px;
                        flex: 1;
                    }
                    .item-detail {
                        font-size: 12px;
                        padding-left: 45px;
                        margin-top: 2px;
                    }
                    .item-parte {
                        font-weight: 600;
                    }
                    .item-nota {
                        font-style: italic;
                    }
                    .notas {
                        margin: 10px 0;
                        padding: 8px;
                        border: 2px solid black;
                        font-size: 13px;
                    }
                    .notas-title {
                        font-weight: bold;
                        font-size: 12px;
                        margin-bottom: 4px;
                    }
                    .footer {
                        text-align: center;
                        font-size: 10px;
                        margin-top: 10px;
                        padding-top: 8px;
                        border-top: 2px dashed black;
                    }
                </style>
            </head>
            <body>
                <div class="header">
                    <h1>🍗 COMANDA 🍗</h1>
                    <p class="hora">Hora: ${horaFormateada}</p>
                </div>
                
                <div class="divider"></div>
                
                <div class="mesa">
                    <span>${mesaNumero ? `MESA ${mesaNumero}` : 'PARA LLEVAR'}</span>
                </div>
                
                <div class="divider"></div>
                
                <div class="items">
                    ${itemsHtml}
                </div>
                
                ${venta.notas ? `
                    <div class="divider"></div>
                    <div class="notas">
                        <p class="notas-title">⚠️ NOTAS:</p>
                        <p>${venta.notas}</p>
                    </div>
                ` : ''}
                
                <div class="divider"></div>
                
                <div class="footer">
                    <p>#${venta.id.slice(0, 8)}</p>
                    <p>---</p>
                </div>
            </body>
            </html>
        `;

        // Abrir ventana emergente e imprimir
        const printWindow = window.open('', '_blank', 'width=300,height=600');
        if (printWindow) {
            printWindow.document.write(ticketHtml);
            printWindow.document.close();
            printWindow.focus();

            // Esperar a que cargue y luego imprimir
            setTimeout(() => {
                printWindow.print();
                printWindow.close();
            }, 250);
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-100 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">

                    {/* Contenedor Principal */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden flex flex-col max-h-[90vh]"
                    >
                        {/* Header */}
                        <div className="bg-amber-500 text-white p-5 text-center">
                            <div className="w-14 h-14 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-2">
                                <ChefHat size={32} />
                            </div>
                            <h2 className="text-xl font-bold">Comanda de Cocina</h2>
                            <p className="text-white/80 text-sm">
                                {mesaNumero ? `Mesa ${mesaNumero}` : 'Para Llevar 🥡'}
                            </p>
                        </div>

                        {/* Vista Previa del Ticket */}
                        <div className="flex-1 overflow-y-auto p-4 bg-gray-50">
                            <div className="bg-white shadow-sm border border-gray-200 p-4 rounded-xl text-sm font-mono text-gray-700">
                                {/* Header de Comanda */}
                                <div className="text-center border-b border-dashed border-gray-300 pb-3 mb-3">
                                    <p className="font-black text-lg text-black">🍗 COMANDA 🍗</p>
                                    <p className="text-xs mt-1">Hora: {horaFormateada}</p>
                                    {mesaNumero && (
                                        <p className="text-base font-black bg-amber-100 rounded px-3 py-1 inline-block mt-2">
                                            MESA {mesaNumero}
                                        </p>
                                    )}
                                    {!mesaNumero && (
                                        <p className="text-base font-black bg-green-100 rounded px-3 py-1 inline-block mt-2">
                                            PARA LLEVAR
                                        </p>
                                    )}
                                </div>

                                {/* Items - Solo cantidad, nombre y notas */}
                                <div className="space-y-3 mb-3">
                                    {venta.items.map((item, idx) => (
                                        <div key={idx} className="border-b border-gray-100 last:border-0 pb-2 last:pb-0">
                                            <div className="flex items-start gap-2">
                                                <span className="bg-amber-500 text-white font-black px-2 py-0.5 rounded text-sm min-w-[32px] text-center">
                                                    {item.cantidad}x
                                                </span>
                                                <span className="font-bold text-black flex-1">
                                                    {item.nombre}
                                                </span>
                                            </div>
                                            {/* Detalles del item */}
                                            {(item as any).detalles && (
                                                <div className="ml-10 mt-1 space-y-1">
                                                    {(item as any).detalles.parte && (
                                                        <p className="text-xs bg-red-100 text-red-800 px-2 py-0.5 rounded inline-block font-semibold">
                                                            🍗 {(item as any).detalles.parte.toUpperCase()}
                                                        </p>
                                                    )}
                                                    {(item as any).detalles.notas && (
                                                        <p className="text-sm text-amber-800 bg-amber-50 px-2 py-1 rounded border-l-2 border-amber-500">
                                                            📝 {(item as any).detalles.notas}
                                                        </p>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>

                                {/* Notas generales del pedido */}
                                {venta.notas && (
                                    <div className="mt-3 p-3 bg-yellow-50 border-2 border-yellow-400 rounded-lg">
                                        <p className="font-black text-yellow-800 text-xs mb-1">⚠️ NOTAS DEL PEDIDO:</p>
                                        <p className="text-sm text-yellow-900 font-semibold">{venta.notas}</p>
                                    </div>
                                )}

                                {/* Footer */}
                                <div className="text-center mt-4 pt-3 border-t border-dashed border-gray-300">
                                    <p className="text-xs text-gray-400">Pedido #{venta.id.slice(0, 8)}</p>
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
                                className="py-3 px-4 rounded-xl font-bold text-white bg-amber-500 hover:bg-amber-600 shadow-lg transition-all flex items-center justify-center gap-2"
                            >
                                <Printer size={20} />
                                Imprimir
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
