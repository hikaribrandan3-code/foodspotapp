// ============================================
// 💳 CREATE PREFERENCE - THE VAULT EDGE FUNCTION
// ============================================
// Security Level: 🛡️ CRITICAL
// MP Access Token NEVER touches the frontend.
//
// Deploy: supabase functions deploy create-preference --no-verify-jwt
// ============================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";

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
        // 1. PARSE REQUEST
        // ============================================
        const { order_id } = await req.json();

        if (!order_id) {
            return new Response(
                JSON.stringify({ error: "Missing order_id" }),
                { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        console.log(`💳 [create-preference] Processing order: ${order_id}`);

        const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
        const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
        const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

        // ============================================
        // 2. FETCH ORDER
        // ============================================
        const { data: order, error: orderError } = await supabase
            .from("orders")
            .select("*")
            .eq("id", order_id)
            .single();

        if (orderError || !order) {
            console.error("❌ Order not found:", orderError);
            return new Response(
                JSON.stringify({ error: "Order not found" }),
                { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        // ============================================
        // 3. PRE-FLIGHT: ITEM AVAILABILITY & PRICE CHECK
        // ============================================
        // The "Inflation Guard" + "Agotado Guard"
        const orderItems = order.items || [];
        const itemIds = orderItems.map((i: any) => i.id).filter(Boolean);

        if (itemIds.length > 0) {
            const { data: menuItems, error: menuError } = await supabase
                .from("menu_items")
                .select("id, name, price, available")
                .in("id", itemIds);

            if (!menuError && menuItems && menuItems.length > 0) {
                const menuMap = new Map(menuItems.map((mi: any) => [mi.id, mi]));

                for (const cartItem of orderItems) {
                    const dbItem = menuMap.get(cartItem.id);
                    if (!dbItem) continue; // Item not in menu_items table (legacy data)

                    // 🛡️ AGOTADO GUARD: Check availability
                    if (dbItem.available === false) {
                        console.error(`🚫 Item AGOTADO: ${dbItem.name} (${dbItem.id})`);

                        // Mark order as failed
                        await supabase
                            .from("orders")
                            .update({ status: "cancelled", cancel_reason: `Item agotado: ${dbItem.name}` })
                            .eq("id", order_id);

                        return new Response(
                            JSON.stringify({
                                error: "item_unavailable",
                                message: `"${dbItem.name}" ya no está disponible. Por favor, actualiza tu pedido.`,
                                item_name: dbItem.name
                            }),
                            { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
                        );
                    }

                    // 🛡️ INFLATION GUARD: Check price hasn't changed
                    if (dbItem.price !== cartItem.price) {
                        console.warn(`💰 Price mismatch for ${dbItem.name}: cart=$${cartItem.price}, db=$${dbItem.price}`);

                        // Mark order as needing attention
                        await supabase
                            .from("orders")
                            .update({ status: "cancelled", cancel_reason: `Precio actualizado: ${dbItem.name} ($${cartItem.price} → $${dbItem.price})` })
                            .eq("id", order_id);

                        return new Response(
                            JSON.stringify({
                                error: "price_mismatch",
                                message: `El precio de "${dbItem.name}" cambió. Por favor, actualiza tu pedido.`,
                                item_name: dbItem.name,
                                old_price: cartItem.price,
                                new_price: dbItem.price
                            }),
                            { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
                        );
                    }
                }
            }
        }

        // ============================================
        // 4. FETCH TENANT'S MP ACCESS TOKEN (SERVER-SIDE ONLY)
        // ============================================
        const { data: branding, error: brandingError } = await supabase
            .from("branding")
            .select("mp_access_token, business_name, slug")
            .eq("business_id", order.business_id)
            .single();

        if (brandingError || !branding?.mp_access_token) {
            console.error("❌ No MP token for business:", order.business_id, brandingError);
            return new Response(
                JSON.stringify({ error: "mp_not_configured", message: "Mercado Pago no está configurado para este negocio." }),
                { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        const accessToken = branding.mp_access_token;
        const businessName = branding.business_name || "Local";
        const slug = branding.slug || "";

        // ============================================
        // 5. BUILD MP PREFERENCE
        // ============================================
        // 🛡️ CRITICAL: notification_url points to the mp-webhook Edge Function, NOT the frontend
        const WEBHOOK_URL = `${SUPABASE_URL}/functions/v1/mp-webhook`;

        // Build the frontend base URL for back_urls
        const APP_BASE_URL = Deno.env.get("APP_BASE_URL") || "https://foodspot.app";
        const statusBase = slug ? `${APP_BASE_URL}/${slug}/status` : `${APP_BASE_URL}/status`;

        const preferenceBody = {
            items: [{
                title: `Pedido #${order.order_number} - ${businessName}`,
                quantity: 1,
                unit_price: order.total,
                currency_id: "ARS"
            }],
            back_urls: {
                success: `${statusBase}/${order.id}?payment=success`,
                failure: `${statusBase}/${order.id}?payment=failure`,
                pending: `${statusBase}/${order.id}?payment=pending`
            },
            auto_return: "approved",
            external_reference: order.id,
            notification_url: WEBHOOK_URL
        };

        console.log(`📡 Creating MP preference with notification_url: ${WEBHOOK_URL}`);

        const mpResponse = await fetch("https://api.mercadopago.com/checkout/preferences", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${accessToken}`
            },
            body: JSON.stringify(preferenceBody)
        });

        const mpData = await mpResponse.json();

        if (!mpResponse.ok || !mpData.init_point) {
            console.error("❌ MP Preference Error:", mpData);
            return new Response(
                JSON.stringify({ error: "mp_error", message: "Error al crear el pago en Mercado Pago.", details: mpData }),
                { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        console.log(`✅ Preference created: ${mpData.id}`);

        // ============================================
        // 6. STORE PREFERENCE ID ON ORDER
        // ============================================
        await supabase
            .from("orders")
            .update({ mp_preference_id: mpData.id })
            .eq("id", order.id);

        // ============================================
        // 7. RETURN INIT_POINT TO FRONTEND
        // ============================================
        return new Response(
            JSON.stringify({
                init_point: mpData.init_point,
                preference_id: mpData.id
            }),
            { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );

    } catch (err) {
        console.error("💥 create-preference Error:", err);
        return new Response(
            JSON.stringify({ error: "Internal server error", details: err.message }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }
});
