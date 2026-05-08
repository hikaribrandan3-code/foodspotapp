# FoodSpot Database Bible 📚
**Complete Schema, Policies, Functions & Edge Functions Reference**
*Last Updated: 2026-05-08*

---

## Table of Contents
1. [Architecture Overview](#architecture-overview)
2. [Core Tables](#core-tables)
3. [RLS Policies](#rls-policies)
4. [Database Functions (RPCs)](#database-functions--rpcs)
5. [Edge Functions](#edge-functions)
6. [Indexes](#indexes)
7. [Key Relationships](#key-relationships)
8. [Critical Rules](#critical-rules)
9. [Recent Changes](#recent-changes)

---

## Architecture Overview

### Stack
- **Database:** PostgreSQL via Supabase
- **Authentication:** Supabase Auth + JWT custom headers
- **Real-time:** Supabase Realtime (respects RLS)
- **Payments:** Mercado Pago (webhooks via Edge Functions)
- **Multi-Tenancy:** Every table has `business_id` (RLS enforced)

### Multi-Tenant Model
- **Tenants:** Restaurants identified by `business_id` (UUID)
- **Isolation:** Every query filters by `business_id`
- **RLS:** Row-level security policies enforce business_id matching
- **Guest Tokens:** For unauthenticated customers (orders, event tickets)

### Data Integrity
- **Integer Math Only:** All currency stored as minor units (cents ARS)
- **No Floats:** Prevents rounding errors in payments
- **Atomic State Machine:** Orders transition via `transition_order_state()` RPC
- **Idempotency:** Webhooks guard against double-processing

---

## Core Tables

### 1. **businesses**
```sql
CREATE TABLE businesses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    address TEXT,
    phone VARCHAR(50),
    timezone VARCHAR(50) DEFAULT 'America/Argentina/Buenos_Aires',
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```
**Purpose:** Root tenant table. Every business is a separate restaurant with its own menu, orders, events, staff.
**RLS:** None (root table)

---

### 2. **orders**
```sql
-- Core order fields
id UUID PRIMARY KEY
business_id UUID NOT NULL
order_number INTEGER
guest_token UUID -- For anonymous customer access
status TEXT (see State Machine below)
owner_status TEXT -- Display name for owner dashboard
order_type VARCHAR(20) -- 'delivery', 'pickup', 'dine-in'
table_number VARCHAR(20) -- For dine-in

-- Customer info
customer_name TEXT
customer_email TEXT
customer_phone TEXT
address TEXT -- Delivery address (JSONB)

-- Items & pricing (INTEGER CENTS ONLY)
items JSONB -- [{name, quantity, price_cents}, ...]
subtotal INTEGER -- cents
discount INTEGER -- cents
delivery_fee INTEGER -- cents
total INTEGER -- cents (subtotal + delivery - discount)

-- Payment
payment_status TEXT ('pending', 'paid', 'refunded', 'cancelled')
payment_method TEXT ('mercado_pago', 'cash', 'card')
payment_id TEXT -- Mercado Pago payment ID
mp_preference_id TEXT -- MP checkout preference ID
paid_at TIMESTAMPTZ
payment_confirmed BOOLEAN
mp_payment_data JSONB

-- Timing
created_at TIMESTAMPTZ
started_at TIMESTAMPTZ
ready_at TIMESTAMPTZ
delivered_at TIMESTAMPTZ
cancelled_at TIMESTAMPTZ
updated_at TIMESTAMPTZ

-- Assignment
assigned_to UUID -- staff.id
```

**State Machine (Valid Transitions):**
```
pending → paid
paid → cooking
cooking → ready
ready → delivered (pickup/dine-in)
ready → dispatched (delivery)
dispatched → delivered
delivered → refunded
<any> → cancelled
```

**RLS Policies:**
- "Customer Select Own Orders" — SELECT where guest_token matches header
- "Public Insert Orders" — INSERT allowed for anyone
- "Owner Select Own Orders" — SELECT where business_id matches header
- "Owner Update Own Orders" — UPDATE where business_id matches header
- "Staff update orders" — UPDATE if user role is staff/owner/superadmin

---

### 3. **events**
```sql
CREATE TABLE events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    category TEXT NOT NULL DEFAULT 'Food',
    start_date TIMESTAMP WITH TIME ZONE NOT NULL,
    end_date TIMESTAMP WITH TIME ZONE,
    venue_name TEXT,
    address TEXT,
    image_url TEXT,
    is_free BOOLEAN NOT NULL DEFAULT false,
    
    -- CRITICAL: status controls visibility
    -- Only 'live' events appear on customer frontend
    status TEXT NOT NULL DEFAULT 'draft'
        CHECK (status IN ('draft', 'live', 'archived')),
    
    -- Tiers stored as JSONB array
    -- [{id, name, price_cents, capacity, sold}, ...]
    -- price_cents is INTEGER (minor units)
    ticket_tiers JSONB NOT NULL DEFAULT '[]'::jsonb,
    addons JSONB NOT NULL DEFAULT '[]'::jsonb,
    lineup JSONB DEFAULT '[]'::jsonb,
    venue_map JSONB DEFAULT NULL,
    
    -- Auto-maintained aggregates (updated by triggers)
    total_capacity INTEGER NOT NULL DEFAULT 0,
    tickets_sold INTEGER NOT NULL DEFAULT 0,
    total_revenue_cents INTEGER NOT NULL DEFAULT 0,
    checkins_count INTEGER NOT NULL DEFAULT 0,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

**RLS Policies:**
- "events_owner_all" — Owners can CRUD their own events (business_id match)
- "events_public_read" — Customers can only read live events (status = 'live')

---

### 4. **event_orders**
```sql
CREATE TABLE event_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    
    -- Customer (guest checkout, no auth required)
    customer_name TEXT,
    customer_email TEXT,
    customer_phone TEXT,
    
    -- Ticket snapshot (immutable after purchase)
    tier_snapshot JSONB NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 1,
    addons_snapshot JSONB NOT NULL DEFAULT '[]'::jsonb,
    
    -- Pricing (INTEGER CENTS ONLY - No floats!)
    subtotal_cents INTEGER NOT NULL,
    discount_cents INTEGER NOT NULL DEFAULT 0,
    total_cents INTEGER NOT NULL,
    
    -- Promo codes
    promo_code TEXT,
    referral_code TEXT,
    
    -- Payment
    payment_status TEXT NOT NULL DEFAULT 'pending'
        CHECK (payment_status IN ('pending', 'paid', 'refunded', 'cancelled')),
    payment_method TEXT,
    mp_preference_id TEXT,
    mp_payment_id TEXT,
    
    -- Ticket
    ticket_code TEXT NOT NULL UNIQUE,
    guest_token TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

**RLS Policies:**
- "event_orders_owner_read" — Owners see all orders for their events
- "event_orders_guest_read" — Guests see their own orders via guest_token
- "event_orders_public_insert" — Public can create orders (checkout)

---

### 5. **event_checkins**
```sql
CREATE TABLE event_checkins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    order_id UUID NOT NULL REFERENCES event_orders(id) ON DELETE CASCADE,
    checked_in_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    checked_in_by UUID,
    checkin_method TEXT NOT NULL DEFAULT 'qr_scan'
        CHECK (checkin_method IN ('qr_scan', 'manual', 'wristband')),
    notes TEXT,
    UNIQUE(event_id, order_id)  -- Prevent double check-in
);
```

**RLS Policies:**
- "event_checkins_owner_all" — Owners manage all check-ins for their events

---

### 6. **event_promo_codes**
```sql
CREATE TABLE event_promo_codes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    code TEXT NOT NULL,
    discount_percent INTEGER NOT NULL DEFAULT 10,
    max_uses INTEGER,
    used_count INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(event_id, code)
);
```

**RLS Policies:**
- "event_promo_codes_owner_all" — Owners CRUD their own promo codes

---

### 7. **event_leads**
```sql
CREATE TABLE event_leads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL,
    event_id TEXT NOT NULL,
    full_name TEXT NOT NULL,
    phone TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

**RLS Policies:**
- "Allow anonymous inserts to event_leads" — Anyone can submit lead info
- "Allow owners to view their own event_leads" — Owners see their leads

---

### 8. **menu_items**
```sql
-- Core fields (implied from context)
id UUID PRIMARY KEY
business_id UUID NOT NULL
category_id UUID
name TEXT NOT NULL
description TEXT
price INTEGER -- cents (ARS minor units)
image_url TEXT
available BOOLEAN DEFAULT true
sort_order INTEGER
calories INTEGER
category_text TEXT
created_at TIMESTAMPTZ
updated_at TIMESTAMPTZ
```

**RLS:** Implied business_id filtering

---

### 9. **staff** (KDS/Staff Ops)
```sql
CREATE TABLE staff (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL,
    email VARCHAR(255),
    name VARCHAR(100) NOT NULL,
    pin VARCHAR(4),
    role VARCHAR(20) NOT NULL DEFAULT 'cook'
        CHECK (role IN ('admin', 'manager', 'cook', 'runner', 'cashier')),
    status VARCHAR(20) DEFAULT 'active'
        CHECK (status IN ('active', 'inactive', 'suspended')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**RLS Policies:**
- "Staff read by business" — SELECT where business_id matches
- "Staff insert by business" — INSERT where business_id matches
- "Staff update by business" — UPDATE where business_id matches

---

### 10. **staff_shifts**
```sql
CREATE TABLE staff_shifts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL,
    staff_id UUID NOT NULL,
    shift_start TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    shift_end TIMESTAMPTZ,
    clock_in_lat FLOAT,
    clock_in_lon FLOAT,
    clock_out_lat FLOAT,
    clock_out_lon FLOAT,
    status VARCHAR(20) DEFAULT 'active'
        CHECK (status IN ('active', 'closed', 'missed')),
    total_orders INTEGER DEFAULT 0,
    total_revenue NUMERIC(12,2) DEFAULT 0,
    tips NUMERIC(10,2) DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**RLS Policies:**
- "Staff see own shifts" — SELECT where business_id OR staff_id matches
- "Staff insert own shifts" — INSERT where business_id matches
- "Staff update own shifts" — UPDATE where business_id matches

---

### 11. **ledger_entries**
```sql
CREATE TABLE ledger_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL,
    order_id UUID,
    shift_id UUID,
    entry_type VARCHAR(20) NOT NULL
        CHECK (entry_type IN ('order', 'payment', 'refund', 'adjustment', 'tip', 'payout')),
    amount NUMERIC(10,2) NOT NULL,
    payment_method VARCHAR(20),
    reference_id VARCHAR(100),
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID
);
```

**RLS Policies:**
- "Ledger read by business" — SELECT where business_id matches
- "Ledger insert by business" — INSERT where business_id matches
- "Ledger update by business" — UPDATE where business_id matches

---

### 12. **order_sessions** (Shared Ordering)
```sql
CREATE TABLE order_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL,
    share_code VARCHAR(6) NOT NULL,
    table_number VARCHAR(20),
    session_name VARCHAR(100),
    created_by VARCHAR(100),
    status VARCHAR(20) DEFAULT 'active'
        CHECK (status IN ('active', 'closed', 'expired')),
    items JSONB DEFAULT '[]'::jsonb,
    participants JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ,
    closed_at TIMESTAMPTZ
);
```

**RLS Policies:**
- "Allow read active sessions" — SELECT where status = 'active' AND expires_at > NOW()
- "Owners can manage sessions" — ALL for owners (business_id match)
- "Guests can create sessions" — INSERT for public
- "Participants can update session" — UPDATE for public

---

### 13. **transaction_ledger** (Implied)
```sql
-- Tracks every payment transaction (created by mp-webhook)
id UUID PRIMARY KEY
order_id UUID NOT NULL
business_id UUID NOT NULL
transaction_type TEXT -- 'payment', 'refund', etc.
status TEXT -- 'pending', 'completed', 'failed'
amount_gross_cents INTEGER -- payment amount in cents
external_reference TEXT -- MP external reference
mercado_pago_response JSONB -- Full MP payment object
payment_method TEXT -- 'debit_card', 'credit_card', etc.
currency TEXT DEFAULT 'ARS'
processed_at TIMESTAMPTZ
created_at TIMESTAMPTZ DEFAULT NOW()
```

---

## RLS Policies

### Policy Summary Table

| Table | Policy Name | Type | Condition |
|-------|-------------|------|-----------|
| **orders** | Customer Select Own Orders | SELECT | guest_token = header |
| | Public Insert Orders | INSERT | true |
| | Owner Select Own Orders | SELECT | business_id = header |
| | Owner Update Own Orders | UPDATE | business_id = header |
| | Staff update orders | UPDATE | user role = staff/owner/superadmin |
| **events** | events_owner_all | ALL | business_id = header |
| | events_public_read | SELECT | status = 'live' |
| **event_orders** | event_orders_owner_read | SELECT | business_id = header |
| | event_orders_guest_read | SELECT | guest_token = header |
| | event_orders_public_insert | INSERT | true |
| **event_checkins** | event_checkins_owner_all | ALL | event via business_id |
| **event_promo_codes** | event_promo_codes_owner_all | ALL | business_id = header |
| **staff** | Staff read/insert/update | * | business_id = header |
| **staff_shifts** | Staff see own shifts | SELECT | business_id OR staff_id = header |
| | Staff insert own shifts | INSERT | business_id = header |
| | Staff update own shifts | UPDATE | business_id = header |
| **ledger_entries** | Ledger read/insert/update | * | business_id = header |
| **order_sessions** | Allow read active sessions | SELECT | active + not expired |
| | Owners can manage sessions | ALL | business_id = header |
| | Guests can create sessions | INSERT | true |
| | Participants can update | UPDATE | true |

### Key RLS Implementation Details

**Header-Based Isolation:**
```sql
-- Pattern used across all policies:
business_id = (current_setting('request.headers', true)::json->>'x-business-id')::uuid

-- Guest token pattern:
guest_token = (current_setting('request.headers', true)::json->>'x-guest-token')::uuid
```

**Guest Token Flow:**
1. Customer creates order → gets `guest_token` UUID
2. Frontend stores token in localStorage (key: `fs_guest_token_<slug>`)
3. Every subsequent query includes `x-guest-token` header
4. RLS filters by token match (no need to expose order IDs)

---

## Database Functions (RPCs)

### 1. **transition_order_state(p_order_id UUID, p_new_status VARCHAR, p_staff_id UUID = NULL)**
**Purpose:** Atomic order state machine. Single source of truth for order status changes.

**Valid Transitions:**
- pending → paid
- pending → cancelled
- paid → cooking
- paid → cancelled
- cooking → ready
- cooking → cancelled
- ready → delivered (pickup/dine-in)
- ready → dispatched (delivery)
- dispatched → delivered
- delivered → refunded
- cancelled → pending

**Security:**
- Uses `pg_try_advisory_lock()` to prevent race conditions
- Validates transition rules before executing
- Returns success/error with audit trail

**Returns:**
```json
{
  "success": boolean,
  "message": string,
  "old_status": string,
  "new_status": string
}
```

---

### 2. **advance_order_status(p_order_id UUID, p_target_status TEXT)**
**Purpose:** Owner-facing order progression with validation.

**Security:**
- Locks row during update (FOR UPDATE)
- Idempotency guard: returns success if already at target
- Validates transitions against state machine
- Cancellation allowed from any non-terminal state

**Returns:**
```json
{
  "success": boolean,
  "from_status": string,
  "to_status": string,
  "message": string,
  "error": string (if failed),
  "current_status": string
}
```

---

### 3. **clock_in(p_business_id UUID, p_staff_id UUID, p_lat FLOAT, p_lon FLOAT)**
**Purpose:** Staff clock-in with geolocation tracking.

**Logic:**
1. Closes any open shifts for staff
2. Creates new shift with clock_in coordinates
3. Returns shift UUID

---

### 4. **clock_out(p_shift_id UUID, p_lat FLOAT, p_lon FLOAT)**
**Purpose:** Staff clock-out with geolocation.

**Updates:**
- shift_end = NOW()
- status = 'closed'
- clock_out_lat/lon recorded

---

### 5. **increment_promo_used_count(p_event_id UUID, p_code TEXT)**
**Purpose:** Atomically increment promo code usage counter.

**Used By:** create-event-preference edge function after payment.

---

### 6. **get_ai_business_context(p_business_id UUID, p_days INTEGER = 7)**
**Purpose:** Generate AI-friendly business analytics snapshot.

**Returns JSONB:**
```json
{
  "period_days": 7,
  "generated_at": "2026-05-08T...",
  "has_data": true,
  "revenue_total": 150000,
  "orders_total": 42,
  "avg_ticket": 3571,
  "prev_revenue": 120000,
  "prev_orders": 35,
  "peak_hour": 19,
  "peak_hour_count": 12,
  "peak_day": "Friday",
  "top_items": [
    {"name": "Burger", "units_sold": 25, "revenue": 87500},
    ...
  ],
  "order_types": [
    {"type": "delivery", "count": 20},
    {"type": "pickup", "count": 18},
    {"type": "dine-in", "count": 4}
  ],
  "payment_methods": [
    {"method": "mercado_pago", "count": 25},
    {"method": "cash", "count": 17}
  ]
}
```

---

### 7. **get_ai_menu_context(p_business_id UUID)**
**Purpose:** Generate AI-friendly menu structure.

**Returns JSONB:**
```json
{
  "total_active": 24,
  "categories": [
    {
      "name": "Burgers",
      "item_count": 8,
      "sample_items": [
        {"name": "Classic Burger", "price": 850},
        ...
      ]
    },
    ...
  ]
}
```

---

### 8. **recalc_event_stats()** (Trigger Function)
**Purpose:** Auto-update event aggregates on order/checkin changes.

**Triggers On:**
- INSERT/UPDATE/DELETE on event_orders
- INSERT/DELETE on event_checkins

**Updates in events table:**
- tickets_sold = SUM(quantity) WHERE payment_status = 'paid'
- total_revenue_cents = SUM(total_cents) WHERE payment_status = 'paid'
- checkins_count = COUNT(*) FROM event_checkins

---

## Edge Functions

### 1. **mp-webhook** (Mercado Pago Payment Webhook)
**File:** `supabase/functions/mp-webhook/index.ts`

**Trigger:** Mercado Pago POST when payment status changes

**Security:**
- HMAC-SHA256 signature verification (Web Crypto API)
- Multi-tenant tenant lookup by MP user ID
- Idempotency guard: checks if payment already processed
- Rate limiting via request_id tracking

**Flow:**
1. Verify HMAC signature
2. Check if payment notification (filter by type = "payment")
3. Lookup business via branding_secrets.mp_user_id
4. Fetch payment details from MP API
5. Check for duplicate processing (idempotency)
6. If approved: update order status → "released_to_kitchen"
7. Create/update transaction_ledger entry
8. Return success/error response

**Response:**
```json
{
  "success": true,
  "order_id": "xxx-xxx",
  "ledger_id": "yyy-yyy",
  "ledger_action": "created|updated"
}
```

---

### 2. **create-preference** (Order Checkout)
**File:** `supabase/functions/create-preference/index.ts`

**Trigger:** POST from OrderCheckout (React client)

**Input:**
```json
{ "order_id": "xxx-xxx" }
```

**Flow:**
1. Verify JWT auth header
2. Fetch order from DB (get total, business_id)
3. Fetch branding config (mp_access_token, currency)
4. Build MP preference body
5. POST to Mercado Pago API
6. Store mp_preference_id in orders table
7. Return init_point (checkout URL)

**Output:**
```json
{
  "init_point": "https://mercadopago.com/checkout/...",
  "sandbox_init_point": "...",
  "redirect_url": "...",
  "preference_id": "xxx"
}
```

---

### 3. **create-event-preference** (Event Ticket Checkout)
**File:** `supabase/functions/create-event-preference/index.ts`

**Trigger:** POST from EventCheckout (React client)

**Input:**
```json
{
  "event_id": "xxx",
  "tier_id": "tier_vip",
  "quantity": 2,
  "addons": [],
  "customer": { "name": "John", "email": "...", "phone": "..." },
  "promo_code": "LAUNCH10"
}
```

**Flow:**
1. Verify JWT auth
2. Validate event exists and is 'live'
3. Find tier, check remaining capacity
4. Calculate pricing (INTEGER cents only)
5. Apply promo code discount (if provided)
6. Re-check capacity (race condition protection)
7. Create event_order with ticket_code
8. Generate MP preference
9. If free event: skip payment, mark paid
10. Return checkout URL or success

**Output:**
```json
{
  "success": true,
  "ticket_code": "TKT-ABC-123",
  "order_id": "xxx",
  "init_point": "https://mercadopago.com/...",
  "guest_token": "yyy"
}
```

---

### 4. **mp-event-webhook** (Event Payment Webhook)
**Similar to mp-webhook**, but:**
- Updates event_orders (not orders)
- Increments promo code used_count
- Handles ticket_code generation
- Triggers event stats recalc

---

### Other Edge Functions
- **mp-split-webhook** — Handle split payments
- **create-split-preference** — Multi-recipient payments
- **foodspot-ai** — AI context generation
- **foodspot-image** — Image processing
- **staff-agent** — AI staff ops assistant
- **vibe-boost** — UGC generation

---

## Indexes

### Performance Indexes

```sql
-- Orders
CREATE INDEX idx_orders_business ON orders(business_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_guest_token ON orders(guest_token);
CREATE INDEX idx_orders_ai_context ON orders(business_id, created_at DESC, status)
    INCLUDE (total, order_type, payment_method);

-- Events
CREATE INDEX idx_events_business ON public.events(business_id);
CREATE INDEX idx_events_status ON public.events(status);
CREATE INDEX idx_events_start_date ON public.events(start_date);

-- Event Orders
CREATE INDEX idx_event_orders_event ON public.event_orders(event_id);
CREATE INDEX idx_event_orders_business ON public.event_orders(business_id);
CREATE INDEX idx_event_orders_guest_token ON public.event_orders(guest_token);
CREATE INDEX idx_event_orders_ticket_code ON public.event_orders(ticket_code);
CREATE INDEX idx_event_orders_mp_payment ON public.event_orders(mp_payment_id);

-- Event Checkins
CREATE INDEX idx_event_checkins_event ON public.event_checkins(event_id);
CREATE INDEX idx_event_checkins_order ON public.event_checkins(order_id);

-- Promo Codes
CREATE INDEX idx_promo_event ON public.event_promo_codes(event_id);

-- Order Sessions
CREATE INDEX idx_order_sessions_business ON order_sessions(business_id);
CREATE INDEX idx_order_sessions_share_code ON order_sessions(share_code);
CREATE INDEX idx_order_sessions_status_expires ON order_sessions(status, expires_at)
    WHERE status = 'active';

-- Staff
CREATE INDEX idx_staff_shifts_business ON staff_shifts(business_id);
CREATE INDEX idx_staff_shifts_staff ON staff_shifts(staff_id);
CREATE INDEX idx_staff_shifts_active ON staff_shifts(status, shift_end) WHERE status = 'active';

-- Ledger
CREATE INDEX idx_ledger_entries_business ON ledger_entries(business_id);
CREATE INDEX idx_ledger_entries_order ON ledger_entries(order_id);
CREATE INDEX idx_ledger_entries_shift ON ledger_entries(shift_id);
```

---

## Key Relationships

### Referential Integrity

```
businesses (root)
├── orders (fk: business_id) ──→ orders.business_id
│   ├── order_sessions (orders can be grouped into sessions)
│   └── [payment via mp-webhook]
├── events (fk: business_id) ──→ events.business_id
│   ├── event_orders (fk: event_id) ──→ event_orders.event_id
│   │   └── event_checkins (fk: order_id) ──→ event_checkins.order_id
│   └── event_promo_codes (fk: event_id) ──→ event_promo_codes.event_id
├── staff (fk: business_id) ──→ staff.business_id
│   └── staff_shifts (fk: staff_id) ──→ staff_shifts.staff_id
├── menu_items (fk: business_id) ──→ menu_items.business_id
├── order_sessions (fk: business_id) ──→ order_sessions.business_id
├── ledger_entries (fk: business_id) ──→ ledger_entries.business_id
│   ├── order_id (optional) ──→ orders.id
│   └── shift_id (optional) ──→ staff_shifts.id
└── branding / branding_secrets (fk: business_id)
```

### Data Flow: Order → Payment → Ledger

```
1. Frontend creates order (POST /orders)
   → orders table {status: 'pending_payment', guest_token: UUID}

2. Checkout initiated (POST /create-preference)
   → MP API returns init_point
   → orders.mp_preference_id updated

3. Customer pays on MP
   → MP webhook (POST /mp-webhook)
   → Verify HMAC signature
   → Update orders {status: 'released_to_kitchen', paid_at: NOW()}
   → Create transaction_ledger entry {status: 'completed'}

4. Order progresses through KDS
   → transition_order_state() called
   → Status: cooking → ready → delivered

5. Final state: delivered
   → Staff confirms delivery
   → ledger_entries finalized
```

---

## Critical Rules

### 🛑 Non-Negotiable

1. **INTEGER MATH ONLY**
   - All prices in integer cents (minor units)
   - `$25.50 = 2550` (not 25.5)
   - Never use parseFloat() on currency
   - Check: `Math.round(value * 100)` before storing

2. **TENANT ISOLATION**
   - Every query MUST filter by `business_id`
   - RLS policies enforce this at DB level
   - Test with multiple businesses to verify

3. **ATOMIC STATE CHANGES**
   - Use `transition_order_state()` RPC for order status
   - Never UPDATE orders.status directly
   - Only valid transitions allowed by FSM

4. **IDEMPOTENCY**
   - Webhooks check for duplicate processing
   - Payment processed once per payment_id
   - Ledger entries keyed by order_id + payment_id

5. **GUEST TOKEN ISOLATION**
   - Frontend stores token in localStorage: `fs_guest_token_<slug>`
   - Every order query includes x-guest-token header
   - RLS ensures customers only see their own orders

---

## Recent Changes

### 2026-05-08: AI Business Context
**File:** `supabase/migrations/20260508_ai_business_context.sql`
- Added `get_ai_business_context(p_business_id UUID, p_days INTEGER)` RPC
- Added `get_ai_menu_context(p_business_id UUID)` RPC
- Added performance indexes for context queries
- Accessible to anon, authenticated, service_role

### 2026-05-05: Events Platform
**Files:**
- `20260505120000_create_events_platform.sql` — events, event_orders, event_checkins tables
- `20260505130000_event_promo_codes.sql` — Promo code system with atomicity

**Schema:**
- events (draft/live/archived status control)
- event_orders (guest checkout, INTEGER pricing)
- event_checkins (QR/manual/wristband tracking)
- event_promo_codes (discount_percent, max_uses, used_count)

**Triggers:**
- recalc_event_stats() — Updates events aggregates on order/checkin changes

### 2026-04-25: Order Status Enhancements
**File:** `supabase/migrations/20260425_owner_status_and_rpc_update.sql`

**Changes:**
- Added `owner_status` TEXT column to orders
- Updated `advance_order_status()` RPC
- Cancellation support from any non-terminal state
- Idempotency guards

### 2026-04-28: Orders Timestamps
**File:** `supabase/migrations/20260428_add_orders_updated_at.sql`
- Added `updated_at` column for audit trail

### 2026-03-16: KDS State Machine
**File:** `supabase/migrations/20260316_add_kds_functions.sql`

**Tables:**
- businesses, staff, staff_shifts, ledger_entries

**Functions:**
- transition_order_state() — Atomic FSM with advisory locks
- clock_in() / clock_out() — Geolocation tracking

### 2026-03-14: Shared Ordering
**File:** `supabase/migrations/20260314_create_order_sessions.sql`

**Table:** order_sessions
- share_code (6-char)
- status (active/closed/expired)
- expires_at for time-based cleanup

---

## Checklist for Adding New Tables

When adding a new table, ensure:

- [ ] Has `business_id` UUID NOT NULL (multi-tenancy)
- [ ] Has `created_at` TIMESTAMPTZ DEFAULT NOW()
- [ ] Has `updated_at` TIMESTAMPTZ DEFAULT NOW() (if mutable)
- [ ] RLS enabled: `ALTER TABLE <table> ENABLE ROW LEVEL SECURITY;`
- [ ] RLS policy filtering by business_id (for owner access)
- [ ] RLS policy for public insert (if guest access needed)
- [ ] Indexes on frequently queried columns
- [ ] Index on business_id for filtering
- [ ] ON DELETE CASCADE for foreign keys (clean up on business deletion)
- [ ] Documented in this file with schema, RLS, and purpose

---

## SQL Snapshots by Date

### Key Migration Files
1. `20260211180000_enable_rls.sql` — RLS foundation
2. `20260211181500_owner_policy.sql` — Owner access patterns
3. `20260303_create_event_leads.sql` — CRM integration
4. `20260314_create_order_sessions.sql` — Table sharing
5. `20260316_add_kds_functions.sql` — State machine
6. `20260425_owner_status_and_rpc_update.sql` — Order status
7. `20260505120000_create_events_platform.sql` — Events (main)
8. `20260505130000_event_promo_codes.sql` — Promo system
9. `20260508_ai_business_context.sql` — Analytics RPCs

---

## Production Checklist

Before deploying to production:

- [ ] All queries filter by business_id
- [ ] RLS policies tested with multiple tenants
- [ ] Integer math verified (no floats in pricing)
- [ ] Webhook HMAC signatures verified
- [ ] Advisory locks test for race conditions
- [ ] Idempotency guards in place
- [ ] Backup strategy for transaction_ledger
- [ ] Monitoring for slow queries (check indexes)
- [ ] Rate limiting on webhook endpoints
- [ ] Secret rotation: MP_WEBHOOK_SECRET, SUPABASE_SERVICE_KEY

---

**End of Database Bible**
*Next update: After next major migration or schema change*
