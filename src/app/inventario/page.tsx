'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Boxes, AlertTriangle, CheckCircle, Trash2, Send, Loader2, MessageSquare, Save, Edit2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import ProtectedRoute from '@/components/ProtectedRoute';

interface NotaInventario {
    id: string;
    mensaje: string;
    prioridad: 'baja' | 'normal' | 'urgente';
    estado: 'pendiente' | 'completado';
    created_at: string;
    created_by: string;
}

interface ProductoStock {
    id: string;
    nombre: string;
    categoria: string;
    cantidad: number;
    minimo: number;
    unidad: string;
}

function InventarioContent() {
    const [notas, setNotas] = useState<NotaInventario[]>([]);
    const [nuevaNota, setNuevaNota] = useState('');
    const [prioridad, setPrioridad] = useState<'baja' | 'normal' | 'urgente'>('normal');
    const [loading, setLoading] = useState(true);
    const [enviando, setEnviando] = useState(false);
    const [guardando, setGuardando] = useState(false);

    // Estado para productos editables
    const [productos, setProductos] = useState<ProductoStock[]>([
        { id: '1', nombre: 'Pollos enteros', categoria: 'Carnes', cantidad: 0, minimo: 10, unidad: 'unidades' },
        { id: '2', nombre: 'Papas', categoria: 'Verduras', cantidad: 0, minimo: 20, unidad: 'kg' },
        { id: '3', nombre: 'Lechuga', categoria: 'Verduras', cantidad: 0, minimo: 5, unidad: 'unidades' },
        { id: '4', nombre: 'Tomate', categoria: 'Verduras', cantidad: 0, minimo: 3, unidad: 'kg' },
        { id: '5', nombre: 'Aceite', categoria: 'Insumos', cantidad: 0, minimo: 5, unidad: 'litros' },
        { id: '6', nombre: 'Ají amarillo', categoria: 'Condimentos', cantidad: 0, minimo: 2, unidad: 'kg' },
        { id: '7', nombre: 'Sal', categoria: 'Condimentos', cantidad: 0, minimo: 3, unidad: 'kg' },
        { id: '8', nombre: 'Mayonesa', categoria: 'Salsas', cantidad: 0, minimo: 4, unidad: 'bolsas' },
        { id: '9', nombre: 'Mostaza', categoria: 'Salsas', cantidad: 0, minimo: 2, unidad: 'bolsas' },
        { id: '10', nombre: 'Ketchup', categoria: 'Salsas', cantidad: 0, minimo: 2, unidad: 'bolsas' },
        { id: '11', nombre: 'Inca Kola 1L', categoria: 'Bebidas', cantidad: 0, minimo: 24, unidad: 'botellas' },
        { id: '12', nombre: 'Coca Cola 1L', categoria: 'Bebidas', cantidad: 0, minimo: 24, unidad: 'botellas' },
        { id: '13', nombre: 'Inca Kola Personal', categoria: 'Bebidas', cantidad: 0, minimo: 48, unidad: 'botellas' },
        { id: '14', nombre: 'Coca Cola Personal', categoria: 'Bebidas', cantidad: 0, minimo: 48, unidad: 'botellas' },
        { id: '15', nombre: 'Chicha Morada', categoria: 'Bebidas', cantidad: 0, minimo: 10, unidad: 'litros' },
        { id: '16', nombre: 'Bolsas para llevar', categoria: 'Empaques', cantidad: 0, minimo: 100, unidad: 'unidades' },
        { id: '17', nombre: 'Contenedores', categoria: 'Empaques', cantidad: 0, minimo: 50, unidad: 'unidades' },
        { id: '18', nombre: 'Servilletas', categoria: 'Empaques', cantidad: 0, minimo: 200, unidad: 'unidades' },
    ]);

    useEffect(() => {
        cargarDatos();
    }, []);

    const cargarDatos = async () => {
        try {
            // Cargar notas
            const { data: notasData } = await supabase
                .from('notas_inventario')
                .select('*')
                .order('created_at', { ascending: false });

            if (notasData) setNotas(notasData);

            // Cargar cantidades guardadas
            const { data: stockData } = await supabase
                .from('stock_productos')
                .select('*');

            if (stockData && stockData.length > 0) {
                setProductos(prev => prev.map(p => {
                    const saved = stockData.find((s: any) => s.producto_id === p.id);
                    return saved ? { ...p, cantidad: saved.cantidad } : p;
                }));
            }
        } catch (error) {
            console.log('Cargando con datos locales');
        } finally {
            setLoading(false);
        }
    };

    const actualizarCantidad = (id: string, cantidad: number) => {
        setProductos(prev => prev.map(p =>
            p.id === id ? { ...p, cantidad: Math.max(0, cantidad) } : p
        ));
    };

    const guardarInventario = async () => {
        setGuardando(true);
        try {
            // Intentar guardar en Supabase
            for (const producto of productos) {
                await supabase
                    .from('stock_productos')
                    .upsert({
                        producto_id: producto.id,
                        nombre: producto.nombre,
                        cantidad: producto.cantidad,
                        updated_at: new Date().toISOString()
                    }, { onConflict: 'producto_id' });
            }
            toast.success('Inventario guardado correctamente');
        } catch (error) {
            // Guardar localmente si falla
            localStorage.setItem('inventario_productos', JSON.stringify(productos));
            toast.success('Inventario guardado localmente');
        } finally {
            setGuardando(false);
        }
    };

    const agregarNota = async () => {
        if (!nuevaNota.trim()) {
            toast.error('Escribe una nota');
            return;
        }

        setEnviando(true);
        try {
            const { error } = await supabase
                .from('notas_inventario')
                .insert({
                    mensaje: nuevaNota,
                    prioridad,
                    estado: 'pendiente',
                    created_by: 'Cajera'
                });

            if (error) throw error;
            toast.success('Nota enviada');
            setNuevaNota('');
            cargarDatos();
        } catch (error) {
            const notaLocal: NotaInventario = {
                id: Date.now().toString(),
                mensaje: nuevaNota,
                prioridad,
                estado: 'pendiente',
                created_at: new Date().toISOString(),
                created_by: 'Cajera'
            };
            setNotas(prev => [notaLocal, ...prev]);
            toast.success('Nota guardada');
            setNuevaNota('');
        } finally {
            setEnviando(false);
        }
    };

    const marcarCompletado = async (id: string) => {
        setNotas(prev => prev.map(n => n.id === id ? { ...n, estado: 'completado' as const } : n));
        toast.success('Completado');
    };

    const eliminarNota = async (id: string) => {
        try {
            // Intentar eliminar de Supabase
            await supabase.from('notas_inventario').delete().eq('id', id);
        } catch (error) {
            console.log('Error eliminando de DB');
        }
        // Siempre eliminar del estado local
        setNotas(prev => prev.filter(n => n.id !== id));
        toast.success('Nota eliminada');
    };

    const getPrioridadColor = (p: string) => {
        switch (p) {
            case 'urgente': return 'bg-red-100 text-red-700 border-red-300';
            case 'normal': return 'bg-amber-100 text-amber-700 border-amber-300';
            case 'baja': return 'bg-green-100 text-green-700 border-green-300';
            default: return 'bg-gray-100 text-gray-700 border-gray-300';
        }
    };

    const getStockStatus = (cantidad: number, minimo: number) => {
        if (cantidad === 0) return { color: 'bg-red-100 border-red-300', text: 'Sin stock', textColor: 'text-red-600' };
        if (cantidad < minimo) return { color: 'bg-amber-100 border-amber-300', text: 'Bajo', textColor: 'text-amber-600' };
        return { color: 'bg-green-100 border-green-300', text: 'OK', textColor: 'text-green-600' };
    };

    const categorias = [...new Set(productos.map(p => p.categoria))];
    const productosConAlerta = productos.filter(p => p.cantidad < p.minimo);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Loader2 className="animate-spin text-pocholo-red" size={48} />
            </div>
        );
    }

    return (
        <div className="min-h-screen p-6 lg:p-8">
            {/* Header */}
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-6"
            >
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="w-14 h-14 bg-pocholo-red/10 rounded-2xl flex items-center justify-center">
                            <Boxes className="text-pocholo-red" size={28} />
                        </div>
                        <div>
                            <h1 className="text-3xl font-bold text-pocholo-brown">Inventario</h1>
                            <p className="text-pocholo-brown/60">Control de productos y notas</p>
                        </div>
                    </div>
                    <button
                        onClick={guardarInventario}
                        disabled={guardando}
                        className="flex items-center gap-2 px-6 py-3 bg-pocholo-red text-white rounded-xl font-bold hover:bg-red-700 transition-colors shadow-lg disabled:opacity-50"
                    >
                        {guardando ? <Loader2 size={20} className="animate-spin" /> : <Save size={20} />}
                        Guardar Todo
                    </button>
                </div>
            </motion.div>

            {/* Alerta de productos bajos */}
            {productosConAlerta.length > 0 && (
                <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-6 p-4 bg-red-50 border-2 border-red-200 rounded-xl"
                >
                    <div className="flex items-center gap-2 mb-2">
                        <AlertTriangle className="text-red-500" size={20} />
                        <span className="font-bold text-red-700">¡Atención! {productosConAlerta.length} productos con stock bajo</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {productosConAlerta.map(p => (
                            <span key={p.id} className="px-2 py-1 bg-red-100 text-red-700 rounded-lg text-sm">
                                {p.nombre}: {p.cantidad} {p.unidad}
                            </span>
                        ))}
                    </div>
                </motion.div>
            )}

            <div className="grid lg:grid-cols-3 gap-6">
                {/* Panel de Notas */}
                <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="bg-white rounded-2xl shadow-lg p-5"
                >
                    <h2 className="text-lg font-bold text-pocholo-brown mb-3 flex items-center gap-2">
                        <MessageSquare size={18} className="text-pocholo-red" />
                        Notas para la Dueña
                    </h2>

                    <div className="space-y-3 mb-4">
                        <textarea
                            value={nuevaNota}
                            onChange={(e) => setNuevaNota(e.target.value)}
                            placeholder="Ej: Comprar más papas..."
                            className="w-full p-3 border-2 border-pocholo-brown/20 rounded-xl text-pocholo-brown placeholder:text-pocholo-brown/40 focus:outline-none focus:border-pocholo-red resize-none text-sm"
                            rows={2}
                        />
                        <div className="flex gap-2">
                            <select
                                value={prioridad}
                                onChange={(e) => setPrioridad(e.target.value as any)}
                                className="flex-1 p-2 border-2 border-pocholo-brown/20 rounded-xl text-pocholo-brown focus:outline-none text-sm"
                            >
                                <option value="baja">🟢 Baja</option>
                                <option value="normal">🟡 Normal</option>
                                <option value="urgente">🔴 Urgente</option>
                            </select>
                            <button
                                onClick={agregarNota}
                                disabled={enviando}
                                className="px-4 py-2 bg-pocholo-red text-white rounded-xl font-semibold hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center gap-2"
                            >
                                {enviando ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                            </button>
                        </div>
                    </div>

                    <div className="space-y-2 max-h-64 overflow-y-auto">
                        <AnimatePresence>
                            {notas.length === 0 ? (
                                <p className="text-center text-pocholo-brown/50 py-4 text-sm">No hay notas pendientes</p>
                            ) : (
                                notas.map((nota) => (
                                    <motion.div
                                        key={nota.id}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, x: -50 }}
                                        className={`p-3 rounded-xl border-2 ${nota.estado === 'completado' ? 'bg-gray-50 opacity-60' : getPrioridadColor(nota.prioridad)}`}
                                    >
                                        <p className={`text-sm ${nota.estado === 'completado' ? 'line-through' : ''}`}>
                                            {nota.mensaje}
                                        </p>
                                        <div className="flex items-center justify-between mt-2">
                                            <span className="text-xs opacity-60">
                                                {new Date(nota.created_at).toLocaleDateString()}
                                            </span>
                                            <div className="flex gap-2">
                                                {nota.estado !== 'completado' && (
                                                    <button
                                                        onClick={() => marcarCompletado(nota.id)}
                                                        className="px-2 py-1 bg-green-500 text-white rounded-lg text-xs font-semibold hover:bg-green-600 flex items-center gap-1"
                                                    >
                                                        <CheckCircle size={12} /> Hecho
                                                    </button>
                                                )}
                                                <button
                                                    onClick={() => eliminarNota(nota.id)}
                                                    className="px-2 py-1 bg-red-500 text-white rounded-lg text-xs font-semibold hover:bg-red-600 flex items-center gap-1"
                                                >
                                                    <Trash2 size={12} /> Eliminar
                                                </button>
                                            </div>
                                        </div>
                                    </motion.div>
                                ))
                            )}
                        </AnimatePresence>
                    </div>
                </motion.div>

                {/* Lista de Productos Editable */}
                <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="lg:col-span-2 bg-white rounded-2xl shadow-lg p-5"
                >
                    <h2 className="text-lg font-bold text-pocholo-brown mb-4 flex items-center gap-2">
                        <Edit2 size={18} className="text-amber-500" />
                        Productos del Negocio
                        <span className="text-sm font-normal text-pocholo-brown/50 ml-2">
                            (Click para editar cantidades)
                        </span>
                    </h2>

                    <div className="space-y-5 max-h-[600px] overflow-y-auto pr-2">
                        {categorias.map((categoria) => (
                            <div key={categoria}>
                                <h3 className="font-bold text-pocholo-brown mb-2 flex items-center gap-2 sticky top-0 bg-white py-1">
                                    <span className="w-2 h-2 bg-pocholo-red rounded-full"></span>
                                    {categoria}
                                </h3>
                                <div className="grid md:grid-cols-2 gap-2">
                                    {productos
                                        .filter(p => p.categoria === categoria)
                                        .map((producto) => {
                                            const status = getStockStatus(producto.cantidad, producto.minimo);
                                            return (
                                                <div
                                                    key={producto.id}
                                                    className={`flex items-center justify-between p-3 rounded-xl border-2 ${status.color}`}
                                                >
                                                    <div className="flex-1">
                                                        <p className="font-medium text-pocholo-brown text-sm">{producto.nombre}</p>
                                                        <p className="text-xs text-pocholo-brown/50">Mín: {producto.minimo} {producto.unidad}</p>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <input
                                                            type="number"
                                                            value={producto.cantidad}
                                                            onChange={(e) => actualizarCantidad(producto.id, parseInt(e.target.value) || 0)}
                                                            className="w-16 p-2 text-center border-2 border-pocholo-brown/20 rounded-lg text-pocholo-brown font-bold focus:outline-none focus:border-pocholo-red"
                                                            min="0"
                                                        />
                                                        <span className={`text-xs font-bold px-2 py-1 rounded ${status.textColor} bg-white`}>
                                                            {status.text}
                                                        </span>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                </div>
                            </div>
                        ))}
                    </div>
                </motion.div>
            </div>
        </div>
    );
}

export default function InventarioPage() {
    return (
        <ProtectedRoute requiredPermission="inventario">
            <InventarioContent />
        </ProtectedRoute>
    );
}
