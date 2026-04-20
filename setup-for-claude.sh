#!/bin/bash
# setup-for-claude.sh
# Run this once to give Claude Code full project context

echo "=== FoodSpot-OS Co-Founder Setup ==="
echo ""

# 1. Show all critical files
echo "📄 Critical Documentation Files:"
ls -la SOUL.md AGENTS.md MEMORY.md USER.md docs/DATABASE_SCHEMA.md 2>/dev/null || echo "  (some files missing)"

echo ""
echo "📊 Audit & Deployment Files:"
ls -la AUDIT_REPORT.md DEPLOYMENT_GHOST_MONEY.md LTM_DEPLOYMENT_SUMMARY.md 2>/dev/null || echo "  (some files missing)"

echo ""
echo "🗄️  Database Migrations:"
ls -la supabase/migrations/ 2>/dev/null | head -10

echo ""
echo "⚙️  Tech Stack (from package.json):"
grep -E '"react"|"vite"|"supabase"|"@supabase"' package.json 2>/dev/null | head -5

echo ""
echo "🚀 Current Git Status:"
git status --short | head -10

echo ""
echo "🌐 Supabase Project:"
grep -o 'buendqgmwpxdixwvlkhd' src/lib/supabaseClient.js 2>/dev/null && echo "  ✅ Found: buendqgmwpxdixwvlkhd"

echo ""
echo "✅ Setup complete. Claude can now read all files and understand the full project."
echo "Next: Run 'claude' and paste the co-founder brief."
