'use client';

import { useState, useEffect } from 'react';
import { WifiOff, Wifi } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function OfflineIndicator() {
    const [isOnline, setIsOnline] = useState(true);
    const [showReconnecting, setShowReconnecting] = useState(false);

    useEffect(() => {
        const handleOnline = () => {
            setIsOnline(true);
            setShowReconnecting(false);
        };

        const handleOffline = () => {
            setIsOnline(false);
            setShowReconnecting(true);
        };

        // Detectar cambios de conexión
        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        // Estado inicial
        setIsOnline(navigator.onLine);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    return (
        <AnimatePresence>
            {!isOnline && (
                <motion.div
                    initial={{ y: -100, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: -100, opacity: 0 }}
                    className="fixed top-0 left-0 right-0 z-50 bg-gradient-to-r from-orange-500 to-red-500 text-white py-3 px-4 shadow-lg"
                >
                    <div className="max-w-7xl mx-auto flex items-center justify-center gap-3">
                        <WifiOff size={24} className="animate-pulse" />
                        <div className="text-center">
                            <p className="font-bold text-lg">Sin conexión a Internet</p>
                            <p className="text-sm opacity-90">Intentando reconectar...</p>
                        </div>
                        <div className="flex gap-1">
                            <motion.div
                                className="w-2 h-2 bg-white rounded-full"
                                animate={{ scale: [1, 1.5, 1], opacity: [1, 0.5, 1] }}
                                transition={{ duration: 1, repeat: Infinity, delay: 0 }}
                            />
                            <motion.div
                                className="w-2 h-2 bg-white rounded-full"
                                animate={{ scale: [1, 1.5, 1], opacity: [1, 0.5, 1] }}
                                transition={{ duration: 1, repeat: Infinity, delay: 0.2 }}
                            />
                            <motion.div
                                className="w-2 h-2 bg-white rounded-full"
                                animate={{ scale: [1, 1.5, 1], opacity: [1, 0.5, 1] }}
                                transition={{ duration: 1, repeat: Infinity, delay: 0.4 }}
                            />
                        </div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
