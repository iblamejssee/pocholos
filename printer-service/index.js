const { createClient } = require('@supabase/supabase-js');
const { ThermalPrinter, PrinterTypes, CharacterSet, BreakLine } = require('node-thermal-printer');
const { format } = require('date-fns');
const { es } = require('date-fns/locale');
require('dotenv').config();

// --- CONFIGURACIÓN ---
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;
const PRINTER_NAME = process.env.PRINTER_NAME || 'POS-80'; // Nombre por defecto

if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error('❌ Error: Faltan las variables de entorno SUPABASE_URL y SUPABASE_KEY');
    process.exit(1);
}

// Inicializar cliente Supabase
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: { persistSession: false },
    realtime: {
        params: {
            eventsPerSecond: 10,
        },
    },
});

console.log('🖨️  Iniciando Servicio de Impresión Pocholos...');
console.log(`🔌 Conectando a Supabase: ${SUPABASE_URL}`);
console.log(`📠 Impresora objetivo: "${PRINTER_NAME}"`);

// --- FUNCIÓN DE IMPRESIÓN ---
async function imprimirTicket(venta) {
    try {
        console.log(`📝 Procesando ticket para venta ID: ${venta.id}`);

        const printer = new ThermalPrinter({
            type: PrinterTypes.EPSON, // La mayoría de térmicas genéricas usan protocolo EPSON (ESC/POS)
            interface: `printer:${PRINTER_NAME}`,
            characterSet: CharacterSet.PC852_LATIN2,
            removeSpecialCharacters: false,
            lineCharacter: "=",
            options: {
                timeout: 5000
            }
        });

        const isConnected = await printer.isPrinterConnected();
        if (!isConnected) {
            console.error('❌ Error: No se puede conectar con la impresora. Verifica el nombre y conexión USB.');
            return;
        }

        // Formatear Ticket
        printer.alignCenter();
        printer.bold(true);
        printer.setTextSize(1, 1);
        printer.println("POCHOLO'S CHICKEN");
        printer.bold(false);
        printer.setTextSize(0, 0);
        printer.println("La Pasion Hecha Sazon");
        printer.drawLine();

        // Información del Pedido
        printer.alignLeft();

        // Mesa o Llevar
        let ubicacion = 'PARA LLEVAR';
        if (venta.mesa_id) {
            // Consultar numero de mesa si es necesario, o mostrar ID si no tenemos el numero aqui
            // Idealmente el trigger o la consulta deberia traerlo, pero aqui simplificamos
            ubicacion = `MESA (ID: ${venta.mesa_id})`;
        }

        printer.println(`TIPO: ${ubicacion}`);
        printer.println(`PEDIDO: #${venta.id.slice(0, 8)}`);
        printer.println(`FECHA: ${format(new Date(venta.created_at), 'dd/MM/yyyy HH:mm', { locale: es })}`);
        printer.drawLine();

        // Detalle de Ítems
        printer.alignLeft();
        printer.bold(true);
        printer.println("CANT  DESCRIPCION");
        printer.bold(false);

        // Parsear items (puede venir como string JSON o objeto JS dependiendo del driver de supabase)
        let items = venta.items;
        if (typeof items === 'string') {
            try { items = JSON.parse(items); } catch (e) { items = []; }
        }

        if (Array.isArray(items)) {
            items.forEach(item => {
                const cantidad = String(item.cantidad).padEnd(5);
                const nombre = item.nombre || 'Producto';

                // Imprimir línea principal
                printer.println(`${cantidad} ${nombre}`);

                // Imprimir detalles/notas si existen
                if (item.detalles) {
                    if (item.detalles.parte) {
                        printer.println(`      [${item.detalles.parte.toUpperCase()}]`);
                    }
                    if (item.detalles.notas) {
                        printer.println(`      *Nota: ${item.detalles.notas}`);
                    }
                }
            });
        }

        printer.drawLine();

        // Notas Generales del Pedido
        if (venta.notas) {
            printer.bold(true);
            printer.println("NOTAS DE COCINA:");
            printer.bold(false);
            printer.println(venta.notas);
            printer.drawLine();
        }

        printer.alignCenter();
        printer.println("--- FIN TICKET COCINA ---");
        printer.cut();

        // Si la impresora tiene buzzer/beep
        printer.beep();

        // Ejecutar impresión
        try {
            await printer.execute();
            console.log('✅ Ticket enviado a impresora correctamente.');
        } catch (error) {
            console.error('❌ Error al enviar bytes a la impresora:', error);
        }

    } catch (error) {
        console.error('❌ Error general en función imprimirTicket:', error);
    }
}

// --- SUSCRIPCIÓN REALTIME ---
const channel = supabase
    .channel('impresion-tickets')
    .on(
        'postgres_changes',
        {
            event: 'INSERT',
            schema: 'public',
            table: 'ventas',
        },
        (payload) => {
            const nuevaVenta = payload.new;
            console.log('✨ Nuevo evento recibido:', nuevaVenta.estado_pedido);

            // Solo imprimir si el estado es 'pendiente' (nuevo pedido)
            if (nuevaVenta.estado_pedido === 'pendiente') {
                imprimirTicket(nuevaVenta);
            }
        }
    )
    .subscribe((status) => {
        console.log(`📡 Estado de suscripción: ${status}`);
        if (status === 'SUBSCRIBED') {
            console.log('🟢 Escuchando nuevos pedidos...');
        }
    });

// --- MANEJO DE ERRORES Y RECONEXIÓN ---
// Supabase JS maneja reconexiones automáticas de WS, pero podemos
// agregar un keep-alive o check periódico si es crítico.

// Evitar cierre en excepciones no capturadas para mantener el servicio vivo
process.on('uncaughtException', (err) => {
    console.error('💥 Excepción no capturada:', err);
    // No salimos del proceso, intentamos seguir
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('💥 Promesa rechazada no manejada:', reason);
});
