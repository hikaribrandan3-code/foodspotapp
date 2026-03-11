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

        // ─── Black Label Visual Switchboard v16.0 ───
        const lc = prompt.toLowerCase();
        let vibeFrame = "";

        if (/sushi|lobster|fancy|omakase|steak|dine|wine|filet|truffle|risotto/i.test(lc)) {
            vibeFrame = "Minimalist luxury plating, soft candlelight, expensive bokeh, fine dining, 85mm portrait lens, 8k raw photo, photorealistic.";
        } else if (/anime|manga|comic|illustration|otaku|kawaii/i.test(lc)) {
            vibeFrame = "Elite digital art, cinematic anime poster, vibrant colors, clean lines, professional illustration, studio quality.";
        } else if (/techno|club|rave|reggaeton|dj|nightlife|neon|party/i.test(lc)) {
            vibeFrame = "Neon lasers, nightclub haze, crowd silhouettes, deep purple and blue lighting, cinematic wide angle, 8k.";
        } else if (/beach|pool|sunset|girls|bar|summer|tropical|cocktail/i.test(lc)) {
            vibeFrame = "Golden hour photography, sun-kissed, refreshing atmosphere, summer vibe, warm tones, bokeh depth, 8k raw photo.";
        } else if (/burger|taco|street|pizza|fries|hot dog|wings|nugget|sandwich/i.test(lc)) {
            vibeFrame = "Gourmet fast food, sizzling, steam, high contrast street lighting, extreme close-up, 8k raw photo, photorealistic.";
        } else if (/rock|concert|festival|stage|band|metal/i.test(lc)) {
            vibeFrame = "Massive stage lighting, atmospheric smoke, epic crowd silhouettes, dramatic wide angle, concert photography, 8k.";
        } else {
            vibeFrame = "Extreme macro food photography, center-weighted composition, 85mm portrait lens, f/1.8, dramatic cinematic lighting, rim light highlights, glistening textures, steam, bokeh depth, 8k raw photo, photorealistic.";
        }

        const finalPrompt = `${vibeFrame} ${prompt}`;
        console.log(`[foodspot-image] Vibe Frame applied. Final Prompt: "${finalPrompt}"`);

        const hfRes = await fetch("https://router.huggingface.co/hf-inference/models/stabilityai/stable-diffusion-xl-base-1.0", {
            headers: {
                "Authorization": `Bearer ${hfToken}`,
                "Content-Type": "application/json",
            },
            method: "POST",
            body: JSON.stringify({
                inputs: finalPrompt,
                parameters: {
                    negative_prompt: "text, watermark, signature, blurry, low quality, deformed, distorted, disfigured, bad anatomy, extra limbs"
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
