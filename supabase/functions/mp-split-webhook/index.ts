// ============================================
// 💳 MP SPLIT WEBHOOK - Process split payment notifications
// ============================================
// Deploy: supabase functions deploy mp-split-webhook --no-verify-jwt
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
        const payload = await req.json();
        
        console.log(`📡 [mp-split-webhook] Received:`, JSON.stringify(payload, null, 2));

        const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
        const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
        const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

        // Handle MP test webhook
        if (payload.type === "test") {
            console.log("✅ Test webhook received");
            return new Response(
                JSON.stringify({ status: "ok" }),
                { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        // Get payment data
        const payment = payload.data?.id 
            ? await getPaymentDetails(payload.data.id, supabase, payload.user_id)
            : null;

        if (!payment) {
            console.error("❌ No payment data found");
            return new Response(
                JSON.stringify({ error: "No payment data" }),
                { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        const externalRef = payment.external_reference;
        const status = payment.status;
        const statusDetail = payment.status_detail;

        // Find split payment by external_reference
        const { data: split, error: splitError } = await supabase
            .from("split_payments")
            .select("*, ledger_id")
            .eq("id", externalRef)
            .single();

        if (splitError || !split) {
            console.error("❌ Split not found:", externalRef);
            return new Response(
                JSON.stringify({ error: "Split not found" }),
                { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        // Update split payment status
        const newStatus = status === "approved" ? "paid" : status === "rejected" || status === "cancelled" ? "failed" : "processing";
        
        await supabase
            .from("split_payments")
            .update({
                mp_payment_id: payment.id.toString(),
                mp_status: status,
                status: newStatus,
                paid_at: newStatus === "paid" ? new Date().toISOString() : null
            })
            .eq("id", split.id);

        // If paid, atomically increment ledger total_paid
        if (newStatus === "paid") {
            const { error: rpcError } = await supabase.rpc("increment_ledger_total", {
                p_ledger_id: split.ledger_id,
                p_amount: split.amount,
            });

            if (rpcError) {
                console.error(`❌ Failed to atomically update ledger ${split.ledger_id}:`, rpcError);
            } else {
                console.log(`✅ Ledger ${split.ledger_id} atomically incremented by ${split.amount}`);
            }
        }

        console.log(`✅ Split ${split.id} updated to ${newStatus}`);

        return new Response(
            JSON.stringify({ status: "processed" }),
            { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );

    } catch (err) {
        console.error("💥 Webhook error:", err);
        return new Response(
            JSON.stringify({ error: err.message }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }
});

async function getPaymentDetails(paymentId: number, supabase: any, mpUserId: string | null) {
    try {
        let accessToken: string | null = null;

        // Try branding_secrets first (proper multi-tenant path)
        if (mpUserId) {
            const { data: secretData } = await supabase
                .from("branding_secrets")
                .select("mp_access_token")
                .eq("mp_user_id", mpUserId)
                .single();
            if (secretData?.mp_access_token) {
                accessToken = secretData.mp_access_token;
            }
        }

        // Fallback to branding table by mp_user_id
        if (!accessToken && mpUserId) {
            const { data: branding } = await supabase
                .from("branding")
                .select("mp_access_token")
                .eq("mp_user_id", mpUserId)
                .single();
            if (branding?.mp_access_token) {
                accessToken = branding.mp_access_token;
            }
        }

        if (!accessToken) {
            console.error("No MP access token found for split payment");
            return null;
        }

        const response = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
            headers: {
                "Authorization": `Bearer ${accessToken}`
            }
        });

        return await response.json();
    } catch (e) {
        console.error("Error fetching payment:", e);
        return null;
    }
}
