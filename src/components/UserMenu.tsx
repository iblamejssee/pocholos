'use client';

import { useAuth } from '@/contexts/AuthContext';
import { ROLE_NAMES } from '@/lib/roles';
import { motion, AnimatePresence } from 'framer-motion';
import { User, LogOut, ChevronDown, RotateCcw, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { resetearSistema } from '@/lib/reset';
import toast from 'react-hot-toast';

export default function UserMenu() {
    const { user, logout } = useAuth();
    const [isOpen, setIsOpen] = useState(false);
    const [showResetConfirm, setShowResetConfirm] = useState(false);
    const [resetting, setResetting] = useState(false);

    const handleReset = async () => {
        setResetting(true);
        const resultado = await resetearSistema();
        if (resultado.success) {
            toast.success(resultado.message, { duration: 4000 });
            setShowResetConfirm(false);
            setIsOpen(false);
            window.location.reload();
        } else {
            toast.error(resultado.message, { duration: 5000 });
        }
        setResetting(false);
    };

    if (!user) return null;

    return (
        <div className="relative">
            {/* User Button */}
            <motion.button
                onClick={() => setIsOpen(!isOpen)}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="flex items-center gap-3 bg-white/90 backdrop-blur-sm rounded-2xl px-4 py-3 shadow-lg hover:shadow-xl transition-all border border-pocholo-yellow/20"
            >
                <div className="w-10 h-10 bg-gradient-to-br from-pocholo-yellow to-pocholo-red rounded-full flex items-center justify-center">
                    <User size={20} className="text-white" />
                </div>
                <div className="text-left hidden sm:block">
                    <p className="text-sm font-bold text-pocholo-brown">{user.nombre}</p>
                    <p className="text-xs text-pocholo-brown/60">{ROLE_NAMES[user.rol]}</p>
                </div>
                <ChevronDown
                    size={16}
                    className={`text-pocholo-brown transition-transform ${isOpen ? 'rotate-180' : ''}`}
                />
            </motion.button>

            {/* Dropdown Menu */}
            <AnimatePresence>
                {isOpen && (
                    <>
                        {/* Backdrop */}
                        <div
                            className="fixed inset-0 z-40"
                            onClick={() => setIsOpen(false)}
                        />

                        {/* Menu */}
                        <motion.div
                            initial={{ opacity: 0, y: -10, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: -10, scale: 0.95 }}
                            transition={{ duration: 0.15 }}
                            className="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-2xl border border-pocholo-yellow/20 overflow-hidden z-50"
                        >
                            {/* User Info */}
                            <div className="p-4 bg-gradient-to-br from-pocholo-cream to-white border-b border-pocholo-yellow/20">
                                <div className="flex items-center gap-3 mb-2">
                                    <div className="w-12 h-12 bg-gradient-to-br from-pocholo-yellow to-pocholo-red rounded-full flex items-center justify-center">
                                        <User size={24} className="text-white" />
                                    </div>
                                    <div>
                                        <p className="font-bold text-pocholo-brown">{user.nombre}</p>
                                        <p className="text-sm text-pocholo-brown/60">{ROLE_NAMES[user.rol]}</p>
                                    </div>
                                </div>
                                <p className="text-xs text-pocholo-brown/50 truncate">{user.email}</p>
                            </div>

                            {/* Restablecer Button - solo admin y cajera */}
                            {(user.rol === 'administrador' || user.rol === 'cajera') && (
                                <>
                                    {!showResetConfirm ? (
                                        <button
                                            onClick={() => setShowResetConfirm(true)}
                                            className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-orange-50 transition-colors text-orange-600 font-semibold border-b border-gray-100"
                                        >
                                            <RotateCcw size={18} />
                                            <span>Restablecer Sistema</span>
                                        </button>
                                    ) : (
                                        <div className="p-3 bg-red-50 border-b border-red-100">
                                            <p className="text-xs text-red-600 mb-2 font-medium">¿Borrar TODAS las ventas y el inventario de hoy?</p>
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={handleReset}
                                                    disabled={resetting}
                                                    className="flex-1 bg-red-500 text-white text-xs py-2 rounded-lg hover:bg-red-600 disabled:opacity-50 flex items-center justify-center gap-1"
                                                >
                                                    {resetting ? <Loader2 size={14} className="animate-spin" /> : <RotateCcw size={14} />}
                                                    {resetting ? 'Borrando...' : 'Sí, borrar'}
                                                </button>
                                                <button
                                                    onClick={() => setShowResetConfirm(false)}
                                                    className="flex-1 bg-gray-200 text-gray-700 text-xs py-2 rounded-lg hover:bg-gray-300"
                                                >
                                                    Cancelar
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </>
                            )}

                            {/* Logout Button */}
                            <button
                                onClick={() => {
                                    setIsOpen(false);
                                    logout();
                                }}
                                className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-red-50 transition-colors text-red-600 font-semibold"
                            >
                                <LogOut size={18} />
                                <span>Cerrar Sesión</span>
                            </button>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </div>
    );
}
