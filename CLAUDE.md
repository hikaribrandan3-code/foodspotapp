# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev        # Start dev server at http://localhost:5173
npm run build      # Build both Vite entries (main app + staff-ops)
npm run test       # Run vitest
npm run preview    # Preview production build
```

Run a single test file:
```bash
npx vitest run src/utils/paymentStatus.test.js
```

Deploy an Edge Function:
```bash
supabase functions deploy <function-name>
supabase secrets set KEY=value
```

## Architecture

**Stack:** React 18 + Vite, Supabase (PostgreSQL, Auth, Realtime, Edge Functions), Mercado Pago payments, Tailwind CSS.

### Two Vite Entries

The build produces two separate apps from one repo:

| Entry | File | Path |
|-------|------|------|
| Main customer/owner/admin app | `index.html` | All `/:tenantSlug/*` routes |
| Staff ops PWA (TypeScript) | `staff-ops.html` | `src/staff-ops/` |

The `@` import alias in Vite resolves to `src/staff-ops/` (not the project root).

### Multi-Tenant Model

Every restaurant is a **tenant** identified by a URL slug (`:tenantSlug`). `TenantContext` (`src/contexts/TenantContext.jsx`) resolves the slug on mount, fetches branding/config from Supabase, and provides `tenantData` + `businessId` globally.

- **Every Supabase query must filter by `business_id`** — no exceptions.
- Guest sessions are scoped per tenant via localStorage keys like `fs_guest_token_<slug>`.

### Route Structure

```
/                          → TrialSignup (public landing)
/:tenantSlug               → Home (customer)
/:tenantSlug/menu          → Menu
/:tenantSlug/order         → Checkout
/:tenantSlug/status        → OrderStatus (live tracking)
/:tenantSlug/receipt       → Receipt (post-payment, camera trigger point)
/:tenantSlug/camera        → Camera suite (UGC)
/:tenantSlug/staff/...     → StaffOpsRedirect → staff-ops.html
/:tenantSlug/owner/...     → Owner dashboard (ProtectedRoute, role=owner)
/admin                     → SuperAdmin (lazy-loaded)
```

### Config System

App appearance is driven by `app_config` JSONB in Supabase. `normalizeConfig()` in `src/config/appConfig.v2.js` is the canonical shape. On startup, `App.jsx` instant-boots from `TenantContext` then hydrates from cloud. Live updates arrive via `frontendSync` CustomEvent (dispatched from Settings.jsx or SuperAdmin.jsx).

CSS design tokens (`--color-primary`, `--canvas-bg`, `--font-family-brand`, etc.) are injected on `<html>` by `App.jsx` effects — do not use hardcoded colors in components.

### Payments (Mercado Pago)

Payment flow lives in Supabase Edge Functions:
- `create-preference` / `create-split-preference` — create MP checkout
- `mp-webhook` / `mp-split-webhook` — receive MP payment notifications (HMAC-verified, idempotent)

All currency is **integer cents (ARS minor units) — never floats**.

### Order State Machine

Order status transitions must go through the `transition_order_state` Supabase RPC — never update `orders.status` directly. Valid states: `pending` → `paid` → `released_to_kitchen` → `ready` → `dispatched` → `delivered`.

### Camera Suite (CamTech v2.2)

Located at `src/components/Camera/`. The pipeline is:
`CameraLayer` (capture) → `EditorLayer` (annotate/draw/stickers) → `DualPostScreen` (save/share)

**Do not modify `CameraLayer.jsx` or the core capture logic.** The UGC activation trigger (`CameraTrigger`, `CameraActivationBanner`, `useCameraActivation`) wraps this pipeline from the outside — Receipt and OrderStatus pages render it post-delivery.

### Staff-Ops Sub-App

`src/staff-ops/` is a self-contained TypeScript app with its own `main.tsx`, contexts, hooks, and shadcn/ui components. It connects to the same Supabase project but manages its own auth state via `BusinessContext`. It receives `slug` and `bid` query params from the main app redirect.

## Critical Rules

1. **INTEGER MATH ONLY** — all prices stored/computed as integers (minor units). No `parseFloat` on currency.
2. **TENANT ISOLATION** — every table has `business_id`. Every query filters by it. Every new table needs RLS policies scoped to `business_id`.
3. **ATOMIC KDS** — call `transition_order_state` RPC for all order status changes.
4. **CAMERA LOCK** — do not modify `CameraLayer.jsx` or scanning internals.
5. **LOCALE-AWARE** — use `useLanguage()` / the translations system. No hardcoded Spanish or English strings in components.
6. **OPTIMISTIC UI** — assume network can drop. Write offline-tolerant code; use `offlineQueue.ts` in staff-ops for mutation queueing.
