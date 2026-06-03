// ============================================================
// create-subscription-preference
// Creates a MercadoPago subscription (preapproval) for FoodSpot Pro
// Called by the frontend when a free-tier owner clicks "Upgrade to Pro"
// Deploy: supabase functions deploy create-subscription-preference --no-verify-jwt
// ============================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const PLAN_ID = "c18d448e503344e1ae28354d3cb1c24e";
const MP_PREAPPROVAL_URL = "https://api.mercadopago.com/preapproval";

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { business_id, email, slug } = await req.json();

    if (!business_id || !email) {
      return new Response(
        JSON.stringify({ error: "business_id and email are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const MP_ACCESS_TOKEN = Deno.env.get("MP_ACCESS_TOKEN");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const WEBHOOK_URL = `${SUPABASE_URL}/functions/v1/mp-subscription-webhook`;
    const APP_BASE_URL = Deno.env.get("APP_BASE_URL") || "https://foodspotapp.vercel.app";

    if (!MP_ACCESS_TOKEN) {
      console.error("MP_ACCESS_TOKEN not configured");
      return new Response(
        JSON.stringify({ error: "Payment provider not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify the business exists before creating subscription
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
    const { data: branding, error: brandingError } = await supabase
      .from("branding")
      .select("business_id, subscription_tier, slug")
      .eq("business_id", business_id)
      .single();

    if (brandingError || !branding) {
      return new Response(
        JSON.stringify({ error: "Business not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Already Pro — no need to subscribe again
    if (branding.subscription_tier === "pro") {
      return new Response(
        JSON.stringify({ already_pro: true, message: "Already on Pro plan" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const tenantSlug = slug || branding.slug;
    const backUrl = `${APP_BASE_URL}/${tenantSlug}/owner/dashboard?upgrade=success`;

    const preapprovalBody = {
      preapproval_plan_id: PLAN_ID,
      reason: "FoodSpot Pro - Plan Mensual",
      payer_email: email,
      back_url: backUrl,
      external_reference: business_id,
      notification_url: WEBHOOK_URL,
    };

    const mpResponse = await fetch(MP_PREAPPROVAL_URL, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${MP_ACCESS_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(preapprovalBody),
    });

    const mpData = await mpResponse.json();

    if (!mpResponse.ok || !mpData.init_point) {
      console.error("MP Subscription Error:", JSON.stringify(mpData));
      return new Response(
        JSON.stringify({ error: "Failed to create subscription checkout", detail: mpData }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Store the subscription_id so we can track it
    await supabase
      .from("branding")
      .update({
        subscription_id: mpData.id,
        subscription_status: "pending",
      })
      .eq("business_id", business_id);

    console.log(`✅ Subscription created: ${mpData.id} for business ${business_id}`);

    return new Response(
      JSON.stringify({
        init_point: mpData.init_point,
        subscription_id: mpData.id,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (err) {
    console.error("create-subscription-preference error:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error", detail: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
