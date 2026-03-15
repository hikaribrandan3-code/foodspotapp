// ============================================
// 🚀 VIBE BOOST - Bulk Credit to Active Festival Cards
// ============================================
// Deploy: supabase functions deploy vibe-boost --no-verify-jwt
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
        const { business_id, amount_cents, locale } = await req.json();

        if (!business_id || !amount_cents) {
            return new Response(
                JSON.stringify({ error: "Missing business_id or amount_cents" }),
                { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        // Integer math only - amount_cents is in minor units
        console.log(`🚀 [vibe-boost] Adding ${amount_cents} cents to all active wallets for business: ${business_id}`);

        const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
        const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
        const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

        // Get all active wallets for this business
        const { data: wallets, error: fetchError } = await supabase
            .from("wallets")
            .select("id, balance, card_holder_name")
            .eq("business_id", business_id)
            .eq("status", "active");

        if (fetchError) throw fetchError;

        if (!wallets || wallets.length === 0) {
            const noWalletsMsg = locale === "en" 
                ? "No active cards to boost" 
                : "No hay tarjetas activas para estimular";
            return new Response(
                JSON.stringify({ message: noWalletsMsg, updated: 0 }),
                { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        // Bulk update - add amount to each wallet
        const updates = wallets.map(wallet => ({
            id: wallet.id,
            balance: wallet.balance + amount_cents
        }));

        // Update each wallet
        for (const update of updates) {
            const { error: updateError } = await supabase
                .from("wallets")
                .update({ 
                    balance: update.balance,
                    updated_at: new Date().toISOString()
                })
                .eq("id", update.id);

            if (updateError) {
                console.error(`[vibe-boost] Failed to update wallet ${update.id}:`, updateError);
            }
        }

        // Log transactions
        for (const wallet of wallets) {
            await supabase
                .from("wallet_transactions")
                .insert({
                    wallet_id: wallet.id,
                    amount: amount_cents,
                    type: "credit",
                    description: locale === "en" ? "Vibe Boost gift credit" : "Crédito de regalo Vibe Boost"
                });
        }

        const successMsg = locale === "en" 
            ? "Gift credit applied!" 
            : "¡Crédito de regalo aplicado!";

        console.log(`✅ [vibe-boost] Updated ${wallets.length} wallets`);

        return new Response(
            JSON.stringify({ 
                message: successMsg,
                updated: wallets.length,
                amount_cents
            }),
            { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );

    } catch (err) {
        console.error("💥 vibe-boost error:", err);
        return new Response(
            JSON.stringify({ error: err.message }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }
});