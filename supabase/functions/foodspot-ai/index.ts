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
    "Access-Control-Allow-Headers": "*",
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

// ─── CURRENCY CONFIG (mirrors src/utils/currency.js) ─────────────────────
const CURRENCY_CONFIG: Record<string, { locale: string; symbol: string }> = {
    ARS: { locale: "es-AR", symbol: "$"  },
    USD: { locale: "en-US", symbol: "$"  },
    BRL: { locale: "pt-BR", symbol: "R$" },
    CLP: { locale: "es-CL", symbol: "$"  },
    COP: { locale: "es-CO", symbol: "$"  },
    MXN: { locale: "es-MX", symbol: "$"  },
    PEN: { locale: "es-PE", symbol: "S/" },
    UYU: { locale: "es-UY", symbol: "$"  },
};

// ─── CONTEXT FETCHER ─────────────────────────────────────────────────────
async function fetchBusinessContext(businessId: string, supabase: any): Promise<{ context: string; currency: string }> {
    try {
        const [{ data: orders }, { data: menu }, { data: inventory }, { data: branding }] = await Promise.all([
            supabase.rpc("get_ai_business_context", {
                p_business_id: businessId,
                p_days: 7,
            }),
            supabase.rpc("get_ai_menu_context", {
                p_business_id: businessId,
            }),
            supabase.rpc("get_ai_inventory_context", {
                p_business_id: businessId,
            }),
            supabase
                .from("branding")
                .select("app_config")
                .eq("business_id", businessId)
                .single(),
        ]);

        const currency: string = branding?.app_config?.businessCurrency || "ARS";

        if (!orders?.has_data) {
            return { context: "", currency };
        }

        const lines: string[] = [];
        const cfg = CURRENCY_CONFIG[currency] || CURRENCY_CONFIG.ARS;
        const fmt = (n: number) =>
            `${cfg.symbol}${Math.round(n / 100).toLocaleString(cfg.locale)} ${currency}`;

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

        // Menu with full item details
        if (menu?.categories?.length) {
            lines.push(`\n🍽️ MENÚ: ${menu.total_active} activos en ${menu.categories.length} categorías`);

            // Menu stats — avg_price already in pesos from SQL (AVG/100), others are counts
            if (menu.stats) {
                const s = menu.stats;
                const avgFormatted = `${cfg.symbol}${Math.round(s.avg_price).toLocaleString(cfg.locale)} ${currency}`;
                const stats_line = [
                    `${s.active_items} items`,
                    `Precio promedio: ${avgFormatted}`,
                    `${s.spicy_items} picantes`,
                    `${s.vegan_items} veganos`,
                    `${s.gluten_free_items} sin TACC`,
                    `${s.featured_items} especiales`
                ].filter(x => x).join(" | ");
                lines.push(`  ${stats_line}`);
            }

            for (const cat of menu.categories.slice(0, 5)) {
                lines.push(`  📌 ${cat.name} (${cat.item_count} items):`);
                if (cat.items?.length) {
                    for (const item of cat.items.slice(0, 6)) {
                        const tags = item.active_tags?.length ? ` [${item.active_tags.join(", ")}]` : "";
                        const cal = item.calories ? ` • ${Math.round(item.calories)} cal` : "";
                        lines.push(`    • ${item.name}: ${fmt(item.price)}${cal}${tags}`);
                    }
                }
            }
        }

        // Inventory
        if (inventory?.has_data) {
            lines.push(`\n📦 INVENTARIO (${inventory.total_tracked_items} items rastreados):`);

            if (inventory.out_of_stock?.length) {
                const names = inventory.out_of_stock.map((i: any) => i.name).join(", ");
                lines.push(`  🔴 SIN STOCK: ${names}`);
            }

            if (inventory.low_stock?.length) {
                lines.push(`  🟡 STOCK BAJO (reabastecer pronto):`);
                for (const item of inventory.low_stock.slice(0, 5)) {
                    lines.push(`    • ${item.name}: ${item.qty} ${item.unit || "unidades"} (mín. ${item.reorder_at})`);
                }
            }

            if (!inventory.out_of_stock?.length && !inventory.low_stock?.length) {
                lines.push(`  ✅ Todo el inventario en niveles saludables`);
            }

            if (inventory.total_cogs_value > 0) {
                lines.push(`  Valor total en stock: ${fmt(inventory.total_cogs_value)}`);
            }
        }

        return { context: lines.join("\n"), currency };
    } catch (err) {
        console.error("[context] fetch failed:", err);
        return { context: "", currency: "ARS" };
    }
}

// ─── SYSTEM PROMPT BUILDER ───────────────────────────────────────────────
function buildSystemPrompt(
    language: string,
    businessName: string,
    contextBlock: string,
    currency: string,
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
━━━ MONEDA ━━━
La moneda de este negocio es ${currency}. Todos los precios en el contexto ya están convertidos a ${currency}.
Muéstralos tal como aparecen — sin decimales, sin dividir. Ej: "$1.500 ${currency}" no "$15.00".

━━━ CÓMO RESPONDER ━━━
1. SIEMPRE empieza mencionando sus datos reales. "Vi que..." o "Basándome en tus últimos ${7} días..."
2. Cita los números exactos del contexto. Ej: "tus hamburguesas hicieron 23 pedidos a las 8pm"
3. FORMATO: Usa bullets (• o -) para puntos clave. Cada insight debe ser escaneable en mobile.
4. ESTRUCTURA: Insight → Por qué importa → Acción. Máximo 3-4 bullets por respuesta.
5. Si preguntan algo que los datos no responden, di: "No tengo datos sobre eso, pero basándome en tu historial..."
6. NUNCA inventes números. Solo usa los del bloque de contexto.
7. Si el contexto muestra alertas de inventario bajo, mencionarlas proactivamente.
8. Tono conversacional, pero directo. Los dueños están ocupados y leen en el celular.

Fecha actual: ${new Date().toISOString().split("T")[0]}`;

    const motivationalSupport = `
━━━ APOYO MOTIVACIONAL & OPORTUNIDAD DE CRECIMIENTO ━━━
Si el mensaje del dueño sugiere que está teniendo una semana difícil, desanimado, o luchando:

1. RECONOCE CON EMPATÍA: "Vi que las cosas no van tan bien esta semana. Eso pasa — todos tenemos días difíciles en este negocio."

2. ENVÍA UN VERSÍCULO (elige uno que encaje):
   OPCIÓN 1: "Proverbios 22:29 — 'Ves a alguien diligente en su trabajo? Servirá ante reyes'"
   OPCIÓN 2: "Filipenses 4:13 — 'Todo lo puedo en Cristo que me fortalece'"
   OPCIÓN 3: "Isaías 40:31 — 'Pero los que esperan en el Señor renovarán sus fuerzas'"
   OPCIÓN 4: "Proverbios 24:3 — 'Con sabiduría se edifica la casa, y con prudencia se afirma'"
   OPCIÓN 5: "1 Tesalonicenses 5:11 — 'Por lo tanto, anímense y edifíquense mutuamente'"
   OPCIÓN 6: "Eclesiástes 9:10 — 'Todo lo que te viniere a la mano, hazlo según tus fuerzas'"
   OPCIÓN 7: "Salmos 27:10 — 'Aunque mi padre y mi madre me abandonen, el Señor me levantará'"
   (Elige el que mejor encaje con su situación — puede sonar natural en la conversación)

3. PIVOTA A LA SOLUCIÓN: "Pero acá está lo importante: tenés las herramientas correctas para cambiar esto."

4. MUESTRA LA MATEMÁTICA: "Si hostearas 1 evento por semana con 30-50 personas (DJ night, speed dating, karaoke), eso son fácilmente +$900-1200 en revenue extra. Y lo mejor: no es tu trabajo."

5. EL CAMINO FÁCIL: "Tus empleados probablemente tienen amigos DJ, artistas, o quieren organizar un evento. Vos solo apruebs, ellos lo manejan. Vos provides espacio + pizzas de promoción."

6. CIERRA CON CONFIANZA: "Primera semana trae gente curiosa. Semana 4? Ya es rutina. Gente que viene todos los viernes. Eso cambia todo."

Mantén el tono conversacional, no predicador. El versículo es el ancla emocional — el sistema de eventos es la solución práctica.`;

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
${baseRules}
${motivationalSupport}${planModeExtra}`;
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
        let businessCurrency = "ARS";
        if (resolvedBusinessId) {
            const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
            const { context, currency } = await fetchBusinessContext(resolvedBusinessId, supabase);
            contextBlock = context;
            businessCurrency = currency;
        }

        const businessName = bodyName || "tu restaurante";

        // ── BUILD SYSTEM PROMPT ────────────────────────────────────────
        const builtPrompt = buildSystemPrompt(language, businessName, contextBlock, businessCurrency, planMode);

        // ── ROUTE TO LLM (GROQ ONLY) ───────────────────────────────────
        if (!GROQ_API_KEY) {
            return new Response(
                JSON.stringify({ error: "MISSING_SECRET", detail: "Configure GROQ_API_KEY." }),
                { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        const result = await callGroq(messages, builtPrompt, GROQ_API_KEY);

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
