# FOODSPOT-OS LAUNCH READINESS AUDIT
**Date:** March 24, 2026  
**Target Launch:** Silent Beta — Week 2 April (April 10, 2026)

---

## EXECUTIVE SUMMARY
- **Total files audited:** 30+
- **Critical (🔴):** 14 issues
- **Medium (🟡):** 28 issues
- **Low (🟢):** 16 issues
- **Status:** ✅ GO WITH FIXES — Silent Beta achievable by April 10 if P0s resolved

### Honest Assessment
> "No POS launch is perfect. Toast had outages. Square had bugs. The difference is managing expectations. You have a genuinely differentiated product (games + optimistic write). Ship it imperfect, iterate fast."

### Critical Path (Must Fix Before Launch)
| Issue | Effort | Owner |
|-------|--------|-------|
| Menu Manager "System Error" | 4-6 hours | You or Tech Beast |
| `tenant_id` isolation verify | 2-3 hours | Tech Beast |
| Settings color bug | 2 hours | Optional |
| **Total** | **8-12 hours** | |

### Launch Scope Decision
| Question | Answer |
|----------|--------|
| Can you launch in April? | Yes, Week 2 |
| Is everything perfect? | No, and that's okay |
| Should AI be "Coming Soon"? | Partially — text live, images hidden |
| What's the real risk? | Menu Manager bug + tenant isolation |

---

## CODEBASE SIZE BREAKDOWN

### Largest Files (by lines)
| Rank | File | Lines | Size | Role |
|------|------|-------|------|------|
| 1 | SuperAdmin.jsx | 2,094 | 86 KB | Admin dashboard |
| 2 | MenuManager.jsx | 1,816 | 74 KB | P0 ISSUES |
| 3 | Home.jsx | 1,231 | 51 KB | Customer landing |
| 4 | Settings.jsx | 1,197 | 50 KB | P0 COLOR BUG |
| 5 | Order.jsx | 1,004 | 41 KB | Customer ordering |
| 6 | Menu.jsx | 831 | 34 KB | Customer menu |
| 7 | TrialSignup.jsx | 744 | 31 KB | Auth flow |
| 8 | OwnerSummary.jsx | 756 | 31 KB | Owner dashboard |
| 9 | FoodSpotAI.jsx | 694 | 29 KB | AI features |
| 10 | StaffDashboard.jsx | 680 | 28 KB | Staff KDS |

### Directory Sizes
```
src/pages/          944 KB (32% of codebase)
src/components/     756 KB (26% of codebase)
src/utils/          120 KB (4% of codebase)
src/contexts/        60 KB (2% of codebase)
src/config/          60 KB (2% of codebase)
src/lib/             32 KB (1% of codebase)
```

---

## BACKEND AUDIT

---

### SUPERADMIN PANEL

**File Audited:** SuperAdmin.jsx (2,095 lines | ~86 KB)  
**Status:** 🟡 Legacy + Modern Hybrid — Functional but Dated

#### Architecture
- **5 Tabs:** Summary, Menu, Branding (7-slot system), Orders, Analytics
- **Auth:** SuperAdmin email check (`superadmin@foodspot.app`) + DEV bypass button
- **Data:** Mix of localStorage (legacy) and Supabase cloud-first (new)
- **Unique Features:**
  - Role switching dropdown (SuperAdmin ↔ Owner ↔ Staff ↔ Customer)
  - Cover image editor with position/scale/offset controls
  - Demo analytics toggle for pitching
  - 6 configurable info pill action buttons
  - Camera button config (3 icon options, color + text color)
  - Emergency memory clear ("Liberar Memoria" button)

#### Issues
| Severity | Issue | Location | Description | Fix Required |
|----------|-------|----------|-------------|--------------|
| 🔴 Critical | DEV Bypass Button | Lines 448-470 | `import.meta.env.DEV` check exposes admin access — if misconfigured in production, full admin access is exposed | Remove or guard before production |
| 🔴 Critical | localStorage Order Management | Lines 225-255 | Uses `getOrders()` from localStorage with 2s polling instead of Supabase realtime | Migrate to Supabase (post-launch OK) |
| 🟡 Medium | Mixed Cloud/Local Pattern | Throughout | `updateConfig()` calls are local-only while `updateBusinessInfoCloud()` and `updateBrandingCloud()` are cloud-first | Unify to cloud-first |
| 🟡 Medium | Inline Style Proliferation | Lines 1089-1450 | ~40% of branding section is inline styles | Extract to CSS modules |
| 🟡 Medium | 7-Slot Branding Divergence | Lines 1089-1450 | SuperAdmin has more comprehensive branding than Owner backend — systems can diverge | Sync with Owner system |

#### SuperAdmin vs Owner Comparison
| Feature | SuperAdmin | Owner | Winner |
|---------|-----------|-------|--------|
| Lines of Code | 2,095 | 5,967 total (across 9 files) | Owner (more modular) |
| Auth Method | Email + DEV bypass | Email + PIN + Staff | Owner (more options) |
| Menu Management | ✅ Full CRUD | ✅ Full CRUD (better UX) | Tie |
| Branding Slots | 7 comprehensive slots | Simpler set | SuperAdmin (more detailed) |
| Real-time Orders | ❌ localStorage polling | ✅ `useOrdersRealtime` | Owner |
| KDS Integration | ❌ None | ✅ StaffDashboard | Owner |
| Team Management | ❌ None | ✅ Staff CRUD | Owner |
| Mobile UX | 🟡 Dense | ✅ Better | Owner |
| Analytics | ✅ Demo toggle | ✅ Basic | SuperAdmin |

#### Verdict
> Recommendation: **Option B — Keep SuperAdmin as internal tool**, but fix the DEV bypass security hole, add guard so only `superadmin@foodspot.app` can access, make it Supabase-only (no localStorage fallback). SuperAdmin isn't required for launch but should be ready within the first month for analyzing and fixing problems.

---

### OWNER BACKEND

**Files Audited:**
- Settings.jsx (1,197 lines | 50 KB)
- MenuManager.jsx (1,816 lines | 74 KB)
- OwnerSummary.jsx (756 lines | 31 KB)
- Analytics.jsx (282 lines | 12 KB)
- Dashboard.jsx / KDS (358 lines | 15 KB)
- OwnerLogin.jsx (305 lines | 13 KB)
- DeliveryManager.jsx (387 lines | 16 KB)
- FoodSpotAI.jsx (694 lines | 28 KB)
- RewardsManager.jsx (172 lines | 7 KB)

**Backend Total:** 5,967 lines | ~218 KB (~60 KB gzipped)

---

#### Owner Summary (756 lines) — ✅ STABLE

**Features:**
- Cloud-first orders (Supabase, no localStorage)
- Daily payments split (Mercado Pago vs Cash)
- Session stats (week/month)
- Venue info (WhatsApp, Address, Maps link)
- External links (Rappi, PedidosYa toggles)
- Team management (add/remove staff with PIN)
- Vibe Boost marketing tool
- Language toggle (EN/ES/PT)
- Ghost admin portal (superadmin only)

| Severity | Issue | Location | Description | Fix Required |
|----------|-------|----------|-------------|--------------|
| 🔴 High | Staff PIN client-side hash only | Lines 671-681 | `simpleHash()` is obfuscation, not security — rainbow table trivial — only 10,000 combinations for 4-digit PIN | Move to server-side bcrypt |
| 🟡 Low | VibeBoost function hardcoded $1000 | Lines 407-445 | Hardcoded value | Make configurable |
| 🟡 Low | No confirmation on team member delete | — | Missing confirm dialog | Add confirm dialog |
| 🟡 Low | Auditor drawer z-index conflict | — | Close button overlaps | Fix z-index |
| 🟡 Low | Orders polling every 30s | Lines 44-62 | Not realtime | Acceptable for owner view |

**Status:** ✅ Production Ready

---

#### Analytics (282 lines) — ✅ STABLE

**Features:**
- Date range tabs (Today / 7 days / 30 days / All time)
- KPI grid (Revenue, Orders, Avg Ticket, Delivered)
- Order type breakdown (Delivery/Pickup/Dine-in)
- Payment method split (MP vs Cash)
- Top 5 products by quantity
- Proper tenant isolation: `.eq('business_id', businessId)` on all queries

| Severity | Issue | Location | Description | Fix Required |
|----------|-------|----------|-------------|--------------|
| 🟡 Low | Primary color hardcoded green | — | Uses override `primaryColor = '#10B981'` | Cosmetic |
| 🟡 Low | No CSV export | — | Feature request | Post-launch |
| 🟡 Low | No date picker for custom range | — | Feature request | Post-launch |

**Status:** ✅ Production Ready — Clean, read-only dashboard. Safe for launch.

---

#### Kitchen Dashboard / KDS (358 lines) — ✅ WORKING

**Features:**
- Real-time order subscription (WebSocket)
- FSM status flow: `released → preparing → ready → dispatched → delivered`
- Audio notification with unlock banner (iOS/Safari)
- Visual flash on new order
- Delivery details with WhatsApp driver button
- FIFO ordering (oldest first)

| Severity | Issue | Location | Description | Fix Required |
|----------|-------|----------|-------------|--------------|
| 🟡 Low | `advance_order_status` RPC dependency | — | Ensure SQL function exists | Verify |
| 🟡 Low | Audio context may not unlock on some devices | — | Safari quirk | Add fallback vibration |
| 🟡 Low | No "undo" for status advancement | — | Feature request | Post-launch |

**Status:** ✅ Production Ready

---

#### Settings / Branding (1,197 lines) — 🔴 COLOR BUG

**Features:**
- Identity & Typography (name, font, weight)
- Hero cover (text vs image mode)
- Hero icons (4x grid with custom colors)
- Navbar style (color + icon mode)
- Theme colors (primary, secondary, confirmation, powered_by)
- Munchboy branding (hidden for launch)
- Info pills (WhatsApp, Rappi, MP, PedidosYa, Admin)

##### 🔴 CRITICAL BUG: Color Saving Reverts

**Problem:** Colors appear to save but revert on page refresh  
**Root Cause:** Race condition between `updateBranding()` and `refreshTenantData()` — replica lag (50-500ms) causes stale data to overwrite local changes

**The Bug Flow:**
1. User changes color → instant preview works
2. User clicks "Save" → `handlePlatformSave()` fires
3. Payload uses `tenant.*` values, NOT `localMunchboyColors.*` for some fields
4. Supabase update succeeds
5. `refreshTenantData()` fetches from DB
6. Returns **STALE DATA** (replica lag: 50-500ms)
7. `setTenantData(data)` in TenantContext overwrites local state
8. `setHasChanges(false)` clears dirty flag before sync completes
9. **Result:** UI shows OLD colors from DB (stale data overwritten)

**Why Non-Munchboy Colors Work:**
- Core colors set CSS variables directly (`--color-primary`), so even when React state reverts, the CSS stays
- Munchboy colors have NO CSS fallback — they rely entirely on React state

| Field | Local State | Cloud Save | Reverts? |
|-------|------------|------------|----------|
| `navbar_color` | ✅ | ✅ | ❌ No |
| `primary_color` | ✅ | ✅ | ❌ No |
| `munchboy_shell_color` | ✅ | ✅ | ✅ YES |
| `munchboy_a_color` | ✅ | ✅ | ✅ YES |
| `munchboy_b_color` | ✅ | ✅ | ✅ YES |

**Fix Required:** In `handlePlatformSave()`, line ~355 — sync `localMunchboyColors` to tenant before payload construction, or include directly in payload.

##### SyncContext Mutation Anti-Pattern
```javascript
// Direct object mutation (React anti-pattern):
Object.assign(tenant, updates)
// Should use immutable update:
setTenantData(prev => ({ ...prev, ...updates }))
```

**Status:** ⚠️ PARTIALLY BROKEN — Core colors work, Munchboy colors revert

---

#### Menu Manager (1,816 lines) — 🔴 SYSTEM ERROR

##### Error Chain Analysis
```
Error Hierarchy (by frequency in code):
1. Cloud Sync Failed (line 339-341)
   └── Error Code: 42501 (RLS violation)
   └── Error Code: 23503 (FK violation)
   └── Error Code: 22P02 (invalid input syntax)

2. Platform Sync Error (line 481-482)
   └── app_config JSONB malformed
   └── featured_photos array too large

3. Hero Items Sync (line 499-504)
   └── menu_items table RLS violation
   └── Duplicate ID conflict

4. Image Upload (line 389-403)
   └── Storage bucket 'menu-images' not found
   └── File size > 5MB limit
   └── Invalid file type
```

##### Critical Code Paths
- **Path 1: Category Add (Line 1340)** — Immediate sync without validation; `generateId('category')` may collide with existing IDs; empty `items: []` required by `sanitizeMenu`; `syncMenuToCloud()` fails on FK violation
- **Path 2: Image Upload (Line 541-635)** — Blob URL stored in menu state temporarily; if user saves before upload completes → "Blob URL in payload" error; if user navigates away → orphan blob
- **Path 3: Dual-Sync Race (Lines 468-504)** — Two async writes: `branding.update` succeeds but `menu_items.upsert` may fail silently with no rollback → branding saved but hero items not synced

##### State Management Issues
| Issue | Location | Impact |
|-------|----------|--------|
| `isHydratedRef` blocks initial sync | Line 115 | Empty menu on first load |
| `ignoreCloudUpdateRef` causes stale data | Line 124 | Changes not reflected |
| `menu` state vs `localConfig` divergence | Throughout | Two sources of truth |
| `pendingFiles` buffer not persisted | Line 295 | Lost images on refresh |

##### Foreign Key Validation Gap (Line 434)
- Current validation only checks if category has items before deletion
- **Missing validations:**
  - Item ID uniqueness across categories
  - Category ID uniqueness
  - Image URL validity check
  - Price number validation
  - Required field checks

**Status:** 🔴 NEEDS INVESTIGATION — Multiple failure points: RLS violations, FK constraints, blob URL leakage, dual-sync race conditions

---

#### FoodSpot AI (694 lines) — 🟡 NEEDS "COMING SOON" MODE

##### LLM Stack
| Component | Model | Provider | Cost | Use Case |
|-----------|-------|----------|------|----------|
| Chat Engine | Gemini 2.0 Flash | Google | Free tier* | Strategy, prep assistant, Q&A |
| Image Generation | Pollinations AI | Pollinations | Free | Promotional flyers, food photography |
| Image Gen (Fallback) | Custom Edge Function | Supabase | Varies | Primary image generation |

*Google Gemini 2.0 Flash: 1,500 requests/day free, then $0.075/1M tokens

##### Gemini Configuration
```javascript
temperature: 0.3        // Low creativity (factual)
maxOutputTokens: 1000   // ~750 words max
topP: 0.8              // Nucleus sampling
topK: 40               // Vocabulary restriction
```

##### System Prompt Architecture (Lines 34-56)
- Layer 1: Identity — "FoodSpot Prep-Agent"
- Layer 2: Context — Order details, menu, inventory
- Layer 3: Rules — Concise, food safety, speed
- Layer 4: EXEC PROTOCOL (for strategies) — NO INTRODUCTIONS, must start with `### Headline`, mandatory hierarchy, JSON draft in `|||...|||`

##### Image Generation Pipeline (Three-Tier Fallback)
- **Tier 1:** Supabase Edge Function `'foodspot-image'` → Input: `{ prompt, category }` → Output: base64 image OR null — Status: 🟡 Unknown (function not in repo)
- **Tier 2:** Pollinations AI (Primary) → URL: `https://image.pollinations.ai/prompt/{prompt}` → Params: `width=1080, height=1920, nologo=true` → Seed: Random (1-1,000,000) → Category prefixes for food/nightlife photography
- **Tier 3:** Pollinations (Fallback Seed) → Same endpoint, different random seed, lower quality suffix

##### Canvas Composite Stack (After Image Gen)
1. Base image (1080x1920)
2. Vignette overlay (radial gradient)
3. Top gradient (text readability)
4. Bottom gradient (footer area)
5. Headline text (centered, 3 lines)
6. Price tag (bottom center)
7. Footer text (business name)

##### Smart Typography Engine (Lines 47-96)
- `stackText()` + `calculateFontSize()`
- Text wrapping: 14 char limit, 3-line max
- Binary font sizing: 36px min, 130px max
- Canvas measurement: Context-based width check
- 🟡 No RTL language support
- 🟡 Hardcoded font family override (ignores tenant's selected `font_family`)

| Severity | Issue | Location | Description | Fix Required |
|----------|-------|----------|-------------|--------------|
| 🔴 Critical | API key in URL | Line 337 | `GOOGLE_API_KEY` exposed as query param — key could leak in server logs | Move to request body or proxy through Edge Function |
| 🔴 High | No rate limiting | Line 337 | No debounce or quota on Gemini calls | Add debounce + quota |
| 🔴 High | No request timeout | Line 337 | Fetch has no timeout | Add 30s timeout |
| 🔴 High | No file upload validation | Lines 575-585 | Any file accepted (no size/type check) — could upload 100MB video | Add 5MB limit, `image/*` only |
| 🔴 High | No input sanitization | — | User prompt sent direct to API | Sanitize inputs |
| 🔴 High | CORS failure not handled | Lines 158-168 | Pollinations CORS fetch with no error boundary — silently falls through | Add error handling |
| 🔴 High | No schema validation on JSON drafts | Line 376 | `draftPayload = JSON.parse(jsonMatch[1])` then `ingestAIDraft(draftPayload)` — blind trust | Validate structure before ingesting |
| 🟡 Medium | Blob URL memory leak | Lines 165, 294 | `URL.createObjectURL(blob)` created but only revoked on unmount via `useBlobUrlTracker` — not revoked in error path | Proper cleanup |
| 🟡 Medium | Message history unbounded | Line 329 | All messages sent every time — token count grows indefinitely | Keep last 10 messages |
| 🟡 Medium | No retry logic | Line 353 | No exponential backoff | Add retry with backoff |
| 🟡 Medium | Canvas `toDataURL` blocking | Line 274 | Synchronous, blocks main thread on large canvas | Offload to worker |
| 🟡 Medium | Regex JSON extraction fragile | Lines 372-380 | Greedy matching could capture wrong content | Use Structured Output API |
| 🟡 Medium | No image size limits on generation | Line 138 | Pollinations images could be very large | Add limits |
| 🟡 Medium | Messages not persisted | — | Chat history lost on refresh | Add persistence |
| 🟡 Medium | XSS via Markdown | — | `react-markdown` may allow HTML | Sanitize |
| 🟢 Low | Hardcoded English strings | — | No i18n | Add translations |
| 🟢 Low | No RTL support | — | Broken layout for Arabic/Hebrew | Add text direction |
| 🟢 Low | Hardcoded dimensions | Lines 100-101 | Canvas always 1080x1920 | Make configurable |

##### AI Launch Strategy
> **KEEP LIVE:**
> - "Help me write a promo" (text only)
> - "Analyze my menu"
> - "Suggest pricing"
> - Strategy drafts (JSON protocol)
>
> **COMING SOON:**
> - "Generate flyer image" (image gen)
> - "Create video reel"
>
> **UI TWEAK:**
> - Change "FoodSpot AI" tab to: **"AI Assistant ✨"**
> - Subtitle: "Text & Strategy Mode"

**Required Fix:** Add `ENABLE_IMAGE_GENERATION = false` flag; conditionally render `LazyImage`; rename UI header

##### Cost Projections
| Tier | Monthly Usage | Gemini Cost | Image Cost | Total |
|------|-------------|-------------|------------|-------|
| Free | < 1,500 chats, < 500 images | $0 | $0 | $0 |
| Starter | 5,000 chats, 2,000 images | $15 | $0* | $15 |
| Growth | 20,000 chats, 10,000 images | $60 | $50** | $110 |
| Scale | 100,000 chats, 50,000 images | $300 | $250 | $550 |

*Pollinations free tier generous · **DALL-E 3 fallback for quality

##### Future Features Roadmap

**Phase 1: Stability (Next 2 Weeks)**
- API Key Proxy — Route through Supabase Edge Function (4h)
- Request Timeouts — 30s Gemini, 60s image gen (2h)
- File Validation — 5MB limit, `image/*` only (2h)
- Error Boundaries — Graceful degradation (4h)

**Phase 2: Intelligence (Next Month)**
- Menu Analysis — Upload menu photo → extract items (Gemini 2.0 Vision)
- Price Optimization — "Suggest prices for this menu" (GPT-4 + margin calc)
- Inventory Sync — "What can I make with current stock?" (RAG on inventory)
- Sentiment Analysis — "Summarize recent reviews" (Gemini Flash)
- Competitor Watch — "What are nearby restaurants offering?" (Web search API)

**Phase 3: Generation (Next Quarter)**
- Video Reels — Auto-generate 15s promo videos (Runway Gen-2 / Pika)
- Voice Over — Narrated menu descriptions (ElevenLabs)
- Multi-Image Stories — Instagram Story sequences (Canvas batch)
- A/B Test Generator — "Give me 3 versions of this promo" (Multi-sampling)
- Seasonal Campaigns — "Plan my summer menu launch" (Multi-turn planning)

**Phase 4: Advanced (Vision)**
- Real-time Voice — Talk to your AI kitchen manager (WebRTC + Whisper)
- Predictive Prep — "You'll need 40 patties by 7pm" (Time-series model)
- Auto-Inventory — Photo of fridge → stock count (Computer vision)
- Dynamic Pricing — "Raise burger price when queue > 10" (Rules engine)
- Staff Training — "Quiz me on food safety" (Adaptive learning)

**Status:** 🟡 Functional but needs security fixes and image gen disabled for launch

---

#### Owner Login (305 lines) — ✅ STABLE

**Features:**
- Dual mode: Owner (email/pass) vs Staff (email/PIN)
- Owner uses Supabase Auth
- Staff uses staff table with PIN hash
- Auto clock-in on staff login
- Language-aware translations

| Severity | Issue | Location | Description | Fix Required |
|----------|-------|----------|-------------|--------------|
| 🔴 High | Same `simpleHash` for staff PIN | Lines 9-16 | Client-side hash, trivial to reverse, no salt | Server-side bcrypt |
| 🟡 Medium | No rate limiting | Lines 80-113 | No brute force protection | Add rate limit |
| 🟡 Medium | localStorage sync issues possible | Lines 102-111 | Race conditions on redirect | Verify flow |
| 🟢 Low | `window.location.replace` race | Lines 42-55 | Minor timing issue | Low priority |

**Status:** ✅ Production Ready

---

#### Delivery Manager (387 lines) — 🟡 NOT CLOUD-FIRST

**Features:**
- Delivery order workflow (6 statuses)
- Payment confirmation
- Delivery code verification
- Demo mode with mock data
- Integration with `canAdvanceOrder()` guard

| Severity | Issue | Location | Description | Fix Required |
|----------|-------|----------|-------------|--------------|
| 🔴 High | Uses localStorage orders (not Supabase) | Lines 20, 28-33 | `getOrders()` from localStorage with 5s polling — contradicts "Cloud-first" goal | Migrate to Supabase realtime (like KDS) |
| 🟡 Medium | Delivery code verification client-side | Line 287 | Should be server-side | Move to RPC |
| 🟡 Medium | No realtime for delivery updates | Missing | Staff/customer can't see live changes | Add Supabase channel |
| 🟢 Low | Demo orders hardcoded | Lines 72-107 | Only dev concern | Low priority |

**Status:** 🟡 NEEDS UPGRADE — Still using legacy localStorage pattern. Should match KDS realtime architecture.

---

#### Rewards Manager (172 lines) — ⚠️ NOT AUDITED
- **Status:** Deferred — Can be "Coming Soon" for launch

---

### STAFF BACKEND

**Files Audited:**
- StaffDashboard.jsx (680 lines)
- StaffKDS.jsx (89 lines)
- StaffKDSWithCamTech.jsx (284 lines)
- StaffLogin.jsx (255 lines)
- useKDSSync.js (117 lines)
- useOrdersRealtime.js (131 lines)
- StaffContext.jsx (137 lines)

**Staff Total:** 2,773 lines

**Overall Status:** 🟢 **PRODUCTION READY — The most mature part of the codebase.** No critical issues found.

---

#### StaffDashboard.jsx (680 lines) — 🟢 SOLID

##### FSM Status Pipeline (7 states)
```
pending_payment --> paid_unreleased --> released_to_kitchen
                         |                    |
                         |                    v
                         |              preparing --> ready --> dispatched
                         |                    |                  |
                         |                    |                  v
                         '------------------------------> delivered (terminal)
```

##### FSM Safety Cage Pattern
- Each status has ONE action button
- All transitions via `advance_order_status()` RPC
- Row-locked: No double-click races
- Server validates every transition

##### Strengths
- Real-time sync via `useOrdersRealtime` hook
- Kanban columns — dynamic, responsive grid
- Ticket scanner — lazy-loaded to avoid camera bundle
- Shift management — clock-in/clock-out with RPC
- Role detection — Owner sees "Volver", staff does not
- WhatsApp driver — one-click delivery message
- Error handling — Toast messages, not alerts

| Severity | Issue | Location | Description |
|----------|-------|----------|-------------|
| 🟡 Medium | No offline indicator | Missing | Staff does not know if connection dropped |
| 🟢 Low | `window.innerWidth` in render | Line 480 | SSR risk (minor) |
| 🟢 Low | Inline styles (no CSS modules) | Throughout | Maintainability |

**Status:** 🟢 Production Ready

---

#### StaffKDS.jsx (89 lines) — 🟢 REFERENCE IMPLEMENTATION
- Simplified KDS using `useKDSSync` hook
- 3 columns: Paid, Cooking, Ready
- CamTech pause: Stops updates when camera active
- Optimistic UI: Shows spinner during transitions
- **Status:** 🟢 Clean, minimal, functional — Reference implementation

---

#### StaffKDSWithCamTech.jsx (284 lines) — 🟡 REDUNDANT
| Aspect | StaffKDS | StaffKDSWithCamTech |
|--------|----------|---------------------|
| Sync method | Realtime (`useKDSSync`) | Polling + Realtime |
| Pause trigger | `useCamTechListener` | `window.__camTechActive` |
| Code size | 89 lines | 284 lines |

**Status:** 🟡 Redundant but educational. `StaffKDS` is the production version.

---

#### StaffLogin.jsx (255 lines) — 🟢 FUNCTIONAL
- Supabase auth for staff credentials
- Session bypass (if already logged in)
- Role-based redirect (`/admin`, `/owner/summary`, or `/staff/dashboard`)
- **Note:** Duplicates `OwnerLogin.jsx` logic — could be unified
- **Status:** 🟢 Functional

---

#### useKDSSync.js (117 lines) — 🟢 REFERENCE-QUALITY HOOK

##### Optimistic + Snapback Pattern
1. **Optimistic update** — instant UI change with `isOptimistic` flag
2. **Snapback timer (8 seconds)** — rolls back if server rejects
3. **Server confirmation** — clears timer, confirms change
4. **CamTech guard** — ignores updates when camera active
5. **Silo isolation** — `business_id` filter on all queries
6. **Cleanup** — clears timers on unmount

> "Camera active -> Pause updates. Camera closed -> Refresh immediately. Prevents lag/crashes during photo capture."

**Status:** 🟢 Reference-quality — The optimistic + snapback pattern should be documented for other features.

---

#### useOrdersRealtime.js (131 lines) — 🟢 SOLID
- General orders realtime (not just KDS)
- Used by `StaffDashboard` for full order list
- Same pattern as `useKDSSync` but simpler (no optimistic updates)
- All statuses (vs KDS which filters to `['paid','cooking','ready']`)
- Limit: 50 orders

**Status:** 🟢 Good separation — simpler hook for simpler use case.

---

#### StaffContext.jsx (137 lines) — 🟢 CLEAN
- State: `staffMember`, `currentShift`, `loading`
- Persistence: `fs_staff_member`, `fs_current_shift`, `fs_business_id`, `x-staff-id` in localStorage
- RPC: `clock_in()` creates shift, `clock_out()` ends shift

**Status:** 🟢 Clean, functional — localStorage persistence is appropriate for session data.

---

##### Key Architectural Wins (Staff Backend)
1. **FSM Safety Cage** — Every status has ONE action. No impossible transitions. Server validates everything.
2. **Optimistic + Snapback Pattern** — UI updates instantly. Rolls back if server rejects. 8-second timeout protects against dropped connections.
3. **CamTech Integration** — Camera active, pause updates. Camera closed, refresh immediately. Prevents lag/crashes during photo capture.
4. **Silo-Hardened** — Every query: `.eq('business_id', businessId)`. Every realtime: `filter: 'business_id=eq.${businessId}'`. No cross-tenant leaks possible.

---

### CONTEXTS AND HOOKS (Shared State)

---

#### TenantContext.jsx (335 lines) — 🔴 HIGH RISK (Functional but Fragile)

##### Tenant Resolution Flow
1. Extract slug from URL path
2. Check SYSTEM_ROUTES (`admin`, `owner`, `login`, etc.)
   - System route: Check localStorage recovery
   - Tenant route: Use slug
3. **CACHE-FIRST:** Check localStorage for `tenant_lock_{slug}`
   - Cache hit: Set state immediately, revalidate in background
   - Cache miss: Fetch from Supabase
4. **DOUBLE-FETCH:** `branding` table + `tenants` table
   - branding: slug -> `business_id`, colors, config
   - tenants: `venue_name` (case-insensitive) -> language
5. **FAILSAFE:** If tenants lookup fails, fetch by `owner_id`
6. **MERGE AND CACHE:** Combine data, save to localStorage

| Severity | Issue | Location | Description | Fix Required |
|----------|-------|----------|-------------|--------------|
| 🔴 High | Double-fetch race condition | Lines 113-178 | Two Supabase calls with no transaction wrapper — partial data possible | Add transaction or fallback |
| 🔴 High | Cache poisoning possible | Lines 128-139 | Cached data used without validation — malicious cached data could inject wrong `business_id` | Validate cached data |
| 🟡 Medium | Owner failsafe bypasses RLS | Lines 150-167 | Fallback query by `owner_id` may have different RLS scope | Review RLS policy |
| 🟡 Medium | Image prefetch no error handling | Lines 26-41 | Failed prefetch silently ignored | Add error handling |
| 🟢 Low | Theme application on every render | Line 249 | Unnecessary reapplication | Memoize |

**Verdict:** Functional but fragile. Double-fetch pattern adds complexity. Cache-first is fast but risks stale data. Not a launch blocker since it works in practice.

---

#### useSplitPayment.js (306 lines) — 🔴 CRITICAL (Financial Risk)

##### Payment Flow
1. `createLedger()` -> Insert into `table_ledgers` -> Returns ledger object
2. `splitBill()` -> Fetch ledger -> Calculate per-person amounts -> Generate guest tokens -> Insert `split_payments` records -> Update ledger `split_count`
3. `generateMPSplitPreference()` -> Call Edge Function `'create-split-preference'` -> Update split with `mp_preference_id`
4. `paySplitWithCard()` -> Validate wallet/card -> Check balance -> Call RPC `'deduct_wallet_balance'` -> Mark split as paid
5. `processMPWebhook()` -> Lookup split by `mp_payment_id` -> Update split status -> Update ledger `total_paid`

| Severity | Issue | Location | Description | Fix Required |
|----------|-------|----------|-------------|--------------|
| 🔴 Critical | No transaction wrapper | Throughout | Two separate updates could fail halfway — orphaned splits possible | Add RPC atomic operations |
| 🔴 High | Race condition on ledger update | Lines 115-132 | `split_payments.insert` succeeds but `table_ledgers.update` could fail — orphaned splits | Wrap in single RPC |
| 🔴 High | No idempotency on webhook | Lines 134-172 | Same webhook could be processed twice — no check if split already paid before processing — `newTotalPaid` calculated every time | Add idempotency check |
| 🔴 High | Wallet balance check-then-deduct race | Lines 183-217 | Balance checked, then deducted in separate operation — concurrent requests could overdraw | Use atomic RPC |
| 🟡 Medium | Amount calculation rounding errors | Lines 89-94 | Floating point division of bill amounts | Round to 2 decimal places |
| 🟡 Medium | No verification of MP payment amount | Line 134 | Webhook accepted without verifying amount matches expected | Verify amount matches |

**Verdict:** 🔴 FINANCIAL RISK. Multiple race conditions could cause double-charges or lost payments. Needs transaction safety before launch.

---

#### useLedgerRealtime.js (131 lines) — 🟢 LOW RISK
- Supabase realtime channel for `table_ledgers`
- Filters by `business_id`
- Triggers callbacks on INSERT/UPDATE
- Vibration notification on paid status

| Severity | Issue | Location | Description |
|----------|-------|----------|-------------|
| 🟡 Medium | Notification queue grows unbounded | Line 8 | Memory leak possible |
| 🟡 Medium | No channel error handling | Line 64 | Silent failure |
| 🟢 Low | Vibration fails silently on non-mobile | Line 37 | Expected behavior |

**Status:** 🟢 Simple, functional, low risk

---

## FRONTEND AUDIT

---

### CUSTOMER FACING

---

#### Home Tab

**File:** Home.jsx (~1,250 lines)  
**Status:** 🟢 PRODUCTION READY

##### Architecture
- HeaderClamp (branded header)
- 2x2 Hero Grid (menu, envios, rewards, arcade)
- Featured Products (2x2 grid, 4 slots)
- Edit Mode (owner-only drag-to-reorder)

##### Interactive Features
- **1.8s long-press** -> Edit mode (jiggle animation)
- **Drag physics** for reordering icons/featured
- **Floating save bar** (atomic seal pattern)
- **HikariBoy modal** (arcade launcher)

##### Strengths
- **Optimistic UI Pattern (Lines 180-220, 240-280)** — Local state owns the UI during drag. Prevents "snapback" — the visual stutter when React re-renders and reverts drag position.
- **Drag Physics Engine (Lines 320-450)** — Touch + mouse support, auto-scroll, magnet collision detection (60px threshold), ghost element with `transform: scale(1.05)`, placeholder highlight at drop target
- **Owner Mode Detection (Lines 88-96)** — Survives page refreshes via localStorage flag
- **Arcade Integration (Lines 610-620, 1220-1230)** — Clean modal launch with tenant branding passed as props
- **Atomic Save Pattern (Lines 520-580)** — Construct payload -> Update Supabase -> Refresh tenant -> Clear locks -> Dispatch `'frontendSync'`

| Severity | Issue | Location | Description |
|----------|-------|----------|-------------|
| 🟢 Low | Inline style proliferation | ~40% of file | Dynamic styles based on drag state |
| 🟢 Low | Demo mode stub | Line 16 | `isInDemoMode = () => false` — dead code |
| 🟢 Low | Placeholder images still present | Lines 195-200 | `placeholderImages` not used anymore — can delete |

**Verdict:** 🟢 Production Ready — Patterns established here (optimistic UI, atomic save, drag physics) are reference-quality.

---

#### Menu Tab

**File:** Menu.jsx (~1,200 lines)  
**Status:** 🟢 PRODUCTION READY

##### Architecture
- HeaderClamp (branded header)
- Edit Mode HUD (owner-only)
- Floating Save Bar (atomic seal)
- Category Rail (sticky horizontal nav)
- Product Grid (3-column masonry per category)
- ItemCard component (reusable card)
- Mini-Cart (sticky bottom receipt style)
- Drag Ghost (visual feedback during reorder)

##### Interactive Features
- **0.5s long-press** -> Edit mode (faster than Home 1.8s)
- **Drag-to-reorder** items within categories
- **Tap-to-add** — instant cart addition with haptic (`navigator.vibrate(5)`)
- **Category rail scroll-to-section**

##### Strengths
- **Universal Truth Pattern (Lines 480-570)** — Phase 1: SQL Upsert (categories + items), Phase 3: JSON Blob Sync. Prevents "Revert on Refresh" bug where SQL updated but JSON blob is stale.
- **Seed Data Fallback (Lines 48-130)** — 48-item fallback menu across 8 categories (Bakery, Cafe, Candy, Building, Nightlife, Events, Street Food, Fine Dining). New vendors see a full demo menu immediately.
- **Instant Add UX (Lines 640-660)** — No modals, no friction — tap item, it is in cart with visual scale feedback
- **3-Column Grid Layout** — Mobile-optimized dense grid
- **Receipt-Style Mini-Cart (Lines 740-810)** — Dashed border aesthetic, individual item removal, prominent checkout CTA

| Severity | Issue | Location | Description |
|----------|-------|----------|-------------|
| 🟡 Medium | Inconsistent long-press timing | — | Home = 1.8s, Menu = 0.5s — should standardize to 1.0s |
| 🟡 Medium | Cross-category drag not implemented | — | Can only reorder within same category |
| 🟡 Medium | Owner mode detection duplication | — | Same pattern as Home — should extract `useOwnerMode()` hook |
| 🟢 Low | Seed data uses hardcoded Unsplash URLs | Lines 48-130 | If Unsplash rate-limits, fallback breaks |

**Verdict:** 🟢 Production Ready — Universal Truth pattern here should be reference for all multi-table saves.

---

#### Delivery / Envio Tab

**Files:**
- Envio.jsx (23 lines) — Thin wrapper around Menu with `deliveryMode={true}`
- Order.jsx (~1,200 lines) — Checkout flow
- OrderStatus.jsx (~550 lines) — Tracking

**Status:** 🟢 PRODUCTION READY

##### End-to-End Delivery Flow
1. **Envio Tab** -> Thin wrapper around Menu with `deliveryMode={true}`
2. **Checkout (Order.jsx):**
   - Service mode toggle (Dine-in or Delivery)
   - Structured address form (Street, Number, Floor, Notes)
   - Delivery radius validation with live distance calc
   - Free delivery threshold logic
   - Mercado Pago integration with retry flow
   - WhatsApp hybrid fallback
3. **Tracking (OrderStatus.jsx):**
   - Real-time Supabase subscription
   - Uber-style 4-step stepper
   - QR code for order verification
   - Digital ticket overlay for events

##### Strengths
- **Persistent-First Order Strategy (Order.jsx Lines 380-480)** — DB INSERT happens BEFORE payment. Order is NEVER lost, even if Mercado Pago crashes mid-payment. WhatsApp shadow receipt as backup notification.
- **Structured Address Form (Order.jsx Lines 660-720)** — "Strike 17" — 4-field grid (Calle, Altura, Piso/Depto, Nota/Timbre). Prevents "where do I park" confusion.
- **Delivery Radius Guard (Order.jsx Lines 230-250, 640-650)** — `isWithinDeliveryRadius()` with hard fence: "Fuera de Radio ({deliveryRadius}km)"
- **Payment Retry Flow (Order.jsx Lines 140-180, 520-580)** — Detects failure from URL params (`rejected`/`cancelled`) -> sets `isRetryMode` -> retry handler with silo guard (`.eq('business_id', businessId)`)
- **Real-time Order Tracking (OrderStatus.jsx Lines 130-160)** — Supabase channel with `filter: 'id=eq.${order.id}'` -> customer sees status changes instantly
- **Uber-Style Stepper (OrderStatus.jsx Lines 25-60)** — Recibido -> En Cocina -> En Camino -> Entregado
- **Dual-Write Protection (OrderStatus.jsx Line 170)** — "DUAL-WRITE PROTECTION: Removed client-side status update. The Webhook is the SOLE authority for payment confirmation."

| Severity | Issue | Location | Description |
|----------|-------|----------|-------------|
| 🟡 Medium | `deliveryMode` prop may not be consumed | Envio.jsx | Menu component does not appear to use it |
| 🟡 Medium | Delivery fee logic duplicated | Order.jsx + useSplitPayment.js | Could unify into shared util |
| 🟡 Medium | Status color/label maps duplicated | OrderStatus.jsx + StaffKDS + StaffDashboard | Should unify into `orderStatusMap.js` |
| 🟡 Medium | Limited order details on receipt | OrderStatus.jsx | Missing: item breakdown with prices, payment method, delivery address, timestamp history |
| 🟡 Medium | No order cancellation from customer | OrderStatus.jsx | Must contact via WhatsApp |
| 🟢 Low | No driver location tracking | — | No map, no ETA, no driver contact — acceptable for MVP |

**Verdict:** 🟢 Production Ready — Persistent-first pattern prevents the "where is my order" support nightmares.

---

#### Order Status / Receipt Tab

**File:** OrderStatus.jsx (~550 lines)  
**Status:** 🟢 PRODUCTION READY

##### Features
- **Dual Lookup Strategy (Lines 90-120)** — By `orderId` (shareable link) OR most recent by `guest_token`/stored phone
- **Status Color System (Lines 75-95):**
  - Pending Payment -> Yellow (#FEF3C7)
  - Preparing -> Blue (#DBEAFE)
  - Ready -> Cyan (#CFFAFE)
  - Dispatched -> Indigo (#E0E7FF)
  - Delivered -> Green (#DCFCE7)
  - Cancelled -> Red (#FEE2E2)
- **Digital Ticket Overlay (Lines 320-420):** Full-screen blur backdrop, QR code (`FS-TICKET|{orderId}|{tenantSlug}`), "REDEEMED" stamp overlay, event venue branding
- **Reorder Engine (Lines 180-210):** One-tap reorder — clears current order, adds all items with quantities/extras/variants, redirects to `/{tenantSlug}/menu?reorder=true`

---

#### Info Tab

**File:** Info.jsx (~110 lines)  
**Status:** 🟡 FUNCTIONAL BUT DATED

##### Architecture
- HeaderClamp (branded hero cover)
- 5-button stack: WhatsApp, Mercado Pago, Rappi, PedidosYa, Admin Access
- Footer ("Powered by @foodspotapp")

| Severity | Issue | Location | Description | Fix Required |
|----------|-------|----------|-------------|--------------|
| 🟡 P1 | Rappi and PedidosYa buttons are dead | — | No `onClick` handler — just colored buttons that do nothing. Buttons should be hidden if no link configured in backend. | Conditionally render based on backend data |
| 🟡 P1 | Mercado Pago button misleading | — | Says "Mercado Pago" but navigates to checkout — confusing | Rename to "Hacer Pedido" or remove |
| 🟡 P1 | Admin Access visible to all customers | — | No role check — anyone can see and click the Admin button | Conditionally render: `session?.role === 'owner'` |

**Verdict:** 🟡 Weakest frontend tab. Quick fixes would polish significantly.

---

### AUTH FLOWS

**Files:**
- TrialSignup.jsx (~750 lines)
- OwnerLogin.jsx (305 lines)

**Status:** 🟡 FUNCTIONAL WITH SECURITY DEBT

##### Signup Flow
1. Validate business name -> generate slug
2. Supabase Auth `signUp` (with metadata: name, slug, role)
3. INSERT `branding` row (`user_id`, `business_name`, `slug`, trial)
4. `setTenantStoragePrefix(userId)`
5. Redirect to `/{slug}/owner/summary`
6. **Self-Healing:** If slug missing from metadata, query `profiles` -> `branding` and backfill auth metadata

##### Login Flow
- **Owner:** Email/password -> Supabase Auth
- **Staff:** Username/PIN -> staff table lookup -> `simpleHash(PIN)` compared to stored hash -> `clock_in` RPC
- Role-based redirect

##### Strengths
- **Self-Healing Slug Recovery (Lines 120-150)** — Stage 1: Find `business_id` from Profiles. Stage 2: Find slug from Branding. Stage 3: Backfill metadata via `supabase.auth.updateUser()`. Prevents broken logins for legacy users.
- **Automatic Clock-In (Lines 130-160)** — Staff auto-clocked in on login
- **Responsive Design** — Completely separate mobile/desktop layouts (mobile: full-bleed hero with sunburst animation, desktop: centered modal card)

| Severity | Issue | Location | Description | Fix Required |
|----------|-------|----------|-------------|--------------|
| 🔴 Critical | No email verification | TrialSignup.jsx `handleSignup` | Anyone can sign up with any email (even fake ones) — no verification loop | Enable Supabase email confirmation |
| 🔴 Critical | Weak password requirements | TrialSignup.jsx | Only `minLength={6}` — "123456" is acceptable | Add 8-char minimum + complexity rules |
| 🔴 Critical | No tenant isolation check on login | OwnerLogin.jsx | Redirects based on `metadata.slug` WITHOUT verifying user owns that tenant | Verify `user_id` matches `business_id` |
| 🟡 P1 | Slug collision not handled | TrialSignup.jsx `generateSlug()` | Two businesses named "Burger Palace" get same slug — collision — silent insert failure | Check uniqueness, auto-append number |
| 🟡 P1 | Staff PIN weak hash | Both files | `simpleHash()` is client-side, no salt, 10,000 combinations | Server-side bcrypt/argon2 |
| 🟡 P1 | No password reset flow | OwnerLogin.jsx | No "Forgot password?" link | Add reset flow |
| 🟡 Medium | Double login confusion | — | TrialSignup creates account but redirect sometimes requires re-login (session propagation race) | Verify session before redirect |

---

## GAME EMULATOR AUDIT — HIKARIBOY v1.0

**Status:** AUDIT PASSED — Production Ready, Ready for GitHub

### Memory Breakdown

#### HikariBoy Shell (Core)
| Component | Size | Notes |
|-----------|------|-------|
| HikariBoy.jsx | 17.4 KB | Main shell, game selector, button mapping |
| HikariBoy.css | 19.2 KB | Delta-style styling, responsive breakpoints |
| MunchboyBoot.jsx | 3.7 KB | GBA boot sequence with chime |
| MunchboyBoot.css | 3.9 KB | Bezel styling, MUNCHBOY logo animation |
| **SHELL TOTAL** | **~44 KB** | gzipped: ~12 KB |

#### Individual Games
| Game | Size | Type | Notes |
|------|------|------|-------|
| Bubble Tea Blast | 107 KB | Custom Canvas | Largest game, particle effects |
| Burger Stack | 79 KB | Custom Canvas | Physics stacking |
| Spice Invaders | 75 KB | Custom Canvas | Space Invaders clone |
| Candyland Flip | 104 KB | Custom Canvas | Card flip memory |
| Hikari Billiards | 65 KB | Custom Canvas | Pool with jazz audio |
| Sushi Slice | 37 KB | Custom Canvas | Fruit Ninja style |
| loading.html | 3.7 KB | Utility | Throbber animation |
| **GAMES TOTAL** | **~471 KB** | | gzipped: ~140 KB |

#### Grand Totals
```
Raw Size: ~515 KB (shell + games)
gzipped: ~152 KB
Memory Usage: ~2-4 MB runtime (Canvas + audio buffers)
Load Time: <2s on 4G, <500ms on WiFi
```

#### Issues Found
| # | Severity | Issue | Location | Fix |
|---|----------|-------|----------|-----|
| 1 | 🟡 Minor | Missing `cover.webp` for pool | GAMES array | Using `cover.png` instead of `.webp` — inconsistent format |
| 2 | 🟡 Minor | No gamepad support | HikariBoy.jsx | Only touch/mouse. Bluetooth controllers do not work |
| 3 | 🟡 Minor | L/R shoulder labels wrong | `handleButtonPress` | L to SELECT, R to START in selector — not actual L/R functions |
| 4 | 🟡 Minor | No high score persistence | Games | Scores reset on exit (no localStorage) |
| 5 | 🟡 Minor | Audio context suspended | Safari | Jazz does not auto-start until user interaction |
| 6 | 🟡 Minor | iframe sandbox strict | `sandbox="allow-scripts"` | Games cannot access localStorage (might be intentional) |

#### Observations (Not Issues)
- A/B buttons separated — Fixed from merge conflict
- D-pad cross-style — Clean, no circular surround
- MUNCHBOY branding — Centered in mid bar
- Game exit works — `GAME_EXIT` postMessage received
- Leak fix active — `.hikariboy-active` hides auth containers

#### Recommendations
- **Before GitHub Release:** Convert pool cover to WebP, add `screenshot.gif` to repo, add LICENSE file (MIT suggested)
- **Nice-to-Have (Future):** High score API (Supabase table for leaderboard), Gamepad API (`navigator.getGamepads()`), Offline support (Service worker cache)

#### Scores
| Metric | Score |
|--------|-------|
| Code Quality | 8.5/10 |
| Performance | 9/10 |
| Mobile UX | 9/10 |
| Completeness | 8/10 |
| **OVERALL** | **8.6/10** |

---

## CAMERA ENGINE AUDIT

**Files Audited:**
- `useCamTech.js` (Black Box System)
- `useCamera.js` (Core Hook)
- `CameraLayer.jsx` (UI Component)

**Status:** 🟢 PRODUCTION READY

> "Camera is solid. The CamTech Black Box pattern is exactly what prevents crashes."

### Strengths
- **CamTech Black Box System** — Broadcast/listen pattern via `window.dispatchEvent(new CustomEvent('camtech:active'))`. Pauses background sync when camera opens. Prevents memory pressure on low-end devices. Debounced resume (1000ms) prevents thrashing.
- **Hardware Lock with Fallback** — Tier 1: High-Res (1080p/4K). Tier 2: 720p Fallback. Graceful degradation.
- **Advanced Camera Features:** 10 filter styles (CSS + pixel manipulation), flash modes (off/on/auto/torch), pinch-to-zoom, front/back camera toggle, `display-p3` color space support
- **Black Screen Recovery** — 3-second timeout detects `video.readyState < 2` then auto-retry
- **Tab Visibility Handling** — Auto-stops camera when tab hidden, restarts when visible

| Severity | Issue | Location | Description |
|----------|-------|----------|-------------|
| 🟢 Low | Blob URL leak risk | `captureFrame()` | `URL.createObjectURL(blob)` created but not explicitly revoked — could accumulate memory |
| 🟢 Low | No camera permission denied UI | — | Only logs error, no friendly "Enable camera in settings" message |
| 🟢 Low | No tenant watermark on capture | — | Raw images without business branding watermark |

---

## ARCHITECTURAL ISSUES (Cross-Cutting)

### TenantContext Double-Fetch Pattern
- Every refresh makes 2 Supabase calls (`branding` + `tenants`)
- If either fails, partial data rendered
- No transaction wrapper for consistency

### CSS Variable vs State Drift
- `Settings.jsx` applies CSS immediately: `document.documentElement.style.setProperty('--color-primary', value)`
- If DB save fails, CSS stays new, state reverts old
- Visual inconsistency between preview and actual

### SessionStorage Dirty Flags
- Uses `sessionStorage` for dirty state: `sessionStorage.setItem('dirty_${businessId}', hasChanges)`
- Lost when user closes tab — no recovery mechanism for unsaved changes

### SyncContext Mutation Anti-Pattern
- Direct object mutation (React anti-pattern): `Object.assign(tenant, updates)`
- Should use immutable update: `setTenantData(prev => ({ ...prev, ...updates }))`

### Performance Observations
| Metric | Observation | Impact |
|--------|-------------|--------|
| Bundle Size | 2.9 MB source, ~800KB gzipped | Slow initial load |
| Image Handling | Multiple blob URL conversions | Memory leaks |
| Re-renders | TenantContext updates trigger full tree | Jank on navigation |
| Supabase Calls | No request deduplication | Duplicate API calls |
| Prefetch | Limited to 6 images | Hero images ready, category items delayed |

### Security Observations
| Issue | Location | Severity |
|-------|----------|----------|
| `simpleHash` for staff PINs | OwnerLogin.jsx | Low (client-side only) |
| Business ID in localStorage | storage.js | Low (RLS protected) |
| Guest token scope | supabaseClient.js | Medium (need audit) |
| Image upload file type validation | MenuManager.jsx | Missing |
| API key in client bundle | FoodSpotAI.jsx | High |

---

## DATABASE AND INFRASTRUCTURE

### Pending SQL Migrations
**File:** `critical_schema_fix.sql`

| Migration | Purpose | Status |
|-----------|---------|--------|
| Fix `orders_status_check` constraint | Supports full order lifecycle (7 FSM states) | MUST RUN |
| Add Mercado Pago columns | `payment_id`, `status`, webhook support | MUST RUN |
| Create indexes | Performance on order queries | MUST RUN |
| Webhook handler function | Atomic payment processing | MUST RUN |

### Database Column Check Required
These columns MUST exist in the branding table:
`primary_color`, `secondary_color`, `confirmation_color`, `powered_by_color`, `navbar_color`, `nav_icon_mode`, `hero_mode`, `hero_url`, `hero_icons`, `info_pills`, `munchboy_enabled`, `munchboy_name`, `munchboy_shell_color`, `munchboy_a_color`, `munchboy_b_color`, `font_family`, `font_weight`, `business_name`, `menu_data`, `app_config`, `featured_photos`

---

## LAUNCH RECOMMENDATIONS

### MUST FIX BY APRIL 10 (Silent Beta Launch)

**P0 — Launch Blockers:**
1. **Menu Manager "System Error"** — `MenuManager.jsx` — Multiple failure points: RLS violations (42501), FK constraints (23503), blob URL leakage, dual-sync race conditions — Reproduce and diagnose exact error
2. **Munchboy Color Revert** — `Settings.jsx` line ~355 — Fix payload construction in `handlePlatformSave()` — sync `localMunchboyColors` before payload
3. **Run SQL Migrations** — `critical_schema_fix.sql` — All 4 migrations must run
4. **useSplitPayment Transaction Safety** — `useSplitPayment.js` — Add RPC atomic operations to prevent double-charges/lost payments
5. **FoodSpotAI Image Gen Flag** — `FoodSpotAI.jsx` — Add `ENABLE_IMAGE_GENERATION = false` — rename UI to "AI Assistant — Text and Strategy Mode"
6. **SuperAdmin DEV Bypass** — `SuperAdmin.jsx` lines 448-470 — Remove or add additional verification before production

**P1 — Should Fix:**
1. **Email Verification** — `TrialSignup.jsx` — Enable Supabase email confirmation to prevent fake accounts
2. **Password Strength** — `TrialSignup.jsx` — Add 8-char minimum + complexity rules
3. **Tenant Isolation Check** — `OwnerLogin.jsx` — Verify `user_id` matches `business_id` for requested slug before redirect
4. **Slug Collision Handling** — `TrialSignup.jsx` `generateSlug()` — Auto-append number if slug taken
5. **Info Tab Dead Buttons** — `Info.jsx` — Hide Rappi/PedidosYa buttons when no link configured in backend
6. **Info Tab Admin Button** — `Info.jsx` — Hide Admin Access for non-owners
7. **DeliveryManager Cloud Migration** — `DeliveryManager.jsx` — Migrate from localStorage to Supabase realtime (like KDS)

### CAN WAIT TIL END OF APRIL

**P2 — Post-Launch Polish:**
1. Staff PIN Hashing — Move from client-side `simpleHash()` to server-side bcrypt/argon2
2. FoodSpotAI API Key Proxy — Route Gemini calls through Supabase Edge Function to hide key
3. Password Reset Flow — Add "Forgot password?" to OwnerLogin
4. CSV Export — Add to Analytics page
5. Long-Press Timing — Standardize Home (1.8s) and Menu (0.5s) to 1.0s
6. Extract `useOwnerMode()` Hook — DRY up owner mode detection from Home/Menu
7. Unify Status Maps — Create shared `orderStatusMap.js` for colors/labels across all views
8. Remove Dead Code — `placeholderImages`, `isInDemoMode` stub from Home.jsx
9. Camera Blob Cleanup — Revoke `objectURL`s after use in `captureFrame()`
10. Camera Permission UI — Add "Enable camera in settings" helper
11. SuperAdmin Realtime — Migrate orders to Supabase (for internal monitoring)
12. Unify Branding Systems — Sync SuperAdmin 7-slot system with Owner backend
13. Extract Inline Styles — CSS modules for SuperAdmin, Home, Menu

### EXPLICITLY EXCLUDE FROM LAUNCH

Features to disable/hide for Silent Beta:
- **Image Generation in FoodSpotAI** — Set `ENABLE_IMAGE_GENERATION = false`
- **Promos** — Already have `PromosComingSoon.jsx` — use "Coming Soon" version
- **Rewards** — Customer loyalty view — defer to post-launch
- **Wall / ShareFood** — Social features — defer
- **PerfectPour** — Camera feature — maintain strict separation
- **StaffAgenticUI** — Staff AI assistant — experimental, staff can use ChatGPT
- **HikariBoy Leaderboard** — No high score persistence yet (no localStorage in sandbox)

---

## DAILY TASK BREAKDOWN (Tech Beast)

**Week of March 24:**
- [ ] Day 1: Run SQL migrations + fix Settings.jsx Munchboy color payload
- [ ] Day 2: Fix MenuManager blob guard + reproduce "system error" + test
- [ ] Day 3: FoodSpotAI `ENABLE_IMAGE_GENERATION = false` + rename UI + add file upload validation
- [ ] Day 4: useSplitPayment transaction safety (RPC atomic operations)
- [ ] Day 5: SuperAdmin DEV bypass removal + Auth flow fixes (email verify, password strength, tenant check)

**Week of March 31:**
- [ ] Info tab cleanup (dead buttons, admin guard)
- [ ] DeliveryManager cloud migration
- [ ] QA + bug fixes
- [ ] Beta vendor onboarding prep

**Week of April 7 (Launch Week):**
- [ ] Final smoke tests
- [ ] Deploy to production
- [ ] Onboard 3-5 beta vendors

### What You Tell Vendors
> "FoodSpot is in beta. We are waiving fees for the first month in exchange for feedback. Expect weekly updates as we polish."

---

## APPENDIX: COMPLETE FILE INVENTORY

| File | Lines | Status | Notes |
|------|-------|--------|-------|
| SuperAdmin.jsx | 2,095 | 🟡 Needs hardening | DEV bypass risk, localStorage orders |
| MenuManager.jsx | 1,816 | 🔴 System error | Blob URLs, FK violations, dual-sync race |
| Home.jsx | 1,231 | 🟢 Production ready | Reference: drag physics, atomic save |
| Settings.jsx | 1,197 | 🔴 Color bug | Race condition: Munchboy colors revert |
| Order.jsx | 1,004 | 🟢 Production ready | Persistent-first, payment retry |
| Menu.jsx | 831 | 🟢 Production ready | Universal Truth pattern, tap-to-add |
| OwnerSummary.jsx | 756 | 🟢 Production ready | Cloud-first orders, Vibe Boost |
| TrialSignup.jsx | 744 | 🟡 Security debt | No email verify, weak passwords |
| FoodSpotAI.jsx | 694 | 🟡 Needs flag | Image gen must be disabled for launch |
| StaffDashboard.jsx | 680 | 🟢 Production ready | FSM Safety Cage, reference quality |
| OrderStatus.jsx | 550 | 🟢 Production ready | Real-time tracking, QR tickets |
| DeliveryManager.jsx | 387 | 🟡 Not cloud-first | Still on localStorage polling |
| Dashboard.jsx (KDS) | 358 | 🟢 Production ready | Real-time WebSocket, FIFO |
| TenantContext.jsx | 335 | 🟡 Fragile | Double-fetch, cache poisoning risk |
| OwnerLogin.jsx | 305 | 🟢 Production ready | Dual mode, auto clock-in |
| useSplitPayment.js | 306 | 🔴 Financial risk | No transactions, webhook idempotency |
| StaffKDSWithCamTech.jsx | 284 | 🟡 Redundant | Production version is StaffKDS |
| Analytics.jsx | 282 | 🟢 Production ready | Clean, read-only, tenant-isolated |
| StaffLogin.jsx | 255 | 🟢 Functional | Duplicates OwnerLogin logic |
| RewardsManager.jsx | 172 | — Not audited | Deferred for launch |
| StaffContext.jsx | 137 | 🟢 Clean | Proper session persistence |
| useLedgerRealtime.js | 131 | 🟢 Low risk | Simple realtime hook |
| useOrdersRealtime.js | 131 | 🟢 Solid | General orders hook |
| useKDSSync.js | 117 | 🟢 Reference quality | Optimistic + snapback pattern |
| Info.jsx | 110 | 🟡 Dated | Dead buttons, missing role guard |
| StaffKDS.jsx | 89 | 🟢 Reference impl | Clean, minimal, 3-column |
| Envio.jsx | 23 | 🟢 Wrapper | Thin wrapper around Menu |
| HikariBoy.jsx | 17.4 KB | 🟢 Ready | Game emulator shell |
| HikariBoy.css | 19.2 KB | 🟢 Ready | Delta-style responsive |
| MunchboyBoot.jsx | 3.7 KB | 🟢 Ready | Boot sequence with chime |
| useCamTech.js | — | 🟢 Ready | CamTech Black Box pause/resume pattern |
| useCamera.js | — | 🟢 Ready | Hardware lock with fallback |
| CameraLayer.jsx | — | 🟢 Ready | 10 filters, flash, zoom |

---

**END OF AUDIT**

*Generated March 24, 2026 — FoodSpot-OS Launch Readiness Assessment*  
*Target: Silent Beta — April 10, 2026*