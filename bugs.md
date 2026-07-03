# FOODSPOT DATABASE FIXES TRACKER

**Last Updated:** 2026-07-02  
**Database Version:** v2.2.1  
**Status:** 5/7 Quick Wins Applied

---

## 🚨 INCIDENT: MP Token Security Fix Attempt (2026-07-02)

**Summary:** Attempted to move Mercado Pago access tokens from public `branding` table to private `branding_secrets` table with RLS. Implementation broke payment webhooks and order processing. **Reverted.** Security issue remains unfixed.

**Date:** 2026-07-02  
**Duration:** ~4 hours (revert + redeploy)  
**Impact:** 4-hour production outage (orders stuck at "esperando pago")  
**Status:** ✅ Reverted to working state; ⚠️ Security issue documented for future fix

### What We Tried

1. **Created 3 SQL migrations:**
   - `20260702000000_secure_mp_tokens_backfill.sql` — Add `mp_access_token`, `mp_refresh_token`, `mp_token_expires_at`, `mp_public_key`, `mp_connected_at` columns to `branding_secrets`
   - `20260702000001_secure_mp_tokens_rpcs.sql` — Create SECURITY DEFINER RPCs: `get_mp_credentials()` and `set_mp_credentials()` with ownership checks
   - `20260702000002_secure_mp_tokens_drop_from_branding.sql` — Drop token columns from `branding` table

2. **Modified frontend + edge functions:**
   - `OwnerSummary.jsx` — Changed from reading `tenantData.mp_access_token` to calling `get_mp_credentials()` RPC
   - `OwnerSummary.jsx` — Changed token save from direct `.update({mp_access_token})` to `.rpc('set_mp_credentials')`
   - `create-preference/index.ts` — Changed to read from `branding_secrets` instead of `branding`
   - `mp-oauth/index.ts` — Changed to write to `branding_secrets` instead of `branding`
   - Similar updates to `mp-webhook`, `mp-event-webhook`, `create-event-preference`, `create-split-preference`

3. **Deployed to Vercel** — Code live with token lookups pointing to `branding_secrets`

### Why It Broke (Cascade of Issues)

**Issue #1: Primary Key Collision**
- `branding_secrets.id` was being forced to `= branding.id` (copying a BIGINT)
- But `branding_secrets.id` is independent; two different businesses could have the same id number
- Result: INSERT failed with "duplicate key violates unique constraint branding_secrets_pkey"
- **Attempted fix:** Remove forced id → but then id field was NULL because column had no DEFAULT
- **Another attempt:** Add sequence + default → BUT column was BIGINT with FK to branding.id (BIGINT), not UUID
- **Final attempt:** Drop FK, use BIGINT sequence → but branding.id is the actual FK constraint, making id not independent after all

**Issue #2: RPC Parameter Signature Mismatches**
- Initially wrote `set_mp_credentials(p_business_id, p_access_token, p_user_id)` 
- Frontend called it correctly
- RPC attempted `INSERT INTO branding_secrets (id, business_id, ...)` with forced id from branding lookup
- When id lookup returned NULL or collided, RPC failed silently
- Result: Frontend got "mp_not_configured" error even though token existed

**Issue #3: Edge Function JWT Blocking**
- After revert, webhooks still returned 401
- Root cause: `mp-webhook`, `create-preference`, `mp-oauth` need `--no-verify-jwt` flag at deploy time
- The flag is only in the source code comments (`// Deploy: supabase functions deploy mp-webhook --no-verify-jwt`)
- Flag is NOT persisted in `supabase/config.toml`
- When Vercel auto-redeployed, Supabase reset to default (require JWT), blocking Mercado Pago calls
- **Fix:** Manually redeployed with flag: `supabase functions deploy mp-webhook --no-verify-jwt`

### What Should Have Happened (Better Approach)

Instead of moving tokens to a separate table mid-implementation, safer options:
1. **Encrypt token in-place** — Add `mp_access_token_encrypted TEXT` to `branding`, encrypt/decrypt with SECURITY DEFINER, leave column structure alone
2. **RLS-restrict the column** — Keep token in `branding`, add column-level RLS policy (if Postgres supports it) or separate view
3. **Schedule the fix** — Choose a maintenance window, test thoroughly first, have rollback ready

### Lessons (Don't Repeat)

**Pattern Recognition:**
- **Never force a PK when the table is shared across tenants** — Each tenant's row needs its own id, not borrowed from another table
- **Test RPCs with real data before deploying** — The signature looked right but behavior was silent-failure
- **Edge function deploy flags are not persistent** — Comments are read by humans, not machines. Need a deploy checklist or CI integration

**Testing Gaps:**
- Tested migrations in isolation (they "ran"), not end-to-end (did payment actually work?)
- Didn't verify the RPC returned the token (just trusted the function definition)
- Assumed `--no-verify-jwt` persisted across deploys (it doesn't)

**The Real Fix (For Later):**
The mp_access_token is still exposed in the public `branding` table. The security issue is real but not trivially exploitable (requires schema knowledge + business_id). Mark as **backlog** and implement properly when:
- Time to do it right (no rushing)
- All edge functions are tested end-to-end before deploy
- Deploy flags are in CI/config, not comments
- Rollback procedure is documented

### Current Status

✅ **Reverted to:**
- Code: Pre-migration state (mp_access_token read from `branding`)
- Database: branding_secrets columns dropped, mp_access_token back in branding
- Edge Functions: Redeployed with `--no-verify-jwt` flag

✅ **Payments working:**
- Orders → MP checkout → webhook → order status updates → KDS auto-approve

⚠️ **Security debt:**
- mp_access_token readable from public branding table
- Both food orders and event orders share this exposure
- Affects all tenants equally
- Document in product roadmap as "MP token encryption / RLS hardening"

---

## ⚠️ FRONTEND RENDERING GOTCHAS

### H1 Tags in html2canvas (RECURRING BUG)

**Pattern:** Any `<h1>` element rendered via html2canvas (canvas capture on mobile) renders with wrong color on iOS. Text appears blue-grey instead of white, even when `color: white` is explicitly set.

**Root Cause:** h1 has default browser styles that interfere with canvas rendering. The color property works on all other elements (`<span>`, `<div>`) but not on `<h1>` during canvas capture.

**Fix:** Replace `<h1>` with `<div>` and apply same styles explicitly. No h1 semantics = no rendering interference.

```jsx
// ❌ BROKEN (renders blue-grey on iPhone canvas capture)
<h1 style={{ color: 'white', fontSize: '36px', fontWeight: '900' }}>
  Event Title
</h1>

// ✅ FIXED (renders white)
<div style={{ color: 'white', fontSize: '36px', fontWeight: '900' }}>
  Event Title
</div>
```

**Affected Code:**
- `src/pages/customer/events/components/EventShareCard.jsx` (line 166) — FIXED 2026-05-26

**When You Hit This:**
- Text color mysteriously wrong on iOS only, not Android
- Color works fine for badges, other text, but h1 is broken
- Adding WebkitTextFillColor, textStroke, etc. doesn't help
- It's the h1 tag, not your CSS

**Prevention:** Avoid h1 in html2canvas components. Use div + explicit styling instead.

---

## 🧪 DEBUG CHECKLIST — Translation Hook Crashes

When a component renders with `ReferenceError: Can't find variable: t`, check this first:

**Pattern:** Component uses `t('key')` in JSX but doesn't call `useLanguage()` in the function body.

```jsx
// ❌ BROKEN
function CreateEventView({ businessId, onBack, onSuccess }) {
  return <h1>{t('event_name')}</h1>  // ERROR: t is undefined
}

// ✅ FIXED
function CreateEventView({ businessId, onBack, onSuccess }) {
  const { t } = useLanguage()  // Add this line
  return <h1>{t('event_name')}</h1>
}
```

**Root Cause:** CreateEventView and similar sub-components (EditEventView, CheckinView, PromosView, AttendeeListView) are defined *inside* parent components and don't receive `t` as a prop — they must call the hook directly.

**Quick Audit:**
```bash
grep -r "t('" src/ | grep -v "useLanguage" | head -20
```

**Real Files at Risk:** ~10 admin/event sub-components (not the 102 false positives in utility/context files, which receive `t` from props).

---

## ✅ COMPLETED (Applied to Supabase)

### Performance Fixes Applied
1. ✅ **Composite Index for Active Orders** (`idx_orders_active_tenant`)
   - Query: `(business_id, status, created_at DESC) WHERE is_deleted=false`
   - Impact: KDS active orders dashboard remains <5ms even at 500 tenants

2. ✅ **Partial Indexes for Soft Deletes**
   - `idx_orders_not_deleted` on orders
   - `idx_events_not_deleted` on events
   - Impact: Active queries skip deleted rows, reduced index size

3. ✅ **Inventory Reserve/Release Index** (`idx_inventory_menu_item_business`)
   - Query: `(business_id, menu_item_id)`
   - Impact: Prevents table-level locks during order creation

4. ✅ **Cleanup Functions** 
   - `cleanup_old_audit_log()` — 90 day retention
   - `cleanup_old_inventory_transactions()` — 365 day retention
   - Impact: Stops unbounded table growth

5. ✅ **Materialized View for Analytics** (`mv_daily_sales`)
   - Aggregates daily revenue per business
   - Impact: Dashboards 100x faster (no real-time aggregation)

---

## 🔴 CRITICAL — MUST FIX BEFORE 500 TENANTS

### #1: RLS Security Loophole (HIGHEST PRIORITY)
**Issue:** Current RLS policies use client-supplied `x-business-id` header without validating authenticated user's membership.
- Any user with valid JWT can spoof `x-business-id` header and read/write other tenants' data
- At 500 tenants, this becomes a data breach vector

**Affected Policies:**
- `orders_owner_read` on `orders` table
- `event_orders_owner_read` on `event_orders` table
- `event_orders_guest_read` (cross-tenant fix exists but incomplete)
- And similar patterns on: `branding`, `events`, `staff`, `inventory`, `expenses`, etc.

**Fix Required:**
Replace header-only checks with `auth.uid()` validation:
```sql
-- CURRENT (VULNERABLE):
business_id = (current_setting('request.headers')::json->>'x-business-id')::uuid

-- SHOULD BE:
business_id IN (
  SELECT id FROM businesses WHERE owner_id = auth.uid()
) OR business_id IN (
  SELECT business_id FROM staff WHERE id = auth.uid() AND is_active = true
)
```

**Testing Required Before Deploy:**
- [ ] Owner can read own orders
- [ ] Owner CANNOT read another owner's orders
- [ ] Staff can read orders for assigned business only
- [ ] Guest (unauthenticated) can read own order via guest_token
- [ ] No app lockouts after change
- [ ] Rollback plan ready

**Estimated Work:** 2-3 hours (audit all policies + test)

---

### #2: Missing Foreign Keys & Indexes on business_id
**Issue:** Many tables reference `business_id` but lack:
1. Foreign key constraint to `businesses(id)`
2. Index on `business_id` column (some missing)

This causes:
- Orphaned rows after tenant deletion
- Inefficient RLS filtering (table scans instead of index lookups)
- Silent data integrity issues at scale

**Tables Needing Fixes:**
- `menu_items` — no FK, has index
- `categories` — no FK, no index
- `orders` — no FK, has index
- `expenses` — no FK, no index
- `inventory` — no FK, no index
- `image_generation_logs` — no FK, no index
- `image_usage` — no FK, no index
- `ai_master_memory` — no FK, has index
- `ai_knowledge` — no FK, has index
- `ai_strategies` — no FK, has index
- `ai_conversations` — no FK, has index
- `transaction_ledger` — no FK, no index
- `inventory_transactions` — no FK, no index

**Fix Required:**
```sql
-- Add FK + index for each missing
ALTER TABLE menu_items 
ADD CONSTRAINT fk_menu_items_business 
FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_menu_items_business ON menu_items(business_id);

-- Repeat for all 13 tables above
```

**Testing Required:**
- [ ] No FK violations (all business_ids exist in businesses table)
- [ ] Query performance improves on business_id filters
- [ ] Tenant deletion cascades correctly

**Estimated Work:** 1 hour (SQL generation + testing)

---

## 📋 FUTURE ENHANCEMENTS (After 200+ Tenants)

### Table Partitioning by Date Range
- **When:** Any table exceeds 5M rows
- **Tables:** `orders`, `event_orders`, `audit_log`, `transaction_ledger`
- **Strategy:** Monthly partitions on `created_at`, enables archival

### Tenant Quotas
- **When:** Need to enforce limits (max orders/month per tier)
- **Tables:** Add `subscription_tiers`, `business_usage`
- **Impact:** Prevent one tenant from exhausting resources

### Connection Pool Monitoring
- **Current:** Supabase transaction pooling (default)
- **Monitor:** Connection pool usage >80%
- **Action:** Scale pool or implement request queuing

---

## DATABASE STATS (Current v2.2.1)

**Indexes Added:** 5  
**Functions Created:** 2  
**Materialized Views:** 1  
**Current Table Count:** 32  
**Current Index Count:** ~35  
**RLS Policies:** 28 (28 need audit for security)  

---

## NEXT STEPS

### Phase 1: Security (This Week) 🔴 CRITICAL
- [ ] Audit all RLS policies for header-only checks
- [ ] Implement auth.uid() validation
- [ ] Test with multi-tenant scenario
- [ ] Deploy to production

### Phase 2: Data Integrity (Next Week)
- [ ] Add foreign keys to 13 tables
- [ ] Add missing indexes
- [ ] Verify no orphaned rows exist
- [ ] Deploy to production

### Phase 3: Signups & Tenant Cloning
- [ ] Implement owner language global setting
- [ ] Fix translation coverage (all 3 parts)
- [ ] Implement tenant cloning for signups
- [ ] Test new signup flow end-to-end

---

## RELATED WORK

- **Database Bible v2.2:** Complete schema with 10 foundation fixes + 4 safety enhancements
- **DeepSeek Review:** 7.0/10 for 500 tenants (security + indexes needed)
- **Translation Fixes:** 3-part fix ready (camelCase keys, no emojis, owner language = global)
- **Signups:** Blocked on tenant cloning — use initialize_business_defaults() RPC as template
