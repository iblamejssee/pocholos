
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load env from .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing env vars');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function diagnose() {
    console.log('--- DIAGNOSTIC START ---');

    // 1. Check updated_at
    console.log('\n1. Checking updated_at column on ventas...');
    const { data: data1, error: error1 } = await supabase
        .from('ventas')
        .select('id, updated_at')
        .limit(1);

    if (error1) {
        console.error('FAIL: updated_at check failed:', error1.message);
    } else {
        console.log('SUCCESS: updated_at exists. Sample:', data1);
    }

    // 2. Check mesas relation
    console.log('\n2. Checking mesas join...');
    const { data: data2, error: error2 } = await supabase
        .from('ventas')
        .select('id, mesas(numero)')
        .limit(1);

    if (error2) {
        console.error('FAIL: mesas relation check failed:', error2.message);
        console.log('Hint: Foreign key might be missing or named differently.');
    } else {
        console.log('SUCCESS: mesas relation works. Sample:', JSON.stringify(data2, null, 2));
    }

    console.log('--- DIAGNOSTIC END ---');
}

diagnose();
