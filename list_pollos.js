
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://gogrqgkzqnhfzpwsohsd.supabase.co';
const supabaseKey = 'sb_publishable_z-gj2LWuk3pgSfM6d3aFRA_pOOIeoIV';
const supabase = createClient(supabaseUrl, supabaseKey);

async function listPollos() {
    const { data, error } = await supabase
        .from('productos')
        .select('id, nombre, precio, tipo')
        .eq('tipo', 'pollo')
        .order('nombre', { ascending: true });

    if (error) {
        console.error('Error fetching products:', error);
    } else {
        console.log('Productos de Pollo:', JSON.stringify(data, null, 2));
    }
}

listPollos();
