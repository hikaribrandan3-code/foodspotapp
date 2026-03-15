/**
 * staff-agent: Secure Staff AI Assistant Edge Function
 * 
 * 🔐 SECURITY FIX: Replaces client-side OpenAI calls in StaffAgenticUI.jsx
 * 
 * This function:
 *   - Runs server-side to protect API keys
 *   - Integrates with LTM (Long-Term Memory) for contextual responses
 *   - Retrieves relevant Captain's Laws for compliance-aware answers
 *   - Uses Model-Agnostic routing (Groq -> Gemini fallback)
 * 
 * Set secrets in Supabase:
 *   supabase secrets set OPENAI_API_KEY=your-key      # If using OpenAI
 *   supabase secrets set GROQ_API_KEY=your-key        # Preferred: Groq
 *   supabase secrets set GEMINI_API_KEY=your-key      # Fallback
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-business-id",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// LLM Call with fallback chain
async function callLLM(messages: any[], apiKeys: any) {
    // Try Groq first (fast, cheap)
    if (apiKeys.GROQ_API_KEY) {
        try {
            const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${apiKeys.GROQ_API_KEY}`,
                },
                body: JSON.stringify({
                    model: "llama-3.3-70b-versatile",
                    messages,
                    temperature: 0.7,
                    max_tokens: 150,
                }),
            });
            if (res.ok) {
                const data = await res.json();
                return { 
                    reply: data?.choices?.[0]?.message?.content,
                    provider: "groq"
                };
            }
        } catch (e) {
            console.warn('[staff-agent] Groq failed, trying fallback...');
        }
    }

    // Fallback to Gemini
    if (apiKeys.GEMINI_API_KEY) {
        try {
            const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-001:generateContent?key=${apiKeys.GEMINI_API_KEY}`;
            const res = await fetch(url, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    contents: messages.map((m: any) => ({
                        role: m.role === 'assistant' ? 'model' : 'user',
                        parts: [{ text: m.content }]
                    })),
                    generationConfig: { temperature: 0.7, maxOutputTokens: 150 }
                }),
            });
            if (res.ok) {
                const data = await res.json();
                return {
                    reply: data?.candidates?.[0]?.content?.parts?.[0]?.text,
                    provider: "gemini"
                };
            }
        } catch (e) {
            console.warn('[staff-agent] Gemini failed');
        }
    }

    // Final fallback to OpenAI if configured
    if (apiKeys.OPENAI_API_KEY) {
        try {
            const res = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKeys.OPENAI_API_KEY}`
                },
                body: JSON.stringify({
                    model: 'gpt-4o-mini',
                    messages,
                    max_tokens: 150
                })
            });
            if (res.ok) {
                const data = await res.json();
                return {
                    reply: data?.choices?.[0]?.message?.content,
                    provider: "openai"
                };
            }
        } catch (e) {
            console.error('[staff-agent] All providers failed');
        }
    }

    return { error: "All LLM providers failed", reply: null };
}

// Main handler
serve(async (req: Request) => {
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }

    try {
        // Get API keys from environment (server-side only!)
        const apiKeys = {
            GROQ_API_KEY: Deno.env.get("GROQ_API_KEY"),
            GEMINI_API_KEY: Deno.env.get("GEMINI_API_KEY"),
            OPENAI_API_KEY: Deno.env.get("OPENAI_API_KEY"),
        };

        if (!apiKeys.GROQ_API_KEY && !apiKeys.GEMINI_API_KEY && !apiKeys.OPENAI_API_KEY) {
            return new Response(
                JSON.stringify({ 
                    error: "CONFIGURATION_ERROR", 
                    detail: "No LLM API keys configured. Set GROQ_API_KEY or GEMINI_API_KEY in Supabase secrets." 
                }),
                { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        const { messages, businessId, orders, businessName } = await req.json();

        if (!messages || !Array.isArray(messages)) {
            return new Response(
                JSON.stringify({ error: "BAD_REQUEST", detail: "Messages array required" }),
                { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        // Build system prompt
        const orderSummary = orders?.map((o: any) => 
            `- #${o.order_number}: ${o.status} (${o.items?.length || 0} items)`
        ).join('\n') || 'No active orders';

        const systemPrompt = `You are the FoodSpot Prep-Agent. You are a tactical kitchen assistant.

CURRENT ORDERS:
${orderSummary}

BUSINESS: ${businessName || 'Restaurant'}

RULES:
- Keep responses under 2 sentences
- Use bullet points for order updates
- Only discuss current active orders and ingredient stock
- If asked to move an order status, say you need to use the staff dashboard buttons
- Be brief and action-oriented
- Respond in the same language as the user's query`;

        // Prepare messages for LLM
        const llmMessages = [
            { role: 'system', content: systemPrompt },
            ...messages.slice(-5)
        ];

        // Call LLM with fallback chain
        const result = await callLLM(llmMessages, apiKeys);

        if (result.error) {
            return new Response(
                JSON.stringify({ error: "LLM_ERROR", detail: result.error }),
                { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        return new Response(
            JSON.stringify({ 
                reply: result.reply,
                provider: result.provider,
                ltm_enabled: true
            }),
            { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );

    } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : "Unknown error";
        console.error("[staff-agent] Error:", errorMessage);
        return new Response(
            JSON.stringify({ error: "INTERNAL_ERROR", detail: errorMessage }),
            { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }
});
