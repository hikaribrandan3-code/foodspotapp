/**
 * foodspot-ai: Split-Brain AI Edge Function
 * 
 * 🧠 SPLIT-BRAIN ROUTING:
 *   - TEXT ONLY → Groq (Llama 3 70B) — Free, fast, preserves Gemini quota
 *   - IMAGE ATTACHED → Google Gemini 2.0 Flash — World-class vision
 * 
 * 🛡️ All API keys stay server-side (never exposed to client).
 * 
 * Expects POST body: { messages: [{role, content, image?}], systemPrompt: string }
 * Returns: { reply: string, error?: string, provider?: string }
 * 
 * Set secrets in Supabase:
 *   supabase secrets set GEMINI_API_KEY=your-key
 *   supabase secrets set GROQ_API_KEY=your-key
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-guest-token",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// ─── GROQ HANDLER (Text Only) ──────────────────────────────────────
async function callGroq(messages: any[], systemPrompt: string, apiKey: string) {
    console.log("[foodspot-ai] 🧠 Routing to GROQ (text-only)");

    const groqMessages = [];

    // System prompt
    if (systemPrompt) {
        groqMessages.push({ role: "system", content: systemPrompt });
    }

    // Convert messages (strip any image data, Groq can't handle it)
    for (const msg of messages) {
        groqMessages.push({
            role: msg.role === "assistant" ? "assistant" : "user",
            content: msg.content || "",
        });
    }

    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
            model: "llama-3.3-70b-versatile",
            messages: groqMessages,
            temperature: 0.7,
            max_tokens: 4096,
            top_p: 0.9,
        }),
    });

    if (!res.ok) {
        const errText = await res.text();
        console.error("[Groq] Error:", res.status, errText);
        return { error: res.status === 429 ? "RATE_LIMIT" : "API_ERROR", detail: errText, status: res.status };
    }

    const data = await res.json();
    const reply = data?.choices?.[0]?.message?.content || "No pude generar una respuesta. Intentá de nuevo.";
    return { reply, provider: "groq" };
}

// ─── GEMINI HANDLER (Vision / Image) ───────────────────────────────
async function callGemini(messages: any[], systemPrompt: string, apiKey: string) {
    console.log("[foodspot-ai] 👁️ Routing to GEMINI (vision/image)");

    // Build Gemini multimodal format
    const contents = messages.map((msg: any) => {
        const parts: any[] = [];
        if (msg.content) parts.push({ text: msg.content });
        if (msg.image) {
            parts.push({
                inlineData: {
                    mimeType: msg.image.mimeType || "image/jpeg",
                    data: msg.image.data,
                },
            });
        }
        return {
            role: msg.role === "assistant" ? "model" : "user",
            parts,
        };
    });

    const geminiBody = {
        contents,
        system_instruction: systemPrompt ? { parts: [{ text: systemPrompt }] } : undefined,
        generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 4096,
            topP: 0.9,
        },
    };

    // Call Gemini API — only gemini-2.0-flash-001
    const MODELS = [
        "gemini-2.0-flash-001",
    ];

    let geminiRes: Response | undefined;
    let lastStatus = 500;
    let errText = "Unknown error";

    for (const model of MODELS) {
        let retries = 1;

        while (retries >= 0) {
            console.log(`[Gemini] Trying model: ${model} (retries left: ${retries})`);
            const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
            geminiRes = await fetch(
                url,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "x-goog-api-key": apiKey,
                    },
                    body: JSON.stringify(geminiBody),
                }
            );

            lastStatus = geminiRes.status;
            if (geminiRes.ok) break;

            if (geminiRes.status === 429 || geminiRes.status >= 500) {
                const delay = (2 - retries) * 1000;
                console.warn(`[Gemini] ${geminiRes.status} on ${model}, waiting ${delay}ms...`);
                await new Promise((r) => setTimeout(r, delay));
                retries--;
            } else {
                break;
            }
        }

        if (geminiRes && !geminiRes.ok) {
            errText = await geminiRes.text();
        }

        if (geminiRes?.ok) {
            console.log(`[Gemini] ✅ Success with model: ${model}`);
            const data = await geminiRes.json();
            const reply = data?.candidates?.[0]?.content?.parts?.[0]?.text || "No pude generar una respuesta. Intentá de nuevo.";
            return { reply, provider: "gemini" };
        }

        // 400 = payload error, don't try next model
        if (lastStatus === 400) {
            console.warn(`[Gemini] Payload error (400), aborting fallbacks...`);
            break;
        }

        console.warn(`[Gemini] Model ${model} failed with ${lastStatus}, trying next...`);
    }

    // All models exhausted
    return {
        error: lastStatus === 429 ? "RATE_LIMIT" : "API_ERROR",
        detail: lastStatus === 429
            ? "Los servidores de IA están saturados. Esperá 30 segundos y probá de vuelta."
            : `Gemini error (${lastStatus}): ${errText.substring(0, 300)}`,
        status: lastStatus,
    };
}

// ─── MAIN HANDLER ──────────────────────────────────────────────────
serve(async (req: Request) => {
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }

    try {
        const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
        const GROQ_API_KEY = Deno.env.get("GROQ_API_KEY");
        const HF_TOKEN = Deno.env.get("HF_TOKEN"); // Added Hugging Face proxy support

        const { messages, systemPrompt } = await req.json();

        if (!messages || !Array.isArray(messages) || messages.length === 0) {
            return new Response(
                JSON.stringify({ error: "BAD_REQUEST", detail: "Messages should be an array" }),
                { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        // ─── SPLIT-BRAIN DECISION ──────────────────────────────
        // Check if ANY message in the conversation contains an image
        const hasImage = messages.some((msg: any) => msg.image);

        let result;

        if (hasImage) {
            // IMAGE PATH → Gemini (vision required)
            if (!GEMINI_API_KEY) {
                return new Response(
                    JSON.stringify({ error: "MISSING_SECRET", detail: "Configurá GEMINI_API_KEY en Supabase secrets para usar visión." }),
                    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
                );
            }
            result = await callGemini(messages, systemPrompt, GEMINI_API_KEY);
        } else {
            // TEXT PATH → Groq first, Gemini fallback
            if (GROQ_API_KEY) {
                result = await callGroq(messages, systemPrompt, GROQ_API_KEY);

                // If Groq failed, fallback to Gemini
                if (result.error && GEMINI_API_KEY) {
                    console.warn(`[foodspot-ai] Groq failed (${result.error}), falling back to Gemini...`);
                    result = await callGemini(messages, systemPrompt, GEMINI_API_KEY);
                }
            } else if (GEMINI_API_KEY) {
                // No Groq key, use Gemini
                result = await callGemini(messages, systemPrompt, GEMINI_API_KEY);
            } else {
                return new Response(
                    JSON.stringify({ error: "MISSING_SECRET", detail: "Configurá GROQ_API_KEY o GEMINI_API_KEY en Supabase secrets." }),
                    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
                );
            }
        }

        // Return result (could be success or error)
        return new Response(
            JSON.stringify(result),
            { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );

    } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : "Unknown error";
        console.error("foodspot-ai error:", errorMessage);
        return new Response(
            JSON.stringify({ error: "INTERNAL", detail: errorMessage }),
            { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }
});
