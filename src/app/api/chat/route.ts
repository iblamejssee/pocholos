import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// ============================================================
// POCHOLO'S CHICKEN - AI CHAT ASSISTANT
// Priority: 1) Groq (free, fast) → 2) Gemini → 3) Smart Fallback
// ============================================================

function getToday() {
    const formatter = new Intl.DateTimeFormat('es-PE', {
        timeZone: 'America/Lima',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    });
    // The formatter output for es-PE is DD/MM/YYYY. We need YYYY-MM-DD.
    const parts = formatter.formatToParts(new Date());
    const day = parts.find(p => p.type === 'day')?.value;
    const month = parts.find(p => p.type === 'month')?.value;
    const year = parts.find(p => p.type === 'year')?.value;
    return `${year}-${month}-${day}`;
}

// ==================== SYSTEM KNOWLEDGE BASE ====================
const SYSTEM_KNOWLEDGE = `
Eres "Kodefy Analyst AI", el asistente inteligente del restaurante **Pocholo's Chicken**, una pollería peruana ubicada en Ayacucho.
Responde SIEMPRE en español. Sé amable, profesional y útil. Usa emojis para hacer las respuestas más visuales.
Responde cualquier pregunta que te hagan - tanto sobre el negocio como preguntas generales, cálculos matemáticos, etc.

## CONOCIMIENTO DEL SISTEMA POS

### APERTURA DEL DÍA (/apertura)
- La apertura se hace desde el menú principal → "Apertura"
- Se registra: pollos enteros iniciales, kg de papas, dinero inicial (caja chica), y stock de bebidas por marca/tipo
- Sin apertura, no se puede vender. Es OBLIGATORIO cada día.
- Pasos: 1) Ir a la sección "Apertura" 2) Ingresar pollos enteros 3) Ingresar kg de papas 4) Ingresar dinero en caja 5) Registrar bebidas 6) Confirmar

### CIERRE DE JORNADA (/cierre)
- Se hace al final del día desde "Cierre de Jornada"
- Se registra: pollos sobrantes (aderezados + en caja), cena del personal, pollos golpeados, papas finales, dinero contado, gaseosas sobrantes
- Genera un resumen para WhatsApp y un reporte Excel
- Campos especiales: "Cena Personal" (pollos consumidos por trabajadores), "Pollos Golpeados" (merma/pollos dañados)

### FRACCIONES DE POLLO
- 1 pollo entero = 1.0
- 1/2 pollo = 0.5
- 1/4 pollo = 0.25
- 1/8 pollo = 0.125 (un "mostrito" o porción pequeña)
- Cálculo de platos por pollos: Para saber cuántos platos salen de X pollos, dividir por la fracción

### CÁLCULOS ÚTILES (por cada pollo entero = 1.0):
- Pollos enteros: 1 plato por pollo
- Medios pollos: 2 platos por pollo
- Cuartos: 4 platos por pollo
- Octavos/Mostritos: 8 platos por pollo (cada mostrito usa 1/8 = 0.125 de pollo)

### PRODUCTOS DEL MENÚ
- Pollo a la Brasa (entero, medio, cuarto)
- Mostrito (1/8 de pollo con papas y ensalada)
- Combos y promociones
- Bebidas: Inca Kola, Coca Cola, Sprite, Fanta, Agua Mineral (varios tamaños)
- Complementos: papas fritas, ensalada, etc.

### PUNTO DE VENTA (POS) (/pos)
- Se accede desde "Nueva Venta" o "Pedido Nuevo"
- Se seleccionan productos, se asigna mesa (opcional), se elige método de pago
- Métodos de pago: Efectivo, Yape, Plin, Tarjeta, Mixto (pago dividido)
- Las ventas se registran automáticamente y descuentan del stock

### REPORTES (/reportes)
- Muestra ventas del día, semana o mes
- Incluye: total ventas, desglose por método de pago, productos más vendidos
- Se puede descargar como Excel

### MESAS (/mesas)
- Sistema de mesas numeradas
- Estados: libre, ocupada, por pagar
- Se puede transferir pedido entre mesas

### GASTOS
- Se registran gastos del día (compras, servicios, etc.)
- Se descuentan del efectivo neto en el cierre

### INVENTARIO
- Se controla pollos (por fracciones), papas (kg), y bebidas (por marca y tipo)
- El sistema calcula automáticamente el stock restante después de cada venta
- Al cierre se compara stock real vs sistema para detectar diferencias
`;

// ==================== SMART FALLBACK RESPONSES ====================
function getSmartResponse(query: string, dbData: any): string {
    const lower = query.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

    // --- APERTURA ---
    if (lower.includes('apertura') || lower.includes('abrir') || (lower.includes('como') && lower.includes('empiezo'))) {
        return `📋 **¿Cómo hacer la Apertura?**\n\n` +
            `1️⃣ Ve al menú principal → **"Apertura"** (o directo a /apertura)\n` +
            `2️⃣ Ingresa los **pollos enteros** que tienes hoy\n` +
            `3️⃣ Ingresa los **kg de papas** iniciales\n` +
            `4️⃣ Ingresa el **dinero inicial** en caja (caja chica)\n` +
            `5️⃣ Registra el **stock de bebidas** por marca y tamaño\n` +
            `6️⃣ Presiona **"Confirmar Apertura"**\n\n` +
            `⚠️ **Importante**: Sin apertura no se puede registrar ventas. ¡Hazla al inicio de cada jornada!`;
    }

    // --- CIERRE ---
    if (lower.includes('cierre') || lower.includes('cerrar') || lower.includes('finalizar jornada')) {
        return `🔒 **¿Cómo hacer el Cierre?**\n\n` +
            `1️⃣ Ve al menú → **"Cierre de Jornada"** (/cierre)\n` +
            `2️⃣ Ingresa **pollos aderezados** sobrantes\n` +
            `3️⃣ Ingresa **pollos en caja** (crudos) sobrantes\n` +
            `4️⃣ Ingresa **pollos golpeados** (merma/dañados)\n` +
            `5️⃣ Ingresa **cena del personal** (consumo empleados)\n` +
            `6️⃣ Ingresa **papas finales** (kg restantes)\n` +
            `7️⃣ Ingresa **gaseosas sobrantes**\n` +
            `8️⃣ Ingresa el **dinero físico contado** en caja\n` +
            `9️⃣ Revisa las diferencias y presiona **"FINALIZAR JORNADA"**\n\n` +
            `📲 Al finalizar puedes **compartir el resumen por WhatsApp** y **descargar Excel**`;
    }

    // --- CÁLCULOS DE POLLOS/MOSTRITOS ---
    const matchPollos = lower.match(/(\d+\.?\d*)\s*pollo/);
    if (matchPollos && (lower.includes('mostrito') || lower.includes('plato') || lower.includes('sacar') || lower.includes('cuanto'))) {
        const pollos = parseFloat(matchPollos[1]);
        const mostritos = Math.floor(pollos * 8);
        const cuartos = Math.floor(pollos * 4);
        const medios = Math.floor(pollos * 2);
        return `🐔 **Con ${pollos} pollo${pollos > 1 ? 's' : ''} puedes sacar:**\n\n` +
            `🍗 Enteros: **${Math.floor(pollos)}** platos\n` +
            `🍗 Medios (1/2): **${medios}** platos\n` +
            `🍗 Cuartos (1/4): **${cuartos}** platos\n` +
            `🍗 Mostritos (1/8): **${mostritos}** platos\n\n` +
            `📐 *Cada mostrito usa 1/8 de pollo (0.125)*`;
    }

    if (lower.includes('mostrito') && !lower.includes('venta') && !lower.includes('vendimos')) {
        return `🍗 **Sobre los Mostritos**\n\n` +
            `• Un mostrito usa **1/8 de pollo** (0.125)\n` +
            `• De 1 pollo salen **8 mostritos**\n` +
            `• De 10 pollos → **80 mostritos**\n` +
            `• De 24 pollos → **192 mostritos**\n\n` +
            `💡 Para calcular: multiplica la cantidad de pollos × 8`;
    }

    // --- VENTAS ---
    if (lower.includes('venta') || lower.includes('vendimos') || lower.includes('ingreso') || lower.includes('factur') || lower.includes('pedido')) {
        if (dbData.ventas !== null) {
            const v = dbData.ventas;
            if (v.length === 0) return `📊 No hay ventas registradas para hoy (${getToday()}).${!dbData.hasApertura ? '\n\n⚠️ **No se ha hecho la apertura del día**. Ve a /apertura para comenzar.' : ''}`;
            const total = v.reduce((s: number, x: any) => s + (x.total || 0), 0);
            const efectivo = v.filter((x: any) => x.metodo_pago === 'efectivo').reduce((s: number, x: any) => s + x.total, 0);
            const yape = v.filter((x: any) => x.metodo_pago === 'yape').reduce((s: number, x: any) => s + x.total, 0);
            const plin = v.filter((x: any) => x.metodo_pago === 'plin').reduce((s: number, x: any) => s + x.total, 0);
            const tarjeta = v.filter((x: any) => x.metodo_pago === 'tarjeta').reduce((s: number, x: any) => s + x.total, 0);
            return `📊 **Ventas de Hoy** (${getToday()})\n\n` +
                `🧾 Pedidos: **${v.length}**\n` +
                `💰 Total: **S/ ${total.toFixed(2)}**\n\n` +
                `💵 Efectivo: S/ ${efectivo.toFixed(2)}\n` +
                `📱 Yape: S/ ${yape.toFixed(2)}\n` +
                `📱 Plin: S/ ${plin.toFixed(2)}\n` +
                `💳 Tarjeta: S/ ${tarjeta.toFixed(2)}`;
        }
        return `📊 No pude consultar las ventas en este momento. Verifica que se haya hecho la apertura del día.`;
    }

    // --- INVENTARIO ---
    if (lower.includes('inventario') || lower.includes('stock') || (lower.includes('cuanto') && (lower.includes('pollo') || lower.includes('papa')))) {
        if (dbData.inventario) {
            const inv = dbData.inventario;
            return `📦 **Inventario del Día** (${inv.fecha})\n\n` +
                `🐔 Pollos iniciales: **${inv.pollos_enteros ?? 'N/A'}**\n` +
                `🥔 Papas iniciales: **${inv.papas_iniciales ?? 'N/A'} kg**\n` +
                `💰 Dinero inicial: **S/ ${(inv.dinero_inicial || 0).toFixed(2)}**\n` +
                `📍 Estado: **${inv.estado}**` +
                (inv.stock_pollos_real !== null && inv.stock_pollos_real !== undefined ?
                    `\n\n🍗 Pollos sobrantes: ${inv.stock_pollos_real}\n🥔 Papas finales: ${inv.papas_finales ?? 'N/A'} kg` : '');
        }
        if (!dbData.hasApertura) {
            return `📦 No hay apertura registrada para hoy.\n\n` +
                `👉 Ve a **Apertura** (/apertura) para registrar el inventario inicial del día.`;
        }
        return `📦 No hay datos de inventario disponibles para hoy.`;
    }

    // --- GASTOS ---
    if (lower.includes('gasto') || lower.includes('egreso') || lower.includes('costo')) {
        if (dbData.gastos !== null) {
            const g = dbData.gastos;
            if (g.length === 0) return `💸 No hay gastos registrados para hoy.`;
            const total = g.reduce((s: number, x: any) => s + (x.monto || 0), 0);
            const details = g.map((x: any) => `  • ${x.descripcion}: S/ ${(x.monto || 0).toFixed(2)}`).join('\n');
            return `💸 **Gastos de Hoy**\n\n📝 Total: **${g.length}** gastos\n💰 Monto total: **S/ ${total.toFixed(2)}**\n\n${details}`;
        }
        return `💸 No pude consultar los gastos.`;
    }

    // --- RESUMEN GENERAL ---
    if (lower.includes('resumen') || lower.includes('todo') || lower.includes('reporte') || lower.includes('general') || lower.includes('como vamos') || lower.includes('como va')) {
        let reply = `📋 **Resumen del Día** (${getToday()})\n\n`;

        if (!dbData.hasApertura) {
            reply += `⚠️ **No se ha registrado la apertura del día.**\nVe a /apertura para comenzar.\n\n`;
        }

        if (dbData.inventario) {
            reply += `📦 **Inventario Inicial**\n🐔 Pollos: ${dbData.inventario.pollos_enteros} | 🥔 Papas: ${dbData.inventario.papas_iniciales ?? '?'} kg | 💰 Caja: S/ ${(dbData.inventario.dinero_inicial || 0).toFixed(2)}\n\n`;
        }

        if (dbData.ventas !== null) {
            const total = dbData.ventas.reduce((s: number, x: any) => s + (x.total || 0), 0);
            reply += `💰 **Ventas**: ${dbData.ventas.length} pedidos → **S/ ${total.toFixed(2)}**\n`;
        }

        if (dbData.gastos !== null) {
            const totalG = dbData.gastos.reduce((s: number, x: any) => s + (x.monto || 0), 0);
            reply += `💸 **Gastos**: ${dbData.gastos.length} → **S/ ${totalG.toFixed(2)}**\n`;
        }

        return reply || `No hay datos suficientes para generar un resumen.`;
    }

    // --- POS / NUEVA VENTA ---
    if (lower.includes('nueva venta') || lower.includes('vender') || lower.includes('registrar venta') || lower.includes('como vendo') || lower.includes('pos')) {
        return `🛒 **¿Cómo registrar una venta?**\n\n` +
            `1️⃣ Ve a **"Pedido Nuevo"** desde el menú\n` +
            `2️⃣ Selecciona los **productos** del menú\n` +
            `3️⃣ Elige la **mesa** (opcional, o "Para Llevar")\n` +
            `4️⃣ Selecciona el **método de pago**: Efectivo, Yape, Plin, Tarjeta o Mixto\n` +
            `5️⃣ Confirma el pedido\n\n` +
            `📊 El stock se actualiza automáticamente después de cada venta.`;
    }

    // --- MESAS ---
    if (lower.includes('mesa') || lower.includes('transferir')) {
        return `🪑 **Sistema de Mesas**\n\n` +
            `• Las mesas se muestran en la sección **"Mesas"**\n` +
            `• Estados: 🟢 Libre | 🔴 Ocupada | 🟡 Por Pagar\n` +
            `• Puedes **transferir** un pedido de una mesa a otra\n` +
            `• También puedes hacer pedidos **"Para Llevar"** sin mesa`;
    }

    // --- POLLOS GOLPEADOS ---
    if (lower.includes('golpeado') || lower.includes('merma') || lower.includes('danado')) {
        return `💥 **Pollos Golpeados (Merma)**\n\n` +
            `Son pollos que se dañaron durante el transporte o almacenamiento.\n\n` +
            `• Se registran en el **Cierre de Jornada**\n` +
            `• Se descuentan del stock esperado\n` +
            `• Aparecen en el reporte de WhatsApp y Excel\n` +
            `• Ayudan a justificar diferencias entre stock real y sistema`;
    }

    // --- CENA PERSONAL ---
    if (lower.includes('cena personal') || lower.includes('cena del personal') || lower.includes('comida personal') || lower.includes('consumo personal')) {
        return `🍽️ **Cena del Personal**\n\n` +
            `Es la cantidad de pollo consumida por los empleados.\n\n` +
            `• Se registra en el **Cierre de Jornada**\n` +
            `• Se descuenta del stock esperado (justifica la diferencia)\n` +
            `• Se muestra como "Pollos Finales Netos" en el cierre\n` +
            `• Fórmula: Neto = Sobrantes - Cena Personal - Golpeados`;
    }

    // --- METODOS DE PAGO ---
    if (lower.includes('pago') || lower.includes('yape') || lower.includes('plin') || lower.includes('efectivo') || lower.includes('tarjeta')) {
        return `💳 **Métodos de Pago Disponibles**\n\n` +
            `💵 **Efectivo** — Pago en billetes/monedas\n` +
            `📱 **Yape** — Pago digital vía Yape\n` +
            `📱 **Plin** — Pago digital vía Plin\n` +
            `💳 **Tarjeta** — POS físico\n` +
            `🔄 **Mixto** — Combinación de métodos (pago dividido)\n\n` +
            `En el cierre, cada método se suma por separado para el cuadre.`;
    }

    // --- EXCEL / REPORTE ---
    if (lower.includes('excel') || lower.includes('descargar')) {
        return `📊 **Reportes Excel**\n\n` +
            `Se generan automáticamente al finalizar el cierre:\n` +
            `1️⃣ Completa el **Cierre de Jornada**\n` +
            `2️⃣ Presiona **"Descargar Reporte Excel"**\n` +
            `3️⃣ El archivo incluye: ventas, gastos, inventario, platillos vendidos y bebidas\n\n` +
            `También puedes ver reportes en /reportes`;
    }

    // --- GREETING / DEFAULT ---
    return `¡Hola! 🐔 Soy **Kodefy Analyst AI**, tu asistente de Pocholo's Chicken.\n\n` +
        `Puedo ayudarte con:\n` +
        `• 📋 **"¿Cómo hago la apertura?"** → Te guío paso a paso\n` +
        `• 🔒 **"¿Cómo cierro la jornada?"** → Instrucciones del cierre\n` +
        `• 📊 **"¿Cuánto vendimos hoy?"** → Consulta ventas reales\n` +
        `• 📦 **"¿Cuántos pollos quedan?"** → Stock actual\n` +
        `• 💸 **"¿Cuáles fueron los gastos?"** → Gastos del día\n` +
        `• 🍗 **"¿Cuántos mostritos salen de 24 pollos?"** → Cálculos\n` +
        `• 📋 **"Dame un resumen general"** → Todo resumido\n` +
        `• 🛒 **"¿Cómo registro una venta?"** → Uso del POS\n\n` +
        `¡Pregúntame lo que necesites! 😊`;
}

// ==================== DATABASE QUERIES ====================
async function fetchDatabaseContext(supabase: any, today: string) {
    const result: any = { ventas: null, inventario: null, gastos: null, hasApertura: false };

    try {
        const { data: inv } = await supabase
            .from('inventario_diario')
            .select('*')
            .eq('fecha', today)
            .order('created_at', { ascending: false })
            .limit(1);
        if (inv && inv.length > 0) {
            result.inventario = inv[0];
            result.hasApertura = true;
        }
    } catch { }

    try {
        const { data: ventas } = await supabase
            .from('ventas')
            .select('total, metodo_pago, created_at, items')
            .gte('created_at', today)
            .lte('created_at', today + 'T23:59:59');
        result.ventas = ventas || [];
    } catch { }

    try {
        const { data: gastos } = await supabase
            .from('gastos')
            .select('descripcion, monto, metodo_pago')
            .eq('fecha', today);
        result.gastos = gastos || [];
    } catch { }

    return result;
}

// ==================== GROQ AI CALL (PRIMARY - FREE & FAST) ====================
async function callGroq(query: string, apiKey: string, today: string, dbContext: string): Promise<string | null> {
    try {
        const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: 'llama-3.3-70b-versatile',
                messages: [
                    {
                        role: 'system',
                        content: SYSTEM_KNOWLEDGE + `\n\nFecha de hoy: ${today}\n\n## DATOS EN TIEMPO REAL:\n${dbContext}`
                    },
                    { role: 'user', content: query }
                ],
                temperature: 0.7,
                max_tokens: 1024
            })
        });

        if (!response.ok) {
            console.log(`Groq error: ${response.status}`);
            return null;
        }

        const data = await response.json();
        return data.choices?.[0]?.message?.content || null;
    } catch (error) {
        console.error('Groq call failed:', error);
        return null;
    }
}

// ==================== GEMINI AI CALL (BACKUP) ====================
async function callGemini(query: string, apiKey: string, today: string, dbContext: string): Promise<string | null> {
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

    for (let attempt = 0; attempt < 2; attempt++) {
        try {
            const response = await fetch(geminiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ role: "user", parts: [{ text: query }] }],
                    systemInstruction: {
                        parts: [{
                            text: SYSTEM_KNOWLEDGE + `\n\nFecha de hoy: ${today}\n\n## DATOS EN TIEMPO REAL:\n${dbContext}`
                        }]
                    }
                })
            });

            if (response.status === 429 && attempt === 0) {
                let waitSeconds = 20;
                try {
                    const errorData = await response.json();
                    const retryInfo = errorData?.error?.details?.find(
                        (d: any) => d['@type']?.includes('RetryInfo')
                    );
                    if (retryInfo?.retryDelay) {
                        const parsed = parseInt(retryInfo.retryDelay);
                        if (parsed > 0 && parsed <= 45) waitSeconds = parsed + 2;
                    }
                } catch { }
                console.log(`Gemini 429 - waiting ${waitSeconds}s...`);
                await new Promise(resolve => setTimeout(resolve, waitSeconds * 1000));
                continue;
            }

            if (!response.ok) return null;

            const data = await response.json();
            const parts = data.candidates?.[0]?.content?.parts || [];
            return parts.find((p: any) => p.text)?.text || null;
        } catch {
            return null;
        }
    }
    return null;
}

// ==================== MAIN API ROUTE ====================
export async function POST(req: Request) {
    try {
        const { query } = await req.json();
        const authHeader = req.headers.get('authorization');
        const GROQ_API_KEY = process.env.GROQ_API_KEY;
        const GEMINI_API_KEY = process.env.GEMINIAI_API_KEY;
        const today = getToday();

        // Initialize Supabase with Auth Header to bypass RLS
        const supabaseOptions = authHeader ? {
            global: { headers: { Authorization: authHeader } }
        } : {};

        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            supabaseOptions
        );

        // Fetch real-time database context
        const dbData = await fetchDatabaseContext(supabase, today);

        // Build context string for AI
        const dbContext = JSON.stringify({
            apertura: dbData.hasApertura,
            inventario: dbData.inventario ? {
                pollos: dbData.inventario.pollos_enteros,
                papas_kg: dbData.inventario.papas_iniciales,
                dinero_inicial: dbData.inventario.dinero_inicial,
                estado: dbData.inventario.estado
            } : null,
            ventas_hoy: dbData.ventas ? {
                total_pedidos: dbData.ventas.length,
                total_soles: dbData.ventas.reduce((s: number, v: any) => s + (v.total || 0), 0)
            } : null,
            gastos_hoy: dbData.gastos ? {
                total_gastos: dbData.gastos.length,
                total_soles: dbData.gastos.reduce((s: number, g: any) => s + (g.monto || 0), 0)
            } : null
        });

        // 1) Try Groq first (free, fast, reliable)
        if (GROQ_API_KEY) {
            const groqResponse = await callGroq(query, GROQ_API_KEY, today, dbContext);
            if (groqResponse) {
                return NextResponse.json({ reply: groqResponse });
            }
        }

        // 2) Try Gemini as backup
        if (GEMINI_API_KEY) {
            const geminiResponse = await callGemini(query, GEMINI_API_KEY, today, dbContext);
            if (geminiResponse) {
                return NextResponse.json({ reply: geminiResponse });
            }
        }

        // 3) Smart fallback (no AI, but handles known queries)
        const reply = getSmartResponse(query, dbData);
        return NextResponse.json({ reply });

    } catch (error: any) {
        console.error('API Chat Error:', error);
        return NextResponse.json({ error: error.message || 'Error interno del servidor' }, { status: 500 });
    }
}
