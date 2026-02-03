'use client';

import { motion } from 'framer-motion';
import { ReactNode } from 'react';

interface AnimatedCardProps {
    children: ReactNode;
    delay?: number;
    className?: string;
    hover3D?: boolean;
}

export default function AnimatedCard({
    children,
    delay = 0,
    className = '',
    hover3D = true,
}: AnimatedCardProps) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
                duration: 0.5,
                delay,
                ease: [0.4, 0, 0.2, 1],
            }}
            whileHover={
                hover3D
                    ? {
                        y: -4,
                        scale: 1.02,
                        transition: { duration: 0.2 },
                    }
                    : undefined
            }
            className={`transition-3d ${className}`}
        >
            {children}
        </motion.div>
    );
}
