-- ============================================================================
-- FOODSPOT — MIGRATION v3.1  "SPORTS MODULE" (Deportes sub-app)
-- ----------------------------------------------------------------------------
-- Base: DATABASE_BIBLE_v3.0 (2026-07-02). Adds 9 tables + 2 views + triggers
-- + RPCs for the Deportes vertical (Tournaments, Rentals, Player Profiles,
-- My Matches). Parallel to Events — does NOT touch orders/events/loyalty FSMs.
--
-- CONVENTIONS HONORED (from the bible):
--   • business_id UUID FK businesses(id) ON DELETE CASCADE on every table
--   • INTEGER CENTS only for money  (*_cents INTEGER CHECK (>= 0))
--   • Soft delete (is_deleted/deleted_at) where audit matters
--   • Status via CHECK constraints
--   • 3 RLS patterns: owner (auth.uid), staff-ops (x-business-id header),
--     guest isolation (x-guest-token header) + public read/insert
--   • Stat aggregates maintained by triggers (mirrors recalc_event_stats)
--   • Cash settlement mirrors record_cash_payment: SECURITY DEFINER,
--     search_path=public, reads amount from DB, idempotency_key, writes
--     transaction_ledger so corte de caja stays balanced
--
-- IDEMPOTENT: safe to re-run (IF NOT EXISTS / DROP POLICY IF EXISTS / CREATE OR
-- REPLACE). Run in Supabase SQL editor against project buendqgmwpxdixwvlkhd.
-- ============================================================================


-- ############################################################################
-- SECTION 0 — MODE TOGGLE (which hero button: Eventos vs Deportes)
-- ############################################################################
-- One config row per business, mirrors loyalty_settings / delivery_settings /
-- ugc_activations. The home hero renders "Deportes" when enabled, else the
-- existing "Eventos" button. Nothing is overwritten.

CREATE TABLE IF NOT EXISTS sports_settings (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id               UUID UNIQUE NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  enabled                   BOOLEAN NOT NULL DEFAULT false,
  -- which vertical drives the 4th hero button ('events' keeps current behavior)
  hero_button_label         TEXT NOT NULL DEFAULT 'Deportes',
  sport_types               TEXT[] NOT NULL DEFAULT ARRAY['padel']::text[],  -- padel, tennis, soccer, basket...
  -- feature switches inside the sub-app
  tournaments_enabled       BOOLEAN NOT NULL DEFAULT true,
  rentals_enabled           BOOLEAN NOT NULL DEFAULT true,
  player_profiles_enabled   BOOLEAN NOT NULL DEFAULT true,
  camera_enabled            BOOLEAN NOT NULL DEFAULT true,
  pickup_matches_enabled    BOOLEAN NOT NULL DEFAULT false,   -- Phase 2
  -- theming (the emerald/lime from the mockups)
  primary_color             VARCHAR(7) NOT NULL DEFAULT '#10B981',
  accent_color              VARCHAR(7) NOT NULL DEFAULT '#84CC16',
  created_at                TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at                TIMESTAMPTZ NOT NULL DEFAULT now()
);


-- ############################################################################
-- SECTION 1 — EQUIPOS (Rentals): catalog + checkout
-- ############################################################################

-- 1a. rental_items — the equipment catalog (the "Equipos" grid)
CREATE TABLE IF NOT EXISTS rental_items (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id       UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  name              TEXT NOT NULL,
  description       TEXT,
  category          TEXT NOT NULL DEFAULT 'accessory'
                      CONSTRAINT rental_items_category_valid
                      CHECK (category IN ('racket','balls','shoes','apparel','accessory','other')),
  -- money (integer cents, ARS minor units)
  price_cents       INTEGER NOT NULL DEFAULT 0
                      CONSTRAINT rental_items_price_cents_valid CHECK (price_cents >= 0),
  deposit_cents     INTEGER NOT NULL DEFAULT 0
                      CONSTRAINT rental_items_deposit_cents_valid CHECK (deposit_cents >= 0),
  rental_unit       TEXT NOT NULL DEFAULT 'per_session'
                      CONSTRAINT rental_items_unit_valid
                      CHECK (rental_unit IN ('per_session','per_hour','per_day')),
  -- media
  icon              TEXT,
  image_url         TEXT,
  -- inventory
  stock_total       INTEGER NOT NULL DEFAULT 0 CHECK (stock_total >= 0),
  stock_available   INTEGER NOT NULL DEFAULT 0 CHECK (stock_available >= 0),
  is_available      BOOLEAN NOT NULL DEFAULT true,
  sort_order        INTEGER NOT NULL DEFAULT 0,
  -- soft delete
  is_deleted        BOOLEAN NOT NULL DEFAULT false,
  deleted_at        TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_rental_items_business    ON rental_items (business_id);
CREATE INDEX IF NOT EXISTS idx_rental_items_available   ON rental_items (business_id, is_available, is_deleted);

-- 1b. rental_orders — a customer's rental cart checkout + pickup/return lifecycle
CREATE TABLE IF NOT EXISTS rental_orders (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id       UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  -- customer
  customer_name     TEXT,
  customer_phone    TEXT,
  -- immutable line-item snapshot: [{rental_item_id, name, price_cents, deposit_cents, quantity}]
  items             JSONB NOT NULL DEFAULT '[]',
  -- money (integer cents)
  subtotal_cents    INTEGER NOT NULL DEFAULT 0 CONSTRAINT rental_orders_subtotal_valid CHECK (subtotal_cents >= 0),
  deposit_cents     INTEGER NOT NULL DEFAULT 0 CONSTRAINT rental_orders_deposit_valid  CHECK (deposit_cents >= 0),
  total_cents       INTEGER NOT NULL DEFAULT 0 CONSTRAINT rental_orders_total_valid    CHECK (total_cents >= 0),
  currency          VARCHAR(3) NOT NULL DEFAULT 'ARS',
  -- payment (parallel to event_orders.payment_status)
  payment_status    TEXT NOT NULL DEFAULT 'pending'
                      CONSTRAINT rental_orders_payment_status_valid
                      CHECK (payment_status IN ('pending','paid','refunded','cancelled')),
  payment_method    TEXT,
  mp_preference_id  TEXT,
  mp_payment_id     TEXT,
  -- optional bridge: attach to a food order for ONE unified MP payment
  linked_order_id   UUID REFERENCES orders(id) ON DELETE SET NULL,
  -- pickup lifecycle
  status            TEXT NOT NULL DEFAULT 'reserved'
                      CONSTRAINT rental_orders_status_valid
                      CHECK (status IN ('reserved','picked_up','returned','overdue','cancelled')),
  rental_code       TEXT NOT NULL,        -- 6-digit pickup code (unique per business)
  reserved_for      DATE,
  picked_up_at      TIMESTAMPTZ,
  returned_at       TIMESTAMPTZ,
  -- guest session (customer receipt view)
  guest_token       TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  -- soft delete
  is_deleted        BOOLEAN NOT NULL DEFAULT false,
  deleted_at        TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT rental_orders_code_unique UNIQUE (business_id, rental_code)
);
CREATE INDEX IF NOT EXISTS idx_rental_orders_business ON rental_orders (business_id);
CREATE INDEX IF NOT EXISTS idx_rental_orders_guest    ON rental_orders (business_id, guest_token);
CREATE INDEX IF NOT EXISTS idx_rental_orders_phone    ON rental_orders (business_id, customer_phone);
CREATE INDEX IF NOT EXISTS idx_rental_orders_status   ON rental_orders (business_id, status);


-- ############################################################################
-- SECTION 2 — TORNEOS (Tournaments): defs + teams + bracket
-- ############################################################################

-- 2a. tournaments — mirrors `events` (definition + auto-maintained stats)
CREATE TABLE IF NOT EXISTS tournaments (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id           UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  name                  TEXT NOT NULL,
  description           TEXT,
  sport_type            TEXT NOT NULL DEFAULT 'padel',
  category              TEXT NOT NULL DEFAULT 'Mixto',        -- Mixto / Masculino / Femenino
  skill_level           TEXT,                                 -- e.g. "4.0+"
  format                TEXT NOT NULL DEFAULT 'single_elim'
                          CONSTRAINT tournaments_format_valid
                          CHECK (format IN ('single_elim','double_elim','round_robin','americano')),
  team_size             INTEGER NOT NULL DEFAULT 2 CHECK (team_size >= 1),   -- 1 singles, 2 doubles
  max_teams             INTEGER NOT NULL DEFAULT 16 CHECK (max_teams >= 2),
  -- schedule
  start_date            TIMESTAMPTZ NOT NULL,
  end_date              TIMESTAMPTZ,
  registration_opens_at TIMESTAMPTZ,
  registration_closes_at TIMESTAMPTZ,
  -- money (integer cents)
  entry_fee_cents       INTEGER NOT NULL DEFAULT 0 CONSTRAINT tournaments_entry_fee_valid  CHECK (entry_fee_cents >= 0),
  prize_pool_cents      INTEGER NOT NULL DEFAULT 0 CONSTRAINT tournaments_prize_pool_valid CHECK (prize_pool_cents >= 0),
  is_free               BOOLEAN NOT NULL DEFAULT false,
  currency              VARCHAR(3) NOT NULL DEFAULT 'ARS',
  -- venue + media
  venue_name            TEXT,
  address               TEXT,
  image_url             TEXT,
  share_image_url       TEXT,
  registration_whatsapp BOOLEAN NOT NULL DEFAULT true,
  -- auto-maintained stats (by recalc_tournament_stats trigger)
  teams_registered      INTEGER NOT NULL DEFAULT 0,
  matches_total         INTEGER NOT NULL DEFAULT 0,
  matches_completed     INTEGER NOT NULL DEFAULT 0,
  total_revenue_cents   INTEGER NOT NULL DEFAULT 0,
  -- status (customer sees registration_open / in_progress / completed)
  status                TEXT NOT NULL DEFAULT 'draft'
                          CONSTRAINT tournaments_status_valid
                          CHECK (status IN ('draft','registration_open','in_progress','completed','cancelled')),
  -- soft delete
  is_deleted            BOOLEAN NOT NULL DEFAULT false,
  deleted_at            TIMESTAMPTZ,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_tournaments_business   ON tournaments (business_id);
CREATE INDEX IF NOT EXISTS idx_tournaments_status     ON tournaments (business_id, status, is_deleted);
CREATE INDEX IF NOT EXISTS idx_tournaments_start_date ON tournaments (start_date);

-- 2b. tournament_teams — registrations + entry payment (parallel to event_orders)
CREATE TABLE IF NOT EXISTS tournament_teams (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id           UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  tournament_id         UUID NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  team_name             TEXT NOT NULL,
  captain_name          TEXT,
  captain_phone         TEXT,               -- identity anchor (ties to loyalty + players)
  players               JSONB NOT NULL DEFAULT '[]',   -- [{name, phone}]
  seed                  INTEGER,
  -- entry payment
  entry_fee_cents       INTEGER NOT NULL DEFAULT 0 CONSTRAINT tournament_teams_fee_valid CHECK (entry_fee_cents >= 0),
  entry_payment_status  TEXT NOT NULL DEFAULT 'pending'
                          CONSTRAINT tournament_teams_payment_valid
                          CHECK (entry_payment_status IN ('pending','paid','refunded','cancelled')),
  payment_method        TEXT,
  mp_preference_id      TEXT,
  mp_payment_id         TEXT,
  -- registration lifecycle
  status                TEXT NOT NULL DEFAULT 'registered'
                          CONSTRAINT tournament_teams_status_valid
                          CHECK (status IN ('registered','confirmed','checked_in','eliminated','withdrawn')),
  registration_code     TEXT NOT NULL,      -- 6-digit
  guest_token           TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  checked_in_at         TIMESTAMPTZ,
  checked_in_by         UUID,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT tournament_teams_code_unique UNIQUE (tournament_id, registration_code)
);
CREATE INDEX IF NOT EXISTS idx_tteams_tournament ON tournament_teams (tournament_id);
CREATE INDEX IF NOT EXISTS idx_tteams_business   ON tournament_teams (business_id);
CREATE INDEX IF NOT EXISTS idx_tteams_phone      ON tournament_teams (business_id, captain_phone);
CREATE INDEX IF NOT EXISTS idx_tteams_guest      ON tournament_teams (business_id, guest_token);

-- 2c. tournament_matches — the bracket (normalized, powers bracket+standings+stats)
CREATE TABLE IF NOT EXISTS tournament_matches (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id       UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  tournament_id     UUID NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  round_number      INTEGER NOT NULL DEFAULT 1,
  round_name        TEXT,                    -- Octavos / Cuartos / Semifinal / Final
  match_number      INTEGER NOT NULL DEFAULT 1,
  -- teams (nullable = "Por definir"); denormalized names for fast display
  team_a_id         UUID REFERENCES tournament_teams(id) ON DELETE SET NULL,
  team_b_id         UUID REFERENCES tournament_teams(id) ON DELETE SET NULL,
  team_a_name       TEXT DEFAULT 'Por definir',
  team_b_name       TEXT DEFAULT 'Por definir',
  -- scheduling
  court_label       TEXT,
  scheduled_at      TIMESTAMPTZ,
  -- result
  score             TEXT,                    -- "6-4, 6-3"
  winner            TEXT CONSTRAINT tournament_matches_winner_valid CHECK (winner IN ('A','B') OR winner IS NULL),
  status            TEXT NOT NULL DEFAULT 'pending'
                      CONSTRAINT tournament_matches_status_valid
                      CHECK (status IN ('pending','scheduled','live','completed')),
  -- bracket advancement: winner flows into this match
  next_match_id     UUID REFERENCES tournament_matches(id) ON DELETE SET NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_tmatches_tournament ON tournament_matches (tournament_id, round_number, match_number);
CREATE INDEX IF NOT EXISTS idx_tmatches_business   ON tournament_matches (business_id);
CREATE INDEX IF NOT EXISTS idx_tmatches_teams      ON tournament_matches (team_a_id, team_b_id);


-- ############################################################################
-- SECTION 3 — MI PERFIL (Player profiles) — per-club, phone-scoped
-- ############################################################################

-- 3a. players — local ranking + W/L stats (ties to global loyalty via phone)
CREATE TABLE IF NOT EXISTS players (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id       UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  phone             TEXT NOT NULL,
  display_name      TEXT,
  avatar_url        TEXT,
  skill_level       NUMERIC(3,1) DEFAULT 3.0,          -- e.g. 4.5
  ranking_points    INTEGER NOT NULL DEFAULT 0,        -- drives "Ranking Local"
  matches_played    INTEGER NOT NULL DEFAULT 0 CHECK (matches_played >= 0),
  matches_won       INTEGER NOT NULL DEFAULT 0 CHECK (matches_won >= 0),
  matches_lost      INTEGER NOT NULL DEFAULT 0 CHECK (matches_lost >= 0),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT players_business_phone_unique UNIQUE (business_id, phone)
);
CREATE INDEX IF NOT EXISTS idx_players_business ON players (business_id);
CREATE INDEX IF NOT EXISTS idx_players_ranking  ON players (business_id, ranking_points DESC);

-- 3b. player_achievements — badges (Logros)
CREATE TABLE IF NOT EXISTS player_achievements (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id       UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  player_id         UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  achievement_key   TEXT NOT NULL,          -- champion_local, frequent_participant, ...
  label             TEXT,
  icon              TEXT,
  metadata          JSONB NOT NULL DEFAULT '{}',
  earned_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT player_achievements_unique UNIQUE (player_id, achievement_key)
);
CREATE INDEX IF NOT EXISTS idx_player_achievements_player ON player_achievements (player_id);


-- ############################################################################
-- SECTION 4 — PICKUP MATCHES (Phase 2, optional "Host a Match / Join Match")
-- ############################################################################
CREATE TABLE IF NOT EXISTS pickup_matches (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id           UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  title                 TEXT NOT NULL,
  host_name             TEXT,
  host_phone            TEXT,
  skill_level           TEXT,               -- "Level 3.5", "All Skills"
  court_label           TEXT,
  scheduled_at          TIMESTAMPTZ NOT NULL,
  slots_total           INTEGER NOT NULL DEFAULT 4 CHECK (slots_total >= 1),
  slots_filled          INTEGER NOT NULL DEFAULT 0 CHECK (slots_filled >= 0),
  cost_per_player_cents  INTEGER NOT NULL DEFAULT 0 CHECK (cost_per_player_cents >= 0),
  participants          JSONB NOT NULL DEFAULT '[]',   -- [{name, phone}]
  status                TEXT NOT NULL DEFAULT 'open'
                          CONSTRAINT pickup_matches_status_valid
                          CHECK (status IN ('open','full','completed','cancelled')),
  is_deleted            BOOLEAN NOT NULL DEFAULT false,
  deleted_at            TIMESTAMPTZ,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_pickup_business ON pickup_matches (business_id, status, scheduled_at);


-- ############################################################################
-- SECTION 5 — VIEWS (customer-facing filters + leaderboard)
-- ############################################################################

-- Live tournaments only (registration_open / in_progress), not deleted
CREATE OR REPLACE VIEW tournaments_active AS
  SELECT * FROM tournaments
  WHERE is_deleted = false
    AND status IN ('registration_open','in_progress','completed');

-- Ranking Local: ordered leaderboard per business
CREATE OR REPLACE VIEW player_leaderboard AS
  SELECT
    p.business_id,
    p.id           AS player_id,
    p.display_name,
    p.phone,
    p.skill_level,
    p.ranking_points,
    p.matches_played,
    p.matches_won,
    p.matches_lost,
    RANK() OVER (PARTITION BY p.business_id ORDER BY p.ranking_points DESC, p.matches_won DESC) AS local_rank
  FROM players p;


-- ############################################################################
-- SECTION 6 — GENERIC updated_at TOUCHER
-- ############################################################################
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'sports_settings','rental_items','rental_orders','tournaments',
    'tournament_teams','tournament_matches','players','pickup_matches'
  ] LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trg_touch_%1$s ON %1$s;', t);
    EXECUTE format(
      'CREATE TRIGGER trg_touch_%1$s BEFORE UPDATE ON %1$s
         FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();', t);
  END LOOP;
END$$;


-- ############################################################################
-- SECTION 7 — STAT / BRACKET / PLAYER-STATS TRIGGERS  (mirror recalc_event_stats)
-- ############################################################################

-- 7a. Recompute tournament aggregates from teams + matches
CREATE OR REPLACE FUNCTION public.recalc_tournament_stats()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_tid UUID;
BEGIN
  v_tid := COALESCE(NEW.tournament_id, OLD.tournament_id);
  IF v_tid IS NULL THEN RETURN COALESCE(NEW, OLD); END IF;

  UPDATE tournaments t SET
    teams_registered = (
      SELECT count(*) FROM tournament_teams
      WHERE tournament_id = v_tid AND status <> 'withdrawn'
    ),
    total_revenue_cents = (
      SELECT COALESCE(sum(entry_fee_cents),0) FROM tournament_teams
      WHERE tournament_id = v_tid AND entry_payment_status = 'paid'
    ),
    matches_total = (
      SELECT count(*) FROM tournament_matches WHERE tournament_id = v_tid
    ),
    matches_completed = (
      SELECT count(*) FROM tournament_matches WHERE tournament_id = v_tid AND status = 'completed'
    ),
    updated_at = now()
  WHERE t.id = v_tid;

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_recalc_tstats_teams   ON tournament_teams;
CREATE TRIGGER trg_recalc_tstats_teams
  AFTER INSERT OR UPDATE OR DELETE ON tournament_teams
  FOR EACH ROW EXECUTE FUNCTION public.recalc_tournament_stats();

DROP TRIGGER IF EXISTS trg_recalc_tstats_matches ON tournament_matches;
CREATE TRIGGER trg_recalc_tstats_matches
  AFTER INSERT OR UPDATE OR DELETE ON tournament_matches
  FOR EACH ROW EXECUTE FUNCTION public.recalc_tournament_stats();

-- 7b. Player-stat helpers (bump one phone, then a whole team)
CREATE OR REPLACE FUNCTION public._bump_player(
  p_business_id UUID, p_phone TEXT, p_name TEXT, p_won BOOLEAN
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO players (business_id, phone, display_name,
                       matches_played, matches_won, matches_lost, ranking_points)
  VALUES (p_business_id, p_phone, COALESCE(NULLIF(p_name,''),'Jugador'),
          1,
          CASE WHEN p_won THEN 1 ELSE 0 END,
          CASE WHEN p_won THEN 0 ELSE 1 END,
          CASE WHEN p_won THEN 30 ELSE 10 END)
  ON CONFLICT (business_id, phone) DO UPDATE SET
    matches_played = players.matches_played + 1,
    matches_won    = players.matches_won  + CASE WHEN p_won THEN 1 ELSE 0 END,
    matches_lost   = players.matches_lost + CASE WHEN p_won THEN 0 ELSE 1 END,
    ranking_points = players.ranking_points + CASE WHEN p_won THEN 30 ELSE 10 END,
    display_name   = COALESCE(NULLIF(EXCLUDED.display_name,'Jugador'), players.display_name),
    updated_at     = now();
END;
$$;

CREATE OR REPLACE FUNCTION public._apply_team_player_stats(
  p_business_id UUID, p_team_id UUID, p_won BOOLEAN
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_team   RECORD;
  v_player JSONB;
  v_phone  TEXT;
BEGIN
  SELECT captain_phone, captain_name, players INTO v_team
  FROM tournament_teams WHERE id = p_team_id;
  IF NOT FOUND THEN RETURN; END IF;

  IF v_team.captain_phone IS NOT NULL AND length(trim(v_team.captain_phone)) > 0 THEN
    PERFORM _bump_player(p_business_id, v_team.captain_phone, v_team.captain_name, p_won);
  END IF;

  IF v_team.players IS NOT NULL AND jsonb_typeof(v_team.players) = 'array' THEN
    FOR v_player IN SELECT * FROM jsonb_array_elements(v_team.players) LOOP
      v_phone := v_player->>'phone';
      IF v_phone IS NOT NULL AND length(trim(v_phone)) > 0
         AND v_phone IS DISTINCT FROM v_team.captain_phone THEN
        PERFORM _bump_player(p_business_id, v_phone, v_player->>'name', p_won);
      END IF;
    END LOOP;
  END IF;
END;
$$;

-- 7c. On match completion: advance winner to next match + update player stats
CREATE OR REPLACE FUNCTION public.on_match_completed()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_win_id    UUID;
  v_win_name  TEXT;
  v_lose_id   UUID;
BEGIN
  -- only when a match freshly becomes completed with a winner
  IF NEW.status = 'completed' AND NEW.winner IS NOT NULL
     AND (OLD.status IS DISTINCT FROM 'completed') THEN

    IF NEW.winner = 'A' THEN
      v_win_id := NEW.team_a_id; v_win_name := NEW.team_a_name; v_lose_id := NEW.team_b_id;
    ELSE
      v_win_id := NEW.team_b_id; v_win_name := NEW.team_b_name; v_lose_id := NEW.team_a_id;
    END IF;

    -- mark loser eliminated
    IF v_lose_id IS NOT NULL THEN
      UPDATE tournament_teams SET status = 'eliminated', updated_at = now()
      WHERE id = v_lose_id AND status NOT IN ('withdrawn');
    END IF;

    -- advance winner into the open slot of the next match
    IF NEW.next_match_id IS NOT NULL AND v_win_id IS NOT NULL THEN
      UPDATE tournament_matches
        SET team_a_id = v_win_id, team_a_name = v_win_name, updated_at = now()
        WHERE id = NEW.next_match_id AND team_a_id IS NULL;

      UPDATE tournament_matches
        SET team_b_id = v_win_id, team_b_name = v_win_name, updated_at = now()
        WHERE id = NEW.next_match_id AND team_b_id IS NULL
          AND team_a_id IS DISTINCT FROM v_win_id;
    END IF;

    -- update per-player W/L + ranking
    IF v_win_id  IS NOT NULL THEN PERFORM _apply_team_player_stats(NEW.business_id, v_win_id,  true);  END IF;
    IF v_lose_id IS NOT NULL THEN PERFORM _apply_team_player_stats(NEW.business_id, v_lose_id, false); END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_on_match_completed ON tournament_matches;
CREATE TRIGGER trg_on_match_completed
  AFTER UPDATE ON tournament_matches
  FOR EACH ROW EXECUTE FUNCTION public.on_match_completed();

-- 7d. Decrement rental stock when a rental order is paid (best-effort, never < 0)
CREATE OR REPLACE FUNCTION public.decrement_rental_stock_on_paid()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_line JSONB;
BEGIN
  IF NEW.payment_status = 'paid' AND OLD.payment_status IS DISTINCT FROM 'paid' THEN
    IF NEW.items IS NOT NULL AND jsonb_typeof(NEW.items) = 'array' THEN
      FOR v_line IN SELECT * FROM jsonb_array_elements(NEW.items) LOOP
        UPDATE rental_items
          SET stock_available = GREATEST(0, stock_available - COALESCE((v_line->>'quantity')::int, 1)),
              updated_at = now()
          WHERE id = (v_line->>'rental_item_id')::uuid
            AND business_id = NEW.business_id;
      END LOOP;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_rental_stock ON rental_orders;
CREATE TRIGGER trg_rental_stock
  AFTER UPDATE ON rental_orders
  FOR EACH ROW EXECUTE FUNCTION public.decrement_rental_stock_on_paid();


-- ############################################################################
-- SECTION 8 — RPCs
-- ############################################################################

-- Helper: 6-digit code generator
CREATE OR REPLACE FUNCTION public._gen_sports_code()
RETURNS TEXT LANGUAGE sql VOLATILE AS $$
  SELECT lpad((floor(random()*1000000))::int::text, 6, '0');
$$;

-- 8a. register_tournament_team — creates a team; entry fee read from tournament (no client forgery)
CREATE OR REPLACE FUNCTION public.register_tournament_team(
  p_business_id   UUID,
  p_tournament_id UUID,
  p_team_name     TEXT,
  p_captain_name  TEXT,
  p_captain_phone TEXT,
  p_players       JSONB DEFAULT '[]',
  p_guest_token   TEXT DEFAULT NULL
) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_t     RECORD;
  v_code  TEXT;
  v_id    UUID;
  v_tries INT := 0;
BEGIN
  SELECT id, entry_fee_cents, is_free, max_teams, teams_registered, status
    INTO v_t
  FROM tournaments
  WHERE id = p_tournament_id AND business_id = p_business_id AND is_deleted = false;

  IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'error', 'tournament_not_found'); END IF;
  IF v_t.status <> 'registration_open' THEN
    RETURN jsonb_build_object('success', false, 'error', 'registration_closed');
  END IF;
  IF v_t.teams_registered >= v_t.max_teams THEN
    RETURN jsonb_build_object('success', false, 'error', 'tournament_full');
  END IF;

  LOOP
    v_code := _gen_sports_code();
    v_tries := v_tries + 1;
    EXIT WHEN NOT EXISTS (
      SELECT 1 FROM tournament_teams WHERE tournament_id = p_tournament_id AND registration_code = v_code
    ) OR v_tries > 10;
  END LOOP;

  INSERT INTO tournament_teams (
    business_id, tournament_id, team_name, captain_name, captain_phone, players,
    entry_fee_cents, entry_payment_status, registration_code, guest_token
  ) VALUES (
    p_business_id, p_tournament_id, p_team_name, p_captain_name, p_captain_phone,
    COALESCE(p_players,'[]'::jsonb),
    v_t.entry_fee_cents,
    CASE WHEN v_t.is_free OR v_t.entry_fee_cents = 0 THEN 'paid' ELSE 'pending' END,
    v_code,
    COALESCE(p_guest_token, gen_random_uuid()::text)
  ) RETURNING id INTO v_id;

  RETURN jsonb_build_object(
    'success', true, 'team_id', v_id, 'registration_code', v_code,
    'entry_fee_cents', v_t.entry_fee_cents,
    'payment_required', (NOT v_t.is_free AND v_t.entry_fee_cents > 0)
  );
END;
$$;

-- 8b. create_rental_reservation — totals computed server-side from rental_items
CREATE OR REPLACE FUNCTION public.create_rental_reservation(
  p_business_id   UUID,
  p_customer_name TEXT,
  p_customer_phone TEXT,
  p_items         JSONB,             -- [{rental_item_id, quantity}]
  p_reserved_for  DATE DEFAULT NULL,
  p_guest_token   TEXT DEFAULT NULL
) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_line     JSONB;
  v_item     RECORD;
  v_qty      INT;
  v_subtotal INT := 0;
  v_deposit  INT := 0;
  v_snapshot JSONB := '[]'::jsonb;
  v_code     TEXT;
  v_id       UUID;
  v_tries    INT := 0;
BEGIN
  IF p_items IS NULL OR jsonb_typeof(p_items) <> 'array' OR jsonb_array_length(p_items) = 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'empty_cart');
  END IF;

  FOR v_line IN SELECT * FROM jsonb_array_elements(p_items) LOOP
    v_qty := GREATEST(1, COALESCE((v_line->>'quantity')::int, 1));
    SELECT id, name, price_cents, deposit_cents, is_available, stock_available
      INTO v_item
    FROM rental_items
    WHERE id = (v_line->>'rental_item_id')::uuid
      AND business_id = p_business_id AND is_deleted = false;

    IF NOT FOUND OR v_item.is_available = false THEN
      RETURN jsonb_build_object('success', false, 'error', 'item_unavailable',
                                'item_id', v_line->>'rental_item_id');
    END IF;

    v_subtotal := v_subtotal + (v_item.price_cents   * v_qty);
    v_deposit  := v_deposit  + (v_item.deposit_cents * v_qty);
    v_snapshot := v_snapshot || jsonb_build_object(
      'rental_item_id', v_item.id, 'name', v_item.name,
      'price_cents', v_item.price_cents, 'deposit_cents', v_item.deposit_cents,
      'quantity', v_qty
    );
  END LOOP;

  LOOP
    v_code := _gen_sports_code();
    v_tries := v_tries + 1;
    EXIT WHEN NOT EXISTS (
      SELECT 1 FROM rental_orders WHERE business_id = p_business_id AND rental_code = v_code
    ) OR v_tries > 10;
  END LOOP;

  INSERT INTO rental_orders (
    business_id, customer_name, customer_phone, items,
    subtotal_cents, deposit_cents, total_cents,
    payment_status, status, rental_code, reserved_for, guest_token
  ) VALUES (
    p_business_id, p_customer_name, p_customer_phone, v_snapshot,
    v_subtotal, v_deposit, v_subtotal + v_deposit,
    'pending', 'reserved', v_code, p_reserved_for,
    COALESCE(p_guest_token, gen_random_uuid()::text)
  ) RETURNING id INTO v_id;

  RETURN jsonb_build_object(
    'success', true, 'rental_order_id', v_id, 'rental_code', v_code,
    'subtotal_cents', v_subtotal, 'deposit_cents', v_deposit,
    'total_cents', v_subtotal + v_deposit
  );
END;
$$;

-- 8c. record_sports_cash_payment — idempotent cash settlement (clone of record_cash_payment)
--     Reads amount from DB, writes transaction_ledger so corte de caja balances.
CREATE OR REPLACE FUNCTION public.record_sports_cash_payment(
  p_business_id    UUID,
  p_kind           TEXT,              -- 'tournament' | 'rental'
  p_id             UUID,              -- tournament_teams.id or rental_orders.id
  p_payment_method TEXT DEFAULT 'cash',
  p_currency       TEXT DEFAULT 'ARS'
) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_gross INTEGER;
  v_key   TEXT;
  v_ref   TEXT;
BEGIN
  v_key := 'sports-' || p_kind || '-' || p_id::text;
  v_ref := 'SPORTS-' || upper(p_kind) || '-' || p_id::text;

  -- amount read from DB (never trust client), tenant-scoped
  IF p_kind = 'tournament' THEN
    SELECT entry_fee_cents INTO v_gross FROM tournament_teams
    WHERE id = p_id AND business_id = p_business_id;
  ELSIF p_kind = 'rental' THEN
    SELECT total_cents INTO v_gross FROM rental_orders
    WHERE id = p_id AND business_id = p_business_id;
  ELSE
    RETURN jsonb_build_object('success', false, 'error', 'bad_kind');
  END IF;

  IF v_gross IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'entity_not_found');
  END IF;

  -- idempotency
  IF EXISTS (SELECT 1 FROM transaction_ledger WHERE idempotency_key = v_key) THEN
    -- still make sure the entity reflects paid
    IF p_kind = 'tournament' THEN
      UPDATE tournament_teams SET entry_payment_status='paid', payment_method=p_payment_method, updated_at=now()
      WHERE id = p_id AND entry_payment_status <> 'paid';
    ELSE
      UPDATE rental_orders SET payment_status='paid', payment_method=p_payment_method, updated_at=now()
      WHERE id = p_id AND payment_status <> 'paid';
    END IF;
    RETURN jsonb_build_object('success', true, 'already_recorded', true);
  END IF;

  -- ledger row (order_id NULL; external_reference ties it to the sports entity)
  INSERT INTO transaction_ledger (
    order_id, business_id, transaction_type, status,
    amount_gross_cents, platform_fee_cents, net_to_owner_cents,
    idempotency_key, currency, payment_method, external_reference, processed_at
  ) VALUES (
    NULL, p_business_id, 'payment', 'completed',
    v_gross, 0, v_gross,
    v_key, p_currency, p_payment_method, v_ref, now()
  );

  -- mark entity paid
  IF p_kind = 'tournament' THEN
    UPDATE tournament_teams SET entry_payment_status='paid', payment_method=p_payment_method,
           status = CASE WHEN status='registered' THEN 'confirmed' ELSE status END, updated_at=now()
    WHERE id = p_id;
  ELSE
    UPDATE rental_orders SET payment_status='paid', payment_method=p_payment_method, updated_at=now()
    WHERE id = p_id;
  END IF;

  RETURN jsonb_build_object('success', true, 'amount_gross_cents', v_gross);
END;
$$;

-- 8d. report_match_result — owner/staff set score+winner (triggers advance bracket + stats)
CREATE OR REPLACE FUNCTION public.report_match_result(
  p_business_id UUID,
  p_match_id    UUID,
  p_score       TEXT,
  p_winner      TEXT              -- 'A' | 'B'
) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_exists BOOLEAN;
BEGIN
  IF p_winner NOT IN ('A','B') THEN
    RETURN jsonb_build_object('success', false, 'error', 'bad_winner');
  END IF;

  SELECT true INTO v_exists FROM tournament_matches
  WHERE id = p_match_id AND business_id = p_business_id;
  IF NOT v_exists THEN RETURN jsonb_build_object('success', false, 'error', 'match_not_found'); END IF;

  UPDATE tournament_matches
    SET score = p_score, winner = p_winner, status = 'completed', updated_at = now()
  WHERE id = p_match_id AND business_id = p_business_id;

  RETURN jsonb_build_object('success', true, 'match_id', p_match_id, 'winner', p_winner);
END;
$$;

-- 8e. checkin_tournament_team — staff scans registration_code at the door
CREATE OR REPLACE FUNCTION public.checkin_tournament_team(
  p_business_id       UUID,
  p_registration_code TEXT,
  p_checked_in_by     UUID DEFAULT NULL
) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_team RECORD;
BEGIN
  SELECT id, team_name, entry_payment_status, status INTO v_team
  FROM tournament_teams
  WHERE business_id = p_business_id AND registration_code = p_registration_code;

  IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'error', 'not_found'); END IF;
  IF v_team.entry_payment_status <> 'paid' THEN
    RETURN jsonb_build_object('success', false, 'error', 'unpaid', 'team_name', v_team.team_name);
  END IF;
  IF v_team.status = 'checked_in' THEN
    RETURN jsonb_build_object('success', false, 'error', 'already_checked_in', 'team_name', v_team.team_name);
  END IF;

  UPDATE tournament_teams
    SET status='checked_in', checked_in_at=now(), checked_in_by=p_checked_in_by, updated_at=now()
  WHERE id = v_team.id;

  RETURN jsonb_build_object('success', true, 'team_name', v_team.team_name);
END;
$$;

-- 8f. get_tournament_bracket — full bracket JSON for the Torneos view
CREATE OR REPLACE FUNCTION public.get_tournament_bracket(p_tournament_id UUID)
RETURNS JSONB LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT jsonb_build_object(
    'tournament', to_jsonb(t) - 'is_deleted' - 'deleted_at',
    'rounds', COALESCE((
      SELECT jsonb_agg(r ORDER BY r.round_number)
      FROM (
        SELECT m.round_number,
               MAX(m.round_name) AS round_name,
               jsonb_agg(jsonb_build_object(
                 'id', m.id, 'match_number', m.match_number,
                 'team_a', m.team_a_name, 'team_b', m.team_b_name,
                 'score', m.score, 'winner', m.winner, 'status', m.status,
                 'court', m.court_label, 'scheduled_at', m.scheduled_at
               ) ORDER BY m.match_number) AS matches
        FROM tournament_matches m
        WHERE m.tournament_id = p_tournament_id
        GROUP BY m.round_number
      ) r
    ), '[]'::jsonb)
  )
  FROM tournaments t
  WHERE t.id = p_tournament_id;
$$;

-- 8g. get_my_matches — "Mis Partidos" (by phone): active / history / tournaments
CREATE OR REPLACE FUNCTION public.get_my_matches(p_business_id UUID, p_phone TEXT)
RETURNS JSONB LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE v_team_ids UUID[];
BEGIN
  SELECT array_agg(id) INTO v_team_ids
  FROM tournament_teams
  WHERE business_id = p_business_id
    AND (captain_phone = p_phone OR players @> jsonb_build_array(jsonb_build_object('phone', p_phone)));

  IF v_team_ids IS NULL THEN v_team_ids := ARRAY[]::uuid[]; END IF;

  RETURN jsonb_build_object(
    'active', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'match_id', m.id, 'round', m.round_name, 'team_a', m.team_a_name, 'team_b', m.team_b_name,
        'court', m.court_label, 'scheduled_at', m.scheduled_at, 'status', m.status))
      FROM tournament_matches m
      WHERE m.business_id = p_business_id AND m.status IN ('scheduled','live')
        AND (m.team_a_id = ANY(v_team_ids) OR m.team_b_id = ANY(v_team_ids))
    ), '[]'::jsonb),
    'history', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'match_id', m.id, 'round', m.round_name, 'team_a', m.team_a_name, 'team_b', m.team_b_name,
        'score', m.score, 'winner', m.winner,
        'won', ((m.winner='A' AND m.team_a_id = ANY(v_team_ids)) OR (m.winner='B' AND m.team_b_id = ANY(v_team_ids)))))
      FROM tournament_matches m
      WHERE m.business_id = p_business_id AND m.status = 'completed'
        AND (m.team_a_id = ANY(v_team_ids) OR m.team_b_id = ANY(v_team_ids))
    ), '[]'::jsonb),
    'tournaments', COALESCE((
      SELECT jsonb_agg(DISTINCT jsonb_build_object(
        'tournament_id', tt.tournament_id, 'name', t.name, 'status', t.status,
        'team_name', tt.team_name, 'registration_code', tt.registration_code,
        'entry_payment_status', tt.entry_payment_status))
      FROM tournament_teams tt JOIN tournaments t ON t.id = tt.tournament_id
      WHERE tt.id = ANY(v_team_ids)
    ), '[]'::jsonb)
  );
END;
$$;

-- 8h. get_player_profile — "Mi Perfil": player + stats + achievements + rented gear + recent activity
CREATE OR REPLACE FUNCTION public.get_player_profile(p_business_id UUID, p_phone TEXT)
RETURNS JSONB LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_player RECORD;
  v_rank   INTEGER;
BEGIN
  SELECT * INTO v_player FROM players WHERE business_id = p_business_id AND phone = p_phone;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('exists', false, 'phone', p_phone);
  END IF;

  SELECT local_rank INTO v_rank FROM player_leaderboard
  WHERE business_id = p_business_id AND player_id = v_player.id;

  RETURN jsonb_build_object(
    'exists', true,
    'player', jsonb_build_object(
      'id', v_player.id, 'display_name', v_player.display_name, 'avatar_url', v_player.avatar_url,
      'skill_level', v_player.skill_level, 'ranking_points', v_player.ranking_points,
      'local_rank', v_rank,
      'matches_played', v_player.matches_played, 'matches_won', v_player.matches_won,
      'matches_lost', v_player.matches_lost),
    'achievements', COALESCE((
      SELECT jsonb_agg(jsonb_build_object('key', achievement_key, 'label', label, 'icon', icon, 'earned_at', earned_at))
      FROM player_achievements WHERE player_id = v_player.id
    ), '[]'::jsonb),
    'rentals', COALESCE((
      SELECT jsonb_agg(jsonb_build_object('rental_code', r.rental_code, 'items', r.items,
                                          'status', r.status, 'created_at', r.created_at))
      FROM (
        SELECT rental_code, items, status, created_at
        FROM rental_orders
        WHERE business_id = p_business_id AND customer_phone = p_phone AND is_deleted = false
        ORDER BY created_at DESC LIMIT 20
      ) r
    ), '[]'::jsonb)
  );
END;
$$;


-- ############################################################################
-- SECTION 9 — ROW LEVEL SECURITY  (the 3 house patterns)
-- ############################################################################
-- Helper predicates reused below:
--   OWNER  : business_id IN (SELECT id FROM businesses WHERE owner_id = auth.uid())
--   STAFF  : business_id = (current_setting('request.headers',true)::json->>'x-business-id')::uuid
--   GUEST  : guest_token = (current_setting('request.headers',true)::json->>'x-guest-token')
--            AND business_id = (headers ->> 'x-business-id')::uuid

ALTER TABLE sports_settings      ENABLE ROW LEVEL SECURITY;
ALTER TABLE rental_items         ENABLE ROW LEVEL SECURITY;
ALTER TABLE rental_orders        ENABLE ROW LEVEL SECURITY;
ALTER TABLE tournaments          ENABLE ROW LEVEL SECURITY;
ALTER TABLE tournament_teams     ENABLE ROW LEVEL SECURITY;
ALTER TABLE tournament_matches   ENABLE ROW LEVEL SECURITY;
ALTER TABLE players              ENABLE ROW LEVEL SECURITY;
ALTER TABLE player_achievements  ENABLE ROW LEVEL SECURITY;
ALTER TABLE pickup_matches       ENABLE ROW LEVEL SECURITY;

-- ---- sports_settings : public read (know the mode/colors), owner write ------
DROP POLICY IF EXISTS sports_settings_public_read ON sports_settings;
CREATE POLICY sports_settings_public_read ON sports_settings FOR SELECT USING (true);
DROP POLICY IF EXISTS sports_settings_owner_all ON sports_settings;
CREATE POLICY sports_settings_owner_all ON sports_settings FOR ALL
  USING (business_id IN (SELECT id FROM businesses WHERE owner_id = auth.uid()))
  WITH CHECK (business_id IN (SELECT id FROM businesses WHERE owner_id = auth.uid()));

-- ---- rental_items : public read catalog, owner write ------------------------
DROP POLICY IF EXISTS rental_items_public_read ON rental_items;
CREATE POLICY rental_items_public_read ON rental_items FOR SELECT USING (is_deleted = false);
DROP POLICY IF EXISTS rental_items_owner_all ON rental_items;
CREATE POLICY rental_items_owner_all ON rental_items FOR ALL
  USING (business_id IN (SELECT id FROM businesses WHERE owner_id = auth.uid()))
  WITH CHECK (business_id IN (SELECT id FROM businesses WHERE owner_id = auth.uid()));

-- ---- rental_orders : public insert (checkout), guest read own, owner+staff --
DROP POLICY IF EXISTS rental_orders_public_insert ON rental_orders;
CREATE POLICY rental_orders_public_insert ON rental_orders FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS rental_orders_guest_read ON rental_orders;
CREATE POLICY rental_orders_guest_read ON rental_orders FOR SELECT USING (
  guest_token = (current_setting('request.headers', true)::json->>'x-guest-token')
  AND business_id = (current_setting('request.headers', true)::json->>'x-business-id')::uuid
);
DROP POLICY IF EXISTS rental_orders_owner_all ON rental_orders;
CREATE POLICY rental_orders_owner_all ON rental_orders FOR ALL
  USING (business_id IN (SELECT id FROM businesses WHERE owner_id = auth.uid()))
  WITH CHECK (business_id IN (SELECT id FROM businesses WHERE owner_id = auth.uid()));
DROP POLICY IF EXISTS rental_orders_staff_rw ON rental_orders;
CREATE POLICY rental_orders_staff_rw ON rental_orders FOR ALL
  USING (business_id = (current_setting('request.headers', true)::json->>'x-business-id')::uuid)
  WITH CHECK (business_id = (current_setting('request.headers', true)::json->>'x-business-id')::uuid);

-- ---- tournaments : public read (active), owner write ------------------------
DROP POLICY IF EXISTS tournaments_public_read ON tournaments;
CREATE POLICY tournaments_public_read ON tournaments FOR SELECT USING (
  is_deleted = false AND status IN ('registration_open','in_progress','completed')
);
DROP POLICY IF EXISTS tournaments_owner_all ON tournaments;
CREATE POLICY tournaments_owner_all ON tournaments FOR ALL
  USING (business_id IN (SELECT id FROM businesses WHERE owner_id = auth.uid()))
  WITH CHECK (business_id IN (SELECT id FROM businesses WHERE owner_id = auth.uid()));

-- ---- tournament_teams : public read+insert (register), guest/owner/staff ----
DROP POLICY IF EXISTS tteams_public_read ON tournament_teams;
CREATE POLICY tteams_public_read ON tournament_teams FOR SELECT USING (true);  -- bracket shows team names
DROP POLICY IF EXISTS tteams_public_insert ON tournament_teams;
CREATE POLICY tteams_public_insert ON tournament_teams FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS tteams_owner_all ON tournament_teams;
CREATE POLICY tteams_owner_all ON tournament_teams FOR ALL
  USING (business_id IN (SELECT id FROM businesses WHERE owner_id = auth.uid()))
  WITH CHECK (business_id IN (SELECT id FROM businesses WHERE owner_id = auth.uid()));
DROP POLICY IF EXISTS tteams_staff_rw ON tournament_teams;
CREATE POLICY tteams_staff_rw ON tournament_teams FOR ALL
  USING (business_id = (current_setting('request.headers', true)::json->>'x-business-id')::uuid)
  WITH CHECK (business_id = (current_setting('request.headers', true)::json->>'x-business-id')::uuid);

-- ---- tournament_matches : public read (bracket), owner+staff write ----------
DROP POLICY IF EXISTS tmatches_public_read ON tournament_matches;
CREATE POLICY tmatches_public_read ON tournament_matches FOR SELECT USING (true);
DROP POLICY IF EXISTS tmatches_owner_all ON tournament_matches;
CREATE POLICY tmatches_owner_all ON tournament_matches FOR ALL
  USING (business_id IN (SELECT id FROM businesses WHERE owner_id = auth.uid()))
  WITH CHECK (business_id IN (SELECT id FROM businesses WHERE owner_id = auth.uid()));
DROP POLICY IF EXISTS tmatches_staff_rw ON tournament_matches;
CREATE POLICY tmatches_staff_rw ON tournament_matches FOR ALL
  USING (business_id = (current_setting('request.headers', true)::json->>'x-business-id')::uuid)
  WITH CHECK (business_id = (current_setting('request.headers', true)::json->>'x-business-id')::uuid);

-- ---- players : public read (leaderboard/profile), public upsert via RPC -----
DROP POLICY IF EXISTS players_public_read ON players;
CREATE POLICY players_public_read ON players FOR SELECT USING (true);
DROP POLICY IF EXISTS players_public_write ON players;   -- RPCs are SECURITY DEFINER; this also lets a player edit name/avatar
CREATE POLICY players_public_write ON players FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS players_owner_all ON players;
CREATE POLICY players_owner_all ON players FOR ALL
  USING (business_id IN (SELECT id FROM businesses WHERE owner_id = auth.uid()))
  WITH CHECK (business_id IN (SELECT id FROM businesses WHERE owner_id = auth.uid()));

-- ---- player_achievements : public read, owner write ------------------------
DROP POLICY IF EXISTS pach_public_read ON player_achievements;
CREATE POLICY pach_public_read ON player_achievements FOR SELECT USING (true);
DROP POLICY IF EXISTS pach_owner_all ON player_achievements;
CREATE POLICY pach_owner_all ON player_achievements FOR ALL
  USING (business_id IN (SELECT id FROM businesses WHERE owner_id = auth.uid()))
  WITH CHECK (business_id IN (SELECT id FROM businesses WHERE owner_id = auth.uid()));

-- ---- pickup_matches : public read+insert (host/join), owner write ----------
DROP POLICY IF EXISTS pickup_public_read ON pickup_matches;
CREATE POLICY pickup_public_read ON pickup_matches FOR SELECT USING (is_deleted = false);
DROP POLICY IF EXISTS pickup_public_insert ON pickup_matches;
CREATE POLICY pickup_public_insert ON pickup_matches FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS pickup_owner_all ON pickup_matches;
CREATE POLICY pickup_owner_all ON pickup_matches FOR ALL
  USING (business_id IN (SELECT id FROM businesses WHERE owner_id = auth.uid()))
  WITH CHECK (business_id IN (SELECT id FROM businesses WHERE owner_id = auth.uid()));


-- ############################################################################
-- SECTION 10 — GRANTS (anon = customer/staff-ops; authenticated = owner web)
-- ############################################################################
GRANT EXECUTE ON FUNCTION public.register_tournament_team(UUID,UUID,TEXT,TEXT,TEXT,JSONB,TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_rental_reservation(UUID,TEXT,TEXT,JSONB,DATE,TEXT)      TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_sports_cash_payment(UUID,TEXT,UUID,TEXT,TEXT)           TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.report_match_result(UUID,UUID,TEXT,TEXT)                       TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.checkin_tournament_team(UUID,TEXT,UUID)                        TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_tournament_bracket(UUID)                                   TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_matches(UUID,TEXT)                                      TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_player_profile(UUID,TEXT)                                  TO anon, authenticated;


-- ############################################################################
-- SECTION 11 — SEED (optional): create a sports_settings row per business
-- ############################################################################
-- Safe to run; disabled by default (enabled=false). Owners flip it on in UI.
INSERT INTO sports_settings (business_id)
SELECT id FROM businesses
ON CONFLICT (business_id) DO NOTHING;


-- ============================================================================
-- POST-DEPLOY SMOKE TEST (run manually, replace :bid / :tid)
-- ----------------------------------------------------------------------------
-- 1) SELECT enable: UPDATE sports_settings SET enabled=true WHERE business_id=:bid;
-- 2) Create a tournament (owner UI) → status 'registration_open'
-- 3) SELECT register_tournament_team(:bid,:tid,'Los Pumas','Ana','5490111', '[{"name":"Ana","phone":"5490111"},{"name":"Lia","phone":"5490222"}]');
-- 4) SELECT record_sports_cash_payment(:bid,'tournament', <team_id>);
-- 5) SELECT report_match_result(:bid, <match_id>, '6-4', 'A');   -- advances + stats
-- 6) SELECT get_player_profile(:bid,'5490111');                  -- W/L reflects result
-- 7) Reconcile: SELECT payment_method, sum(amount_gross_cents)/100.0
--               FROM transaction_ledger WHERE business_id=:bid GROUP BY 1;  -- includes sports cash
-- ============================================================================
-- END MIGRATION v3.1
