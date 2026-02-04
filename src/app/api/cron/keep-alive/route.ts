import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

// Esto obliga a Vercel a ejecutar el código SIEMPRE y no usar caché
export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        // USAMOS LA SERVICE ROLE KEY (la llave secreta) para saltar el RLS
        const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

        if (!supabaseUrl || !supabaseKey) {
            return NextResponse.json(
                { error: 'Faltan variables de entorno en Vercel' },
                { status: 500 }
            );
        }

        const supabase = createClient(supabaseUrl, supabaseKey);

        // Hacemos una consulta rápida que sí o sí toque la DB
        const { error } = await supabase
            .from('productos')
            .select('id')
            .limit(1);

        if (error) throw error;

        return NextResponse.json({
            success: true,
            message: 'Despertador de Pocholos: DB Activa',
            timestamp: new Date().toISOString()
        });

    } catch (err: any) {
        return NextResponse.json(
            { success: false, error: err.message },
            { status: 500 }
        );
    }
}