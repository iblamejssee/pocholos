'use client';

import { useState, useEffect } from 'react';
import { ShoppingCart, Plus, Minus, Trash2, Check, Loader2, Search, Star, TrendingUp } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { registrarVenta } from '@/lib/ventas';
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

type Categoria = 'pollos' | 'especiales' | 'extras' | 'bebidas' | 'todos' | 'populares';

export default function POSPage() {
    return (
        <ProtectedRoute>
            <POSContent />
        </ProtectedRoute>
    );
}

function POSContent() {
    const [productos, setProductos] = useState<Producto[]>([]);
    const [carrito, setCarrito] = useState<ItemCarrito[]>([]);
    const [loading, setLoading] = useState(true);
    const [procesando, setProcesando] = useState(false);
    const [categoriaActiva, setCategoriaActiva] = useState<Categoria>('todos');
    const [searchTerm, setSearchTerm] = useState('');
    const { stock, refetch } = useInventario();

    // Hook para estadísticas de productos más vendidos
    const { topProductos, registrarVentaProducto, refetch: refetchStats } = useEstadisticasProductos();

    const [selectedProduct, setSelectedProduct] = useState<Producto | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

    const [showReceipt, setShowReceipt] = useState(false);
    const [lastSaleItems, setLastSaleItems] = useState<ItemCarrito[]>([]);
    const [lastSaleTotal, setLastSaleTotal] = useState(0);

    // Table management
    const [showTableSelector, setShowTableSelector] = useState(false);
    const [selectedTable, setSelectedTable] = useState<Mesa | null>(null);
    const [isParaLlevar, setIsParaLlevar] = useState(false);
    const { ocuparMesa } = useMesas();

    // Order notes
    const [orderNotes, setOrderNotes] = useState('');

    useEffect(() => {
        cargarProductos();
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

    const handleProductClick = (producto: Producto) => {
        setSelectedProduct(producto);
        setIsModalOpen(true);
    };

    const agregarAlCarrito = (producto: Producto, opciones: { parte?: 'pecho' | 'pierna' | 'ala' | 'encuentro', notas: string }) => {
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
                }
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
        setSelectedTable(null);
        setIsParaLlevar(false);
    };

    const calcularTotal = () => {
        return carrito.reduce((sum, item) => sum + item.subtotal, 0);
    };

    // Handler for table selection - solo guarda la selección, NO ocupa la mesa aún
    // null = Para llevar (no ocupa mesa)
    const handleTableSelect = (mesa: Mesa | null) => {
        setShowTableSelector(false);

        if (mesa) {
            setSelectedTable(mesa);
            setIsParaLlevar(false);
            toast.success(`Mesa ${mesa.numero} seleccionada para el pedido`);
            // Pasar mesa directamente para evitar problemas de estado asíncrono
            confirmarVentaConMesa(mesa);
        } else {
            setSelectedTable(null);
            setIsParaLlevar(true);
            toast.success('Pedido para llevar 🥡');
            // Para llevar, pasar null
            confirmarVentaConMesa(null);
        }
    };

    // Iniciar proceso de venta (abrir selector de mesa si no hay una seleccionada y no es para llevar)
    const iniciarVenta = () => {
        if (carrito.length === 0) {
            toast.error('El carrito está vacío');
            return;
        }

        // Si no hay mesa seleccionada y no es para llevar, abrir selector
        if (!selectedTable && !isParaLlevar) {
            setShowTableSelector(true);
            return;
        }

        confirmarVentaConMesa(selectedTable);
    };

    // Función que recibe mesa directamente para evitar problemas de estado asíncrono
    const confirmarVentaConMesa = async (mesa: Mesa | null) => {
        if (carrito.length === 0) {
            toast.error('El carrito está vacío');
            return;
        }

        setProcesando(true);

        try {
            // Si hay mesa, ocuparla ahora
            if (mesa) {
                const mesaOcupada = await ocuparMesa(mesa.id);
                if (!mesaOcupada) {
                    toast.error('Error al asignar la mesa. Intenta de nuevo.');
                    setProcesando(false);
                    return;
                }
            }

            // Registrar venta con mesa_id (o null para llevar) y notas
            const resultado = await registrarVenta(carrito, mesa?.id, orderNotes);

            if (resultado.success) {
                // Reproducir sonido de campana para cocina
                playKitchenBell();

                toast.success(resultado.message, {
                    duration: 4000,
                    icon: '🎉',
                });

                // NO mostrar recibo - solo la cajera imprime al cobrar
                vaciarCarrito();
                setOrderNotes(''); // Limpiar notas
                refetch();
                // refetchStats(); // Ya no es necesario, se calcula al vuelo en reportes
            } else {
                toast.error(resultado.message, {
                    duration: 5000,
                });
            }
        } catch (error) {
            console.error('Error al procesar venta:', error);
            toast.error('Error inesperado al procesar la venta');
        } finally {
            setProcesando(false);
        }
    };

    // Filtrar productos por categoría y búsqueda
    const productosFiltrados = productos.filter(producto => {
        // Filtro de búsqueda
        const matchSearch = searchTerm === '' ||
            producto.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (producto.descripcion && producto.descripcion.toLowerCase().includes(searchTerm.toLowerCase()));

        if (!matchSearch) return false;

        // Filtro de categoría
        if (categoriaActiva === 'todos') return true;

        // Filtrar por productos populares (los más vendidos)
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

        if (categoriaActiva === 'extras') {
            return producto.tipo === 'complemento';
        }

        if (categoriaActiva === 'bebidas') {
            return producto.tipo === 'bebida';
        }

        return true;
    });

    const categorias: { id: Categoria; nombre: string; emoji: string }[] = [
        { id: 'todos', nombre: 'Todos', emoji: '🍽️' },
        { id: 'populares', nombre: 'Populares', emoji: '🔥' },
        { id: 'pollos', nombre: 'Pollos', emoji: '🍗' },
        { id: 'especiales', nombre: 'Especiales', emoji: '⭐' },
        { id: 'extras', nombre: 'Extras', emoji: '🍟' },
        { id: 'bebidas', nombre: 'Bebidas', emoji: '🥤' },
    ];

    return (
        <div className="p-3 lg:p-6 max-w-7xl mx-auto print:hidden">
            {/* Header */}
            <div className="mb-4 lg:mb-6">
                <h1 className="text-xl lg:text-3xl font-bold text-pocholo-brown mb-1">Punto de Venta</h1>
                <p className="text-pocholo-brown/70 text-sm lg:text-base">Busca y selecciona productos</p>
            </div>

            {/* Stock Actual */}
            {stock && (
                <div className="mb-4 p-3 glass-card rounded-xl shadow-3d border-l-4 border-pocholo-yellow">
                    <div className="flex items-center justify-between">
                        <p className="text-sm text-pocholo-brown">
                            <span className="font-bold">{formatearFraccionPollo(stock.pollos_disponibles)}</span> pollos |
                            <span className="font-bold ml-2">{stock.gaseosas_disponibles}</span> bebidas
                        </p>
                        <span className={`px-3 py-1 rounded-lg text-xs font-semibold ${stock.pollos_disponibles > 10 ? 'bg-green-100 text-green-700' :
                            stock.pollos_disponibles > 5 ? 'bg-yellow-100 text-yellow-700' :
                                'bg-red-100 text-red-700'
                            }`}>
                            {stock.pollos_disponibles > 10 ? 'Stock Alto' : stock.pollos_disponibles > 5 ? 'Stock Medio' : 'Stock Bajo'}
                        </span>
                    </div>
                </div>
            )}

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
                                <div className="p-8 text-center text-pocholo-brown/50">Cargando productos...</div>
                            ) : productosFiltrados.length === 0 ? (
                                <div className="p-8 text-center text-pocholo-brown/50">
                                    {searchTerm ? 'No se encontraron productos' : 'No hay productos en esta categoría'}
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
                                                {producto.fraccion_pollo > 0 && (
                                                    <span className="text-xs text-pocholo-brown/50 hidden sm:block">
                                                        {formatearFraccionPollo(producto.fraccion_pollo)}🍗
                                                    </span>
                                                )}
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
                            <h2 className="text-xl font-bold text-pocholo-brown">Carrito</h2>
                            {carrito.length > 0 && (
                                <span className="ml-auto bg-pocholo-red text-white text-xs font-bold px-2 py-1 rounded-full">
                                    {carrito.length}
                                </span>
                            )}
                        </div>

                        {carrito.length === 0 ? (
                            <p className="text-pocholo-brown/50 text-center py-8 text-sm">
                                Carrito vacío
                            </p>
                        ) : (
                            <>
                                <div className="space-y-2 mb-4 max-h-[400px] overflow-y-auto">
                                    {carrito.map((item, index) => (
                                        <div
                                            key={`${item.producto_id}-${index}`}
                                            className="gradient-cream p-2.5 rounded-lg"
                                        >
                                            <div className="flex justify-between items-start mb-2">
                                                <div className="flex-1 min-w-0 mr-2">
                                                    <p className="font-semibold text-pocholo-brown text-sm truncate">
                                                        {item.nombre}
                                                        {item.detalles?.parte && (
                                                            <span className="ml-1 text-pocholo-red font-bold uppercase text-xs">
                                                                ({item.detalles.parte})
                                                            </span>
                                                        )}
                                                    </p>
                                                    {item.detalles?.notas && (
                                                        <p className="text-xs text-gray-500 italic truncate">
                                                            "{item.detalles.notas}"
                                                        </p>
                                                    )}
                                                </div>
                                                <button
                                                    onClick={() => eliminarDelCarrito(index)}
                                                    className="text-pocholo-red hover:bg-pocholo-red/10 p-1 rounded"
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-1.5">
                                                    <button
                                                        onClick={() => modificarCantidad(index, -1)}
                                                        className="w-6 h-6 bg-pocholo-brown rounded flex items-center justify-center text-white"
                                                    >
                                                        <Minus size={12} />
                                                    </button>
                                                    <span className="font-bold text-pocholo-brown w-6 text-center text-sm">
                                                        {item.cantidad}
                                                    </span>
                                                    <button
                                                        onClick={() => modificarCantidad(index, 1)}
                                                        className="w-6 h-6 bg-pocholo-brown rounded flex items-center justify-center text-white"
                                                    >
                                                        <Plus size={12} />
                                                    </button>
                                                </div>
                                                <p className="font-bold text-pocholo-red text-sm">
                                                    S/ {item.subtotal.toFixed(2)}
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                {/* Mesa seleccionada (pendiente de confirmación) */}
                                {selectedTable && (
                                    <div className="bg-amber-50 border-2 border-amber-400 rounded-lg p-2 mb-3">
                                        <p className="text-amber-700 font-semibold text-sm text-center">
                                            🪑 Mesa {selectedTable.numero} seleccionada
                                        </p>
                                        <p className="text-amber-600 text-xs text-center">
                                            Se asignará al confirmar la venta
                                        </p>
                                    </div>
                                )}

                                <div className="p-4 border-t-2 border-pocholo-yellow/30">
                                    {/* Notas del pedido */}
                                    <div className="mb-4">
                                        <label className="block text-sm font-semibold text-pocholo-brown mb-2">
                                            📝 Notas del pedido (opcional)
                                        </label>
                                        <textarea
                                            value={orderNotes}
                                            onChange={(e) => setOrderNotes(e.target.value)}
                                            placeholder="Ej: Menos ensalada, sin cremas, etc..."
                                            className="w-full px-3 py-2 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-pocholo-yellow resize-none"
                                            rows={2}
                                        />
                                    </div>

                                    {/* Total */}
                                    <div className="flex justify-between items-center mb-4">
                                        <span className="text-xl font-bold text-pocholo-brown">Total:</span>
                                        <span className="text-3xl font-bold text-pocholo-red">
                                            S/ {calcularTotal().toFixed(2)}
                                        </span>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <button
                                        onClick={iniciarVenta}
                                        disabled={procesando}
                                        className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-pocholo-red hover:bg-pocholo-red-dark text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {procesando ? (
                                            <>
                                                <Loader2 size={18} className="animate-spin" />
                                                Procesando...
                                            </>
                                        ) : (
                                            <>
                                                <Check size={18} />
                                                {selectedTable ? 'Confirmar Venta' : 'Seleccionar Mesa'}
                                            </>
                                        )}
                                    </button>
                                    <button
                                        onClick={vaciarCarrito}
                                        disabled={procesando}
                                        className="w-full px-4 py-2 text-sm text-pocholo-brown/70 hover:text-pocholo-red hover:bg-pocholo-red/10 rounded-lg transition-all disabled:opacity-50"
                                    >
                                        Vaciar Carrito
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </div>

            <ProductOptionsModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onConfirm={agregarAlCarrito}
                producto={selectedProduct}
            />

            <ReceiptModal
                isOpen={showReceipt}
                onClose={() => setShowReceipt(false)}
                items={lastSaleItems}
                total={lastSaleTotal}
            />

            <TableSelector
                isOpen={showTableSelector}
                onClose={() => setShowTableSelector(false)}
                onSelectTable={handleTableSelect}
            />
        </div>
    );
}
