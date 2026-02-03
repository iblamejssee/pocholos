'use client';

import { LucideIcon } from 'lucide-react';
import { motion } from 'framer-motion';

interface MetricCardProps {
    titulo: string;
    valor: string | number;
    icono: LucideIcon;
    color?: 'red' | 'yellow' | 'brown' | 'green';
    subtitulo?: string;
    delay?: number;
}

export default function MetricCard({
    titulo,
    valor,
    icono: Icon,
    color = 'brown',
    subtitulo,
    delay = 0,
}: MetricCardProps) {
    const colorClasses = {
        red: 'from-pocholo-red to-pocholo-red-dark',
        yellow: 'from-pocholo-yellow to-[#E6B840]',
        brown: 'from-pocholo-brown to-[#4A3222]',
        green: 'from-green-500 to-green-700',
    };

    const iconBgClasses = {
        red: 'bg-pocholo-red/10 text-pocholo-red',
        yellow: 'bg-pocholo-yellow/10 text-pocholo-yellow',
        brown: 'bg-pocholo-brown/10 text-pocholo-brown',
        green: 'bg-green-50 text-green-600',
    };

    const textColorClasses = {
        red: 'text-pocholo-red',
        yellow: 'text-pocholo-yellow',
        brown: 'text-pocholo-brown',
        green: 'text-green-600',
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{
                duration: 0.5,
                delay,
                ease: [0.4, 0, 0.2, 1],
            }}
            whileHover={{
                y: -6,
                scale: 1.02,
                transition: { duration: 0.2 },
            }}
            className="glass-card rounded-2xl shadow-3d p-6 border-2 border-transparent hover:border-pocholo-yellow/30 hover:shadow-3d-hover transition-all duration-300 relative overflow-hidden group"
        >
            {/* Gradiente de fondo sutil */}
            <div className={`absolute inset-0 bg-gradient-to-br ${colorClasses[color]} opacity-0 group-hover:opacity-5 transition-opacity duration-300`} />

            <div className="relative z-10">
                <div className="flex items-center justify-between mb-4">
                    <p className="text-sm font-medium text-pocholo-brown/70">{titulo}</p>
                    <motion.div
                        whileHover={{ rotate: 360, scale: 1.1 }}
                        transition={{ duration: 0.6 }}
                        className={`w-12 h-12 rounded-xl flex items-center justify-center shadow-3d ${iconBgClasses[color]}`}
                    >
                        <Icon size={24} />
                    </motion.div>
                </div>
                <p className={`text-4xl font-bold ${textColorClasses[color]} mb-1 drop-shadow-sm`}>
                    {valor}
                </p>
                {subtitulo && (
                    <p className="text-sm text-pocholo-brown/50">{subtitulo}</p>
                )}
            </div>
        </motion.div>
    );
}
