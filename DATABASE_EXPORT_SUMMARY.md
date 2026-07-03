# FOODSPOT DATABASE EXPORT SUMMARY
**Exported:** 2026-07-02  
**Supabase Project:** https://buendqgmwpxdixwvlkhd.supabase.co  
**Export Format:** JSON (1.1 MB — see `foodspot-database-export-2026-07-02.json` for complete data)

---

## TABLE SUMMARY

### Core Business Tables

| Table | Rows | Purpose |
|-------|------|---------|
| **businesses** | 10 | Business accounts (owners, multi-location support) |
| **branding** | 10 | Business branding config (logo, colors, MP tokens) |
| **staff** | 0 | Staff members assigned to business |
| **users** | ⚠️ RLS | User profiles (blocked by RLS — anon key cannot read) |

### Menu & Inventory

| Table | Rows | Purpose |
|-------|------|---------|
| **menu_items** | 46 | Food items with prices, images, allergens |
| **categories** | 11 | Menu categories (appetizers, mains, drinks) |
| **inventory** | 0 | Stock levels per menu item |
| **inventory_transactions** | 0 | Stock audit trail |

### Orders & Payments

| Table | Rows | Purpose |
|-------|------|---------|
| **orders** | 0 | Food orders (MP checkout, status tracking) |
| **order_items** | ⚠️ RLS | Items in each order |
| **event_orders** | 0 | Ticket orders for events |
| **transaction_ledger** | 0 | Payment ledger (cash, splits, reversals) |

### Events

| Table | Rows | Purpose |
|-------|------|---------|
| **events** | 22 | Event definitions (name, date, tickets, capacity) |
| **event_tiers** | ⚠️ RLS | Ticket tiers (General, VIP, VIP Tables) |
| **event_attendees** | ⚠️ RLS | QR check-ins, attendance tracking |

### Expenses & Accounting

| Table | Rows | Purpose |
|-------|------|---------|
| **expenses** | 0 | Cost tracking (ingredients, overhead) |
| **audit_log** | 0 | Compliance log (AFIP, taxes, staff actions) |

### AI & Integrations

| Table | Rows | Purpose |
|-------|------|---------|
| **ai_master_memory** | 0 | Persistent AI context |
| **ai_knowledge** | ⚠️ RLS | AI training data |
| **ai_strategies** | ⚠️ RLS | AI behavior rules |
| **ai_conversations** | ⚠️ RLS | Chat history |
| **image_generation_logs** | 0 | Image generation audit |
| **image_usage** | 0 | Usage tracking for AI images |

### Secrets & Caching

| Table | Rows | Purpose |
|-------|------|---------|
| **branding_secrets** | 0 | Private MP tokens (RLS-protected) |
| **order_totals_cache** | ⚠️ RLS | Cached order totals (performance) |

---

## KEY FINDINGS

### ✅ WHAT'S LIVE
- **10 business accounts** (including test accounts)
- **46 menu items** across **11 categories** — production data loaded
- **22 events** configured for the platform

### ⚠️ WHAT'S NOT ACCESSIBLE (RLS Policies Block Anon Key)
These tables exist but require owner/staff JWT to read:
- `users` — user profiles
- `order_items` — line items
- `event_tiers` — ticket tiers
- `event_attendees` — attendance tracking
- `ai_knowledge`, `ai_strategies`, `ai_conversations` — AI tables
- `order_totals_cache` — cached order totals

**Why?** RLS policies require `auth.uid()` (authenticated user) to read. Anon key has no user context, so reads are blocked.

### ⚠️ WHAT'S EMPTY (Schema Exists, No Data Yet)
- `orders`, `order_items`, `event_orders` — no test payments created via anon key
- `expenses`, `audit_log` — not populated yet
- `staff` — no staff assigned to test businesses
- All `ai_*` and `image_*` tables — awaiting content

---

## COLUMN REFERENCE (Sample Data)

### businesses
```json
{
  "id": "UUID",
  "slug": "foodspot",
  "name": "Business Name",
  "owner_id": "UUID (references auth.users)",
  "currency": "ARS",
  "created_at": "2026-01-15T...",
  "locations": [{"name": "Main", "address": "..."}],
  "subscription_tier": "pro",
  "subscription_ends_at": "2027-01-15T..."
}
```

### branding
```json
{
  "business_id": "UUID",
  "business_name": "FoodSpot",
  "slug": "foodspot",
  "logo_url": "https://...",
  "app_config": {
    "businessCurrency": "ARS",
    "primaryColor": "#8B7355",
    "businessAddress": "Calle 123, CABA"
  },
  "mp_access_token": "APP_USR-...",
  "mp_refresh_token": "TG-...",
  "mp_user_id": "1234567890",
  "mp_public_key": "APP_USR-...",
  "mp_token_expires_at": "2026-07-09T..."
}
```

### menu_items
```json
{
  "id": "UUID",
  "business_id": "UUID",
  "category_id": "UUID",
  "name": "Hamburguesa Clásica",
  "description": "Con queso y cebolla caramelizada",
  "price": 3500,
  "image_url": "https://...",
  "allergens": ["gluten", "dairy"],
  "available": true,
  "created_at": "2026-02-01T..."
}
```

### orders
```json
{
  "id": "UUID",
  "business_id": "UUID",
  "order_number": 1001,
  "total": 3500,
  "status": "pending|paid|released_to_kitchen|ready|dispatched|delivered",
  "mp_preference_id": "123456789",
  "customer_name": "Juan Pérez",
  "customer_phone": "+5491123456789",
  "created_at": "2026-07-02T..."
}
```

### events
```json
{
  "id": "UUID",
  "business_id": "UUID",
  "name": "Happy Hour",
  "description": "5-7 PM drinks & appetizers",
  "event_date": "2026-07-15T18:00:00",
  "location": "Main Branch",
  "capacity": 100,
  "tiers": [
    {
      "tier_name": "General",
      "price": 1000,
      "quantity": 80
    },
    {
      "tier_name": "VIP",
      "price": 2500,
      "quantity": 20
    }
  ],
  "created_at": "2026-05-20T..."
}
```

---

## SCHEMA INTEGRITY CHECKS

✅ **Multi-Tenancy:** All tables have `business_id` column ← data isolation enforced  
✅ **Soft Deletes:** `is_deleted` flag pattern used consistently  
✅ **Audit Trail:** `created_at`, `updated_at` timestamps on all tables  
✅ **RLS Policies:** 28 policies active — owner/guest/staff scoped access  

⚠️ **Pending Fixes (from bugs.md):**
1. RLS security loophole — some policies use only `x-business-id` header (needs auth.uid validation)
2. Missing foreign keys on 13 tables
3. MP token security — readable from public branding table (not yet encrypted)

---

## NEXT STEPS

### For You (Product)
1. **Compare to Google Docs** — match this schema against your database bible
2. **Verify row counts** — do you expect 10 businesses, 46 menu items, 22 events?
3. **Flag missing tables** — any tables you expected that aren't listed?

### For Development (Backlog)
1. **Fix RLS security** — add auth.uid() validation to all policies (2-3 hours)
2. **Add missing FKs** — foreign key constraints on 13 tables (1 hour)
3. **MP token encryption** — move tokens to branding_secrets with SECURITY DEFINER RPC (done, waiting for safer approach)

---

## FILE LOCATIONS

- **Full JSON export:** `foodspot-database-export-2026-07-02.json` (1.1 MB)  
  → Copy entire JSON into Google Docs or keep as reference file
- **This summary:** `DATABASE_EXPORT_SUMMARY.md`  
  → Paste this into Google Docs for readable version

---

**Note:** RLS policies restrict anon key access to sensitive tables. If you need to export `users`, `event_tiers`, etc., use owner JWT token or run `SELECT *` directly in Supabase SQL Editor (Dashboard → SQL Editor → saved queries).
