# FoodSpot Database Bible - COMPLETE 📚
**Complete Live Schema Snapshot from Supabase (2026-05-08)**

---

## Summary

✅ **8/8 Data Extracts Complete**
- 65+ tables
- 100+ constraints
- 75+ RLS policies
- 100+ indexes
- 120+ functions/RPCs
- 2 triggers
- Complete permissions matrix
- Column comments

---

## Custom FoodSpot Functions (Production)

### Core Order Management
- **advance_order_status** — Owner-facing order progression
- **transition_order_state** — Atomic FSM (in migrations, not listed)
- **check_stalled_orders** — Monitor stuck orders

### Staff & Time Tracking
- **clock_in** — Staff geolocation tracking start
- **clock_out** — Staff geolocation tracking end

### Analytics & Context (AI)
- **get_ai_business_context** — 7-day revenue snapshot
- **get_ai_menu_context** — Menu structure for AI

### Event Management
- **increment_promo_used_count** — Atomic counter
- **redeem_ticket** — Event check-in processor

### Inventory
- **inventory_movement_to_expense** — Auto-ledger from stock moves

### Auth Helpers
- **is_branding_owner** — RLS permission check
- **get_user_id_by_email** — Email lookup
- **handle_new_user** — Supabase auth trigger

### Triggers & Aggregates
- **recalc_event_stats** — Auto-update event totals
- **increment_image_usage** — Track weekly image generation
- **update_ledger_status** — Sync ledger state

---

## Table Inventory (65+ tables)

### Core Business
- **businesses** — Tenant root
- **branding** — UI/config per tenant (65 columns)
- **branding_secrets** — Encrypted MP tokens

### Orders & Payments
- **orders** — Main order entity
- **order_sessions** — Table sharing
- **order_transitions** — Audit trail
- **order_status_logs** — Legacy logs
- **split_payments** — Multi-recipient payments
- **table_ledgers** — Dine-in payment tracking
- **transaction_ledger** — Payment audit (implied from code)

### Events & Tickets
- **events** — Event listings (draft/live/archived)
- **event_orders** — Ticket purchases
- **event_checkins** — Door entry tracking
- **event_promo_codes** — Discount codes
- **event_leads** — CRM sign-ups

### Menu & Inventory
- **menu_items** — Product catalog
- **categories** — Menu sections
- **inventory** — Stock levels
- **inventory_suppliers** — Vendor info
- **inventory_transactions** — Movement audit

### Staff & Shifts
- **staff** — Employee roster
- **staff_shifts** — Time tracking (with geolocation)
- **ledger_entries** — Financial per-shift

### UGC & Photos
- **el_momento_photos** — Customer uploads
- **el_momento_hearts** — Photo likes
- **creator_attribution** — Credit tracking
- **image_generation_logs** — AI image requests
- **image_usage** — Weekly quota tracking

### Financial
- **expenses** — Cost tracking
- **wallets** — Account balances
- **wallet_transactions** — Wallet movements
- **products** — (legacy?)

### AI & Agents
- **agent_registry** — AI agent definitions
- **ai_master_memory** — Embeddings + context
- **ai_memory_profiles** — Per-business preferences

### System
- **tenants** — (legacy auth)
- **profiles** — User metadata
- **captain_laws** — System rules/constraints

---

## RLS Policies by Table (75+)

### Public Read (No Auth)
| Table | Policy | Condition |
|-------|--------|-----------|
| branding | Public read | true |
| businesses | Anyone can read | true |
| categories | Public read | true |
| menu_items | Public read | true |
| events | events_public_read | status = 'live' |
| el_momento_photos | Users view venue | business_id match |

### Owner Access (x-business-id header)
| Table | Policy | Condition |
|-------|--------|-----------|
| branding | owner_full_access | is_branding_owner(business_id) |
| orders | orders_business_full_access | business_id = header |
| events | events_owner_all | business_id = header |
| event_orders | event_orders_owner_read | business_id = header |
| event_checkins | event_checkins_owner_all | via events.business_id |
| event_promo_codes | owner_all | business_id = header |
| inventory | Owners manage | business_id = header |
| staff | Staff read/write | business_id = header |
| staff_shifts | See own shifts | business_id OR staff_id |
| ledger_entries | Ledger read/write | business_id = header |
| expenses | Owners see/delete | business_id = header |
| order_sessions | Owners manage | business_id = header |

### Guest Access (x-guest-token header)
| Table | Policy | Condition |
|-------|--------|-----------|
| orders | orders_public_select | guest_token match |
| event_orders | event_orders_guest_read | guest_token = header |

### Public Insert (No Auth)
| Table | Policy |
|-------|--------|
| orders | orders_public_insert |
| event_orders | event_orders_public_insert |
| event_leads | Allow anonymous inserts |
| order_sessions | Guests can create |
| split_payments | Allow insert |
| wallet_transactions | Allow insert |
| order_transitions | System insert |

### Auth Required
| Table | Policy | Condition |
|-------|--------|-----------|
| events | Enable insert authenticated | true |
| el_momento_photos | Upload venue | business_id = header |
| image_logs | logged-in users | auth.uid() IS NOT NULL |

---

## Index Strategy (100+)

### High-Volume Queries
```
-- Orders (business lookup + status)
idx_orders_ai_context ON orders(business_id, created_at DESC, status) INCLUDE (total, order_type, payment_method)
idx_orders_business_status_created ON orders(business_id, status, created_at DESC)
idx_orders_payment_id_unique ON orders(payment_id) WHERE payment_id IS NOT NULL

-- Menu items (by availability)
idx_menu_items_business_available ON menu_items(business_id, available) WHERE available = true

-- Events (status controls visibility)
idx_events_status ON events(status)
idx_events_start_date ON events(start_date)

-- Inventory (low stock alerts)
idx_inventory_low_stock ON inventory(business_id, quantity_available) WHERE quantity_available <= reorder_level
```

### Multi-Tenant Isolation
Every table has: `idx_<table>_business ON <table>(business_id)`

### Lookups
```
idx_orders_guest_token ON orders(guest_token)
idx_event_orders_guest_token ON event_orders(guest_token)
idx_event_orders_mp_payment ON event_orders(mp_payment_id)
idx_order_sessions_share_code ON order_sessions(share_code)
idx_order_sessions_status_expires ON order_sessions(status, expires_at) WHERE status = 'active'
```

---

## Constraints Matrix

### Foreign Keys
| From | To | Cascade |
|------|----|----|
| ai_memory_profiles | businesses(id) | - |
| event_orders | businesses(id), events(id) | CASCADE |
| event_checkins | events(id), event_orders(id) | CASCADE |
| event_promo_codes | businesses(id), events(id) | CASCADE |
| el_momento_photos | branding(business_id), orders(id) | CASCADE |
| el_momento_hearts | el_momento_photos(id) | CASCADE |
| inventory | (inferred) | - |
| categories | businesses(id) (inferred) | - |

### Unique Constraints
| Table | Column(s) |
|-------|-----------|
| businesses | slug |
| branding | slug, business_id, business_id_legacy |
| agent_registry | agent_name |
| ai_memory_profiles | business_id |
| captain_laws | law_code |
| event_orders | ticket_code |
| event_promo_codes | event_id, code |
| event_checkins | event_id, order_id |
| inventory | barcode, business_id + menu_item_id |
| orders | payment_id (WHERE NOT NULL) |

### Check Constraints
| Table | Constraint |
|-------|-----------|
| event_orders | payment_status IN (pending, paid, refunded, cancelled) |
| event_checkins | checkin_method IN (qr_scan, manual, wristband) |
| el_momento_photos | context (custom enum) |
| events | status IN (draft, live, archived) |
| order_sessions | status IN (active, closed, expired) |
| staff | role IN (admin, manager, cook, runner, cashier) |
| staff_shifts | status IN (active, closed, missed) |
| ledger_entries | entry_type IN (order, payment, refund, adjustment, tip, payout) |

---

## Triggers (2)

### 1. **inventory_movement_to_expense**
```sql
TRIGGER: INSERT ON inventory_transactions
ACTION: EXECUTE FUNCTION inventory_movement_to_expense()
PURPOSE: Auto-create expense ledger entry when stock moves
```

### 2. **update_ledger_status**
```sql
TRIGGER: UPDATE ON table_ledgers
ACTION: EXECUTE FUNCTION update_ledger_status()
PURPOSE: Sync ledger state on payment updates
```

### 3. **event_stats_triggers** (from migrations)
```sql
-- Recalculates event aggregates:
- tickets_sold = SUM(quantity) WHERE payment_status = 'paid'
- total_revenue_cents = SUM(total_cents) WHERE payment_status = 'paid'
- checkins_count = COUNT(*) FROM event_checkins
```

---

## Grants & Permissions

### Role Access Summary
| Role | Tables | Permissions |
|------|--------|-------------|
| **anon** | All public | SELECT (RLS enforced) |
| **authenticated** | Owner-scoped | Full via RLS |
| **service_role** | All | All (bypasses RLS) |
| **postgres** | All | Full |

### Sensitive Tables (postgres-only)
- `branding_secrets` — MP tokens
- `agent_registry` — AI config
- `ai_master_memory` — Embeddings

---

## Data Flow Patterns

### Order → Payment → Ledger
```
Customer creates order (guest_token)
  ↓
Frontend calls create-preference edge function
  ↓
Edge fn creates MP checkout
  ↓
Customer pays on Mercado Pago
  ↓
MP webhook → mp-webhook edge function
  ↓
Verify HMAC → Look up business via mp_user_id
  ↓
Update orders {status: 'released_to_kitchen', paid_at: NOW()}
  ↓
Create/update transaction_ledger {status: 'completed'}
  ↓
Order progresses: cooking → ready → delivered
```

### Event Ticket → Check-in
```
Customer searches live events (status = 'live')
  ↓
Selects tier, applies promo code
  ↓
create-event-preference edge function
  ↓
Validates capacity, calculates pricing (INTEGER cents)
  ↓
Creates event_orders + generates ticket_code
  ↓
MP payment webhook updates event_orders {payment_status: 'paid'}
  ↓
Trigger recalc_event_stats updates events aggregates
  ↓
Owner scans ticket QR → INSERT event_checkins
  ↓
Trigger updates checkins_count
```

---

## Critical Implementation Notes

### 1. INTEGER MATH ONLY
```sql
-- WRONG: $25.50 stored as 25.5
UPDATE orders SET total = 25.5;

-- RIGHT: $25.50 stored as 2550 (cents)
UPDATE orders SET total = 2550;
```

### 2. Header-Based RLS
```sql
-- Every policy pattern:
business_id = (current_setting('request.headers', true)::json->>'x-business-id')::uuid
guest_token = (current_setting('request.headers', true)::json->>'x-guest-token')::text
```

### 3. Tenant Isolation
- Every table has `business_id`
- Every query filters by `business_id`
- RLS enforces at DB level
- Test with 2+ tenants

### 4. State Machine (Orders)
```
pending → paid
paid → cooking
cooking → ready
ready → dispatched (delivery) OR delivered (pickup/dine-in)
dispatched → delivered
delivered → refunded
<any> → cancelled (non-terminal)
```
**Always use `transition_order_state()` RPC, never UPDATE directly**

### 5. Event Status Controls Visibility
```sql
-- Only 'live' events appear to customers
WHERE status = 'live'

-- Owners see all (draft/live/archived)
-- Controlled by RLS policy, not WHERE clause
```

---

## Recent Schema Changes (Timeline)

| Date | Migration | Change |
|------|-----------|--------|
| 2026-05-08 | AI Business Context | Added get_ai_business_context(), get_ai_menu_context() RPCs |
| 2026-05-07 | Menu Items | Added category_text, description, calories columns |
| 2026-05-05 | Events Platform | events, event_orders, event_checkins tables + triggers |
| 2026-05-05 | Event Promos | event_promo_codes table + increment_promo_used_count() |
| 2026-04-28 | Orders Audit | Added orders.updated_at column |
| 2026-04-25 | Owner Status | Added orders.owner_status, improved advance_order_status() |
| 2026-04-17 | Menu Seed | Menu items initial data |
| 2026-03-16 | KDS System | staff, staff_shifts, ledger_entries, transition_order_state() |
| 2026-03-14 | Shared Ordering | order_sessions table (table splitting) |
| 2026-03-03 | Event Leads | event_leads table (CRM) |
| 2026-02-14 | FSM Lockdown | Order state machine enforcement |
| 2026-02-13 | Security Notifications | Strike notifications |
| 2026-02-11 | RLS Foundation | Enable RLS on core tables |

---

## Production Checklist

- [ ] All queries filter by `business_id`
- [ ] RLS tested with 2+ tenants
- [ ] Integer math verified (no floats)
- [ ] Webhook HMAC signatures working
- [ ] Advisory locks prevent race conditions
- [ ] Idempotency guards in place
- [ ] Backups for transaction_ledger
- [ ] Monitoring for slow queries
- [ ] Rate limiting on webhooks
- [ ] Secret rotation plan (MP tokens)

---

**END OF LIVE DATABASE SNAPSHOT**  
*Generated from 8 complete SQL extracts (2026-05-08)*  
*Next snapshot: After next major migration*
