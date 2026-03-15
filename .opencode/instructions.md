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
**Status:** Completed - Staff Clock-Out, Tactical Prep-Agent, and Vibe Boost Marketing

### Completed Features:
1. **Staff Clock-Out**
   - End Shift button in StaffDashboard header (high-contrast red)
   - Confirmation prompt with TenantContext language
   - Auto call clock_out RPC and clear StaffContext
   - Redirect to /login after logout

2. **Tactical Prep-Agent (StaffAgenticUI.jsx)**
   - System prompt: Brief/Tactical, bullet points, <2 sentences
   - Data scope: Only current business_id orders
   - Context includes active order summary
   - Respects locale (EN/ES)

3. **Vibe Boost Marketing Engine**
   - Edge Function: vibe-boost (deployed and live)
   - Bulk update: SET balance = balance + cents for all active wallets
   - Integer math only (amounts in cents)
   - Owner UI: Neon-bordered button with confirmation modal
   - Translated notifications (EN/ES)

4. **Previous Features**
   - Staff Gateway (Smart Login), Team Management
   - Financial Engine, Session Link System, KDS State Machine

---

*This file is the single source of truth for all development decisions.*