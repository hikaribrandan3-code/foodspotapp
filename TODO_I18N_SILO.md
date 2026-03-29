# 🌐 I18N SILO IMPLEMENTATION — TODO

**Status:** PENDING — Waiting for Hikari to return home  
**Goal:** Owner-picked language drives entire tenant experience (customer + owner/staff)

---

## The Vision

```
Owner Settings → branding.language = 'en' | 'es' | 'pt'
                      ↓
        ┌─────────────┼─────────────┐
        ↓             ↓             ↓
   Customer      Owner/Staff      Backend
   Experience    Dashboard       (already wired)
```

Each tenant = language silo. Industry standard for white-label SaaS.

---

## STEP 1: SQL Migration (Run First)

```sql
-- Add language column to branding table
ALTER TABLE branding 
ADD COLUMN IF NOT EXISTS language VARCHAR(2) DEFAULT 'es';

-- Update existing tenants
UPDATE branding SET language = 'es' WHERE language IS NULL;

-- Valid languages constraint
ALTER TABLE branding 
ADD CONSTRAINT valid_language 
CHECK (language IN ('en', 'es', 'pt'));
```

**Time:** 5 minutes  
**Owner:** Hikari (Supabase SQL Editor)

---

## STEP 2: Settings.jsx — Add Language Selector

Add dropdown in owner settings:
- 🇺🇸 English (en)
- 🇦🇷 Español (es)  
- 🇧🇷 Português (pt)

Save to `branding.language`.

**Time:** 30 minutes

---

## STEP 3: Customer-Facing Pages — Wire to Tenant Language

Files to fix:
- `Home.jsx` — "Modo Dueño", "Guardar", "Cambios sin guardar"
- `Order.jsx` — "Pedido enviado", "Tu pedido está vacío", "Confirmar Pedido"
- `Session.jsx` — "Crear sesión de pedido", "Ir al menú"
- `OrderStatus.jsx` — "Pedido #", "Invitado"

All should use `t('key')` from `useLanguage()` hooked to tenant language.

**Time:** 2-3 hours

---

## STEP 4: Verify Owner/Staff Backend

You mentioned it's "almost 100% wired" — need to verify:
- MenuManager.jsx
- Settings.jsx  
- Dashboard.jsx
- StaffDashboard.jsx

Check that `t()` is being used, not hardcoded Spanish.

**Time:** 30 minutes review

---

## NOTES

- `translations.js` already has most keys — just need to wire them
- LanguageContext exists — just needs to sync with `tenantData.language`
- This IS industry standard for white-label SaaS (Shopify, Square, Toast all do this)
- Post-launch: Add more languages (fr, de, etc.)

---

# 🎯 PRE-LAUNCH UI CLEANUP — TODO

**Status:** PENDING  
**Priority:** HIGH — These are the final polish items before beta launch

---

## 1. PRE-ORDER STATUS (Home Page Live Kitchen Status)

**What:** Show live kitchen load before customer orders  
**Why:** Creates urgency + transparency (Toast doesn't do this)  
**Where:** Home.jsx, above Featured Products

**Design:**
```
┌─────────────────────────────────────┐
│ 🔥 12 orders in queue               │
│ ⏱️ Est. wait: 18 mins               │
│ 👨‍🍳 Chef is crushing it today!      │
└─────────────────────────────────────┘
```

**Data needed:**
- Active orders count (from Supabase realtime)
- Avg prep time (calculated from recent orders)
- Custom message (owner-configurable)

**Files to touch:**
- `Home.jsx` — Add status component
- `Settings.jsx` — Add status message config
- New hook: `useKitchenLoad()` — fetches live data

**Time:** 4-6 hours

---

## 2. TRANSACTION PROCESS FLOW

**What:** Smooth checkout with clear state transitions  
**Why:** Reduces cart abandonment  
**Current gaps:** Loading states, error handling, retry logic

**States to design:**
1. **Cart Review** → "Review your order"
2. **Payment Select** → Mercado Pago / Cash / Split
3. **Processing** → Animated burger/grill loader (branded)
4. **Success** → "Order confirmed!" + next steps
5. **Error** → Clear error + retry option

**Files to touch:**
- `Order.jsx` — Polish each state
- `useSplitPayment.js` — Better error states
- New: `TransactionLoader.jsx` — Branded animation

**Time:** 3-4 hours

---

## 3. DELIVERY PROCESS TRACKING

**What:** Real-time delivery tracking for customers  
**Why:** Post-order anxiety kills experience  
**Current:** Basic status, no visual stepper

**Stepper design (4-step Uber style):**
```
📋 ──→ 👨‍🍳 ──→ 🚗 ──→ ✅
Ordered  Cooking  On Way  Delivered
```

**Files to touch:**
- `OrderStatus.jsx` — Show stepper (code exists, verify it's rendering)
- `DeliveryManager.jsx` — Driver location updates (future)
- KDS → Auto-update status when order moves

**Time:** 2-3 hours (mostly verification)

---

## 4. HOME BOTTOM CLEANUP (Featured Products → Conveyor Belt)

**What:** Replace static 2x2 grid with horizontal conveyor  
**Why:** More dynamic, saves vertical space, drives impulse  
**Current:** Static "Featured Products" grid

**New design:**
```
← [BURGER CARD] [BURGER CARD] [BURGER CARD] →
    (horizontal scroll, snap to card)
```

**Features:**
- Horizontal scroll with momentum
- Snap to card center
- Price in brand color
- "Trending now" badge on one item
- Larger images (taller aspect ratio)

**Files to touch:**
- `Home.jsx` — Replace Featured Products section
- CSS: `overflow-x: scroll`, `scroll-snap-type`

**Time:** 2-3 hours

---

## SUMMARY: LAUNCH BLOCKERS

| Item | Effort | Impact | Priority |
|---|---|---|---|
| Pre-order status | 4-6h | HIGH | P1 |
| Transaction flow | 3-4h | HIGH | P1 |
| Delivery tracking | 2-3h | MEDIUM | P2 |
| Home conveyor | 2-3h | MEDIUM | P2 |
| I18N wiring | 3-4h | HIGH | P1 |

**Total:** ~15-20 hours of focused work

---

## START HERE WHEN HOME

### Day 1 (Backend + I18N)
1. Run SQL migration for language
2. Add language selector to Settings
3. Wire LanguageContext to tenant

### Day 2 (Customer Flow Polish)
4. Build Pre-order status component
5. Polish Transaction flow loaders
6. Verify OrderStatus stepper renders

### Day 3 (Home Refresh)
7. Build Conveyor belt for Featured Products
8. Test all flows end-to-end

**Then:** Beta launch ready 🚀
