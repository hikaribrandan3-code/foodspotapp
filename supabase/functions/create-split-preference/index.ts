// ============================================
// 💳 CREATE SPLIT PREFERENCE - Festival Payment System
// ============================================
// Creates individual MP preferences for split payments
// Deploy: supabase functions deploy create-split-preference --no-verify-jwt
// ============================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req: Request) => {
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }

    try {
        const { split_id, amount, participant_name, business_id, table_number } = await req.json();

        if (!split_id || !amount || !business_id) {
            return new Response(
                JSON.stringify({ error: "Missing required fields" }),
                { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        console.log(`💳 [create-split-preference] Creating for split: ${split_id}, amount: ${amount}`);

        const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
        const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
        const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

        // Get split payment details
        const { data: split, error: splitError } = await supabase
            .from("split_payments")
            .select("*, ledger_id")
            .eq("id", split_id)
            .single();

        if (splitError || !split) {
            return new Response(
                JSON.stringify({ error: "Split payment not found" }),
                { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        // Get ledger and business details
        const { data: ledger, error: ledgerError } = await supabase
            .from("table_ledgers")
            .select("*, business_id")
            .eq("id", split.ledger_id)
            .single();

        if (ledgerError || !ledger) {
            return new Response(
                JSON.stringify({ error: "Ledger not found" }),
                { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        // Get business branding
        const { data: branding, error: brandingError } = await supabase
            .from("branding")
            .select("mp_access_token, business_name, slug")
            .eq("business_id", business_id)
            .single();

        if (brandingError || !branding?.mp_access_token) {
            return new Response(
                JSON.stringify({ error: "mp_not_configured", message: "Mercado Pago no configurado" }),
                { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        const accessToken = branding.mp_access_token;
        const businessName = branding.business_name || "Local";
        const slug = branding.slug || "";

        // Build preference
        const APP_BASE_URL = Deno.env.get("APP_BASE_URL") || "https://foodspot.app";
        const statusBase = slug ? `${APP_BASE_URL}/${slug}/status` : `${APP_BASE_URL}/status`;
        const WEBHOOK_URL = `${SUPABASE_URL}/functions/v1/mp-split-webhook`;

        const preferenceBody = {
            items: [{
                title: `Pedido Mesa ${ledger.table_number || '—'} - ${participant_name || 'Comensal'}`,
                quantity: 1,
                unit_price: Math.round(amount * 100) / 100,
                currency_id: "ARS"
            }],
            back_urls: {
                success: `${statusBase}?split_id=${split_id}&payment=success`,
                failure: `${statusBase}?split_id=${split_id}&payment=failure`,
                pending: `${statusBase}?split_id=${split_id}&payment=pending`
            },
            auto_return: "approved",
            external_reference: split_id,
            notification_url: WEBHOOK_URL,
            payer: {
                name: participant_name || "Comensal"
            }
        };

        console.log(`📡 Creating split preference:`, JSON.stringify(preferenceBody, null, 2));

        const mpResponse = await fetch("https://api.mercadopago.com/checkout/preferences", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${accessToken}`
            },
            body: JSON.stringify(preferenceBody)
        });

        const mpData = await mpResponse.json();

        if (!mpResponse.ok || !mpData.init_point) {
            console.error("❌ MP Split Preference Error:", mpData);
            return new Response(
                JSON.stringify({ error: "mp_error", message: "Error al crear pago", details: mpData }),
                { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        // Store preference ID
        await supabase
            .from("split_payments")
            .update({ 
                mp_preference_id: mpData.id,
                status: 'processing'
            })
            .eq("id", split_id);

        console.log(`✅ Split preference created: ${mpData.id}`);

        return new Response(
            JSON.stringify({
                init_point: mpData.init_point,
                preference_id: mpData.id
            }),
            { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );

    } catch (err) {
        console.error("💥 create-split-preference Error:", err);
        return new Response(
            JSON.stringify({ error: "Internal error", details: err.message }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }
});