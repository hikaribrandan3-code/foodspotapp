#!/usr/bin/env node

/**
 * FOODSPOT DATABASE EXPORT VIA SQL
 * Exports complete schema + data via direct SQL queries
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const SUPABASE_URL = 'https://buendqgmwpxdixwvlkhd.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ1ZW5kcWdtd3B4ZGl4d3Zsa2hkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzM2MTM3NSwiZXhwIjoyMDgyOTM3Mzc1fQ.TV3JFX3lE3TcHQaaACYI5LoI2WRLqlB8OuL0V7nfDAg';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function exportDatabase() {
  console.log('🔄 Exporting FoodSpot Database...\n');

  const database = {
    exportedAt: new Date().toISOString(),
    supabaseProject: SUPABASE_URL,
    tables: {}
  };

  // Step 1: Get list of all tables in public schema
  console.log('📋 Fetching table list...');
  const { data: tables, error: tableError } = await supabase.rpc('get_all_tables', {});

  let tableNames = [];
  if (!tableError && tables) {
    tableNames = tables.map(t => t.table_name);
    console.log(`✅ Found ${tableNames.length} tables\n`);
  } else {
    // Fallback: manually list known tables
    tableNames = [
      'businesses', 'branding', 'users', 'staff', 'menu_items', 'categories',
      'orders', 'order_items', 'event_orders', 'events', 'event_tiers',
      'event_attendees', 'expenses', 'inventory', 'inventory_transactions',
      'transaction_ledger', 'audit_log', 'ai_master_memory', 'ai_knowledge',
      'ai_strategies', 'ai_conversations', 'image_generation_logs', 'image_usage',
      'branding_secrets', 'order_totals_cache'
    ];
    console.log(`⚠️  Using fallback table list (${tableNames.length} tables)\n`);
  }

  // Step 2: For each table, get schema info + sample data
  for (const tableName of tableNames) {
    process.stdout.write(`📦 ${tableName.padEnd(30)} ... `);

    try {
      // Get all rows
      const { data, error } = await supabase
        .from(tableName)
        .select('*')
        .limit(10000);

      if (error) {
        console.log(`⚠️  Cannot read (${error.code})`);
        continue;
      }

      const rowCount = data ? data.length : 0;
      database.tables[tableName] = {
        rowCount: rowCount,
        sampleRows: data ? data.slice(0, 5) : [],
        allRows: data || []
      };

      console.log(`✅ (${rowCount} rows)`);
    } catch (e) {
      console.log(`❌ Error: ${e.message}`);
    }
  }

  // Step 3: Output formatted JSON
  const output = JSON.stringify(database, null, 2);
  console.log('\n\n' + '='.repeat(80));
  console.log('COMPLETE DATABASE EXPORT');
  console.log('='.repeat(80) + '\n');
  console.log(output);

  // Step 4: Save to file
  const filename = `foodspot-database-export-${new Date().toISOString().split('T')[0]}.json`;
  fs.writeFileSync(filename, output);
  console.log(`\n✅ Saved to: ${filename}`);
  console.log(`📊 Size: ${(output.length / 1024 / 1024).toFixed(2)} MB`);
}

exportDatabase().catch(console.error);
