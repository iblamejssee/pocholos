
import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET() {
    const results: any = {};

    try {
        // 1. Check updated_at
        const { data: data1, error: error1 } = await supabase
            .from('ventas')
            .select('id, updated_at')
            .limit(1);
        results.updated_at = { success: !error1, error: error1, data: data1 };

        // 2. Check mesas relation
        const { data: data2, error: error2 } = await supabase
            .from('ventas')
            .select('id, mesas(numero)')
            .limit(1);
        results.mesas_relation = { success: !error2, error: error2, data: data2 };

    } catch (e: any) {
        results.exception = e.message;
    }

    return NextResponse.json(results);
}
