# FoodSpot Database Schema Audit & Governance

## 🔴 CURRENT CRISIS: Branding Table Is Broken

**Status:** `branding` table queries return 400 Bad Request  
**Root Cause:** Code queries `.eq('business_id', ...)` but column doesn't exist  
**Hotfix Applied:** Changed to `.eq('user_id', ...)` — **STILL FAILING**  
**Real Issue:** `businessId` variable in app = `tenants.id`, but `branding.user_id` = `auth.users.id`  
These are **different UUIDs**. Querying `user_id` with a `tenants.id` UUID will never match.

---

## 📊 What The Pros Do

### 1. Schema-First Development (Migration-Based)
**NEVER** create tables manually in the UI. Every table change = a migration file.

```
supabase/migrations/
├── 000001_create_base_tables.sql          # branding, tenants, orders
├── 000002_add_menu_items.sql
├── 000003_add_inventory.sql
└── 000004_add_multi_currency.sql
```

**Tools:**
- **Supabase CLI** (`supabase db diff` → generates migrations from live DB)
- **dbmate** (lightweight migration runner)
- **Prisma** (schema + ORM + migrations)
- **Flyway** (enterprise-grade)

### 2. Schema Documentation (THIS FILE)
Every table documented with:
- Column name + type + constraints
- Relationships (FKs)
- RLS policies
- What each column actually IS (not just what it's called)

### 3. Schema Validation in CI/CD
```yaml
# .github/workflows/schema-check.yml
- name: Validate schema matches migrations
  run: |
    npx supabase db dump --schema-only > live_schema.sql
    diff live_schema.sql supabase/migrations/000001_create_base_tables.sql
```

### 4. Column Naming Convention (CRITICAL)
| Concept | Column Name | What It References |
|---------|-------------|-------------------|
| Auth user ID | `user_id` | `auth.users.id` |
| Business/Tenant ID | `tenant_id` | `public.tenants.id` |
| Branding record ID | `id` | `public.branding.id` |

**NEVER use `business_id` unless it literally references a `businesses` table.**

---

## 🗂️ What We Know vs. What We Guess

### KNOWN (from code):

| Table | Column | From Code |
|-------|--------|-----------|
| `branding` | `user_id` | `TrialSignup.jsx` line 374 |
| `branding` | `business_name` | `TrialSignup.jsx` line 375 |
| `branding` | `slug` | `TrialSignup.jsx` line 376 |
| `branding` | `trial_ends_at` | `TrialSignup.jsx` line 377 |
| `branding` | `app_config` | `OwnerSummary.jsx` line 104 |
| `branding` | `design_state` | `supabase_editor_schema.sql` |
| `branding` | `last_printed_at` | `supabase_editor_schema.sql` |
| `tenants` | `id` | `TenantContext.jsx` line 138 |
| `tenants` | `venue_name` | `TenantContext.jsx` line 140 |
| `tenants` | `owner_id` | `TenantContext.jsx` line 140 |
| `tenants` | `language` | `TenantContext.jsx` line 140 |

### UNKNOWN (need to verify in Supabase SQL Editor):

```sql
-- RUN THIS IN SUPABASE SQL EDITOR:
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'branding'
ORDER BY ordinal_position;

-- ALSO RUN:
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'tenants'
ORDER BY ordinal_position;
```

**Screenshot the results. That's your source of truth.**

---

## 🔧 THE REAL FIX (Do This)

### Option A: Add `tenant_id` to branding (RECOMMENDED)

This is the **architecturally correct** fix. Every table that belongs to a business should reference `tenants.id`.

```sql
-- Migration: 000005_fix_branding_tenant_id.sql

-- Step 1: Add the missing column
ALTER TABLE branding 
ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id);

-- Step 2: Backfill from tenants.owner_id → tenants.id mapping
UPDATE branding b
SET tenant_id = t.id
FROM tenants t
WHERE b.user_id = t.owner_id;

-- Step 3: Make it required going forward
-- ALTER TABLE branding ALTER COLUMN tenant_id SET NOT NULL;

-- Step 4: Add index for performance
CREATE INDEX IF NOT EXISTS idx_branding_tenant ON branding(tenant_id);

-- Step 5: Create RLS policy using tenant_id
CREATE POLICY "branding_tenant_isolation" ON branding
  USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
```

Then revert my code changes back to `.eq('tenant_id', ...)` or `.eq('business_id', ...)` if you want to keep that naming.

### Option B: Query by `slug` (Quick & Dirty)

If `tenant_id` is too much right now, just change `getBranding()` to query by `slug` instead of `user_id`:

```javascript
// In supabaseClient.js
export async function getBranding(slug) {
    const { data, error } = await supabase
        .from('branding')
        .select('*')
        .eq('slug', slug)
        .single()
    return { data, error }
}
```

**But:** `slug` can change. `tenant_id` is immutable. Use Option A for production.

### Option C: Rename `user_id` → `owner_id` + Add `tenant_id`

Most explicit schema:

```sql
ALTER TABLE branding RENAME COLUMN user_id TO owner_id;
ALTER TABLE branding ADD COLUMN tenant_id UUID REFERENCES tenants(id);
```

This makes it crystal clear:
- `owner_id` = who created it (auth user)
- `tenant_id` = which business it belongs to

---

## 🛡️ Prevention: Schema Governance Rules

### Rule 1: Every Table Gets a Migration
```bash
# NEVER do this:
supabase SQL Editor → click "New Table"

# ALWAYS do this:
echo "CREATE TABLE thing (...)" > supabase/migrations/20260420_add_thing.sql
supabase db push
```

### Rule 2: Every Column Gets a Comment
```sql
COMMENT ON COLUMN branding.user_id IS 'References auth.users.id — the account owner';
COMMENT ON COLUMN branding.slug IS 'URL-friendly business name. Can change!';
```

### Rule 3: Document Relationships
```sql
-- branding.tenant_id → tenants.id
-- tenants.owner_id → auth.users.id
-- orders.tenant_id → tenants.id
```

### Rule 4: Schema Audit Every Sprint
Before each release:
1. Dump current schema
2. Compare to migrations
3. If different → someone cheated with the UI

---

## 📋 Action Items

| # | Task | Owner | Priority |
|---|------|-------|----------|
| 1 | Run SQL Editor query → screenshot actual branding schema | Hikari | 🔴 NOW |
| 2 | Choose Option A, B, or C above | Hikari | 🔴 NOW |
| 3 | Run the migration in Supabase SQL Editor | Hikari | 🔴 NOW |
| 4 | Revert my hotfix code → use proper column name | Kimi | After #3 |
| 5 | Dump full schema → save as `supabase/schema.sql` | Kimi | This week |
| 6 | Set up `supabase db diff` in CI/CD | Kimi | Next sprint |
| 7 | Add this file to repo | Done | ✅ |

---

## 💡 The "Pro" Difference

**Amateur:** "It works on my machine, ship it."

**Pro:** "If I get hit by a bus, can someone else recreate this database in 10 minutes?"

The schema file is your **bus insurance.**

---

## Related Files

- `supabase/migrations/` — all migration files
- `src/lib/supabaseClient.js` — where the broken queries live
- `src/contexts/TenantContext.jsx` — how `tenants` table is used
- `src/pages/auth/TrialSignup.jsx` — where `branding` rows are created

---

*My first day. This dummy's database has no birth certificate, no schema file, and three different ID systems fighting each other. We're fixing it properly now.*
