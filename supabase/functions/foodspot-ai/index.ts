/**
 * foodspot-ai: Baby Agentic AI — Data-Aware Business Advisor
 *
 * ROUTING:
 *   - TEXT ONLY → Groq (Llama 3.3 70B) — free, fast
 *   - IMAGE     → Google Gemini 2.0 Flash — vision
 *   - "plan"    → Plan Mode: deeper strategic analysis prompt
 *
 * CONTEXT:
 *   Fetches real business data (orders, menu) from Supabase RPCs
 *   and injects it into the system prompt so AI knows the actual business.
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-business-id",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// ─── PLAN MODE DETECTION ─────────────────────────────────────────────────
const PLAN_TRIGGERS = [
    /\bplan\b/i,
    /planifica/i,
    /estrategia/i,
    /strategy/i,
    /\bplanejamento\b/i,
    /me ayudes? a planear/i,
    /deep dive/i,
    /analiza en detalle/i,
    /como deberia/i,
    /que deberia hacer/i,
];

function isPlanMode(message: string): boolean {
    return PLAN_TRIGGERS.some((r) => r.test(message));
}

// ─── CONTEXT FETCHER ─────────────────────────────────────────────────────
async function fetchBusinessContext(businessId: string, supabase: any): Promise<string> {
    try {
        const [{ data: orders }, { data: menu }] = await Promise.all([
            supabase.rpc("get_ai_business_context", {
                p_business_id: businessId,
                p_days: 7,
            }),
            supabase.rpc("get_ai_menu_context", {
                p_business_id: businessId,
            }),
        ]);

        if (!orders?.has_data) {
            return ""; // New restaurant — no data yet
        }

        const lines: string[] = [];
        const fmt = (n: number) => `$${Math.round(n).toLocaleString("es-AR")} ARS`;

        // Revenue block
        lines.push(`📊 ÚLTIMOS ${orders.period_days} DÍAS:`);
        lines.push(`Ingresos: ${fmt(orders.revenue_total)} | Pedidos: ${orders.orders_total} | Ticket promedio: ${fmt(orders.avg_ticket)}`);

        // Growth
        if (orders.prev_revenue > 0) {
            const revGrowth = Math.round(((orders.revenue_total - orders.prev_revenue) / orders.prev_revenue) * 100);
            const ordGrowth = orders.prev_orders > 0
                ? Math.round(((orders.orders_total - orders.prev_orders) / orders.prev_orders) * 100)
                : null;
            lines.push(`vs período anterior: Ingresos ${revGrowth >= 0 ? "+" : ""}${revGrowth}%${ordGrowth !== null ? ` | Pedidos ${ordGrowth >= 0 ? "+" : ""}${ordGrowth}%` : ""}`);
        }

        // Peak
        if (orders.peak_hour !== null) {
            lines.push(`Pico: ${orders.peak_day || "N/D"} a las ${orders.peak_hour}:00 hs (${orders.peak_hour_count} pedidos)`);
        }

        // Top items
        if (orders.top_items?.length) {
            lines.push("\n🏆 TOP PRODUCTOS:");
            for (const item of orders.top_items.slice(0, 5)) {
                const revPct = orders.revenue_total > 0
                    ? Math.round((item.revenue / orders.revenue_total) * 100)
                    : 0;
                lines.push(`  • ${item.name}: ${item.units_sold} vendidos, ${fmt(item.revenue)} (${revPct}% de ingresos)`);
            }
        }

        // Order types
        if (orders.order_types?.length) {
            const types = orders.order_types.map((t: any) => `${t.type} ${t.count}`).join(" | ");
            lines.push(`\nTipos de pedido: ${types}`);
        }

        // Menu
        if (menu?.categories?.length) {
            lines.push(`\n🍽️ MENÚ: ${menu.total_active} productos activos en ${menu.categories.length} categorías`);
            for (const cat of menu.categories.slice(0, 4)) {
                const samples = cat.sample_items?.map((i: any) => i.name).join(", ") || "";
                lines.push(`  • ${cat.name}: ${cat.item_count} items${samples ? ` (${samples}...)` : ""}`);
            }
        }

        return lines.join("\n");
    } catch (err) {
        console.error("[context] fetch failed:", err);
        return "";
    }
}

// ─── SYSTEM PROMPT BUILDER ───────────────────────────────────────────────
function buildSystemPrompt(
    language: string,
    businessName: string,
    contextBlock: string,
    planMode: boolean
): string {
    const hasData = contextBlock.length > 0;

    const langInstruction: Record<string, string> = {
        es: "Responde SIEMPRE en español. Tono: directo, cálido, como un socio de negocios de confianza — no un chatbot.",
        en: "ALWAYS respond in English. Tone: direct, warm — like a trusted business partner, not a chatbot.",
        pt: "Responda SEMPRE em português. Tom: direto, caloroso — como um parceiro de negócios de confiança.",
    };

    const lang = langInstruction[language] || langInstruction.es;

    const noDataPrompt = `${lang}

Eres el asistente de IA de FoodSpot para "${businessName}". Este restaurante es nuevo y aún no tiene datos de ventas.

Tu rol:
- Ayuda al dueño a configurar su menú, precios y operaciones
- Da benchmarks de la industria para restaurantes similares
- Sé práctico y específico — no genérico
- Cuando no tengas datos, di "Basándome en datos de la industria..." o "Restaurantes similares generalmente..."
- NUNCA inventes números específicos de su negocio

Fecha actual: ${new Date().toISOString().split("T")[0]}`;

    if (!hasData) return noDataPrompt;

    const baseRules = `
━━━ CÓMO RESPONDER ━━━
1. SIEMPRE empieza mencionando sus datos reales. "Vi que..." o "Basándome en tus últimos ${7} días..."
2. Cita los números exactos del contexto. Ej: "tus hamburguesas hicieron 23 pedidos a las 8pm"
3. Sé conversacional — NO uses "### Título / Por qué / Cómo". Habla naturalmente.
4. Respuestas cortas (2-4 párrafos). Los dueños están ocupados.
5. Si preguntan algo que los datos no responden, di: "No tengo datos sobre eso, pero basándome en tu historial..."
6. NUNCA inventes números. Solo usa los del bloque de contexto.
7. Si el contexto muestra alertas de inventario bajo, mencionarlas proactivamente.

Fecha actual: ${new Date().toISOString().split("T")[0]}`;

    const planModeExtra = planMode ? `

━━━ MODO PLAN ACTIVADO ━━━
El dueño quiere un análisis estratégico profundo. Para esta respuesta:
- Da 3-5 recomendaciones específicas y priorizadas
- Basa CADA recomendación en sus datos reales
- Incluye impacto esperado estimado para cada acción
- Formato natural pero más detallado — esto es para tomar decisiones importantes
- Termina con: "Acción más importante esta semana: [1 cosa concreta]"` : "";

    return `${lang}

Eres el asesor de IA de FoodSpot para "${businessName}". Tenés acceso a sus datos reales de negocio. Tu trabajo es ayudarlos a tomar mejores decisiones.

━━━ DATOS DEL NEGOCIO ━━━
${contextBlock}
${baseRules}${planModeExtra}`;
}

// ─── GROQ CALLER ─────────────────────────────────────────────────────────
async function callGroq(
    messages: any[],
    systemPrompt: string,
    apiKey: string
): Promise<{ reply: string; provider: string } | { error: string; detail?: string }> {
    console.log("[foodspot-ai] 🧠 Routing to GROQ");

    const groqMessages = [
        { role: "system", content: systemPrompt },
        ...messages.map((m: any) => ({
            role: m.role === "assistant" ? "assistant" : "user",
            content: m.content || "",
        })),
    ];

    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
            model: "llama-3.3-70b-versatile",
            messages: groqMessages,
            temperature: 0.65,
            max_tokens: 1500,
            top_p: 0.9,
        }),
    });

    if (!res.ok) {
        const errText = await res.text();
        return { error: res.status === 429 ? "RATE_LIMIT" : "API_ERROR", detail: errText };
    }

    const data = await res.json();
    const reply = data?.choices?.[0]?.message?.content || "No pude generar una respuesta. Intentá de nuevo.";
    return { reply, provider: "groq" };
}

// ─── GEMINI CALLER ────────────────────────────────────────────────────────
async function callGemini(
    messages: any[],
    systemPrompt: string,
    apiKey: string
): Promise<{ reply: string; provider: string } | { error: string; detail?: string }> {
    console.log("[foodspot-ai] 👁️ Routing to GEMINI");

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
        return { role: msg.role === "assistant" ? "model" : "user", parts };
    });

    const body = {
        contents,
        system_instruction: { parts: [{ text: systemPrompt }] },
        generationConfig: { temperature: 0.65, maxOutputTokens: 1500, topP: 0.9 },
    };

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-001:generateContent?key=${apiKey}`;
    const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
    });

    if (!res.ok) {
        const errText = await res.text();
        return { error: res.status === 429 ? "RATE_LIMIT" : "API_ERROR", detail: errText };
    }

    const data = await res.json();
    const reply = data?.candidates?.[0]?.content?.parts?.[0]?.text || "No pude generar una respuesta. Intentá de nuevo.";
    return { reply, provider: "gemini" };
}

// ─── MAIN ─────────────────────────────────────────────────────────────────
serve(async (req: Request) => {
    if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

    try {
        const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
        const GROQ_API_KEY = Deno.env.get("GROQ_API_KEY");
        const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
        const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

        const { messages, systemPrompt: _legacy, businessId, language = "es", businessName: bodyName } = await req.json();
        const resolvedBusinessId = businessId || req.headers.get("x-business-id");

        if (!messages || !Array.isArray(messages) || messages.length === 0) {
            return new Response(
                JSON.stringify({ error: "BAD_REQUEST", detail: "messages must be a non-empty array" }),
                { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        // Last user message (used for plan mode detection)
        const lastUserMsg = [...messages].reverse().find((m: any) => m.role === "user")?.content || "";
        const planMode = isPlanMode(lastUserMsg);
        if (planMode) console.log("[foodspot-ai] 🗺️ Plan Mode activated");

        // ── FETCH BUSINESS CONTEXT ─────────────────────────────────────
        let contextBlock = "";
        if (resolvedBusinessId) {
            const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
            contextBlock = await fetchBusinessContext(resolvedBusinessId, supabase);
        }

        const businessName = bodyName || "tu restaurante";

        // ── BUILD SYSTEM PROMPT ────────────────────────────────────────
        const builtPrompt = buildSystemPrompt(language, businessName, contextBlock, planMode);

        // ── ROUTE TO LLM ───────────────────────────────────────────────
        const hasImage = messages.some((m: any) => m.image);
        let result: any;

        if (hasImage) {
            if (!GEMINI_API_KEY) {
                return new Response(
                    JSON.stringify({ error: "MISSING_SECRET", detail: "Configure GEMINI_API_KEY for vision." }),
                    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
                );
            }
            result = await callGemini(messages, builtPrompt, GEMINI_API_KEY);
        } else if (GROQ_API_KEY) {
            result = await callGroq(messages, builtPrompt, GROQ_API_KEY);
            if (result.error && GEMINI_API_KEY) {
                console.warn(`[foodspot-ai] Groq failed (${result.error}), falling back to Gemini`);
                result = await callGemini(messages, builtPrompt, GEMINI_API_KEY);
            }
        } else if (GEMINI_API_KEY) {
            result = await callGemini(messages, builtPrompt, GEMINI_API_KEY);
        } else {
            return new Response(
                JSON.stringify({ error: "MISSING_SECRET", detail: "Configure GROQ_API_KEY or GEMINI_API_KEY." }),
                { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        return new Response(
            JSON.stringify({ ...result, planMode }),
            { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );

    } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Unknown error";
        console.error("foodspot-ai error:", msg);
        return new Response(
            JSON.stringify({ error: "INTERNAL", detail: msg }),
            { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }
});
