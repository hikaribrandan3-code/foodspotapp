-- ============================================
-- CORTE DE CAJA (Cash Register Close-Out)
-- Migration: 2026-06-24
-- All amounts in INTEGER cents (ARS minor units). NO decimals ever.
-- ============================================

-- 1. SHIFTS — core shift record
CREATE TABLE IF NOT EXISTS public.shifts (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id             UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  opened_by               UUID NOT NULL REFERENCES public.staff(id),
  closed_by               UUID REFERENCES public.staff(id),
  previous_shift_id       UUID REFERENCES public.shifts(id),

  -- Timing
  opened_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
  closed_at               TIMESTAMPTZ,
  status                  TEXT NOT NULL DEFAULT 'open'
                          CHECK (status IN ('open', 'closing', 'closed', 'forced_closed')),

  -- Float (opening cash in drawer)
  float_cents             INTEGER NOT NULL DEFAULT 0,
  carried_float_cents     INTEGER,          -- what previous shift closed with
  float_discrepancy_cents INTEGER,          -- difference, requires note if > threshold

  -- Expected (auto-calculated from transaction_ledger for this shift window)
  expected_cash_cents     INTEGER,
  expected_card_cents     INTEGER,
  expected_mp_cents       INTEGER,
  expected_other_cents    INTEGER,
  expected_total_cents    INTEGER,

  -- Actual (entered by staff at close)
  actual_cash_cents       INTEGER,
  actual_card_cents       INTEGER,
  actual_mp_cents         INTEGER,
  actual_other_cents      INTEGER,
  actual_total_cents      INTEGER,

  -- Variance (actual - expected, negative = shortage)
  variance_cash_cents     INTEGER,
  variance_card_cents     INTEGER,
  variance_mp_cents       INTEGER,
  variance_other_cents    INTEGER,
  variance_total_cents    INTEGER,
  variance_pct            DECIMAL(6,3),     -- total variance as % of expected

  -- Severity
  severity                TEXT CHECK (severity IN ('ok', 'warning', 'critical', 'investigate')),

  -- Notes (required for warning/critical)
  close_note              TEXT,
  forced_close_reason     TEXT,

  -- Manager review
  reviewed_by             UUID REFERENCES public.staff(id),
  reviewed_at             TIMESTAMPTZ,
  manager_action          TEXT CHECK (manager_action IN ('approved', 'adjusted', 'reopened', 'disputed')),
  manager_note            TEXT,
  original_actual_cents   JSONB,            -- snapshot before manager adjustment
  is_finalized            BOOLEAN DEFAULT false,
  finalized_by            UUID REFERENCES public.staff(id),
  finalized_at            TIMESTAMPTZ,

  -- Concurrency
  version                 INTEGER DEFAULT 1 NOT NULL,

  created_at              TIMESTAMPTZ DEFAULT now(),
  updated_at              TIMESTAMPTZ DEFAULT now()
);

-- 2. PAYMENT METHOD CONFIG — owner defines which methods to track
CREATE TABLE IF NOT EXISTS public.payment_method_configs (
  id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id                 UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  method_key                  TEXT NOT NULL,
  method_name                 TEXT NOT NULL,
  sub_method                  TEXT,           -- e.g. 'mp_qr_scan', 'mp_link', 'mp_point'
  is_active                   BOOLEAN DEFAULT true,
  is_auto_matched             BOOLEAN DEFAULT false,
  requires_manual_count       BOOLEAN DEFAULT true,
  variance_threshold_cents    INTEGER DEFAULT 200,
  variance_pct_threshold      DECIMAL(5,2) DEFAULT 1.00,
  sort_order                  INT DEFAULT 0,
  UNIQUE(business_id, method_key)
);

-- 3. SHIFT PAYMENT BREAKDOWNS — per-method detail within a shift
CREATE TABLE IF NOT EXISTS public.shift_payment_breakdowns (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shift_id            UUID NOT NULL REFERENCES public.shifts(id) ON DELETE CASCADE,
  method_key          TEXT NOT NULL,
  expected_cents      INTEGER NOT NULL DEFAULT 0,
  actual_cents        INTEGER,
  settled_cents       INTEGER,              -- from MP cron reconciliation
  variance_cents      INTEGER,
  order_count         INTEGER DEFAULT 0,
  settlement_status   TEXT CHECK (settlement_status IN ('pending', 'settled', 'mismatch', 'not_applicable')),
  note                TEXT,
  created_at          TIMESTAMPTZ DEFAULT now()
);

-- 4. VARIANCE ALERTS — flagged anomalies for manager review
CREATE TABLE IF NOT EXISTS public.variance_alerts (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id     UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  shift_id        UUID NOT NULL REFERENCES public.shifts(id) ON DELETE CASCADE,
  alert_type      TEXT NOT NULL CHECK (alert_type IN (
    'high_variance', 'forced_close', 'missing_close',
    'float_discrepancy', 'manager_adjustment', 'payment_mismatch', 'consistent_staff'
  )),
  severity        TEXT NOT NULL CHECK (severity IN ('warning', 'critical')),
  message         TEXT NOT NULL,
  alert_data      JSONB,
  resolved        BOOLEAN DEFAULT false,
  resolved_by     UUID REFERENCES public.staff(id),
  resolved_at     TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT now()
);

-- 5. SHIFT EVENTS — granular audit trail
CREATE TABLE IF NOT EXISTS public.shift_events (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shift_id    UUID NOT NULL REFERENCES public.shifts(id) ON DELETE CASCADE,
  staff_id    UUID REFERENCES public.staff(id),
  event_type  TEXT NOT NULL,   -- 'opened','count_updated','closed','forced_closed','adjusted','approved','reopened'
  event_data  JSONB,
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- 6. BUSINESS CASH SETTINGS — configurable thresholds per business
CREATE TABLE IF NOT EXISTS public.business_cash_settings (
  id                                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id                         UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE UNIQUE,
  cash_variance_threshold_cents       INTEGER DEFAULT 200,      -- $2 ARS absolute
  cash_variance_pct_threshold         DECIMAL(5,2) DEFAULT 1.00, -- 1%
  card_variance_threshold_cents       INTEGER DEFAULT 0,         -- must match exactly
  mp_variance_threshold_cents         INTEGER DEFAULT 500,       -- $5 same-day lag tolerance
  total_variance_threshold_cents      INTEGER DEFAULT 2000,      -- $20 total
  total_variance_pct_threshold        DECIMAL(5,2) DEFAULT 2.00, -- 2%
  auto_close_hour                     INTEGER DEFAULT 3,         -- 3 AM local
  allow_forced_close                  BOOLEAN DEFAULT true,
  require_float_note                  BOOLEAN DEFAULT true,
  float_discrepancy_threshold_cents   INTEGER DEFAULT 200,
  created_at                          TIMESTAMPTZ DEFAULT now(),
  updated_at                          TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_shifts_business_status     ON public.shifts(business_id, status);
CREATE INDEX IF NOT EXISTS idx_shifts_opened_by           ON public.shifts(opened_by, opened_at DESC);
CREATE INDEX IF NOT EXISTS idx_shifts_previous            ON public.shifts(previous_shift_id) WHERE previous_shift_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_shifts_closed_at           ON public.shifts(business_id, closed_at DESC) WHERE closed_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_breakdowns_shift           ON public.shift_payment_breakdowns(shift_id);
CREATE INDEX IF NOT EXISTS idx_alerts_business            ON public.variance_alerts(business_id, resolved, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_shift_events_shift         ON public.shift_events(shift_id, created_at DESC);

-- ============================================
-- TRIGGER: Enforce close note for variance
-- ============================================
CREATE OR REPLACE FUNCTION public.enforce_shift_close_note()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status IN ('closed', 'forced_closed')
     AND NEW.severity IN ('warning', 'critical', 'investigate')
     AND (NEW.close_note IS NULL OR length(trim(NEW.close_note)) < 5)
  THEN
    RAISE EXCEPTION 'close_note_required: A note (min 5 chars) is required when closing a shift with variance above threshold.';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_enforce_shift_close_note ON public.shifts;
CREATE TRIGGER trg_enforce_shift_close_note
  BEFORE INSERT OR UPDATE ON public.shifts
  FOR EACH ROW EXECUTE FUNCTION public.enforce_shift_close_note();

-- ============================================
-- TRIGGER: Auto-create variance alert on forced close
-- ============================================
CREATE OR REPLACE FUNCTION public.alert_on_forced_shift_close()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'forced_closed' AND OLD.status != 'forced_closed' THEN
    INSERT INTO public.variance_alerts (business_id, shift_id, alert_type, severity, message, alert_data)
    VALUES (
      NEW.business_id,
      NEW.id,
      'forced_close',
      'critical',
      'Turno cerrado forzosamente. Revisión gerencial requerida.',
      jsonb_build_object('opened_at', NEW.opened_at, 'closed_at', NEW.closed_at, 'opened_by', NEW.opened_by)
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_alert_forced_shift_close ON public.shifts;
CREATE TRIGGER trg_alert_forced_shift_close
  AFTER UPDATE ON public.shifts
  FOR EACH ROW EXECUTE FUNCTION public.alert_on_forced_shift_close();

-- ============================================
-- TRIGGER: Float discrepancy alert on shift open
-- ============================================
CREATE OR REPLACE FUNCTION public.alert_on_float_discrepancy()
RETURNS TRIGGER AS $$
BEGIN
  -- Only fire on INSERT (new shift being opened)
  IF TG_OP = 'INSERT' AND NEW.float_discrepancy_cents IS NOT NULL
     AND ABS(NEW.float_discrepancy_cents) > 200 THEN
    INSERT INTO public.variance_alerts (business_id, shift_id, alert_type, severity, message, alert_data)
    VALUES (
      NEW.business_id,
      NEW.id,
      'float_discrepancy',
      CASE WHEN ABS(NEW.float_discrepancy_cents) > 1000 THEN 'critical' ELSE 'warning' END,
      'Discrepancia en caja: turno anterior cerró con $' || (NEW.carried_float_cents::float / 100) || ', este turno abrió con $' || (NEW.float_cents::float / 100),
      jsonb_build_object(
        'carried_float_cents', NEW.carried_float_cents,
        'actual_float_cents', NEW.float_cents,
        'discrepancy_cents', NEW.float_discrepancy_cents
      )
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_alert_float_discrepancy ON public.shifts;
CREATE TRIGGER trg_alert_float_discrepancy
  AFTER INSERT ON public.shifts
  FOR EACH ROW EXECUTE FUNCTION public.alert_on_float_discrepancy();

-- ============================================
-- RLS POLICIES
-- ============================================
ALTER TABLE public.shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shift_payment_breakdowns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.variance_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shift_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_method_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_cash_settings ENABLE ROW LEVEL SECURITY;

-- shifts: business isolation via x-business-id header (staff-ops pattern)
CREATE POLICY shifts_business_isolation ON public.shifts
  USING (business_id = (current_setting('request.headers', true)::json->>'x-business-id')::uuid
    OR business_id IN (SELECT id FROM public.businesses WHERE owner_id = auth.uid()));

CREATE POLICY shifts_insert ON public.shifts FOR INSERT
  WITH CHECK (business_id = (current_setting('request.headers', true)::json->>'x-business-id')::uuid
    OR business_id IN (SELECT id FROM public.businesses WHERE owner_id = auth.uid()));

-- shift_payment_breakdowns: inherit from parent shift
CREATE POLICY breakdowns_business_isolation ON public.shift_payment_breakdowns
  USING (shift_id IN (
    SELECT id FROM public.shifts WHERE
      business_id = (current_setting('request.headers', true)::json->>'x-business-id')::uuid
      OR business_id IN (SELECT id FROM public.businesses WHERE owner_id = auth.uid())
  ));

CREATE POLICY breakdowns_insert ON public.shift_payment_breakdowns FOR INSERT
  WITH CHECK (shift_id IN (
    SELECT id FROM public.shifts WHERE
      business_id = (current_setting('request.headers', true)::json->>'x-business-id')::uuid
      OR business_id IN (SELECT id FROM public.businesses WHERE owner_id = auth.uid())
  ));

-- variance_alerts
CREATE POLICY alerts_business_isolation ON public.variance_alerts
  USING (business_id = (current_setting('request.headers', true)::json->>'x-business-id')::uuid
    OR business_id IN (SELECT id FROM public.businesses WHERE owner_id = auth.uid()));

CREATE POLICY alerts_insert ON public.variance_alerts FOR INSERT
  WITH CHECK (business_id = (current_setting('request.headers', true)::json->>'x-business-id')::uuid
    OR business_id IN (SELECT id FROM public.businesses WHERE owner_id = auth.uid()));

-- shift_events: read-only for all, inserts allowed
CREATE POLICY events_business_isolation ON public.shift_events
  USING (shift_id IN (
    SELECT id FROM public.shifts WHERE
      business_id = (current_setting('request.headers', true)::json->>'x-business-id')::uuid
      OR business_id IN (SELECT id FROM public.businesses WHERE owner_id = auth.uid())
  ));

CREATE POLICY shift_events_insert ON public.shift_events FOR INSERT
  WITH CHECK (shift_id IN (
    SELECT id FROM public.shifts WHERE
      business_id = (current_setting('request.headers', true)::json->>'x-business-id')::uuid
      OR business_id IN (SELECT id FROM public.businesses WHERE owner_id = auth.uid())
  ));

-- payment_method_configs + business_cash_settings: owner-only
CREATE POLICY pmc_business_isolation ON public.payment_method_configs
  USING (business_id = (current_setting('request.headers', true)::json->>'x-business-id')::uuid
    OR business_id IN (SELECT id FROM public.businesses WHERE owner_id = auth.uid()));

CREATE POLICY pmc_insert ON public.payment_method_configs FOR INSERT
  WITH CHECK (business_id IN (SELECT id FROM public.businesses WHERE owner_id = auth.uid()));

CREATE POLICY bcs_business_isolation ON public.business_cash_settings
  USING (business_id IN (SELECT id FROM public.businesses WHERE owner_id = auth.uid()));

CREATE POLICY bcs_insert ON public.business_cash_settings FOR INSERT
  WITH CHECK (business_id IN (SELECT id FROM public.businesses WHERE owner_id = auth.uid()));

-- ============================================
-- SEED: Default payment methods per business
-- (Run manually after migration for existing businesses, or call from onboarding)
-- ============================================
-- INSERT INTO public.payment_method_configs (business_id, method_key, method_name, sort_order, requires_manual_count)
-- SELECT id, 'cash', 'Efectivo', 1, true FROM public.businesses;
-- INSERT INTO public.payment_method_configs (business_id, method_key, method_name, sort_order, requires_manual_count, variance_threshold_cents)
-- SELECT id, 'card', 'Tarjeta', 2, false, 0 FROM public.businesses;
-- INSERT INTO public.payment_method_configs (business_id, method_key, method_name, sub_method, sort_order, requires_manual_count, variance_threshold_cents)
-- SELECT id, 'mp_qr', 'Mercado Pago QR', 'mp_qr_scan', 3, false, 500 FROM public.businesses;
