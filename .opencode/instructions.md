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
**Status:** Completed - Staff Gateway and Team Management deployed

### Completed Features:
1. **Staff Gateway (Smart Login)**
   - `StaffContext` - Manages staff_id, shift_id, role
   - Modified OwnerLogin to support dual mode (Owner/Staff)
   - Flow: Check auth.users (owner) → Check staff table → Auto clock_in → Redirect to StaffDashboard
   - Respects TenantContext language (English/Spanish)
   - Simple hash for PIN storage (not Supabase Auth)

2. **Team Management**
   - Team Management section at bottom of Owner Summary tab
   - Create staff: Username, Email, PIN (4 digits), Role
   - Roles: admin, manager, cook, cashier, runner
   - Delete staff (sets status to inactive)
   - Staff table with business_id isolation

3. **Previous Features**
   - Financial Engine (table_ledgers, wallets, split_payments)
   - Session Link System (order_sessions, SessionContext)
   - KDS State Machine (transition_order_state, clock_in, clock_out)

---

*This file is the single source of truth for all development decisions.*