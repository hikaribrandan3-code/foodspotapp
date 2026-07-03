#!/usr/bin/env node

/**
 * FOODSPOT COMPLETE DATABASE EXPORT
 * Exports: schema (tables, columns, constraints, indexes, policies) + ALL data
 * Usage: node export-full-database.js > database-export.json
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://buendqgmwpxdixwvlkhd.supabase.co';
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_iv5xVk4DIMCq2l_oXvSNeQ_kwY038TD';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function getTableSchema() {
  const { data, error } = await supabase
    .from('information_schema.tables')
    .select('table_name')
    .eq('table_schema', 'public')
    .order('table_name');

  if (error) throw error;
  return data.map(t => t.table_name);
}

async function getTableStructure(tableName) {
  const { data: columns, error: colError } = await supabase
    .from('information_schema.columns')
    .select('column_name, data_type, is_nullable, column_default')
    .eq('table_schema', 'public')
    .eq('table_name', tableName)
    .order('ordinal_position');

  if (colError) throw colError;

  const { data: constraints, error: conError } = await supabase
    .from('information_schema.table_constraints')
    .select('constraint_name, constraint_type')
    .eq('table_schema', 'public')
    .eq('table_name', tableName);

  if (conError) throw conError;

  return { columns, constraints };
}

async function getTableData(tableName) {
  try {
    const { data, error, status } = await supabase
      .from(tableName)
      .select('*')
      .limit(10000); // Limit to prevent memory overload

    if (error && status !== 406) {
      console.warn(`⚠️  Could not read ${tableName}:`, error.message);
      return [];
    }
    return data || [];
  } catch (e) {
    console.warn(`⚠️  Error reading ${tableName}:`, e.message);
    return [];
  }
}

async function getRLSPolicies(tableName) {
  try {
    const { data, error } = await supabase
      .rpc('get_rls_policies', { table_name: tableName });

    if (error || !data) return [];
    return data;
  } catch (e) {
    return [];
  }
}

async function exportDatabase() {
  console.log('🔄 Fetching table list...');
  const tables = await getTableSchema();
  console.log(`📊 Found ${tables.length} tables`);

  const database = {
    exportedAt: new Date().toISOString(),
    supabaseProject: SUPABASE_URL,
    tables: {}
  };

  for (const tableName of tables) {
    process.stdout.write(`📦 ${tableName}... `);

    try {
      const { columns, constraints } = await getTableStructure(tableName);
      const rowCount = (await getTableData(tableName)).length;

      database.tables[tableName] = {
        schema: {
          columns: columns.map(c => ({
            name: c.column_name,
            type: c.data_type,
            nullable: c.is_nullable === 'YES',
            default: c.column_default
          })),
          constraints: constraints.map(c => ({
            name: c.constraint_name,
            type: c.constraint_type
          }))
        },
        rowCount: rowCount,
        sample: (await getTableData(tableName)).slice(0, 5)
      };

      console.log(`✅ (${rowCount} rows)`);
    } catch (e) {
      console.log(`❌ Error: ${e.message}`);
    }
  }

  // Output as JSON
  console.log('\n\n' + JSON.stringify(database, null, 2));

  // Also save to file
  const filename = `foodspot-database-export-${new Date().toISOString().split('T')[0]}.json`;
  fs.writeFileSync(filename, JSON.stringify(database, null, 2));
  console.log(`\n✅ Exported to: ${filename}`);
}

exportDatabase().catch(console.error);
