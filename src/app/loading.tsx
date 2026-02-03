import { Loader2 } from "lucide-react";

export default function Loading() {
    return (
        <div className="flex items-center justify-center min-h-screen bg-pocholo-cream/50">
            <div className="flex flex-col items-center gap-4">
                <div className="relative">
                    <div className="absolute inset-0 bg-pocholo-yellow/20 blur-xl rounded-full" />
                    <Loader2 className="animate-spin text-pocholo-red relative z-10" size={48} />
                </div>
                <p className="text-pocholo-brown/60 font-medium animate-pulse">
                    Cargando...
                </p>
            </div>
        </div>
    );
}
