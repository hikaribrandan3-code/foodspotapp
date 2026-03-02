/**
 * foodspot-ai: Gemini Proxy Edge Function
 * 
 * 🧠 Proxies chat requests to Google Gemini API.
 * 🛡️ Keeps API key server-side (never exposed to client).
 * 
 * Expects POST body: { messages: [{role, content}], systemPrompt: string }
 * Returns: { reply: string, error?: string }
 * 
 * Set GEMINI_API_KEY in Supabase secrets:
 *   supabase secrets set GEMINI_API_KEY=your-key-here
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
    // CORS preflight
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }

    try {
        const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
        if (!GEMINI_API_KEY) {
            return new Response(
                JSON.stringify({ error: "GEMINI_API_KEY not configured" }),
                { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        const { messages, systemPrompt } = await req.json();

        if (!messages || !Array.isArray(messages) || messages.length === 0) {
            return new Response(
                JSON.stringify({ error: "messages array required" }),
                { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        // Build Gemini request format
        const contents = messages.map((msg) => ({
            role: msg.role === "assistant" ? "model" : "user",
            parts: [{ text: msg.content }],
        }));

        const geminiBody = {
            contents,
            systemInstruction: systemPrompt
                ? { parts: [{ text: systemPrompt }] }
                : undefined,
            generationConfig: {
                temperature: 0.7,
                maxOutputTokens: 2048,
                topP: 0.9,
            },
        };

        // Call Gemini API
        const geminiRes = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
            {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(geminiBody),
            }
        );

        if (!geminiRes.ok) {
            const errText = await geminiRes.text();
            console.error("Gemini API error:", errText);
            return new Response(
                JSON.stringify({ error: `Gemini API error: ${geminiRes.status}` }),
                { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        const geminiData = await geminiRes.json();
        const reply =
            geminiData?.candidates?.[0]?.content?.parts?.[0]?.text ||
            "No pude generar una respuesta. Intentá de nuevo.";

        return new Response(
            JSON.stringify({ reply }),
            { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    } catch (error) {
        console.error("foodspot-ai error:", error);
        return new Response(
            JSON.stringify({ error: error.message }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }
});
