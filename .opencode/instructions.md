# FoodSpot Mobile - Agent Permanent Memory

---

## 1. The Vision & Goal

**App Name:** FoodSpot Mobile  
**Vision:** An autonomous SaaS OS for food commerce. We handle high-velocity festivals and permanent dine-in/cafés.  
**2026 Goal:** To become the primary alternative to Square/Toast by providing a 'Walk-Away Closeout' AI experience for owners.

---

## 2. The Software Stack

- **Frontend:** React (Vite), PWA-enabled (Offline-First)
- **Backend:** Supabase (PostgreSQL, Auth, Edge Functions, Real-time)
- **Payments:** Hybrid-Ledger (Mercado Pago, GrubCard/Wallets, Cash)

---

## 3. The Immutable Laws

- **THE CAMERA LOCK:** Do not modify Camera.jsx or core scanning logic.
- **INTEGER MATH ONLY:** All currency is stored as integers (minor units/cents). NO FLOATS.
- **TENANT ISOLATION:** Every table MUST have business_id and strict RLS policies.
- **LOCALE-AWARE:** Inherit the Owner's language/currency settings. Do not hardcode Spanish or English.
- **ATOMIC KDS:** Order status changes must call the transition_order_state RPC function.

---

## 4. Cautions & Considerations

- **Network Fragility:** Always write code assuming the 5G might drop (Optimistic UI).
- **Staff Privacy:** Never leak owner-level margins or private notes to staff-role views.

---

## 5. Operational Habit

**The Briefing:** At the end of every task, update the 'Last Task Status' section at the bottom of this file. This ensures context persists across restarts.

---

## Last Task Status

**Date:** March 16, 2026  
**Status:** Completed - Financial Engine and KDS State Machine deployed

### Completed Features:
1. **Financial Engine (SQL + Hooks)**
   - `table_ledgers` - Track total_due, total_paid, status
   - `wallets` - GrubCard balances
   - `split_payments` - Individual split payments
   - `wallet_transactions` - Audit trail
   - `useSplitPayment()` - Bill splitting and MP preferences
   - `useGrubCard()` - Card scanning and instant deduction
   - Edge Functions: `create-split-preference`, `mp-split-webhook`

2. **Session Link System**
   - `order_sessions` - Shared order sessions
   - `SessionContext` - Session state management
   - `Session.jsx` - Create/join sessions with QR codes

3. **KDS State Machine**
   - `businesses`, `staff`, `staff_shifts`, `ledger_entries` tables
   - `transition_order_state()` - Atomic state machine with advisory locks
   - `clock_in()`, `clock_out()` - Staff shift management
   - Status flow: PENDING → PAID → COOKING → READY → DELIVERED

---

*This file is the single source of truth for all development decisions.*