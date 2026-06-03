// ============================================================
// mp-subscription-webhook
// Handles MercadoPago subscription events for FoodSpot Pro
// authorized  → upgrades business to Pro (unlimited orders)
// cancelled   → downgrades back to Free (30 orders/month)
// Deploy: supabase functions deploy mp-subscription-webhook --no-verify-jwt
// ============================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-signature, x-request-id",
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const rawBody = await req.text();
    let body: any;
    try {
      body = JSON.parse(rawBody);
    } catch {
      return new Response(
        JSON.stringify({ error: "Invalid JSON" }),
        { status: 400, headers: corsHeaders }
      );
    }

    const type = body.type;
    const dataId = body.data?.id?.toString();

    console.log(`🔔 Subscription Webhook: type=${type}, id=${dataId}`);

    // Only handle subscription events
    if (type !== "subscription_preapproval" || !dataId) {
      console.log(`⏭️ Ignoring: type=${type}`);
      return new Response(
        JSON.stringify({ status: "ignored", reason: "not a subscription event" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const MP_ACCESS_TOKEN = Deno.env.get("MP_ACCESS_TOKEN");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    if (!MP_ACCESS_TOKEN) {
      console.error("MP_ACCESS_TOKEN not set");
      return new Response(
        JSON.stringify({ error: "Payment provider not configured" }),
        { status: 500, headers: corsHeaders }
      );
    }

    // Fetch the subscription details from MP
    const mpResponse = await fetch(`https://api.mercadopago.com/preapproval/${dataId}`, {
      headers: { "Authorization": `Bearer ${MP_ACCESS_TOKEN}` },
    });

    if (!mpResponse.ok) {
      const errText = await mpResponse.text();
      console.error(`Failed to fetch subscription ${dataId}:`, errText);
      return new Response(
        JSON.stringify({ error: "Failed to fetch subscription from MP" }),
        { status: 500, headers: corsHeaders }
      );
    }

    const subscription = await mpResponse.json();
    const businessId = subscription.external_reference;
    const status = subscription.status; // authorized | cancelled | paused | pending

    console.log(`📋 Subscription ${dataId}: status=${status}, business_id=${businessId}`);

    if (!businessId) {
      console.error("No external_reference on subscription — cannot identify business");
      return new Response(
        JSON.stringify({ error: "Missing external_reference" }),
        { status: 400, headers: corsHeaders }
      );
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    if (status === "authorized") {
      // ── UPGRADE TO PRO ──────────────────────────────────────
      const { error: upgradeError } = await supabase.rpc("upgrade_to_pro", {
        p_business_id: businessId,
      });

      if (upgradeError) {
        console.error(`Failed to upgrade ${businessId}:`, upgradeError);
        return new Response(
          JSON.stringify({ error: "Failed to upgrade tier" }),
          { status: 500, headers: corsHeaders }
        );
      }

      // Also track subscription metadata
      await supabase
        .from("branding")
        .update({
          subscription_id: dataId,
          subscription_status: "active",
        })
        .eq("business_id", businessId);

      console.log(`✅ Business ${businessId} upgraded to Pro!`);

    } else if (status === "cancelled" || status === "paused") {
      // ── DOWNGRADE TO FREE ────────────────────────────────────
      const { error: downgradeError } = await supabase
        .from("branding")
        .update({
          subscription_tier: "free",
          mp_monthly_limit: 30,
          subscription_status: status,
        })
        .eq("business_id", businessId);

      if (downgradeError) {
        console.error(`Failed to downgrade ${businessId}:`, downgradeError);
        return new Response(
          JSON.stringify({ error: "Failed to downgrade tier" }),
          { status: 500, headers: corsHeaders }
        );
      }

      console.log(`📉 Business ${businessId} downgraded to Free (${status})`);

    } else {
      // pending / other — just update status, no tier change
      await supabase
        .from("branding")
        .update({ subscription_status: status, subscription_id: dataId })
        .eq("business_id", businessId);

      console.log(`ℹ️ Subscription ${dataId} status: ${status} — no tier change`);
    }

    return new Response(
      JSON.stringify({ success: true, business_id: businessId, status }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (err) {
    console.error("mp-subscription-webhook error:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error", detail: err.message }),
      { status: 500, headers: corsHeaders }
    );
  }
});
