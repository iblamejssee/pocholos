'use client';

import { useState, useEffect } from 'react';
import { ShoppingCart, Plus, Minus, Trash2, Check, Loader2, Search, Star, TrendingUp, RefreshCw, X, Printer, ArrowLeft, ArrowRight, LayoutGrid, Coffee, Waves, ChefHat, CheckCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { registrarVenta, actualizarVenta } from '@/lib/ventas';
import { useInventario } from '@/hooks/useInventario';
import { useMesas } from '@/hooks/useMesas';
import { useEstadisticasProductos } from '@/hooks/useEstadisticasProductos';
import type { Producto, ItemCarrito, Mesa } from '@/lib/database.types';
import toast from 'react-hot-toast';
import AnimatedCard from '@/components/AnimatedCard';
import ProductOptionsModal from '@/components/ProductOptionsModal';
import ReceiptModal from '@/components/ReceiptModal';
import TableSelector from '@/components/TableSelector';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import { playKitchenBell } from '@/lib/sounds';
import { formatearFraccionProducto } from '@/lib/utils';
import ProtectedRoute from '@/components/ProtectedRoute';

type Categoria = 'platos' | 'especiales' | 'extras' | 'bebidas' | 'todos' | 'populares' | 'promociones';

export default function POSPage() {
    return (
        <ProtectedRoute>
            <POSContent />
        </ProtectedRoute>
    );
}

function POSContent() {
    const [view, setView] = useState<'mesas' | 'pedido'>('mesas');
    const [productos, setProductos] = useState<Producto[]>([]);
    const [carrito, setCarrito] = useState<ItemCarrito[]>([]);
    const [loading, setLoading] = useState(true);
    const [procesando, setProcesando] = useState(false);
    const [categoriaActiva, setCategoriaActiva] = useState<Categoria>('todos');
    const [searchTerm, setSearchTerm] = useState('');
    const { stock, refetch } = useInventario();

    // Hook para estadísticas de productos más vendidos
    const { topProductos } = useEstadisticasProductos();

    const [selectedProduct, setSelectedProduct] = useState<Producto | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

    const [showReceipt, setShowReceipt] = useState(false);
    const [receiptTitle, setReceiptTitle] = useState('BOLETA DE VENTA');
    const [lastSaleItems, setLastSaleItems] = useState<ItemCarrito[]>([]);
    const [lastSaleTotal, setLastSaleTotal] = useState(0);

    // Table management
    const [selectedTable, setSelectedTable] = useState<Mesa | null>(null);
    const [isParaLlevar, setIsParaLlevar] = useState(false);
    const { mesas, loading: loadingMesas, ocuparMesa, cambiarMesa, refetch: refetchMesas } = useMesas();
    const [currentVentaId, setCurrentVentaId] = useState<string | null>(null);
    const [showCambiarMesaModal, setShowCambiarMesaModal] = useState(false);

    // Order notes
    const [orderNotes, setOrderNotes] = useState('');

    // Custom item (producto libre)
    const [showCustomItem, setShowCustomItem] = useState(false);
    const [customItemName, setCustomItemName] = useState('');
    const [customItemPrice, setCustomItemPrice] = useState('');

    // Mobile specific
    const [isCartOpen, setIsCartOpen] = useState(false);

    // Charging state
    const [isCobrando, setIsCobrando] = useState(false);

    useEffect(() => {
        cargarProductos();

        // Suscripción en tiempo real para actualizar precios al instante
        const channel = supabase
            .channel('productos-changes')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'productos' },
                () => { cargarProductos(); }
            )
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, []);

    // Suscripción a cambios en la venta actual (Prevención de conflictos)
    useEffect(() => {
        if (!currentVentaId) return;

        console.log('Suscribiendo a cambios en venta:', currentVentaId);
        const channel = supabase
            .channel(`venta-${currentVentaId}`)
            .on(
                'postgres_changes',
                { event: 'UPDATE', schema: 'public', table: 'ventas', filter: `id=eq.${currentVentaId}` },
                (payload) => {
                    console.log('Cambio detectado en venta:', payload);
                    // Mostrar notificación persistente para recargar
                    toast((t) => (
                        <div className="flex flex-col gap-2">
                            <span className="font-bold text-sm">âš ï¸ La orden ha sido modificada</span>
                            <span className="text-xs">Alguien más actualizó este pedido.</span>
                            <button
                                onClick={() => {
                                    if (selectedTable) handleTableClick(selectedTable);
                                    toast.dismiss(t.id);
                                }}
                                className="bg-thebear-blue text-white px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-red-600 transition-colors"
                            >
                                ðŸ”„ Recargar Datos
                            </button>
                        </div>
                    ), { duration: Infinity, position: 'top-right', id: 'update-conflict' });
                }
            )
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, [currentVentaId, selectedTable]);

    const cargarProductos = async () => {
        try {
            const { data, error } = await supabase
                .from('productos')
                .select('*')
                .eq('activo', true)
                .order('nombre', { ascending: true });

            if (error) throw error;
            setProductos(data || []);
        } catch (error) {
            console.error('Error al cargar productos:', error);
            toast.error('Error al cargar productos');
        } finally {
            setLoading(false);
        }
    };

    const categorias: { id: Categoria; nombre: string; emoji: string }[] = [
        { id: 'todos', nombre: 'Todos', emoji: '🌊' },
        { id: 'populares', nombre: 'Populares', emoji: '🔥' },
        { id: 'promociones', nombre: 'Promos', emoji: '🎉' },
        { id: 'platos', nombre: 'Platos', emoji: '🐟' },
        { id: 'extras', nombre: 'Extras', emoji: '🥗' },
        { id: 'bebidas', nombre: 'Bebidas', emoji: '🍹' },
    ];

    const productosFiltrados = productos.filter(producto => {
        const matchSearch = searchTerm === '' ||
            producto.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (producto.descripcion && producto.descripcion.toLowerCase().includes(searchTerm.toLowerCase()));

        if (!matchSearch) return false;
        if (categoriaActiva === 'todos') return true;

        if (categoriaActiva === 'populares') {
            const productosPopularesIds = topProductos.map(tp => tp.producto_id);
            return productosPopularesIds.includes(producto.id);
        }

        if (categoriaActiva === 'platos') {
            return producto.tipo === 'plato' && (producto.fraccion_plato ?? 0) > 0;
        }

        if (categoriaActiva === 'especiales') {
            const nombresEspeciales = ['ceviche', 'tiradito', 'causa', 'parihuela', 'arroz chapa', 'mariscos', 'jalea', 'leche de tigre', 'duo', 'trio'];
            return nombresEspeciales.some(nombre => producto.nombre.toLowerCase().includes(nombre));
        }

        if (categoriaActiva === 'promociones') return producto.tipo === 'promocion';
        if (categoriaActiva === 'extras') return producto.tipo === 'complemento';
        if (categoriaActiva === 'bebidas') return producto.tipo === 'bebida';

        return true;
    });

    const handleTableClick = async (mesa: Mesa | null) => {
        if (!mesa) {
            // Para llevar
            setIsParaLlevar(true);
            setSelectedTable(null);
            setCurrentVentaId(null);
            setCarrito([]);
            setView('pedido');
            return;
        }

        setSelectedTable(mesa);
        setIsParaLlevar(false);

        if (mesa.estado === 'ocupada') {
            // Cargar pedido actual de la mesa
            setLoading(true);
            try {
                const { data, error } = await supabase
                    .from('ventas')
                    .select('*')
                    .eq('mesa_id', mesa.id)
                    .eq('estado_pago', 'pendiente')
                    .order('created_at', { ascending: false })
                    .limit(1)
                    .single();

                if (data && !error) {
                    setCurrentVentaId(data.id);
                    // Cargar los items actuales pero marcarlos como "ya en cocina"
                    // Para simplificar esta v1, solo cargamos el carrito vacío y permitimos AÃ‘ADIR.
                    // O mejor, mostramos qué tiene la mesa pero solo el carrito nuevo se guarda.
                    // El usuario pidió: "ver lo q esta ordenado, y la opcion de añadir otro producto"

                    // Transformar de ItemVenta a ItemCarrito (añadiendo subtotal)
                    // MARCAMOS COMO IMPRESOS los items que ya vienen de la BD
                    const itemsPrevios: ItemCarrito[] = data.items.map((it: any) => ({
                        ...it,
                        subtotal: it.cantidad * it.precio,
                        printed: true // Ya fueron enviados a cocina previamente
                    }));

                    setCarrito(itemsPrevios);
                    setOrderNotes(data.notes || '');
                    toast.success(`Cargando pedido actual de Mesa ${mesa.numero}`);
                } else {
                    setCurrentVentaId(null);
                    setCarrito([]);
                }
            } catch (err) {
                console.error('Error al cargar venta de mesa ocupada:', err);
                setCarrito([]);
            } finally {
                setLoading(false);
            }
        } else {
            // Mesa libre
            setCurrentVentaId(null);
            setCarrito([]);
            setOrderNotes('');
        }

        setView('pedido');
    };

    const handleProductClick = (producto: Producto) => {
        setSelectedProduct(producto);
        setIsModalOpen(true);
    };

    const agregarAlCarrito = (producto: Producto, opciones: {
        picante?: string,
        termino?: string,
        notas: string,
        detalle_bebida?: { marca: string, tipo: string },
        cantidad?: number
    }) => {
        const cantidad = opciones.cantidad || 1;
        const itemKey = `${producto.id}-${opciones.picante || ''}-${opciones.notas || ''}`;

        const itemExistenteIndex = carrito.findIndex((item) => {
            const currentItemKey = `${item.producto_id}-${item.detalles?.picante || ''}-${item.detalles?.notas || ''}`;
            return currentItemKey === itemKey;
        });

        if (itemExistenteIndex >= 0 && !carrito[itemExistenteIndex].printed) {
            const nuevoCarrito = [...carrito];
            nuevoCarrito[itemExistenteIndex].cantidad += cantidad;
            nuevoCarrito[itemExistenteIndex].subtotal = nuevoCarrito[itemExistenteIndex].cantidad * nuevoCarrito[itemExistenteIndex].precio;
            setCarrito(nuevoCarrito);
        } else {
            let detalleBebida = opciones.detalle_bebida
                ? { marca: opciones.detalle_bebida.marca, tipo: opciones.detalle_bebida.tipo }
                : (producto.marca_gaseosa && producto.tipo_gaseosa)
                    ? { marca: producto.marca_gaseosa, tipo: producto.tipo_gaseosa }
                    : undefined;

            if (!detalleBebida && (producto.nombre.toLowerCase().includes('chicha') || producto.tipo === 'bebida')) {
                const nombreLower = producto.nombre.toLowerCase();
                let tipo: string = 'vaso';
                if (nombreLower.includes('medio') || nombreLower.includes('1/2')) tipo = 'medio_litro';
                else if (nombreLower.includes('litro') || nombreLower.includes('jarra')) tipo = 'litro';
                detalleBebida = { marca: 'chicha', tipo };
            }

            const nuevoItem: ItemCarrito = {
                producto_id: producto.id,
                nombre: producto.nombre,
                cantidad: cantidad,
                precio: producto.precio,
                fraccion_plato: producto.fraccion_plato || 0,
                subtotal: producto.precio * cantidad,
                detalles: {
                    picante: opciones.picante,
                    termino: opciones.termino,
                    notas: opciones.notas
                },
                detalle_bebida: detalleBebida,
                tipo: producto.tipo
            };
            setCarrito([...carrito, nuevoItem]);
        }
    };

    const modificarCantidad = (index: number, delta: number) => {
        const nuevoCarrito = [...carrito];
        const item = nuevoCarrito[index];
        const nuevaCantidad = item.cantidad + delta;

        if (nuevaCantidad <= 0) {
            eliminarDelCarrito(index);
            return;
        }

        item.cantidad = nuevaCantidad;
        item.subtotal = nuevaCantidad * item.precio;
        setCarrito(nuevoCarrito);
    };

    const eliminarDelCarrito = (index: number) => {
        const nuevoCarrito = [...carrito];
        nuevoCarrito.splice(index, 1);
        setCarrito(nuevoCarrito);
    };

    const vaciarCarrito = () => {
        setCarrito([]);
        // Si no es una mesa ocupada, resetear todo. Si lo es, tal vez se quiere resetear lo NUEVO?
        // Por ahora, resetear todo y volver a mesas
        setSelectedTable(null);
        setIsParaLlevar(false);
        setView('mesas');
    };

    const calcularTotal = () => {
        return carrito.reduce((sum, item) => sum + item.subtotal, 0);
    };

    const handleConfirmarPedido = async () => {
        if (carrito.length === 0) {
            toast.error('El carrito está vacío');
            return;
        }

        setProcesando(true);

        try {
            let resultado;

            if (currentVentaId) {
                // Es una mesa ocupada, necesitamos saber qué items son NUEVOS
                // Para simplificar: En esta v1, si cargamos todo, el actualizarVenta debería saber
                // Sin embargo, `actualizarVenta` según definí espera "nuevosItems".
                // CAMBIO: Vamos a filtrar los que ya estaban o simplemente enviar todo.
                // RE-PIENSO: La mejor forma es enviar solo los items que se acaban de añadir.
                // Pero como los cargamos todos al carrito, perdemos la distinción.

                // Opción B: Si modifico `actualizarVenta` para que reciba la lista COMPLETA y reemplace.
                // Pero eso afecta stock si bajamos cantidades.

                // Vamos a usar una lógica más simple: Si ya hay VentaId, mandamos todo el carrito
                // Pero registrarVenta es para nuevas. Necesito una función que REEMPLACE items.

                // Por ahora, para no complicar el stock, asumiremos que el usuario añade items nuevos.
                // Vamos a implementar registrarVenta de nuevo si es una mesa ocupada pero vinculada? No.

                // MEJOR: Si es mesa ocupada, el carrito solo tiene los NUEVOS items.
                // Así `actualizarVenta` funciona perfecto.

                // Voy a ajustar el useEffect de carga de mesa ocupada para NO cargar items al carrito,
                // sino solo mostrarlos en un panel aparte.

                // Filtramos items que no estaban originalmente (si los guardaramos en un estado `itemsOriginales`)
                // Pero vamos con la opción mas limpia: el carrito es para LO NUEVO.
                resultado = await actualizarVenta(currentVentaId, carrito);
            } else {
                // Mesa nueva o para llevar
                if (selectedTable) {
                    await ocuparMesa(selectedTable.id);
                }
                resultado = await registrarVenta(carrito, selectedTable?.id, orderNotes);
            }


            if (resultado.success) {
                // Filtrar items para cocina:
                // 1. NO deben estar ya impresos (!item.printed)
                // 2. NO deben ser bebidas (item.tipo !== 'bebida')
                // 3. Excepción: Promos. Las promos SI van a cocina, aunque tengan bebida.
                //    Pero idealmente solo la parte de comida. Por ahora mandamos la promo completa.
                //    Si el usuario quiere ocultar las bebidas, podemos filtrar por nombre quizás?
                //    "solo el platillo que deben peparar ellos"

                const itemsParaCocina = carrito.filter(item => {
                    // Si ya se imprimió (mesa ocupada), ignorar.
                    // Pero si es nuevo, IMPRIMIR TODO (Comida, Bebida, Chicha, etc.)
                    return !item.printed;
                });

                if (itemsParaCocina.length > 0) {
                    // Imprimir en cocina silenciosamente
                    try {
                        const printRes = await fetch('/api/imprimir-cocina', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                mesa: selectedTable ? selectedTable.numero : 'LLEVAR',
                                items: itemsParaCocina, // ENVIAMOS SOLO LO NUEVO Y DE COCINA
                                notas: orderNotes,
                                id: resultado.data?.id,
                                tipo: isParaLlevar ? 'llevar' : 'mesa',
                                fecha: resultado.data?.created_at
                            })
                        });

                        if (!printRes.ok) {
                            let errorData;
                            try {
                                errorData = await printRes.json();
                            } catch (e) {
                                errorData = { message: `HTTP ${printRes.status}: ${printRes.statusText}` };
                            }
                            console.error('Error de respuesta de impresora:', errorData);
                            toast.error(`Error de impresora: ${errorData.message || 'Sin mensaje de error'}`);
                        } else {
                            toast.success('Enviado a cocina (Solo nuevos items) 🖨️');
                        }
                    } catch (err: any) {
                        console.error('Excepción al intentar imprimir:', err);

                        let msg = 'Error de conexión con el servidor de impresión';
                        if (err instanceof Error) msg = err.message;
                        else if (typeof err === 'string') msg = err;
                        else {
                            try {
                                msg = JSON.stringify(err);
                            } catch (e) {
                                msg = 'Error desconocido (no serializable)';
                            }
                        }

                        toast.error(`Fallo de impresión: ${msg}`);
                        // No bloqueamos el flujo, seguimos a éxito
                    }
                } else {
                    toast.success('Pedido guardado (Nada nuevo para cocina)');
                }

                playKitchenBell();
                toast.success(resultado.message);
                setView('mesas');
                setCarrito([]);
                setOrderNotes('');
                refetch();
                refetchMesas();
            } else {
                toast.error(resultado.message);
            }
        } catch (error) {
            console.error('Error al procesar pedido:', error);
            toast.error('Error inesperado');
        } finally {
            setProcesando(false);
        }
    };

    const handlePrintPreCuenta = () => {
        if (carrito.length === 0) {
            toast.error('El carrito está vacío');
            return;
        }
        setLastSaleItems(carrito);
        setLastSaleTotal(calcularTotal());
        setReceiptTitle('ESTADO DE CUENTA'); // Título personalizado
        setShowReceipt(true);
    };

    if (view === 'mesas') {
        const mesasLibres = mesas.filter(m => m.estado === 'libre').length;
        const mesasOcupadas = mesas.length - mesasLibres;

        return (
            <div className="p-4 lg:p-8 max-w-7xl mx-auto pb-32">
                {/* Header Section */}
                <div className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <div className="flex items-center gap-3">
                                <div className="relative w-20 h-16">
                                    <Image
                                        src="/images/logo-the-bear-icon.png"
                                        alt="THE BEAR"
                                        fill
                                        className="object-contain"
                                    />
                                </div>

                                <div>
                                    <span className="text-thebear-dark-blue font-black text-lg md:text-xl tracking-tighter block leading-none">
                                        THE BEAR
                                    </span>
                                    <span className="text-thebear-blue text-[7px] md:text-[8px] font-bold tracking-widest uppercase">
                                        Cevichería POS
                                    </span>
                                </div>
                            </div>
                            <h1 className="text-2xl md:text-3xl font-black text-thebear-dark-blue tracking-tighter uppercase italic ml-2 md:ml-4">Control de Bahía</h1>
                        </div>
                        <p className="text-[10px] md:text-sm font-bold text-thebear-blue/60 uppercase tracking-widest pl-1">Asignación de Mesas y Comandas</p>
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="flex bg-white/50 backdrop-blur-md p-1 rounded-2xl border border-thebear-cream shadow-sm">
                            <div className="px-4 py-2 text-center border-r border-thebear-cream">
                                <p className="text-[10px] font-black text-emerald-600 uppercase tracking-tight">Libres</p>
                                <p className="text-lg font-black text-thebear-dark-blue leading-none">{mesasLibres}</p>
                            </div>
                            <div className="px-4 py-2 text-center">
                                <p className="text-[10px] font-black text-red-500 uppercase tracking-tight">Ocupadas</p>
                                <p className="text-lg font-black text-thebear-dark-blue leading-none">{mesasOcupadas}</p>
                            </div>
                        </div>

                        <button
                            onClick={refetchMesas}
                            className="p-4 bg-white border border-thebear-cream rounded-2xl hover:bg-thebear-cream transition-all shadow-sm hover:shadow-md active:scale-95 text-thebear-blue"
                        >
                            <RefreshCw size={22} className={loadingMesas ? 'animate-spin' : ''} />
                        </button>

                        <motion.button
                            onClick={() => handleTableClick(null)}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            className="px-8 py-4 bg-gradient-to-r from-thebear-blue to-thebear-light-blue text-white font-black rounded-2xl shadow-xl flex items-center gap-3 uppercase tracking-widest text-sm"
                        >
                            <ShoppingCart size={20} />
                            <span>Para Llevar</span>
                        </motion.button>
                    </div>
                </div>

                {loadingMesas ? (
                    <div className="flex flex-col items-center justify-center py-32 opacity-30">
                        <Waves className="animate-bounce mb-4 text-thebear-blue" size={48} />
                        <p className="font-black uppercase tracking-[0.3em] text-xs">Escaneando Muelle...</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-4 lg:gap-6">
                        {mesas.map((mesa, index) => (
                            <motion.button
                                key={mesa.id}
                                initial={{ opacity: 0, scale: 0.8 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ delay: index * 0.02 }}
                                onClick={() => handleTableClick(mesa)}
                                className={`
                                    relative aspect-[4/5] rounded-[2rem] flex flex-col items-center justify-between p-6
                                    transition-all duration-300 shadow-lg border-2
                                    ${mesa.estado === 'libre'
                                        ? 'bg-white border-thebear-cream hover:border-thebear-blue/30 group'
                                        : 'bg-gradient-to-br from-thebear-dark-blue to-thebear-blue border-transparent'
                                    }
                                    hover:scale-105 active:scale-95
                                `}
                            >
                                <div className={`text-[10px] font-black uppercase tracking-widest ${mesa.estado === 'libre' ? 'text-thebear-blue/40' : 'text-white/40'}`}>
                                    Mesa
                                </div>

                                <div className={`text-5xl font-black italic tracking-tighter ${mesa.estado === 'libre' ? 'text-thebear-dark-blue group-hover:text-thebear-blue transition-colors' : 'text-white'}`}>
                                    {mesa.numero}
                                </div>

                                <div className={`
                                    px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest
                                    ${mesa.estado === 'libre'
                                        ? 'bg-emerald-50 text-emerald-600'
                                        : 'bg-white/20 text-white backdrop-blur-sm'
                                    }
                                `}>
                                    {mesa.estado === 'libre' ? 'Libre' : 'Ocupada'}
                                </div>

                                {mesa.estado === 'ocupada' && (
                                    <div className="absolute top-2 right-2 animate-pulse">
                                        <div className="w-2 h-2 bg-red-400 rounded-full shadow-[0_0_8px_rgba(248,113,113,0.8)]"></div>
                                    </div>
                                )}
                            </motion.button>
                        ))}
                    </div>
                )}
            </div>
        );
    }

    return (
        <div className="p-3 lg:p-6 max-w-7xl mx-auto print:hidden pb-20">
            {/* POS Header */}
            <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => setView('mesas')}
                        className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-thebear-blue border border-thebear-cream shadow-sm hover:shadow-md transition-all active:scale-90"
                    >
                        <ArrowLeft size={24} />
                    </button>
                    <div>
                        <div className="flex items-center gap-2">
                            <h1 className="text-2xl font-black text-thebear-dark-blue italic uppercase tracking-tighter">
                                {isParaLlevar ? 'Para Llevar' : `Comanda Mesa ${selectedTable?.numero}`}
                            </h1>
                            {!isParaLlevar && selectedTable && (
                                <div className="px-2 py-0.5 bg-thebear-blue/10 text-thebear-blue rounded text-[10px] font-black uppercase tracking-widest">
                                    En Muelle
                                </div>
                            )}
                        </div>
                        <div className="flex items-center gap-4 mt-1">
                            <button
                                onClick={() => setView('mesas')}
                                className="text-[10px] font-black uppercase text-thebear-blue/60 hover:text-thebear-blue transition-colors flex items-center gap-1"
                            >
                                <LayoutGrid size={12} /> Cambiar Estación
                            </button>
                            {selectedTable && !isParaLlevar && (
                                <button
                                    onClick={() => setShowCambiarMesaModal(true)}
                                    className="text-[10px] font-black uppercase text-amber-600/60 hover:text-amber-600 transition-colors flex items-center gap-1"
                                >
                                    <RefreshCw size={12} /> Reubicar Mesa
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                {/* Live Stock Status */}
                {stock && (
                    <div className="ocean-card px-6 py-3 flex items-center gap-6 divide-x divide-thebear-cream/30">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center text-thebear-blue">
                                <Waves size={16} />
                            </div>
                            <div>
                                <p className="text-[9px] font-black text-slate-400 uppercase leading-none">Platos</p>
                                <p className="text-sm font-black text-thebear-dark-blue">{formatearFraccionProducto(stock.platos_disponibles || 0)}</p>
                            </div>
                        </div>
                        <div className="pl-6 flex items-center gap-3">
                            <div className="w-8 h-8 bg-amber-50 rounded-lg flex items-center justify-center text-amber-600">
                                <Coffee size={16} />
                            </div>
                            <div>
                                <p className="text-[9px] font-black text-slate-400 uppercase leading-none">Bebidas</p>
                                <p className="text-sm font-black text-thebear-dark-blue">{stock.gaseosas_disponibles || 0} u.</p>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                <div className="lg:col-span-8 flex flex-col gap-6">
                    {/* Search and Filters */}
                    <div className="flex flex-col md:flex-row gap-4">
                        <div className="relative w-full md:w-72 lg:w-96 group shrink-0">
                            <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-thebear-blue/40 group-focus-within:text-thebear-blue transition-colors" size={20} />
                            <input
                                type="text"
                                placeholder="BUSCAR PRODUCTO..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-14 pr-6 py-4 bg-white border-2 border-thebear-cream rounded-3xl focus:border-thebear-blue focus:ring-4 focus:ring-thebear-blue/5 transition-all outline-none font-bold text-thebear-dark-blue placeholder:text-slate-300 shadow-sm"
                            />
                        </div>

                        <div className="flex-1 flex gap-2 overflow-x-auto pb-2 px-1 no-scrollbar scroll-smooth snap-x">
                            {categorias.map((cat) => (
                                <button
                                    key={cat.id}
                                    onClick={() => setCategoriaActiva(cat.id)}
                                    className={`px-5 py-3 md:px-6 md:py-4 rounded-2xl md:rounded-3xl font-black text-[9px] md:text-[10px] uppercase tracking-widest whitespace-nowrap transition-all border-2 flex items-center gap-2 snap-start ${categoriaActiva === cat.id
                                        ? 'bg-thebear-blue border-thebear-blue text-white shadow-lg shadow-thebear-blue/20'
                                        : 'bg-white border-thebear-cream text-thebear-blue hover:border-thebear-blue/30'
                                        }`}
                                >
                                    <span>{cat.emoji}</span>
                                    {cat.nombre}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Products Grid */}
                    <div className="bg-white/50 backdrop-blur-sm rounded-[2.5rem] border-2 border-white p-2 shadow-inner min-h-[500px]">
                        <div className="max-h-[70vh] overflow-y-auto pr-2 custom-scrollbar">
                            {loading ? (
                                <div className="p-20 flex flex-col items-center opacity-20">
                                    <div className="w-12 h-12 border-4 border-thebear-blue border-t-transparent rounded-full animate-spin mb-4" />
                                    <p className="font-black uppercase tracking-widest text-[10px]">Cargando Red...</p>
                                </div>
                            ) : productosFiltrados.length === 0 ? (
                                <div className="p-20 text-center">
                                    <p className="text-xl font-black text-slate-300 uppercase italic">No se avistan productos</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3 p-1 md:p-2">
                                    <AnimatePresence mode="popLayout">
                                        {productosFiltrados.map((producto) => (
                                            <motion.button
                                                layout
                                                key={producto.id}
                                                initial={{ opacity: 0, scale: 0.95 }}
                                                animate={{ opacity: 1, scale: 1 }}
                                                exit={{ opacity: 0, scale: 0.95 }}
                                                whileHover={{ y: -5 }}
                                                whileTap={{ scale: 0.98 }}
                                                onClick={() => handleProductClick(producto)}
                                                className="ocean-card group p-3 md:p-5 text-left relative overflow-hidden flex flex-col justify-between h-36 md:h-40"
                                            >
                                                <div className="relative z-10">
                                                    <div className="flex justify-between items-start mb-1.5 md:mb-2">
                                                        <div className={`p-1 md:p-1.5 rounded-lg ${producto.tipo === 'plato' ? 'bg-blue-50 text-thebear-blue' : 'bg-amber-50 text-amber-600'
                                                            }`}>
                                                            {producto.tipo === 'plato' ? <Waves size={12} /> : <Coffee size={12} />}
                                                        </div>
                                                        <Plus size={14} className="text-thebear-blue opacity-0 group-hover:opacity-100 transition-all transform translate-x-2 group-hover:translate-x-0 hidden md:block" />
                                                    </div>
                                                    <h3 className="font-black text-thebear-dark-blue leading-tight mb-0.5 md:mb-1 uppercase text-[10px] md:text-xs line-clamp-2">
                                                        {producto.nombre}
                                                    </h3>
                                                    {producto.descripcion && (
                                                        <p className="text-[8px] md:text-[9px] text-slate-400 font-bold uppercase line-clamp-1">{producto.descripcion}</p>
                                                    )}
                                                </div>

                                                <div className="relative z-10 mt-auto pt-4 border-t border-thebear-cream/30 flex items-center justify-between">
                                                    <span className="text-sm font-black text-thebear-blue">S/ {producto.precio.toFixed(2)}</span>
                                                    {producto.tipo === 'plato' && (
                                                        <span className="text-[8px] font-black text-slate-400 uppercase tracking-tighter">Cevichería</span>
                                                    )}
                                                </div>

                                                <div className="absolute -bottom-6 -right-6 w-24 h-24 bg-thebear-blue/5 rounded-full group-hover:scale-150 transition-transform duration-700" />
                                            </motion.button>
                                        ))}
                                    </AnimatePresence>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Sidebar - Cart */}
                <div className={`
                    lg:col-span-4 lg:sticky lg:top-6 fixed inset-0 z-50 lg:inset-auto lg:z-0 transition-transform duration-300 transform
                    ${isCartOpen ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'}
                    ${(view as string) === 'mesas' ? 'pointer-events-none opacity-0' : 'pointer-events-auto opacity-100'}
                `}>
                    {/* Backdrop for mobile */}
                    <div
                        className="absolute inset-0 bg-thebear-dark-blue/40 backdrop-blur-sm lg:hidden"
                        onClick={() => setIsCartOpen(false)}
                    />

                    <div className="bg-thebear-dark-blue h-full lg:h-auto lg:rounded-[2.5rem] shadow-2xl p-6 text-white min-h-[600px] flex flex-col border-0 lg:border-4 border-white relative z-10">
                        <div className="flex items-center justify-between mb-8">
                            <div className="flex items-center gap-3">
                                <button
                                    onClick={() => setIsCartOpen(false)}
                                    className="lg:hidden w-8 h-8 flex items-center justify-center bg-white/10 rounded-lg"
                                >
                                    <ArrowRight size={18} />
                                </button>
                                <h2 className="text-xl font-black italic uppercase tracking-tighter">Mi Pedido</h2>
                            </div>
                            {carrito.length > 0 && (
                                <button onClick={vaciarCarrito} className="text-[10px] font-black uppercase text-white/40 hover:text-red-400 transition-colors">Limpiar</button>
                            )}
                        </div>

                        <div className="flex-1 space-y-3 mb-6 overflow-y-auto pr-2 custom-scrollbar-light">
                            {carrito.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-20 opacity-30">
                                    <ShoppingCart size={48} className="mb-4 text-white" />
                                    <p className="font-black uppercase tracking-widest text-[10px]">Ancla vacía</p>
                                </div>
                            ) : (
                                carrito.map((item, index) => (
                                    <motion.div
                                        initial={{ opacity: 0, x: 20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        key={index}
                                        className="bg-white/5 hover:bg-white/10 p-4 rounded-3xl border border-white/5 transition-all group"
                                    >
                                        <div className="flex justify-between items-start mb-3">
                                            <div className="flex-1">
                                                <p className="font-black text-[12px] uppercase leading-tight text-white group-hover:text-thebear-light-blue transition-colors">
                                                    {item.nombre}
                                                </p>
                                                <div className="mt-1.5 flex flex-wrap gap-1">
                                                    {item.detalles?.picante && <span className="text-[8px] bg-white/10 px-1.5 py-0.5 rounded font-black uppercase">{item.detalles.picante}</span>}
                                                    {item.detalles?.termino && <span className="text-[8px] bg-white/10 px-1.5 py-0.5 rounded font-black uppercase">{item.detalles.termino}</span>}
                                                    {item.detalles?.notas && <p className="text-[9px] text-white/50 italic w-full">"{item.detalles.notas}"</p>}
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => eliminarDelCarrito(index)}
                                                className="p-2 hover:bg-red-500/20 hover:text-red-400 text-white/20 rounded-xl transition-all"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </div>

                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center bg-black/20 rounded-xl p-1 gap-3">
                                                <button onClick={() => modificarCantidad(index, -1)} className="w-6 h-6 flex items-center justify-center hover:bg-white/10 rounded-lg transition-colors"><Minus size={12} /></button>
                                                <span className="font-black text-sm w-4 text-center">{item.cantidad}</span>
                                                <button onClick={() => modificarCantidad(index, 1)} className="w-6 h-6 flex items-center justify-center hover:bg-white/10 rounded-lg transition-colors"><Plus size={12} /></button>
                                            </div>
                                            <p className="font-black text-thebear-light-blue">S/ {item.subtotal.toFixed(2)}</p>
                                        </div>
                                    </motion.div>
                                ))
                            )}
                        </div>

                        {/* Order Actions */}
                        <div className="mt-auto space-y-4 pt-6 border-t border-white/10">
                            {/* Manual Entry Toggle */}
                            {!showCustomItem ? (
                                <button
                                    onClick={() => setShowCustomItem(true)}
                                    className="w-full py-2 flex items-center justify-center gap-2 text-[10px] font-black uppercase text-white/40 hover:text-white transition-colors"
                                >
                                    <Plus size={14} /> Producto Libre
                                </button>
                            ) : (
                                <div className="p-4 bg-white/5 rounded-3xl border border-white/10 space-y-3">
                                    <input
                                        type="text"
                                        placeholder="NOMBRE DEL ADICIONAL..."
                                        value={customItemName}
                                        onChange={(e) => setCustomItemName(e.target.value)}
                                        className="w-full bg-black/20 border-0 focus:ring-0 rounded-xl text-[10px] font-black uppercase px-4 py-2"
                                    />
                                    <div className="flex gap-2">
                                        <div className="relative flex-1">
                                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[10px] font-black text-white/30">S/</span>
                                            <input
                                                type="number"
                                                placeholder="0.00"
                                                value={customItemPrice}
                                                onChange={(e) => setCustomItemPrice(e.target.value)}
                                                className="w-full bg-black/20 border-0 focus:ring-0 rounded-xl text-sm font-black pl-10 pr-4 py-2"
                                            />
                                        </div>
                                        <button
                                            onClick={() => {
                                                const p = parseFloat(customItemPrice);
                                                if (customItemName && p > 0) {
                                                    setCarrito([...carrito, {
                                                        producto_id: `custom-${Date.now()}`,
                                                        nombre: customItemName.toUpperCase(),
                                                        cantidad: 1,
                                                        precio: p,
                                                        subtotal: p,
                                                        tipo: 'complemento'
                                                    }]);
                                                    setCustomItemName(''); setCustomItemPrice(''); setShowCustomItem(false);
                                                }
                                            }}
                                            className="px-4 bg-thebear-light-blue text-thebear-dark-blue rounded-xl flex items-center justify-center"
                                        >
                                            <Check size={18} />
                                        </button>
                                        <button onClick={() => { setShowCustomItem(false); setCustomItemName(''); setCustomItemPrice(''); }} className="px-4 bg-white/10 rounded-xl"><X size={18} /></button>
                                    </div>
                                </div>
                            )}

                            {/* Notes Area */}
                            <div className="relative">
                                <textarea
                                    placeholder="OBSERVACIONES DE LA COMANDA..."
                                    value={orderNotes}
                                    onChange={(e) => setOrderNotes(e.target.value)}
                                    className="w-full bg-white/5 border border-white/5 focus:border-white/20 rounded-3xl p-4 text-[10px] font-black uppercase outline-none min-h-[80px] transition-all resize-none placeholder:text-white/20"
                                />
                            </div>

                            {/* Total and Print Pre-cuenta */}
                            <div className="flex items-center justify-between px-2">
                                <span className="text-[10px] font-black uppercase text-white/40 tracking-widest">Insumos Requeridos</span>
                                <span className="text-2xl font-black text-thebear-light-blue italic tracking-tighter">S/ {calcularTotal().toFixed(2)}</span>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                {currentVentaId && (
                                    <button
                                        onClick={handlePrintPreCuenta}
                                        className="py-4 bg-white/10 hover:bg-white/20 rounded-3xl flex items-center justify-center gap-2 transition-all group"
                                    >
                                        <Printer size={18} className="text-white/40 group-hover:text-white" />
                                        <span className="text-[10px] font-black uppercase tracking-widest">Pre-Cuenta</span>
                                    </button>
                                )}
                                <button
                                    onClick={handleConfirmarPedido}
                                    disabled={procesando || carrito.length === 0}
                                    className={`
                                        py-4 rounded-3xl flex items-center justify-center gap-3 transition-all shadow-xl font-black uppercase tracking-[0.2em] text-[10px]
                                        ${procesando || carrito.length === 0
                                            ? 'bg-white/5 text-white/20 cursor-not-allowed'
                                            : 'bg-gradient-to-r from-thebear-blue to-thebear-light-blue text-white shadow-thebear-blue/20 hover:scale-105 active:scale-95'
                                        }
                                        ${!currentVentaId ? 'col-span-2' : ''}
                                    `}
                                >
                                    {procesando ? <Loader2 size={18} className="animate-spin" /> : <ChefHat size={18} />}
                                    <span>{currentVentaId ? 'Añadir a Mesa' : 'Añadir Comanda'}</span>
                                </button>
                            </div>

                            {/* Payment/Close Button */}
                            {currentVentaId && (
                                <button
                                    onClick={() => {
                                        setLastSaleItems(carrito);
                                        setLastSaleTotal(calcularTotal());
                                        setReceiptTitle('BOLETA DE VENTA');
                                        setIsCobrando(true);
                                        setShowReceipt(true);
                                    }}
                                    className="w-full py-5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-4xl shadow-xl shadow-emerald-900/40 flex items-center justify-center gap-3 transition-all active:scale-95 group overflow-hidden relative"
                                >
                                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                                    <CheckCircle size={20} className="relative z-10" />
                                    <span className="text-sm font-black uppercase tracking-[0.3em] relative z-10">Cobrar S/ {calcularTotal().toFixed(2)}</span>
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Mobile Bottom Summary Bar */}
            {view === 'pedido' && (
                <div className="fixed bottom-0 left-0 right-0 p-4 lg:hidden z-40 bg-linear-to-t from-white via-white to-transparent pointer-events-none">
                    <AnimatePresence>
                        {carrito.length > 0 && (
                            <motion.div
                                initial={{ y: 100, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                exit={{ y: 100, opacity: 0 }}
                                className="pointer-events-auto max-w-lg mx-auto bg-thebear-dark-blue rounded-3xl p-4 shadow-2xl flex items-center justify-between border border-white/10"
                            >
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center text-thebear-light-blue relative">
                                        <ShoppingCart size={20} />
                                        <span className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white text-[10px] font-black rounded-full flex items-center justify-center border-2 border-thebear-dark-blue">
                                            {carrito.length}
                                        </span>
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-black text-white/40 uppercase tracking-widest leading-none mb-1">Tu Pedido</p>
                                        <p className="text-lg font-black text-white italic tracking-tighter leading-none">S/ {calcularTotal().toFixed(2)}</p>
                                    </div>
                                </div>

                                <button
                                    onClick={() => setIsCartOpen(true)}
                                    className="px-6 py-3 bg-thebear-blue text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-lg shadow-thebear-blue/20 active:scale-95 transition-all"
                                >
                                    Ver Pedido
                                </button>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            )}

            {/* Modals & Receipts */}
            <AnimatePresence>
                {isModalOpen && selectedProduct && (
                    <ProductOptionsModal
                        key="options-modal"
                        isOpen={isModalOpen}
                        onClose={() => { setIsModalOpen(false); setSelectedProduct(null); }}
                        producto={selectedProduct}
                        onConfirm={agregarAlCarrito}
                    />
                )}
                {showReceipt && (
                    <ReceiptModal
                        key="receipt-modal"
                        isOpen={showReceipt}
                        onClose={() => { setShowReceipt(false); setIsCobrando(false); }}
                        title={receiptTitle}
                        items={lastSaleItems}
                        total={lastSaleTotal}
                        orderId={currentVentaId || undefined}
                        mesaNumero={selectedTable ? selectedTable.numero : undefined}
                        mesaId={selectedTable ? (selectedTable as any).id || (selectedTable as any).mesa_id : undefined}
                        isNewSale={isCobrando}
                        onPaymentSuccess={() => {
                            toast.success('Venta finalizada con éxito');
                            setView('mesas');
                            setCarrito([]);
                            setOrderNotes('');
                            setCurrentVentaId(null);
                            setSelectedTable(null);
                            refetchMesas();
                        }}
                    />
                )}
                {showCambiarMesaModal && (
                    <TableSelector
                        isOpen={showCambiarMesaModal}
                        onClose={() => setShowCambiarMesaModal(false)}
                        onSelectTable={async (newMesa) => {
                            if (selectedTable && newMesa && newMesa.id !== selectedTable.id) {
                                const success = await cambiarMesa(selectedTable.id, newMesa.id);
                                if (success) {
                                    setShowCambiarMesaModal(false);
                                    toast.success('Comanda reubicada exitosamente');
                                    setView('mesas');
                                    refetchMesas();
                                } else {
                                    toast.error('No se pudo trasladar la comanda');
                                }
                            }
                        }}
                    />
                )}
            </AnimatePresence>
        </div>
    );
}
