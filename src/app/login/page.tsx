'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { motion } from 'framer-motion';
import { Mail, Lock, Loader2, ArrowRight } from 'lucide-react';

export default function LoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const { login } = useAuth();
    const router = useRouter();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        const success = await login(email, password);

        if (success) {
            // Usar replace para evitar que el usuario vuelva al login con el botón atrás
            router.replace('/');
        }

        setLoading(false);
    };

    return (
        <div className="min-h-screen flex relative overflow-hidden">
            {/* Fondo con efectos 3D sutiles */}
            <div className="absolute inset-0 bg-gradient-to-br from-amber-50 via-orange-50 to-red-50">
                {/* Formas 3D flotantes */}
                <motion.div
                    animate={{
                        y: [0, -20, 0],
                        rotateZ: [0, 5, 0]
                    }}
                    transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
                    className="absolute top-20 left-20 w-32 h-32 bg-gradient-to-br from-pocholo-yellow/30 to-orange-300/20 rounded-3xl blur-sm"
                    style={{ transform: 'perspective(500px) rotateX(10deg) rotateY(-10deg)' }}
                />
                <motion.div
                    animate={{
                        y: [0, 15, 0],
                        rotateZ: [0, -3, 0]
                    }}
                    transition={{ duration: 8, repeat: Infinity, ease: "easeInOut", delay: 1 }}
                    className="absolute bottom-32 left-1/4 w-24 h-24 bg-gradient-to-br from-red-200/40 to-pocholo-red/20 rounded-2xl blur-sm"
                    style={{ transform: 'perspective(500px) rotateX(-5deg) rotateY(15deg)' }}
                />
                <motion.div
                    animate={{
                        y: [0, -25, 0],
                        x: [0, 10, 0]
                    }}
                    transition={{ duration: 7, repeat: Infinity, ease: "easeInOut", delay: 2 }}
                    className="absolute top-1/3 left-10 w-16 h-16 bg-gradient-to-br from-amber-300/30 to-yellow-400/20 rounded-xl blur-sm"
                />
            </div>

            {/* Lado Izquierdo - Formulario */}
            <div className="w-full lg:w-1/2 flex items-center justify-center p-8 relative z-10">
                <motion.div
                    initial={{ opacity: 0, x: -30 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.6 }}
                    className="w-full max-w-md"
                >
                    {/* Card con efecto glassmorphism y 3D */}
                    <motion.div
                        whileHover={{
                            scale: 1.01,
                            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.15)'
                        }}
                        className="bg-white/70 backdrop-blur-xl rounded-3xl p-10 shadow-2xl border border-white/50"
                        style={{
                            boxShadow: '0 20px 40px -15px rgba(200, 16, 46, 0.15), 0 8px 16px -8px rgba(0,0,0,0.1)'
                        }}
                    >
                        {/* Header */}
                        <div className="mb-10">
                            <motion.h1
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.2 }}
                                className="text-5xl font-black text-pocholo-brown mb-2"
                                style={{
                                    textShadow: '2px 2px 0 rgba(200,16,46,0.1)'
                                }}
                            >
                                Bienvenidos
                            </motion.h1>
                            <motion.div
                                initial={{ scaleX: 0 }}
                                animate={{ scaleX: 1 }}
                                transition={{ delay: 0.4, duration: 0.5 }}
                                className="h-1 w-24 bg-gradient-to-r from-pocholo-red to-pocholo-yellow rounded-full mb-3"
                            />
                            <p className="text-pocholo-brown/60">
                                Sistema de Gestión POS
                            </p>
                        </div>

                        {/* Formulario */}
                        <form onSubmit={handleSubmit} className="space-y-5">
                            {/* Email */}
                            <motion.div
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: 0.3 }}
                            >
                                <label className="block text-xs font-bold text-pocholo-brown/70 mb-2 uppercase tracking-wider">
                                    Correo Electrónico
                                </label>
                                <div className="relative group">
                                    <div className="absolute inset-0 bg-gradient-to-r from-pocholo-red/20 to-pocholo-yellow/20 rounded-xl blur-lg opacity-0 group-focus-within:opacity-100 transition-opacity" />
                                    <div className="relative">
                                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-pocholo-brown/40 group-focus-within:text-pocholo-red transition-colors" size={20} />
                                        <input
                                            type="email"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            placeholder="usuario@pocholos.com"
                                            required
                                            className="w-full pl-12 pr-4 py-4 bg-white/80 border-2 border-pocholo-brown/10 rounded-xl text-pocholo-brown placeholder:text-pocholo-brown/40 focus:outline-none focus:border-pocholo-red focus:bg-white transition-all shadow-sm"
                                        />
                                    </div>
                                </div>
                            </motion.div>

                            {/* Password */}
                            <motion.div
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: 0.4 }}
                            >
                                <label className="block text-xs font-bold text-pocholo-brown/70 mb-2 uppercase tracking-wider">
                                    Contraseña
                                </label>
                                <div className="relative group">
                                    <div className="absolute inset-0 bg-gradient-to-r from-pocholo-red/20 to-pocholo-yellow/20 rounded-xl blur-lg opacity-0 group-focus-within:opacity-100 transition-opacity" />
                                    <div className="relative">
                                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-pocholo-brown/40 group-focus-within:text-pocholo-red transition-colors" size={20} />
                                        <input
                                            type="password"
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            placeholder="••••••••"
                                            required
                                            className="w-full pl-12 pr-4 py-4 bg-white/80 border-2 border-pocholo-brown/10 rounded-xl text-pocholo-brown placeholder:text-pocholo-brown/40 focus:outline-none focus:border-pocholo-red focus:bg-white transition-all shadow-sm"
                                        />
                                    </div>
                                </div>
                            </motion.div>

                            {/* Botón Login con efecto 3D */}
                            <motion.button
                                type="submit"
                                disabled={loading}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.5 }}
                                whileHover={{
                                    scale: 1.02,
                                    boxShadow: '0 15px 30px -10px rgba(200, 16, 46, 0.4)'
                                }}
                                whileTap={{ scale: 0.98 }}
                                className="w-full py-4 bg-gradient-to-r from-pocholo-red to-red-600 text-white font-bold text-lg rounded-xl shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-3 mt-6"
                                style={{
                                    boxShadow: '0 10px 25px -8px rgba(200, 16, 46, 0.35)'
                                }}
                            >
                                {loading ? (
                                    <>
                                        <Loader2 className="animate-spin" size={22} />
                                        Ingresando...
                                    </>
                                ) : (
                                    <>
                                        Iniciar Sesión
                                        <ArrowRight size={22} />
                                    </>
                                )}
                            </motion.button>
                        </form>

                        {/* Footer discreto */}
                        <motion.p
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.8 }}
                            className="mt-8 text-center text-pocholo-brown/40 text-xs"
                        >
                            © 2026 Pocholo's Chicken
                        </motion.p>
                    </motion.div>

                    {/* Crédito discreto */}
                    <motion.p
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 1.2 }}
                        className="mt-4 text-center text-pocholo-brown/25 text-[10px] tracking-wider"
                    >
                        Desarrollado por JoseAT
                    </motion.p>
                </motion.div>
            </div>

            {/* Lado Derecho - Banner Pocholo's con overlay moderno */}
            <div className="hidden lg:block lg:w-1/2 relative">
                <motion.div
                    initial={{ opacity: 0, scale: 1.1 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 1 }}
                    className="absolute inset-0"
                >
                    <img
                        src="/images/login-banner.jpg"
                        alt="Pocholo's Chicken"
                        className="w-full h-full object-cover"
                    />
                    {/* Overlay con efecto glassmorphism */}
                    <div className="absolute inset-0 bg-gradient-to-l from-transparent via-transparent to-pocholo-cream/30" />
                </motion.div>
            </div>
        </div>
    );
}
