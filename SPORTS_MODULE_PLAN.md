# FOODSPOT — SPORTS MODULE ("Deportes") INTEGRATION PLAN
**Target:** Pro sports sub-app inside FoodSpot ecosystem
**Schema base:** DATABASE_BIBLE_v3.0 (2026-07-02) → adds Migration **v3.1 Sports Module**
**Source app:** `courtclubapp-final` (React 19 + Tailwind, localStorage V1)
**Date:** 2026-07-22

---

## 0. THE BIG DECISION: Events vs. Sports (Mode Toggle)

You said *"replace the events for tournaments and rentals… in the backend we'd just have either the events or this function."*

**Recommendation: DO NOT overwrite the `events` tables.** They power live ticketing, QR check-in, promo codes, and revenue stats that already work in prod (22 events, 16 orders live). Instead:

- Add a **per-business mode flag** (`sports_settings.enabled`).
- The **home hero button** renders *either* `Eventos` *or* `Deportes` based on the flag (never both — keeps the 4-button home clean).
- Sports gets its **own parallel tables** (mirroring the events pattern: separate payment tracking + stat triggers), so nothing about food/events regresses.

This mirrors exactly how `event_orders` runs parallel to `orders` today. Zero drift, zero risk to the locked order FSM.

```
businesses.app_config.vertical = "food" | "sports"   (which hero button)
sports_settings.enabled = true                        (module on)
```

---

## 1. THE SUB-APP MAP (4 tabs + floating camera)

When a customer taps **Deportes**, they enter a self-contained app. Bottom nav = 4 buttons, camera floats center-elevated (white circle, like the food app).

| Nav button | Screen | Reads from | Writes to |
|-----------|--------|-----------|-----------|
| 🏆 **Torneos** | Tournament list → bracket → register | `tournaments`, `tournament_matches`, `tournament_teams` | `tournament_teams` (register) |
| 🎾 **Equipos** | Rental catalog → cart → checkout | `rental_items` | `rental_orders` |
| ⚽ **Mis Partidos** | My active matches, history, standings | `tournament_matches` + `tournament_teams` (by phone) | — (read) |
| 👤 **Mi Perfil** | Level, ranking, W/L, achievements, rented gear | `players`, `player_achievements` | `players` (edit name/avatar) |
| 📷 **Camera** (float) | Post-match selfie / highlight | reuses `el_momento_photos` + UGC engine | `el_momento_photos` (context='sports') |

---

## 2. SECTION-BY-SECTION SPEC

### 2.1 TORNEOS (Tournaments) — *revised to PRO*

**Source had:** one JSON blob (`clubConfig.tournaments`) with an embedded bracket, mutated in localStorage. No teams table, no per-player tracking.

**Pro upgrade:** normalize into 3 tables so the SAME data powers the bracket view, "Mis Partidos" standings, AND "Mi Perfil" win/loss stats.

**Screens:**
1. **List** — cards: name, category badge, date, status pill (`Registration Open`/`In Progress`/`Completed`), `Ver Torneo` + `Inscribirme`.
2. **Bracket** — rounds (Octavos → Cuartos → Semis → Final) rendered from `tournament_matches`. Read-only for customers.
3. **Register** — team name + captain phone + partner(s). Creates `tournament_teams` row → pays entry fee (MP or cash) → gets 6-digit `registration_code`.

**Data:** `tournaments` (event def + auto stats), `tournament_teams` (registrations/payments), `tournament_matches` (bracket, scores, winner, `next_match_id` for auto-advance).

**Admin (owner backend):**
- Create tournament (name, category, format, entry fee, max teams, dates).
- Bracket editor → `report_match_result(match_id, score, winner)` RPC atomically writes score, advances winner to next match, updates both teams' player stats.
- Change status (draft → registration_open → in_progress → completed).
- Export bracket PDF (reuse `jspdf`).

---

### 2.2 EQUIPOS (Rentals) — *revised to PRO shop*

**Source had:** `clubConfig.rentals = [{id,name,price,icon}]`, added inline during court checkout.

**Pro upgrade:** a real catalog with images, categories, favorites, stock, and its own cart → checkout (the "🛒 Carrito (2)" from the mockup).

**Screens:**
1. **Grid** (2-col) — item card: image, name, category tag, price, qty stepper, `Agregar`. Heart = favorite (client-side/localStorage, no table needed).
2. **Cart** — line items, subtotal, optional security deposit, total.
3. **Checkout** — MP preference OR cash-on-pickup → `rental_code` for pickup.

**Data:** `rental_items` (catalog + stock), `rental_orders` (cart snapshot + payment + pickup/return lifecycle).

**Merge-with-food option:** `rental_orders.linked_order_id` (nullable FK → `orders`). If a customer has food in their FoodSpot cart, rentals can be attached to one unified MP payment. Default path = standalone sports checkout.

**Admin:** CRUD catalog items + prices + stock; view active reservations; mark picked-up/returned.

---

### 2.3 MIS PARTIDOS (My Matches) — *NEW edition*

Not a new table — a **query layer** over tournaments, keyed by the customer's phone (same identity anchor as loyalty).

**Tabs inside:** `Activos` | `Historial` | `Torneos`
- **Activos** — matches where my team is `team_a`/`team_b` and status ∈ (scheduled, live). Shows opponent, court, time.
- **Historial** — completed matches with my result (W/L).
- **Torneos** — tournaments I'm registered in + my bracket position.

**RPC:** `get_my_matches(business_id, phone)` → `{ active[], history[], tournaments[] }`.

**Optional Phase 2 (pro padel-app vibe — "Host a Match / Join Match"):** `pickup_matches` table for casual open games. Included in the migration, flagged optional.

---

### 2.4 MI PERFIL (Player Profile) — *NEW edition*

**Mockup:** Alejandro Gómez · Nivel 4.5 · Ranking Local #12 · Partidos 45 / Victorias 30 / Derrotas 15 · Equipos Alquilados · Actividad Reciente (chart) · Logros.

**Identity:** phone-scoped, **per-business** (so "Ranking Local" is per club) — ties to the global `loyalty_accounts` phone for points.

**Data:**
- `players` — level, ranking_points, matches_played/won/lost (denormalized, trigger-maintained), avatar, display_name. `UNIQUE(business_id, phone)`.
- `player_achievements` — badges (champion_local, frequent_participant…), earned_at.
- **Rented gear** ("Equipos Alquilados") → query `rental_orders` by phone.
- **Activity chart** → query match + rental timestamps over time (no table).

**RPC:** `get_player_profile(business_id, phone)` → `{ player, stats, achievements[], rentals[], recent_activity[] }`.

**Stats stay honest:** `update_player_stats_on_match_complete` trigger fires when a match's winner is set → bumps W/L + ranking_points for every player on both teams. Mirrors the `recalc_event_stats` pattern.

---

### 2.5 CAMERA (floating) — *reuse, don't rebuild*

FoodSpot already owns CamTech v2.2+ and the UGC pipeline (`el_momento_photos`, `ugc_activations`, `auto_create_ugc_activation`). The sports camera = post-match selfie → save to `el_momento_photos` with `context='sports_match'` and optional `flyer_id = match_id`. **No new table.** Do NOT touch `CameraLayer.jsx` (locked per CLAUDE.md).

---

## 3. MONEY & PAYMENTS (follows the Events precedent)

- **Integer cents everywhere** (`*_cents INTEGER CHECK (>= 0)`) — no floats, matching Critical Rule #1.
- Tournament entry + rentals track their **own** `payment_status` (like `event_orders`), and revenue rolls up onto the parent (`tournaments.total_revenue_cents`) via trigger — identical to `recalc_event_stats`.
- **Cash path:** `record_sports_cash_payment(...)` — clone of the proven idempotent `record_cash_payment` RPC (deterministic `sports-<kind>-<id>` idempotency key, reads amount from DB, SECURITY DEFINER, tenant check). Also writes a `transaction_ledger` row so **corte de caja** still balances.
- **MP path:** two new edge functions cloned from the existing pattern — `create-tournament-preference`, `create-rental-preference` + reuse `mp-webhook` routing by `external_reference` prefix (`TOURNAMENT-…`, `RENTAL-…`).

---

## 4. SECURITY (RLS — the 3 house patterns, unchanged)

| Access | Pattern | Applied to |
|--------|---------|-----------|
| Owner web (authed) | `business_id IN (SELECT id FROM businesses WHERE owner_id = auth.uid())` | all writes/admin reads |
| Staff-ops (header) | `business_id = (headers ->> 'x-business-id')::uuid` | tournament check-in, rental pickup |
| Customer (guest) | `guest_token = headers ->> 'x-guest-token' AND business_id = …` | read own registration / rental order |
| Public read | `USING (true)` filtered to live+not-deleted | tournament list, rental catalog, leaderboard |
| Public insert | anon key | register team, create rental order |

Every table: `business_id UUID FK businesses(id) ON DELETE CASCADE`, `created_at/updated_at`, soft delete where audit matters, indexes on `business_id`/`status`/`guest_token`.

---

## 5. MIGRATION v3.1 — TABLE INVENTORY (9 tables, 2 views)

| # | Table | Purpose | Money cols |
|---|-------|---------|-----------|
| 67 | `sports_settings` | per-business module config + mode flag | — |
| 68 | `rental_items` | equipment catalog + stock | `price_cents`, `deposit_cents` |
| 69 | `rental_orders` | rental checkout + pickup/return | `subtotal_cents`, `deposit_cents`, `total_cents` |
| 70 | `tournaments` | tournament defs + auto stats | `entry_fee_cents`, `prize_pool_cents`, `total_revenue_cents` |
| 71 | `tournament_teams` | registrations + entry payment | `entry_fee_cents` |
| 72 | `tournament_matches` | bracket, scores, advance | — |
| 73 | `players` | per-club player profile + stats | — |
| 74 | `player_achievements` | badges | — |
| 75 | `pickup_matches` *(Phase 2)* | casual "host/join a match" | `cost_per_player_cents` |
| VIEW | `tournaments_active` | live + not deleted | — |
| VIEW | `player_leaderboard` | ranking per business | — |

**RPCs:** `register_tournament_team`, `checkin_tournament_team`, `report_match_result`, `create_rental_reservation`, `record_sports_cash_payment`, `get_player_profile`, `get_my_matches`, `get_tournament_bracket`.

**Triggers:** `touch_updated_at` (generic), `recalc_tournament_stats`, `advance_bracket_on_match_complete`, `update_player_stats_on_match_complete`, `decrement_rental_stock_on_paid`, `upsert_player_on_registration`.

Full DDL → **`sports_module_v3.1.sql`** (ready to run in Supabase SQL editor, idempotent with `IF NOT EXISTS`).

---

## 6. FRONTEND FILE MAP (from courtclubapp-final → FoodSpot)

| Court Club file | FoodSpot destination | Action |
|-----------------|---------------------|--------|
| `views/Torneos.jsx`, `TorneoBracket.jsx` | `src/pages/customer/sports/` | port, swap localStorage→Supabase |
| `api/tournamentApi.js` | `src/api/tournamentsApi.js` | rewrite for Supabase RPCs |
| rentals from `clubConfig` + `CheckIn.jsx` rental block | new `RentalShop.jsx` | rebuild as catalog+cart |
| `MiActividad.jsx` | `MisPartidos.jsx` | revise → query by phone |
| *(new)* | `MiPerfil.jsx` | new pro screen |
| `BottomNav.jsx` | `SportsNav.jsx` | 4 tabs + floating camera |
| `components/SelfieTime.jsx` | reuse FoodSpot CamTech | wire `context='sports'` |
| `data/clubConfig.js` | Supabase (`sports_settings`+tables) | migrate, drop hardcode |
| `engines/camtech/**` | ❌ skip | FoodSpot has better |
| food views/apis | ❌ skip | FoodSpot owns food |

Routing: add under `/:tenantSlug/sports/*` in the main React Router (do **not** merge Court Club's `App.jsx`).

---

## 7. BUILD PHASES

1. **DB** — run `sports_module_v3.1.sql` (tables + RLS + triggers + RPCs). *(this deliverable)*
2. **Edge functions** — clone `create-tournament-preference`, `create-rental-preference`; extend `mp-webhook` routing.
3. **Customer UI** — Deportes shell + 4 tabs + floating camera; wire APIs.
4. **Owner backend** — tournament CRUD, bracket editor, rental catalog, mode toggle.
5. **QA** — multi-tenant isolation, integer-cents checks, cash+MP reconciliation, mobile 375px.

---

**END OF PLAN** — SQL in `sports_module_v3.1.sql`.
