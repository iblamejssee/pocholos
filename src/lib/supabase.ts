import { createClient } from '@supabase/supabase-js';

// Validar que las variables de entorno estén configuradas
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
        'Faltan las variables de entorno de Supabase. ' +
        'Asegúrate de configurar NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY en .env.local'
    );
}

// Crear cliente de Supabase
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
        persistSession: true, // IMPORTANTE: Habilitar persistencia de sesión
        autoRefreshToken: true,
        detectSessionInUrl: true,
    },
});

// Helper para formatear fechas en formato YYYY-MM-DD usando hora LOCAL (no UTC)
export const formatearFecha = (fecha: Date = new Date()): string => {
    const year = fecha.getFullYear();
    const month = String(fecha.getMonth() + 1).padStart(2, '0');
    const day = String(fecha.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

// Helper para obtener la fecha actual en hora LOCAL
export const obtenerFechaHoy = (): string => {
    return formatearFecha(new Date());
};
