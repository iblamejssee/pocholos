'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, ShoppingCart, BarChart, Lock, ClipboardList, ChefHat, Package, Users, Boxes, LucideIcon } from 'lucide-react';
import { motion } from 'framer-motion';
import Image from 'next/image';
import { useAuth } from '@/contexts/AuthContext';
import { hasPermission } from '@/lib/roles';

interface MenuItem {
    icon: LucideIcon;
    label: string;
    href: string;
    permission: string;
}

interface MenuSection {
    title: string;
    items: MenuItem[];
}

// Menú organizado por secciones
const menuSections: MenuSection[] = [
    {
        title: 'Principal',
        items: [
            { icon: Home, label: 'Inicio', href: '/', permission: 'dashboard' },
        ]
    },
    {
        title: 'Operaciones',
        items: [
            { icon: ClipboardList, label: 'Apertura de Día', href: '/apertura', permission: 'apertura' },
            { icon: ShoppingCart, label: 'Punto de Venta', href: '/pos', permission: 'pos' },
            { icon: Users, label: 'Gestión de Mesas', href: '/mesas', permission: 'mesas' },
            { icon: ChefHat, label: 'Cocina', href: '/cocina', permission: 'cocina' },
        ]
    },
    {
        title: 'Gestión',
        items: [
            { icon: Package, label: 'Ventas del Día', href: '/ventas', permission: 'ventas' },
            { icon: Boxes, label: 'Inventario', href: '/inventario', permission: 'inventario' },
        ]
    },
    {
        title: 'Administración',
        items: [
            { icon: BarChart, label: 'Reportes', href: '/reportes', permission: 'reportes' },
            { icon: Lock, label: 'Cierre de Caja', href: '/cierre', permission: 'cierre' },
        ]
    }
];

export default function Sidebar() {
    const pathname = usePathname();
    const { user, loading } = useAuth();

    // Esperar a que termine de cargar el usuario
    if (loading) {
        return (
            <aside className="fixed left-0 top-0 h-screen w-64 glass-red z-50 flex items-center justify-center">
                <div className="text-white text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-white mx-auto mb-2"></div>
                    <p className="text-sm">Cargando menú...</p>
                </div>
            </aside>
        );
    }

    // Si no hay usuario después de cargar, no mostrar nada
    if (!user) {
        return null;
    }

    // Filtrar secciones según el rol del usuario
    const filteredSections = menuSections.map(section => ({
        ...section,
        items: section.items.filter(item => hasPermission(user.rol, item.permission))
    })).filter(section => section.items.length > 0);

    return (
        <aside className="fixed left-0 top-0 h-screen w-64 glass-red z-50 overflow-hidden flex flex-col">
            {/* Efecto de brillo animado en el fondo */}
            <div className="absolute inset-0 opacity-20">
                <div className="absolute top-0 left-0 w-full h-full bg-linear-to-br from-white/20 via-transparent to-transparent shine-effect" />
            </div>

            {/* Logo/Header */}
            <motion.div
                initial={{ opacity: 0, y: -30, scale: 0.8 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{
                    duration: 0.6,
                    type: "spring",
                    stiffness: 100,
                }}
                className="relative p-3 border-b-2 border-white/20"
            >
                <div className="relative overflow-hidden">
                    <div className="absolute inset-0 bg-pocholo-yellow/20 blur-2xl rounded-full" />
                    <div className="relative">
                        <motion.div
                            whileHover={{ scale: 1.05 }}
                            transition={{ duration: 0.3 }}
                            className="flex items-center justify-center"
                        >
                            <div className="relative w-36 h-36">
                                <Image
                                    src="/images/logo-pocholos-icon.png"
                                    alt="Pocholo's Chicken"
                                    fill
                                    className="object-contain drop-shadow-[0_0_15px_rgba(242,201,76,0.5)]"
                                    priority
                                />
                            </div>
                        </motion.div>
                        <motion.p
                            className="text-pocholo-yellow text-xs text-center font-semibold -mt-2"
                        >
                            Sistema POS
                        </motion.p>
                    </div>
                </div>
            </motion.div>

            {/* Navigation Menu con secciones */}
            <nav className="flex-1 p-3 overflow-y-auto">
                {filteredSections.map((section, sectionIndex) => (
                    <motion.div
                        key={section.title}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: sectionIndex * 0.1 }}
                        className="mb-4"
                    >
                        {/* Título de sección */}
                        <p className="text-white/50 text-xs font-semibold uppercase tracking-wider px-3 mb-2">
                            {section.title}
                        </p>

                        {/* Items de la sección */}
                        <div className="space-y-1">
                            {section.items.map((item) => {
                                const Icon = item.icon;
                                const isActive = pathname === item.href;

                                return (
                                    <Link
                                        key={item.href}
                                        href={item.href}
                                        className="block"
                                    >
                                        <motion.div
                                            whileHover={{ x: 4, scale: 1.02 }}
                                            whileTap={{ scale: 0.98 }}
                                            className={`
                                                flex items-center gap-3 px-3 py-2.5 rounded-xl
                                                transition-all duration-200 relative
                                                ${isActive
                                                    ? 'bg-pocholo-yellow text-pocholo-brown shadow-lg'
                                                    : 'text-white/80 hover:bg-white/10 hover:text-white'
                                                }
                                            `}
                                        >
                                            <Icon size={18} className={isActive ? 'text-pocholo-brown' : ''} />
                                            <span className="font-medium text-sm">
                                                {item.label}
                                            </span>

                                            {/* Indicador de activo */}
                                            {isActive && (
                                                <motion.div
                                                    layoutId="activeIndicator"
                                                    className="absolute right-2 w-1.5 h-1.5 bg-pocholo-red rounded-full"
                                                />
                                            )}
                                        </motion.div>
                                    </Link>
                                );
                            })}
                        </div>
                    </motion.div>
                ))}
            </nav>

            {/* Footer con slogan */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="p-3 border-t-2 border-white/20 relative"
            >
                <div className="absolute inset-0 bg-linear-to-t from-black/20 to-transparent" />
                <p className="text-pocholo-yellow/90 text-xs text-center font-medium relative z-10 italic">
                    &quot;La Pasión Hecha Sazón&quot;
                </p>
            </motion.div>

            {/* Efecto de borde derecho brillante */}
            <div className="absolute top-0 right-0 w-1 h-full bg-linear-to-b from-pocholo-yellow/50 via-white/30 to-pocholo-yellow/50" />
        </aside>
    );
}
