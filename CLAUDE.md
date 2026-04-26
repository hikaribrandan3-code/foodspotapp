# CLAUDE.md — FoodSpotApp Engineering Guide

This file is the contract between you (Claude / any future contributor) and this codebase. It exists because this is a **live, multi-tenant SaaS**: every change you make ships to real restaurants taking real money. A bad deploy doesn't just break a feature — it can cost a tenant a service, lose orders, or destroy customer trust mid-shift.

Read this **in full** before touching code. The rules in §3 (Post-Launch Safety Pillars) are non-negotiable.

---

## 1. What this app is

FoodSpotApp is a multi-tenant restaurant platform. Each tenant ("venue") gets:

- **Customer view** — menu browsing, cart, checkout (MercadoPago + cash), dine-in sessions via QR
- **Staff view** — KDS (Kitchen Display System), order state transitions, cash pickup
- **Owner view** — financial dashboard, branding, settings, payment collection
- **Superadmin view** — cross-tenant administration

Tenants are isolated by **slug-based URL routing** (`/pizza-palace/...`) and **Postgres RLS** keyed on `business_id`. There is no per-tenant database — isolation is logical, enforced at the row level.

---

## 2. Tech Stack & Layout

| Layer | Stack |
|---|---|
| Frontend | Vite 5 + React 18 + TypeScript |
| UI | Radix UI (headless) + Tailwind CSS |
| State | React Context (Tenant, Cart, Session, Language, Staff) + localStorage persistence |
| Data/Auth | Supabase (Postgres + Auth + Realtime + Storage) |
| Backend logic | Supabase Edge Functions (Deno) |
| Payments | MercadoPago (OAuth per-tenant + webhook) |
| Hosting | Vercel (SPA mode, HTML `must-revalidate`) |
| i18n | Custom `translations.js` keyed by `{es, en, pt}` |
| Tests | Vitest + Jest + React Testing Library |

Key paths to know cold:

- [src/contexts/TenantContext.jsx](src/contexts/TenantContext.jsx) — slug → business_id resolution, tenant identity lock
- [src/lib/supabaseClient.js](src/lib/supabaseClient.js) — auth + RLS header injection (`x-business-id`, `x-guest-token`)
- [src/hooks/useKDSSync.js](src/hooks/useKDSSync.js) — realtime order sync with snapback protection
- [src/utils/auth.js](src/utils/auth.js) — role hierarchy (customer / staff / owner / superadmin)
- [supabase/migrations/](supabase/migrations/) — versioned schema (timestamp-prefixed)
- [supabase/functions/](supabase/functions/) — 17 edge functions (mp-webhook, mp-oauth, staff-agent, cleanup-orphans, etc.)
- [vercel.json](vercel.json) — SPA routing + cache headers

---

## 3. Post-Launch Safety Pillars (THE FOUR RULES)

Every PR must be evaluated against these four pillars. If a change cannot answer "yes" to all four, **do not merge**.

### Pillar 1 — Will this crash a tenant mid-service?

A "crash" includes: white screen, stuck spinner, infinite loop, KDS dropping orders, payment screen freezing, language flipping unexpectedly.

**Required checks:**
- [ ] Wrap every new realtime subscription in try/catch + cleanup. **Always** unsubscribe in `useEffect` return.
- [ ] Never throw uncaught from a Context provider — providers fail silently and break the entire subtree.
- [ ] Defensive read of `localStorage` (Safari private mode / quota errors throw).
- [ ] Any new render path that depends on `business_id` MUST handle the loading/null case (don't render with the wrong tenant's data while resolving).
- [ ] Edge functions: never `throw` without a structured error response — clients depend on shape, not status.
- [ ] Test on a real mobile network (throttle to Slow 3G in DevTools). KDS and checkout MUST survive packet loss.

**Past incidents informing this rule:** KDS realtime drops (commit `4da7ad4`), MP webhook silent failures (`b23dcc7`), language race conditions (LanguageContext `isLocked` ref).

### Pillar 2 — Will this erase tenant data, even temporarily?

"Temporarily" includes: orders disappearing for 5 seconds during a state transition, cart clearing on language change, KDS list flickering empty during a refresh, session resetting when the tab regains focus.

**Required checks:**
- [ ] **Never** issue `DELETE` in a migration without `WHERE` + an explicit data-preservation strategy. Prefer soft-delete (`deleted_at`) or archival tables.
- [ ] **Never** drop a column in the same migration that adds its replacement. Use a 3-step rollout: (1) add new, (2) backfill + dual-write, (3) drop old in a later release.
- [ ] **Never** rename a table or column without a view alias for the old name during transition.
- [ ] Optimistic UI updates MUST snapback to the server-confirmed state, not to an empty state. See `useKDSSync.js` 8-second snapback pattern.
- [ ] localStorage migrations: read old key, write new key, **delete old only after** confirming new write. See `fs_guest_token` → `fs_guest_token_{slug}` migration as the template.
- [ ] If you `setState([])` anywhere, justify it in a comment. Empty arrays during transitions are how orders disappear.
- [ ] Cart, session, and language state MUST survive: tab refocus, language change, network blip, MP redirect roundtrip.

### Pillar 3 — Will this reset tenant state?

"Reset" includes: clearing cart, logging out staff, dropping the dine-in session, reverting language, losing KDS column scroll position, resetting filters.

**Required checks:**
- [ ] No new code path may call `localStorage.clear()`. Ever. Remove specific keys by name.
- [ ] No `supabase.auth.signOut()` outside of explicit user-initiated logout. Token expiry → refresh, not signout.
- [ ] State that should persist across reload (cart, session, language, KDS view prefs) MUST be in localStorage with a tenant-scoped key (`fs_<thing>_{slug}` or `_{business_id}`).
- [ ] Realtime reconnect MUST NOT reset local optimistic state. See `useKDSSync` snapback timer pattern (8s tolerance window).
- [ ] Vercel `must-revalidate` on HTML is intentional — do not add aggressive caching that would re-deliver stale JS that wipes new state.

### Pillar 4 — Are we building on solid foundations?

**Required checks:**
- [ ] Reuse existing primitives. Before creating a new context, hook, or util — grep for one that already does 80% of it.
- [ ] Tenant-scoped data MUST go through `supabaseClient.js` (RLS headers auto-injected). Never construct ad-hoc Supabase clients in components.
- [ ] Roles MUST be checked via `src/utils/auth.js` helpers, not by reading `user_metadata.role` directly.
- [ ] Migrations are **append-only**. Never edit a migration that has run on prod. Write a new one.
- [ ] Idempotent migrations only — wrap in `DO $$ ... IF NOT EXISTS ... $$`. See `critical_schema_fix.sql` as template.
- [ ] No new feature without at least one test if it touches: payments, orders, KDS, auth, or RLS.
- [ ] No new `useEffect` with empty deps that fetches tenant data without a `business_id` guard.
- [ ] Don't introduce a new state library, router, or auth pattern. We have what we need.

---

## 4. Multi-Tenancy Rules (READ TWICE)

Multi-tenancy bugs are the highest-severity class — they leak one tenant's data to another. Every data access must be tenant-scoped.

- **Slug is the public identifier**, `business_id` is the internal one. URL → slug → resolve to `business_id` in `TenantContext` → all queries filtered by `business_id` (via RLS or explicit `.eq('business_id', ...)`).
- **RLS is the safety net**, not the only line of defense. Always pass `business_id` explicitly in queries too — defense in depth.
- **Never trust client-supplied `business_id`** in edge functions. Resolve it from authenticated user OR signed slug.
- **`x-business-id` header** is set by `supabaseClient.js`. Don't strip it. Don't override it per-request.
- **Guest customers** use `x-guest-token` (UUID stored in `fs_guest_token_{slug}`). One token per (guest, slug) — do not share across tenants.
- **Realtime subscriptions** MUST filter by `business_id` server-side (via the postgres_changes filter), not client-side. Filtering client-side leaks rows over the wire.
- When debugging a "wrong data" issue: check (1) URL slug, (2) localStorage `fs_business_id`, (3) header injection, (4) RLS policy. In that order.

---

## 5. Database & Migration Rules

Migrations are the single highest-risk surface. A bad migration = data loss for every tenant simultaneously.

### Hard rules

1. **No destructive migrations without explicit user sign-off.** This includes `DROP TABLE`, `DROP COLUMN`, `TRUNCATE`, `DELETE` without `WHERE`, and any `ALTER TYPE` that drops enum values.
2. **All migrations must be idempotent** — safe to run twice. Use `IF NOT EXISTS`, `IF EXISTS`, `DO $$ BEGIN ... EXCEPTION WHEN duplicate_object THEN NULL; END $$`.
3. **All migrations must be reversible** in concept, even if no `down.sql` is written. If the migration cannot be undone (e.g., dropping a unique constraint after duplicate data was inserted), call it out in the PR description.
4. **Backfill before constraint.** Add column nullable → backfill → add NOT NULL in a separate migration.
5. **Test migrations against a production-shaped dataset** in a staging Supabase project before shipping.
6. **RLS changes** require regression-testing all four roles (customer, staff, owner, superadmin) end-to-end.

### Schema change workflow

```
Step 1: Migration adds new structure (additive only)
Step 2: Application code dual-writes (old + new)
Step 3: Backfill historical data
Step 4: Application code reads from new
Step 5: Migration removes old structure (separate release, after monitoring)
```

Never compress steps 1+5 into one PR.

---

## 6. Realtime & State Sync Rules

Realtime bugs are subtle and devastating (orders vanishing, status flickering). Follow these patterns:

- **Subscribe by `business_id` filter**, never by table-wide subscription with client-side filtering.
- **Optimistic update + snapback**: apply local change immediately, set a timer (default 8s — see `useKDSSync`), if server confirms within window keep optimistic state, otherwise revert to server truth.
- **Always cleanup**: `supabase.removeChannel(channel)` in `useEffect` return. Dangling channels = memory leak + duplicate updates after remount.
- **Reconnect handling**: assume the socket will drop. On `SUBSCRIBED` event after a reconnect, do a full refetch — but **merge** with local state, don't replace.
- **Camera mode (`CamTech guard`)** — KDS ignores realtime updates while camera is open. If you add a similar modal-blocking mode, follow the same pattern; do not let background updates corrupt user-in-flight actions.

---

## 7. Payment Flow Rules

Payments are the second-highest-risk surface (after migrations). Bugs here = real money lost or double-charged.

- **MercadoPago is per-tenant OAuth** — each venue connects their own MP account. Never use a global MP token.
- **The webhook is the source of truth**, not the client redirect. Order goes to `paid` only when `mp-webhook` confirms.
- **Idempotency**: `mp-webhook` must handle duplicate notifications (MP retries). Check existing order status before mutating.
- **Offline fallback**: if MP is unreachable, the cash flow MUST work. See `ghost-transaction-test.js` for the edge cases.
- **Never log card data, MP secret tokens, or full webhook payloads** in client console or server logs.
- **The frontend `anon` key is the only Supabase key allowed in client code.** Never `service_role` in the browser. (See commit `d6f9497` — this rule is hard-won.)

---

## 8. i18n Rules

- All user-facing strings go in [src/translations.js](src/translations.js) (or wherever the canonical translations file is). No hardcoded strings.
- Three languages required for every key: `es`, `en`, `pt`. Missing keys must fall back to `es` (default).
- Tenant language is stored in `tenants.language` and applied via `LanguageContext`. The `isLocked` ref + 2.5s timer prevents race conditions when an owner changes language — do not remove this lock.
- Translation keys are stable contracts. **Do not rename a key without a deprecation period** (keep both for a release).

---

## 9. Auth & RLS Rules

- Roles live in `auth.users.user_metadata.role`. Never read this directly — use [src/utils/auth.js](src/utils/auth.js).
- Role hierarchy: `superadmin > owner > staff > customer (guest)`.
- Every new table requires an RLS policy. **Default deny** — explicit policies for each role.
- Edge functions: validate JWT + extract `business_id` from authenticated context, never from request body.
- `supabaseClient.js` sanitizes malformed JWTs on init. If you see auth flakiness, check that path first.

---

## 10. Testing Requirements

| Change touches... | Required tests |
|---|---|
| Payments / MP webhook | Unit + integration (offline + duplicate webhook + partial success) |
| Order state machine | FSM test covering all transitions + invalid attempts |
| KDS realtime | Subscription + snapback + reconnect tests |
| RLS policy | Cross-tenant isolation test (try to read another tenant's data, must fail) |
| Migration | Run on staging Supabase with prod-shaped data |
| Cart / Session | Persistence test (reload, language change, tab refocus) |
| Auth | Role escalation negative test |

Existing test inventory (~2,087 lines across 9 files):
- `ghost-transaction-test.js` — payment edge cases
- `fsm-cash-pickup-test.js` — owner cash collection FSM
- `useKDSSync.test.js` — realtime + snapback
- `CartContext.test.jsx` — cart operations

---

## 11. Pre-Deploy Checklist

Run through this list **before every production deploy**, not just before merging.

**Code:**
- [ ] All four Safety Pillars (§3) answered "yes"
- [ ] No `console.log` left in production paths
- [ ] No `TODO` / `FIXME` blocking the change
- [ ] `npm run build` succeeds with zero TS errors
- [ ] All tests green

**Data:**
- [ ] Any migration has been run on staging Supabase first
- [ ] Migration is idempotent and additive (or destructive change is explicitly approved)
- [ ] No localStorage key was renamed without a migration path
- [ ] No translation key was renamed without keeping the old one for a release

**Tenant impact:**
- [ ] Tested on at least 2 tenant slugs to verify no cross-contamination
- [ ] Tested as customer + staff + owner roles
- [ ] Tested on Slow 3G throttle for KDS and checkout
- [ ] Tested on Safari iOS (private mode catches localStorage errors)

**Rollback:**
- [ ] If this breaks, can we revert the deploy? (Yes if no migration; otherwise document the recovery path)
- [ ] Vercel deploy can be promoted/rolled back instantly — but DB changes cannot

---

## 12. Known Fragile Areas

These have caused incidents before. Approach with extra care:

- **Cash pickup flow** — owner button + customer refresh + staff status persistence (commit `9052a7b`). FSM in `fsm-cash-pickup-test.js`.
- **MercadoPago webhook + redirect** — silent fallback, token lookup race (commit `b23dcc7`).
- **Order status FSM + `owner_status`** — root cause issues with payment checks (commit `e3be961`).
- **KDS realtime polling** — added subscriptions for instant updates (commit `4da7ad4`); if you change polling interval or subscription filter, retest snapback.
- **Language sync race** — `LanguageContext` uses `isLocked` ref + 2.5s timer. Do not remove.
- **Guest token migration** — `fs_guest_token` → `fs_guest_token_{slug}`. Backward-compat code in client; don't delete it without confirming no live tenants on old key.
- **Frontend Supabase key** — must be `anon`, never `service_role` (commit `d6f9497`).

---

## 13. What to Avoid

- ❌ Adding a new state management library (we use Context + localStorage; it's enough)
- ❌ Adding a new auth pattern (Supabase Auth is the only path)
- ❌ Server-side rendering / Next.js migration (we are SPA on Vercel; not changing)
- ❌ Per-tenant database (isolation is RLS-based by design)
- ❌ Moving translations to a 3rd-party service (i18n stays in-repo)
- ❌ Editing existing migrations (always write a new one)
- ❌ "Quick" `localStorage.clear()` to fix a state bug (find the actual cause)
- ❌ Disabling RLS to "test something" then forgetting to re-enable (commit `2026-02-11` enabled it for a reason)
- ❌ Bumping major dependencies without a dedicated PR + smoke test
- ❌ Touching `vercel.json` cache headers without understanding why HTML is `must-revalidate`

---

## 14. When in Doubt

1. **Read this file again.**
2. Grep for prior art — this codebase has solved most problems once already.
3. Check `git log` for the file you're touching — fixes cluster around fragile areas.
4. If the change is risky and reversible: ship behind a feature flag or owner-only gate.
5. If the change is risky and irreversible (migration, data shape): stop, write a plan, get sign-off.

The cost of asking is low. The cost of breaking a tenant during dinner service is high.
