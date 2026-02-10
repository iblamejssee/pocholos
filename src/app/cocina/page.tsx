'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Venta, ItemVenta, Producto } from '@/lib/database.types';
import PedidoCard from '@/components/PedidoCard';
import KitchenTicketModal from '@/components/KitchenTicketModal';
import { ChefHat, Loader2, RefreshCw, X, Save, Trash2, Plus, Minus, AlertTriangle, Search } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import ProtectedRoute from '@/components/ProtectedRoute';

export default function CocinaPage() {
    return (
        <ProtectedRoute>
            <CocinaContent />
        </ProtectedRoute>
    );
}

function CocinaContent() {
    const [pedidos, setPedidos] = useState<Venta[]>([]);
    const [loading, setLoading] = useState(true);
    const [showTicketModal, setShowTicketModal] = useState(false);
    const [selectedPedido, setSelectedPedido] = useState<Venta | null>(null);

    const [showEditModal, setShowEditModal] = useState(false);
    const [editingPedido, setEditingPedido] = useState<Venta | null>(null);
    const [editedItems, setEditedItems] = useState<ItemVenta[]>([]);
    const [isSaving, setIsSaving] = useState(false);

    const [productos, setProductos] = useState<Producto[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [showProductSearch, setShowProductSearch] = useState(false);
    const [selectedProduct, setSelectedProduct] = useState<Producto | null>(null);
    const [newProductNotes, setNewProductNotes] = useState('');

    const [showCancelModal, setShowCancelModal] = useState(false);
    const [cancellingId, setCancellingId] = useState<string | null>(null);

    const cargarPedidos = async () => {
        try {
            const { data, error } = await supabase
                .from('ventas')
                .select(`
                    *,
                    mesas:mesa_id (
                        numero
                    )
                `)
                .eq('estado_pedido', 'pendiente')
                .order('created_at', { ascending: true });

            if (error) throw error;
            setPedidos(data || []);
        } catch (error) {
            console.error('Error cargando pedidos:', error);
            toast.error('Error al cargar pedidos');
        } finally {
            setLoading(false);
        }
    };

    const cargarProductos = async () => {
        try {
            const { data, error } = await supabase
                .from('productos')
                .select('*')
                .eq('activo', true)
                .order('nombre');

            if (error) throw error;
            setProductos(data || []);
        } catch (error) {
            console.error('Error cargando productos:', error);
        }
    };

    useEffect(() => {
        cargarPedidos();
        cargarProductos();
        const interval = setInterval(cargarPedidos, 15000);
        return () => clearInterval(interval);
    }, []);

    const handleComplete = async (id: string) => {
        try {
            setPedidos(prev => prev.filter(p => p.id !== id));
            toast.success('Pedido completado', { icon: '✓' });

            const { error } = await supabase
                .from('ventas')
                .update({ estado_pedido: 'listo' })
                .eq('id', id);

            if (error) {
                toast.error('Error al actualizar');
                cargarPedidos();
            }
        } catch (error) {
            console.error('Error:', error);
        }
    };

    const handlePrint = (venta: Venta) => {
        setSelectedPedido(venta);
        setShowTicketModal(true);
    };

    const handleCancelClick = (id: string) => {
        setCancellingId(id);
        setShowCancelModal(true);
    };

    const confirmCancel = async () => {
        if (!cancellingId) return;
        try {
            const { data: pedido } = await supabase
                .from('ventas')
                .select('estado_pago, mesa_id')
                .eq('id', cancellingId)
                .single();

            if (pedido?.estado_pago === 'pagado') {
                toast.error('No se puede eliminar un pedido ya pagado');
                setShowCancelModal(false);
                setCancellingId(null);
                return;
            }

            const { error } = await supabase
                .from('ventas')
                .delete()
                .eq('id', cancellingId);

            if (error) throw error;

            // Liberar la mesa si tenía una asignada
            if (pedido?.mesa_id) {
                await supabase
                    .from('mesas')
                    .update({ estado: 'libre' })
                    .eq('id', pedido.mesa_id);
            }

            setPedidos(prev => prev.filter(p => p.id !== cancellingId));
            toast.success('Pedido cancelado — stock restaurado', { icon: '🗑️' });
        } catch (error) {
            console.error('Error:', error);
            toast.error('Error al cancelar');
        } finally {
            setShowCancelModal(false);
            setCancellingId(null);
        }
    };

    const handleEditClick = (venta: Venta) => {
        setEditingPedido(venta);
        setEditedItems([...venta.items]);
        setShowEditModal(true);
        setShowProductSearch(false);
        setSearchTerm('');
    };

    const updateItemQuantity = (index: number, delta: number) => {
        setEditedItems(prev => {
            const newItems = [...prev];
            const newQuantity = newItems[index].cantidad + delta;
            if (newQuantity <= 0) {
                newItems.splice(index, 1);
            } else {
                newItems[index] = { ...newItems[index], cantidad: newQuantity };
            }
            return newItems;
        });
    };

    const removeItem = (index: number) => {
        setEditedItems(prev => prev.filter((_, i) => i !== index));
    };

    const selectProductToAdd = (producto: Producto) => {
        setSelectedProduct(producto);
        setNewProductNotes('');
        setShowProductSearch(false);
    };

    const confirmAddProduct = () => {
        if (!selectedProduct) return;
        const existingIndex = editedItems.findIndex(item => item.producto_id === selectedProduct.id);
        if (existingIndex >= 0 && !newProductNotes) {
            updateItemQuantity(existingIndex, 1);
        } else {
            const newItem: any = {
                producto_id: selectedProduct.id,
                nombre: selectedProduct.nombre,
                cantidad: 1,
                precio: selectedProduct.precio,
                fraccion_pollo: selectedProduct.fraccion_pollo
            };
            if (newProductNotes.trim()) {
                newItem.detalles = { notas: newProductNotes.trim() };
            }
            setEditedItems(prev => [...prev, newItem]);
        }
        setSelectedProduct(null);
        setNewProductNotes('');
        setSearchTerm('');
        toast.success(`${selectedProduct.nombre} agregado`);
    };

    const cancelAddProduct = () => {
        setSelectedProduct(null);
        setNewProductNotes('');
    };

    const filteredProducts = productos.filter(p =>
        p.nombre.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const saveEditedPedido = async () => {
        if (!editingPedido || editedItems.length === 0) {
            toast.error('El pedido debe tener al menos un item');
            return;
        }
        setIsSaving(true);
        try {
            const nuevoTotal = editedItems.reduce((sum, item) => sum + (item.precio * item.cantidad), 0);
            const nuevosPollosRestados = editedItems.reduce((sum, item) => {
                return sum + ((item.fraccion_pollo || 0) * item.cantidad);
            }, 0);

            const { error } = await supabase
                .from('ventas')
                .update({
                    items: editedItems,
                    total: nuevoTotal,
                    pollos_restados: nuevosPollosRestados
                })
                .eq('id', editingPedido.id);

            if (error) throw error;
            toast.success('Pedido actualizado');
            setShowEditModal(false);
            setEditingPedido(null);
            cargarPedidos();
        } catch (error) {
            console.error('Error:', error);
            toast.error('Error al actualizar');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <>
            {/* ESTILOS DE EMERGENCIA PARA IMPRESIÓN */}
            <style dangerouslySetInnerHTML={{
                __html: `
                @media print {
                    .print\\:hidden { display: none !important; }
                    body { background: white !important; margin: 0 !important; padding: 0 !important; }
                    #ticket-print-container { 
                        display: block !important; 
                        visibility: visible !important; 
                        position: absolute !important;
                        left: 0 !important;
                        top: 0 !important;
                        width: 100% !important;
                    }
                    /* Forzar que el modal de ticket sea lo único visible */
                    div[role="dialog"] { 
                        position: static !important;
                        background: white !important;
                        box-shadow: none !important;
                    }
                }
            ` }} />

            <div className="min-h-screen bg-gray-100 p-4 md:p-8 print:hidden">
                <div className="max-w-lg mx-auto">
                    <header className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-3">
                            <div className="p-3 bg-gray-800 rounded-xl">
                                <ChefHat className="text-white" size={28} />
                            </div>
                            <div>
                                <h1 className="text-2xl font-bold text-gray-800">Cocina</h1>
                                <p className="text-sm text-gray-500">
                                    {pedidos.length} pedido{pedidos.length !== 1 ? 's' : ''} pendiente{pedidos.length !== 1 ? 's' : ''}
                                </p>
                            </div>
                        </div>

                        <button
                            onClick={cargarPedidos}
                            className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
                            title="Actualizar"
                        >
                            <RefreshCw size={20} className={loading ? 'animate-spin text-gray-600' : 'text-gray-600'} />
                        </button>
                    </header>

                    {loading && pedidos.length === 0 ? (
                        <div className="flex justify-center py-20">
                            <Loader2 className="animate-spin text-gray-400" size={40} />
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <AnimatePresence>
                                {pedidos.length === 0 ? (
                                    <motion.div
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="text-center py-16 text-gray-400"
                                    >
                                        <ChefHat size={56} className="mx-auto mb-3 opacity-50" />
                                        <p className="text-lg font-medium">Sin pedidos pendientes</p>
                                        <p className="text-sm">Los nuevos pedidos aparecerán aquí</p>
                                    </motion.div>
                                ) : (
                                    pedidos.map(pedido => (
                                        <PedidoCard
                                            key={pedido.id}
                                            venta={pedido}
                                            onComplete={handleComplete}
                                            onPrint={handlePrint}
                                            onEdit={handleEditClick}
                                            onCancel={handleCancelClick}
                                        />
                                    ))
                                )}
                            </AnimatePresence>
                        </div>
                    )}
                </div>
            </div>

            {/* CONTENEDOR DE TICKET FUERA DE PRINT:HIDDEN */}
            <div id="ticket-print-container">
                <KitchenTicketModal
                    isOpen={showTicketModal}
                    onClose={() => {
                        setShowTicketModal(false);
                        setSelectedPedido(null);
                    }}
                    venta={selectedPedido}
                />
            </div>

            {/* Modales de Interfaz (Edit/Cancel) */}
            <AnimatePresence>
                {showCancelModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 print:hidden">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6"
                        >
                            <div className="text-center">
                                <div className="w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <AlertTriangle size={28} className="text-gray-600" />
                                </div>
                                <h3 className="text-lg font-semibold text-gray-800 mb-2">Cancelar Pedido</h3>
                                <p className="text-gray-500 text-sm mb-6">Esta acción eliminará el pedido permanentemente.</p>
                                <div className="flex gap-3">
                                    <button onClick={() => { setShowCancelModal(false); setCancellingId(null); }} className="flex-1 py-2.5 px-4 rounded-lg font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors">No, mantener</button>
                                    <button onClick={confirmCancel} className="flex-1 py-2.5 px-4 rounded-lg font-medium text-white bg-gray-800 hover:bg-gray-900 transition-colors">Sí, cancelar</button>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            <AnimatePresence>
                {showEditModal && editingPedido && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 print:hidden">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]"
                        >
                            <div className="bg-gray-800 text-white p-4">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h2 className="text-lg font-semibold">Editar Pedido</h2>
                                        <p className="text-gray-300 text-sm">Mesa {(editingPedido as any).mesas?.numero || editingPedido.mesa_id || 'Mostrador'}</p>
                                    </div>
                                    <button onClick={() => { setShowEditModal(false); setEditingPedido(null); setShowProductSearch(false); }} className="p-2 hover:bg-white/10 rounded-lg transition-colors"><X size={20} /></button>
                                </div>
                            </div>

                            <div className="flex-1 overflow-y-auto">
                                <div className="p-4 border-b border-gray-100">
                                    {!showProductSearch && !selectedProduct && (
                                        <button onClick={() => setShowProductSearch(true)} className="w-full py-2.5 px-4 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 hover:border-gray-400 hover:text-gray-600 transition-colors flex items-center justify-center gap-2"><Plus size={18} />Agregar producto</button>
                                    )}
                                    {showProductSearch && !selectedProduct && (
                                        <div className="space-y-3">
                                            <div className="relative">
                                                <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                                <input type="text" placeholder="Buscar producto..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg outline-none" autoFocus />
                                            </div>
                                            <div className="max-h-48 overflow-y-auto space-y-1">
                                                {filteredProducts.slice(0, 10).map(producto => (
                                                    <button key={producto.id} onClick={() => selectProductToAdd(producto)} className="w-full p-3 text-left hover:bg-gray-50 rounded-lg flex justify-between items-center">
                                                        <span className="font-medium text-gray-700">{producto.nombre}</span>
                                                        <span className="text-gray-500 text-sm">S/ {producto.precio.toFixed(2)}</span>
                                                    </button>
                                                ))}
                                            </div>
                                            <button onClick={() => { setShowProductSearch(false); setSearchTerm(''); }} className="w-full py-2 text-gray-500 text-sm">Cancelar</button>
                                        </div>
                                    )}
                                    {selectedProduct && (
                                        <div className="space-y-3">
                                            <div className="p-3 bg-gray-50 rounded-lg flex justify-between items-center">
                                                <span className="font-semibold text-gray-800">{selectedProduct.nombre}</span>
                                                <span className="text-gray-600">S/ {selectedProduct.precio.toFixed(2)}</span>
                                            </div>
                                            <input type="text" placeholder="Notas (opcional)" value={newProductNotes} onChange={(e) => setNewProductNotes(e.target.value)} className="w-full px-3 py-2.5 border border-gray-200 rounded-lg outline-none" autoFocus />
                                            <div className="flex gap-2">
                                                <button onClick={cancelAddProduct} className="flex-1 py-2 px-3 rounded-lg text-gray-600 bg-gray-100 text-sm">Cancelar</button>
                                                <button onClick={confirmAddProduct} className="flex-1 py-2 px-3 rounded-lg text-white bg-gray-800 text-sm">Agregar</button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                                <div className="p-4">
                                    <h3 className="text-sm font-medium text-gray-500 mb-3">ITEMS DEL PEDIDO</h3>
                                    <div className="space-y-2">
                                        {editedItems.map((item, index) => (
                                            <div key={index} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                                                <div className="flex-1 min-w-0">
                                                    <p className="font-medium text-gray-800 truncate">{item.nombre}</p>
                                                    <p className="text-sm text-gray-500">S/ {item.precio.toFixed(2)}</p>
                                                </div>
                                                <div className="flex items-center gap-1">
                                                    <button onClick={() => updateItemQuantity(index, -1)} className="w-8 h-8 rounded-lg bg-gray-200"><Minus size={14} /></button>
                                                    <span className="w-8 text-center font-semibold">{item.cantidad}</span>
                                                    <button onClick={() => updateItemQuantity(index, 1)} className="w-8 h-8 rounded-lg bg-gray-200"><Plus size={14} /></button>
                                                </div>
                                                <button onClick={() => removeItem(index)} className="p-2 text-gray-400"><Trash2 size={16} /></button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                            <div className="border-t border-gray-100 p-4">
                                <div className="flex justify-between items-center mb-4">
                                    <span className="text-gray-500">Total:</span>
                                    <span className="text-xl font-bold text-gray-800">S/ {editedItems.reduce((sum, item) => sum + (item.precio * item.cantidad), 0).toFixed(2)}</span>
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <button onClick={() => { setShowEditModal(false); setEditingPedido(null); setShowProductSearch(false); }} className="py-2.5 px-4 rounded-lg bg-gray-100">Cancelar</button>
                                    <button onClick={saveEditedPedido} disabled={isSaving} className="py-2.5 px-4 rounded-lg text-white bg-gray-800 flex items-center justify-center gap-2">
                                        {isSaving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}Guardar
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </>
    );
}
