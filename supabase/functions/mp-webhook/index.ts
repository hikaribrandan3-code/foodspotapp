// ============================================
// 💰 MERCADO PAGO WEBHOOK - PAYMENT CONFIRMATION
// ============================================
// This Edge Function receives IPN (Instant Payment Notification) from Mercado Pago
// When a payment is approved, it updates the order status to 'confirmado'
//
// Deploy: supabase functions deploy mp-webhook --no-verify-jwt
// ============================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";

// ============================================
// 🔐 HARDCODED TOKEN (MVP - Single Tenant)
// ============================================
// TODO: V2 - Fetch token dynamically from DB based on business_id
// When we have multiple tenants, we'll extract business_id from external_reference
// and query: SELECT mp_access_token FROM branding WHERE business_id = ?
const MP_ACCESS_TOKEN = "APP_USR-1652431596900171-020514-b0cb3aa04dfa8a6dbf4cf61569d80a3f-1911962862";

// CORS Headers
const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req: Request) => {
    // Handle CORS preflight
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }

    try {
        // ============================================
        // 1. PARSE WEBHOOK PAYLOAD
        // ============================================
        const url = new URL(req.url);

        // MP sends either query params (GET) or JSON body (POST)
        let type: string | null = null;
        let dataId: string | null = null;

        if (req.method === "GET") {
            // Query param format: ?type=payment&data.id=123456
            type = url.searchParams.get("type");
            dataId = url.searchParams.get("data.id");
        } else if (req.method === "POST") {
            // JSON body format: { type: "payment", data: { id: "123456" } }
            const body = await req.json();
            type = body.type;
            dataId = body.data?.id?.toString();
        }

        console.log(`🔔 Webhook received: type=${type}, data.id=${dataId}`);

        // ============================================
        // 2. FILTER: Only process payment notifications
        // ============================================
        if (type !== "payment" || !dataId) {
            console.log("⏭️ Ignoring non-payment notification");
            return new Response(
                JSON.stringify({ status: "ignored", reason: "not a payment notification" }),
                { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        // ============================================
        // 3. FETCH PAYMENT DETAILS FROM MERCADO PAGO
        // ============================================
        console.log(`📡 Fetching payment details for ID: ${dataId}`);

        const mpResponse = await fetch(`https://api.mercadopago.com/v1/payments/${dataId}`, {
            method: "GET",
            headers: {
                "Authorization": `Bearer ${MP_ACCESS_TOKEN}`,
                "Content-Type": "application/json",
            },
        });

        if (!mpResponse.ok) {
            const errorText = await mpResponse.text();
            console.error(`❌ MP API Error: ${mpResponse.status} - ${errorText}`);
            return new Response(
                JSON.stringify({ error: "Failed to fetch payment from MP", details: errorText }),
                { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        const payment = await mpResponse.json();
        console.log(`💳 Payment Status: ${payment.status}, External Ref: ${payment.external_reference}`);

        // ============================================
        // 4. EXTRACT ORDER ID FROM EXTERNAL REFERENCE
        // ============================================
        const orderId = payment.external_reference;

        if (!orderId) {
            console.error("❌ No external_reference found in payment");
            return new Response(
                JSON.stringify({ error: "Missing external_reference" }),
                { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        // ============================================
        // 5. CHECK PAYMENT STATUS
        // ============================================
        if (payment.status !== "approved") {
            console.log(`⏳ Payment not approved yet: ${payment.status}`);
            return new Response(
                JSON.stringify({ status: "pending", payment_status: payment.status }),
                { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        // ============================================
        // 6. UPDATE ORDER IN SUPABASE
        // ============================================
        console.log(`✅ Payment APPROVED! Updating order: ${orderId}`);

        const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
        const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

        const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

        const { data: updatedOrder, error: updateError } = await supabase
            .from("orders")
            .update({
                status: "confirmado",
                payment_id: dataId,
                paid_at: new Date().toISOString(),
                payment_status: "approved",
                mp_payment_data: {
                    id: payment.id,
                    status: payment.status,
                    status_detail: payment.status_detail,
                    payment_method_id: payment.payment_method_id,
                    payment_type_id: payment.payment_type_id,
                    transaction_amount: payment.transaction_amount,
                    date_approved: payment.date_approved,
                },
            })
            .eq("id", orderId)
            .select()
            .single();

        if (updateError) {
            console.error(`❌ Supabase Update Error:`, updateError);
            return new Response(
                JSON.stringify({ error: "Failed to update order", details: updateError.message }),
                { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        console.log(`🎉 Order #${updatedOrder.order_number} confirmed! Total: $${updatedOrder.total}`);

        // ============================================
        // 7. SUCCESS RESPONSE
        // ============================================
        return new Response(
            JSON.stringify({
                success: true,
                order_id: orderId,
                order_number: updatedOrder.order_number,
                status: "confirmado",
                payment_id: dataId,
            }),
            { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );

    } catch (err) {
        console.error("💥 Webhook Error:", err);
        return new Response(
            JSON.stringify({ error: "Internal server error", details: (err as Error).message }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }
});
