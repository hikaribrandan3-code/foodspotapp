# 🎯 LAUNCH PROGRESS TRACKER

**Last Updated:** March 24, 2026  
**Target:** Silent Beta — April 10, 2026  
**Reference:** `launchaudit.md` for full audit details

---

## P0 — LAUNCH BLOCKERS (Must Fix)

| # | Issue | File | Status | Notes |
|---|-------|------|--------|-------|
| 1 | Menu Manager "System Error" — Blob/FK/RLS errors | MenuManager.jsx | ✅ **DONE** | Blob Guard + Pending Upload Guard + Category Validation implemented |
| 2 | Munchboy Color Revert — Race condition | Settings.jsx | ⬜ **PENDING** | Line ~355 — sync localMunchboyColors before payload |
| 3 | SQL Migrations — Orders constraint + MP columns | `critical_schema_fix.sql` | ⬜ **PENDING** | Must run in Supabase SQL Editor |
| 4 | useSplitPayment Transaction Safety — Race conditions | useSplitPayment.js | ⬜ **PENDING** | Add RPC atomic operations |
| 5 | FoodSpotAI Image Gen Flag | FoodSpotAI.jsx | ⬜ **PENDING** | Add `ENABLE_IMAGE_GENERATION = false` |
| 6 | SuperAdmin DEV Bypass | SuperAdmin.jsx Lines 448-470 | ⬜ **PENDING** | Remove or harden before production |

---

## P1 — SHOULD FIX (Before Launch)

| # | Issue | File | Status | Notes |
|---|-------|------|--------|-------|
| 7 | Email Verification | TrialSignup.jsx | ⬜ **PENDING** | Enable in Supabase Auth settings |
| 8 | Password Strength | TrialSignup.jsx | ⬜ **PENDING** | 8-char minimum + complexity rules |
| 9 | Tenant Isolation Check | OwnerLogin.jsx | ⬜ **PENDING** | Verify `user_id` matches `business_id` |
| 10 | Slug Collision Handling | TrialSignup.jsx | ⬜ **PENDING** | Auto-append number if slug taken |
| 11 | Info Tab Dead Buttons | Info.jsx | ⬜ **PENDING** | Hide Rappi/PedidosYa when no link configured |
| 12 | Info Tab Admin Button | Info.jsx | ⬜ **PENDING** | Hide for non-owners |
| 13 | DeliveryManager Cloud Migration | DeliveryManager.jsx | ⬜ **PENDING** | Migrate localStorage → Supabase realtime |

---

## P2 — POST-LAUNCH POLISH

| # | Issue | File | Status | Notes |
|---|-------|------|--------|-------|
| 14 | Staff PIN Hashing | OwnerSummary.jsx/OwnerLogin.jsx | ⬜ **PENDING** | Server-side bcrypt/argon2 |
| 15 | FoodSpotAI API Key Proxy | FoodSpotAI.jsx | ⬜ **PENDING** | Route through Supabase Edge Function |
| 16 | Camera Blob Cleanup | useCamera.js | ⬜ **PENDING** | Revoke objectURLs after use |
| 17 | SuperAdmin Realtime Orders | SuperAdmin.jsx | ⬜ **PENDING** | Migrate localStorage → Supabase |
| 18 | Extract CSS Modules | Multiple | ⬜ **PENDING** | Inline styles → CSS modules |

---

## AGENT WORKFLOW

**Gemini (Chat):** Planning / Architecture advice only  
**Kimi (Me):** Analysis + Small fixes (<3% error margin) + Review  
**Claude Opus 4.6:** Complex bundled tasks (via Claude Code OR Antigravity)  
**Notebook LLM:** Marketing / YC Pitch / Narrative (weekends only)

---

## DECISION TREE

```
New fix requested
       ↓
   [Assess complexity]
       ↓
   Simple/Single-file → Kimi executes
   Complex/Multi-file   → Bundle → Opus 4.6
   Marketing/Strategy   → Notebook LLM (Sat/Sun)
```

---

## QUICK REFERENCE

**Full Audit:** `/root/.openclaw/workspace/launchaudit.md`  
**SQL Migrations:** `/root/.openclaw/workspace/critical_schema_fix.sql`  
**Daily Log:** `/root/.openclaw/workspace/memory/YYYY-MM-DD.md`

---

*When reset: Read this file first, check green checks, skip completed items.*