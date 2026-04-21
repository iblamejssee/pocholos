require('dotenv').config({ path: '.env.local' });
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { createClient } = require('@supabase/supabase-js');

// 1. Configuración de Entorno
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const GEMINI_API_KEY = process.env.GEMINIAI_API_KEY;
const VERCEL_URL = process.env.VERCEL_URL || 'https://tu-url-de-vercel.com';
const OWNER_NUMBER_ID = process.env.OWNER_NUMBER_ID; // Ej: 51987654321@c.us

if (!SUPABASE_URL || !SUPABASE_KEY || !GEMINI_API_KEY) {
    console.error("ERROR: Faltan variables clave en .env.local.");
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" }); 
const visionModel = genAI.getGenerativeModel({ model: "gemini-1.5-flash" }); 

// Para desplegar en la nube (Render/Railway), los flags de puppeteer deben ser más agresivos
const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
        args: [
            '--no-sandbox', 
            '--disable-setuid-sandbox', 
            '--disable-dev-shm-usage', 
            '--disable-accelerated-2d-canvas', 
            '--no-first-run', 
            '--no-zygote',
            '--single-process', // Importante para entornos con bajos recursos como Railway
            '--disable-gpu'
        ],
        executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || null
    }
});

client.on('qr', (qr) => {
    console.log('\n======================================================');
    console.log('SISTEMA INICIADO: Escanea el siguiente código QR:');
    console.log('======================================================\n');
    qrcode.generate(qr, { small: true });
});

client.on('ready', () => {
    console.log('\n========= ¡CLIENTE LISTO! Bot Activo en la Nube =========\n');
});

async function getMenuFromDB() {
    try {
        const { data, error } = await supabase.from('productos').select('nombre, precio, descripcion');
        if (error) throw error;
        return data;
    } catch (error) { return []; }
}

client.on('message', async (message) => {
    if (message.isStatus || message.fromMe) return;

    try {
        const chat = await message.getChat();
        const contact = await message.getContact();

        if (chat.isGroup) return;

        // 1. FLUJO DE LA DUEÑA (Aprobación de Yapes en Puente)
        if (OWNER_NUMBER_ID && message.from === OWNER_NUMBER_ID) {
            if (message.hasQuotedMsg) {
                const quoted = await message.getQuotedMessage();
                if (quoted.body.includes('*PRE-APROBADO POR IA*') && message.body.toUpperCase().includes('OK')) {
                    const line = quoted.body.split('\n').find(l => l.includes('Cliente:'));
                    if (line) {
                        const clientPhone = line.replace('Cliente:', '').trim();
                        
                        // Actualizamos DB a verificado
                        await supabase.from('pedidos_whatsapp').update({ estado: 'yape_verificado' }).eq('cliente_telefono', clientPhone).eq('estado', 'pendiente');
                        
                        await client.sendMessage(OWNER_NUMBER_ID, "✅ ¡Orden marcada como VERIFICADA! (La laptop de caja de Pocholo's acaba de hacer sonar la alerta de Aprobado).");
                        await client.sendMessage(`${clientPhone}@c.us`, "✅ Nuestro equipo acaba de verificar tu pago por Yape. ¡Tu orden pasa a cocina en este momento!");
                    }
                }
            }
            return; // No procesar más mensajes de la dueña hacia el bot general vacíos
        }

        // 2. IGNORAR CONTACTOS GUARDADOS DEL LOCAL
        if (contact.isMyContact) return;

        // 3. FLUJO DE FOTOS (Verificación Visual IA Antifraudes)
        if (message.hasMedia) {
            const media = await message.downloadMedia();
            if (media && media.mimetype.includes('image')) {
                console.log(`[IA VISION] Analizando captura de ${message.from}...`);
                
                try {
                    const result = await visionModel.generateContent([
                        "Eres un auditor antifraudes de caja. En esta imagen de un supuesto pago o 'Yape': ¿Efectivamente parece un pago válido exitoso? Simplemente responde 'APROBADO' si la captura parece legítima de pago, o 'FALSO' si es un meme, otra foto, o se ve falsa.",
                        { inlineData: { data: media.data, mimeType: media.mimetype } }
                    ]);
                    const iaResponse = result.response.text();
                    
                    if (iaResponse.includes("FALSO")) {
                        await client.sendMessage(message.from, "❌ Hmmm... nuestra Inteligencia Artificial no ha podido reconocer tu recibo correctamente. ¿Podrías volver a enviar la captura sin recortes por favor?");
                        return;
                    }

                    // Aprobado por IA: Puente a la Dueña!
                    if (OWNER_NUMBER_ID) {
                        await client.sendMessage(message.from, "✅ ¡Excelente captura! Fue pre-validada por IA y enviada a gerencia. En un minuto te confirmamos tu orden.");
                        
                        // Buscar el pedido pendiente de este cliente
                        const { data: pedido } = await supabase.from('pedidos_whatsapp').select('id, texto_pedido').eq('cliente_telefono', message.from.replace('@c.us','')).eq('estado', 'pendiente').order('creado_en', { ascending: false }).limit(1).single();
                        let resumen = pedido ? pedido.texto_pedido : "Pedido en chat (pendiente de cierre)";
                        
                        // Enviar al número de la Dueña el puente de validación
                        const ownerMessage = `🔥 *PRE-APROBADO POR IA*\nCliente: ${message.from.replace('@c.us','')}\nDetalle Esperado: ${resumen}\n\n*👇 Dueña: Responde a este mensaje con la palabra 'OK' para habilitar esto en la computadora del restaurante y mandarlo a cocina:*`;
                        await client.sendMessage(OWNER_NUMBER_ID, ownerMessage);
                        await client.sendMessage(OWNER_NUMBER_ID, media);
                    } else {
                        // Si no configuraste el OWNER_NUMBER_ID, la IA es el juez final
                        await supabase.from('pedidos_whatsapp').update({ estado: 'yape_verificado' }).eq('cliente_telefono', message.from.replace('@c.us','')).eq('estado', 'pendiente');
                        await client.sendMessage(message.from, "✅ Pago local verificado automáticamente por nuestro sistema. Orden enviada a cocina.");
                    }
                } catch (visionError) {
                    console.log("Error de visión:", visionError);
                }
                return;
            }
        }

        // 4. FLUJO NORMAL DEL ASISTENTE (Textos y Toma de Pedido)
        const productos = await getMenuFromDB();
        let menuString = productos.length > 0 ? productos.map(p => `- ${p.nombre}: S/ ${p.precio} ${p.descripcion ? '('+p.descripcion+')' : ''}`).join('\n') : "Web no disponible.";

        const systemPrompt = `Eres el asistente de Pocholo's. Eres experto en pollos a la brasa. 
Menú oficial (precios):
${menuString}

Si el cliente no sabe, recomienda revisar: ${VERCEL_URL}.
Ofrece SIEMPRE cremas extra o una gaseosa. Responde muy conciso.

INSTRUCCIÓN CRÍTICA DE COBRO:
Cuando el cliente ya haya elegido platos y CONFIRME cómo va a pagar (Yape o Efectivo), TERMINA obligatoriamente tu respuesta así:
[PEDIDO_CONFIRMADO]
Método: Yape o Efectivo
Resumen: (platos exactos)

Ejemplo si es yape: ¡Perfecto! Ya avisé a la caja. *Pásame por favor la foto captura del Yape* aquí para aprobar la orden.
[PEDIDO_CONFIRMADO]
Método: Yape
Resumen: 1 Mostrito`;

        const chatSession = model.startChat({
            history: [
                { role: "user", parts: [{ text: systemPrompt }] },
                { role: "model", parts: [{ text: "Entendido, siempre añadiré [PEDIDO_CONFIRMADO] al final solo cuando la orden esté cerrada." }] }
            ]
        });

        const result = await chatSession.sendMessage(message.body);
        let respuesta = result.response.text();

        // 5. INTERSECCIÓN A LA BD (Caja Fuerte / Supabase)
        if (respuesta.includes('[PEDIDO_CONFIRMADO]')) {
            const lines = respuesta.split('\n');
            const summaryLine = lines.find(l => l.toUpperCase().includes('RESUMEN:')) || '';
            const methodLine = lines.find(l => l.toUpperCase().includes('MÉTODO:')) || '';
            
            const textoPedido = summaryLine.replace(/Resumen:/i, '').trim() || 'Ver chat';
            const metodoPago = methodLine.replace(/Método:/i, '').trim() || 'No especificado';
            
            respuesta = respuesta.split('[PEDIDO_CONFIRMADO]')[0].trim(); // Limpiarlo para el cliente

            // Inyectar en cola como pendiente
            await supabase.from('pedidos_whatsapp').insert({
                cliente_telefono: message.from.replace('@c.us', ''),
                texto_pedido: textoPedido,
                metodo_pago: metodoPago,
                estado: 'pendiente'
            });

            // Si es Efectivo, se auto-valida a nivel Yape porque el pago se constata físicamente
            if (metodoPago.toUpperCase().includes('EFECTIVO')) {
                 await supabase.from('pedidos_whatsapp').update({ estado: 'yape_verificado' }).eq('cliente_telefono', message.from.replace('@c.us','')).eq('estado', 'pendiente');
            }
        }

        await client.sendMessage(message.from, respuesta);

    } catch (error) {
        console.error('Error procesando:', error);
    }
});

client.initialize();
