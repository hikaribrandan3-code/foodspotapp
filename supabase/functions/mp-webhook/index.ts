// ============================================
// 💰 MERCADO PAGO WEBHOOK - VAULT-SEAL V6
// ============================================
// Security Level: 🛡️ HIGH (HMAC + Idempotency + Multi-Tenant)
//
// Deploy: supabase functions deploy mp-webhook --no-verify-jwt
// ============================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";
import { hmac } from "https://deno.land/x/hmac@v2.0.1/mod.ts";

// CORS Headers
const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-signature, x-request-id",
};

serve(async (req: Request) => {
    // Handle CORS preflight
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }

    try {
        const url = new URL(req.url);

        // ============================================
        // 1. HMAC SIGNATURE VERIFICATION (Defense in Depth)
        // ============================================
        const signature = req.headers.get("x-signature");
        const requestId = req.headers.get("x-request-id");
        const MP_WEBHOOK_SECRET = Deno.env.get("MP_WEBHOOK_SECRET");

        // Request Body Parsing
        const rawBody = await req.text();
        let body;
        try {
            body = JSON.parse(rawBody);
        } catch (e) {
            console.error("❌ Failed to parse JSON body");
            return new Response(JSON.stringify({ error: "Invalid JSON" }), { status: 400, headers: corsHeaders });
        }

        let dataId: string | null = null;
        let type: string | null = null;
        let mpUserId: string | null = null;

        if (req.method === "GET") {
            type = url.searchParams.get("type");
            dataId = url.searchParams.get("data.id");
            // Note: GET requests usually don't carry user_id in params in standard IPN, 
            // but we'll prioritize POST handling for security/completeness.
        } else {
            type = body.type;
            dataId = body.data?.id?.toString();
            mpUserId = body.user_id?.toString(); // Critical for Tenant Lookup
        }

        console.log(`🔔 Webhook received: type=${type}, data.id=${dataId}, request_id=${requestId}`);

        // HMAC Verification
        if (MP_WEBHOOK_SECRET && signature && requestId && dataId) {
            const parts = signature.split(",");
            let ts: string | null = null;
            let v1: string | null = null;

            parts.forEach(part => {
                const [key, value] = part.split("=");
                if (key === "ts") ts = value;
                if (key === "v1") v1 = value;
            });

            if (ts && v1) {
                const signingTemplate = `id:${dataId};request-id:${requestId};ts:${ts};`;
                const calculatedHash = hmac("sha256", MP_WEBHOOK_SECRET, signingTemplate, "utf8", "hex");

                if (calculatedHash !== v1) {
                    console.error("🚨 HMAC Signature Mismatch!");
                    return new Response(JSON.stringify({ error: "Invalid signature" }), { status: 403, headers: corsHeaders });
                }
                console.log("🛡️ HMAC Signature Verified");
            }
        } else if (!MP_WEBHOOK_SECRET) {
            console.warn("⚠️ MP_WEBHOOK_SECRET not set - skipping HMAC verification");
        }

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

        const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
        const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
        const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

        // ============================================
        // 3. MULTI-TENANT TOKEN LOOKUP
        // ============================================
        // We use the MP User ID from the webhook to identify the tenant
        if (!mpUserId) {
            console.error("❌ Missing user_id in webhook payload - Cannot identify tenant");
            // If we can't identify tenant, we can't fetch payment.
            return new Response(JSON.stringify({ error: "Missing user_id" }), { status: 400, headers: corsHeaders });
        }

        const { data: secretData, error: secretError } = await supabase
            .from("branding_secrets")
            .select("mp_access_token, id")
            .eq("mp_user_id", mpUserId)
            .single();

        if (secretError || !secretData || !secretData.mp_access_token) {
            console.error(`❌ No tenant/token found for MP User ID: ${mpUserId}`);
            return new Response(JSON.stringify({ error: "Tenant not found or no token" }), { status: 404, headers: corsHeaders });
        }

        const accessToken = secretData.mp_access_token;
        console.log(`🏢 Tenant Identified: ${secretData.id}`);

        // ============================================
        // 4. FETCH PAYMENT DETAILS
        // ============================================
        console.log(`📡 Fetching payment details for ID: ${dataId}`);
        const mpResponse = await fetch(`https://api.mercadopago.com/v1/payments/${dataId}`, {
            headers: { "Authorization": `Bearer ${accessToken}` }
        });

        if (!mpResponse.ok) {
            const errorText = await mpResponse.text();
            console.error(`❌ MP API Error: ${mpResponse.status} - ${errorText}`);
            return new Response(JSON.stringify({ error: "Failed to fetch payment", details: errorText }), { status: 500, headers: corsHeaders });
        }

        const payment = await mpResponse.json();
        const orderId = payment.external_reference;

        if (!orderId) {
            console.error("❌ No external_reference (Order ID) found in payment");
            return new Response(JSON.stringify({ error: "Missing external_reference" }), { status: 400, headers: corsHeaders });
        }

        // ============================================
        // 5. IDEMPOTENCY GUARD
        // ============================================
        const { data: existingOrder, error: orderError } = await supabase
            .from("orders")
            .select("id, payment_id, status")
            .eq("id", orderId)
            .single();

        if (orderError && orderError.code !== 'PGRST116') { // Ignore "not found" which is handled below
            console.error("Database error fetching order:", orderError);
            return new Response(JSON.stringify({ error: "DB Error" }), { status: 500, headers: corsHeaders });
        }

        if (!existingOrder) {
            console.error(`❌ Order not found: ${orderId}`);
            return new Response(JSON.stringify({ error: "Order not found" }), { status: 404, headers: corsHeaders });
        }

        // Check if already processed with THIS payment ID
        if (existingOrder.payment_id === dataId) {
            console.log(`♻️ Idempotent Replay: Order ${orderId} already processed with payment ${dataId}`);
            return new Response(JSON.stringify({ status: "already_processed" }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }

        // Check if order is already confirmed by ANOTHER payment (Edge case)
        if (existingOrder.status === 'paid_unreleased' && existingOrder.payment_id && existingOrder.payment_id !== dataId) {
            console.warn(`⚠️ Order ${orderId} already confirmed with DIFFERENT payment ID: ${existingOrder.payment_id}. Ignoring ${dataId}`);
            return new Response(JSON.stringify({ status: "ignored_duplicate_payment" }), { status: 200, headers: corsHeaders });
        }

        // ============================================
        // 6. PROCESS PAYMENT
        // ============================================
        if (payment.status === "approved") {
            // 🚀 P0 #4 FIX: Auto-advance to kitchen
            // Previously set to 'paid_unreleased' which stalled orders.
            // Now goes straight to 'released_to_kitchen' so the Owner Dashboard
            // picks it up immediately and staff get the notification.
            const { data: updatedOrder, error: updateError } = await supabase
                .from("orders")
                .update({
                    status: "released_to_kitchen",
                    payment_id: dataId,
                    paid_at: new Date().toISOString(),
                    payment_status: "approved",
                    payment_confirmed: true,
                    mp_payment_data: {
                        id: payment.id,
                        status: payment.status,
                        status_detail: payment.status_detail,
                        payment_method_id: payment.payment_method_id,
                        payment_type_id: payment.payment_type_id,
                        transaction_amount: payment.transaction_amount,
                        date_approved: payment.date_approved,
                    }
                })
                .eq("id", orderId)
                .select()
                .single();

            if (updateError) {
                console.error(`❌ Supabase Update Error:`, updateError);
                return new Response(JSON.stringify({ error: "Failed to update order" }), { status: 500, headers: corsHeaders });
            }

            console.log(`🎉 Order #${updatedOrder.order_number} PAID → KITCHEN! Auto-released.`);
            return new Response(JSON.stringify({ success: true, order_id: orderId }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });

        } else {
            console.log(`⏳ Payment not approved yet: ${payment.status}`);
            return new Response(JSON.stringify({ status: "pending", payment_status: payment.status }), { status: 200, headers: corsHeaders });
        }

    } catch (err) {
        console.error("💥 Webhook Error:", err);
        return new Response(JSON.stringify({ error: "Internal server error" }), { status: 500, headers: corsHeaders });
    }
});
