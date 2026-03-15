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
**Status:** Completed - Phase 3 Hardening & Weaponization Complete

### Completed Features:
1. **Security Patch (Phase 3)**
   - business_id added to all tables: wallets, split_payments, staff, etc.
   - RLS policies enforce tenant isolation on all tables
   - Every row scoped to business_id

2. **StaffKDS Kitchen Display**
   - Kanban: PAID → COOKING → READY columns
   - Real-time updates every 5 seconds
   - Uses transition_order_state RPC for atomic changes
   - Route: /:tenantSlug/staff/kds

3. **Victory-to-Story Sharing**
   - Share Victory button in Arcade (🏆)
   - Canvas API generates image with FoodSpot logo, score, venue name
   - Web Share API or download as PNG

4. **Previous Features**
   - Staff Clock-Out, Prep-Agent AI, Vibe Boost
   - Staff Gateway, Team Management
   - Financial Engine, Session Link System, KDS State Machine

---

*This file is the single source of truth for all development decisions.*