import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { encode } from "https://deno.land/std@0.168.0/encoding/base64.ts";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req) => {
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }

    try {
        const { prompt } = await req.json();
        const hfToken = Deno.env.get("HF_TOKEN");

        if (!prompt) {
            return new Response(JSON.stringify({ error: "No prompt provided" }), {
                status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" }
            });
        }

        if (!hfToken) {
            console.error("Missing HF_TOKEN in Supabase secrets");
            return new Response(JSON.stringify({ error: "Missing API Key" }), {
                status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" }
            });
        }

        console.log(`[foodspot-image] Generating image via HF SDXL. Original Prompt: "${prompt}"`);

        // Anti-Creepy Shield v7.0
        const finalPrompt = `Professional food photography, close up, gourmet lighting, blurred background, no people, no faces, no hands. ${prompt} --negative people, face, human, fingers, distorted, text, low quality`;

        const hfRes = await fetch("https://router.huggingface.co/hf-inference/models/stabilityai/stable-diffusion-xl-base-1.0", {
            headers: {
                "Authorization": `Bearer ${hfToken}`,
                "Content-Type": "application/json",
            },
            method: "POST",
            body: JSON.stringify({
                inputs: finalPrompt,
                parameters: {
                    negative_prompt: "people, face, human, fingers, distorted, text, low quality"
                }
            }),
        });

        if (!hfRes.ok) {
            const err = await hfRes.text();
            console.error("[foodspot-image] HF API Error:", err);
            return new Response(JSON.stringify({ error: "IMAGE_GENERATION_FAILED", details: err }), {
                status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" }
            });
        }

        const arrayBuffer = await hfRes.arrayBuffer();
        const base64 = encode(arrayBuffer);

        console.log("[foodspot-image] Successfully generated and encoded image.");

        return new Response(JSON.stringify({ image: `data:image/jpeg;base64,${base64}` }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });

    } catch (err) {
        console.error("[foodspot-image] Internal Error:", err.message);
        return new Response(JSON.stringify({ error: "INTERNAL_SERVER_ERROR", details: err.message }), {
            status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
    }
});
