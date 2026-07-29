'use client';

import { useState, useEffect } from 'react';
import { 
    Boxes, 
    ArrowUpDown, 
    History, 
    Plus, 
    Minus, 
    RefreshCw, 
    ChevronDown, 
    ChevronUp, 
    Lock, 
    Unlock, 
    FileText, 
    DollarSign,
    Calendar,
    Search,
    AlertTriangle,
    CheckCircle,
    ShoppingCart,
    Clipboard,
    ShoppingBag,
    Utensils,
    Trash2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useInventario } from '@/hooks/useInventario';
import { supabase } from '@/lib/supabase';
import { formatearCantidadPollos } from '@/lib/utils';
import { 
    ajustarStockPollos, 
    ajustarCajaChica, 
    ajustarStockChicha, 
    ajustarStockPapas,
    ajustarStockBebidas 
} from '@/lib/inventario';
import toast from 'react-hot-toast';
import ProtectedRoute from '@/components/ProtectedRoute';
import type { BebidasDetalle, InventarioDiario, Producto } from '@/lib/database.types';

// Marcas y tamaños config
const MARCAS_CONFIG = [
    {
        key: 'inca_kola',
        name: 'Inca Kola',
        color: 'text-yellow-500 bg-yellow-500/10 border-yellow-500/20',
        dot: 'bg-yellow-500',
        sizes: [
            { key: 'personal_retornable', label: 'Personal Ret.', desc: '296ml' },
            { key: 'descartable', label: 'Descartable', desc: '600ml' },
            { key: 'gordita', label: 'Gordita', desc: '625ml' },
            { key: 'litro', label: '1 Litro', desc: '1L' },
            { key: 'litro_medio', label: '1.5 Litros', desc: '1.5L' },
            { key: 'tres_litros', label: '3 Litros', desc: '3L' },
        ],
    },
    {
        key: 'coca_cola',
        name: 'Coca Cola',
        color: 'text-red-600 bg-red-600/10 border-red-600/20',
        dot: 'bg-red-600',
        sizes: [
            { key: 'personal_retornable', label: 'Personal Ret.', desc: '296ml' },
            { key: 'descartable', label: 'Descartable', desc: '600ml' },
            { key: 'litro', label: '1 Litro', desc: '1L' },
            { key: 'litro_medio', label: '1.5 Litros', desc: '1.5L' },
            { key: 'tres_litros', label: '3 Litros', desc: '3L' },
        ],
    },
    {
        key: 'sprite',
        name: 'Sprite',
        color: 'text-green-500 bg-green-500/10 border-green-500/20',
        dot: 'bg-green-500',
        sizes: [
            { key: 'personal_retornable', label: 'Personal Ret.', desc: '296ml' },
            { key: 'descartable', label: 'Descartable', desc: '600ml' },
            { key: 'litro', label: '1 Litro', desc: '1L' },
            { key: 'litro_medio', label: '1.5 Litros', desc: '1.5L' },
            { key: 'tres_litros', label: '3 Litros', desc: '3L' },
        ],
    },
    {
        key: 'fanta',
        name: 'Fanta',
        color: 'text-orange-500 bg-orange-500/10 border-orange-500/20',
        dot: 'bg-orange-500',
        sizes: [
            { key: 'descartable', label: 'Personal', desc: '500ml' },
        ],
    },
    {
        key: 'agua_mineral',
        name: 'Agua Mineral',
        color: 'text-sky-400 bg-sky-400/10 border-sky-400/20',
        dot: 'bg-sky-400',
        sizes: [
            { key: 'personal', label: 'Personal', desc: '600ml' },
        ],
    },
] as const;

interface Insumo {
    id: string;
    nombre: string;
    stock_actual: number;
    unidad_medida: string;
    stock_minimo: number;
    created_at: string;
    updated_at: string;
}

interface CompraInsumo {
    id: string;
    insumo_id: string;
    cantidad: number;
    precio_compra: number;
    fecha_compra: string;
    insumos?: {
        nombre: string;
        unidad_medida: string;
    };
}

interface Receta {
    id: string;
    producto_id: string;
    insumo_id: string;
    cantidad: number;
    insumos?: {
        nombre: string;
        unidad_medida: string;
    };
}

export default function InventarioPage() {
    return (
        <ProtectedRoute requiredPermission="inventario">
            <InventarioContent />
        </ProtectedRoute>
    );
}

function InventarioContent() {
    const { stock, loading, error, refetch } = useInventario();
    const [activeTab, setActiveTab] = useState<'dashboard' | 'insumos' | 'recetas' | 'ajustes' | 'historial'>('dashboard');
    
    // Accordion control for drinks
    const [expandedBrands, setExpandedBrands] = useState<Set<string>>(new Set(['inca_kola']));

    const toggleBrand = (brandKey: string) => {
        setExpandedBrands(prev => {
            const next = new Set(prev);
            if (next.has(brandKey)) next.delete(brandKey);
            else next.add(brandKey);
            return next;
        });
    };

    // Historical records state
    const [historial, setHistorial] = useState<InventarioDiario[]>([]);
    const [loadingHistorial, setLoadingHistorial] = useState(false);
    const [busquedaHistorial, setBusquedaHistorial] = useState('');
    const [selectedHistorial, setSelectedHistorial] = useState<InventarioDiario | null>(null);

    // Form states for manual adjustments (Ajustes tab)
    const [tipoAjuste, setTipoAjuste] = useState<'pollos' | 'papas' | 'chicha' | 'caja_chica'>('pollos');
    const [montoAjuste, setMontoAjuste] = useState<string>('');
    const [isUpdating, setIsUpdating] = useState(false);

    // Insumos States
    const [insumos, setInsumos] = useState<Insumo[]>([]);
    const [compras, setCompras] = useState<CompraInsumo[]>([]);
    const [loadingInsumos, setLoadingInsumos] = useState(false);
    const [busquedaInsumo, setBusquedaInsumo] = useState('');
    const [verSoloCritico, setVerSoloCritico] = useState(false);

    // Recetas States
    const [productos, setProductos] = useState<Producto[]>([]);
    const [selectedProductoId, setSelectedProductoId] = useState<string>('');
    const [recetaItems, setRecetaItems] = useState<Receta[]>([]);
    const [loadingReceta, setLoadingReceta] = useState(false);
    const [showAddIngredient, setShowAddIngredient] = useState(false);
    const [ingredienteInsumoId, setIngredienteInsumoId] = useState('');
    const [ingredienteCantidad, setIngredienteCantidad] = useState('');

    // Modals states for Insumos
    const [showNewInsumoModal, setShowNewInsumoModal] = useState(false);
    const [showCompraModal, setShowCompraModal] = useState<Insumo | null>(null);
    const [showConsumoModal, setShowConsumoModal] = useState<Insumo | null>(null);

    // New insumo form fields
    const [nuevoNombre, setNuevoNombre] = useState('');
    const [nuevoStock, setNuevoStock] = useState('');
    const [nuevaUnidad, setNuevaUnidad] = useState('Unidades');
    const [nuevoMinimo, setNuevoMinimo] = useState('');
    const [creandoInsumo, setCreandoInsumo] = useState(false);

    // Compra / Consumo fields
    const [cantOperacion, setCantOperacion] = useState('');
    const [costoCompra, setCostoCompra] = useState('');
    const [procesandoOperacion, setProcesandoOperacion] = useState(false);

    // Fetch history
    const cargarHistorial = async () => {
        setLoadingHistorial(true);
        try {
            const { data, error: histError } = await supabase
                .from('inventario_diario')
                .select('*')
                .order('fecha', { ascending: false });

            if (histError) throw histError;
            setHistorial(data || []);
        } catch (err) {
            console.error('Error cargando historial:', err);
            toast.error('No se pudo cargar el historial');
        } finally {
            setLoadingHistorial(false);
        }
    };

    // Fetch Insumos and Purchases
    const cargarInsumos = async () => {
        setLoadingInsumos(true);
        try {
            // Fetch insumos catalog
            const { data: insData, error: insError } = await supabase
                .from('insumos')
                .select('*')
                .order('nombre', { ascending: true });

            if (insError) throw insError;
            setInsumos(insData || []);

            // Fetch recent purchases
            const { data: compData, error: compError } = await supabase
                .from('compras_insumos')
                .select(`
                    id,
                    insumo_id,
                    cantidad,
                    precio_compra,
                    fecha_compra,
                    insumos (
                        nombre,
                        unidad_medida
                    )
                `)
                .order('fecha_compra', { ascending: false })
                .limit(20);

            if (compError) throw compError;
            setCompras(compData as unknown as CompraInsumo[] || []);
        } catch (err) {
            console.error('Error cargando insumos:', err);
            toast.error('Carga las tablas de Insumos en Supabase antes de ingresar.');
        } finally {
            setLoadingInsumos(false);
        }
    };

    // Fetch active products catalog
    const cargarProductos = async () => {
        try {
            const { data, error: prodErr } = await supabase
                .from('productos')
                .select('*')
                .eq('activo', true)
                .order('nombre', { ascending: true });

            if (prodErr) throw prodErr;
            setProductos(data || []);
            if (data && data.length > 0 && !selectedProductoId) {
                setSelectedProductoId(data[0].id);
            }
        } catch (err) {
            console.error('Error cargando productos:', err);
        }
    };

    // Fetch recipes for the selected product
    const cargarReceta = async (prodId: string) => {
        if (!prodId) return;
        setLoadingReceta(true);
        try {
            const { data, error: recErr } = await supabase
                .from('recetas')
                .select(`
                    id,
                    producto_id,
                    insumo_id,
                    cantidad,
                    insumos (
                        nombre,
                        unidad_medida
                    )
                `)
                .eq('producto_id', prodId);

            if (recErr) throw recErr;
            setRecetaItems(data as unknown as Receta[] || []);
        } catch (err) {
            console.error('Error cargando receta:', err);
        } finally {
            setLoadingReceta(false);
        }
    };

    useEffect(() => {
        if (activeTab === 'historial') {
            cargarHistorial();
        } else if (activeTab === 'insumos') {
            cargarInsumos();
        } else if (activeTab === 'recetas') {
            cargarInsumos(); // We need supply units
            cargarProductos();
        }
    }, [activeTab]);

    useEffect(() => {
        if (selectedProductoId && activeTab === 'recetas') {
            cargarReceta(selectedProductoId);
        }
    }, [selectedProductoId, activeTab]);

    // Add ingredient formula mapping
    const handleAddIngredient = async (e: React.FormEvent) => {
        e.preventDefault();
        const cant = parseFloat(ingredienteCantidad);
        if (!selectedProductoId || !ingredienteInsumoId || isNaN(cant) || cant <= 0) {
            toast.error('Completa los campos con valores válidos');
            return;
        }

        try {
            const { error: addErr } = await supabase
                .from('recetas')
                .insert({
                    producto_id: selectedProductoId,
                    insumo_id: ingredienteInsumoId,
                    cantidad: cant
                });

            if (addErr) throw addErr;

            toast.success('Ingrediente agregado a la fórmula del plato');
            setIngredienteInsumoId('');
            setIngredienteCantidad('');
            setShowAddIngredient(false);
            cargarReceta(selectedProductoId);
        } catch (err: any) {
            toast.error('Este insumo ya está agregado a la receta de este plato.');
        }
    };

    // Remove ingredient formula mapping
    const handleRemoveIngredient = async (recetaId: string) => {
        try {
            const { error: delErr } = await supabase
                .from('recetas')
                .delete()
                .eq('id', recetaId);

            if (delErr) throw delErr;

            toast.success('Ingrediente eliminado de la fórmula');
            cargarReceta(selectedProductoId);
        } catch (err) {
            toast.error('Error al eliminar ingrediente');
        }
    };

    // Quick inline adjustment for beverages
    const handleBeverageAdjust = async (marca: keyof BebidasDetalle, tipo: string, cantidad: number) => {
        if (!stock) return;
        const loader = toast.loading('Actualizando stock de bebida...');
        try {
            const res = await ajustarStockBebidas(marca, tipo, cantidad);
            if (res.success) {
                toast.success(`Ajuste de stock realizado (${cantidad > 0 ? '+' : ''}${cantidad})`, { id: loader });
                refetch();
            } else {
                toast.error(res.message, { id: loader });
            }
        } catch (err) {
            toast.error('Error al realizar ajuste', { id: loader });
        }
    };

    // General adjustments form submit
    const ejecutarAjusteGeneral = async (e: React.FormEvent) => {
        e.preventDefault();
        const valor = parseFloat(montoAjuste);
        if (isNaN(valor) || valor === 0) {
            toast.error('Ingresa una cantidad válida diferente de cero');
            return;
        }

        setIsUpdating(true);
        const loader = toast.loading('Registrando ajuste...');

        try {
            let res = { success: false, message: '' };
            if (tipoAjuste === 'pollos') res = await ajustarStockPollos(valor);
            else if (tipoAjuste === 'papas') res = await ajustarStockPapas(valor);
            else if (tipoAjuste === 'chicha') res = await ajustarStockChicha(valor);
            else if (tipoAjuste === 'caja_chica') res = await ajustarCajaChica(valor);

            if (res.success) {
                toast.success(res.message, { id: loader });
                setMontoAjuste('');
                refetch();
            } else {
                toast.error(res.message, { id: loader });
            }
        } catch (err) {
            toast.error('Ocurrió un error inesperado al ajustar', { id: loader });
        } finally {
            setIsUpdating(false);
        }
    };

    // Register a new supply/insumo in catalog
    const handleCrearInsumo = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!nuevoNombre.trim()) {
            toast.error('El nombre es obligatorio');
            return;
        }

        setCreandoInsumo(true);
        try {
            const { error: insErr } = await supabase
                .from('insumos')
                .insert({
                    nombre: nuevoNombre.trim(),
                    stock_actual: parseFloat(nuevoStock) || 0.0,
                    unidad_medida: nuevaUnidad,
                    stock_minimo: parseFloat(nuevoMinimo) || 0.0
                });

            if (insErr) throw insErr;

            toast.success('Insumo registrado correctamente');
            setNuevoNombre('');
            setNuevoStock('');
            setNuevoMinimo('');
            setShowNewInsumoModal(false);
            cargarInsumos();
        } catch (err: any) {
            console.error(err);
            toast.error(err.message || 'Error al crear insumo. Verifica que el nombre no esté duplicado.');
        } finally {
            setCreandoInsumo(false);
        }
    };

    // Register supply purchase (adds stock)
    const handleRegistrarCompra = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!showCompraModal) return;
        const cant = parseFloat(cantOperacion);
        const costo = parseFloat(costoCompra);

        if (isNaN(cant) || cant <= 0 || isNaN(costo) || costo < 0) {
            toast.error('Ingresa una cantidad y costo válidos');
            return;
        }

        setProcesandoOperacion(true);
        try {
            // 1. Guardar en compras_insumos
            const { error: compErr } = await supabase
                .from('compras_insumos')
                .insert({
                    insumo_id: showCompraModal.id,
                    cantidad: cant,
                    precio_compra: costo
                });

            if (compErr) throw compErr;

            // 2. Incrementar stock en insumos
            const nuevoStockVal = showCompraModal.stock_actual + cant;
            const { error: updateErr } = await supabase
                .from('insumos')
                .update({ stock_actual: nuevoStockVal, updated_at: new Date().toISOString() })
                .eq('id', showCompraModal.id);

            if (updateErr) throw updateErr;

            // 3. Registrar Gasto
            await supabase.from('gastos').insert({
                descripcion: `Compra Insumo: ${showCompraModal.nombre} (${cant} ${showCompraModal.unidad_medida})`,
                monto: costo,
                fecha: new Date().toISOString().split('T')[0],
                metodo_pago: 'efectivo'
            });

            toast.success('Abastecimiento registrado y descontado de caja');
            setCantOperacion('');
            setCostoCompra('');
            setShowCompraModal(null);
            cargarInsumos();
        } catch (err: any) {
            console.error(err);
            toast.error('Error al registrar compra');
        } finally {
            setProcesandoOperacion(false);
        }
    };

    // Register supply consumption (subtracts stock)
    const handleRegistrarConsumo = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!showConsumoModal) return;
        const cant = parseFloat(cantOperacion);

        if (isNaN(cant) || cant <= 0) {
            toast.error('Ingresa una cantidad válida');
            return;
        }

        setProcesandoOperacion(true);
        try {
            const nuevoStockVal = Math.max(0, showConsumoModal.stock_actual - cant);
            const { error: updateErr } = await supabase
                .from('insumos')
                .update({ stock_actual: nuevoStockVal, updated_at: new Date().toISOString() })
                .eq('id', showConsumoModal.id);

            if (updateErr) throw updateErr;

            toast.success('Consumo registrado correctamente');
            setCantOperacion('');
            setShowConsumoModal(null);
            cargarInsumos();
        } catch (err: any) {
            console.error(err);
            toast.error('Error al registrar consumo');
        } finally {
            setProcesandoOperacion(false);
        }
    };

    // Filters insumos on catalog
    const insumosFiltrados = insumos.filter(ins => {
        const matchBusqueda = ins.nombre.toLowerCase().includes(busquedaInsumo.toLowerCase());
        const matchCritico = verSoloCritico ? (ins.stock_actual <= ins.stock_minimo) : true;
        return matchBusqueda && matchCritico;
    });

    // Filters historical data (snapshots)
    const historialFiltrado = historial.filter(item => 
        item.fecha.includes(busquedaHistorial) || 
        (item.estado === 'cerrado' ? 'cerrado' : 'abierto').includes(busquedaHistorial.toLowerCase())
    );

    return (
        <div className="p-3 sm:p-4 md:p-8 max-w-6xl mx-auto pb-32">
            
            {/* Header */}
            <div className="mb-6 sm:mb-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-pocholo-brown flex items-center gap-3">
                        <Boxes className="text-pocholo-red" size={32} />
                        Módulo de Inventario
                    </h1>
                    <p className="text-sm sm:text-base text-pocholo-brown/60">
                        Supervisa el stock en tiempo real, realiza ajustes rápidos y audita el historial.
                    </p>
                </div>
                
                {/* Refresh and status */}
                <div className="flex items-center gap-2">
                    <button 
                        onClick={() => { 
                            if (activeTab === 'insumos') {
                                cargarInsumos();
                            } else if (activeTab === 'recetas') {
                                cargarReceta(selectedProductoId);
                            } else if (activeTab === 'historial') {
                                cargarHistorial();
                            } else {
                                refetch();
                            }
                            toast.success('Inventario actualizado');
                        }}
                        className="p-2.5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-600 rounded-xl transition-colors shadow-sm flex items-center gap-2 text-sm font-semibold"
                    >
                        <RefreshCw size={16} />
                        Actualizar
                    </button>
                </div>
            </div>

            {/* Navigation Tabs */}
            <div className="flex bg-slate-100 p-1 rounded-2xl mb-6 shadow-inner max-w-2xl overflow-x-auto scrollbar-none">
                <button
                    onClick={() => setActiveTab('dashboard')}
                    className={`flex-1 py-3 px-4 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 shrink-0 ${
                        activeTab === 'dashboard'
                            ? 'bg-white text-pocholo-brown shadow-md'
                            : 'text-slate-500 hover:text-slate-800'
                    }`}
                >
                    <Boxes size={16} />
                    Stock en Vivo
                </button>
                <button
                    onClick={() => setActiveTab('insumos')}
                    className={`flex-1 py-3 px-4 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 shrink-0 ${
                        activeTab === 'insumos'
                            ? 'bg-white text-pocholo-brown shadow-md'
                            : 'text-slate-500 hover:text-slate-800'
                    }`}
                >
                    <Clipboard size={16} />
                    Insumos
                </button>
                <button
                    onClick={() => setActiveTab('recetas')}
                    className={`flex-1 py-3 px-4 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 shrink-0 ${
                        activeTab === 'recetas'
                            ? 'bg-white text-pocholo-brown shadow-md'
                            : 'text-slate-500 hover:text-slate-800'
                    }`}
                >
                    <Utensils size={16} />
                    Fórmulas / Recetas
                </button>
                <button
                    onClick={() => setActiveTab('ajustes')}
                    className={`flex-1 py-3 px-4 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 shrink-0 ${
                        activeTab === 'ajustes'
                            ? 'bg-white text-pocholo-brown shadow-md'
                            : 'text-slate-500 hover:text-slate-800'
                    }`}
                >
                    <ArrowUpDown size={16} />
                    Ajustes
                </button>
                <button
                    onClick={() => setActiveTab('historial')}
                    className={`flex-1 py-3 px-4 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 shrink-0 ${
                        activeTab === 'historial'
                            ? 'bg-white text-pocholo-brown shadow-md'
                            : 'text-slate-500 hover:text-slate-800'
                    }`}
                >
                    <History size={16} />
                    Historial
                </button>
            </div>

            {/* Content Tabs */}
            <AnimatePresence mode="wait">
                {activeTab === 'dashboard' && (
                    <motion.div
                        key="dashboard"
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -15 }}
                        className="space-y-6"
                    >
                        {loading ? (
                            <div className="flex justify-center p-20">
                                <RefreshCw className="animate-spin text-pocholo-red" size={32} />
                            </div>
                        ) : error ? (
                            <div className="bg-red-50 border-2 border-red-200 rounded-2xl p-6 text-center text-red-700 max-w-md mx-auto shadow-lg">
                                <AlertTriangle className="mx-auto text-red-500 mb-3" size={40} />
                                <h3 className="font-bold text-lg">No hay jornada activa</h3>
                                <p className="text-sm mt-1 text-red-600/80">{error}</p>
                            </div>
                        ) : stock && (
                            <>
                                {/* Main stats cards grid */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
                                    
                                    {/* Card Pollos */}
                                    <div className="glass-card bg-white p-5 rounded-2xl shadow-3d border-l-4 border-pocholo-red relative overflow-hidden flex flex-col justify-between min-h-[140px]">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Pollos Disponibles</p>
                                                <p className="text-2xl font-black text-slate-800 mt-1">
                                                    {formatearCantidadPollos(stock.pollos_disponibles)}
                                                </p>
                                            </div>
                                            <span className="text-2xl">🍗</span>
                                        </div>
                                        <div className="mt-4 pt-3 border-t border-slate-100 flex justify-between text-xs text-slate-500 font-semibold">
                                            <span>Inicial: {stock.pollos_iniciales}</span>
                                            <span className="text-pocholo-red">Vendidos: {formatearCantidadPollos(stock.pollos_vendidos)}</span>
                                        </div>
                                    </div>

                                    {/* Card Papas */}
                                    <div className="glass-card bg-white p-5 rounded-2xl shadow-3d border-l-4 border-amber-500 relative overflow-hidden flex flex-col justify-between min-h-[140px]">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Papas Iniciales</p>
                                                <p className="text-2xl font-black text-slate-800 mt-1">
                                                    {(stock.papas_iniciales || 0).toFixed(1)} Kg
                                                </p>
                                            </div>
                                            <span className="text-2xl">🥔</span>
                                        </div>
                                        <div className="mt-4 pt-3 border-t border-slate-100 text-xs text-slate-500 font-semibold italic">
                                            Controlado en el Cierre diario
                                        </div>
                                    </div>

                                    {/* Card Chicha */}
                                    <div className="glass-card bg-white p-5 rounded-2xl shadow-3d border-l-4 border-purple-500 relative overflow-hidden flex flex-col justify-between min-h-[140px]">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Chicha Disponible</p>
                                                <p className="text-2xl font-black text-slate-800 mt-1">
                                                    {(stock.chicha_disponible || 0).toFixed(2)} L
                                                </p>
                                            </div>
                                            <span className="text-2xl">🥤</span>
                                        </div>
                                        <div className="mt-4 pt-3 border-t border-slate-100 flex justify-between text-xs text-slate-500 font-semibold">
                                            <span>Inicial: {(stock.chicha_inicial || 0).toFixed(1)}L</span>
                                            <span className="text-purple-600">Vendida: {(stock.chicha_vendida || 0).toFixed(1)}L</span>
                                        </div>
                                    </div>

                                    {/* Card Caja Chica */}
                                    <div className="glass-card bg-white p-5 rounded-2xl shadow-3d border-l-4 border-green-500 relative overflow-hidden flex flex-col justify-between min-h-[140px]">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Caja Chica (Base)</p>
                                                <p className="text-2xl font-black text-slate-800 mt-1">
                                                    S/ {stock.dinero_inicial.toFixed(2)}
                                                </p>
                                            </div>
                                            <span className="text-2xl">💵</span>
                                        </div>
                                        <div className="mt-4 pt-3 border-t border-slate-100 text-xs text-slate-500 font-semibold italic">
                                            Fondo de apertura activo
                                        </div>
                                    </div>

                                </div>

                                {/* Detailed Beverages Stock Section */}
                                <div className="bg-white rounded-2xl p-5 md:p-6 shadow-3d">
                                    <h2 className="text-lg md:text-xl font-bold text-slate-800 mb-4 flex items-center gap-2 border-b pb-3 border-slate-100">
                                        🧊 Gaseosas y Bebidas (Stock Actual)
                                    </h2>

                                    <div className="space-y-3">
                                        {MARCAS_CONFIG.map((marca) => {
                                            const brandData = stock.bebidas_detalle?.[marca.key as keyof BebidasDetalle] as Record<string, number> | undefined;
                                            const brandTotal = marca.sizes.reduce((sum, s) => sum + ((brandData?.[s.key]) || 0), 0);
                                            const isOpen = expandedBrands.has(marca.key);

                                            return (
                                                <div key={marca.key} className="border border-slate-200 rounded-xl overflow-hidden shadow-sm bg-white">
                                                    
                                                    {/* Brand header */}
                                                    <button
                                                        type="button"
                                                        onClick={() => toggleBrand(marca.key)}
                                                        className="w-full flex items-center justify-between gap-3 px-4 py-4 bg-slate-50 hover:bg-slate-100 transition-colors"
                                                    >
                                                        <div className="flex items-center gap-3">
                                                            <span className={`w-3.5 h-3.5 rounded-full shrink-0 ${marca.dot}`}></span>
                                                            <span className="font-bold text-slate-800 text-sm md:text-base">{marca.name}</span>
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <span className="px-3 py-1 bg-slate-200 text-slate-700 rounded-full font-bold text-xs">
                                                                {brandTotal} unidades
                                                            </span>
                                                            {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                                        </div>
                                                    </button>

                                                    {/* Sizes listing */}
                                                    {isOpen && (
                                                        <div className="p-4 bg-white divide-y divide-slate-100">
                                                            {marca.sizes.map((size) => {
                                                                const qty = brandData?.[size.key] || 0;
                                                                return (
                                                                    <div key={size.key} className="flex justify-between items-center py-3 first:pt-0 last:pb-0">
                                                                        <div>
                                                                            <span className="font-semibold text-slate-700 text-sm">{size.label}</span>
                                                                            <span className="text-[11px] text-slate-400 ml-2 font-medium">({size.desc})</span>
                                                                        </div>

                                                                        {/* Stock controls */}
                                                                        <div className="flex items-center gap-3">
                                                                            <button
                                                                                onClick={() => handleBeverageAdjust(marca.key as keyof BebidasDetalle, size.key, -1)}
                                                                                disabled={qty <= 0}
                                                                                className="w-8 h-8 rounded-full border border-slate-200 hover:border-red-300 hover:bg-red-50 text-slate-500 hover:text-red-500 flex items-center justify-center transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                                                                            >
                                                                                <Minus size={14} />
                                                                            </button>
                                                                            
                                                                            <span className={`font-black text-base w-12 text-center ${qty === 0 ? 'text-slate-300' : 'text-slate-800'}`}>
                                                                                {qty}
                                                                            </span>

                                                                            <button
                                                                                onClick={() => handleBeverageAdjust(marca.key as keyof BebidasDetalle, size.key, 1)}
                                                                                className="w-8 h-8 rounded-full border border-slate-200 hover:border-green-300 hover:bg-green-50 text-slate-500 hover:text-green-600 flex items-center justify-center transition-all"
                                                                            >
                                                                                <Plus size={14} />
                                                                            </button>
                                                                        </div>
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            </>
                        )}
                    </motion.div>
                )}

                {activeTab === 'insumos' && (
                    <motion.div
                        key="insumos"
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -15 }}
                        className="space-y-6"
                    >
                        {/* Catalog Toolbar */}
                        <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
                            <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto flex-1">
                                <div className="relative flex-1 max-w-md">
                                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                    <input
                                        type="text"
                                        placeholder="Buscar insumo (ej: Arroz)..."
                                        value={busquedaInsumo}
                                        onChange={(e) => setBusquedaInsumo(e.target.value)}
                                        className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-pocholo-red font-semibold text-slate-700"
                                    />
                                </div>
                                <label className="flex items-center gap-2 cursor-pointer select-none py-2 px-3 border border-slate-200 hover:bg-slate-50 rounded-xl transition-colors">
                                    <input
                                        type="checkbox"
                                        checked={verSoloCritico}
                                        onChange={(e) => setVerSoloCritico(e.target.checked)}
                                        className="rounded text-pocholo-red focus:ring-pocholo-red border-slate-300"
                                    />
                                    <span className="text-xs font-bold text-slate-500 flex items-center gap-1.5">
                                        <AlertTriangle size={14} className="text-red-500" />
                                        Ver solo Stock Bajo
                                    </span>
                                </label>
                            </div>
                            <button
                                onClick={() => setShowNewInsumoModal(true)}
                                className="w-full sm:w-auto px-5 py-3 bg-pocholo-red hover:bg-red-700 text-white font-bold text-sm rounded-xl shadow-md transition-all flex items-center justify-center gap-2 shrink-0"
                            >
                                <Plus size={16} />
                                Registrar Insumo
                            </button>
                        </div>

                        {/* Insumos catalog grid */}
                        {loadingInsumos ? (
                            <div className="flex justify-center p-20">
                                <RefreshCw className="animate-spin text-pocholo-red" size={32} />
                            </div>
                        ) : (
                            <>
                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                                    {insumosFiltrados.length > 0 ? (
                                        insumosFiltrados.map((ins) => {
                                            const esCritico = ins.stock_actual <= ins.stock_minimo;
                                            return (
                                                <motion.div
                                                    key={ins.id}
                                                    layout
                                                    className={`glass-card p-5 rounded-2xl shadow-sm border transition-all flex flex-col justify-between min-h-[170px] ${
                                                        esCritico 
                                                            ? 'border-red-200 bg-red-50/20' 
                                                            : 'border-slate-200 bg-white'
                                                    }`}
                                                >
                                                    <div>
                                                        <div className="flex justify-between items-start gap-2">
                                                            <h3 className="font-bold text-slate-800 text-base uppercase truncate" title={ins.nombre}>
                                                                {ins.nombre}
                                                            </h3>
                                                            {esCritico && (
                                                                <span className="px-2 py-0.5 bg-red-100 border border-red-200 text-red-700 font-extrabold text-[9px] rounded-full uppercase tracking-wider animate-pulse flex items-center gap-1 shrink-0">
                                                                    <AlertTriangle size={10} /> Abastecer
                                                                </span>
                                                            )}
                                                        </div>
                                                        <div className="mt-3">
                                                            <span className="text-3xl font-black text-slate-800">
                                                                {ins.stock_actual.toFixed(1)}
                                                            </span>
                                                            <span className="text-sm font-bold text-slate-400 ml-1.5 uppercase">
                                                                {ins.unidad_medida}
                                                            </span>
                                                        </div>
                                                        <p className="text-[11px] text-slate-400 font-semibold mt-1">
                                                            Límite mínimo: {ins.stock_minimo.toFixed(1)} {ins.unidad_medida}
                                                        </p>
                                                    </div>

                                                    {/* Card buttons */}
                                                    <div className="flex gap-2 mt-5 border-t border-slate-100 pt-3">
                                                        <button
                                                            onClick={() => setShowCompraModal(ins)}
                                                            className="flex-1 py-2 bg-green-50 hover:bg-green-100 text-green-700 border border-green-200 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-all"
                                                        >
                                                            <ShoppingCart size={14} />
                                                            Comprar
                                                        </button>
                                                        <button
                                                            onClick={() => setShowConsumoModal(ins)}
                                                            className="flex-1 py-2 bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-all"
                                                        >
                                                            <Minus size={14} />
                                                            Consumo
                                                        </button>
                                                    </div>
                                                </motion.div>
                                            );
                                        })
                                    ) : (
                                        <div className="col-span-full bg-white rounded-2xl p-12 text-center text-slate-400 border border-slate-100 shadow-sm">
                                            <Clipboard className="mx-auto mb-3 text-slate-300" size={40} />
                                            <p className="font-bold">No se encontraron insumos.</p>
                                            <p className="text-xs text-slate-400 mt-1">
                                                {busquedaInsumo ? 'Prueba cambiando los filtros.' : 'Comienza registrando tu primer insumo en el botón de arriba.'}
                                            </p>
                                        </div>
                                    )}
                                </div>

                                {/* Purchases history ("Cada cuánto compro") */}
                                <div className="bg-white rounded-2xl p-5 md:p-6 shadow-3d mt-8">
                                    <h3 className="font-bold text-slate-800 text-base md:text-lg mb-4 flex items-center gap-2 border-b pb-3 border-slate-100">
                                        <History className="text-pocholo-red" size={20} />
                                        Historial de Abastecimiento (¿Cada cuánto compro?)
                                    </h3>
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left text-sm whitespace-nowrap">
                                            <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-xs border-b border-slate-100">
                                                <tr>
                                                    <th className="p-3">Fecha Compra</th>
                                                    <th className="p-3">Insumo</th>
                                                    <th className="p-3">Cantidad Adquirida</th>
                                                    <th className="p-3">Inversión Total</th>
                                                    <th className="p-3">Costo Unitario Promedio</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100 text-slate-600 font-semibold text-xs md:text-sm">
                                                {compras.length > 0 ? (
                                                    compras.map((comp) => {
                                                        const insName = comp.insumos?.nombre || 'Insumo Eliminado';
                                                        const insUnit = comp.insumos?.unidad_medida || '';
                                                        const unitCost = comp.precio_compra / comp.cantidad;
                                                        return (
                                                            <tr key={comp.id} className="hover:bg-slate-50/50">
                                                                <td className="p-3">
                                                                    <span className="flex items-center gap-1.5 font-bold text-slate-800">
                                                                        <Calendar size={13} className="text-slate-400" />
                                                                        {new Date(comp.fecha_compra).toLocaleDateString('es-PE', {
                                                                            day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
                                                                        })}
                                                                    </span>
                                                                </td>
                                                                <td className="p-3 uppercase font-extrabold text-slate-800">{insName}</td>
                                                                <td className="p-3">{comp.cantidad.toFixed(1)} {insUnit}</td>
                                                                <td className="p-3 font-bold text-green-600">S/ {comp.precio_compra.toFixed(2)}</td>
                                                                <td className="p-3 text-slate-400 italic">S/ {unitCost.toFixed(2)} por {insUnit}</td>
                                                            </tr>
                                                        );
                                                    })
                                                ) : (
                                                    <tr>
                                                        <td colSpan={5} className="p-6 text-center text-slate-400 italic">
                                                            No hay compras de abastecimiento registradas en el sistema.
                                                        </td>
                                                    </tr>
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </>
                        )}
                    </motion.div>
                )}

                {activeTab === 'recetas' && (
                    <motion.div
                        key="recetas"
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -15 }}
                        className="space-y-6"
                    >
                        <div className="grid md:grid-cols-3 gap-6">
                            
                            {/* Product Selector Sidebar */}
                            <div className="bg-white rounded-2xl p-5 shadow-3d border border-slate-100 h-[600px] flex flex-col">
                                <h3 className="font-bold text-slate-800 text-sm md:text-base mb-3 pb-2 border-b flex items-center gap-2">
                                    <Utensils className="text-pocholo-red" size={18} />
                                    Seleccionar Plato
                                </h3>
                                <div className="space-y-1 overflow-y-auto flex-1 pr-1 custom-scrollbar">
                                    {productos.map((prod) => (
                                        <button
                                            key={prod.id}
                                            onClick={() => setSelectedProductoId(prod.id)}
                                            className={`w-full text-left p-3 rounded-xl font-semibold text-xs md:text-sm transition-all border ${
                                                selectedProductoId === prod.id
                                                    ? 'bg-pocholo-cream border-pocholo-red/30 text-pocholo-red'
                                                    : 'bg-white border-transparent text-slate-600 hover:bg-slate-50'
                                            }`}
                                        >
                                            <p className="uppercase truncate">{prod.nombre}</p>
                                            <p className="text-[10px] text-slate-400 capitalize mt-0.5">{prod.tipo}</p>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Recipe ingredients config panel */}
                            <div className="md:col-span-2 bg-white rounded-2xl p-5 md:p-6 shadow-3d border border-slate-100 flex flex-col h-[600px]">
                                {selectedProductoId ? (
                                    <>
                                        <div className="flex justify-between items-center mb-6 border-b pb-4 border-slate-100">
                                            <div>
                                                <span className="text-[10px] font-bold bg-slate-100 text-slate-500 uppercase px-2 py-0.5 rounded">Fórmula del plato</span>
                                                <h3 className="font-black text-slate-800 text-lg md:text-xl uppercase mt-1">
                                                    {productos.find(p => p.id === selectedProductoId)?.nombre}
                                                </h3>
                                            </div>
                                            <button
                                                onClick={() => setShowAddIngredient(true)}
                                                className="px-4 py-2.5 bg-pocholo-red hover:bg-red-700 text-white font-bold text-xs md:text-sm rounded-xl shadow-md transition-all flex items-center gap-1.5"
                                            >
                                                <Plus size={16} />
                                                Agregar Insumo
                                            </button>
                                        </div>

                                        {/* Recipe Items List */}
                                        {loadingReceta ? (
                                            <div className="flex-1 flex items-center justify-center">
                                                <RefreshCw className="animate-spin text-pocholo-red" size={28} />
                                            </div>
                                        ) : (
                                            <div className="flex-1 overflow-y-auto space-y-3 pr-1 custom-scrollbar">
                                                {recetaItems.length > 0 ? (
                                                    recetaItems.map((item) => {
                                                        const insName = item.insumos?.nombre || 'Insumo Desconocido';
                                                        const insUnit = item.insumos?.unidad_medida || '';
                                                        return (
                                                            <div 
                                                                key={item.id} 
                                                                className="flex justify-between items-center p-4 bg-slate-50 hover:bg-slate-100/50 border border-slate-200/50 rounded-2xl transition-all"
                                                            >
                                                                <div>
                                                                    <p className="font-bold text-slate-800 text-sm uppercase">{insName}</p>
                                                                    <p className="text-[11px] text-slate-400 font-semibold mt-0.5">Deducción por plato vendido</p>
                                                                </div>
                                                                <div className="flex items-center gap-4">
                                                                    <span className="font-black text-slate-800 text-base">
                                                                        {item.cantidad.toFixed(3)} <span className="text-xs font-bold text-slate-400 uppercase">{insUnit}</span>
                                                                    </span>
                                                                    <button
                                                                        onClick={() => handleRemoveIngredient(item.id)}
                                                                        className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                                                                        title="Eliminar ingrediente de la receta"
                                                                    >
                                                                        <Trash2 size={16} />
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        );
                                                    })
                                                ) : (
                                                    <div className="flex flex-col items-center justify-center h-full text-slate-400 italic text-sm">
                                                        <Utensils size={40} className="mb-2 text-slate-300" />
                                                        Este plato no descuenta insumos. Configure su receta en el botón de arriba.
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </>
                                ) : (
                                    <div className="flex-1 flex items-center justify-center text-slate-400 italic text-sm">
                                        Selecciona un plato de la lista izquierda para ver su receta.
                                    </div>
                                )}
                            </div>

                        </div>
                    </motion.div>
                )}

                {activeTab === 'ajustes' && (
                    <motion.div
                        key="ajustes"
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -15 }}
                        className="max-w-xl mx-auto"
                    >
                        <div className="glass-card bg-white rounded-2xl shadow-3d p-6 border border-slate-100">
                            <h2 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2 border-b pb-3 border-slate-100">
                                <ArrowUpDown className="text-pocholo-red" />
                                Ajustes de Inventario Manuales
                            </h2>

                            <form onSubmit={ejecutarAjusteGeneral} className="space-y-6">
                                {/* Selector de Tipo */}
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                                        ¿Qué vas a ajustar?
                                    </label>
                                    <div className="grid grid-cols-2 gap-2">
                                        <button
                                            type="button"
                                            onClick={() => setTipoAjuste('pollos')}
                                            className={`p-3 rounded-xl border-2 font-bold text-xs md:text-sm flex flex-col items-center gap-1 transition-all ${
                                                tipoAjuste === 'pollos'
                                                    ? 'border-pocholo-red bg-red-50/50 text-pocholo-red'
                                                    : 'border-slate-100 bg-white text-slate-500 hover:border-slate-200'
                                            }`}
                                        >
                                            <span className="text-xl">🍗</span>
                                            Pollos
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setTipoAjuste('papas')}
                                            className={`p-3 rounded-xl border-2 font-bold text-xs md:text-sm flex flex-col items-center gap-1 transition-all ${
                                                tipoAjuste === 'papas'
                                                    ? 'border-amber-500 bg-amber-50/50 text-amber-600'
                                                    : 'border-slate-100 bg-white text-slate-500 hover:border-slate-200'
                                            }`}
                                        >
                                            <span className="text-xl">🥔</span>
                                            Papas (Kg)
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setTipoAjuste('chicha')}
                                            className={`p-3 rounded-xl border-2 font-bold text-xs md:text-sm flex flex-col items-center gap-1 transition-all ${
                                                tipoAjuste === 'chicha'
                                                    ? 'border-purple-500 bg-purple-50/50 text-purple-600'
                                                    : 'border-slate-100 bg-white text-slate-500 hover:border-slate-200'
                                            }`}
                                        >
                                            <span className="text-xl">🥤</span>
                                            Chicha (Litros)
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setTipoAjuste('caja_chica')}
                                            className={`p-3 rounded-xl border-2 font-bold text-xs md:text-sm flex flex-col items-center gap-1 transition-all ${
                                                tipoAjuste === 'caja_chica'
                                                    ? 'border-green-500 bg-green-50/50 text-green-600'
                                                    : 'border-slate-100 bg-white text-slate-500 hover:border-slate-200'
                                            }`}
                                        >
                                            <span className="text-xl">💵</span>
                                            Caja Chica
                                        </button>
                                    </div>
                                </div>

                                {/* Monto / Cantidad */}
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                                        Cantidad del Ajuste
                                    </label>
                                    <div className="relative">
                                        <input
                                            type="number"
                                            step="0.01"
                                            value={montoAjuste}
                                            onChange={(e) => setMontoAjuste(e.target.value)}
                                            placeholder="Ingresa valor (ej. +5 o -3.5)"
                                            className="w-full pl-6 pr-12 py-3.5 bg-slate-50 border-2 border-slate-200 rounded-xl focus:outline-none focus:border-pocholo-red font-bold text-slate-800"
                                            required
                                        />
                                        <span className="absolute right-4 top-1/2 -translate-y-1/2 font-bold text-slate-400 text-sm">
                                            {tipoAjuste === 'pollos' && 'Pollos'}
                                            {tipoAjuste === 'papas' && 'Kg'}
                                            {tipoAjuste === 'chicha' && 'L'}
                                            {tipoAjuste === 'caja_chica' && 'S/'}
                                        </span>
                                    </div>
                                    <p className="text-[11px] text-slate-400 mt-1.5 font-medium leading-relaxed">
                                        * Usa números positivos para **añadir** al inventario actual y números negativos con el signo menos (-) para **retirar/descontar**.
                                    </p>
                                </div>

                                {/* Botón Guardar */}
                                <button
                                    type="submit"
                                    disabled={isUpdating}
                                    className="w-full py-4 bg-pocholo-red text-white font-bold rounded-xl shadow-lg hover:bg-red-700 active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-2 text-sm uppercase"
                                >
                                    {isUpdating ? 'Actualizando...' : 'Guardar Ajuste'}
                                </button>
                            </form>
                        </div>
                    </motion.div>
                )}

                {activeTab === 'historial' && (
                    <motion.div
                        key="historial"
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -15 }}
                        className="space-y-6"
                    >
                        {/* Search header */}
                        <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 flex items-center gap-3">
                            <Search className="text-slate-400 shrink-0" size={20} />
                            <input
                                type="text"
                                value={busquedaHistorial}
                                onChange={(e) => setBusquedaHistorial(e.target.value)}
                                placeholder="Filtrar por fecha (YYYY-MM-DD) o estado (abierto/cerrado)..."
                                className="w-full focus:outline-none text-sm text-slate-800 font-semibold"
                            />
                        </div>

                        {loadingHistorial ? (
                            <div className="flex justify-center p-20">
                                <RefreshCw className="animate-spin text-pocholo-red" size={32} />
                            </div>
                        ) : (
                            <div className="bg-white rounded-2xl overflow-hidden shadow-3d border border-slate-100">
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left text-sm whitespace-nowrap">
                                        <thead className="bg-slate-50 text-slate-500 font-bold uppercase border-b border-slate-100">
                                            <tr>
                                                <th className="p-4 text-xs tracking-wider">Fecha</th>
                                                <th className="p-4 text-xs tracking-wider">Estado</th>
                                                <th className="p-4 text-xs tracking-wider">Pollos Apertura</th>
                                                <th className="p-4 text-xs tracking-wider">Sobrante Cierre</th>
                                                <th className="p-4 text-xs tracking-wider">Base Caja</th>
                                                <th className="p-4 text-xs tracking-wider">Cierre Real</th>
                                                <th className="p-4 text-xs tracking-wider">Acción</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {historialFiltrado.length > 0 ? (
                                                historialFiltrado.map((dia) => (
                                                    <tr key={dia.id} className="hover:bg-slate-50/50 font-medium text-slate-700">
                                                        <td className="p-4">
                                                            <div className="flex items-center gap-2 font-bold text-slate-800">
                                                                <Calendar size={14} className="text-slate-400" />
                                                                {dia.fecha}
                                                            </div>
                                                        </td>
                                                        <td className="p-4">
                                                            <span className={`px-2.5 py-1 rounded-full text-xs font-bold flex items-center w-fit gap-1 ${
                                                                dia.estado === 'cerrado' 
                                                                    ? 'bg-green-50 text-green-700 border border-green-200' 
                                                                    : 'bg-yellow-50 text-yellow-700 border border-yellow-200'
                                                            }`}>
                                                                {dia.estado === 'cerrado' ? <Lock size={12} /> : <Unlock size={12} />}
                                                                {dia.estado === 'cerrado' ? 'Cerrado' : 'Abierto'}
                                                            </span>
                                                        </td>
                                                        <td className="p-4">{dia.pollos_enteros} pollos</td>
                                                        <td className="p-4">
                                                            {dia.estado === 'cerrado' 
                                                                ? `${dia.stock_pollos_real || 0} pollos`
                                                                : '-'
                                                            }
                                                        </td>
                                                        <td className="p-4">S/ {(dia.dinero_inicial || 0).toFixed(2)}</td>
                                                        <td className="p-4 font-bold text-slate-800">
                                                            {dia.estado === 'cerrado' 
                                                                ? `S/ ${(dia.dinero_cierre_real || 0).toFixed(2)}`
                                                                : '-'
                                                            }
                                                        </td>
                                                        <td className="p-4">
                                                            <button
                                                                onClick={() => setSelectedHistorial(dia)}
                                                                className="px-3 py-1.5 bg-pocholo-cream hover:bg-pocholo-yellow/20 text-pocholo-red hover:text-red-700 font-bold rounded-lg text-xs transition-colors flex items-center gap-1.5"
                                                            >
                                                                <FileText size={14} />
                                                                Ver Detalles
                                                            </button>
                                                        </td>
                                                    </tr>
                                                ))
                                            ) : (
                                                <tr>
                                                    <td colSpan={7} className="p-8 text-center text-slate-400 italic">
                                                        No se encontraron cierres históricos.
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Historical Details Modal */}
            <AnimatePresence>
                {selectedHistorial && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]"
                        >
                            {/* Modal Header */}
                            <div className="bg-pocholo-red text-white p-5 flex justify-between items-center">
                                <div>
                                    <h3 className="text-lg font-bold flex items-center gap-2">
                                        <Calendar size={18} />
                                        Detalle del {selectedHistorial.fecha}
                                    </h3>
                                    <p className="text-white/80 text-xs mt-0.5">
                                        Estado: {selectedHistorial.estado === 'cerrado' ? 'Cerrado' : 'Abierto'}
                                    </p>
                                </div>
                                <button 
                                    onClick={() => setSelectedHistorial(null)}
                                    className="p-1 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
                                >
                                    <ChevronDown className="rotate-90" size={20} />
                                </button>
                            </div>

                            {/* Modal Body */}
                            <div className="p-5 overflow-y-auto space-y-5 text-sm text-slate-700">
                                
                                {/* Info Cards */}
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                                        <span className="text-slate-400 text-xs font-bold uppercase tracking-wider block mb-1">Caja Inicial</span>
                                        <span className="font-black text-slate-800 text-base">S/ {(selectedHistorial.dinero_inicial || 0).toFixed(2)}</span>
                                    </div>
                                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                                        <span className="text-slate-400 text-xs font-bold uppercase tracking-wider block mb-1">Cierre Real Caja</span>
                                        <span className="font-black text-slate-800 text-base">
                                            {selectedHistorial.estado === 'cerrado' 
                                                ? `S/ ${(selectedHistorial.dinero_cierre_real || 0).toFixed(2)}`
                                                : '-'
                                            }
                                        </span>
                                    </div>
                                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                                        <span className="text-slate-400 text-xs font-bold uppercase tracking-wider block mb-1">Pollos Iniciales</span>
                                        <span className="font-black text-slate-800 text-base">{selectedHistorial.pollos_enteros} und.</span>
                                    </div>
                                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                                        <span className="text-slate-400 text-xs font-bold uppercase tracking-wider block mb-1">Pollos Cierre</span>
                                        <span className="font-black text-slate-800 text-base">
                                            {selectedHistorial.estado === 'cerrado' 
                                                ? `${selectedHistorial.stock_pollos_real || 0} und.`
                                                : '-'
                                            }
                                        </span>
                                    </div>
                                </div>

                                {/* Mermas & Consumption */}
                                {selectedHistorial.estado === 'cerrado' && (
                                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-2">
                                        <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider border-b pb-1.5 mb-2 border-slate-200 flex items-center gap-1.5">
                                            <AlertTriangle size={14} className="text-amber-500" />
                                            Mermas & Consumo Justificado
                                        </h4>
                                        <div className="flex justify-between items-center">
                                            <span className="text-slate-500 font-semibold">Cena del Personal:</span>
                                            <span className="font-bold text-slate-700">{selectedHistorial.cena_personal || 0} pollos</span>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span className="text-slate-500 font-semibold">Pollos Golpeados:</span>
                                            <span className="font-bold text-slate-700">{selectedHistorial.pollos_golpeados || 0} pollos</span>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span className="text-slate-500 font-semibold">Papas Finales:</span>
                                            <span className="font-bold text-slate-700">{(selectedHistorial.papas_finales || 0).toFixed(1)} Kg</span>
                                        </div>
                                    </div>
                                )}

                                {/* Gaseosas details JSON */}
                                {selectedHistorial.bebidas_detalle && (
                                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                                        <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider border-b pb-1.5 mb-2 border-slate-200 flex items-center gap-1.5">
                                            <CheckCircle size={14} className="text-green-500" />
                                            Bebidas Registradas (Sobrantes)
                                        </h4>
                                        <div className="space-y-3 max-h-44 overflow-y-auto pr-1">
                                            {Object.entries(selectedHistorial.bebidas_detalle as Record<string, any>).map(([brand, sizes]) => {
                                                const sizesArr = Object.entries(sizes).filter(([, qty]) => (qty as number) > 0);
                                                if (sizesArr.length === 0) return null;
                                                return (
                                                    <div key={brand} className="text-xs">
                                                        <span className="font-bold text-slate-700 block uppercase mb-1">{brand.replace('_', ' ')}</span>
                                                        <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                                                            {sizesArr.map(([size, qty]) => (
                                                                <div key={size} className="flex justify-between text-slate-500">
                                                                    <span>{size.replace('_', ' ')}:</span>
                                                                    <span className="font-bold text-slate-700">{String(qty)}</span>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}

                                {/* Notes */}
                                {selectedHistorial.observaciones_cierre && (
                                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                                        <span className="text-slate-400 text-xs font-bold uppercase tracking-wider block mb-1">Notas de Cierre</span>
                                        <p className="text-xs text-slate-600 leading-relaxed bg-white p-2.5 rounded-lg border border-slate-200">
                                            {selectedHistorial.observaciones_cierre}
                                        </p>
                                    </div>
                                )}

                            </div>

                            {/* Modal Footer */}
                            <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end">
                                <button 
                                    onClick={() => setSelectedHistorial(null)}
                                    className="px-6 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl font-bold transition-all text-xs"
                                >
                                    Cerrar
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Modal: Registrar Nuevo Insumo */}
            <AnimatePresence>
                {showNewInsumoModal && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden"
                        >
                            <div className="bg-pocholo-red text-white p-5">
                                <h3 className="text-lg font-bold flex items-center gap-2">
                                    <Clipboard size={18} />
                                    Registrar Nuevo Insumo
                                </h3>
                                <p className="text-white/80 text-xs mt-0.5">Agrégalo al catálogo del restaurante</p>
                            </div>
                            <form onSubmit={handleCrearInsumo} className="p-5 space-y-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Nombre del Insumo</label>
                                    <input
                                        type="text"
                                        placeholder="Ej: Arroz Costeño, Taper de 1/4 Pollo"
                                        value={nuevoNombre}
                                        onChange={(e) => setNuevoNombre(e.target.value)}
                                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 focus:border-pocholo-red rounded-xl text-sm focus:outline-none font-bold text-slate-800"
                                        required
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Stock Inicial</label>
                                        <input
                                            type="number"
                                            step="0.1"
                                            placeholder="0.0"
                                            value={nuevoStock}
                                            onChange={(e) => setNuevoStock(e.target.value)}
                                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 focus:border-pocholo-red rounded-xl text-sm focus:outline-none font-bold text-slate-800"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Unidad de Medida</label>
                                        <select
                                            value={nuevaUnidad}
                                            onChange={(e) => setNuevaUnidad(e.target.value)}
                                            className="w-full px-3 py-3 bg-slate-50 border border-slate-200 focus:border-pocholo-red rounded-xl text-sm focus:outline-none font-bold text-slate-700"
                                        >
                                            <option value="Kg">Kilogramos (Kg)</option>
                                            <option value="Sacos">Sacos</option>
                                            <option value="Litros">Litros (L)</option>
                                            <option value="Paquetes">Paquetes</option>
                                            <option value="Unidades">Unidades</option>
                                        </select>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Alerta de Stock Mínimo</label>
                                    <input
                                        type="number"
                                        step="0.1"
                                        placeholder="Alerta de repuesto (ej: 10)"
                                        value={nuevoMinimo}
                                        onChange={(e) => setNuevoMinimo(e.target.value)}
                                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 focus:border-pocholo-red rounded-xl text-sm focus:outline-none font-bold text-slate-800"
                                    />
                                    <p className="text-[10px] text-slate-400 mt-1 font-semibold">
                                        * El sistema te avisará en rojo si el stock actual cae por debajo de esta cantidad.
                                    </p>
                                </div>
                                <div className="flex gap-2 pt-3">
                                    <button
                                        type="button"
                                        onClick={() => setShowNewInsumoModal(false)}
                                        className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-500 rounded-xl font-bold transition-all text-xs"
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={creandoInsumo}
                                        className="flex-1 py-3 bg-pocholo-red hover:bg-red-700 text-white rounded-xl font-bold transition-all text-xs shadow-md"
                                    >
                                        {creandoInsumo ? 'Registrando...' : 'Registrar'}
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Modal: Registrar Compra/Abastecimiento */}
            <AnimatePresence>
                {showCompraModal && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden"
                        >
                            <div className="bg-green-600 text-white p-5">
                                <h3 className="text-lg font-bold flex items-center gap-2">
                                    <ShoppingCart size={18} />
                                    Abastecer Insumo: {showCompraModal.nombre}
                                </h3>
                                <p className="text-white/80 text-xs mt-0.5">Agrega stock al inventario por una compra</p>
                            </div>
                            <form onSubmit={handleRegistrarCompra} className="p-5 space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Cantidad Adquirida</label>
                                        <div className="relative">
                                            <input
                                                type="number"
                                                step="0.1"
                                                placeholder="0.0"
                                                value={cantOperacion}
                                                onChange={(e) => setCantOperacion(e.target.value)}
                                                className="w-full pr-12 pl-4 py-3 bg-slate-50 border border-slate-200 focus:border-green-500 rounded-xl text-sm focus:outline-none font-bold text-slate-800"
                                                required
                                            />
                                            <span className="absolute right-4 top-1/2 -translate-y-1/2 font-bold text-slate-400 text-xs uppercase">
                                                {showCompraModal.unidad_medida}
                                            </span>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Inversión (Total S/)</label>
                                        <div className="relative">
                                            <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-slate-400 text-xs">S/</span>
                                            <input
                                                type="number"
                                                step="0.5"
                                                placeholder="0.00"
                                                value={costoCompra}
                                                onChange={(e) => setCostoCompra(e.target.value)}
                                                className="w-full pl-8 pr-3 py-3 bg-slate-50 border border-slate-200 focus:border-green-500 rounded-xl text-sm focus:outline-none font-bold text-slate-800"
                                                required
                                            />
                                        </div>
                                    </div>
                                </div>
                                <p className="text-[10px] text-slate-400 font-semibold leading-relaxed">
                                    * Nota: Al registrar esta compra, el stock subirá de forma automática. Además, el costo se registrará como un **Gasto del día** en caja de manera automatizada.
                                </p>
                                <div className="flex gap-2 pt-3">
                                    <button
                                        type="button"
                                        onClick={() => { setShowCompraModal(null); setCantOperacion(''); setCostoCompra(''); }}
                                        className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-500 rounded-xl font-bold transition-all text-xs"
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={procesandoOperacion}
                                        className="flex-1 py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl font-bold transition-all text-xs shadow-md"
                                    >
                                        {procesandoOperacion ? 'Procesando...' : 'Completar Compra'}
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Modal: Registrar Consumo / Merma */}
            <AnimatePresence>
                {showConsumoModal && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden"
                        >
                            <div className="bg-slate-700 text-white p-5">
                                <h3 className="text-lg font-bold flex items-center gap-2">
                                    <Minus size={18} />
                                    Registrar Consumo: {showConsumoModal.nombre}
                                </h3>
                                <p className="text-white/80 text-xs mt-0.5">Descuenta stock de manera manual</p>
                            </div>
                            <form onSubmit={handleRegistrarConsumo} className="p-5 space-y-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Cantidad Utilizada / Merma</label>
                                    <div className="relative">
                                        <input
                                            type="number"
                                            step="0.1"
                                            placeholder="0.0"
                                            value={cantOperacion}
                                            onChange={(e) => setCantOperacion(e.target.value)}
                                            className="w-full pr-12 pl-4 py-3 bg-slate-50 border border-slate-200 focus:border-slate-500 rounded-xl text-sm focus:outline-none font-bold text-slate-800"
                                            required
                                        />
                                        <span className="absolute right-4 top-1/2 -translate-y-1/2 font-bold text-slate-400 text-xs uppercase">
                                            {showConsumoModal.unidad_medida}
                                        </span>
                                    </div>
                                    <p className="text-[10px] text-slate-400 mt-2 font-semibold">
                                        * El stock actual del insumo bajará inmediatamente tras guardar.
                                    </p>
                                </div>
                                <div className="flex gap-2 pt-3">
                                    <button
                                        type="button"
                                        onClick={() => { setShowConsumoModal(null); setCantOperacion(''); }}
                                        className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-500 rounded-xl font-bold transition-all text-xs"
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={procesandoOperacion}
                                        className="flex-1 py-3 bg-slate-700 hover:bg-slate-800 text-white rounded-xl font-bold transition-all text-xs shadow-md"
                                    >
                                        {procesandoOperacion ? 'Procesando...' : 'Descontar Stock'}
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Modal: Agregar Ingrediente/Insumo a la Fórmula */}
            <AnimatePresence>
                {showAddIngredient && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden"
                        >
                            <div className="bg-pocholo-red text-white p-5">
                                <h3 className="text-lg font-bold flex items-center gap-2">
                                    <Plus size={18} />
                                    Agregar a la Fórmula
                                </h3>
                                <p className="text-white/80 text-xs mt-0.5">Asigna qué insumo consume este plato al venderse</p>
                            </div>
                            <form onSubmit={handleAddIngredient} className="p-5 space-y-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Seleccionar Insumo</label>
                                    <select
                                        value={ingredienteInsumoId}
                                        onChange={(e) => setIngredienteInsumoId(e.target.value)}
                                        className="w-full px-3 py-3 bg-slate-50 border border-slate-200 focus:border-pocholo-red rounded-xl text-sm focus:outline-none font-bold text-slate-700"
                                        required
                                    >
                                        <option value="">-- Elige un insumo --</option>
                                        {insumos.map((ins) => (
                                            <option key={ins.id} value={ins.id}>
                                                {ins.nombre.toUpperCase()} ({ins.unidad_medida})
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Cantidad consumida por plato</label>
                                    <div className="relative">
                                        <input
                                            type="number"
                                            step="0.001"
                                            placeholder="Ej: 0.3 para papas o 1 para taper"
                                            value={ingredienteCantidad}
                                            onChange={(e) => setIngredienteCantidad(e.target.value)}
                                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 focus:border-pocholo-red rounded-xl text-sm focus:outline-none font-bold text-slate-800"
                                            required
                                        />
                                        <span className="absolute right-4 top-1/2 -translate-y-1/2 font-bold text-slate-400 text-xs uppercase">
                                            {insumos.find(i => i.id === ingredienteInsumoId)?.unidad_medida || ''}
                                        </span>
                                    </div>
                                    <p className="text-[10px] text-slate-400 mt-1 font-semibold leading-relaxed">
                                        * Ejemplo: Si es arroz y consume 250g, ingresa `0.250`. Si es un táper descartable, ingresa `1`.
                                    </p>
                                </div>
                                <div className="flex gap-2 pt-3">
                                    <button
                                        type="button"
                                        onClick={() => { setShowAddIngredient(false); setIngredienteInsumoId(''); setIngredienteCantidad(''); }}
                                        className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-500 rounded-xl font-bold transition-all text-xs"
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        type="submit"
                                        className="flex-1 py-3 bg-pocholo-red hover:bg-red-700 text-white rounded-xl font-bold transition-all text-xs shadow-md"
                                    >
                                        Añadir Ingrediente
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

        </div>
    );
}
