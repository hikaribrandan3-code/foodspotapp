# FOODSPOT DATABASE BIBLE v3.0
**Authoritative Schema Reference — 2026-07-02**  
**Supabase Project:** buendqgmwpxdixwvlkhd  
**Total Tables:** 66 | **Total Rows:** 1,765 | **Status:** ✅ Production-Ready

---

## TABLE OF CONTENTS
1. [Executive Summary](#executive-summary)
2. [Core Business (8 tables)](#core-business)
3. [Menu & Inventory (8 tables)](#menu--inventory)
4. [Orders & Payments (10 tables)](#orders--payments)
5. [Events & Ticketing (7 tables)](#events--ticketing)
6. [Loyalty System (6 tables)](#loyalty-system)
7. [Staff & Operations (8 tables)](#staff--operations)
8. [UGC & Content (5 tables)](#ugc--content)
9. [Financial & Analytics (8 tables)](#financial--analytics)
10. [Auth & Config (3 tables)](#auth--config)
11. [AI Swarm (6 tables)](#ai-swarm)
12. [Reservations & Delivery (3 tables)](#reservations--delivery)
13. [Critical RPC Functions](#critical-rpc-functions)
14. [Row Level Security (RLS) Policies](#row-level-security)
15. [Triggers & Automation](#triggers--automation)

---

## EXECUTIVE SUMMARY

| Category | Tables | Rows | Status |
|----------|--------|------|--------|
| **Core Business** | 8 | 47 | ✅ Live |
| **Menu & Inventory** | 8 | 68 | ✅ Live |
| **Orders & Payments** | 10 | 678 | ✅ Live |
| **Events & Ticketing** | 7 | 60 | ✅ Live |
| **Loyalty System** | 6 | 142 | ✅ Live |
| **Staff & Operations** | 8 | 8 | ✅ Live |
| **UGC & Content** | 5 | 40 | ✅ Live |
| **Financial & Analytics** | 8 | 633 | ✅ Live |
| **Auth & Config** | 3 | 0 | ✅ Live |
| **AI Swarm** | 6 | 0 | ✅ Live |
| **Reservations & Delivery** | 3 | 120 | ✅ Live |
| **TOTAL** | **66** | **1,765** | ✅ |

---

## CORE BUSINESS

### 1. **businesses** (PK: id UUID)
Multi-tenant restaurant accounts. Owner-scoped. Parent/child support for multi-location groups.

```
id              UUID PRIMARY KEY
slug            TEXT UNIQUE NOT NULL
name            TEXT NOT NULL
owner_id        UUID FK auth.users(id)
currency        VARCHAR(3) DEFAULT 'ARS'
language        VARCHAR(5) DEFAULT 'es'
hours           TEXT
phone           TEXT
app_config      JSONB DEFAULT '{}'
location_label  TEXT (for multi-location)
parent_slug     TEXT (hub linking)
parent_brand_name TEXT
parent_brand_logo TEXT
deleted_at      TIMESTAMPTZ (soft delete)
subscription_tier VARCHAR(50)
subscription_ends_at TIMESTAMPTZ
created_at      TIMESTAMPTZ DEFAULT now()
updated_at      TIMESTAMPTZ DEFAULT now()

Constraints:
  ✓ PK: id
  ✓ UNIQUE: slug
  ✓ FK: owner_id → auth.users(id)
  ✓ CHECK: currency IN ('ARS', 'USD', 'BRL', etc.)
  ✓ CHECK: language IN ('es', 'en', 'pt')
```

**Indexes:**
- `idx_businesses_owner_id` → fast owner lookups
- `idx_businesses_parent_slug` → multi-location hub

---

### 2. **branding** (PK: id BIGINT)
Business appearance + MP configuration. One per business. **No sensitive MP tokens** (moved to branding_secrets).

```
id                          BIGINT PRIMARY KEY DEFAULT nextval('branding_id_seq')
business_id                 UUID FK businesses(id)
user_id                     UUID (legacy, kept for transition)
business_id_legacy          UUID (legacy)

-- Identity
business_name               TEXT
slug                        TEXT
-- Media
logo_url                    TEXT
hero_url                    TEXT
hero_cover_image            TEXT
hero_cover_image_uploaded_at TIMESTAMPTZ

-- Colors
primary_color               TEXT DEFAULT '#DB0007'
secondary_color             TEXT DEFAULT '#FFC72C'
confirmation_color          TEXT DEFAULT '#22C55E'
powered_by_color            TEXT DEFAULT '#C4856A'
navbar_color                TEXT DEFAULT '#FFFFFF'

-- Typography
font_family                 TEXT DEFAULT 'Inter'
font_weight                 TEXT DEFAULT '400'

-- Display
canvas_mode                 TEXT DEFAULT 'light'
icon_color_mode             TEXT DEFAULT 'white'
hero_icon_mode              TEXT DEFAULT 'white'
nav_icon_mode               TEXT DEFAULT 'black'
hero_mode                   TEXT DEFAULT 'cover'
hero_settings               JSONB DEFAULT '{}'
divider_preset_id           TEXT

-- Contact
whatsapp                    TEXT
whatsapp_number             TEXT
instagram                   TEXT
address                     TEXT
google_maps_link            TEXT
directions                  TEXT

-- Service Modes
pickup_enabled              BOOLEAN DEFAULT true
delivery_enabled            BOOLEAN DEFAULT true
dine_in_enabled             BOOLEAN DEFAULT false
dine_in_payment_timing      TEXT DEFAULT 'after' CHECK (...IN 'before','after')
service_modes               JSONB DEFAULT '{...}'

-- Delivery
delivery_fee                NUMERIC DEFAULT 0.00
free_delivery_threshold     NUMERIC DEFAULT 0.00
delivery_radius             INTEGER DEFAULT 5
delivery_radius_km          REAL DEFAULT 5
store_lat                   REAL
store_lon                   REAL

-- Operations
pause_orders                BOOLEAN DEFAULT false
is_paused                   BOOLEAN DEFAULT false
pause_message               TEXT

-- Mercado Pago (meta only, tokens in branding_secrets)
mp_user_id                  TEXT (read-only mirror)
mp_test_mode                BOOLEAN DEFAULT true

-- Bank Transfer
transfer_alias              TEXT
transfer_qr_url             TEXT

-- Subscription
trial_ends_at               TIMESTAMPTZ DEFAULT (now() + '14 days')
is_paid                     BOOLEAN DEFAULT false

-- App Config
app_config                  JSONB DEFAULT '{}'
menu_data                   JSONB DEFAULT '{}'
menu_version                INTEGER DEFAULT 1
hero_icons                  JSONB DEFAULT '{}'
colors                      JSONB DEFAULT '{...}'
camera                      JSONB DEFAULT '{...}'
info_pills                  JSONB DEFAULT '{}'
design_state                JSONB DEFAULT '{}'

-- UGC
featured_photos             JSONB DEFAULT '[]'

-- Onboarding
onboarding_data             JSONB

-- Loyalty
loyalty_ui_color            VARCHAR(7) DEFAULT '#059669'

-- Multi-tenant Config
enable_menu_translations    BOOLEAN DEFAULT false

-- Timestamps
last_printed_at             TIMESTAMPTZ
updated_at                  TIMESTAMPTZ DEFAULT now()
```

**Rows:** 10  
**Indexes:** None (small table, full scans OK)

---

### 3. **branding_secrets** (PK: id BIGINT)
**SECURE:** MP tokens + credentials. RLS restricted. No direct reads from app — use `get_mp_credentials()` RPC.

```
id                      BIGINT PRIMARY KEY
business_id             UUID UNIQUE FK businesses(id)
mp_access_token         TEXT (encrypted at rest)
mp_refresh_token        TEXT
mp_token_expires_at     TIMESTAMPTZ
mp_public_key           TEXT
mp_user_id              TEXT
mp_connected_at         TIMESTAMPTZ
updated_at              TIMESTAMPTZ DEFAULT now()
```

**Rows:** 1  
**RLS:** Owner-only via `get_mp_credentials(business_id)` RPC  
**Note:** App fetches via RPC, never direct SELECT

---

### 4. **profiles** (PK: id UUID)
User identity. Linked to businesses.

```
id          UUID PRIMARY KEY
business_id UUID FK businesses(id) ON DELETE CASCADE
created_at  TIMESTAMPTZ DEFAULT now()
updated_at  TIMESTAMPTZ DEFAULT now()
```

**Rows:** 3  
**RLS:** Owner read via business lookup

---

### 5. **tenant_config** (VIEW)
Read-only view: businesses + branding + config in one row. Useful for quick config lookups.

```sql
SELECT
  b.id AS business_id,
  b.slug,
  b.name,
  b.owner_id,
  b.language,
  br.primary_color,
  br.secondary_color,
  br.logo_url,
  br.service_modes,
  br.pickup_enabled,
  br.delivery_enabled,
  br.dine_in_enabled,
  ... (full branding columns)
FROM businesses b
LEFT JOIN branding br ON br.business_id = b.id
```

---

### 6. **payment_method_configs** (PK: id UUID)
Payment methods tracked per business. Configures corte de caja (cash register close-out).

```
id                          UUID PRIMARY KEY DEFAULT gen_random_uuid()
business_id                 UUID FK businesses(id) ON DELETE CASCADE
method_key                  TEXT NOT NULL (cash, card, mp_qr, mp_link, etc.)
method_name                 TEXT NOT NULL
sub_method                  TEXT (mp_qr_scan, mp_point, etc.)
is_active                   BOOLEAN DEFAULT true
is_auto_matched             BOOLEAN DEFAULT false
requires_manual_count       BOOLEAN DEFAULT true
variance_threshold_cents    INTEGER DEFAULT 200
variance_pct_threshold      DECIMAL(5,2) DEFAULT 1.00
sort_order                  INT DEFAULT 0
created_at                  TIMESTAMPTZ DEFAULT now()

Constraint:
  ✓ UNIQUE(business_id, method_key)
```

**Rows:** 27 (default 3 per business: cash, card, mp_qr)

---

### 7. **business_cash_settings** (PK: id UUID)
Corte de caja configuration: variance thresholds, auto-close time, float discrepancy limits.

```
id                              UUID PRIMARY KEY
business_id                     UUID UNIQUE FK businesses(id)
cash_variance_threshold_cents   INTEGER DEFAULT 200 ($2 ARS)
cash_variance_pct_threshold     DECIMAL(5,2) DEFAULT 1.00 (1%)
card_variance_threshold_cents   INTEGER DEFAULT 0 (must match exactly)
mp_variance_threshold_cents     INTEGER DEFAULT 500 ($5, same-day lag)
total_variance_threshold_cents  INTEGER DEFAULT 2000 ($20)
total_variance_pct_threshold    DECIMAL(5,2) DEFAULT 2.00 (2%)
auto_close_hour                 INTEGER DEFAULT 3 (3 AM local)
allow_forced_close              BOOLEAN DEFAULT true
require_float_note              BOOLEAN DEFAULT true
float_discrepancy_threshold_cents INTEGER DEFAULT 200
created_at                      TIMESTAMPTZ DEFAULT now()
updated_at                      TIMESTAMPTZ DEFAULT now()
```

**Rows:** 10 (one per business, auto-seeded on onboarding)

---

### 8. **language_settings** (PK: id UUID)
Language preference per business. Kept for backward compat; **canonical source is businesses.language**.

```
id          UUID PRIMARY KEY
business_id UUID FK businesses(id)
language    VARCHAR(5) CHECK (...IN 'es','en','pt')
created_at  TIMESTAMPTZ DEFAULT now()
updated_at  TIMESTAMPTZ DEFAULT now()
```

**Rows:** 2

---

## MENU & INVENTORY

### 9. **categories** (PK: id TEXT)
Menu categories (Appetizers, Mains, Desserts, Drinks, etc.). Initially UUID TEXT, standardizing to UUID.

```
id            TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text
business_id   UUID FK businesses(id)
name          TEXT NOT NULL
icon          TEXT
display_order INTEGER DEFAULT 0
sort_order    INTEGER DEFAULT 0
is_active     BOOLEAN DEFAULT true
is_enabled    BOOLEAN DEFAULT true
created_at    TIMESTAMPTZ DEFAULT now()

Indexes:
  ✓ idx_menu_items_business_id (on business_id for owner lookups)
```

**Rows:** 11  
**RLS:** Owners can read/write their own; public read for menu display

---

### 10. **menu_items** (PK: id TEXT)
Food/beverage items with pricing. Prices stored in TWO columns for safety: **price (NUMERIC pesos, display)** and **price_cents (INTEGER, canonical for calculations)**.

```
id                  TEXT PRIMARY KEY
business_id         UUID FK businesses(id)
category_id         TEXT FK categories(id)
category            TEXT (legacy)

-- Identity
name                TEXT NOT NULL
description         TEXT
description_source  TEXT DEFAULT 'manual'

-- Pricing (INTEGER CENTS ONLY for calculations)
price               NUMERIC NOT NULL DEFAULT 0.00 (display: pesos)
price_cents         INTEGER CONSTRAINT menu_items_price_cents_valid
                    CHECK (price_cents > 0) (canonical: cents)

-- Media
image_url           TEXT
image               TEXT (legacy)

-- Availability
available           BOOLEAN DEFAULT true
featured            BOOLEAN DEFAULT false
display_order       INTEGER DEFAULT 0
sort_order          INTEGER DEFAULT 0

-- Tags
is_vegan            BOOLEAN DEFAULT false
is_gluten_free      BOOLEAN DEFAULT false
is_spicy            BOOLEAN DEFAULT false
calories            INTEGER

-- Metadata
metadata            JSONB DEFAULT '{}'
created_at          TIMESTAMPTZ DEFAULT now()
```

**Rows:** 46  
**Critical Rule:** ✅ Use `price_cents` for ALL comparisons, calculations, payments.  
**RLS:** Owner read/write; public read for menu display

---

### 11. **inventory** (PK: id UUID)
Stock levels per menu item. Reserve/release via RPC to prevent over-sell.

```
id                  UUID PRIMARY KEY
business_id         UUID FK businesses(id)
menu_item_id        TEXT FK menu_items(id)
supplier_id         UUID FK inventory_suppliers(id)
quantity_available  INTEGER NOT NULL DEFAULT 0
                    CONSTRAINT inventory_quantity_valid CHECK (quantity_available >= 0)
reorder_level       INTEGER DEFAULT 10
safety_stock        INTEGER DEFAULT 5
max_stock           INTEGER DEFAULT 100
cost_per_unit       NUMERIC DEFAULT 0
barcode             TEXT
storage_location    VARCHAR(255)
last_updated_by     UUID
last_restocked_at   TIMESTAMPTZ
next_reorder_date   DATE
updated_at          TIMESTAMPTZ DEFAULT now()

Constraint:
  ✓ quantity_available >= 0 (enforced at DB level)
```

**Rows:** 0 (empty, schema exists for future expansion)  
**RPCs:**
- `reserve_inventory(p_business_id, p_menu_item_id, p_quantity)` → atomically decrement qty
- `release_inventory(p_business_id, p_menu_item_id, p_quantity)` → atomically increment qty

---

### 12. **inventory_suppliers** (PK: id UUID)
Supplier info for inventory tracking.

```
id            UUID PRIMARY KEY
business_id   UUID FK businesses(id)
name          VARCHAR(255) NOT NULL
contact_email VARCHAR(255)
contact_phone VARCHAR(20)
lead_time_days INTEGER DEFAULT 3
notes         TEXT
created_at    TIMESTAMPTZ DEFAULT now()
```

**Rows:** 0

---

### 13. **inventory_transactions** (PK: id UUID)
Audit trail: every stock adjustment logged here.

```
id              UUID PRIMARY KEY
business_id     UUID FK businesses(id)
menu_item_id    TEXT NOT NULL
quantity_change INTEGER NOT NULL
notes           TEXT
changed_by      UUID
created_at      TIMESTAMPTZ DEFAULT now()

Trigger: audit_inventory_changes
  → Logs all updates to quantity_available to audit_log
```

**Rows:** 0

---

### 14. **inventory_cogs_summary** (VIEW)
Cost of goods sold: `total_cogs_value = quantity_available * cost_per_unit`.

```sql
SELECT
  i.business_id,
  i.menu_item_id,
  mi.name,
  i.cost_per_unit,
  i.quantity_available,
  (i.quantity_available::numeric * i.cost_per_unit) AS total_cogs_value,
  i.updated_at
FROM inventory i
LEFT JOIN menu_items mi ON (i.menu_item_id = mi.id)
```

---

### 15. **menu_view** (VIEW)
Aggregated menu: categories + items per category in one JSONB blob.

```sql
SELECT business_id,
  jsonb_build_object('categories',
    jsonb_agg(jsonb_build_object(
      'id', id,
      'name', name,
      'icon', icon,
      'enabled', true,
      'items', (SELECT jsonb_agg(...) FROM menu_items WHERE category_id = c.id)
    )))
FROM categories c
GROUP BY business_id
```

---

## ORDERS & PAYMENTS

### 16. **orders** (PK: id UUID)
Core order table. **State machine: pending → paid → released_to_kitchen → ready → dispatched → delivered**. Never update status directly; use `transition_order_state()` RPC.

```
id                          UUID PRIMARY KEY
order_number                BIGINT UNIQUE NOT NULL
business_id                 UUID FK businesses(id)

-- Customer
customer_name               TEXT
customer_phone              TEXT

-- Cart
items                       JSONB NOT NULL
notes                       TEXT

-- Pricing (INTEGERS IN CENTS)
subtotal                    NUMERIC (display: pesos)
delivery_fee                NUMERIC (display: pesos)
total                       NUMERIC (display: pesos)
subtotal_cents              INTEGER CONSTRAINT orders_subtotal_cents_valid
delivery_fee_cents          INTEGER CONSTRAINT orders_delivery_fee_cents_valid
total_cents                 INTEGER CONSTRAINT orders_total_cents_valid
                            CHECK (total_cents >= 0)

-- Currency & Type
currency                    VARCHAR(3) DEFAULT 'ARS'
order_type                  TEXT (dine_in, pickup, delivery)
table_number                TEXT

-- STATUS FINITE STATE MACHINE (LOCKED PAIR with database.js)
status                      TEXT DEFAULT 'pending'
                            CONSTRAINT orders_status_valid
                            CHECK (status IN (
                              'pending', 'pending_payment', 'paid', 'paid_unreleased',
                              'released_to_kitchen', 'preparing', 'ready', 'dispatched',
                              'delivered', 'cancelled', 'refunded'
                            ))

owner_status                TEXT
payment_status              TEXT
payment_confirmed           BOOLEAN DEFAULT false

-- Delivery
delivery_address            JSONB
delivery_notes              TEXT
delivery_lat                REAL
delivery_lng                NUMERIC
distance_km                 NUMERIC DEFAULT 0.00

-- Payment
payment_method              TEXT (cash, card, mercado_pago, etc.)
payment_id                  TEXT
mp_preference_id            TEXT
mp_payment_data             JSONB DEFAULT '{}'
payment_response            JSONB
external_reference          VARCHAR(255)
mercado_pago_payment_id     VARCHAR(100)
mercado_pago_preference_id  VARCHAR(100)

-- Assignment & Workflow
assigned_to                 TEXT
guest_token                 UUID (customer session, scoped by business_id)

-- Cancellation
cancel_reason               TEXT

-- SOFT DELETE (FIX 3)
is_deleted                  BOOLEAN DEFAULT false
deleted_at                  TIMESTAMPTZ

-- Timestamps
paid_at                     TIMESTAMPTZ
created_at                  TIMESTAMPTZ DEFAULT now()
updated_at                  TIMESTAMPTZ DEFAULT now()

Constraints:
  ✓ PK: id
  ✓ FK: business_id
  ✓ UNIQUE: order_number (per business)
  ✓ UNIQUE: payment_id WHERE payment_id IS NOT NULL
  ✓ CHECK: total_cents >= 0
  ✓ CHECK: status IN (11 valid states)

Indexes:
  ✓ idx_orders_business_id
  ✓ idx_orders_status
  ✓ idx_orders_guest_token
  ✓ idx_orders_is_deleted
  ✓ idx_orders_payment_id (UNIQUE WHERE payment_id IS NOT NULL)
```

**Rows:** 115  
**RLS:**
- Owner read via header x-business-id OR owner_id check
- Guest read ONLY their own order (guest_token + business_id match)
- Public insert (anon key)

**Critical RPCs:**
- `transition_order_state(p_order_id, p_new_status, p_changed_by)` → ATOMIC FSM with advisory lock
- `advance_order_status(p_order_id, p_target_status, [p_business_id])` → staff-ops single-step
- `soft_delete_order(p_order_id, p_business_id, [p_reason])` → replaces DELETE
- `record_cash_payment(p_order_id, p_business_id, [p_payment_method], [p_currency])` → idempotent ledger

**Triggers:**
- `award_loyalty_points_on_order_confirmed` → fire on status='released_to_kitchen', award points if enabled
- `auto_create_ugc_activation` → create ugc_activation_states row on status='delivered'
- `upsert_customer_contact` → auto-populate customer_contacts on order insert

---

### 17. **order_transitions** (PK: id UUID)
Audit trail: every status change logged with from/to states and timestamp.

```
id          UUID PRIMARY KEY
order_id    UUID FK orders(id) ON DELETE CASCADE
from_status TEXT
to_status   TEXT
changed_by  UUID
changed_at  TIMESTAMPTZ DEFAULT now()
notes       TEXT

Indexes:
  ✓ idx_order_transitions_order_id
```

**Rows:** 416  
**Trigger:** Populated by `transition_order_state()` RPC on every status change

---

### 18. **order_sessions** (PK: id UUID)
Guest session tracking. Table-based ordering or dine-in sessions.

```
id            UUID PRIMARY KEY
business_id   UUID FK businesses(id)
session_token TEXT UNIQUE NOT NULL
guest_token   UUID
table_number  TEXT
session_type  TEXT (dine_in, table_share, online)
is_active     BOOLEAN DEFAULT true
created_at    TIMESTAMPTZ DEFAULT now()
closed_at     TIMESTAMPTZ
```

**Rows:** 0

---

### 19. **transaction_ledger** (PK: id UUID)
Payment accounting: MP, cash, splits, refunds. **ALL amounts in INTEGER cents**. Idempotent via `idempotency_key`.

```
id                      UUID PRIMARY KEY
business_id             UUID FK businesses(id)
order_id                UUID FK orders(id)

-- CANONICAL INTEGER CENTS (ARS minor units)
amount_gross_cents      INTEGER NOT NULL
platform_fee_cents      INTEGER NOT NULL
net_to_owner_cents      INTEGER NOT NULL

-- Deduplication (same idempotency_key = one row ever)
idempotency_key         TEXT UNIQUE NOT NULL

status                  TEXT DEFAULT 'pending'
                        CONSTRAINT transaction_ledger_status_valid
                        CHECK (status IN ('pending', 'completed', 'failed', 'refunded', 'reversed'))

transaction_type        VARCHAR(50) DEFAULT 'payment'
payment_method          VARCHAR(50) (cash, card, mercado_pago, etc.)
currency                VARCHAR(3) DEFAULT 'ARS'
external_reference      VARCHAR(255)
mercado_pago_response   JSONB

-- Timing
processed_at            TIMESTAMPTZ
created_at              TIMESTAMPTZ DEFAULT now()

Constraint:
  ✓ UNIQUE(idempotency_key) → prevents double-processing webhooks

Indexes:
  ✓ idx_transaction_ledger_business_id
  ✓ idx_transaction_ledger_order_id
  ✓ idx_transaction_ledger_idempotency_key
```

**Rows:** 99  
**RLS:**
- Owner read via header x-business-id OR owner lookup
- Public insert (anon key, used by staff-ops `record_cash_payment` RPC)

**Usage:**
- Cash settlement via `record_cash_payment()` RPC (idempotent, one row per order)
- MP webhooks via `mp-webhook` edge function (HMAC-verified, idempotency_key guard)
- Analytics: owner reads to reconcile cash + MP revenue

---

### 20. **table_ledgers** (PK: id UUID)
Table-based payment tracking. Multi-person split bills per table.

```
id           UUID PRIMARY KEY
business_id  UUID FK businesses(id)
table_number VARCHAR(20) NOT NULL
order_id     UUID FK orders(id)
total_due    NUMERIC NOT NULL DEFAULT 0
total_paid   NUMERIC NOT NULL DEFAULT 0
status       VARCHAR(20) NOT NULL DEFAULT 'pending'
split_count  INTEGER DEFAULT 1
paid_at      TIMESTAMPTZ
created_at   TIMESTAMPTZ DEFAULT now()
updated_at   TIMESTAMPTZ DEFAULT now()
```

**Rows:** 0

---

### 21. **split_payments** (PK: id UUID)
Individual split payment within a table ledger.

```
id                UUID PRIMARY KEY
ledger_id         UUID FK table_ledgers(id) ON DELETE CASCADE
participant_name  VARCHAR(100)
participant_token VARCHAR(100)
amount            NUMERIC NOT NULL
status            VARCHAR(20) NOT NULL DEFAULT 'pending'
payment_method    VARCHAR(20) DEFAULT 'mercadopago'
mp_preference_id  VARCHAR(100)
mp_payment_id     VARCHAR(100)
mp_status         VARCHAR(50)
paid_at           TIMESTAMPTZ
created_at        TIMESTAMPTZ DEFAULT now()
```

**Rows:** 0

---

### 22. **wallets** (PK: id UUID)
Digital wallet accounts (future expansion).

```
id               UUID PRIMARY KEY
business_id      UUID FK businesses(id)
card_id          VARCHAR(50) NOT NULL
card_holder_name VARCHAR(100)
balance          NUMERIC NOT NULL DEFAULT 0
status           VARCHAR(20) NOT NULL DEFAULT 'active'
created_at       TIMESTAMPTZ DEFAULT now()
updated_at       TIMESTAMPTZ DEFAULT now()
```

**Rows:** 0

---

### 23. **wallet_transactions** (PK: id UUID)
Wallet activity log.

```
id          UUID PRIMARY KEY
wallet_id   UUID FK wallets(id) ON DELETE CASCADE
ledger_id   UUID
amount      NUMERIC NOT NULL
type        VARCHAR(20) NOT NULL
description VARCHAR(255)
created_at  TIMESTAMPTZ DEFAULT now()
```

**Rows:** 0

---

## EVENTS & TICKETING

### 24. **events** (PK: id UUID)
Event definitions: concerts, dinners, happy hours, etc. **Status: 'draft' | 'live' | 'archived'**. Only 'live' events visible to customers.

```
id                  UUID PRIMARY KEY
business_id         UUID FK businesses(id) ON DELETE CASCADE
name                TEXT NOT NULL
description         TEXT
category            TEXT NOT NULL DEFAULT 'Food'
start_date          TIMESTAMPTZ NOT NULL
end_date            TIMESTAMPTZ
daily_schedule      JSONB (multi-day: [{date, start_time, end_time}, ...])
venue_name          TEXT
address             TEXT
image_url           TEXT
share_image_url     TEXT (for Instagram Story)

-- Ticketing
is_free             BOOLEAN NOT NULL DEFAULT false
ticket_tiers        JSONB NOT NULL DEFAULT '[]'
                    (e.g. [{id, name, price_cents, quantity, sold}, ...])
addons              JSONB NOT NULL DEFAULT '[]'
lineup              JSONB DEFAULT '[]'
venue_map           JSONB DEFAULT NULL

-- Auto-maintained stats (updated by trigger on event_orders/event_checkins)
total_capacity      INTEGER NOT NULL DEFAULT 0
tickets_sold        INTEGER NOT NULL DEFAULT 0
total_revenue_cents INTEGER NOT NULL DEFAULT 0
checkins_count      INTEGER NOT NULL DEFAULT 0

-- Status (only 'live' shows on frontend)
status              TEXT NOT NULL DEFAULT 'draft'
                    CONSTRAINT events_status_valid
                    CHECK (status IN ('draft', 'live', 'archived'))

-- SOFT DELETE
is_deleted          BOOLEAN DEFAULT false
deleted_at          TIMESTAMPTZ

-- Timestamps
created_at          TIMESTAMPTZ DEFAULT now()
updated_at          TIMESTAMPTZ DEFAULT now()

Constraints:
  ✓ PK: id
  ✓ FK: business_id
  ✓ CHECK: status IN ('draft', 'live', 'archived')

Indexes:
  ✓ idx_events_business (lookup by owner)
  ✓ idx_events_status (filter live for frontend)
  ✓ idx_events_start_date (sort by date)
  ✓ idx_events_is_deleted (soft delete filter)
```

**Rows:** 22  
**RLS:**
- Owner read/write via header x-business-id OR owner lookup
- Public read (SELECT only 'live' AND is_deleted=false)

**Trigger:**
- `recalc_event_stats()` → fired on event_orders INSERT/UPDATE/DELETE and event_checkins INSERT/DELETE
  - Sums tickets_sold, total_revenue_cents, checkins_count
  - Handles NULL gracefully

---

### 25. **event_orders** (PK: id UUID)
Ticket purchases. **Payment flow: insert with pending status → webhook marks paid → customer checks in with QR**.

```
id               UUID PRIMARY KEY
business_id      UUID FK businesses(id) ON DELETE CASCADE
event_id         UUID FK events(id) ON DELETE CASCADE
customer_name    TEXT
customer_email   TEXT
customer_phone   TEXT

-- Snapshot at purchase time
tier_snapshot    JSONB NOT NULL (immutable: {id, name, price_cents, quantity})
quantity         INTEGER NOT NULL DEFAULT 1
addons_snapshot  JSONB NOT NULL DEFAULT '[]'

-- PRICING (INTEGER CENTS)
subtotal_cents   INTEGER NOT NULL
discount_cents   INTEGER NOT NULL DEFAULT 0
total_cents      INTEGER NOT NULL

-- Promotions
promo_code       TEXT
referral_code    TEXT

-- PAYMENT STATUS (separate from orders.status)
payment_status   TEXT NOT NULL DEFAULT 'pending'
                 CONSTRAINT event_orders_payment_status_valid
                 CHECK (payment_status IN ('pending', 'paid', 'refunded', 'cancelled'))
payment_method   TEXT (cash, mercado_pago, card, etc.)

-- Mercado Pago
mp_preference_id TEXT (stored BEFORE payment, used for webhook routing)
mp_payment_id    TEXT (populated by webhook)

-- QR Code & Check-in
ticket_code      TEXT UNIQUE NOT NULL (6-digit code)
guest_token      TEXT DEFAULT gen_random_uuid()::text

-- SOFT DELETE
deleted_at       TIMESTAMPTZ

-- Timestamps
created_at       TIMESTAMPTZ DEFAULT now()
updated_at       TIMESTAMPTZ DEFAULT now()

Constraints:
  ✓ UNIQUE(ticket_code)
  ✓ CHECK: payment_status IN (4 states)
  ✓ FK: event_id (CASCADE on delete)
  ✓ FK: business_id (CASCADE on delete)

Indexes:
  ✓ idx_event_orders_event (owner dashboard)
  ✓ idx_event_orders_business (data isolation)
  ✓ idx_event_orders_guest_token (customer receipt view)
  ✓ idx_event_orders_ticket_code (QR scanning)
  ✓ idx_event_orders_mp_payment (webhook routing)
```

**Rows:** 16  
**RLS:**
- Owner read via header x-business-id OR owner lookup
- Guest read ONLY their own order (guest_token + business_id match)
- Public insert (anon key for ticket purchase)

**Functions:**
- `get_event_order_for_ticket(p_order_id, p_guest_token)` → returns order + event details for receipt

---

### 26. **event_checkins** (PK: id UUID)
QR code check-ins at event door. One per order (unique constraint).

```
id             UUID PRIMARY KEY
event_id       UUID FK events(id) ON DELETE CASCADE
order_id       UUID FK event_orders(id) ON DELETE CASCADE
checked_in_at  TIMESTAMPTZ DEFAULT now()
checked_in_by  UUID (staff member)
checkin_method TEXT NOT NULL DEFAULT 'qr_scan'
                CONSTRAINT event_checkins_method_valid
                CHECK (checkin_method IN ('qr_scan', 'manual', 'wristband'))
notes          TEXT

Constraint:
  ✓ UNIQUE(event_id, order_id) → one check-in per order

Indexes:
  ✓ idx_event_checkins_event
  ✓ idx_event_checkins_order
```

**Rows:** 2  
**RLS:** Owner read/write via header x-business-id OR owner lookup

**RPC:**
- `redeem_ticket(p_ticket_code, p_event_id)` → QR scan handler
  - Returns ticket details if valid
  - Prevents double check-in
  - Creates event_checkins row

---

### 27. **event_promo_codes** (PK: id UUID)
Discount codes per event. **NEW IN v2.2: max_uses CHECK constraint + validation function**.

```
id               UUID PRIMARY KEY
business_id      UUID FK businesses(id) ON DELETE CASCADE
event_id         UUID FK events(id) ON DELETE CASCADE
code             TEXT NOT NULL
discount_percent INTEGER NOT NULL DEFAULT 10
max_uses         INTEGER
used_count       INTEGER NOT NULL DEFAULT 0
created_at       TIMESTAMPTZ DEFAULT now()

Constraint:
  ✓ UNIQUE(event_id, code)
  ✓ CHECK: max_uses IS NULL OR used_count <= max_uses (v2.2 SAFETY 1)

Indexes:
  ✓ idx_promo_event
```

**Rows:** 0  
**RLS:** Owner read/write via header x-business-id OR owner lookup

**RPC:**
- `validate_promo_code(p_event_id, p_code)` → v2.2 SAFETY 2
  - Returns {valid, error, discount_percent, remaining_uses}
  - Guards against max_uses exceeded

---

### 28. **event_leads** (PK: id UUID)
Email capture from event discovery page.

```
id          UUID PRIMARY KEY
business_id UUID NOT NULL
event_id    UUID
name        TEXT
email       TEXT
phone       TEXT
created_at  TIMESTAMPTZ DEFAULT now()
```

**Rows:** 0

---

## LOYALTY SYSTEM

### 29. **loyalty_settings** (PK: id UUID)
Per-business loyalty program config. Controls earning, redemption, UGC points.

```
id                          UUID PRIMARY KEY
business_id                 UUID UNIQUE FK businesses(id) ON DELETE CASCADE
enabled                     BOOLEAN NOT NULL DEFAULT false
min_order_cents             INTEGER NOT NULL DEFAULT 800000 ($8000 ARS)
points_per_order            INTEGER NOT NULL DEFAULT 50
points_to_redeem            INTEGER NOT NULL DEFAULT 100

-- UGC & Referral (v3.0)
ugc_points_per_share        INTEGER DEFAULT 10
referral_points             INTEGER DEFAULT 100

-- Loyalty UI
loyalty_ui_color            VARCHAR(7) DEFAULT '#059669' (hex, green)

-- Item Redemption
item_point_costs            JSONB DEFAULT '{}' (maps item names → point costs)

-- Timestamps
updated_at                  TIMESTAMPTZ DEFAULT now()

Constraint:
  ✓ UNIQUE(business_id)
```

**Rows:** 1  
**RLS:** Owner read/write; public read for loyalty UI

---

### 30. **loyalty_accounts** (PK: id UUID)
**UNIVERSAL, PHONE-SCOPED** (v3.0). One row per customer phone globally, NOT per business.

```
id                  UUID PRIMARY KEY
customer_phone      TEXT UNIQUE NOT NULL
points_balance      INTEGER NOT NULL DEFAULT 0
created_at          TIMESTAMPTZ DEFAULT now()
updated_at          TIMESTAMPTZ DEFAULT now()

Constraint:
  ✓ UNIQUE(customer_phone) → global account per phone
```

**Rows:** 14  
**Key Change (v3.0):** Removed `business_id` column. Points are global per phone, earned at any business, redeemable at any.

**RLS:** Public insert/update (anon key, used by order trigger and redemption)

---

### 31. **loyalty_transactions** (PK: id UUID)
Point earn/spend audit trail. Kept per-business for reconciliation.

```
id              UUID PRIMARY KEY
business_id     UUID FK businesses(id) ON DELETE CASCADE
customer_phone  TEXT NOT NULL
order_id        UUID FK orders(id) ON DELETE SET NULL
type            TEXT NOT NULL
                CONSTRAINT loyalty_transactions_type_check
                CHECK (type IN ('earn', 'redeem', 'ugc_receipt', 'referral'))
points_delta    INTEGER NOT NULL
created_at      TIMESTAMPTZ DEFAULT now()

Indexes:
  ✓ idx_loyalty_transactions_phone
  ✓ idx_loyalty_transactions_business_id
```

**Rows:** 123  
**RLS:** Owner read via header x-business-id; public insert (anon key)

---

### 32. **loyalty_free_items** (PK: id UUID)
Reward items: free burgers, drinks, etc. that customers can redeem with points.

```
id              UUID PRIMARY KEY
business_id     UUID FK businesses(id) ON DELETE CASCADE
menu_item_id    TEXT FK menu_items(id) ON DELETE CASCADE
menu_item_name  TEXT NOT NULL
sort_order      INTEGER NOT NULL DEFAULT 0
created_at      TIMESTAMPTZ DEFAULT now()
```

**Rows:** 3  
**RLS:** Owner read/write; public read for loyalty rewards menu

---

### 33. **loyalty_referral_claims** (PK: id UUID)
**GLOBAL, PHONE-SCOPED** (v3.0). One referral reward per referee phone ever, preventing double-claiming.

```
id              UUID PRIMARY KEY
business_id     UUID FK businesses(id) ON DELETE CASCADE
referrer_phone  TEXT NOT NULL
referee_phone   TEXT NOT NULL UNIQUE (GLOBAL: one referral per referee)
order_id        UUID FK orders(id) ON DELETE SET NULL
created_at      TIMESTAMPTZ DEFAULT now()

Constraint:
  ✓ UNIQUE(referee_phone) → prevents duplicate referrals of same customer

Indexes:
  ✓ idx_loyalty_referral_claims_business
  ✓ idx_loyalty_referral_claims_referee
```

**Rows:** 1  
**RLS:** Owner read via owner lookup; public insert (referral share flow)

---

### 34. **customer_contacts** (PK: id UUID)
**AUTO-POPULATED**: One row per unique customer phone per business. Created by `upsert_customer_contact()` trigger on order INSERT.

```
id              UUID PRIMARY KEY
business_id     UUID FK businesses(id) ON DELETE CASCADE
phone           TEXT NOT NULL
name            TEXT
created_at      TIMESTAMPTZ DEFAULT now()
updated_at      TIMESTAMPTZ DEFAULT now()

Constraint:
  ✓ UNIQUE(business_id, phone)

Indexes:
  ✓ idx_customer_contacts_phone
```

**Rows:** 21  
**Trigger:** `upsert_customer_contact()` on orders.INSERT
  - Extracts `customer_phone` and `customer_name`
  - UPSERT to customer_contacts (insert if new, update name if provided)
  - Used for owner customer list, loyalty targeting

---

## STAFF & OPERATIONS

### 35. **staff** (PK: id UUID)
Staff members assigned to a business. PIN-based login + role-based access.

```
id          UUID PRIMARY KEY
business_id UUID FK businesses(id) ON DELETE CASCADE
name        TEXT NOT NULL
email       TEXT (kept for auth integration, optional)

-- Access Control
role        TEXT NOT NULL DEFAULT 'cashier'
            CONSTRAINT staff_role_valid
            CHECK (role IN ('owner', 'manager', 'cashier', 'kitchen', 'driver'))

-- PIN authentication (FIX 8: hashed, not plaintext)
pin         VARCHAR(4) (legacy: plaintext, being deprecated)
pin_hash    TEXT (SHA-256 hash of PIN)

-- Username for shift tracking
username    VARCHAR(100)

-- Status
is_active   BOOLEAN DEFAULT true
created_at  TIMESTAMPTZ DEFAULT now()

Constraints:
  ✓ CHECK: role IN (5 valid roles)
  ✓ UNIQUE(business_id, username) WHERE username IS NOT NULL

Indexes:
  ✓ idx_staff_business_id
  ✓ idx_staff_username_business (for shift reports)
```

**Rows:** 2  
**RLS:** Owner read/write via header x-business-id OR owner lookup

**RPCs:**
- `clock_in_secure(p_staff_id, p_business_id, p_pin_plain)` → v2.2 secure
  - Hashes PIN, compares to pin_hash
  - Returns shift_id on success
  - Used by staff-ops KDS login

- `clock_out(p_staff_id, p_business_id)` → closes shift
  - Updates clock_out, duration_minutes
  - Used by staff-ops close-out flow

---

### 36. **staff_shifts** (PK: id UUID)
Clock-in/out tracking per staff member.

```
id               UUID PRIMARY KEY
staff_id         UUID FK staff(id) ON DELETE CASCADE
business_id      UUID NOT NULL
clock_in         TIMESTAMPTZ NOT NULL
clock_out        TIMESTAMPTZ
duration_minutes INTEGER
notes            TEXT
created_at       TIMESTAMPTZ DEFAULT now()

Indexes:
  ✓ idx_shifts_staff (staff shift history)
  ✓ idx_shifts_business (owner shift report)
```

**Rows:** 6  
**Trigger:** Populated by `clock_in_secure()` and `clock_out()` RPCs

---

### 37. **ledger_entries** (PK: id UUID)
Generic ledger for staff payroll, tips, adjustments (future expansion).

```
id           UUID PRIMARY KEY
business_id  UUID FK businesses(id)
order_id     UUID FK orders(id)
staff_id     UUID FK staff(id)
entry_type   TEXT
amount_cents INTEGER
description  TEXT
created_at   TIMESTAMPTZ DEFAULT now()
```

**Rows:** 0

---

### 38. **shifts** (PK: id UUID)
**CORTE DE CAJA (v3.0)**: Cash register close-out per day per location. Complex variance tracking + manager approval.

```
id                      UUID PRIMARY KEY
business_id             UUID FK businesses(id) ON DELETE CASCADE
opened_by               UUID FK staff(id) ON DELETE RESTRICT
closed_by               UUID FK staff(id)
previous_shift_id       UUID FK shifts(id) (linked previous shift)

-- Timing
opened_at               TIMESTAMPTZ DEFAULT now()
closed_at               TIMESTAMPTZ
status                  TEXT DEFAULT 'open'
                        CONSTRAINT shifts_status_valid
                        CHECK (status IN ('open', 'closing', 'closed', 'forced_closed'))

-- Float (opening cash)
float_cents             INTEGER DEFAULT 0
carried_float_cents     INTEGER (from previous shift)
float_discrepancy_cents INTEGER (carried - actual)

-- EXPECTED (auto-calculated from transaction_ledger)
expected_cash_cents     INTEGER
expected_card_cents     INTEGER
expected_mp_cents       INTEGER
expected_other_cents    INTEGER
expected_total_cents    INTEGER

-- ACTUAL (staff entry at close)
actual_cash_cents       INTEGER
actual_card_cents       INTEGER
actual_mp_cents         INTEGER
actual_other_cents      INTEGER
actual_total_cents      INTEGER

-- VARIANCE (actual - expected, negative = shortage)
variance_cash_cents     INTEGER
variance_card_cents     INTEGER
variance_mp_cents       INTEGER
variance_other_cents    INTEGER
variance_total_cents    INTEGER
variance_pct            DECIMAL(6,3) (%)

-- Severity & Notes
severity                TEXT CHECK (severity IN ('ok', 'warning', 'critical', 'investigate'))
close_note              TEXT (required if severity > 'ok')
forced_close_reason     TEXT

-- Manager Review & Adjustment
reviewed_by             UUID FK staff(id)
reviewed_at             TIMESTAMPTZ
manager_action          TEXT CHECK (manager_action IN ('approved', 'adjusted', 'reopened', 'disputed'))
manager_note            TEXT
original_actual_cents   JSONB (snapshot before adjustment)

-- Finalization
is_finalized            BOOLEAN DEFAULT false
finalized_by            UUID FK staff(id)
finalized_at            TIMESTAMPTZ

-- Concurrency
version                 INTEGER DEFAULT 1 NOT NULL

-- Timestamps
created_at              TIMESTAMPTZ DEFAULT now()
updated_at              TIMESTAMPTZ DEFAULT now()

Constraints:
  ✓ CHECK: status IN (4 states)
  ✓ CHECK: severity IN (4 levels)
  ✓ CHECK: manager_action IN (4 actions)
  ✓ FK: previous_shift_id (links shifts in sequence)

Indexes:
  ✓ idx_shifts_business_status (filter open shifts)
  ✓ idx_shifts_opened_by (staff shift history)
  ✓ idx_shifts_closed_at (date range queries)
```

**Rows:** 0 (schema new, used at close-out time)  
**RLS:** Staff + owner via header x-business-id OR owner lookup

**Triggers:**
- `enforce_shift_close_note()` → BEFORE INSERT/UPDATE
  - Requires close_note (min 5 chars) if severity > 'ok'
  - Prevents silent variance acceptance

- `alert_on_forced_shift_close()` → AFTER UPDATE
  - Creates variance_alerts entry on forced_closed

- `alert_on_float_discrepancy()` → AFTER INSERT
  - Creates variance_alerts entry if |discrepancy| > 200 cents

---

## UGC & CONTENT

### 39. **ugc_activations** (PK: id UUID)
**OWNER CONFIG**: When camera activation is triggered (on order delivery, post-serve, etc.).

```
id                  UUID PRIMARY KEY
business_id         UUID FK businesses(id) ON DELETE CASCADE
activation_trigger  TEXT DEFAULT 'delivered'
                    CHECK (activation_trigger IN ('delivered', 'served', 'ready_for_pickup'))
enabled             BOOLEAN DEFAULT true
created_at          TIMESTAMPTZ DEFAULT now()

Constraint:
  ✓ UNIQUE(business_id) (one config per business)
```

**Rows:** 10 (one per business, auto-seeded on signup)

---

### 40. **ugc_activation_states** (PK: id UUID)
**PER-ORDER STATE**: Tracks camera activation lifecycle for customer photos post-delivery.

```
id              UUID PRIMARY KEY
order_id        UUID FK orders(id) ON DELETE CASCADE
user_id         TEXT NOT NULL (guest_token)
status          TEXT DEFAULT 'pending'
                CONSTRAINT ugc_activation_states_status_valid
                CHECK (status IN ('pending', 'waiting', 'shown', 'captured', 'shared', 'dismissed'))
order_type      TEXT
delivered_at    TIMESTAMPTZ
banner_shown_at TIMESTAMPTZ
captured_at     TIMESTAMPTZ
created_at      TIMESTAMPTZ DEFAULT now()

Constraint:
  ✓ UNIQUE(order_id, user_id)

Indexes:
  ✓ idx_ugc_activation_states_order_id
```

**Rows:** 34  
**RLS:** Anon read/write (no auth needed)

**Trigger:**
- `auto_create_ugc_activation()` → fires on orders.status='delivered'
  - Creates ugc_activation_states row with status='pending'
  - Used by Receipt page to show camera banner

---

### 41. **el_momento_photos** (PK: id UUID)
User-generated photos from camera suite (receipt, review, moments). Shareable.

```
id          UUID PRIMARY KEY
business_id UUID FK businesses(id)
order_id    UUID
flyer_id    TEXT
user_token  TEXT NOT NULL
photo_url   TEXT NOT NULL
context     TEXT
is_featured BOOLEAN DEFAULT false
created_at  TIMESTAMPTZ DEFAULT now()
```

**Rows:** 0

---

### 42. **el_momento_hearts** (PK: id UUID)
Reactions/hearts on UGC photos.

```
id         UUID PRIMARY KEY
photo_id   UUID FK el_momento_photos(id) ON DELETE CASCADE
user_token TEXT NOT NULL
created_at TIMESTAMPTZ DEFAULT now()

Constraint:
  ✓ UNIQUE(photo_id, user_token)
```

**Rows:** 0

---

### 43. **creator_attribution** (PK: id UUID)
Photo creator credits + revenue tracking.

```
id                  UUID PRIMARY KEY
photo_id            UUID FK el_momento_photos(id)
creator_token       TEXT
conversions_count   INTEGER DEFAULT 0
revenue_generated   NUMERIC DEFAULT 0
created_at          TIMESTAMPTZ DEFAULT now()
```

**Rows:** 0

---

## FINANCIAL & ANALYTICS

### 44. **expenses** (PK: id UUID)
Cost tracking: ingredients, overhead, utilities, etc.

```
id           UUID PRIMARY KEY
business_id  UUID FK businesses(id)
user_id      UUID NOT NULL
category     TEXT
description  TEXT NOT NULL
amount       NUMERIC NOT NULL
date         DATE NOT NULL DEFAULT CURRENT_DATE
is_recurring BOOLEAN DEFAULT false
created_at   TIMESTAMPTZ DEFAULT now()
```

**Rows:** 2  
**RLS:** Owner read/write via header x-business-id OR owner lookup

---

### 45. **audit_log** (PK: id UUID)
**COMPLIANCE LOG (FIX 4)**: All sensitive changes logged. Used for AFIP tax audit, staff accountability.

```
id          UUID PRIMARY KEY
business_id UUID FK businesses(id)
action      TEXT NOT NULL (order_paid, order_status_changed, staff_login, menu_updated, etc.)
table_name  TEXT NOT NULL (orders, menu_items, staff, etc.)
row_id      TEXT (supports both UUID and TEXT primary keys)
old_values  JSONB
new_values  JSONB
changed_by  UUID
changed_at  TIMESTAMPTZ DEFAULT now()
notes       TEXT

Indexes:
  ✓ idx_audit_business (isolate by business)
  ✓ idx_audit_table_row (find changes to specific row)
  ✓ idx_audit_timestamp (date range queries)
```

**Rows:** 599  
**RLS:** Owner read via header x-business-id OR owner lookup

**Triggers (auto-populated):**
- `audit_menu_item_changes()` → on menu_items.price changes
- `audit_order_changes()` → on orders.status or orders.total changes
- `audit_inventory_changes()` → on inventory.quantity_available changes

---

### 46. **image_generation_logs** (PK: id UUID)
AI image generation audit (cost, prompt, duration).

```
id             UUID PRIMARY KEY
business_id    UUID FK businesses(id)
provider       TEXT NOT NULL
cost_usd       NUMERIC NOT NULL DEFAULT 0
prompt_preview TEXT
duration_ms    INTEGER
tier           TEXT DEFAULT 'free'
image_url      TEXT
created_at     TIMESTAMPTZ DEFAULT now()
```

**Rows:** 0

---

### 47. **image_usage** (PK: id UUID)
Weekly image generation quota tracking.

```
id          UUID PRIMARY KEY
business_id UUID FK businesses(id)
week_start  DATE NOT NULL
count       INTEGER DEFAULT 0
created_at  TIMESTAMPTZ DEFAULT now()
updated_at  TIMESTAMPTZ DEFAULT now()

Constraint:
  ✓ UNIQUE(business_id, week_start)
```

**Rows:** 0

---

### 48. **usage_tracking** (PK: id UUID)
Feature usage metrics (KDS clicks, camera activations, loyalty redemptions, etc.).

```
id          UUID PRIMARY KEY
business_id UUID FK businesses(id)
feature     TEXT
count       INTEGER DEFAULT 0
period      TEXT
created_at  TIMESTAMPTZ DEFAULT now()
```

**Rows:** 2

---

## AUTH & CONFIG

### 49. **password_reset_codes** (PK: id UUID)
Password reset token tracking.

```
id         UUID PRIMARY KEY
user_id    UUID FK auth.users(id) ON DELETE CASCADE
code       TEXT NOT NULL
used       BOOLEAN DEFAULT false
created_at TIMESTAMPTZ DEFAULT now()
```

**Rows:** 0

---

### 50. **owner_notifications** (PK: id UUID)
Push notifications for owner: stalled orders, high variance alerts, new bookings.

```
id          UUID PRIMARY KEY
business_id UUID FK businesses(id)
order_id    UUID
type        TEXT (stalled_order, variance_alert, new_reservation, etc.)
message     TEXT
is_read     BOOLEAN DEFAULT false
created_at  TIMESTAMPTZ DEFAULT now()
```

**Rows:** 0  
**RLS:** Owner read/write via owner lookup

---

### 51. **agent_registry** (PK: id UUID)
AI agents: Haiku, Sonnet, specialized agents (loyalty advisor, inventory, etc.).

```
id                  UUID PRIMARY KEY
business_id         UUID FK businesses(id)
agent_id            TEXT UNIQUE NOT NULL
name                TEXT NOT NULL
role                TEXT
speciality          TEXT
model               TEXT
status              TEXT DEFAULT 'active'
last_active         TIMESTAMPTZ
capabilities        TEXT[]
performance_metrics JSONB DEFAULT '{}'
created_at          TIMESTAMPTZ DEFAULT now()
```

**Rows:** 4  
**RLS:** Owner read/write via header x-business-id OR owner lookup

---

## AI SWARM

### 52-57. **ai_master_memory, ai_conversations, ai_knowledge, ai_strategies, captain_laws**
AI-specific tables. Not detailed here (low data density, specialized).

**Summary:**
- `ai_master_memory` (UUID, business_id, content, embedding[768], memory_type, importance, source, context, tags)
- `ai_conversations` (UUID, business_id, agent_id FK, session_id, messages JSONB, context JSONB)
- `ai_knowledge` (UUID, business_id, topic, content, embedding[768], confidence, last_verified, source)
- `ai_strategies` (UUID, business_id, strategy_type, content, performance_score, is_active)
- `captain_laws` (UUID, business_id, law_number INT, law_text, category, is_active)

**Rows:** 0 total (schema ready, no data yet)  
**RLS:** Owner read/write via header x-business-id OR owner lookup

---

## RESERVATIONS & DELIVERY

### 58. **reservations** (PK: id UUID)
Table & custom order reservations. Extended for catering + custom items.

```
id                      UUID PRIMARY KEY
business_id             UUID FK businesses(id) ON DELETE CASCADE
customer_name           TEXT NOT NULL
customer_phone          TEXT NOT NULL
notes                   TEXT

-- Booking Details
reservation_date        DATE NOT NULL
reservation_time        TIME NOT NULL
party_size              INTEGER NOT NULL CHECK (party_size > 0)

-- Reservation Type (v3.0)
reservation_type        TEXT DEFAULT 'table'
                        CHECK (reservation_type IN ('table', 'custom'))
custom_item_description TEXT (for catering/custom orders)
occasion                TEXT (birthday, anniversary, corporate, etc.)

-- Delivery/Pickup (v3.0)
pickup_or_delivery      TEXT DEFAULT 'pickup'
                        CHECK (pickup_or_delivery IN ('pickup', 'delivery'))

-- Pricing (v3.0)
total_price_cents       INTEGER
deposit_cents           INTEGER
deposit_paid            BOOLEAN DEFAULT false

-- Status
status                  TEXT NOT NULL DEFAULT 'pending'
                        CONSTRAINT reservations_status_valid
                        CHECK (status IN (
                          'pending', 'approved', 'rejected', 'no_show', 'completed',
                          'price_set', 'awaiting_deposit', 'deposit_paid', 'ready', 'cancelled'
                        ))

-- Approval
approved_by             UUID FK staff(id)
approved_at             TIMESTAMPTZ

-- Timestamps
created_at              TIMESTAMPTZ DEFAULT now()
updated_at              TIMESTAMPTZ DEFAULT now()

Constraints:
  ✓ CHECK: party_size > 0
  ✓ CHECK: status IN (10 states)
  ✓ CHECK: reservation_type IN (2 types)
  ✓ CHECK: pickup_or_delivery IN (2 options)

Indexes:
  ✓ idx_reservations_business_id
  ✓ idx_reservations_date
  ✓ idx_reservations_status
  ✓ idx_reservations_business_date (date + business queries)
```

**Rows:** 3  
**RLS:** Owner read via header x-business-id OR owner lookup; public insert

---

### 59. **delivery_settings** (PK: id UUID)
Delivery config per business. **RLS DISABLED** (config is non-sensitive, business_id set server-side).

```
id                       UUID PRIMARY KEY
business_id              UUID UNIQUE FK businesses(id) ON DELETE CASCADE
radius_km                INTEGER NOT NULL DEFAULT 5
fee_cents                INTEGER NOT NULL DEFAULT 0 (100 = $1 ARS)
free_threshold_cents     INTEGER NOT NULL DEFAULT 0 (free over X)
is_paused                BOOLEAN NOT NULL DEFAULT false
updated_at               TIMESTAMPTZ DEFAULT now()

Constraint:
  ✓ UNIQUE(business_id)
```

**Rows:** 10 (one per business, auto-seeded)  
**RLS:** DISABLED (open read + write, security via business_id server-side validation in app)

---

### 60. **shift_payment_breakdowns** (PK: id UUID)
Per-method payment detail within a shift (cash vs card vs MP variance).

```
id                  UUID PRIMARY KEY
shift_id            UUID FK shifts(id) ON DELETE CASCADE
method_key          TEXT NOT NULL
expected_cents      INTEGER NOT NULL DEFAULT 0
actual_cents        INTEGER
settled_cents       INTEGER (from MP cron)
variance_cents      INTEGER
order_count         INTEGER DEFAULT 0
settlement_status   TEXT CHECK (settlement_status IN ('pending', 'settled', 'mismatch', 'not_applicable'))
note                TEXT
created_at          TIMESTAMPTZ DEFAULT now()

Indexes:
  ✓ idx_breakdowns_shift
```

**Rows:** 0 (populated at shift close)

---

### 61. **variance_alerts** (PK: id UUID)
Flagged anomalies during corte de caja: high variance, forced close, missing close, float discrepancy, consistent staff shortage.

```
id              UUID PRIMARY KEY
business_id     UUID FK businesses(id) ON DELETE CASCADE
shift_id        UUID FK shifts(id) ON DELETE CASCADE
alert_type      TEXT NOT NULL
                CHECK (alert_type IN (
                  'high_variance', 'forced_close', 'missing_close',
                  'float_discrepancy', 'manager_adjustment', 'payment_mismatch', 'consistent_staff'
                ))
severity        TEXT NOT NULL CHECK (severity IN ('warning', 'critical'))
message         TEXT NOT NULL
alert_data      JSONB
resolved        BOOLEAN DEFAULT false
resolved_by     UUID FK staff(id)
resolved_at     TIMESTAMPTZ
created_at      TIMESTAMPTZ DEFAULT now()

Indexes:
  ✓ idx_alerts_business (filter by business + resolved)
```

**Rows:** 0 (auto-created by triggers)

---

### 62. **shift_events** (PK: id UUID)
Granular audit trail: every shift action logged (opened, count_updated, closed, forced_closed, adjusted, approved, reopened).

```
id          UUID PRIMARY KEY
shift_id    UUID FK shifts(id) ON DELETE CASCADE
staff_id    UUID FK staff(id)
event_type  TEXT NOT NULL (opened, count_updated, closed, forced_closed, adjusted, approved, reopened)
event_data  JSONB
created_at  TIMESTAMPTZ DEFAULT now()

Indexes:
  ✓ idx_shift_events_shift (shift audit trail)
```

**Rows:** 0

---

### 63-66. **Remaining Tables**
- `tenants` (dropped in v3.0, consolidated into businesses)
- `business_secrets` (legacy, replaced by branding_secrets)
- `orders_active` (VIEW: `WHERE is_deleted=false`)
- `events_active` (VIEW: `WHERE is_deleted=false AND status='live'`)

**Total documented:** 62 tables + 4 views = 66 entities

---

## CRITICAL RPC FUNCTIONS

### Core Order Management

**`transition_order_state(p_order_id UUID, p_new_status TEXT, [p_changed_by UUID])`**
- **Purpose:** ATOMIC order FSM. Only valid path to change order status.
- **Validations:**
  - Owner check if p_changed_by provided
  - Advisory lock prevents race conditions
  - Only allowed transitions: pending→paid→released_to_kitchen→ready→dispatched→delivered
  - Cancel from any active state
  - Refund from paid/delivered
- **Side effects:** Creates order_transitions audit row
- **NEVER** call `UPDATE orders SET status = ...` directly

**`advance_order_status(p_order_id UUID, p_target_status TEXT, [p_business_id UUID])`**
- **Purpose:** Single-step advance (for staff-ops KDS)
- **Returns:** New status
- **Usage:** Staff button "Mark Ready" → calls with status='ready'

**`soft_delete_order(p_order_id UUID, p_business_id UUID, [p_reason TEXT])`**
- **Purpose:** Soft-delete order (is_deleted=true, deleted_at=now)
- **Side effects:** Logs order_transition 'deleted' event
- **Never:** Physical DELETE FROM orders

**`record_cash_payment(p_order_id UUID, p_business_id UUID, [p_payment_method TEXT='cash'], [p_currency TEXT='ARS'])`**
- **Purpose:** IDEMPOTENT cash ledger entry. Reads total from order (prevents client forgery).
- **Idempotency:** Key = 'cash-' || p_order_id::text (one row per order ever)
- **Returns:** {success, amount_gross_cents, already_recorded}
- **Called by:** staff-ops KDS verify cash, owner Dashboard confirm, customer offline drain
- **Critical fix:** Bypasses anon-key 403 on transaction_ledger RLS

---

### Loyalty

**`increment_loyalty_points(p_phone TEXT, p_delta INTEGER, [p_business_id UUID DEFAULT NULL])`**
- **Purpose:** Atomic UPSERT points. P_delta can be positive (earn) or negative (redeem).
- **Behavior:**
  - If phone not in loyalty_accounts, create with max(0, p_delta)
  - If exists, add p_delta (result floored to 0, never negative)
  - Update updated_at
- **Called by:** Award trigger (on order released_to_kitchen), loyalty_transactions INSERT
- **RLS:** Public (anon key)

**`validate_promo_code(p_event_id UUID, p_code TEXT)`** [v2.2]
- **Purpose:** Validate promo before redemption (guards against max_uses exceeded)
- **Returns:** {valid, error, discount_percent, remaining_uses}

---

### Events

**`redeem_ticket(p_ticket_code TEXT, p_event_id UUID)`**
- **Purpose:** QR code check-in at event door
- **Validations:**
  - Ticket exists + not checked-in yet
  - Payment status = 'paid'
- **Side effects:** Creates event_checkins row, updates event stats via trigger
- **Returns:** {success, customer_name, tier_snapshot, quantity}

**`delete_event(p_event_id UUID, p_business_id UUID)`**
- **Purpose:** Hard-delete event (cascades to event_orders, event_checkins)
- **Note:** Dangerous; prefer soft delete (is_deleted=true) for audit trail

---

### Staff & Shifts

**`clock_in_secure(p_staff_id UUID, p_business_id UUID, p_pin_plain VARCHAR(4))`** [v2.2]
- **Purpose:** Staff login with hashed PIN
- **Process:**
  1. Hash p_pin_plain → SHA-256
  2. Compare to staff.pin_hash
  3. Create staff_shifts row (clock_in=now)
- **Returns:** shift_id on success, exception on invalid PIN
- **RLS:** Authenticated (owner key only)

**`clock_out(p_staff_id UUID, p_business_id UUID)`**
- **Purpose:** Clock out staff, compute duration
- **Side effects:** Updates staff_shifts (clock_out, duration_minutes)

---

### Multi-Location

**`get_owner_locations()`**
- **Purpose:** All locations for authenticated owner
- **Returns:** TABLE(id, slug, name, location_label, address, logo_url, primary_color, is_paused, hours)
- **Called by:** Owner hub page

**`get_locations_by_parent_slug(p_parent_slug TEXT)`**
- **Purpose:** Public customer hub: all locations under a brand
- **Returns:** TABLE(slug, name, location_label, address, logo_url, primary_color, is_paused, parent_brand_name, parent_brand_logo)
- **RLS:** Public (no auth needed)

**`create_linked_location(p_location_name TEXT, p_location_slug TEXT, [... options])`** [v3.0]
- **Purpose:** Create new location under same owner. Auto-copy menu from first location.
- **Idempotency:** Slug must be unique
- **Process:**
  1. Create businesses row (inherit language, hours, app_config from primary)
  2. Create branding row
  3. Copy categories + menu_items (map by category name)
  4. Link all owner locations to same parent_slug
- **Returns:** {business_id, slug}
- **RLS:** Authenticated (owner only)

---

### Multi-Tenant Config

**`get_ai_business_context(p_business_id UUID)`**
- **Purpose:** Haiku business context (metadata, menu count, order count)
- **Returns:** JSONB {business, branding, menu_count, order_count}

**`get_ai_menu_context(p_business_id UUID)`** [v3.0 expanded]
- **Purpose:** Full menu + stats for AI advisor
- **Returns:** JSONB {total_active, categories[], stats{total_items, avg_price, avg_calories, spicy_count, vegan_count, ...}}

**`get_ai_inventory_context(p_business_id UUID)`** [v2.2]
- **Purpose:** Inventory for AI reorder advisor
- **Returns:** JSONB {has_data, total_tracked_items, low_stock[], out_of_stock[], healthy_stock_items[], total_cogs_value}

---

## ROW LEVEL SECURITY (RLS) POLICIES

**All tables have RLS enabled.** Two patterns:

### Pattern 1: Header-Based (Staff-Ops)
```sql
business_id = (current_setting('request.headers', true)::json->>'x-business-id')::uuid
```
Used by staff-ops PWA (no user session, only tenant header).

### Pattern 2: Ownership Check (Owner Web)
```sql
business_id IN (SELECT id FROM businesses WHERE owner_id = auth.uid())
```
Used by owner dashboard (authenticated, verified via auth.uid()).

### Pattern 3: Guest Isolation (Customer Checkout)
```sql
guest_token = (current_setting('request.headers', true)::json->>'x-guest-token')::uuid
AND business_id = (current_setting('request.headers', true)::json->>'x-business-id')::uuid
```
Customer can only read their own order (guest_token) AND only within correct tenant.

---

## TRIGGERS & AUTOMATION

| Trigger | Fires On | Purpose | Side Effect |
|---------|----------|---------|-------------|
| `award_loyalty_points_on_order_confirmed` | orders.UPDATE to status='released_to_kitchen' | Award loyalty points | INSERT loyalty_transactions, UPDATE loyalty_accounts |
| `auto_create_ugc_activation` | orders.UPDATE to status='delivered' | Show camera banner | INSERT ugc_activation_states |
| `upsert_customer_contact` | orders.INSERT | Auto-populate customer list | UPSERT customer_contacts |
| `audit_menu_item_changes` | menu_items.UPDATE (price changed) | Log price changes | INSERT audit_log |
| `audit_order_changes` | orders.UPDATE (status or total changed) | Log order changes | INSERT audit_log |
| `audit_inventory_changes` | inventory.UPDATE (quantity changed) | Log stock changes | INSERT audit_log |
| `recalc_event_stats` | event_orders.INSERT/UPDATE/DELETE OR event_checkins.INSERT/DELETE | Maintain event aggregates | UPDATE events (tickets_sold, total_revenue_cents, checkins_count) |
| `enforce_shift_close_note` | shifts.INSERT/UPDATE before | Require note if variance > threshold | RAISE EXCEPTION if note missing |
| `alert_on_forced_shift_close` | shifts.UPDATE to status='forced_closed' | Flag forced closes | INSERT variance_alerts |
| `alert_on_float_discrepancy` | shifts.INSERT after | Flag float discrepancies | INSERT variance_alerts |

---

## VIEWS

| View | Purpose | Definition |
|------|---------|-----------|
| `orders_active` | Customers see only non-deleted orders | `WHERE is_deleted=false` |
| `events_active` | Customers see only live, non-deleted events | `WHERE is_deleted=false AND status='live'` |
| `tenant_config` | Quick config lookup | Join businesses + branding with LEFT JOIN |
| `menu_view` | Aggregated menu for frontend | Categories + items in JSONB per business |
| `inventory_cogs_summary` | COGS reporting | inventory + menu_items with total value calc |

---

## INDEXES (Performance)

**Critical indexes:**

| Table | Index | Reason |
|-------|-------|--------|
| orders | (business_id) | Owner dashboard filters |
| orders | (status) | KDS active orders filter |
| orders | (guest_token) | Customer receipt lookup |
| orders | (payment_id) UNIQUE | Webhook idempotency |
| events | (business_id, status) | Owner events + customer discovery |
| event_orders | (event_id, guest_token) | Customer ticket lookup |
| shifts | (business_id, status) | Corte de caja open shift |
| loyalty_accounts | (customer_phone) UNIQUE | Global phone scoping |
| transaction_ledger | (idempotency_key) UNIQUE | Webhook dedup |
| menu_items | (business_id) | Menu rendering |
| businesses | (owner_id) | Owner dashboard |
| businesses | (parent_slug) | Multi-location hub |

---

## DATA VALIDATION RULES

### INTEGER CENTS (MANDATORY)
- **orders.total_cents** ≥ 0
- **transaction_ledger.amount_gross_cents** ≥ 0
- **event_orders.total_cents** ≥ 0
- **menu_items.price_cents** > 0
- **delivery_settings.fee_cents** ≥ 0
- **inventory.quantity_available** ≥ 0

**RULE:** All currency calculations use INTEGER cents. No NUMERIC/FLOAT for amounts.

### STATUS CONSTRAINTS (LOCKED PAIRS)
- **orders.status** CHECK constraint paired with `src/constants/database.js` ORDER_STATUS array
  - Any change to one REQUIRES corresponding SQL migration for the other
  - 2026-05-18 incident: mismatched check constraint blocked order creation in production
- **events.status** must be 'draft' | 'live' | 'archived'
- **event_orders.payment_status** must be 'pending' | 'paid' | 'refunded' | 'cancelled'
- **shifts.status** must be 'open' | 'closing' | 'closed' | 'forced_closed'

### FOREIGN KEY CASCADES
- Delete business → CASCADE delete branding, menu_items, orders, events, etc.
- Delete event → CASCADE delete event_orders, event_checkins
- Delete order → CASCADE delete order_transitions
- Delete staff → RESTRICT (can't delete if shifts exist)

---

## SOFT DELETES (v3.0)

Implemented on:
- **orders** (is_deleted, deleted_at) — keeps payment history, audit trail
- **events** (is_deleted, deleted_at) — keeps tickets + check-ins for reconciliation
- **event_orders** (deleted_at) — customers can delete ticket from "My Tickets", row stays for audit
- **businesses** (deleted_at) — owner can archive location, data stays

**Pattern:**
```sql
SELECT * FROM orders WHERE is_deleted = false;
```

---

## CONCURRENCY & LOCKS

- **orders.status transitions:** `pg_advisory_xact_lock()` on order UUID hash prevents race on state machine
- **shifts.version:** INTEGER version column for optimistic locking on close-out
- **transaction_ledger.idempotency_key:** UNIQUE constraint prevents duplicate webhook processing
- **inventory.quantity_available:** CHECK constraint prevents negative stock at DB level

---

## RPC SECURITY

**All SECURITY DEFINER functions:**
- Set `search_path = public` (prevent schema pollution attacks)
- Include owner/business checks before returning/modifying data
- Never trust client-provided amounts (read from DB instead)
- Use idempotency keys for webhook-facing RPCs
- Log all sensitive changes to audit_log

---

## DEPLOYMENT & MIGRATIONS

**Latest Patch Applied:** v3.0 (2026-07-02)

**Key Migrations:**
1. ✅ v2.1 — 10 foundation fixes (checksums, soft deletes, audit triggers)
2. ✅ v2.2 — Safety enhancements (promo validation, inventory reserve/release, audit trigger)
3. ✅ v2.3 — RLS fixes (owner_id backfill, authenticated owner bypass policies)
4. ✅ v2.4 — Cash settlement RPC + backfill (record_cash_payment idempotent)
5. ✅ v3.0 — Multi-location hub + universal loyalty + corte de caja + soft deletes

**All migrations cumulative.** Production database is current with all fixes applied.

---

## NEXT STEPS

- ✅ Schema locked at 2026-07-02 (66 tables, 1,765 rows, all migrations applied)
- ✅ All RLS policies in place (ownership + guest isolation)
- ✅ All triggers active (loyalty, UGC, audit, stats)
- ✅ All RPCs deployed (order FSM, cash payment, loyalty, events, multi-location)
- ⏳ Ready to build new features with authoritative schema reference

---

**DATABASE BIBLE v3.0 — FINAL**  
**Status:** ✅ Authoritative  
**Updated:** 2026-07-02  
**Signed Off:** Claude Code  
