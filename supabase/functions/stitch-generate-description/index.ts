/**
 * stitch-generate-description
 * Generates appetizing menu item descriptions + calorie estimates via AI.
 *
 * Uses Groq (Llama 3 70B) as the default provider since it's already
 * configured in the project. Falls back gracefully on failure.
 *
 * POST body: {
 *   menu_item_id: string,
 *   menu_item_name: string,
 *   category: string,
 *   current_description?: string
 * }
 *
 * Returns: { description: string, calories: number, success: boolean }
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-guest-token",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface RequestBody {
  menu_item_id: string;
  menu_item_name: string;
  category: string;
  current_description?: string;
}

async function callGroq(name: string, category: string, currentDesc: string, apiKey: string) {
  const systemPrompt = `You are a professional restaurant menu copywriter. Write short, appetizing food descriptions (max 100 words) that make customers hungry. Also estimate calories per serving as a single integer. Respond ONLY in this JSON format: {"description": "...", "calories": 420}`;

  const userPrompt = `Menu item: ${name}\nCategory: ${category}\nCurrent description: ${currentDesc || "None"}\n\nWrite a new description and estimate calories.`;

  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "llama-3.3-70b-versatile",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.8,
      max_tokens: 512,
      top_p: 0.95,
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Groq API error ${res.status}: ${errText}`);
  }

  const data = await res.json();
  const content = data.choices?.[0]?.message?.content || "";

  // Try to parse JSON from the response
  try {
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        description: parsed.description || content,
        calories: Number(parsed.calories) || 0,
      };
    }
  } catch {
    // Fallback: return raw content as description
  }

  return {
    description: content.replace(/\{[\s\S]*\}/, "").trim() || content,
    calories: 0,
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body: RequestBody = await req.json();
    const { menu_item_name, category, current_description } = body;

    if (!menu_item_name || !category) {
      return new Response(
        JSON.stringify({
          description: current_description || "",
          calories: 0,
          success: false,
          error: "Missing menu_item_name or category",
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const groqKey = Deno.env.get("GROQ_API_KEY");
    if (!groqKey) {
      return new Response(
        JSON.stringify({
          description: current_description || "",
          calories: 0,
          success: false,
          error: "GROQ_API_KEY not configured",
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const result = await callGroq(menu_item_name, category, current_description || "", groqKey);

    return new Response(
      JSON.stringify({
        description: result.description,
        calories: result.calories,
        success: true,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("[stitch-generate-description] Error:", err);
    return new Response(
      JSON.stringify({
        description: "",
        calories: 0,
        success: false,
        error: err.message || "Unknown error",
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
