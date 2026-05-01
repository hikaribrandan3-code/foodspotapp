// ============================================
// 💰 MERCADO PAGO WEBHOOK - VAULT-SEAL v7
// WITH TRANSACTION LEDGER INTEGRATION
// ============================================
// Security Level: 🛡️ HIGH (HMAC + Idempotency + Multi-Tenant)
// New: Auto-creates transaction_ledger entries on payment
//
// Deploy: supabase functions deploy mp-webhook --no-verify-jwt
// ============================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";

// Built-in HMAC-SHA256 using Web Crypto API (no external deps)
async function hmacSha256(secret: string, message: string): Promise<string> {
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
        "raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]
    );
    const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(message));
    return Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, "0")).join("");
}

// CORS Headers
const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-signature, x-request-id",
};

/**
 * Create or update transaction ledger entry
 */
async function upsertLedgerEntry(supabase: any, orderId: string, payment: any, businessId: string) {
    try {
        // Check if ledger entry already exists
        const { data: existingLedger, error: checkError } = await supabase
            .from("transaction_ledger")
            .select("id, status")
            .eq("order_id", orderId)
            .single();

        const ledgerData = {
            order_id: orderId,
            business_id: businessId,
            transaction_type: 'payment',
            status: payment.status === 'approved' ? 'completed' : 'pending',
            amount_gross_cents: Math.round(payment.transaction_amount * 100),
            external_reference: payment.external_reference,
            mercado_pago_response: {
                id: payment.id,
                status: payment.status,
                status_detail: payment.status_detail,
                payment_method_id: payment.payment_method_id,
                payment_type_id: payment.payment_type_id,
                transaction_amount: payment.transaction_amount,
                date_approved: payment.date_approved,
                date_created: payment.date_created,
                currency_id: payment.currency_id,
                description: payment.description
            },
            payment_method: payment.payment_method_id,
            currency: payment.currency_id || 'ARS',
            processed_at: payment.status === 'approved' ? new Date().toISOString() : null
        };

        if (existingLedger) {
            // Update existing entry
            const { data, error } = await supabase
                .from("transaction_ledger")
                .update(ledgerData)
                .eq("id", existingLedger.id)
                .select()
                .single();

            if (error) {
                console.error(`[mp-webhook] Ledger update error:`, error);
                return { success: false, error: error.message };
            }

            console.log(`[mp-webhook] Ledger entry updated: ${existingLedger.id}`);
            return { success: true, ledgerId: existingLedger.id, action: 'updated' };
        } else {
            // Create new entry
            const { data, error } = await supabase
                .from("transaction_ledger")
                .insert(ledgerData)
                .select()
                .single();

            if (error) {
                console.error(`[mp-webhook] Ledger insert error:`, error);
                return { success: false, error: error.message };
            }

            console.log(`[mp-webhook] Ledger entry created: ${data.id}`);
            return { success: true, ledgerId: data.id, action: 'created' };
        }
    } catch (err) {
        console.error(`[mp-webhook] Ledger upsert error:`, err);
        return { success: false, error: err.message };
    }
}

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
        } else {
            type = body.type;
            dataId = body.data?.id?.toString();
            mpUserId = body.user_id?.toString();
        }

        console.log(`🔔 Webhook received: type=${type}, data.id=${dataId}, request_id=${requestId}`);

        // HMAC Verification (using built-in crypto.subtle)
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
                const calculatedHash = await hmacSha256(MP_WEBHOOK_SECRET, signingTemplate);

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
        let accessToken: string | null = null;
        let businessId: string | null = null;

        // Try branding_secrets first (proper multi-tenant path)
        if (mpUserId) {
            const { data: secretData, error: secretError } = await supabase
                .from("branding_secrets")
                .select("mp_access_token, id, business_id")
                .eq("mp_user_id", mpUserId)
                .single();

            if (!secretError && secretData?.mp_access_token) {
                accessToken = secretData.mp_access_token;
                businessId = secretData.business_id;
                console.log(`🏢 Tenant from branding_secrets: ${secretData.id}, Business: ${businessId}`);
            }
        }

        // FALLBACK: Try branding table by mp_user_id (legacy / single-tenant setups)
        if (!accessToken && mpUserId) {
            const { data: branding, error: brandingError } = await supabase
                .from("branding")
                .select("mp_access_token, business_id")
                .eq("mp_user_id", mpUserId)
                .single();

            if (!brandingError && branding?.mp_access_token) {
                accessToken = branding.mp_access_token;
                businessId = branding.business_id;
                console.log(`🏢 Tenant from branding (fallback): Business: ${businessId}`);
            }
        }

        if (!accessToken) {
            console.error(`❌ No MP access token found. Checked branding_secrets (mp_user_id=${mpUserId}) and branding fallback.`);
            return new Response(JSON.stringify({ error: "No access token found" }), { status: 404, headers: corsHeaders });
        }

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
            .select("id, payment_id, status, business_id")
            .eq("id", orderId)
            .single();

        if (orderError && orderError.code !== 'PGRST116') {
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

        // Check if order is already confirmed by ANOTHER payment
        if (existingOrder.status === 'paid_unreleased' && existingOrder.payment_id && existingOrder.payment_id !== dataId) {
            console.warn(`⚠️ Order ${orderId} already confirmed with DIFFERENT payment ID: ${existingOrder.payment_id}. Ignoring ${dataId}`);
            return new Response(JSON.stringify({ status: "ignored_duplicate_payment" }), { status: 200, headers: corsHeaders });
        }

        // ============================================
        // 6. PROCESS PAYMENT
        // ============================================
        if (payment.status === "approved") {
            // Update order status
            const { data: updatedOrder, error: updateError } = await supabase
                .from("orders")
                .update({
                    status: "released_to_kitchen",
                    payment_id: dataId,
                    paid_at: new Date().toISOString(),
                    payment_status: "paid",
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

            // ============================================
            // 7. CREATE/UPDATE LEDGER ENTRY (NEW)
            // ============================================
            const ledgerResult = await upsertLedgerEntry(supabase, orderId, payment, businessId || existingOrder.business_id);
            
            if (!ledgerResult.success) {
                console.error(`[mp-webhook] Ledger entry failed: ${ledgerResult.error}`);
                // Don't fail the webhook - order is already updated
                // Log for manual reconciliation
            }

            console.log(`🎉 Order #${updatedOrder.order_number} PAID → KITCHEN! Ledger: ${ledgerResult.ledgerId || 'FAILED'}`);
            
            return new Response(
                JSON.stringify({ 
                    success: true, 
                    order_id: orderId,
                    ledger_id: ledgerResult.ledgerId,
                    ledger_action: ledgerResult.action
                }), 
                { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );

        } else {
            // Payment not approved yet - still create/update ledger with pending status
            const ledgerResult = await upsertLedgerEntry(supabase, orderId, payment, businessId || existingOrder.business_id);
            
            console.log(`⏳ Payment not approved yet: ${payment.status}, Ledger: ${ledgerResult.ledgerId || 'FAILED'}`);
            
            return new Response(
                JSON.stringify({ 
                    status: "pending", 
                    payment_status: payment.status,
                    ledger_id: ledgerResult.ledgerId
                }), 
                { status: 200, headers: corsHeaders }
            );
        }

    } catch (err) {
        console.error("💥 Webhook Error:", err);
        return new Response(JSON.stringify({ error: "Internal server error" }), { status: 500, headers: corsHeaders });
    }
});
