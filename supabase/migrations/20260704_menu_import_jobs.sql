-- ============================================================
-- AI Menu Import — Phase 0
--
-- Adds the tracking table for menu-import attempts and a flag on
-- businesses to hide the upload buttons once an import has been done.
--
-- The extract-menu edge function only ever PROPOSES items (writes the
-- extracted payload here). The client commits the real rows into
-- menu_items using the same RLS-protected path as the manual
-- "nueva receta" form — so no new RLS is needed on menu_items itself.
--
-- Rate limiting (3 imports / business / 24h) and file-hash dedup both
-- read from this table.
-- ============================================================

CREATE TABLE IF NOT EXISTS menu_import_jobs (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id         UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  file_hash           TEXT NOT NULL,                 -- sha256 of the uploaded file, for dedup
  source_type         TEXT NOT NULL DEFAULT 'pdf'
                        CHECK (source_type IN ('pdf', 'image')),
  status              TEXT NOT NULL DEFAULT 'processing'
                        CHECK (status IN ('processing', 'ready_for_review', 'committed', 'failed', 'discarded')),
  extracted_payload   JSONB,                         -- the proposal: { items[], categories[], warnings[], ... }
  items_committed     INT  DEFAULT 0,
  error_message       TEXT,
  model_tokens_used   INT,                           -- Groq usage, for cost tracking
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at        TIMESTAMPTZ
);

-- Rate-limit + recency lookups: "how many jobs for this business in the last 24h"
CREATE INDEX IF NOT EXISTS idx_menu_import_jobs_business_recent
  ON menu_import_jobs (business_id, created_at DESC);

-- Dedup lookups: "has this business already committed this exact file"
CREATE INDEX IF NOT EXISTS idx_menu_import_jobs_hash
  ON menu_import_jobs (business_id, file_hash);

-- Flag: once a business completes one import, hide the upload buttons
-- (they can still re-import via a small "import another" link).
ALTER TABLE businesses
  ADD COLUMN IF NOT EXISTS ai_menu_import_used_at TIMESTAMPTZ;

-- ─── RLS ─────────────────────────────────────────────────────
-- Owners can read their own import jobs (for debugging / status display).
-- Writes happen from the edge function using the service-role key, which
-- bypasses RLS — so we only need a SELECT policy scoped to business_id.
ALTER TABLE menu_import_jobs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "owners read own import jobs" ON menu_import_jobs;
CREATE POLICY "owners read own import jobs"
  ON menu_import_jobs
  FOR SELECT
  USING (
    business_id IN (
      SELECT id FROM businesses WHERE owner_id = auth.uid()
    )
  );
