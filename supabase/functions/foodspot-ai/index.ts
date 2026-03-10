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
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-guest-token",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req) => {
    // CORS preflight
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }

    try {
        const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
        if (!GEMINI_API_KEY) {
            console.error("Missing GEMINI_API_KEY secret.");
            return new Response(
                JSON.stringify({ error: "MISSING_SECRET", detail: "Configurá GEMINI_API_KEY en Supabase secrets." }),
                { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        const { messages, systemPrompt } = await req.json();

        if (!messages || !Array.isArray(messages) || messages.length === 0) {
            return new Response(
                JSON.stringify({ error: "BAD_REQUEST", detail: "Messages should be an array" }),
                { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        // Build Gemini request format with Multimodal Support
        const contents = messages.map((msg) => {
            const parts = [];

            // Text part
            if (msg.content) {
                parts.push({ text: msg.content });
            }

            // Image part (expecting base64 string from frontend)
            if (msg.image) {
                parts.push({
                    inlineData: {
                        mimeType: msg.image.mimeType || "image/jpeg",
                        data: msg.image.data
                    }
                });
            }

            return {
                role: msg.role === "assistant" ? "model" : "user",
                parts
            };
        });

        const geminiBody = {
            contents,
            systemInstruction: systemPrompt
                ? { parts: [{ text: systemPrompt }] }
                : undefined,
            generationConfig: {
                temperature: 0.7,
                maxOutputTokens: 4096, // Increased for Open Claw JSON
                topP: 0.9,
            },
        };

        // Call Gemini API with Retry Logic + Model Fallback
        const MODELS = [
            "gemini-2.5-flash",
            "gemini-2.0-flash-lite",
        ];

        let geminiRes;
        let lastStatus = 0;

        for (const model of MODELS) {
            let retries = 2;

            while (retries >= 0) {
                console.log(`[foodspot-ai] Trying model: ${model} (retries left: ${retries})`);
                geminiRes = await fetch(
                    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
                    {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                            "x-goog-api-key": GEMINI_API_KEY
                        },
                        body: JSON.stringify(geminiBody),
                    }
                );

                lastStatus = geminiRes.status;

                if (geminiRes.ok) break;

                // If 429 or 500+, wait with exponential backoff and retry
                if (geminiRes.status === 429 || geminiRes.status >= 500) {
                    const delay = (3 - retries) * 1500; // 1.5s, 3s, 4.5s
                    console.warn(`Gemini API ${geminiRes.status} on ${model}, waiting ${delay}ms...`);
                    await new Promise(r => setTimeout(r, delay));
                    retries--;
                } else {
                    break; // Don't retry 400s
                }
            }

            // If we got a successful response, stop trying other models
            if (geminiRes.ok) {
                console.log(`[foodspot-ai] ✅ Success with model: ${model}`);
                break;
            }

            console.warn(`[foodspot-ai] Model ${model} failed with ${lastStatus}, trying next...`);
        }

        if (!geminiRes.ok) {
            const errText = await geminiRes.text();
            console.error("Gemini API error:", errText);
            return new Response(
                JSON.stringify({ error: "API_ERROR", detail: `Gemini responded with ${geminiRes.status}` }),
                { status: geminiRes.status === 429 ? 429 : 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
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
