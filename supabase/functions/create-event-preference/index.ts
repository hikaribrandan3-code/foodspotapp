import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, x-business-id, x-guest-token, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const WEBHOOK_URL = "https://buendqgmwpxdixwvlkhd.supabase.co/functions/v1/mp-event-webhook";
const MERCADO_PAGO_API = "https://api.mercadopago.com/checkout/preferences";

// Generate ticket code: TKT-XXX-NNN
function generateTicketCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = 'TKT-';
    for (let i = 0; i < 3; i++) code += chars.charAt(Math.floor(Math.random() * chars.length));
    code += '-';
    for (let i = 0; i < 3; i++) code += chars.charAt(Math.floor(Math.random() * chars.length));
    return code;
}

serve(async (req: Request) => {
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
        return new Response(
            JSON.stringify({ error: "Unauthorized" }),
            { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }

    try {
        const payload = await req.json();
        const { event_id, tier_id, quantity = 1, addons = [], customer, promo_code } = payload;

        if (!event_id || !tier_id) {
            return new Response(
                JSON.stringify({ error: "BAD_REQUEST", detail: "event_id and tier_id required" }),
                { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
        const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
        const supabase = createClient(supabaseUrl, supabaseServiceKey);

        // ── 1. Fetch event (capacity check will validate tier availability) ──
        const { data: event, error: eventError } = await supabase
            .from('events')
            .select('id, business_id, name, description, image_url, status, ticket_tiers, is_free')
            .eq('id', event_id)
            .single();

        if (eventError || !event) {
            return new Response(
                JSON.stringify({ error: "EVENT_NOT_FOUND" }),
                { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        if (event.status !== 'live') {
            return new Response(
                JSON.stringify({ error: "EVENT_NOT_LIVE" }),
                { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        // ── 2. Find tier and check capacity ──
        const tiers = event.ticket_tiers || [];
        const tier = tiers.find((t: any) => t.id === tier_id);
        if (!tier) {
            return new Response(
                JSON.stringify({ error: "TIER_NOT_FOUND" }),
                { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        const remaining = (tier.capacity || 0) - (tier.sold || 0);
        if (remaining < quantity) {
            return new Response(
                JSON.stringify({ error: "INSUFFICIENT_CAPACITY", detail: `${remaining} tickets remaining` }),
                { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        // ── 3. Calculate pricing (INTEGER cents only) ──
        const tierPriceCents = Math.round(tier.price_cents || 0);
        const qty = Math.max(1, Math.round(quantity));
        let subtotalCents = tierPriceCents * qty;
        let discountCents = 0;

        // Apply addons
        const addonsSnapshot = [];
        for (const addon of addons) {
            const addonPriceCents = Math.round((addon.price || 0) * 100);
            const addonQty = Math.max(1, Math.round(addon.qty || 1));
            subtotalCents += addonPriceCents * addonQty;
            addonsSnapshot.push({
                id: addon.id,
                name: addon.name,
                price_cents: addonPriceCents,
                qty: addonQty
            });
        }

        // Apply promo code (simple flat discount for MVP)
        if (promo_code && promo_code.toUpperCase() === 'FRIEND10') {
            discountCents = Math.round(subtotalCents * 0.10);
        }

        const totalCents = Math.max(0, subtotalCents - discountCents);

        // ── 4. Final capacity check (race condition protection) ──
        // Re-fetch event to ensure tier capacity hasn't changed since step 2
        const { data: eventFresh } = await supabase
            .from('events')
            .select('ticket_tiers')
            .eq('id', event_id)
            .single();

        if (eventFresh?.ticket_tiers) {
            const tierFresh = eventFresh.ticket_tiers.find((t: any) => t.id === tier_id);
            const remainingFresh = (tierFresh?.capacity || 0) - (tierFresh?.sold || 0);
            if (remainingFresh < quantity) {
                return new Response(
                    JSON.stringify({ error: "SOLD_OUT", detail: `Only ${remainingFresh} tickets remaining` }),
                    { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
                );
            }
        }

        // ── 6. Create pending order ──
        const ticketCode = generateTicketCode();
        const { data: order, error: orderError } = await supabase
            .from('event_orders')
            .insert({
                business_id: event.business_id,
                event_id: event.id,
                customer_name: customer?.name || null,
                customer_email: customer?.email || null,
                customer_phone: customer?.phone || null,
                tier_snapshot: { id: tier.id, name: tier.name, price_cents: tierPriceCents },
                quantity: qty,
                addons_snapshot: addonsSnapshot,
                subtotal_cents: subtotalCents,
                discount_cents: discountCents,
                total_cents: totalCents,
                promo_code: promo_code || null,
                payment_status: 'pending',
                ticket_code: ticketCode,
            })
            .select()
            .single();

        if (orderError || !order) {
            console.error("💥 Order creation error:", orderError);
            return new Response(
                JSON.stringify({ error: "ORDER_CREATE_FAILED", detail: orderError?.message }),
                { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        // ── 7. Free event? Skip MP and mark paid ──
        if (event.is_free || totalCents === 0) {
            await supabase
                .from('event_orders')
                .update({ payment_status: 'paid', payment_method: 'free' })
                .eq('id', order.id);

            return new Response(
                JSON.stringify({
                    free_order: true,
                    order_id: order.id,
                    ticket_code: ticketCode,
                    guest_token: order.guest_token,
                    redirect_url: `https://foodspotapp.vercel.app/receipt?event_order_id=${order.id}&payment=success`
                }),
                { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        // ── 6. Fetch MP access token ──
        const { data: branding, error: brandingError } = await supabase
            .from('branding')
            .select("mp_access_token, business_name, slug, currency")
            .eq("business_id", event.business_id)
            .single();

        if (brandingError || !branding?.mp_access_token) {
            return new Response(
                JSON.stringify({ error: "mp_not_configured" }),
                { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        const accessToken = branding.mp_access_token;
        const businessName = branding.business_name || "FoodSpot";
        const externalReference = `${event.business_id}:${order.id}`;

        // ── 8. Create MP preference ──
        const baseUrl = `https://foodspotapp.vercel.app/${branding.slug || 'demo'}/events`;
        const preferenceBody = {
            items: [{
                title: `${event.name} - ${tier.name}`,
                description: event.description?.substring(0, 200) || `Ticket for ${event.name}`,
                quantity: 1,
                unit_price: totalCents / 100,
                currency_id: branding.currency || "ARS"
            }],
            back_urls: {
                success: `${baseUrl}/ticket?order_id=${order.id}&payment=success&guest_token=${order.guest_token}`,
                failure: `${baseUrl}/ticket?order_id=${order.id}&payment=failure&guest_token=${order.guest_token}`,
                pending: `${baseUrl}/ticket?order_id=${order.id}&payment=pending&guest_token=${order.guest_token}`
            },
            auto_return: "approved",
            external_reference: externalReference,
            notification_url: WEBHOOK_URL,
            payer: {
                email: customer?.email || ""
            }
        };

        const mpResponse = await fetch(MERCADO_PAGO_API, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${accessToken}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify(preferenceBody)
        });

        const mpData = await mpResponse.json();

        if (!mpResponse.ok || !mpData.init_point) {
            console.error("💥 Mercado Pago Error:", mpData);
            return new Response(
                JSON.stringify({ error: "MP_ERROR", detail: mpData }),
                { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        // Store preference ID on order
        await supabase
            .from("event_orders")
            .update({ mp_preference_id: mpData.id })
            .eq("id", order.id);

        return new Response(
            JSON.stringify({
                init_point: mpData.init_point,
                sandbox_init_point: mpData.sandbox_init_point,
                redirect_url: mpData.sandbox_init_point || mpData.init_point,
                preference_id: mpData.id,
                order_id: order.id,
                ticket_code: ticketCode,
                guest_token: order.guest_token,
                external_reference: externalReference
            }),
            { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );

    } catch (err) {
        console.error("💥 create-event-preference Error:", err);
        return new Response(
            JSON.stringify({ error: "Internal server error", details: err.message }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }
});
