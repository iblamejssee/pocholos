import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

        if (!supabaseUrl || !supabaseKey) {
            return NextResponse.json({ error: 'Faltan credenciales' }, { status: 500 });
        }

        const supabase = createClient(supabaseUrl, supabaseKey);

        // Intento de agregar columnas mediante SQL raw (si se tiene permisos de service role)
        // Nota: supabase-js no permite DDL directamente sin usar RPC o un wrapper si no es el admin completo,
        // pero podemos intentarlo o instruir al usuario si falla.
        // Alternativamente, instruir al usuario que ejecute el SQL.

        // Mejor opción: Devolver el SQL que el usuario necesita ejecutar.
        const sqlInstruction = `
        ALTER TABLE inventario_diario 
        ADD COLUMN IF NOT EXISTS papas_iniciales NUMERIC DEFAULT 0,
        ADD COLUMN IF NOT EXISTS papas_finales NUMERIC DEFAULT 0;
        `;

        return NextResponse.json({
            message: 'Por favor, ejecuta el siguiente comando SQL en el Editor SQL de Supabase:',
            sql: sqlInstruction
        });

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
