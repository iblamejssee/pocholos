import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
    try {
        // Validar autorización de Vercel Cron
        const authHeader = request.headers.get('authorization');
        if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
            return NextResponse.json(
                { error: 'No autorizado' },
                { status: 401 }
            );
        }

        // Conectar a Supabase
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

        if (!supabaseUrl || !supabaseKey) {
            return NextResponse.json({ error: 'Faltan variables de entorno' }, { status: 500 });
        }

        const supabase = createClient(supabaseUrl, supabaseKey);

        // Hacer una consulta simple para mantener la BD activa
        const { error } = await supabase.from('productos').select('id').limit(1);

        if (error) {
            return NextResponse.json({ success: false, message: error.message }, { status: 500 });
        }

        return NextResponse.json({
            success: true,
            message: 'Base de datos activa',
            timestamp: new Date().toISOString()
        });

    } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
        return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
    }
}
