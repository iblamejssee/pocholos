interface SkeletonLoaderProps {
    variant?: 'card' | 'table' | 'metric' | 'text';
    count?: number;
    className?: string;
}

export default function SkeletonLoader({
    variant = 'card',
    count = 1,
    className = '',
}: SkeletonLoaderProps) {
    const getSkeletonClass = () => {
        switch (variant) {
            case 'card':
                return 'skeleton skeleton-card';
            case 'metric':
                return 'skeleton skeleton-metric';
            case 'text':
                return 'skeleton skeleton-text';
            case 'table':
                return 'skeleton h-12';
            default:
                return 'skeleton';
        }
    };

    return (
        <div className={className}>
            {Array.from({ length: count }).map((_, index) => (
                <div key={index} className={`${getSkeletonClass()} mb-4`} />
            ))}
        </div>
    );
}
