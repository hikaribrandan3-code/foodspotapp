// ============================================================
// 🏆 CREATE SPORTS PREFERENCE
// Unified Mercado Pago checkout for Deportes: tournament entry
// fees + equipment rentals. Mirrors create-event-preference.
// ============================================================

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

    try {
        const payload = await req.json();
        const { kind, business_id, tenant_slug, customer } = payload;

        if (!kind || !business_id || !["tournament", "rental"].includes(kind)) {
            return new Response(
                JSON.stringify({ error: "BAD_REQUEST", detail: "kind ('tournament'|'rental') and business_id required" }),
                { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
        const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
        const APP_BASE_URL = Deno.env.get("APP_BASE_URL") || "https://foodspotapp.vercel.app";
        const supabase = createClient(supabaseUrl, supabaseServiceKey);
        const WEBHOOK_URL = `${supabaseUrl}/functions/v1/mp-sports-webhook`;
        const guestToken = crypto.randomUUID();

        // ── 1. Create the pending row via the existing RPCs (server-computed pricing) ──
        let entityId: string;
        let code: string;
        let amountCents: number;
        let title: string;
        let paymentField: string; // column name holding payment status on the entity table
        let table: string;
        let alreadyPaid = false;

        if (kind === "tournament") {
            const { tournament_id, team_name, captain_name, captain_phone, players } = payload;
            if (!tournament_id || !team_name || !captain_name || !captain_phone) {
                return new Response(
                    JSON.stringify({ error: "BAD_REQUEST", detail: "tournament_id, team_name, captain_name, captain_phone required" }),
                    { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
                );
            }

            const { data: reg, error: regError } = await supabase.rpc("register_tournament_team", {
                p_business_id: business_id,
                p_tournament_id: tournament_id,
                p_team_name: team_name,
                p_captain_name: captain_name,
                p_captain_phone: captain_phone,
                p_players: players || [],
                p_guest_token: guestToken,
            });

            if (regError || !reg?.success) {
                return new Response(
                    JSON.stringify({ error: "REGISTRATION_FAILED", detail: reg?.error || regError?.message }),
                    { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
                );
            }

            entityId = reg.team_id;
            code = reg.registration_code;
            amountCents = reg.entry_fee_cents || 0;
            alreadyPaid = !reg.payment_required;
            title = `Inscripción — ${team_name}`;
            table = "tournament_teams";
            paymentField = "entry_payment_status";
        } else {
            const { customer_name, customer_phone, items, reserved_for } = payload;
            if (!customer_name || !customer_phone || !Array.isArray(items) || items.length === 0) {
                return new Response(
                    JSON.stringify({ error: "BAD_REQUEST", detail: "customer_name, customer_phone, items[] required" }),
                    { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
                );
            }

            const { data: res, error: resError } = await supabase.rpc("create_rental_reservation", {
                p_business_id: business_id,
                p_customer_name: customer_name,
                p_customer_phone: customer_phone,
                p_items: items,
                p_reserved_for: reserved_for || null,
                p_guest_token: guestToken,
            });

            if (resError || !res?.success) {
                return new Response(
                    JSON.stringify({ error: "RESERVATION_FAILED", detail: res?.error || resError?.message }),
                    { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
                );
            }

            entityId = res.rental_order_id;
            code = res.rental_code;
            amountCents = res.total_cents || 0;
            alreadyPaid = amountCents === 0;
            title = `Alquiler de equipos — ${customer_name}`;
            table = "rental_orders";
            paymentField = "payment_status";
        }

        // ── 2. Zero-cost? Skip MP entirely (mirrors the free-event branch) ──
        if (alreadyPaid || amountCents === 0) {
            if (amountCents === 0) {
                await supabase.from(table).update({ [paymentField]: "paid", payment_method: "free" }).eq("id", entityId);
            }
            return new Response(
                JSON.stringify({
                    free_order: true,
                    kind, entity_id: entityId, code, guest_token: guestToken,
                }),
                { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        // ── 3. Fetch branding for MP token + currency + slug ──
        const { data: branding, error: brandingError } = await supabase
            .from("branding")
            .select("mp_access_token, business_name, slug, app_config")
            .eq("business_id", business_id)
            .single();

        const businessSlug = tenant_slug || branding?.slug || "demo";

        if (brandingError || !branding?.mp_access_token) {
            return new Response(
                JSON.stringify({ error: "mp_not_configured" }),
                { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        const accessToken = branding.mp_access_token;
        const externalReference = `SPORTS-${kind.toUpperCase()}:${business_id}:${entityId}`;
        const baseUrl = `${APP_BASE_URL}/${businessSlug}/deportes`;

        const preferenceBody = {
            items: [{
                title,
                quantity: 1,
                unit_price: amountCents / 100,
                currency_id: (branding.app_config as any)?.businessCurrency || "ARS",
            }],
            back_urls: {
                success: `${baseUrl}?payment=success&kind=${kind}&id=${entityId}&guest_token=${guestToken}`,
                failure: `${baseUrl}?payment=failure&kind=${kind}&id=${entityId}&guest_token=${guestToken}`,
                pending: `${baseUrl}?payment=pending&kind=${kind}&id=${entityId}&guest_token=${guestToken}`,
            },
            auto_return: "approved",
            external_reference: externalReference,
            notification_url: WEBHOOK_URL,
            payer: { email: customer?.email || "" },
        };

        // Retry logic for cold-start delays (matches create-event-preference)
        const MAX_RETRIES = 6;
        const INITIAL_DELAY = 500;
        let mpData: any = null;
        let mpResponse: Response | null = null;

        for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
            if (attempt > 0) {
                const delayMs = INITIAL_DELAY * Math.pow(2, attempt - 1);
                await new Promise((r) => setTimeout(r, delayMs));
            }
            try {
                mpResponse = await fetch(MERCADO_PAGO_API, {
                    method: "POST",
                    headers: { "Authorization": `Bearer ${accessToken}`, "Content-Type": "application/json" },
                    body: JSON.stringify(preferenceBody),
                });
                mpData = await mpResponse.json();
                if (mpResponse.ok && mpData.init_point) break;
            } catch (err) {
                console.warn(`[create-sports-preference] Attempt ${attempt + 1} exception:`, (err as Error).message);
            }
        }

        if (!mpResponse?.ok || !mpData?.init_point) {
            console.error("💥 Mercado Pago Error after all retries:", mpData);
            return new Response(
                JSON.stringify({ error: "MP_ERROR", detail: mpData }),
                { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        await supabase.from(table).update({ mp_preference_id: mpData.id }).eq("id", entityId);

        return new Response(
            JSON.stringify({
                init_point: mpData.init_point,
                preference_id: mpData.id,
                kind, entity_id: entityId, code, guest_token: guestToken,
                amount_cents: amountCents,
            }),
            { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );

    } catch (err) {
        console.error("💥 create-sports-preference Error:", err);
        return new Response(
            JSON.stringify({ error: "Internal server error", details: (err as Error).message }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }
});
