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

        // 1. Obtener conteo actual y max mesa
        const { data: mesas, error: fetchError } = await supabase
            .from('mesas')
            .select('numero')
            .order('numero', { ascending: true });

        if (fetchError) throw fetchError;

        const existingNumbers = new Set(mesas?.map(m => m.numero) || []);
        const mesasToInsert = [];

        for (let i = 1; i <= 25; i++) {
            if (!existingNumbers.has(i)) {
                mesasToInsert.push({ numero: i, estado: 'libre' });
            }
        }

        if (mesasToInsert.length === 0) {
            return NextResponse.json({ message: 'Ya existen 25 mesas (o más).' });
        }

        const { error: insertError } = await supabase.from('mesas').insert(mesasToInsert);

        if (insertError) throw insertError;

        return NextResponse.json({
            success: true,
            message: `Se agregaron ${mesasToInsert.length} mesas nuevas.`,
            added: mesasToInsert
        });

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
