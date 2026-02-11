
/**
 * cleanup-orphans: The Automatic Janitor
 * 
 * 🧹 Mission: Identify and archive abandoned orders ("Ghost Orders").
 * 🛡️ Safety: Runs with SERVICE_ROLE_KEY to bypass RLS (God Mode).
 * ⏱️ Schedule: Every 60 minutes via pg_cron.
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
    // 1. Handle CORS preflight
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }

    try {
        console.log("🧹 cleanup-orphans: Starting Janitor Routine...");

        // 2. Initialize Supabase Client (God Mode)
        const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
        const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

        if (!supabaseUrl || !supabaseServiceKey) {
            console.error("❌ Missing Environment Variables");
            return new Response(JSON.stringify({ error: "Configuration Error" }), {
                status: 500,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        }

        const supabase = createClient(supabaseUrl, supabaseServiceKey);

        // 3. Define Threshold (60 Minutes Ago)
        const ONE_HOUR = 60 * 60 * 1000;
        const thresholdTime = new Date(Date.now() - ONE_HOUR).toISOString();

        console.log(`⏱️ Scanning for orders older than: ${thresholdTime}`);

        // 4. Execute Purge
        // Safety Lock: ONLY touch 'awaiting_payment'. 
        // This implicitly protects 'confirmado', 'en_cocina', etc.
        const { data, error, count } = await supabase
            .from("orders")
            .update({ status: "expired" })
            .eq("status", "awaiting_payment")
            .lt("created_at", thresholdTime)
            .select();

        if (error) {
            console.error("❌ cleanup-orphans: Database Error", error);
            throw error;
        }

        const expiredCount = data?.length || 0;
        console.log(`✅ cleanup-orphans: Operation Complete. Expired ${expiredCount} ghost orders.`);

        return new Response(
            JSON.stringify({
                success: true,
                message: `Expired ${expiredCount} orders.`,
                timestamp: new Date().toISOString()
            }),
            {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
                status: 200,
            }
        );

    } catch (err) {
        console.error("❌ cleanup-orphans: Fatal Error", err);
        return new Response(
            JSON.stringify({ error: err.message }),
            {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
                status: 500,
            }
        );
    }
});
