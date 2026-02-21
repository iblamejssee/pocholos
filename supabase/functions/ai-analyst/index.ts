import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.21.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight request
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { query } = await req.json();
    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');

    if (!OPENAI_API_KEY) {
      throw new Error('Missing OPENAI_API_KEY environment variable');
    }

    // 1. Initialize Supabase Client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // 2. Define the Tool (Function Definition)
    const tools = [
      {
        type: "function",
        function: {
          name: "get_business_data",
          description: "Get business data about sales, inventory, expenses, or products.",
          parameters: {
            type: "object",
            properties: {
              query_type: {
                type: "string",
                enum: ["sales_summary", "inventory_check", "expenses_summary", "top_products"],
                description: "The type of data to retrieve."
              },
              date_range: {
                type: "object",
                properties: {
                  start: { type: "string", format: "date", description: "YYYY-MM-DD" },
                  end: { type: "string", format: "date", description: "YYYY-MM-DD" }
                },
                required: ["start", "end"]
              }
            },
            required: ["query_type", "date_range"]
          }
        }
      }
    ];

    // 3. Call OpenAI with User Query
    const initialResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
            { role: 'system', content: 'You are a business analyst for a restaurant called "Pocholos Chicken". Use the get_business_data tool to answer questions based on real data. Always answer in Spanish. Be concise and professional.' },
            { role: 'user', content: query }
        ],
        tools: tools,
        tool_choice: "auto"
      })
    });

    const initialData = await initialResponse.json();
    const message = initialData.choices[0].message;

    // 4. Handle Tool Calls
    if (message.tool_calls) {
      const toolCall = message.tool_calls[0];
      const functionName = toolCall.function.name;
      const functionArgs = JSON.parse(toolCall.function.arguments);

      let functionResult = null;

      if (functionName === 'get_business_data') {
        const { query_type, date_range } = functionArgs;
        
        // Execute SQL based on query_type
        if (query_type === 'sales_summary') {
            const { data, error } = await supabaseClient
                .from('ventas')
                .select('total, metodo_pago, created_at')
                .gte('created_at', date_range.start)
                .lte('created_at', date_range.end + 'T23:59:59');
            
            if (error) throw error;
            
            const totalRevenue = data.reduce((sum, v) => sum + v.total, 0);
            const totalOrders = data.length;
            functionResult = { totalRevenue, totalOrders, transaction_count: data.length };
        } 
        else if (query_type === 'inventory_check') {
             const { data, error } = await supabaseClient
                .from('inventario_diario')
                .select('*')
                .gte('fecha', date_range.start)
                .lte('fecha', date_range.end);
             functionResult = data;
        }
        else {
            functionResult = { message: "Query type not implemented yet." };
        }
      }

      // 5. Call OpenAI again with the function result
      const secondResponse = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${OPENAI_API_KEY}`
        },
        body: JSON.stringify({
            model: 'gpt-4o',
            messages: [
                { role: 'system', content: 'You are a business analyst.' },
                { role: 'user', content: query },
                message, 
                {
                    role: 'tool',
                    tool_call_id: toolCall.id,
                    content: JSON.stringify(functionResult)
                }
            ]
        })
      });
      
      const secondData = await secondResponse.json();
      const finalReply = secondData.choices[0].message.content;

      return new Response(JSON.stringify({ reply: finalReply }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // No tool called
    return new Response(JSON.stringify({ reply: message.content }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
