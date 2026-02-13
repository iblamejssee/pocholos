'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import type { Producto } from '@/lib/database.types';
import ProtectedRoute from '@/components/ProtectedRoute';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Check, X, Package, Pencil } from 'lucide-react';
import toast from 'react-hot-toast';

type TipoProducto = 'pollo' | 'bebida' | 'complemento';

const TIPO_LABELS: Record<TipoProducto, string> = {
    pollo: 'Pollos y Platos',
    bebida: 'Bebidas',
    complemento: 'Complementos',
};

function ConfiguracionContent() {
    const [productos, setProductos] = useState<Producto[]>([]);
    const [loading, setLoading] = useState(true);
    const [busqueda, setBusqueda] = useState('');
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editPrecio, setEditPrecio] = useState('');
    const [saving, setSaving] = useState(false);
    const [filtroTipo, setFiltroTipo] = useState<TipoProducto | 'todos'>('todos');

    const cargarProductos = async () => {
        try {
            const { data, error } = await supabase
                .from('productos')
                .select('*')
                .order('tipo', { ascending: true })
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

    useEffect(() => {
        cargarProductos();
    }, []);

    const iniciarEdicion = (producto: Producto) => {
        setEditingId(producto.id);
        setEditPrecio(producto.precio.toString());
    };

    const cancelarEdicion = () => {
        setEditingId(null);
        setEditPrecio('');
    };

    const guardarPrecio = async (producto: Producto) => {
        const nuevoPrecio = parseFloat(editPrecio);
        if (isNaN(nuevoPrecio) || nuevoPrecio < 0) {
            toast.error('Ingresa un precio válido');
            return;
        }

        if (nuevoPrecio === producto.precio) {
            cancelarEdicion();
            return;
        }

        setSaving(true);
        try {
            const { data, error } = await supabase
                .from('productos')
                .update({ precio: nuevoPrecio })
                .eq('id', producto.id)
                .select();

            if (error) throw error;

            // Verificar que realmente se actualizó (RLS puede bloquear silenciosamente)
            if (!data || data.length === 0) {
                toast.error('No se pudo actualizar. Verifica permisos en Supabase.', { duration: 5000 });
                return;
            }

            setProductos(prev => prev.map(p =>
                p.id === producto.id ? { ...p, precio: nuevoPrecio } : p
            ));

            toast.success(
                `${producto.nombre}: S/ ${producto.precio.toFixed(2)} → S/ ${nuevoPrecio.toFixed(2)}`,
                { duration: 3000 }
            );
            cancelarEdicion();
        } catch (error) {
            console.error('Error al actualizar precio:', error);
            toast.error('Error al guardar el precio');
        } finally {
            setSaving(false);
        }
    };

    // Filtrar productos
    const productosFiltrados = productos.filter(p => {
        const matchBusqueda = p.nombre.toLowerCase().includes(busqueda.toLowerCase());
        const matchTipo = filtroTipo === 'todos' || p.tipo === filtroTipo;
        return matchBusqueda && matchTipo;
    });

    // Agrupar por tipo
    const productosPorTipo = productosFiltrados.reduce((acc, p) => {
        const tipo = p.tipo as TipoProducto;
        if (!acc[tipo]) acc[tipo] = [];
        acc[tipo].push(p);
        return acc;
    }, {} as Record<TipoProducto, Producto[]>);

    const tiposOrdenados: TipoProducto[] = ['pollo', 'bebida', 'complemento'];
    const conteos = {
        todos: productos.length,
        pollo: productos.filter(p => p.tipo === 'pollo').length,
        bebida: productos.filter(p => p.tipo === 'bebida').length,
        complemento: productos.filter(p => p.tipo === 'complemento').length,
    };

    return (
        <div className="min-h-screen p-3 sm:p-6 lg:p-8 max-w-5xl mx-auto">
            {/* Header */}
            <div className="mb-8">
                <h1 className="text-xl sm:text-2xl font-bold text-slate-800">
                    Configuración de Precios
                </h1>
                <p className="text-sm text-slate-500 mt-1">
                    Toca el precio de un producto para editarlo
                </p>
            </div>

            {/* Filtros */}
            <div className="flex flex-col sm:flex-row gap-3 mb-6">
                <div className="relative flex-1">
                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Buscar producto..."
                        value={busqueda}
                        onChange={(e) => setBusqueda(e.target.value)}
                        className="w-full pl-9 pr-4 py-2.5 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-300 focus:border-slate-300 transition-all"
                    />
                </div>
                <div className="flex gap-1 bg-slate-100 p-1 rounded-lg">
                    {(['todos', ...tiposOrdenados] as const).map(tipo => (
                        <button
                            key={tipo}
                            onClick={() => setFiltroTipo(tipo)}
                            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${filtroTipo === tipo
                                ? 'bg-white text-slate-800 shadow-sm'
                                : 'text-slate-500 hover:text-slate-700'
                                }`}
                        >
                            {tipo === 'todos' ? 'Todos' : TIPO_LABELS[tipo]}
                            <span className="ml-1 text-slate-400">{conteos[tipo]}</span>
                        </button>
                    ))}
                </div>
            </div>

            {loading ? (
                <div className="flex items-center justify-center h-60">
                    <div className="w-8 h-8 border-4 border-slate-300 border-t-slate-600 rounded-full animate-spin" />
                </div>
            ) : productosFiltrados.length === 0 ? (
                <div className="text-center py-16 text-slate-400">
                    <Package size={40} className="mx-auto mb-3 opacity-50" />
                    <p className="text-sm">No se encontraron productos</p>
                </div>
            ) : (
                <div className="space-y-8">
                    {tiposOrdenados.map(tipo => {
                        const prods = productosPorTipo[tipo];
                        if (!prods || prods.length === 0) return null;

                        return (
                            <motion.div
                                key={tipo}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                            >
                                {/* Encabezado de sección */}
                                <div className="flex items-center gap-3 mb-3">
                                    <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                                        {TIPO_LABELS[tipo]}
                                    </h2>
                                    <div className="flex-1 h-px bg-slate-200" />
                                    <span className="text-xs text-slate-400">{prods.length}</span>
                                </div>

                                {/* Tabla */}
                                <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                                    <table className="w-full">
                                        <thead>
                                            <tr className="border-b border-slate-100">
                                                <th className="text-left text-[11px] font-semibold text-slate-400 uppercase tracking-wider px-4 py-3">
                                                    Producto
                                                </th>
                                                <th className="text-right text-[11px] font-semibold text-slate-400 uppercase tracking-wider px-4 py-3 w-48">
                                                    Precio
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-50">
                                            {prods.map((producto, i) => (
                                                <tr
                                                    key={producto.id}
                                                    className={`group transition-colors ${editingId === producto.id ? 'bg-slate-50' : 'hover:bg-slate-50/50'
                                                        }`}
                                                >
                                                    <td className="px-4 py-3">
                                                        <div className="flex items-center gap-2">
                                                            <span className="font-medium text-sm text-slate-800">
                                                                {producto.nombre}
                                                            </span>
                                                            {!producto.activo && (
                                                                <span className="text-[10px] bg-red-50 text-red-500 font-medium px-1.5 py-0.5 rounded">
                                                                    Inactivo
                                                                </span>
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <AnimatePresence mode="wait">
                                                            {editingId === producto.id ? (
                                                                <motion.div
                                                                    key="edit"
                                                                    initial={{ opacity: 0 }}
                                                                    animate={{ opacity: 1 }}
                                                                    exit={{ opacity: 0 }}
                                                                    className="flex items-center justify-end gap-2"
                                                                >
                                                                    <span className="text-xs text-slate-400 font-medium">S/</span>
                                                                    <input
                                                                        type="number"
                                                                        step="0.50"
                                                                        min="0"
                                                                        value={editPrecio}
                                                                        onChange={(e) => setEditPrecio(e.target.value)}
                                                                        onKeyDown={(e) => {
                                                                            if (e.key === 'Enter') guardarPrecio(producto);
                                                                            if (e.key === 'Escape') cancelarEdicion();
                                                                        }}
                                                                        autoFocus
                                                                        className="w-20 px-2 py-1.5 text-right font-semibold text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-pocholo-red/30 focus:border-pocholo-red"
                                                                    />
                                                                    <button
                                                                        onClick={() => guardarPrecio(producto)}
                                                                        disabled={saving}
                                                                        className="p-1.5 bg-slate-800 text-white rounded-md hover:bg-slate-700 transition-colors disabled:opacity-50"
                                                                        title="Guardar"
                                                                    >
                                                                        {saving ? (
                                                                            <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                                                        ) : (
                                                                            <Check size={14} />
                                                                        )}
                                                                    </button>
                                                                    <button
                                                                        onClick={cancelarEdicion}
                                                                        className="p-1.5 bg-slate-100 text-slate-500 rounded-md hover:bg-slate-200 transition-colors"
                                                                        title="Cancelar"
                                                                    >
                                                                        <X size={14} />
                                                                    </button>
                                                                </motion.div>
                                                            ) : (
                                                                <motion.button
                                                                    key="display"
                                                                    initial={{ opacity: 0 }}
                                                                    animate={{ opacity: 1 }}
                                                                    exit={{ opacity: 0 }}
                                                                    onClick={() => iniciarEdicion(producto)}
                                                                    className="flex items-center justify-end gap-2 w-full group/btn"
                                                                >
                                                                    <span className="font-semibold text-sm text-slate-800">
                                                                        S/ {producto.precio.toFixed(2)}
                                                                    </span>
                                                                    <Pencil size={13} className="text-slate-300 opacity-0 group-hover:opacity-100 group-hover/btn:opacity-100 transition-opacity" />
                                                                </motion.button>
                                                            )}
                                                        </AnimatePresence>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </motion.div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

export default function ConfiguracionPage() {
    return (
        <ProtectedRoute requiredPermission="configuracion">
            <ConfiguracionContent />
        </ProtectedRoute>
    );
}
