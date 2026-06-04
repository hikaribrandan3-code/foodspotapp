---
name: database-cleanup-strategy
description: Safe cleanup tasks for production-ready schema at scale (6-8 months out)
metadata:
  type: project
---

# Database Cleanup Strategy — Production-Ready Build

**Goal:** Fix foundational issues NOW while dataset is small, so we don't have tech debt in 6-8 months.

**Risk Profile:** All tasks are zero-downtime or low-risk. No production data loss. Can be done incrementally.

## TIER 1: Do This Week (Zero Risk, High ROI)

### 1. Add Missing Composite Indexes
```sql
-- These prevent full table scans on common queries
CREATE INDEX IF NOT EXISTS idx_orders_business_status ON orders(business_id, status);
CREATE INDEX IF NOT EXISTS idx_orders_business_created ON orders(business_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_status_created ON orders(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_event_orders_event_paid ON event_orders(event_id, payment_status);
CREATE INDEX IF NOT EXISTS idx_inventory_business_item ON inventory(business_id, menu_item_id);
CREATE INDEX IF NOT EXISTS idx_categories_business_order ON categories(business_id, sort_order);
```
**Impact:** Queries that filter by business_id + status/date now use index instead of table scan.  
**Risk:** None. Pure performance.  
**Time:** 5 min, no downtime.

### 2. Optimize RLS Policies (Subquery → Direct Check)
**Current (slow):**
```sql
business_id IN (SELECT id FROM businesses WHERE owner_id = auth.uid())
```
**Better (cached by planner):**
```sql
business_id = (SELECT id FROM businesses WHERE slug = current_setting('x-tenant-slug'))
-- OR pass it via header like other policies do
business_id = (current_setting('request.headers', true)::json->>'x-business-id')::uuid
```
**Impact:** RLS checks no longer scan businesses table on every query.  
**Risk:** Low. Auth flow already sets headers.  
**Time:** 15 min to audit & fix all policies.

### 3. Conditional Audit Triggers (Only Log What Matters)
**Current:**
```sql
AFTER UPDATE ON orders FOR EACH ROW EXECUTE FUNCTION audit_order_changes();
-- Fires on EVERY update, even if only updated_at changed
```
**Fix:**
```sql
CREATE OR REPLACE FUNCTION audit_order_changes()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status 
     OR OLD.total_cents IS DISTINCT FROM NEW.total_cents THEN
    INSERT INTO audit_log(...) VALUES (...);
  END IF;
  RETURN NEW;
END;
$$;
-- Now only logs meaningful changes
```
**Impact:** 5,000 orders/day → maybe 500 audit rows instead of 5,000.  
**Risk:** None. Audit still captures what matters.  
**Time:** 10 min.

### 4. Add Index for Soft Deletes
```sql
CREATE INDEX IF NOT EXISTS idx_orders_is_deleted ON orders(is_deleted) 
WHERE is_deleted = false;
-- Partial index: only indexes active rows, shrinks index size
CREATE INDEX IF NOT EXISTS idx_events_active ON events(is_deleted)
WHERE is_deleted = false;
```
**Impact:** `WHERE is_deleted = false` queries now use index, not full scan.  
**Risk:** None.  
**Time:** 5 min.

---

## TIER 2: Do This Week (Low Risk, Tech Debt Payoff)

### 5. Drop Duplicate/Legacy Columns (They're Dead Weight)
**From the schema:**
```sql
-- branding table has both:
ALTER TABLE branding DROP COLUMN IF EXISTS hero_url;         -- use hero_cover_image
ALTER TABLE branding DROP COLUMN IF EXISTS menu_data;         -- use app_config
ALTER TABLE branding DROP COLUMN IF EXISTS mp_secret_key_id;  -- use business_secrets
ALTER TABLE branding DROP COLUMN IF EXISTS mp_user_id;        -- use business_secrets
ALTER TABLE branding DROP COLUMN IF EXISTS mp_test_mode;      -- use business_secrets

-- orders table:
ALTER TABLE orders DROP COLUMN IF EXISTS payment_status;      -- use status + payment_confirmed
ALTER TABLE orders DROP COLUMN IF EXISTS delivery_lon;        -- use delivery_lng
ALTER TABLE orders DROP COLUMN IF EXISTS total_amount;        -- use total_cents

-- staff table:
ALTER TABLE staff DROP COLUMN IF EXISTS pin;                  -- use pin_hash (FIX 8)
```
**Why:** Reduces table size, speeds up table scans, eliminates confusion (which column do I use?).  
**Risk:** Only drop if code doesn't reference them. Check with `grep -r "\.pin[^_]" src/` first.  
**Time:** 20 min (test grep first, then drop).

### 6. Add Missing Foreign Keys
```sql
-- categories should always belong to a business
ALTER TABLE categories ADD CONSTRAINT categories_business_fkey
FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE;

-- menu_items should reference categories
ALTER TABLE menu_items ADD CONSTRAINT menu_items_category_fkey
FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL;

-- inventory_transactions should reference inventory
ALTER TABLE inventory_transactions ADD CONSTRAINT inv_trans_inv_fkey
FOREIGN KEY (id) REFERENCES inventory(id) ON DELETE CASCADE;
```
**Why:** Database enforces referential integrity. Can't orphan data.  
**Risk:** Very low (data should already be valid).  
**Time:** 10 min + test.

### 7. Validate All business_id NOT NULL Constraints
```sql
-- Check if any rows violate the implicit assumption:
SELECT COUNT(*) FROM orders WHERE business_id IS NULL;
SELECT COUNT(*) FROM menu_items WHERE business_id IS NULL;
SELECT COUNT(*) FROM categories WHERE business_id IS NULL;

-- If any exist, backfill or delete
UPDATE orders SET business_id = (SELECT business_id FROM branding LIMIT 1) 
WHERE business_id IS NULL;

-- Then enforce at table level:
ALTER TABLE orders ALTER COLUMN business_id SET NOT NULL;
ALTER TABLE menu_items ALTER COLUMN business_id SET NOT NULL;
ALTER TABLE categories ALTER COLUMN business_id SET NOT NULL;
ALTER TABLE inventory ALTER COLUMN business_id SET NOT NULL;
```
**Why:** Queries always assume business_id exists. NOT NULL at DB level prevents bugs.  
**Risk:** Very low if backfill succeeds.  
**Time:** 15 min.

---

## TIER 3: Do Next Week (Refactoring)

### 8. Consolidate "enabled" / "is_active" / "available" Columns
**Current chaos:**
- `categories.is_enabled`
- `categories.is_active`
- `menu_items.available`
- `staff.is_active`

**Fix:**
```sql
-- Standardize on single boolean column name
-- Run this in a transaction with a feature flag
ALTER TABLE categories RENAME COLUMN is_enabled TO is_active;
-- Now all tables use is_active, queries are consistent
```
**Why:** Less confusion, easier code (always query `is_active`).  
**Risk:** Medium (needs code update). Do after Tier 1 tests pass.

### 9. Clean Up Events Status Logic
**Current:**
```sql
-- 'draft', 'live', 'archived' — but there's also 'deleted' (soft delete)
-- This is confusing. Live events show up, but we also have a is_deleted flag.
```
**Better:**
```sql
-- Use ONLY is_deleted + status
-- Remove 'archived' concept, use is_deleted = true instead
-- Simplify: status = 'draft' means not published, status = 'live' means published
ALTER TABLE events DROP CONSTRAINT events_status_valid;
ALTER TABLE events ADD CONSTRAINT events_status_valid
CHECK (status IN ('draft', 'live'));
-- Then rename is_deleted to is_archived for clarity
ALTER TABLE events RENAME COLUMN is_deleted TO is_archived;
```

### 10. Document Query Patterns (No Schema Change, Just Docs)
**Create a `DATABASE_PATTERNS.md` file:**
```markdown
# Query Patterns for Production Code

## Tier 1: Safe, Recommended
- Always filter by business_id: `WHERE business_id = $1`
- Use is_deleted/is_archived: `WHERE is_deleted = false`
- Use views for complex queries: SELECT * FROM orders_active

## Tier 2: Okay, But Know the Cost
- Soft delete with audit: triggers fire, do not overuse
- Subquery in WHERE: fine for small tables, cache results in app

## Tier 3: Avoid
- Unscoped queries (no business_id filter)
- Full-text search without indexes
- N+1 loops (fetch order, then fetch items, then fetch customer)
```

---

## TIER 4: Future (3-4 Month Horizon)

### 11. Partition Large Tables
When orders table hits ~500k rows:
```sql
-- Create date-based partitions
CREATE TABLE orders_2026_01 PARTITION OF orders
FOR VALUES FROM ('2026-01-01') TO ('2026-02-01');
```
**Why:** Queries become faster, indexes smaller, maintenance easier.  
**When:** Not needed yet, but build schema to support it.

### 12. Caching Layer (Redis/Memcache)
- Cache: business branding (rarely changes)
- Cache: menu (updated hourly)
- Cache: staff roles (updated daily)
- Don't cache: orders, payments, real-time data

---

## Implementation Plan

**This week (2-3 hours total):**
1. Run Tier 1 index script (5 min)
2. Audit RLS policies (15 min)
3. Optimize triggers (10 min)
4. Grep for dead columns, document findings (15 min)
5. Test queries before/after indexes (30 min)
6. Commit with clear message

**Next week:**
- Drop dead columns (after team confirms no code refs)
- Add NOT NULL constraints
- Test with full frontend suite

**By month 4:**
- Partition strategy in place (not implemented, just ready)
- Caching layer documented

---

## Why This Matters

**Now (small dataset):**
- Easy to fix, zero data loss risk
- Fast to execute
- Low blast radius

**In 6-8 months (5M+ rows):**
- Dropping a column = locked table, app down
- Adding indexes = hours of reindexing
- Soft delete queries = slow scans
- RLS subqueries = visible latency

**In 3-4 years (100M+ rows):**
- You're begging for a data engineer
- Migrations take days
- Partition strategy can't be added retroactively

---

## Production-Ready Checklist

- [ ] Composite indexes added
- [ ] RLS policies audited
- [ ] Triggers optimized (conditional)
- [ ] NOT NULL constraints enforced
- [ ] Foreign keys added
- [ ] Dead columns documented (not dropped yet)
- [ ] Query patterns documented
- [ ] Partition-ready schema (future-proofed)
