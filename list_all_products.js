
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://gogrqgkzqnhfzpwsohsd.supabase.co';
const supabaseKey = 'sb_publishable_z-gj2LWuk3pgSfM6d3aFRA_pOOIeoIV';
const supabase = createClient(supabaseUrl, supabaseKey);

async function listProducts() {
    const { data, error } = await supabase
        .from('productos')
        .select('id, nombre, fraccion_pollo');

    if (error) {
        console.error('Error:', error);
    } else {
        // Solo mostrar nombres y fraccion_pollo para no saturar consola
        const simplified = data.map(p => ({ n: p.nombre, f: p.fraccion_pollo, id: p.id }));
        console.log('Productos:', JSON.stringify(simplified, null, 2));
    }
}

listProducts();
