# FoodSpot Multi-Location Roadmap

---

## 🔴 IMMEDIATE FIXES (broken right now)

### Location Switcher
- [ ] Show ALL locations in sidebar toggle (current + others)
- [ ] Current location gets ✓ checkmark, highlighted, non-clickable
- [ ] Other locations are clickable to switch
- [ ] Works on both desktop sidebar and mobile bottom nav

### Menu Clone on Create
- [ ] `create_linked_location` RPC must auto-copy menu from first location
- [ ] Categories + items fully duplicated with new UUIDs
- [ ] Each location's menu is INDEPENDENT after creation — delete/edit on loc 2 does NOT affect loc 1
- [ ] `is_paid` + `trial_ends_at` copied from parent branding so new location inherits Pro tier

### Delete Location
- [ ] Trash icon on each non-primary location card in OwnerSummary
- [ ] Confirmation modal ("Type DELETE to confirm")
- [ ] Soft delete only — sets `deleted_at`, preserves order history
- [ ] Removed from `get_owner_locations()` results after deletion
- [ ] Needed for testing: delete bad test location → recreate with working menu clone

---

## 🟡 STAFF OPS / BACKEND UPDATES

### Manager Role — Missing Features
- [ ] Menu module: managers need full menu management (currently owner-only)
- [ ] CRM access: managers should see customer contacts for their location
- [ ] Events moved from Profile tab → Sidebar/nav (desktop + tablet only)
- [ ] Mobile staff stays UNTOUCHED — bottom tabs are full, no space

### Staff-Ops Sidebar (desktop/tablet only)
- [ ] Add Events link to sidebar navigation
- [ ] Add CRM link to sidebar navigation
- [ ] Profile stays for personal settings / clock-in only

---

## 🟢 MULTI-LOCATION SHARED INTELLIGENCE

### Shared CRM (full library across locations)
- [ ] Customer contacts from ALL locations appear in one unified CRM view
- [ ] Filter by location within CRM
- [ ] Owner sees combined customer list — builds full brand database
- [ ] Each location staff sees only their contacts, owner sees all

### Shared AI Context
- [ ] AI assistant gets context from ALL owner locations, not just current one
- [ ] AI learns: "location 1 sells more on weekends, location 2 has higher avg order"
- [ ] Recommendations adapt per-location based on cross-location data
- [ ] `get_ai_business_context` RPC needs to aggregate across business group

---

## 🔵 CUSTOMER-FACING: LOCATION HUB (the "door")

### Location Hub Page (`/foodspot-mobile` or `/brand-hub-slug`)
- [ ] This URL goes in their Instagram bio
- [ ] Shows brand logo (big, centered)
- [ ] Shows all locations as cards (name, address, open/closed status)
- [ ] Clicking a card goes to that location's menu (`/foodspotmobile-buenosaires`)
- [ ] If only 1 location → redirect directly to that menu (no hub needed)
- [ ] Closed location: greyed out card with CLOSED badge, still clickable to browse
- [ ] Footer: "Powered by @foodspotmobile" hyperlinked to Instagram/FoodSpot page

### LocationsHub UI (already partially built)
- [ ] Wire `get_locations_by_parent_slug()` RPC to hub page (already exists)
- [ ] Auto-redirect if only 1 location active
- [ ] Closed badge on paused locations
- [ ] Mobile-first: receipt-style card layout (already designed)
- [ ] Verify parent_slug is being set correctly on all owner's businesses

---

## 💰 MONETIZATION (separate doc)

### Pro Tier — Shared Subscription Model
- [ ] One Pro subscription covers ALL locations under the same owner
- [ ] New locations inherit Pro status automatically from parent account
- [ ] Pricing: $25.99 USD/month (or ARS equivalent for Spanish market)
- [ ] Pricing should detect owner language: en → USD, es → ARS pesos
- [ ] CORS fix on `create-subscription-preference` Edge Function (add `x-guest-token` to allowed headers)
- [ ] Audit: is `create-subscription-preference` recurring or one-time? (check `auto_recurring` in Edge Function)
- [ ] Test: set price to 1 ARS, enable Pro on account, verify all Pro features unlock
- [ ] Subscription webhook (`mp-subscription-webhook`) needs audit for recurring charge handling

### Pro Features Locked (current)
- Analytics ✅ locked
- AI ✅ locked
- Events ✅ locked (just added)
- CRM: FREE (intentional — builds trust)
- Menu: FREE
- Orders: FREE

---

## 📋 ORDERED BUILD SEQUENCE

```
1. Fix location switcher (show all, highlight current)
2. Fix menu clone on create_linked_location RPC
3. Wire delete location UI
4. Test: create → see cloned menu → delete → recreate
5. Add Events + CRM to staff-ops manager sidebar (desktop/tablet)
6. Build Location Hub page (customer door URL)
7. Shared CRM across locations
8. Shared AI context across locations
9. Fix CORS on subscription Edge Function
10. Test Pro tier at 1 ARS → verify unlock
```

---

*Last updated: 2026-06-22*
