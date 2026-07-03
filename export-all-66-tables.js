#!/usr/bin/env node

/**
 * FOODSPOT COMPLETE DATABASE EXPORT — ALL 66 TABLES
 * Uses service role key for 100% access
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const SUPABASE_URL = 'https://buendqgmwpxdixwvlkhd.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ1ZW5kcWdtd3B4ZGl4d3Zsa2hkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzM2MTM3NSwiZXhwIjoyMDgyOTM3Mzc1fQ.TV3JFX3lE3TcHQaaACYI5LoI2WRLqlB8OuL0V7nfDAg';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const TABLES = [
  'agent_registry', 'ai_master_memory', 'ai_memory_profiles', 'audit_log',
  'branding', 'branding_secrets', 'business_cash_settings', 'business_secrets',
  'businesses', 'captain_laws', 'categories', 'creator_attribution',
  'customer_contacts', 'delivery_settings', 'el_momento_hearts', 'el_momento_photos',
  'event_checkins', 'event_leads', 'event_orders', 'event_promo_codes',
  'events', 'events_active', 'expenses', 'image_generation_logs',
  'image_usage', 'inventory', 'inventory_cogs_summary', 'inventory_suppliers',
  'inventory_transactions', 'landing_signups', 'language_settings', 'ledger_entries',
  'loyalty_accounts', 'loyalty_free_items', 'loyalty_referral_claims', 'loyalty_settings',
  'loyalty_transactions', 'menu_items', 'menu_view', 'order_sessions',
  'order_status_logs', 'order_transitions', 'orders', 'orders_active',
  'owner_notifications', 'password_reset_codes', 'payment_method_configs', 'products',
  'profiles', 'reservations', 'shift_events', 'shift_payment_breakdowns',
  'shifts', 'split_payments', 'staff', 'staff_shifts',
  'table_ledgers', 'tenant_config', 'transaction_ledger', 'ugc_activation_states',
  'ugc_activations', 'usage_tracking', 'variance_alerts', 'wallet_transactions',
  'wallets'
];

async function exportDatabase() {
  console.log(`🔄 Exporting FoodSpot Database (${TABLES.length} tables)...\n`);

  const database = {
    exportedAt: new Date().toISOString(),
    supabaseProject: SUPABASE_URL,
    totalTables: TABLES.length,
    tables: {}
  };

  let successCount = 0;
  let totalRows = 0;

  for (const tableName of TABLES) {
    process.stdout.write(`📦 ${tableName.padEnd(30)} ... `);

    try {
      const { data, error } = await supabase
        .from(tableName)
        .select('*')
        .limit(10000);

      if (error) {
        console.log(`⚠️  Cannot read (${error.code})`);
        database.tables[tableName] = { rowCount: 0, rows: [], error: error.message };
        continue;
      }

      const rowCount = data ? data.length : 0;
      totalRows += rowCount;
      database.tables[tableName] = {
        rowCount: rowCount,
        rows: data || []
      };

      console.log(`✅ (${rowCount} rows)`);
      successCount++;
    } catch (e) {
      console.log(`❌ Error: ${e.message}`);
      database.tables[tableName] = { rowCount: 0, rows: [], error: e.message };
    }
  }

  // Add summary
  database.summary = {
    successCount,
    totalRows,
    timestamp: new Date().toISOString()
  };

  // Output
  const output = JSON.stringify(database, null, 2);
  console.log(`\n\n✅ Exported ${successCount}/${TABLES.length} tables (${totalRows.toLocaleString()} total rows)`);

  // Save to file
  const filename = `foodspot-database-complete-2026-07-02.json`;
  fs.writeFileSync(filename, output);
  console.log(`\n📁 Saved to: ${filename}`);
  console.log(`📊 Size: ${(output.length / 1024 / 1024).toFixed(2)} MB`);
}

exportDatabase().catch(console.error);
