# FoodSpot Soft Launch Bug Tracker

**Date:** 2026-05-10  
**Scope:** Cash payment flows (takeout, dine-in, delivery)  
**Target:** 100% completion before soft launch tomorrow

---

## ✅ FIXED

### 1. DeliveryTracker.jsx — Timeline Off-By-One
**Status:** Fixed & pushed  
**Commit:** 57fec48  
**Issue:** Timeline showed 5 steps including "En cocina" (prep step that's internal). Customer saw duplicate progress.  
**Fix:** 
- Removed `released_to_kitchen` from STATUS_STEPS (4 steps now: Preparando, Listo, En camino, Entregado)
- Added milestone logic to mark `dispatched` and `delivered` as completed immediately
- DeliveryTracker now matches staff actions 1:1

**Testing:** Delivery tracker shows all 4 steps green when delivered ✓

---

### 2. Receipt.jsx — Missing Realtime Updates + "Pagado ✓" Display
**Status:** Fixed & pushed  
**Commit:** e04dda4, dbea061  
**Issue:** Receipt page only fetched order once. When delivery completed, receipt still showed pending payment. "Pagado ✓" wasn't displayed for delivered cash orders.  
**Fix:**
- Added Supabase realtime subscription for order updates
- Added `isDelivered` logic to payment status check
- Shows "Pagado ✓" green checkmark when order.status === 'delivered'

**Testing:** Receipt updates in realtime when delivery marked complete, shows green "Pagado ✓" ✓

---

### 3. OrderDetailDrawer.tsx — Missing Staff Pricing Display
**Status:** Fixed & pushed  
**Commit:** 3ffca5f  
**Issue:** Staff couldn't see order total on any payment verification screen (takeout, dine-in, delivery).  
**Fix:**
- Added order total display card (lines 175-181): "Total" label + amount
- Displays for all order types before action buttons
- Shows in orange for visibility (cash orders)

**Testing:** Staff sees total on all payment verification states ✓

---

### 4. OrderDetailDrawer.tsx — MP Alias Not Showing (Dine-In Payment)
**Status:** Fixed & pushed  
**Commit:** 3ffca5f  
**Issue:** Dine-in DONE + unpaid: MP Alias card existed in code but wasn't rendering. Staff had no way to tell customer the alias to pay.  
**Fix:**
- Added conditional MP Alias display (lines 219-224)
- Shows only when `order.status === 'DONE' && order.deliveryType === 'dine_in' && !order.cashVerified`
- Displays actual alias value from order data

**Testing:** Dine-in payment screen shows MP Alias when at DONE + unpaid ✓

---

### 5. OrderDetailDrawer.tsx — Dine-In Total Visibility
**Status:** Fixed & pushed  
**Commit:** 9fb5969  
**Issue:** Total card at READY status was invisible (lime green text on white background).  
**Fix:**
- Changed background to warm yellow (#FFFBEB)
- Changed text to orange (#D97706)
- Matches "Total to collect" styling for visibility

**Testing:** Dine-in total shows in orange, clearly visible ✓

---

## 🔧 IN PROGRESS

### Bug 1: Staff Takeout — Duplicate Total Cards (PENDING_VERIFICATION)
**File:** src/staff-ops/components/OrderDetailDrawer.tsx  
**Issue:** When order is PENDING_VERIFICATION (cash pending), shows both generic "Total" card AND "Total to collect" card.  
**Expected:** Only show "Total to collect" when isCashPending=true  
**Root Cause:** Generic total card added without conditional hiding for pending state  
**Fix:** Wrap generic total card with `{!isCashPending && (...)}` to hide it when cash is pending

---

### Bug 2: Staff Delivery — Tax/Total Formatting (Decimal Display)
**File:** src/staff-ops/components/OrderDetailDrawer.tsx, KitchenQueue.tsx  
**Issue:** Order total displays with floating-point noise (e.g., $11.000000 instead of $11.00)  
**Expected:** Currency formatted to 2 decimals  
**Root Cause:** order.total from PostgreSQL numeric carries precision. No consistent formatter in staff-ops.  
**Fix:** 
- Create `formatPrice(n: number | undefined): string` helper in src/staff-ops/lib/utils.ts
- Apply to OrderDetailDrawer total displays
- Apply to KitchenQueue.tsx line 158 (${order.total})

---

### Bug 3: Owner Dine-In — MP Alias Not Fetching (DONE + Unpaid)
**File:** src/staff-ops/components/OrderDetailDrawer.tsx  
**Issue:** Dine-in DONE + unpaid shows "💵 Cash" and "📲 Alias" buttons, but actual alias string not visible. Comes from business config, not order object.  
**Expected:** Display MP Alias before payment buttons so staff can tell customer what to pay.  
**Root Cause:** OrderDetailDrawer doesn't have access to business app_config where alias lives.  
**Fix (Option A - MVP):**
- useEffect in OrderDetailDrawer to fetch business row from Supabase
- Extract app_config.payments.mercadoPagoAlias
- Display in styled card above payment buttons
- Wrap in useMemo to prevent refetch on re-render

---

## 📋 Test Coverage

| Route | Staff | Owner | Status |
|-------|-------|-------|--------|
| Takeout (cash) | ✅ 10/10 | ✅ 10/10 | Ready |
| Dine-In (cash) | 🔧 Bugs 1,3 | ✅ 10/10 | Fixing |
| Delivery (cash) | ✅ 10/10 (Bug 2 minor) | ✅ 10/10 | Ready |

---

## 🚀 Soft Launch Readiness

**Target:** All 3 in-progress bugs fixed before tomorrow  
**Scale:** 15-20 soft businesses (no performance impact from fixes)  
**Blockers:** None after Bug 1-3 complete  
**Go/No-Go:** Pending Bug 1-3 completion
