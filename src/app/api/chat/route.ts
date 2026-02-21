import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Helper to format today's date
function getToday() {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

// Direct Supabase query functions (no AI required)
async function getSalesSummary(supabase: any, dateStart: string, dateEnd: string) {
    const { data, error } = await supabase
        .from('ventas')
        .select('total, metodo_pago, created_at')
        .gte('created_at', dateStart)
        .lte('created_at', dateEnd + 'T23:59:59');

    if (error) return `❌ Error al consultar ventas: ${error.message}`;
    if (!data || data.length === 0) return `📊 No hay ventas registradas para el período ${dateStart} a ${dateEnd}.`;

    const total = data.reduce((sum: number, v: any) => sum + (v.total || 0), 0);
    const efectivo = data.filter((v: any) => v.metodo_pago === 'efectivo').reduce((s: number, v: any) => s + v.total, 0);
    const yape = data.filter((v: any) => v.metodo_pago === 'yape').reduce((s: number, v: any) => s + v.total, 0);
    const plin = data.filter((v: any) => v.metodo_pago === 'plin').reduce((s: number, v: any) => s + v.total, 0);

    return `📊 **Resumen de Ventas** (${dateStart})\n\n` +
        `🧾 Total de pedidos: **${data.length}**\n` +
        `💰 Ingresos totales: **S/ ${total.toFixed(2)}**\n\n` +
        `💵 Efectivo: S/ ${efectivo.toFixed(2)}\n` +
        `📱 Yape: S/ ${yape.toFixed(2)}\n` +
        `📱 Plin: S/ ${plin.toFixed(2)}`;
}

async function getInventorySummary(supabase: any, dateStart: string, dateEnd: string) {
    const { data, error } = await supabase
        .from('inventario_diario')
        .select('*')
        .gte('fecha', dateStart)
        .lte('fecha', dateEnd)
        .order('fecha', { ascending: false })
        .limit(1);

    if (error) return `❌ Error al consultar inventario: ${error.message}`;
    if (!data || data.length === 0) return `📦 No hay registros de inventario para el ${dateStart}.`;

    const inv = data[0];
    return `📦 **Inventario del día** (${inv.fecha})\n\n` +
        `🐔 Pollos iniciales: **${inv.pollos_iniciales ?? 'N/A'}**\n` +
        `🐔 Pollos finales: **${inv.pollos_finales ?? 'N/A'}**\n` +
        `🥔 Papas iniciales: **${inv.papas_iniciales ?? 'N/A'} kg**\n` +
        `🥔 Papas finales: **${inv.papas_finales ?? 'N/A'} kg**\n` +
        (inv.pollos_golpeados ? `⚠️ Pollos golpeados: ${inv.pollos_golpeados}\n` : '') +
        (inv.cena_personal ? `🍽️ Cena personal: ${inv.cena_personal}\n` : '');
}

async function getExpensesSummary(supabase: any, dateStart: string, dateEnd: string) {
    const { data, error } = await supabase
        .from('gastos')
        .select('*')
        .gte('created_at', dateStart)
        .lte('created_at', dateEnd + 'T23:59:59');

    if (error) return `❌ Error al consultar gastos: ${error.message}`;
    if (!data || data.length === 0) return `💸 No hay gastos registrados para el ${dateStart}.`;

    const total = data.reduce((sum: number, g: any) => sum + (g.monto || 0), 0);
    const details = data.map((g: any) => `  • ${g.descripcion || 'Sin descripción'}: S/ ${(g.monto || 0).toFixed(2)}`).join('\n');

    return `💸 **Resumen de Gastos** (${dateStart})\n\n` +
        `📝 Total de gastos: **${data.length}**\n` +
        `💰 Monto total: **S/ ${total.toFixed(2)}**\n\n` +
        details;
}

// Detect intent from message keywords (no AI needed)
function detectIntent(query: string): { type: string; dateStart: string; dateEnd: string } {
    const lower = query.toLowerCase();
    const today = getToday();

    let type = 'general';
    if (lower.includes('venta') || lower.includes('vendimos') || lower.includes('ingreso') || lower.includes('factur') || lower.includes('pedido')) {
        type = 'sales';
    } else if (lower.includes('inventario') || lower.includes('stock') || lower.includes('pollo') || lower.includes('papa')) {
        type = 'inventory';
    } else if (lower.includes('gasto') || lower.includes('egreso') || lower.includes('costo')) {
        type = 'expenses';
    } else if (lower.includes('resumen') || lower.includes('todo') || lower.includes('reporte') || lower.includes('general')) {
        type = 'all';
    }

    return { type, dateStart: today, dateEnd: today };
}

// Gemini API call with retry
async function callGemini(query: string, apiKey: string, today: string): Promise<string | null> {
    const toolDeclarations = [{
        name: "get_business_data",
        description: "Retrieves business data about sales, inventory, or expenses.",
        parameters: {
            type: "object",
            properties: {
                query_type: {
                    type: "string",
                    enum: ["sales_summary", "inventory_check", "expenses_summary"],
                    description: "Type of data"
                },
                date_range: {
                    type: "object",
                    properties: {
                        start: { type: "string", description: "YYYY-MM-DD" },
                        end: { type: "string", description: "YYYY-MM-DD" }
                    },
                    required: ["start", "end"]
                }
            },
            required: ["query_type", "date_range"]
        }
    }];

    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

    try {
        const response = await fetch(geminiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ role: "user", parts: [{ text: query }] }],
                systemInstruction: {
                    parts: [{
                        text: `Eres un analista de negocios para "Pocholos Chicken". Responde en español. Hoy es ${today}. Usa get_business_data para consultar datos.`
                    }]
                },
                tools: [{ functionDeclarations: toolDeclarations }],
                toolConfig: { functionCallingConfig: { mode: "AUTO" } }
            })
        });

        if (response.status === 429) return null; // Rate limited - fallback to direct mode
        if (!response.ok) return null;

        const data = await response.json();
        if (data.error) return null;

        const parts = data.candidates?.[0]?.content?.parts || [];
        const textPart = parts.find((p: any) => p.text);
        if (textPart) return textPart.text;

        // If gemini wants a function call, return null to use fallback
        return null;
    } catch {
        return null;
    }
}

export async function POST(req: Request) {
    try {
        const { query } = await req.json();
        const GEMINI_API_KEY = process.env.GEMINIAI_API_KEY;
        const today = getToday();

        // Initialize Supabase
        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        );

        // Try Gemini AI first (if available and not rate limited)
        if (GEMINI_API_KEY) {
            const aiResponse = await callGemini(query, GEMINI_API_KEY, today);
            if (aiResponse) {
                return NextResponse.json({ reply: aiResponse });
            }
        }

        // --- FALLBACK: Direct Supabase Queries (no AI needed) ---
        const intent = detectIntent(query);

        let reply = '';

        if (intent.type === 'sales') {
            reply = await getSalesSummary(supabase, intent.dateStart, intent.dateEnd);
        } else if (intent.type === 'inventory') {
            reply = await getInventorySummary(supabase, intent.dateStart, intent.dateEnd);
        } else if (intent.type === 'expenses') {
            reply = await getExpensesSummary(supabase, intent.dateStart, intent.dateEnd);
        } else if (intent.type === 'all') {
            const sales = await getSalesSummary(supabase, intent.dateStart, intent.dateEnd);
            const inventory = await getInventorySummary(supabase, intent.dateStart, intent.dateEnd);
            const expenses = await getExpensesSummary(supabase, intent.dateStart, intent.dateEnd);
            reply = `${sales}\n\n---\n\n${inventory}\n\n---\n\n${expenses}`;
        } else {
            // General greeting or unknown query
            reply = `¡Hola! 🐔 Soy el asistente de **Pocholos Chicken**.\n\n` +
                `Puedo ayudarte con:\n` +
                `• 📊 **Ventas**: "¿Cuánto vendimos hoy?"\n` +
                `• 📦 **Inventario**: "¿Cuántos pollos quedan?"\n` +
                `• 💸 **Gastos**: "¿Cuáles fueron los gastos de hoy?"\n` +
                `• 📋 **Resumen**: "Dame un resumen general"\n\n` +
                `¡Pregúntame lo que necesites!`;
        }

        return NextResponse.json({ reply });

    } catch (error: any) {
        console.error('API Chat Error:', error);
        return NextResponse.json({ error: error.message || 'Error interno del servidor' }, { status: 500 });
    }
}
