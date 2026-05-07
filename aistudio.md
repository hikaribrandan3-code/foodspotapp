# AI Studio Integration Protocol

**When merging AI Studio modules into FoodSpot, follow this checklist.**

Learned from the Tailwind CSS cascade failure during Events module launch. Never again.

---

## Integration Checklist (Before Merging)

### 1. Tailwind CSS
- [ ] `src/index.css` has:
  ```css
  @tailwind base;
  @tailwind components;
  @tailwind utilities;
  ```
- [ ] No v4 syntax (`@theme`, `@variant`) in v3 project
- [ ] If module has custom visual identity, use body classes + `!important` overrides
  ```css
  body.module-name {
    --color-primary: #xxx !important;
    --canvas-bg: #xxx !important;
    font-family: "Font" !important;
  }
  ```

### 2. Global CSS Conflicts
- [ ] Screenshot module in isolation (stub App.jsx)
- [ ] Screenshot module in main app (with App.jsx + TenantContext)
- [ ] Compare: colors, fonts, spacing, shadows match mockups
- [ ] If different: add body class override block to `src/index.css`

### 3. Multi-Tenancy
- [ ] Every Supabase query filters by `business_id`
- [ ] Mock data includes `business_id` field
- [ ] useTenant() is available (context exists on `<App>`)
- [ ] Guard undefined businessId: `!businessId || e.business_id === businessId`

### 4. Navigation
- [ ] Route exists in route structure documentation
- [ ] Icon/link wired in hero nav (sidebar/bottom nav)
- [ ] Back buttons navigate correctly
- [ ] No dead-end pages

### 5. Testing
- [ ] Dev server runs without console errors
- [ ] Module renders at target viewport (mobile 375px for main app)
- [ ] All interactive elements work (clicks, inputs, filters)
- [ ] Responsive on tablet/desktop

---

## Weekly Update Process (AI Studio → FoodSpot)

1. **Design & Code in AI Studio** — No dependency on main app build
2. **Export** — Copy module folder to main app
3. **Verify** — Run integration checklist
4. **Fix CSS** — Add body class blocks if needed
5. **Test** — Screenshot, compare, merge
6. **Deploy** — `npm run build && npm run preview`, then production

**Time budget:** ~2–3 hours (not 48 hours if checklist is followed upfront).

---

## Lessons (Never Repeat)

1. **Always verify styling in isolation first.** Use `npm run dev` with stub App.jsx.
2. **Screenshot comparisons are law.** Don't trust "code looks right" — visual truth wins.
3. **CSS specificity wars:** If module can't override globals, it's a Tailwind/directive issue, not component bug.
4. **businessId is async.** Mock it in views, guard in filters.
5. **Test with real Supabase RLS early.** Mock data is fast; broken RLS surfaces late in prod.

---

## The Tailwind CSS Cascade Failure (Events Module Post-Mortem)

**Symptom:** Events module rendered with zero styling — "Craigslist 2000" (system font, no colors, no shadows).

**Root Cause:** Missing `@tailwind` directives in `src/index.css`.

### The Cascade (4 failures)

**1. Missing @tailwind directives (THE MOTHER BUG)**
```css
/* src/index.css was missing: */
@tailwind base;
@tailwind components;
@tailwind utilities;
```
Without these, Tailwind v3's JIT engine generated **zero utility classes**. Every class like `text-[10px]`, `rounded-[32px]`, `bg-emerald-50` was stripped. Page fell back to raw browser defaults.

**2. Tailwind v4 syntax in v3 project**
```css
/* WRONG: */
@theme { ... }           /* v4 only */
@variant dark (...);     /* v4 only */

/* FIXED: */
:root { ... }            /* v3-compatible custom properties */
/* removed @variant entirely */
```

**3. Global CSS overrides nuking the event module**
```css
/* src/index.css [data-theme="light"]: */
[data-theme="light"] {
  --canvas-bg: #FFFFFF !important;      /* overrides EventThemeWrapper */
  background-color: #FFFFFF !important; /* !important = unreachable */
}

:root {
  --color-primary: #8B7355;  /* brown, not emerald */
  --font-family-brand: Inter; /* not Outfit */
}
```

**The Fix:** Add `body.event-route` CSS block with higher-specificity `!important`:
```css
/* src/index.css — added at bottom */
body.event-route {
  --color-primary: #10b981 !important;
  --canvas-bg: var(--event-bg) !important;
  background-color: var(--event-bg) !important;
  font-family: "Outfit" !important;
}
```

Then in EventThemeWrapper.jsx, toggle `.event-route` on `<body>`:
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

## For Stitch + DetailedMenuItemCard Integration

Follow the Integration Checklist above. Specific points:

**Tailwind:** Menu card uses only CSS tokens (no hardcoded colors)
**Global CSS:** If colors different from mockup, add `body.menu-detailed { ... !important }` block
**Multi-Tenancy:** Menu.jsx filters items by businessId
**Navigation:** Toggle simple/detailed mode in Menu.jsx, existing add-to-cart flow
**Testing:** Screenshot at 375px, 1200px; compare to Stitch mockup

Done.
