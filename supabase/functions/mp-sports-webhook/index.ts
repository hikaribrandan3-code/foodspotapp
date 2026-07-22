// ============================================
// 🏆 MERCADO PAGO SPORTS WEBHOOK
// Handles payment notifications for tournament entry fees
// and equipment rentals. HMAC + Idempotency + Ledger.
// Mirrors mp-event-webhook exactly; routes by the
// SPORTS-<KIND>: prefix on external_reference.
// ============================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";

async function hmacSha256(secret: string, message: string): Promise<string> {
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
        "raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]
    );
    const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(message));
    return Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-signature, x-request-id",
};

// order_id on transaction_ledger is scoped to the food `orders` table, so
// sports payments are recorded with order_id=NULL and tied back via
// external_reference — same convention as record_sports_cash_payment.
async function upsertLedgerEntry(supabase: any, idempotencyKey: string, externalReference: string, businessId: string, payment: any) {
    try {
        const { data: existing } = await supabase
            .from("transaction_ledger")
            .select("id")
            .eq("idempotency_key", idempotencyKey)
            .maybeSingle();

        if (existing) {
            return { success: true, ledgerId: existing.id, action: "already_recorded" };
        }

        const amountCents = Math.round((payment.transaction_amount || 0) * 100);
        const { data, error } = await supabase
            .from("transaction_ledger")
            .insert({
                order_id: null,
                business_id: businessId,
                transaction_type: "payment",
                status: "completed",
                amount_gross_cents: amountCents,
                platform_fee_cents: 0,
                net_to_owner_cents: amountCents,
                idempotency_key: idempotencyKey,
                currency: payment.currency_id || "ARS",
                payment_method: payment.payment_method_id || "mercado_pago",
                external_reference: externalReference,
                mercado_pago_response: {
                    id: payment.id, status: payment.status, status_detail: payment.status_detail,
                    payment_method_id: payment.payment_method_id, transaction_amount: payment.transaction_amount,
                    date_approved: payment.date_approved,
                },
                processed_at: new Date().toISOString(),
            })
            .select()
            .single();

        if (error) {
            console.error("[mp-sports-webhook] Ledger insert error:", error);
            return { success: false, error: error.message };
        }
        return { success: true, ledgerId: data.id, action: "created" };
    } catch (err) {
        console.error("[mp-sports-webhook] Ledger upsert error:", err);
        return { success: false, error: (err as Error).message };
    }
}

serve(async (req: Request) => {
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }

    try {
        const url = new URL(req.url);

        // ── 1. HMAC signature verification ──
        const signature = req.headers.get("x-signature");
        const requestId = req.headers.get("x-request-id");
        const MP_WEBHOOK_SECRET = Deno.env.get("MP_WEBHOOK_SECRET");

        const rawBody = await req.text();
        let body: any;
        try {
            body = JSON.parse(rawBody);
        } catch {
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

        if (MP_WEBHOOK_SECRET && signature && requestId && dataId) {
            const parts = signature.split(",");
            let ts: string | null = null;
            let v1: string | null = null;
            parts.forEach((part) => {
                const [key, value] = part.split("=");
                if (key === "ts") ts = value;
                if (key === "v1") v1 = value;
            });
            if (ts && v1) {
                const calculatedHash = await hmacSha256(MP_WEBHOOK_SECRET, `id:${dataId};request-id:${requestId};ts:${ts};`);
                if (calculatedHash !== v1) {
                    console.error("🚨 HMAC Signature Mismatch!");
                    return new Response(JSON.stringify({ error: "Invalid signature" }), { status: 403, headers: corsHeaders });
                }
            }
        }

        // ── 2. Only process payment notifications ──
        if (type !== "payment" || !dataId) {
            return new Response(JSON.stringify({ status: "ignored" }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }

        const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
        const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
        const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

        // ── 3. Multi-tenant token lookup (same as mp-event-webhook) ──
        let accessToken: string | null = null;

        if (mpUserId) {
            const { data: secretData } = await supabase
                .from("branding_secrets")
                .select("mp_access_token")
                .eq("mp_user_id", mpUserId)
                .single();
            if (secretData?.mp_access_token) accessToken = secretData.mp_access_token;
        }
        if (!accessToken && mpUserId) {
            const { data: branding } = await supabase
                .from("branding")
                .select("mp_access_token")
                .eq("mp_user_id", mpUserId)
                .single();
            if (branding?.mp_access_token) accessToken = branding.mp_access_token;
        }

        if (!accessToken) {
            console.error("❌ No MP access token found for user_id:", mpUserId);
            return new Response(JSON.stringify({ error: "No access token found" }), { status: 404, headers: corsHeaders });
        }

        // ── 4. Fetch payment details ──
        const mpResponse = await fetch(`https://api.mercadopago.com/v1/payments/${dataId}`, {
            headers: { "Authorization": `Bearer ${accessToken}` },
        });
        if (!mpResponse.ok) {
            const errorText = await mpResponse.text();
            return new Response(JSON.stringify({ error: "Failed to fetch payment", details: errorText }), { status: 500, headers: corsHeaders });
        }
        const payment = await mpResponse.json();
        const externalReference: string | undefined = payment.external_reference;

        // ── 5. Parse "SPORTS-<KIND>:<business_id>:<entity_id>" ──
        if (!externalReference?.startsWith("SPORTS-")) {
            return new Response(JSON.stringify({ status: "ignored", reason: "not a sports payment" }), { status: 200, headers: corsHeaders });
        }
        const [kindPart, businessId, entityId] = externalReference.split(":");
        const kind = kindPart.replace("SPORTS-", "").toLowerCase(); // 'tournament' | 'rental'
        const table = kind === "tournament" ? "tournament_teams" : "rental_orders";
        const paymentField = kind === "tournament" ? "entry_payment_status" : "payment_status";

        if (!businessId || !entityId) {
            return new Response(JSON.stringify({ error: "Malformed external_reference" }), { status: 400, headers: corsHeaders });
        }

        // ── 6. Idempotency: has this exact MP payment already been recorded? ──
        const idempotencyKey = `sports-mp-${dataId}`;
        const { data: entity, error: entityError } = await supabase
            .from(table)
            .select(`id, ${paymentField}, mp_payment_id`)
            .eq("id", entityId)
            .eq("business_id", businessId)
            .single();

        if (entityError || !entity) {
            console.error(`❌ ${table} not found: ${entityId}`);
            return new Response(JSON.stringify({ error: "Entity not found" }), { status: 404, headers: corsHeaders });
        }

        if (entity.mp_payment_id === dataId && entity[paymentField] === "paid") {
            return new Response(JSON.stringify({ status: "already_processed" }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }

        // ── 7. Process ──
        if (payment.status === "approved") {
            const updatePatch: Record<string, any> = {
                [paymentField]: "paid",
                mp_payment_id: dataId,
                payment_method: "mercado_pago",
                updated_at: new Date().toISOString(),
            };
            if (kind === "tournament") updatePatch.status = "confirmed";

            const { error: updateError } = await supabase.from(table).update(updatePatch).eq("id", entityId);
            if (updateError) {
                console.error("❌ Update error:", updateError);
                return new Response(JSON.stringify({ error: "Failed to update entity" }), { status: 500, headers: corsHeaders });
            }

            // rental_items.stock_available decrements automatically via trg_rental_stock,
            // which fires on this same UPDATE (payment_status → 'paid').

            const ledgerResult = await upsertLedgerEntry(supabase, idempotencyKey, externalReference, businessId, payment);
            console.log(`🎉 Sports ${kind} ${entityId} PAID! Ledger: ${ledgerResult.ledgerId || "FAILED"}`);

            return new Response(
                JSON.stringify({ success: true, kind, entity_id: entityId, ledger_id: ledgerResult.ledgerId }),
                { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        return new Response(
            JSON.stringify({ status: "pending", payment_status: payment.status }),
            { status: 200, headers: corsHeaders }
        );

    } catch (err) {
        console.error("💥 Sports Webhook Error:", err);
        return new Response(JSON.stringify({ error: "Internal server error" }), { status: 500, headers: corsHeaders });
    }
});
