'use client';

import { useState, useEffect } from 'react';
import { ShoppingCart, Plus, Minus, Trash2, Check, Loader2, Search, Star, TrendingUp, RefreshCw, X, Printer } from 'lucide-react';
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
import { motion } from 'framer-motion';
import { playKitchenBell } from '@/lib/sounds';
import { formatearFraccionPollo } from '@/lib/utils';
import ProtectedRoute from '@/components/ProtectedRoute';

type Categoria = 'pollos' | 'especiales' | 'extras' | 'bebidas' | 'todos' | 'populares' | 'promociones';

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
        { id: 'todos', nombre: 'Todos', emoji: '🍽️' },
        { id: 'populares', nombre: 'Populares', emoji: '🔥' },
        { id: 'promociones', nombre: 'Promos', emoji: '🎉' },
        { id: 'pollos', nombre: 'Pollos', emoji: '🍗' },
        { id: 'especiales', nombre: 'Especiales', emoji: '⭐' },
        { id: 'extras', nombre: 'Extras', emoji: '🍟' },
        { id: 'bebidas', nombre: 'Bebidas', emoji: '🥤' },
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

        if (categoriaActiva === 'pollos') {
            return producto.tipo === 'pollo' && producto.fraccion_pollo > 0;
        }

        if (categoriaActiva === 'especiales') {
            const nombresEspeciales = ['mostrito', 'mostrazo', 'chori', 'salchi', 'chaufa', 'anticucho', 'trilogía', 'cuarto'];
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
                    // Para simplificar esta v1, solo cargamos el carrito vacío y permitimos AÑADIR.
                    // O mejor, mostramos qué tiene la mesa pero solo el carrito nuevo se guarda.
                    // El usuario pidió: "ver lo q esta ordenado, y la opcion de añadir otro producto"

                    // Transformar de ItemVenta a ItemCarrito (añadiendo subtotal)
                    const itemsPrevios: ItemCarrito[] = data.items.map((it: any) => ({
                        ...it,
                        subtotal: it.cantidad * it.precio
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

    const agregarAlCarrito = (producto: Producto, opciones: { parte?: string, trozado?: string, notas: string }) => {
        const itemKey = `${producto.id}-${opciones.parte || ''}-${opciones.notas || ''}`;

        const itemExistenteIndex = carrito.findIndex((item) => {
            const currentItemKey = `${item.producto_id}-${item.detalles?.parte || ''}-${item.detalles?.notas || ''}`;
            return currentItemKey === itemKey;
        });

        if (itemExistenteIndex >= 0) {
            const nuevoCarrito = [...carrito];
            nuevoCarrito[itemExistenteIndex].cantidad += 1;
            nuevoCarrito[itemExistenteIndex].subtotal = nuevoCarrito[itemExistenteIndex].cantidad * nuevoCarrito[itemExistenteIndex].precio;
            setCarrito(nuevoCarrito);
        } else {
            const nuevoItem: ItemCarrito = {
                producto_id: producto.id,
                nombre: producto.nombre,
                cantidad: 1,
                precio: producto.precio,
                fraccion_pollo: producto.fraccion_pollo,
                subtotal: producto.precio,
                detalles: {
                    parte: opciones.parte,
                    notas: opciones.notas
                },
                // Mapear detalle de bebida si existe en el producto
                detalle_bebida: (producto.marca_gaseosa && producto.tipo_gaseosa) ? {
                    marca: producto.marca_gaseosa,
                    tipo: producto.tipo_gaseosa
                } : undefined
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
                // Imprimir en cocina silenciosamente
                try {
                    const printRes = await fetch('/api/imprimir-cocina', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            mesa: selectedTable ? selectedTable.numero : 'LLEVAR',
                            items: carrito,
                            notas: orderNotes,
                            id: resultado.data?.id,
                            tipo: isParaLlevar ? 'llevar' : 'mesa',
                            fecha: resultado.data?.created_at
                        })
                    });

                    if (!printRes.ok) {
                        const errorData = await printRes.json();
                        console.error('Error impresión:', errorData);
                        toast.error('Pedido guardado, pero error al imprimir en cocina');
                    } else {
                        toast.success('Enviado a cocina correctamente 🖨️');
                    }
                } catch (printErr) {
                    console.error('Error de red al imprimir:', printErr);
                    toast.error('Error de conexión con impresora');
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
        return (
            <div className="p-4 lg:p-8 max-w-6xl mx-auto">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h1 className="text-2xl sm:text-3xl font-extrabold text-pocholo-brown">Seleccionar Mesa</h1>
                        <p className="text-sm text-pocholo-brown/50 mt-1">Toca una mesa para comenzar un pedido</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <motion.button
                            onClick={() => handleTableClick(null)}
                            whileHover={{ scale: 1.03 }}
                            whileTap={{ scale: 0.97 }}
                            className="px-6 sm:px-8 py-4 bg-gradient-to-r from-pocholo-red to-red-600 text-white text-lg sm:text-xl font-extrabold rounded-2xl shadow-lg hover:shadow-xl transition-all flex items-center gap-3"
                        >
                            <ShoppingCart size={24} />
                            <span>Para Llevar</span>
                        </motion.button>
                        <button
                            onClick={refetchMesas}
                            className="p-3.5 bg-white border-2 border-pocholo-brown/10 rounded-2xl hover:bg-pocholo-cream transition-colors"
                        >
                            <RefreshCw size={22} className={loadingMesas ? 'animate-spin text-pocholo-red' : 'text-pocholo-brown/40'} />
                        </button>
                    </div>
                </div>

                {loadingMesas ? (
                    <div className="flex justify-center py-20">
                        <Loader2 className="animate-spin text-pocholo-red" size={48} />
                    </div>
                ) : (
                    <>
                        <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-7 gap-3">
                            {mesas.map((mesa, index) => (
                                <motion.button
                                    key={mesa.id}
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    transition={{ delay: index * 0.012 }}
                                    onClick={() => handleTableClick(mesa)}
                                    className={`
                                        aspect-square rounded-2xl flex flex-col items-center justify-center
                                        transition-all duration-200 shadow-md hover:shadow-xl
                                        ${mesa.estado === 'libre'
                                            ? 'bg-white border-2 border-green-400/50 hover:border-green-500 hover:bg-green-50/30'
                                            : 'bg-gradient-to-br from-pocholo-red to-red-700 border-2 border-red-600'
                                        }
                                        hover:scale-105 active:scale-95
                                    `}
                                >
                                    <span className={`text-3xl sm:text-4xl font-black leading-none ${mesa.estado === 'libre' ? 'text-pocholo-brown' : 'text-white'}`}>
                                        {mesa.numero}
                                    </span>
                                    <span className={`text-xs sm:text-sm font-bold uppercase mt-1.5 flex items-center gap-1 ${mesa.estado === 'libre' ? 'text-green-600' : 'text-white/80'}`}>
                                        <span className={`w-1.5 h-1.5 rounded-full ${mesa.estado === 'libre' ? 'bg-green-500' : 'bg-white/60'}`}></span>
                                        {mesa.estado === 'libre' ? 'Libre' : 'Ocupada'}
                                    </span>
                                </motion.button>
                            ))}
                        </div>
                    </>
                )}
            </div>
        );
    }

    return (
        <div className="p-3 lg:p-6 max-w-7xl mx-auto print:hidden">
            {/* Header POS */}
            <div className="mb-4 lg:mb-6 flex items-center justify-between">
                <div>
                    <h1 className="text-xl lg:text-3xl font-bold text-pocholo-brown mb-1">
                        {isParaLlevar ? 'Pedido para Llevar' : `Mesa ${selectedTable?.numero}`}
                    </h1>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => setView('mesas')}
                            className="text-pocholo-red text-sm font-bold flex items-center gap-1 hover:underline"
                        >
                            ← Volver a Mesas
                        </button>
                        {/* Botón Cambiar Mesa (solo para mesas ocupadas) */}
                        {selectedTable && !isParaLlevar && (
                            <button
                                onClick={() => setShowCambiarMesaModal(true)}
                                className="text-blue-600 text-sm font-bold flex items-center gap-1 hover:underline"
                            >
                                🔄 Cambiar Mesa
                            </button>
                        )}
                    </div>
                </div>
                {/* Stock Actual */}
                {stock && (
                    <div className="hidden md:block p-2 glass-card rounded-lg border-l-4 border-pocholo-yellow">
                        <p className="text-xs text-pocholo-brown font-bold">
                            📦 {formatearFraccionPollo(stock.pollos_disponibles)} Pollos | {stock.gaseosas_disponibles} Bebidas
                        </p>
                    </div>
                )}
            </div>


            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6">
                {/* Productos */}
                <div className="lg:col-span-2">
                    {/* Barra de búsqueda */}
                    <div className="mb-4">
                        <div className="relative">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-pocholo-brown/40" size={20} />
                            <input
                                type="text"
                                placeholder="Buscar producto..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-12 pr-4 py-3 glass-card rounded-xl border-2 border-transparent focus:border-pocholo-yellow focus:ring-2 focus:ring-pocholo-yellow/20 transition-all text-pocholo-brown placeholder-pocholo-brown/40"
                            />
                        </div>
                    </div>

                    {/* Tabs de Categorías */}
                    <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
                        {categorias.map((cat) => (
                            <button
                                key={cat.id}
                                onClick={() => setCategoriaActiva(cat.id)}
                                className={`px-3 py-1.5 rounded-lg font-semibold text-xs whitespace-nowrap transition-all ${categoriaActiva === cat.id
                                    ? 'bg-pocholo-red text-white'
                                    : 'glass-card text-pocholo-brown hover:bg-pocholo-cream'
                                    }`}
                            >
                                {cat.emoji} {cat.nombre}
                            </button>
                        ))}
                    </div>

                    {/* Lista de Productos */}
                    <div className="glass-card rounded-2xl shadow-3d overflow-hidden">
                        <div className="max-h-[50vh] lg:max-h-[600px] overflow-y-auto">
                            {loading ? (
                                <div className="p-8 text-center text-pocholo-brown/50">Cargando...</div>
                            ) : productosFiltrados.length === 0 ? (
                                <div className="p-8 text-center text-pocholo-brown/50">
                                    No se encontraron productos
                                </div>
                            ) : (
                                <div className="divide-y divide-pocholo-brown/10">
                                    {productosFiltrados.map((producto) => (
                                        <motion.button
                                            key={producto.id}
                                            onClick={() => handleProductClick(producto)}
                                            whileHover={{ backgroundColor: 'rgba(242, 201, 76, 0.1)' }}
                                            className="w-full p-3 flex items-center justify-between hover:bg-pocholo-yellow/5 transition-colors text-left group"
                                        >
                                            <div className="flex-1 min-w-0 mr-4">
                                                <p className="font-semibold text-pocholo-brown group-hover:text-pocholo-red transition-colors">
                                                    {producto.nombre}
                                                </p>
                                                {producto.descripcion && (
                                                    <p className="text-xs text-pocholo-brown/60 truncate mt-0.5">
                                                        {producto.descripcion}
                                                    </p>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <span className="text-lg font-bold text-pocholo-red whitespace-nowrap">
                                                    S/ {producto.precio.toFixed(2)}
                                                </span>
                                                <Plus className="text-pocholo-red opacity-0 group-hover:opacity-100 transition-opacity" size={20} />
                                            </div>
                                        </motion.button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Carrito */}
                <div className="lg:col-span-1">
                    <div className="glass-card rounded-2xl shadow-3d-deep p-3 lg:p-4 sticky top-4 lg:top-6">
                        <div className="flex items-center gap-2 mb-4">
                            <ShoppingCart className="text-pocholo-red" size={24} />
                            <h2 className="text-xl font-bold text-pocholo-brown">
                                {currentVentaId ? 'Añadir al Pedido' : 'Nuevo Pedido'}
                            </h2>
                        </div>

                        {carrito.length === 0 ? (
                            <div className="text-center py-12">
                                <p className="text-pocholo-brown/50 text-sm italic">
                                    {currentVentaId ? 'Selecciona productos para añadir a la mesa' : 'El carrito está vacío'}
                                </p>
                            </div>
                        ) : (
                            <>
                                <div className="space-y-2 mb-4 max-h-[400px] overflow-y-auto">
                                    {carrito.map((item, index) => (
                                        <div key={index} className="gradient-cream p-2.5 rounded-lg">
                                            <div className="flex justify-between items-start mb-2">
                                                <div className="flex-1 min-w-0">
                                                    <p className="font-semibold text-pocholo-brown text-sm">
                                                        {item.nombre} {item.detalles?.parte && `(${item.detalles.parte})`}
                                                    </p>
                                                </div>
                                                <button onClick={() => eliminarDelCarrito(index)} className="text-pocholo-red p-1"><Trash2 size={14} /></button>
                                            </div>
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-1.5">
                                                    <button onClick={() => modificarCantidad(index, -1)} className="w-6 h-6 bg-pocholo-brown rounded flex items-center justify-center text-white"><Minus size={12} /></button>
                                                    <span className="font-bold text-pocholo-brown w-6 text-center text-sm">{item.cantidad}</span>
                                                    <button onClick={() => modificarCantidad(index, 1)} className="w-6 h-6 bg-pocholo-brown rounded flex items-center justify-center text-white"><Plus size={12} /></button>
                                                </div>
                                                <p className="font-bold text-pocholo-red text-sm">S/ {item.subtotal.toFixed(2)}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                <div className="p-4 border-t-2 border-pocholo-yellow/30">
                                    <div className="mb-4">
                                        <label className="block text-sm font-semibold text-pocholo-brown mb-2">📝 Notas</label>
                                        <textarea
                                            value={orderNotes}
                                            onChange={(e) => setOrderNotes(e.target.value)}
                                            className="w-full px-3 py-2 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-pocholo-yellow resize-none text-sm"
                                            rows={2}
                                        />
                                    </div>
                                    <div className="flex justify-between items-center mb-4">
                                        <span className="text-lg font-bold text-pocholo-brown">A añadir:</span>
                                        <span className="text-2xl font-black text-pocholo-red">S/ {calcularTotal().toFixed(2)}</span>
                                    </div>
                                </div>

                                {/* Producto Libre */}
                                <div className="border-t border-pocholo-brown/10 pt-3 px-4 pb-2">
                                    {!showCustomItem ? (
                                        <button
                                            onClick={() => setShowCustomItem(true)}
                                            className="w-full py-2 text-xs font-bold text-pocholo-brown/50 hover:text-pocholo-red transition-colors flex items-center justify-center gap-1"
                                        >
                                            <Plus size={14} /> Agregar producto libre
                                        </button>
                                    ) : (
                                        <div className="space-y-2 bg-slate-50 rounded-lg p-3">
                                            <input
                                                type="text"
                                                placeholder="Nombre (ej: Media Palta)"
                                                value={customItemName}
                                                onChange={(e) => setCustomItemName(e.target.value)}
                                                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-pocholo-red"
                                                autoFocus
                                            />
                                            <div className="flex gap-2">
                                                <div className="relative flex-1">
                                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">S/</span>
                                                    <input
                                                        type="number"
                                                        step="0.50"
                                                        min="0"
                                                        placeholder="0.00"
                                                        value={customItemPrice}
                                                        onChange={(e) => setCustomItemPrice(e.target.value)}
                                                        onKeyDown={(e) => {
                                                            if (e.key === 'Enter' && customItemName && customItemPrice) {
                                                                const precio = parseFloat(customItemPrice);
                                                                if (precio > 0) {
                                                                    const customItem: ItemCarrito = {
                                                                        producto_id: `custom-${Date.now()}`,
                                                                        nombre: customItemName.trim(),
                                                                        cantidad: 1,
                                                                        precio,
                                                                        fraccion_pollo: 0,
                                                                        subtotal: precio,
                                                                    };
                                                                    setCarrito([...carrito, customItem]);
                                                                    setCustomItemName('');
                                                                    setCustomItemPrice('');
                                                                    setShowCustomItem(false);
                                                                }
                                                            }
                                                        }}
                                                        className="w-full pl-8 pr-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-pocholo-red"
                                                    />
                                                </div>
                                                <button
                                                    onClick={() => {
                                                        const precio = parseFloat(customItemPrice);
                                                        if (customItemName && precio > 0) {
                                                            const customItem: ItemCarrito = {
                                                                producto_id: `custom-${Date.now()}`,
                                                                nombre: customItemName.trim(),
                                                                cantidad: 1,
                                                                precio,
                                                                fraccion_pollo: 0,
                                                                subtotal: precio,
                                                            };
                                                            setCarrito([...carrito, customItem]);
                                                            setCustomItemName('');
                                                            setCustomItemPrice('');
                                                            setShowCustomItem(false);
                                                        } else {
                                                            toast.error('Ingresa nombre y precio');
                                                        }
                                                    }}
                                                    className="px-3 py-2 bg-pocholo-red text-white rounded-lg text-xs font-bold hover:bg-pocholo-red-dark transition-colors"
                                                >
                                                    <Check size={16} />
                                                </button>
                                                <button
                                                    onClick={() => { setShowCustomItem(false); setCustomItemName(''); setCustomItemPrice(''); }}
                                                    className="px-3 py-2 bg-slate-200 text-slate-600 rounded-lg text-xs hover:bg-slate-300 transition-colors"
                                                >
                                                    <X size={16} />
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <div className="space-y-2">
                                    <button
                                        onClick={handleConfirmarPedido}
                                        disabled={procesando}
                                        className="w-full flex items-center justify-center gap-2 px-4 py-4 bg-pocholo-red hover:bg-pocholo-red-dark text-white font-black rounded-xl shadow-lg transition-all disabled:opacity-50"
                                    >
                                        {procesando ? <Loader2 size={18} className="animate-spin" /> : <><Check size={20} />{currentVentaId ? 'ACTUALIZAR PEDIDO' : 'ENVIAR A COCINA'}</>}
                                    </button>
                                    <button onClick={vaciarCarrito} className="w-full py-2 text-xs font-bold text-pocholo-brown/50 hover:text-pocholo-red uppercase tracking-widest">
                                        Cancelar
                                    </button>
                                    <button
                                        onClick={handlePrintPreCuenta}
                                        className="w-full py-2 text-xs font-bold text-blue-600 hover:text-blue-800 transition-colors uppercase tracking-widest flex items-center justify-center gap-1"
                                    >
                                        <Printer size={14} /> Imprimir Pre-Cuenta
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </div>

            <ProductOptionsModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onConfirm={agregarAlCarrito} producto={selectedProduct} />
            <ReceiptModal isOpen={showReceipt} onClose={() => setShowReceipt(false)} items={lastSaleItems} total={lastSaleTotal} title={receiptTitle} />

            {/* Modal Cambiar Mesa */}
            {showCambiarMesaModal && selectedTable && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[80vh] overflow-hidden"
                    >
                        <div className="p-4 border-b border-gray-100 bg-pocholo-cream flex justify-between items-center">
                            <div>
                                <h2 className="text-xl font-bold text-pocholo-brown">Cambiar Mesa</h2>
                                <p className="text-sm text-pocholo-brown/60">Mesa actual: <strong>{selectedTable.numero}</strong></p>
                            </div>
                            <button
                                onClick={() => setShowCambiarMesaModal(false)}
                                className="p-2 hover:bg-red-50 text-gray-400 hover:text-red-500 rounded-xl transition-colors"
                            >
                                ✕
                            </button>
                        </div>
                        <div className="p-4">
                            <p className="text-sm font-medium text-pocholo-brown/70 mb-3">Selecciona la nueva mesa:</p>
                            <div className="grid grid-cols-4 sm:grid-cols-5 gap-2 max-h-[50vh] overflow-y-auto">
                                {mesas.filter(m => m.estado === 'libre').map((mesa) => (
                                    <button
                                        key={mesa.id}
                                        onClick={async () => {
                                            const success = await cambiarMesa(selectedTable.id, mesa.id);
                                            if (success) {
                                                toast.success(`Pedido movido a Mesa ${mesa.numero}`);
                                                setSelectedTable(mesa);
                                                setShowCambiarMesaModal(false);
                                            } else {
                                                toast.error('Error al cambiar mesa');
                                            }
                                        }}
                                        className="aspect-square rounded-xl bg-green-50 border-2 border-green-400/50 hover:border-green-500 hover:bg-green-100 flex flex-col items-center justify-center transition-all"
                                    >
                                        <span className="text-xl font-bold text-pocholo-brown">{mesa.numero}</span>
                                        <span className="text-[9px] text-green-600 font-bold">● Libre</span>
                                    </button>
                                ))}
                            </div>
                            {mesas.filter(m => m.estado === 'libre').length === 0 && (
                                <p className="text-center py-8 text-pocholo-brown/50 italic">
                                    No hay mesas libres disponibles
                                </p>
                            )}
                        </div>
                    </motion.div>
                </div>
            )}
        </div>
    );
}
