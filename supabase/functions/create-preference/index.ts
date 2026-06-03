import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, x-business-id, x-guest-token, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const MERCADO_PAGO_API = "https://api.mercadopago.com/checkout/preferences";

serve(async (req: Request) => {
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }

    try {
        const payload = await req.json();
        const order_id = payload.order_id;

        if (!order_id) {
            return new Response(
                JSON.stringify({ error: "BAD_REQUEST", detail: "order_id required" }),
                { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
        const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
        const supabase = createClient(supabaseUrl, supabaseServiceKey);
        const WEBHOOK_URL = `${supabaseUrl}/functions/v1/mp-webhook`;

        const { data: order, error: orderError } = await supabase
            .from('orders')
            .select('id, order_number, total, business_id, status, customer_name, customer_phone')
            .eq('id', order_id)
            .single();

        if (orderError || !order) {
            return new Response(
                JSON.stringify({ error: "ORDER_NOT_FOUND", detail: orderError?.message }),
                { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        const { data: branding, error: brandingError } = await supabase
            .from('branding')
            .select("mp_access_token, business_name, slug, app_config")
            .eq("business_id", order.business_id)
            .single();

        if (brandingError || !branding?.mp_access_token) {
            return new Response(
                JSON.stringify({ error: "mp_not_configured" }),
                { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        // ── Free tier: enforce 30 MP orders/month limit ──────────────────
        const { data: limits, error: limitsError } = await supabase
            .rpc('check_tier_limits', { p_business_id: order.business_id });

        if (!limitsError && limits && !limits.can_pay) {
            console.warn(`🚫 [create-preference] Free tier limit reached for ${order.business_id}: ${limits.mp_used}/${limits.mp_limit}`);
            return new Response(
                JSON.stringify({
                    error: "mp_limit_reached",
                    message: `Límite mensual de pagos digitales alcanzado (${limits.mp_used}/${limits.mp_limit}). Actualiza a Pro para órdenes ilimitadas.`,
                    mp_used: limits.mp_used,
                    mp_limit: limits.mp_limit,
                    upgrade_required: true,
                }),
                { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }
        // ─────────────────────────────────────────────────────────────────

        const accessToken = branding.mp_access_token;
        const businessName = branding.business_name || "FoodSpot";

        const preferenceBody = {
            items: [{
                title: `Pedido #${order.order_number} - ${businessName}`,
                quantity: 1,
                unit_price: order.total / 100,
                currency_id: (branding.app_config as any)?.businessCurrency || "ARS"
            }],
            payer: {
                name: order.customer_name || "Guest",
                phone: {
                    area_code: "549",
                    number: order.customer_phone?.replace(/\D/g, '') || "1111111111"
                }
            },
            back_urls: {
                success: `https://foodspotapp.vercel.app/${branding.slug || 'demo'}/receipt?payment=success&order_id=${order.id}`,
                failure: `https://foodspotapp.vercel.app/${branding.slug || 'demo'}/receipt?payment=failure&order_id=${order.id}`,
                pending: `https://foodspotapp.vercel.app/${branding.slug || 'demo'}/receipt?payment=pending&order_id=${order.id}`
            },
            auto_return: "approved",
            external_reference: order.id,
            notification_url: WEBHOOK_URL,
            binary_mode: false,
            payment_methods: {
                excluded_payment_methods: [],
                excluded_payment_types: []
            }
        };

        const mpResponse = await fetch(MERCADO_PAGO_API, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${accessToken}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify(preferenceBody)
        });

        const mpData = await mpResponse.json();

        if (!mpResponse.ok || !mpData.init_point) {
            console.error("💥 Mercado Pago Error:", mpData);
            return new Response(
                JSON.stringify({ error: "MP_ERROR", detail: mpData }),
                { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        await supabase
            .from("orders")
            .update({ mp_preference_id: mpData.id })
            .eq("id", order.id);

        return new Response(
            JSON.stringify({
                init_point: mpData.init_point,
                preference_id: mpData.id
            }),
            { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );

    } catch (err) {
        console.error("💥 create-preference Error:", err);
        return new Response(
            JSON.stringify({ error: "Internal server error", details: err.message }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }
});