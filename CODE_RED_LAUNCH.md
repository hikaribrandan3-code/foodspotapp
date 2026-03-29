# 🚨 CODE RED EXECUTION BOARD — FOODSPOT-OS

**Created:** March 29, 2026  
**Launch:** April 10, 2026  
**Days Remaining:** 12  
**Status:** GO WITH FIXES — 6 arterial bleeds, everything else is paper cuts

---

## STRIKE TEAM ROSTER

| AI | Callsign | Best For | Constraint |
|---|---|---|---|
| **Gemini 3.1 Pro** | Tech Beast | Rapid prototyping, Supabase RPC, realtime features, root cause debugging | Primary engine — handles 60% of volume |
| **Claude Opus 4.6** | Design Surgeon | Complex multi-file refactors, UI polish, CSS, production-grade code | Used for bundled complex tasks |
| **Kimi 2.5** | Forensic Auditor | Security audits, cross-file analysis, silo-hardening, review gating | Reviews EVERY PR before merge |
| **KimiClaw** | Guardian | Audit review, PR creation, workflow coordination, memory | Coordination layer |
| **DeepSeek Free** | Utility | Quick lookups, research, validation | Lightweight tasks only |

---

## 🔴 RED ZONE — LAUNCH BLOCKERS (Do First)

These are arterial bleeds. If any of these ship broken, vendors lose money or data.

### RED-1: SQL Migrations — Run critical_schema_fix.sql

**TASK:** Run SQL Migrations (Orders + Mercado Pago)  
**SEVERITY:** 🔴 Critical — Nothing works without this  
**OWNER:** Hikari (manual) — must run in Supabase SQL Editor  
**DEPENDS_ON:** None — START HERE  
**EFFORT:** 30 minutes  
**FILE:** `critical_schema_fix.sql` (150 lines)

**What it does:**
- Fixes broken `orders_status_check` constraint (currently only allows 'cancelled')
- Adds Mercado Pago columns (`payment_id`, `status`, `paid_at`, `payment_response`)
- Creates performance indexes on order queries
- Creates `handle_mercado_pago_webhook()` RPC function

**Audit checkpoint:** After running, verify with:
```sql
SELECT conname, pg_get_constraintdef(oid) 
FROM pg_constraint 
WHERE conrelid = 'orders'::regclass AND contype = 'c';
```

**⚠️ CAUTION:** This unblocks RED-4 (useSplitPayment) and the entire payment flow. Do this first.

---

### RED-2: Settings.jsx — Munchboy Color Revert Fix

**TASK:** Fix Munchboy color race condition  
**SEVERITY:** 🔴 Critical — Colors save then revert on refresh  
**OWNER:** Tech Beast (Gemini)  
**DEPENDS_ON:** None  
**EFFORT:** 2 hours  
**FILE:** `src/pages/owner/Settings.jsx` (Line ~356-442)  
**STATUS:** Code already uses draft-based payload (v2.1) — verify the bug still exists

**Root Cause (from audit):** Race condition between save and `refreshTenantData()` — replica lag returns stale data that overwrites local state.

**Current state after code review:** Settings.jsx has been refactored to v2.1 "VISUAL MIRROR" with a draft state pattern and `justSavedRef` guard. The `handlePlatformSave()` at line 357 now builds payload directly from draft state, which includes `munchboy_shell_color`, `munchboy_a_color`, `munchboy_b_color`.

**IMPORTANT DECISION NEEDED:** The code at line 397 still uses `Object.assign(tenant, savedData)` which is the React anti-pattern flagged in the audit. This direct mutation could still cause issues. Need to verify if the `justSavedRef` guard (line 131, 363, 433) actually prevents the stale-data overwrite.

**Fix if still broken:**
- Replace `Object.assign(tenant, savedData)` with proper context update
- Add 500ms delay before `refreshTenantData()` to dodge replica lag
- Use `savedData` as authoritative source after save, ignore next context refresh

**Audit checkpoint (Kimi):** After fix, test: Change munchboy shell color → Save → Refresh page → Verify color persists

---

### RED-3: MenuManager.jsx — System Error Investigation

**TASK:** Diagnose and fix MenuManager "System Error"  
**SEVERITY:** 🔴 Critical — Owners can't manage their menu  
**OWNER:** Tech Beast (Gemini)  
**DEPENDS_ON:** RED-1 (SQL migrations must run first for FK constraints)  
**EFFORT:** 4-6 hours  
**FILE:** `src/pages/owner/MenuManager.jsx` (1,816 lines / 104KB)  
**STATUS:** P0 #1 marked ✅ DONE in LAUNCH_PROGRESS.md — blob guard + pending upload guard + category validation implemented

**Error chain (from audit):**
- 42501 RLS violation on cloud sync
- 23503 FK violation on item/category operations
- 22P02 invalid input syntax
- Blob URL in payload (if user saves before upload completes)
- Dual-sync race: `branding.update` succeeds but `menu_items.upsert` fails silently

**NOTE:** LAUNCH_PROGRESS.md says this is DONE. Verify with live testing before moving on. If the fix holds, skip to RED-4.

**Audit checkpoint (Kimi):**
- Add a new category → Add items → Save → Refresh → Items persist?
- Upload image → Save immediately (before upload completes) → No error?
- Delete category with items → No FK violation?

---

### RED-4: useSplitPayment.js — Transaction Safety

**TASK:** Add atomic RPC operations to prevent double-charges  
**SEVERITY:** 🔴 Critical — FINANCIAL RISK (double-charges, lost payments)  
**OWNER:** Tech Beast (Gemini)  
**DEPENDS_ON:** RED-1 (SQL migrations for webhook handler)  
**EFFORT:** 4-6 hours  
**FILE:** `src/hooks/useSplitPayment.js` (306 lines)

**The 4 race conditions identified:**
1. **No transaction wrapper** — Two separate updates could fail halfway → orphaned splits
2. **Ledger update race** — `split_payments.insert` succeeds but `table_ledgers.update` fails
3. **No idempotency on webhook** — Same webhook processed twice → double payment
4. **Wallet balance check-then-deduct** — Concurrent requests could overdraw

**Required fix:**
- Create Supabase RPC: `create_split_atomic(ledger_id, splits[], amounts[])`
- Add idempotency check: `IF split.status = 'paid' THEN RETURN`
- Use `SELECT ... FOR UPDATE` on wallet balance to prevent overdraw
- Add `mp_payment_id` uniqueness constraint

**Audit checkpoint (Kimi):**
- Simulate concurrent payment: Two requests with same `mp_payment_id` → only one processes
- Verify: Split insert failure → ledger NOT updated (atomic rollback)

---

### RED-5: FoodSpotAI.jsx — Disable Image Generation

**TASK:** Add ENABLE_IMAGE_GENERATION flag, rename header  
**SEVERITY:** 🔴 Critical — Image gen is unreliable for launch  
**OWNER:** Tech Beast (Gemini) or Design Surgeon (Claude)  
**DEPENDS_ON:** None  
**EFFORT:** 1 hour (Quick Win, but P0 priority)  
**FILE:** `src/pages/owner/FoodSpotAI.jsx` (695 lines)

**What to do:**
- Add `const ENABLE_IMAGE_GENERATION = false` at line ~17
- Conditionally skip LazyImage rendering when flag is false
- Strip image-related quick prompts
- Change header from "FoodSpot AI" → "AI Assistant ✨" (line 445)
- Add subtitle: "Text & Strategy Mode"

**Also fix (while you're in the file):**
- **API key exposure:** Key is in URL query param (line 378). Move to request body or add a note for Phase 2 proxy.
- Add basic file upload validation: 5MB limit, `image/*` only (line 611-617)

**Audit checkpoint (Kimi):** Verify no image generation UI visible. Text chat still works.

---

### RED-6: SuperAdmin.jsx — DEV Bypass Removal

**TASK:** Remove or guard DEV bypass button  
**SEVERITY:** 🔴 Critical — Full admin access if misconfigured in production  
**OWNER:** Tech Beast (Gemini)  
**DEPENDS_ON:** None  
**EFFORT:** 1 hour  
**FILE:** `src/pages/admin/SuperAdmin.jsx` (Lines 448-470)

**What to do:**
- Remove the `import.meta.env.DEV` bypass button entirely
- OR add double-guard: `import.meta.env.DEV && email === 'superadmin@foodspot.app'`
- Add environment variable `VITE_ENABLE_DEV_BYPASS=false` (production default)

**Audit checkpoint (Kimi):** Build production bundle → verify no DEV bypass accessible

---

## 🟡 PARALLEL SPRINTS (Run Concurrent)

These can run simultaneously. No dependencies between tracks.

### TRACK A: Security Hardening (Kimi audits, Tech Beast implements)

| Task | File | Effort | Notes |
|---|---|---|---|
| A1: Enable Supabase email verification | Supabase Dashboard | 30 min | Toggle in Auth settings — Hikari must do |
| A2: Password strength (8-char + complexity) | TrialSignup.jsx | 1 hour | Add regex: `/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/` |
| A3: Tenant isolation check on login | OwnerLogin.jsx | 2 hours | Verify `user_id` → `branding.user_id` match before redirect |
| A4: Slug collision handling | TrialSignup.jsx | 1 hour | Query branding table for slug, append -2, -3 etc. |

**Kimi audit after each:** Red Team silo test — can user access another tenant's data?

### TRACK B: UX Polish (Design Surgeon / Claude)

| Task | File | Effort | Notes |
|---|---|---|---|
| B1: Info tab — hide dead buttons | Info.jsx | 1 hour | Conditionally render Rappi/PedidosYa only if URL configured |
| B2: Info tab — hide Admin for non-owners | Info.jsx | 30 min | Check `session?.role === 'owner'` or owner localStorage flag |
| B3: Standardize long-press timing | Home.jsx + Menu.jsx | 30 min | Both → 1.0s |
| B4: Remove dead code | Home.jsx | 15 min | Delete placeholderImages, isInDemoMode stub |

### TRACK C: Cloud Migration (Tech Beast)

| Task | File | Effort | Notes |
|---|---|---|---|
| C1: DeliveryManager → Supabase realtime | DeliveryManager.jsx | 4 hours | Mirror KDS pattern: useOrdersRealtime hook |

**NOTE:** C1 is the only substantial task here. It should follow the `useKDSSync.js` reference implementation pattern (optimistic + snapback).

---

## 🟢 QUICK WINS (Under 2 Hours Each)

Good for momentum between heavy lifts. Can be done by any agent.

| # | Task | File | Effort | Owner |
|---|---|---|---|---|
| Q1 | Add ENABLE_IMAGE_GENERATION = false flag | FoodSpotAI.jsx | 30 min | Any (part of RED-5) |
| Q2 | Remove DEV bypass button | SuperAdmin.jsx | 30 min | Any (part of RED-6) |
| Q3 | Hide Info tab dead buttons | Info.jsx | 45 min | Claude |
| Q4 | Add file upload validation (5MB, image/*) | FoodSpotAI.jsx | 30 min | Any |
| Q5 | Remove placeholderImages dead code | Home.jsx | 15 min | Any |
| Q6 | Add confirm dialog on team member delete | OwnerSummary.jsx | 30 min | Any |
| Q7 | Hide Admin button for non-owners | Info.jsx | 30 min | Claude |
| Q8 | Standardize long-press to 1.0s | Home.jsx + Menu.jsx | 30 min | Any |

---

## ⏸️ POST-LAUNCH — Phase 2 (Defer to End of April)

These look critical but can wait. Marking explicitly to avoid distraction.

| # | Task | Why It Can Wait |
|---|---|---|
| P1 | Staff PIN → server-side bcrypt | PINs are 4-digit; brute force requires physical access to staff login. Low risk for beta. |
| P2 | FoodSpotAI API key proxy | Key is rate-limited by Google. Real risk only at scale. Add Edge Function proxy when approaching 1,500/day. |
| P3 | Password reset flow | Beta vendors onboarded manually. Can reset via Supabase dashboard. |
| P4 | CSV export for Analytics | Nice-to-have. Not blocking any vendor workflow. |
| P5 | Extract useOwnerMode() hook | Code duplication, not a bug. Refactor when stable. |
| P6 | Unify status maps (order colors/labels) | Visual consistency issue. Not functional. |
| P7 | Camera blob cleanup | Memory leak is slow. Only matters for extended sessions. |
| P8 | Camera permission denied UI | Logs error; users figure it out. Polish later. |
| P9 | SuperAdmin realtime orders | SuperAdmin is internal tool. localStorage polling is fine for now. |
| P10 | Unify branding systems (SuperAdmin ↔ Owner) | Internal divergence. Owners don't see SuperAdmin. |
| P11 | Extract inline styles → CSS modules | Maintainability, not functionality. |
| P12 | TenantContext double-fetch → single fetch | Works in practice. Fragile but functional. |
| P13 | Message history unbounded (FoodSpotAI) | Token count grows, but 1000-token limit keeps responses short. |

---

## EXPLICITLY EXCLUDED FROM LAUNCH

- ❌ Image Generation in FoodSpotAI → `ENABLE_IMAGE_GENERATION = false`
- ❌ Promos → Use `PromosComingSoon.jsx`
- ❌ Rewards → Defer to post-launch
- ❌ Wall / ShareFood → Social features deferred
- ❌ PerfectPour → Maintain strict camera separation
- ❌ StaffAgenticUI → Experimental, staff can use ChatGPT
- ❌ HikariBoy Leaderboard → No localStorage in sandbox

---

## 📊 CRITICAL PATH DEPENDENCY GRAPH

```
🔴 RED-1: SQL Migrations
    (Hikari — 30 min)
            ↓
    ┌───────┴───────┐
    ↓               ↓
🔴 RED-3: MenuManager Verify    🔴 RED-4: useSplitPayment
    (Tech Beast — 4-6h)           (Tech Beast — 4-6h)
            ↓                       ↓
            └───────┬───────────────┘
                    ↓
            🔴 RED-2: Settings Color Fix
                (Tech Beast — 2h)
                    ↓
            🔴 RED-5: AI Image Flag
                (Any — 1h)
                    ↓
            🔴 RED-6: DEV Bypass
                (Any — 1h)
                    ↓
            🧪 QA Smoke Tests
                (All agents)
                    ↓
                🚀 DEPLOY
                April 10

🟡 Track A: Security     🟡 Track B: UX Polish     🟡 Track C: Cloud Migration
```

---

## 📅 DAILY SCHEDULE

### Week 1: March 29 – April 4 (RED ZONE)

| Day | Date | Tasks | Owner |
|---|---|---|---|
| Sat | Mar 29 | **START TODAY:** RED-1 (SQL), RED-5 (AI flag), RED-6 (DEV bypass) | Hikari, Tech Beast |
| Sun | Mar 30 | RED-2 (Settings color fix) + Q3-Q7 (Quick Wins) | Tech Beast, Claude |
| Mon | Mar 31 | RED-3 (MenuManager verify/fix) | Tech Beast |
| Tue | Apr 1 | RED-4 (useSplitPayment atomic RPC) | Tech Beast |
| Wed | Apr 2 | RED-4 continued + Track A (Security) | Tech Beast, Kimi |
| Thu | Apr 3 | Track B (UX Polish) + Track C (DeliveryManager) | Claude, Tech Beast |
| Fri | Apr 4 | Track C continued + Kimi full audit review | Tech Beast, Kimi |

### Week 2: April 5 – April 10 (QA + SHIP)

| Day | Date | Tasks | Owner |
|---|---|---|---|
| Sat | Apr 5 | Full smoke test: all customer flows | All agents |
| Sun | Apr 6 | Full smoke test: all owner flows | All agents |
| Mon | Apr 7 | Bug fixes from smoke tests | Tech Beast |
| Tue | Apr 8 | Final security audit (Kimi Red Team) | Kimi |
| Wed | Apr 9 | Production deploy to Vercel | Hikari |
| Thu | Apr 10 | 🚀 SILENT BETA LAUNCH — Onboard 3-5 vendors | Hikari |

---

## 🎯 START TODAY (March 29)

**IMPORTANT:** These 3 tasks have zero dependencies and can start RIGHT NOW:

### 1. 🏥 Hikari: Run SQL Migrations (RED-1)
- Open Supabase SQL Editor
- Paste contents of `critical_schema_fix.sql`
- Run → verify output
- **Time:** 30 minutes

### 2. ⚡ Tech Beast: Disable Image Gen (RED-5)
- Add `ENABLE_IMAGE_GENERATION = false` to FoodSpotAI.jsx
- Conditionally hide LazyImage component
- Rename header to "AI Assistant ✨"
- Add file upload validation (5MB, image/*)
- **Time:** 1 hour

### 3. 🔒 Tech Beast: Remove DEV Bypass (RED-6)
- Remove or double-guard the `import.meta.env.DEV` bypass in SuperAdmin.jsx
- **Time:** 30 minutes

After these 3, RED-1 unblocks RED-3 and RED-4 — the two heaviest tasks.

---

## 🧠 HUMAN DECISIONS NEEDED

| Decision | Options | Recommendation |
|---|---|---|
| Settings color bug: still exists? | Verify on live app first vs. pre-emptive fix | **Verify first** — code was refactored to v2.1 draft pattern |
| MenuManager: really fixed? | Trust LAUNCH_PROGRESS.md ✅ vs. retest | **Retest** — audit flagged multiple failure points |
| useSplitPayment: ship without fix? | Fix now vs. disable split payment for beta | **Fix now** — financial risk is unacceptable |
| DeliveryManager: cloud migrate now? | Migrate vs. keep localStorage for beta | **Keep localStorage for beta** — it works, just not ideal |
| Email verification: enable now? | Enable vs. wait | **Wait** — beta vendors are manually onboarded |

---

## 📋 WHAT YOU TELL VENDORS

> "FoodSpot is in beta. We're waiving fees for the first month in exchange for feedback. Expect weekly updates as we polish."

**Supported for beta:**
- ✅ Menu management + ordering
- ✅ KDS (Kitchen Display)
- ✅ Mercado Pago payments
- ✅ Staff management
- ✅ Analytics dashboard
- ✅ AI text assistant
- ✅ HikariBoy arcade

**"Coming Soon" for beta:**
- 🔜 Image generation (AI flyers)
- 🔜 Promos & rewards
- 🔜 Social features (Wall, ShareFood)
- 🔜 Leaderboards

---

*Generated March 29, 2026 — FoodSpot-OS Code Red Execution Board*

*Copy this into your project management tool and start assigning.*
