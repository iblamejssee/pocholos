'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { ReactNode } from 'react';

interface PageTransitionProps {
    children: ReactNode;
}

export default function PageTransition({ children }: PageTransitionProps) {
    return (
        <AnimatePresence mode="wait">
            <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{
                    duration: 0.3,
                    ease: [0.4, 0, 0.2, 1],
                }}
            >
                {children}
            </motion.div>
        </AnimatePresence>
    );
}
