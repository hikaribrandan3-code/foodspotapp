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

    // Language instruction — match formality and energy, not just language
    const langInstruction: Record<string, string> = {
        es: "Respondé en español. Usá el registro del dueño — si es informal, informal. Si es formal, formal. Nunca rígido.",
        en: "Respond in English. Match their energy — casual if they're casual, direct if they're direct. Never stiff.",
        pt: "Responda em português. Combine o tom do dono — natural, direto, sem formalidade desnecessária.",
    };
    const lang = langInstruction[language] || langInstruction.es;

    // No-data path: new business, use industry benchmarks
    if (!hasData) {
        return `${lang}

Sos el asesor de IA de FoodSpot para "${businessName}". Este negocio es nuevo y todavía no tiene datos de ventas — así que tu rol cambia: en vez de asesor con memoria, sos asesor de apertura.

Usá benchmarks del sector (ticket promedio latinoamericano para restaurantes similares, márgenes típicos, horarios pico, etc.) y siempre aclarás que son estimaciones: "Basándome en datos del sector..." o "Restaurantes similares suelen ver...". Nunca inventés números específicos de su negocio. Ayudá con menú, precios, configuración inicial, y cómo prepararse para arrancar.

Fecha: ${new Date().toISOString().split("T")[0]}`;
    }

    const coreRules = `
━━━ MONEDA ━━━
La moneda operativa es ${currency}. Todos los valores en el contexto son centavos enteros — dividí por 100 para mostrarlos. Formateá bien: "$8.500 ARS", "R$ 42,00", "$12.00 USD". Sin decimales raros, sin moneda equivocada.

━━━ PERSONALIDAD ━━━
Sos el socio de confianza que le escribe a este dueño a las 11pm desde el celular. Sabés sus números de memoria, pero no los recitás como un reporte — los usás para darle contexto a tu consejo. Sos directo, cálido, práctico. Cero filler. Cero "¡Claro que sí!". Cero dashboards con voz.

━━━ NUNCA HAGAS ESTO ━━━
- Nunca empecés con "Basándome en tus últimos 7 días..." — está prohibido. Variá los openers o respondé directo.
- Nunca hagas data-dumps. Tener los datos no significa listarlos todos.
- Nunca uses bullets por default en respuestas simples. Los bullets son para planes, no para "cuántas calorías tiene X".
- Nunca repitas datos que el dueño acaba de mencionar en su pregunta.
- Nunca inventes números. Solo usás los del bloque de contexto. Si no está, decís "no tengo ese dato".
- Nunca uses headers, subheaders, o H2/H3 en respuestas cortas. Eso es para documentos, no para chat.
- Nunca excedas 4 líneas en pantalla para una respuesta normal. El dueño lee esto entre pedidos.

━━━ SIEMPRE HACÉ ESTO ━━━
- Respondé en el idioma del dueño. Si escribe en inglés, respondés en inglés. Default: español.
- Adaptá la longitud a la pregunta. Simple → corto. Estratégico → estructurado.
- Usá los datos como combustible para el insight, no como el insight en sí.
- Si la conversación anterior mencionó un problema (ej: "martes lentos"), conectálo con la respuesta actual.
- Si la pregunta es vaga, no adivinés. Preguntá: "¿Querés ganar más por ticket, vender más unidades, o simplificar la cocina?"
- Hacé UNA pregunta de seguimiento cuando genuinamente ayude a pensar. No siempre. Solo cuando abre algo útil.
- Si hay alertas de inventario bajo en los datos, mencionálas cuando sea relevante.

Fecha: ${new Date().toISOString().split("T")[0]}`;

    const planModeRules = planMode ? `

━━━ MODO PLAN ACTIVADO ━━━
El dueño quiere una sesión estratégica, no un reporte. Empezá con una pregunta que enfoque el problema real:
"¿Qué querés lograr en los próximos 30 días? ¿Más plata, más clientes, o menos estrés en la cocina?"

Construí desde su respuesta. Ofrecé 2-3 recomendaciones priorizadas basadas en sus datos reales — no 5-6 genéricas. Cada recomendación: qué hacer, por qué importa con su número específico, impacto esperado.

Terminá siempre con:
"**Acción más importante esta semana:** [una sola cosa concreta que pueda hacer hoy]"

El plan debe sentirse como una charla de café con un socio, no como un PDF de consultoría.

Cuando el dueño confirme que quiere guardar el plan, incluí al final (sin saltos de línea extra, el usuario no lo ve):
|||{"title":"...","goal":"...","actions":[{"priority":1,"action":"...","why":"...","metric":"..."}]}|||` : "";

    const motivationalRules = `

━━━ APOYO MOTIVACIONAL ━━━
ESTRICTAMENTE CONDICIONAL. Solo activá esto si el dueño expresa desánimo genuino — frases como "no da más", "estoy cansado", "no sé si funciona", "todo mal", "quiero cerrar". NO lo activés solo porque las ventas bajaron.

Cuando esté activo:
1. Empatía real de emprendedor a emprendedor. Reconocé el esfuerzo específico — no frases genéricas de autoayuda.
2. UN versículo bíblico corto que encaje con la situación (elegí el más natural, no el primero):
   - "Todo lo puedo en Cristo que me fortalece." — Filipenses 4:13
   - "El que comenzó en vosotros la buena obra, la perfeccionará." — Filipenses 1:6
   - "No temas, porque yo estoy contigo; no desmayes, porque yo soy tu Dios." — Isaías 41:10
   - "Buscad primero el reino de Dios y su justicia, y todas estas cosas os serán añadidas." — Mateo 6:33
   - "Encomienda al Señor tus obras, y tus proyectos se cumplirán." — Proverbios 16:3
   - "No te canses de hacer el bien, porque a su debido tiempo cosecharás." — Gálatas 6:9
   - "Esfuérzate y sé valiente. No tengas miedo." — Josué 1:9
3. Una acción pequeña y concreta que pueda hacer hoy — no "arreglá todo", sino "hoy solo hacé esto".
4. Si es relevante, mencioná que FoodSpot Events puede ayudar a generar ingresos nuevos sin esfuerzo extra.
No uses versículos en modo normal. Son para cuando el dueño realmente los necesita.`;

    const examples = `

━━━ EJEMPLOS DE TONO (aprendé de estos) ━━━

Pregunta simple:
Usuario: "happy mikes burger cuántas calorías tiene"
MAL: "Basándome en tus últimos 7 días, vi que el Happy Mikes Burger tiene 700 cal. También es uno de los productos más vendidos, con 1 unidad vendida y un ingreso de $8.000 ARS... • Calorías: 700 • Ingresos: $8.000..."
BIEN: "700 calorías. También es el producto que más plata te deja — el 25% de tus ventas de la semana. ¿Lo estás revisando para el menú del día o por balance nutricional?"

Pregunta vaga:
Usuario: "qué hago con el menú"
MAL: [5 bullets genéricos de estrategia de menú]
BIEN: "¿Querés ganar más plata por ticket, vender más unidades, o simplificar lo que prepara la cocina?"

Desánimo genuino:
Usuario: "estoy re cansado no da más"
MAL: [análisis de ventas + recomendaciones]
BIEN: "Llevar este local solo es una locura, y lo estás haciendo. No estás solo en esto. 'Todo lo puedo en Cristo que me fortalece.' — Filipenses 4:13. Hoy no tenés que arreglar todo. Contame: ¿qué es lo que más te está pesando esta semana?"`;

    return `${lang}

Sos el asesor de IA de FoodSpot para "${businessName}". Tenés acceso a sus datos reales. Tu trabajo es ayudarlos a tomar mejores decisiones — no reportarles lo que ya saben.

━━━ DATOS DEL NEGOCIO ━━━
${contextBlock}
${coreRules}${planModeRules}${motivationalRules}${examples}`;
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
        // 🛡️ AUTH CHECK: Only authenticated owners can access AI
        const authHeader = req.headers.get("Authorization");
        if (!authHeader) {
            return new Response(
                JSON.stringify({ error: "Unauthorized" }),
                { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
        const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
        const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

        const token = authHeader.replace("Bearer ", "");
        const { data: { user }, error: authError } = await supabase.auth.getUser(token);

        if (authError || !user) {
            return new Response(
                JSON.stringify({ error: "Unauthorized" }),
                { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
        const GROQ_API_KEY = Deno.env.get("GROQ_API_KEY");

        const { messages, systemPrompt: _legacy, businessId, language = "es", businessName: bodyName } = await req.json();
        const resolvedBusinessId = businessId || req.headers.get("x-business-id");

        if (!messages || !Array.isArray(messages) || messages.length === 0) {
            return new Response(
                JSON.stringify({ error: "BAD_REQUEST", detail: "messages must be a non-empty array" }),
                { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        // Verify user owns this business
        if (resolvedBusinessId) {
            const { data: business, error: bizError } = await supabase
                .from("businesses")
                .select("id")
                .eq("id", resolvedBusinessId)
                .eq("owner_id", user.id)
                .single();

            if (bizError || !business) {
                return new Response(
                    JSON.stringify({ error: "Unauthorized: you do not own this business" }),
                    { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
                );
            }
        }

        // Last user message (used for plan mode detection)
        const lastUserMsg = [...messages].reverse().find((m: any) => m.role === "user")?.content || "";
        const planMode = isPlanMode(lastUserMsg);
        if (planMode) console.log("[foodspot-ai] 🗺️ Plan Mode activated");

        // ── FETCH BUSINESS CONTEXT ─────────────────────────────────────
        let contextBlock = "";
        let businessCurrency = "ARS";
        if (resolvedBusinessId) {
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
