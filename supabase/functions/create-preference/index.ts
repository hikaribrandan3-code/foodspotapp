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

    // Verify JWT / Auth header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
        return new Response(
            JSON.stringify({ error: "Unauthorized" }),
            { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
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
            .select('id, order_number, total, business_id, status')
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
            .select("mp_access_token, business_name, slug, currency")
            .eq("business_id", order.business_id)
            .single();

        if (brandingError || !branding?.mp_access_token) {
            return new Response(
                JSON.stringify({ error: "mp_not_configured" }),
                { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        const accessToken = branding.mp_access_token;
        const businessName = branding.business_name || "FoodSpot";

        const preferenceBody = {
            items: [{
                title: `Pedido #${order.order_number} - ${businessName}`,
                quantity: 1,
                unit_price: order.total,
                currency_id: branding.currency || "ARS"
            }],
            back_urls: {
                success: `https://foodspotapp.vercel.app/${branding.slug || 'demo'}/receipt?payment=success&order_id=${order.id}`,
                failure: `https://foodspotapp.vercel.app/${branding.slug || 'demo'}/receipt?payment=failure&order_id=${order.id}`,
                pending: `https://foodspotapp.vercel.app/${branding.slug || 'demo'}/receipt?payment=pending&order_id=${order.id}`
            },
            auto_return: "approved",
            external_reference: order.id,
            notification_url: WEBHOOK_URL
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
                sandbox_init_point: mpData.sandbox_init_point,
                redirect_url: mpData.sandbox_init_point || mpData.init_point,
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