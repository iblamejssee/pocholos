
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://gogrqgkzqnhfzpwsohsd.supabase.co';
const supabaseKey = 'sb_publishable_z-gj2LWuk3pgSfM6d3aFRA_pOOIeoIV';
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkProducts() {
    const { data, error } = await supabase
        .from('productos')
        .select('id, nombre, fraccion_pollo, precio')
        .ilike('nombre', '%Brasa%');

    if (error) {
        console.error('Error:', error);
    } else {
        console.log('Productos encontrados:', JSON.stringify(data, null, 2));
    }
}

checkProducts();
