// ============================================
// 🎫 MERCADO PAGO EVENT WEBHOOK
// Handles payment notifications for event ticket sales
// HMAC + Idempotency + Ledger Integration
// ============================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";

// Built-in HMAC-SHA256 using Web Crypto API
async function hmacSha256(secret: string, message: string): Promise<string> {
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
        "raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]
    );
    const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(message));
    return Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, "0")).join("");
}

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-signature, x-request-id",
};

/**
 * Create or update transaction ledger entry for event payments
 */
async function upsertLedgerEntry(supabase: any, orderId: string, payment: any, businessId: string) {
    try {
        const { data: existingLedger, error: checkError } = await supabase
            .from("transaction_ledger")
            .select("id, status")
            .eq("order_id", orderId)
            .eq("transaction_type", 'event_ticket_sale')
            .single();

        const ledgerData = {
            order_id: orderId,
            business_id: businessId,
            transaction_type: 'event_ticket_sale',
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
            const { data, error } = await supabase
                .from("transaction_ledger")
                .update(ledgerData)
                .eq("id", existingLedger.id)
                .select()
                .single();

            if (error) {
                console.error(`[mp-event-webhook] Ledger update error:`, error);
                return { success: false, error: error.message };
            }
            console.log(`[mp-event-webhook] Ledger entry updated: ${existingLedger.id}`);
            return { success: true, ledgerId: existingLedger.id, action: 'updated' };
        } else {
            const { data, error } = await supabase
                .from("transaction_ledger")
                .insert(ledgerData)
                .select()
                .single();

            if (error) {
                console.error(`[mp-event-webhook] Ledger insert error:`, error);
                return { success: false, error: error.message };
            }
            console.log(`[mp-event-webhook] Ledger entry created: ${data.id}`);
            return { success: true, ledgerId: data.id, action: 'created' };
        }
    } catch (err) {
        console.error(`[mp-event-webhook] Ledger upsert error:`, err);
        return { success: false, error: err.message };
    }
}

serve(async (req: Request) => {
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }

    try {
        const url = new URL(req.url);

        // ============================================
        // 1. HMAC SIGNATURE VERIFICATION
        // ============================================
        const signature = req.headers.get("x-signature");
        const requestId = req.headers.get("x-request-id");
        const MP_WEBHOOK_SECRET = Deno.env.get("MP_WEBHOOK_SECRET");

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

        console.log(`🔔 Event Webhook: type=${type}, data.id=${dataId}, request_id=${requestId}`);

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

        if (mpUserId) {
            const { data: secretData, error: secretError } = await supabase
                .from("branding_secrets")
                .select("mp_access_token, id, business_id")
                .eq("mp_user_id", mpUserId)
                .single();

            if (!secretError && secretData?.mp_access_token) {
                accessToken = secretData.mp_access_token;
                businessId = secretData.business_id;
                console.log(`🏢 Tenant from branding_secrets: ${secretData.id}`);
            }
        }

        if (!accessToken && mpUserId) {
            const { data: branding, error: brandingError } = await supabase
                .from("branding")
                .select("mp_access_token, business_id")
                .eq("mp_user_id", mpUserId)
                .single();

            if (!brandingError && branding?.mp_access_token) {
                accessToken = branding.mp_access_token;
                businessId = branding.business_id;
                console.log(`🏢 Tenant from branding (fallback)`);
            }
        }

        if (!accessToken) {
            console.error(`❌ No MP access token found`);
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
        const externalReference = payment.external_reference;

        if (!externalReference) {
            console.error("❌ No external_reference found in payment");
            return new Response(JSON.stringify({ error: "Missing external_reference" }), { status: 400, headers: corsHeaders });
        }

        // Parse external_reference: business_id:order_id
        const refParts = externalReference.split(':');
        const orderId = refParts[refParts.length - 1];

        // ============================================
        // 5. FIND EVENT ORDER
        // ============================================
        const { data: eventOrder, error: orderError } = await supabase
            .from("event_orders")
            .select("id, payment_status, mp_payment_id, business_id, event_id, total_cents, promo_code")
            .eq("id", orderId)
            .single();

        if (orderError || !eventOrder) {
            console.error(`❌ Event order not found: ${orderId}`);
            return new Response(JSON.stringify({ error: "Event order not found" }), { status: 404, headers: corsHeaders });
        }

        // ============================================
        // 6. IDEMPOTENCY GUARD
        // ============================================
        if (eventOrder.mp_payment_id === dataId && eventOrder.payment_status === 'paid') {
            console.log(`♻️ Idempotent Replay: Order ${orderId} already processed`);
            return new Response(JSON.stringify({ status: "already_processed" }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }

        if (eventOrder.payment_status === 'paid' && eventOrder.mp_payment_id && eventOrder.mp_payment_id !== dataId) {
            console.warn(`⚠️ Order ${orderId} already paid with different payment ID`);
            return new Response(JSON.stringify({ status: "ignored_duplicate_payment" }), { status: 200, headers: corsHeaders });
        }

        // ============================================
        // 7. PROCESS PAYMENT
        // ============================================
        if (payment.status === "approved") {
            const { data: updatedOrder, error: updateError } = await supabase
                .from("event_orders")
                .update({
                    payment_status: 'paid',
                    mp_payment_id: dataId,
                    payment_method: 'mercado_pago',
                    updated_at: new Date().toISOString()
                })
                .eq("id", orderId)
                .select()
                .single();

            if (updateError) {
                console.error(`❌ Supabase Update Error:`, updateError);
                return new Response(JSON.stringify({ error: "Failed to update event order" }), { status: 500, headers: corsHeaders });
            }

            // ============================================
            // 7.5. INCREMENT TIER SOLD COUNT
            // ============================================
            if (eventOrder.tier_id && eventOrder.quantity) {
                const { error: tierError } = await supabase.rpc('increment_event_tier_sold', {
                    p_tier_id: eventOrder.tier_id,
                    p_quantity: eventOrder.quantity
                });

                if (tierError) {
                    console.warn(`[mp-event-webhook] Failed to increment tier sold count:`, tierError.message);
                    // Don't fail the webhook — order is already marked paid
                } else {
                    console.log(`[mp-event-webhook] Tier ${eventOrder.tier_id} sold count incremented by ${eventOrder.quantity}`);
                }
            }

            // ============================================
            // 8. CREATE/UPDATE LEDGER ENTRY
            // ============================================
            const ledgerResult = await upsertLedgerEntry(
                supabase, orderId, payment, businessId || eventOrder.business_id
            );

            if (!ledgerResult.success) {
                console.error(`[mp-event-webhook] Ledger entry failed: ${ledgerResult.error}`);
            }

            // Increment promo code used_count if applicable
            if (eventOrder.promo_code) {
                const { error: promoUpdateError } = await supabase
                    .rpc('increment_promo_used_count', {
                        p_event_id: eventOrder.event_id,
                        p_code: eventOrder.promo_code.toUpperCase()
                    });
                if (promoUpdateError) {
                    console.error(`[mp-event-webhook] Promo increment error:`, promoUpdateError);
                } else {
                    console.log(`[mp-event-webhook] Promo ${eventOrder.promo_code} used_count incremented`);
                }
            }

            console.log(`🎉 Event Order #${orderId} PAID! Ledger: ${ledgerResult.ledgerId || 'FAILED'}`);

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
            // Payment not approved yet
            const ledgerResult = await upsertLedgerEntry(
                supabase, orderId, payment, businessId || eventOrder.business_id
            );

            console.log(`⏳ Payment not approved: ${payment.status}, Ledger: ${ledgerResult.ledgerId || 'FAILED'}`);

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
        console.error("💥 Event Webhook Error:", err);
        return new Response(JSON.stringify({ error: "Internal server error" }), { status: 500, headers: corsHeaders });
    }
});
