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

---

# PART 1: MODULE INTEGRATION GUIDE

**Use this checklist every time you integrate an AI Studio module into FoodSpot.**

## Context
FoodSpot is a React 18 + Vite + Supabase multi-tenant restaurant app.
- Main app: JSX components using React Router
- Contexts available: `TenantContext`, `LanguageContext`
- CSS tokens: `--color-primary`, `--text-primary`, `--border-color`, etc.
- Translations: `src/lib/translations.js` (en, es, pt)
- Build: `index.html` (main) + `staff-ops.html` (isolated PWA)

## Module to Integrate
Before starting, document:
- **Name:** [MODULE_NAME]
- **Location:** [PATH_TO_MODULE]
- **Type:** Standalone app / Component / TypeScript / JSX
- **Destination:** `/src/pages/customer/...` or `/src/components/...`

## Integration Tasks (IN ORDER)

### 1. Convert TypeScript → JSX
```bash
# Rename all .tsx files to .jsx
for f in **/*.tsx; do mv "$f" "${f%.tsx}.jsx"; done

# Search for remaining type hints
grep -r ": " --include="*.jsx" .
```
Remove:
- Type annotations (`: Type`)
- `interface` and `type` definitions
- Generic angle brackets `<T>`

### 2. Replace Contexts
- **Replace custom BusinessContext** with `useTenant()` from `/src/contexts/TenantContext.jsx`
- **Replace custom LanguageContext** with `useLanguage()` from `/src/contexts/LanguageContext.jsx`
- **Replace custom ThemeContext** with CSS tokens (`var(--color-primary)`, etc.)
- Update all import paths to use new context locations

### 3. Remove Routing
- Delete any `<BrowserRouter>`, `<Routes>`, `<Route>` components
- Replace `navigate()` calls with `useNavigate()` + `useParams()` from react-router-dom
- If module uses state-based views (useState), keep it — just update back button to use `onBack` prop instead

### 4. Replace Hardcoded Colors
```bash
# Find all hardcoded colors
grep -r "#[0-9A-Fa-f]" --include="*.jsx" .
```
Replace with CSS tokens:
- `#10B981` → `var(--color-primary)`
- `#111827` → `var(--text-primary)`
- `#E5E7EB` → `var(--border-color)`
- `#64748B` → `var(--text-secondary)`
- See `/src/App.jsx` for complete token list

### 5. Merge Translations
```bash
# Extract all t() calls
grep -ro "t('[^']*')" . | sort -u
```
Add missing keys to `/src/lib/translations.js` with en/es/pt values.
Delete any module-specific translation files (`eventTranslations.ts`, etc.).
Verify no `t()` call returns undefined.

### 6. Wire to Parent Component
Create parent page at `[DESTINATION]`:
```jsx
import { useParams, useNavigate } from 'react-router-dom';
import { useTenant } from '/src/contexts/TenantContext';
import { useLanguage } from '/src/contexts/LanguageContext';
import ModuleView from './module/views/ModuleView';

export default function ModulePage() {
  const { tenantSlug } = useParams();
  const { businessId } = useTenant();
  const { language } = useLanguage();
  const navigate = useNavigate();

  return (
    <ModuleView 
      businessId={businessId} 
      tenantSlug={tenantSlug}
      lang={language}
      onBack={() => navigate(`/${tenantSlug}`)}
    />
  );
}
```

### 7. Handle Payment (if applicable)
If module has payment checkout:
- Replace mock payment with real Mercado Pago call
- Use existing edge function pattern: `supabase.functions.invoke('create-preference-[module]')`
- Handle redirect: detect `?payment=success&order_id=XXX` in URL params
- Show confirmation ticket (see `/src/pages/customer/Receipt.jsx` for pattern)

### 8. Multi-Tenancy Check
```bash
# Verify ALL Supabase queries filter by businessId
grep -r "from('" --include="*.jsx" . | grep -v ".eq('business_id'"
```
- Every query must have `.eq('business_id', businessId)`
- No hardcoded tenant IDs
- Test with multiple business accounts to ensure data isolation

### 9. Quality Assurance Checklist
- [ ] No `.tsx` files remain
- [ ] No TypeScript annotations remain (search: `: Type`, `interface`, `<T>`)
- [ ] All old context imports gone (search: `BusinessContext`, `eventTranslations`, `useTheme`)
- [ ] All hardcoded colors use CSS tokens
- [ ] All `t()` calls work (no `undefined` in console)
- [ ] Back button works, navigates to correct parent route
- [ ] No console errors or warnings
- [ ] Responsive design intact (test on mobile viewport 375px)
- [ ] Tested payment flow end-to-end if applicable

## Output Format
When done, document in PR/commit:
```
1. Summary: "Integrated [MODULE] as embedded JSX component at [DESTINATION]"
2. Changes:
   - [FILE]: Converted .tsx → .jsx, replaced BusinessContext → useTenant
   - [FILE]: Removed <Router>, wired useNavigate
   - ... (one line per file)
3. Testing Notes:
   - Verified all t() keys exist in translations.js
   - Tested back button navigation to /${tenantSlug}
   - No console errors
4. Files Modified: [LIST]
5. Files Deleted: [LIST]
6. Files Added: [LIST]
```

## References
- App contexts: `/src/contexts/`
- CSS tokens: `/src/App.jsx` (search for `--color-primary`)
- Translations: `/src/lib/translations.js`
- React Router pattern: `/src/App.jsx` routes
- Supabase RLS pattern: `/src/pages/owner/MenuManager.jsx`

---

# PART 2: AI Studio Module Integration (Post-48hr Meltdown Recovery)

**Added after the Craigslist UI incident.** This section is permanently here so we never debug missing Tailwind directives again.

## AI Studio Modules

Built via AI Studio → GitHub → Production in <48hrs:
- **Inventory** — Stock management system
- **Financial Tracker** — Revenue analytics & reporting
- **Backend Events** — Event creation, management, webhooks
- **Frontend Events UI** — Customer booking flow + Owner admin dashboard

All modules are built to be **iteratively updated on a weekly cadence** with minimal friction.

### Events Module (Complete Stack)

**Customer Routes:**
- `/:tenantSlug/events` — EventsView (discovery → detail → checkout → ticket flow)
- `/:tenantSlug/events/:eventId` — Event details with tier selection
- Auto-redirects to `/events` from empty OrderStatus + Receipt pages

**Owner Routes:**
- `/:tenantSlug/owner/events` — OwnerEventsView (list, create, detail, analytics)
- Sub-views: CheckinView (QR scanning), PromosView (discount codes), AttendeeListView

**Data Flow:**
```
Mock events (EventsView) → Supabase.events table (RLS by business_id)
                        → Tiers: [General, VIP, VIP Tables, etc.]
                        → Pricing: integer cents (ARS minor units)
                        → Check-ins: Realtime via QR code scan
                        → Promos: Percent or fixed-dollar discounts
```

---

### THE TAILWIND CSS CASCADE FAILURE (48hr post-launch blocker)

**Symptom:** Events module rendered with zero styling — looked like "Craigslist 2000" (system font, no colors, no rounded corners, no shadows).

**Root Cause:** Missing `@tailwind` directives in `src/index.css`. The staff-ops build had them; the main app didn't.

#### The Cascade (3 interconnected failures):

**1. Missing @tailwind directives** (THE MOTHER BUG)
```css
/* src/index.css was missing: */
@tailwind base;
@tailwind components;
@tailwind utilities;
```
Without these, Tailwind v3's JIT engine generated **zero utility classes** for the main app. Every class like `text-[10px]`, `rounded-[32px]`, `bg-emerald-50`, `backdrop-blur-md` was stripped from the bundle. The page fell back to raw browser defaults.

**2. Tailwind v4 syntax in a v3 project**
```css
/* WRONG (v4 only — v3 chokes on it): */
@theme { ... }
@variant dark (...);

/* FIXED: */
:root { ... }           /* v3-compatible CSS custom properties */
/* removed @variant entirely */
```

**3. Global CSS overrides nuking the event module**
```css
/* src/index.css [data-theme="light"] block: */
[data-theme="light"] {
  --canvas-bg: #FFFFFF !important;      /* overrides EventThemeWrapper */
  background-color: #FFFFFF !important; /* !important + specificity = unreachable */
}

:root {
  --color-primary: #8B7355;  /* brown, not emerald */
  --font-family-brand: Inter; /* not Outfit */
}
```

**The Fix:** Add `body.event-route` CSS block with higher-specificity `!important` declarations:
```css
/* src/index.css — added at bottom */
body.event-route {
  --color-primary: #10b981 !important;
  --canvas-bg: var(--event-bg) !important;
  background-color: var(--event-bg) !important;
  font-family: "Outfit" !important;
}
```

Then in EventThemeWrapper.jsx, toggle `.event-route` class on `<body>`:
```jsx
useEffect(() => {
  if (isEventRoute) {
    document.body.classList.add('event-route');
    return () => document.body.classList.remove('event-route');
  }
}, [isEventRoute]);
```

**4. Events not rendering (secondary)**
```jsx
/* WRONG: */
const filteredEvents = events.filter(e => e.business_id === businessId);
/* businessId was undefined on first render */

/* FIXED: */
const filteredEvents = events.filter(e => !businessId || e.business_id === businessId);
```

---

### Integration Checklist (for future modules)

Before merging AI Studio modules into main app, verify:

- [ ] **Tailwind CSS**
  - `src/index.css` has `@tailwind base; @tailwind components; @tailwind utilities;`
  - No v4 syntax (`@theme`, `@variant`) in a v3 project
  - If module has its own visual theme, use body classes + higher-specificity `!important` to override global rules

- [ ] **Global CSS Conflicts**
  - Screenshot the module in isolation (stub App.jsx if needed)
  - Screenshot the module in the main app with App.jsx/TenantContext active
  - Compare — colors, fonts, spacing, shadows should match mockups
  - If different, add body class override block to src/index.css

- [ ] **Multi-Tenancy**
  - Every Supabase query filters by `business_id`
  - Mock data includes `business_id` field
  - useTenant() is available (context exists on <App>)
  - If businessId undefined on first render, use `!businessId || e.business_id === businessId`

- [ ] **Navigation**
  - Route exists in route structure documentation
  - Icon/link wired in hero nav (sidebar/bottom nav)
  - Back buttons navigate correctly
  - No dead-end pages

- [ ] **Testing**
  - Dev server runs without console errors
  - Module renders at target viewport (mobile 375px for main app)
  - All interactive elements work (clicks, inputs, filters)
  - Responsive on tablet/desktop

---

### Weekly Update Process (AI Studio → Main App)

1. **Design & Code in AI Studio** — No dependency on main app build
2. **Export** — Copy module folder to main app (Vite handles imports automatically)
3. **Verify** — Run integration checklist above
4. **Fix CSS** — Add body class blocks if needed
5. **Test** — Screenshot, compare, merge
6. **Deploy** — `npm run build && npm run preview`, then production

**Time budget:** ~2–3 hours from code to production (not 48 hours if you follow the CSS checklist upfront).

---

### Lessons for Future AI Studio Builds

1. **Always verify styling in isolation first.** Use `npm run dev` with a stub App.jsx that doesn't apply global CSS.
2. **Screenshot comparisons are law.** Don't trust "the code looks right" — visual truth beats code review.
3. **CSS specificity wars:** If a module can't override global rules, it's a Tailwind config or directive problem, not a component bug.
4. **businessId is async.** Mock it in discovery views, guard it in filters with `!businessId ||`.
5. **Test with real Supabase RLS early.** Mock data is fast; broken RLS rules surface late in prod.
