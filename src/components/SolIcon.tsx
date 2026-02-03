// Icono personalizado para Soles Peruanos (S/)
// Componente simple que muestra "S/" como texto estilizado

interface SolIconProps {
    size?: number;
    className?: string;
}

export default function SolIcon({ size = 24, className = '' }: SolIconProps) {
    const fontSize = size * 0.8; // Ajustar tamaño del texto proporcionalmente

    return (
        <div
            className={`inline-flex items-center justify-center font-bold ${className}`}
            style={{
                width: size,
                height: size,
                fontSize: `${fontSize}px`,
                lineHeight: 1
            }}
        >
            S/
        </div>
    );
}
