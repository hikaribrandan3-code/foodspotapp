/**
 * mercadopago-handler: Mercado Pago Webhook Handler
 * 
 * Processes MP webhook notifications and updates order status to 'paid'
 * 
 * Webhook URL: https://buendqgmwpxdixwvlkhd.supabase.co/functions/v1/mercadopago-handler
 * 
 * Environment Variables:
 *   - MP_ACCESS_TOKEN: Mercado Pago Access Token
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// Initialize Supabase client with service role key
const supabaseUrl = "https://buendqgmwpxdixwvlkhd.supabase.co";
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Mercado Pago API client
async function getPaymentStatus(paymentId: string, accessToken: string) {
    try {
        const response = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
            headers: {
                "Authorization": `Bearer ${accessToken}`,
            },
        });
        
        if (!response.ok) {
            console.error(`[mercadopago-handler] Payment fetch failed: ${response.status}`);
            return null;
        }
        
        return await response.json();
    } catch (error) {
        console.error("[mercadopago-handler] Error fetching payment:", error);
        return null;
    }
}

// Update order status in database
async function updateOrderStatus(externalRef: string, paymentData: any) {
    try {
        // Extract order ID from external reference (plain UUID, no underscore)
        const orderId = externalRef;
        
        if (!orderId) {
            console.error(`[mercadopago-handler] Invalid external reference: ${externalRef}`);
            return { success: false, error: "Invalid external reference" };
        }

        // Update order with payment info
        const { data, error } = await supabase
            .from('orders')
            .update({
                status: 'paid_unreleased',
                payment_status: paymentData.status,
                payment_id: paymentData.id,
                paid_at: new Date().toISOString(),
                mp_payment_data: paymentData
            })
            .eq('id', orderId)
            .select()
            .single();

        if (error) {
            console.error("[mercadopago-handler] Database update error:", error);
            return { success: false, error: error.message };
        }

        console.log(`[mercadopago-handler] Order ${orderId} marked as paid`);
        return { success: true, order: data };
    } catch (error) {
        console.error("[mercadopago-handler] Error updating order:", error);
        return { success: false, error: error.message };
    }
}

serve(async (req: Request) => {
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }

    try {
        const MP_ACCESS_TOKEN = Deno.env.get("MP_ACCESS_TOKEN");
        
        if (!MP_ACCESS_TOKEN) {
            console.error("[mercadopago-handler] MP_ACCESS_TOKEN not configured");
            return new Response(
                JSON.stringify({ error: "CONFIGURATION_ERROR", detail: "MP_ACCESS_TOKEN not set" }),
                { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        // Parse webhook payload
        const payload = await req.json();
        console.log("[mercadopago-handler] Webhook received:", JSON.stringify(payload, null, 2));

        // Handle different webhook types
        const { type, data } = payload;

        // Only process payment notifications
        if (type !== "payment") {
            console.log(`[mercadopago-handler] Ignoring webhook type: ${type}`);
            return new Response(
                JSON.stringify({ received: true, processed: false, reason: "Not a payment notification" }),
                { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        // Get payment details from Mercado Pago
        const paymentId = data?.id;
        if (!paymentId) {
            return new Response(
                JSON.stringify({ error: "BAD_REQUEST", detail: "Payment ID missing" }),
                { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        // Fetch full payment details
        const paymentDetails = await getPaymentStatus(paymentId, MP_ACCESS_TOKEN);
        
        if (!paymentDetails) {
            return new Response(
                JSON.stringify({ error: "PAYMENT_FETCH_FAILED", detail: "Could not retrieve payment details" }),
                { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        console.log("[mercadopago-handler] Payment details:", JSON.stringify(paymentDetails, null, 2));

        // Check if payment is approved
        if (paymentDetails.status !== "approved") {
            console.log(`[mercadopago-handler] Payment status: ${paymentDetails.status}, not processing`);
            return new Response(
                JSON.stringify({ received: true, processed: false, status: paymentDetails.status }),
                { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        // Get external reference (order ID)
        const externalRef = paymentDetails.external_reference;
        if (!externalRef) {
            return new Response(
                JSON.stringify({ error: "BAD_REQUEST", detail: "External reference missing" }),
                { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        // Update order status
        const result = await updateOrderStatus(externalRef, paymentDetails);

        if (!result.success) {
            return new Response(
                JSON.stringify({ error: "UPDATE_FAILED", detail: result.error }),
                { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        return new Response(
            JSON.stringify({ 
                received: true, 
                processed: true, 
                order_id: result.order?.id,
                payment_id: paymentId,
                status: "paid_unreleased"
            }),
            { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );

    } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : "Unknown error";
        console.error("[mercadopago-handler] Error:", errorMessage);
        return new Response(
            JSON.stringify({ error: "INTERNAL_ERROR", detail: errorMessage }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }
});
