-- ============================================================
-- FOODSPOT v2.2 PATCH: Fix owner_id, RLS, and persistence
-- Run this in Supabase SQL Editor after deploying code fixes
-- ============================================================

-- ----------------------------------------------------------
-- 1. FIX: branding_id_seq missing from schema bible
-- The branding table uses id BIGINT DEFAULT nextval('branding_id_seq')
-- but the sequence was never created in the Bible.
-- ----------------------------------------------------------
CREATE SEQUENCE IF NOT EXISTS branding_id_seq;


-- ----------------------------------------------------------
-- 2. FIX: tenants table missing from schema bible
-- The app heavily depends on this table for tenant resolution.
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.tenants (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    venue_name  TEXT NOT NULL UNIQUE,
    owner_id    UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    language    TEXT DEFAULT 'en',
    created_at  TIMESTAMPTZ DEFAULT now(),
    updated_at  TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tenants_owner_id ON public.tenants(owner_id);
CREATE INDEX IF NOT EXISTS idx_tenants_venue_name ON public.tenants(venue_name);


-- ----------------------------------------------------------
-- 3. FIX: profiles.business_id FK constraint
-- Ensure referential integrity between profiles and businesses.
-- ----------------------------------------------------------
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'profiles_business_id_fkey'
        AND table_name = 'profiles'
    ) THEN
        ALTER TABLE public.profiles
        ADD CONSTRAINT profiles_business_id_fkey
        FOREIGN KEY (business_id) REFERENCES public.businesses(id) ON DELETE CASCADE;
    END IF;
END $$;


-- ----------------------------------------------------------
-- 4. CRITICAL FIX: Backfill businesses.owner_id for existing rows
-- The onboarding was creating businesses without owner_id, which breaks
-- the branding_owner_update RLS policy. This links every business
-- to its owner via the branding table.
-- ----------------------------------------------------------
UPDATE public.businesses b
SET owner_id = br.user_id
FROM public.branding br
WHERE b.id = br.business_id
  AND b.owner_id IS NULL
  AND br.user_id IS NOT NULL;

-- Also backfill from profiles if branding.user_id is somehow missing
UPDATE public.businesses b
SET owner_id = p.id
FROM public.profiles p
WHERE b.id = p.business_id
  AND b.owner_id IS NULL;


-- ----------------------------------------------------------
-- 5. RLS FIX: branding_owner_update — add user_id fallback
-- The original policy only checked businesses.owner_id.
-- If owner_id was ever NULL, ALL branding updates were blocked.
-- This adds user_id = auth.uid() as a fallback path.
-- ----------------------------------------------------------
DROP POLICY IF EXISTS "branding_owner_update" ON public.branding;

CREATE POLICY "branding_owner_update"
ON public.branding FOR UPDATE
USING (
    business_id IN (
        SELECT id FROM public.businesses WHERE owner_id = auth.uid()
    )
    OR user_id = auth.uid()
);


-- ----------------------------------------------------------
-- 6. RLS FIX: business_secrets_owner_update — add user_id fallback
-- ----------------------------------------------------------
DROP POLICY IF EXISTS "business_secrets_owner_update" ON public.business_secrets;

CREATE POLICY "business_secrets_owner_update"
ON public.business_secrets FOR UPDATE
USING (
    business_id IN (
        SELECT id FROM public.businesses WHERE owner_id = auth.uid()
    )
    OR EXISTS (
        SELECT 1 FROM public.branding br
        WHERE br.business_id = business_secrets.business_id
        AND br.user_id = auth.uid()
    )
);


-- ----------------------------------------------------------
-- 7. RLS FIX: expenses — add authenticated owner bypass
-- The header-based policy is fragile. Add a direct ownership
-- check as a fallback so authenticated owners always win.
-- ----------------------------------------------------------
DROP POLICY IF EXISTS "expenses_owner_all" ON public.expenses;

CREATE POLICY "expenses_owner_all"
ON public.expenses FOR ALL
USING (
    business_id = (current_setting('request.headers', true)::json->>'x-business-id')::uuid
    OR business_id IN (
        SELECT id FROM public.businesses WHERE owner_id = auth.uid()
    )
);


-- ----------------------------------------------------------
-- 8. RLS FIX: inventory — add authenticated owner bypass
-- Same header fragility issue as expenses.
-- ----------------------------------------------------------
DROP POLICY IF EXISTS "inventory_owner_all" ON public.inventory;

CREATE POLICY "inventory_owner_all"
ON public.inventory FOR ALL
USING (
    business_id = (current_setting('request.headers', true)::json->>'x-business-id')::uuid
    OR business_id IN (
        SELECT id FROM public.businesses WHERE owner_id = auth.uid()
    )
);


-- ----------------------------------------------------------
-- 9. RLS FIX: inventory_transactions — add authenticated owner bypass
-- ----------------------------------------------------------
DROP POLICY IF EXISTS "inventory_transactions_owner_all" ON public.inventory_transactions;

CREATE POLICY "inventory_transactions_owner_all"
ON public.inventory_transactions FOR ALL
USING (
    business_id = (current_setting('request.headers', true)::json->>'x-business-id')::uuid
    OR business_id IN (
        SELECT id FROM public.businesses WHERE owner_id = auth.uid()
    )
);


-- ----------------------------------------------------------
-- 10. RLS FIX: inventory_suppliers — add authenticated owner bypass
-- ----------------------------------------------------------
DROP POLICY IF EXISTS "inventory_suppliers_owner_all" ON public.inventory_suppliers;

CREATE POLICY "inventory_suppliers_owner_all"
ON public.inventory_suppliers FOR ALL
USING (
    business_id = (current_setting('request.headers', true)::json->>'x-business-id')::uuid
    OR business_id IN (
        SELECT id FROM public.businesses WHERE owner_id = auth.uid()
    )
);


-- ----------------------------------------------------------
-- 11. RLS FIX: event_promo_codes — add authenticated owner bypass
-- ----------------------------------------------------------
DROP POLICY IF EXISTS "event_promo_codes_owner_all" ON public.event_promo_codes;

CREATE POLICY "event_promo_codes_owner_all"
ON public.event_promo_codes FOR ALL
USING (
    business_id = (current_setting('request.headers', true)::json->>'x-business-id')::uuid
    OR business_id IN (
        SELECT id FROM public.businesses WHERE owner_id = auth.uid()
    )
);


-- ----------------------------------------------------------
-- 12. RLS FIX: event_checkins — add authenticated owner bypass
-- ----------------------------------------------------------
DROP POLICY IF EXISTS "event_checkins_owner_all" ON public.event_checkins;

CREATE POLICY "event_checkins_owner_all"
ON public.event_checkins FOR ALL
USING (
    event_id IN (
        SELECT id FROM public.events
        WHERE business_id = (current_setting('request.headers', true)::json->>'x-business-id')::uuid
    )
    OR event_id IN (
        SELECT e.id FROM public.events e
        JOIN public.businesses b ON b.id = e.business_id
        WHERE b.owner_id = auth.uid()
    )
);


-- ----------------------------------------------------------
-- 13. RLS FIX: event_orders — add authenticated owner bypass
-- ----------------------------------------------------------
DROP POLICY IF EXISTS "event_orders_owner_read" ON public.event_orders;

CREATE POLICY "event_orders_owner_read"
ON public.event_orders FOR SELECT
USING (
    business_id = (current_setting('request.headers', true)::json->>'x-business-id')::uuid
    OR business_id IN (
        SELECT id FROM public.businesses WHERE owner_id = auth.uid()
    )
);


-- ----------------------------------------------------------
-- 14. RLS FIX: events_owner_all — add authenticated owner bypass
-- ----------------------------------------------------------
DROP POLICY IF EXISTS "events_owner_all" ON public.events;

CREATE POLICY "events_owner_all"
ON public.events FOR ALL
USING (
    business_id = (current_setting('request.headers', true)::json->>'x-business-id')::uuid
    OR business_id IN (
        SELECT id FROM public.businesses WHERE owner_id = auth.uid()
    )
);


-- ----------------------------------------------------------
-- 15. RLS FIX: staff — add authenticated owner bypass
-- ----------------------------------------------------------
DROP POLICY IF EXISTS "staff_owner_all" ON public.staff;

CREATE POLICY "staff_owner_all"
ON public.staff FOR ALL
USING (
    business_id = (current_setting('request.headers', true)::json->>'x-business-id')::uuid
    OR business_id IN (
        SELECT id FROM public.businesses WHERE owner_id = auth.uid()
    )
);


-- ----------------------------------------------------------
-- 16. RLS FIX: staff_shifts — add authenticated owner bypass
-- ----------------------------------------------------------
DROP POLICY IF EXISTS "staff_shifts_owner_all" ON public.staff_shifts;

CREATE POLICY "staff_shifts_owner_all"
ON public.staff_shifts FOR ALL
USING (
    business_id = (current_setting('request.headers', true)::json->>'x-business-id')::uuid
    OR business_id IN (
        SELECT id FROM public.businesses WHERE owner_id = auth.uid()
    )
);


-- ----------------------------------------------------------
-- 17. RLS FIX: ledger_entries — add authenticated owner bypass
-- ----------------------------------------------------------
DROP POLICY IF EXISTS "ledger_entries_owner_all" ON public.ledger_entries;

CREATE POLICY "ledger_entries_owner_all"
ON public.ledger_entries FOR ALL
USING (
    business_id = (current_setting('request.headers', true)::json->>'x-business-id')::uuid
    OR business_id IN (
        SELECT id FROM public.businesses WHERE owner_id = auth.uid()
    )
);


-- ----------------------------------------------------------
-- 18. RLS FIX: owner_notifications — add authenticated owner bypass
-- ----------------------------------------------------------
DROP POLICY IF EXISTS "owner_notifications_owner_all" ON public.owner_notifications;

CREATE POLICY "owner_notifications_owner_all"
ON public.owner_notifications FOR ALL
USING (
    business_id = (current_setting('request.headers', true)::json->>'x-business-id')::uuid
    OR business_id IN (
        SELECT id FROM public.businesses WHERE owner_id = auth.uid()
    )
);


-- ----------------------------------------------------------
-- 19. RLS FIX: categories — add authenticated owner bypass
-- ----------------------------------------------------------
DROP POLICY IF EXISTS "categories_owner_all" ON public.categories;

CREATE POLICY "categories_owner_all"
ON public.categories FOR ALL
USING (
    business_id = (current_setting('request.headers', true)::json->>'x-business-id')::uuid
    OR business_id IN (
        SELECT id FROM public.businesses WHERE owner_id = auth.uid()
    )
);


-- ----------------------------------------------------------
-- 20. RLS FIX: menu_items — add authenticated owner bypass
-- ----------------------------------------------------------
DROP POLICY IF EXISTS "menu_items_owner_all" ON public.menu_items;

CREATE POLICY "menu_items_owner_all"
ON public.menu_items FOR ALL
USING (
    business_id = (current_setting('request.headers', true)::json->>'x-business-id')::uuid
    OR business_id IN (
        SELECT id FROM public.businesses WHERE owner_id = auth.uid()
    )
);


-- ----------------------------------------------------------
-- 21. RLS FIX: audit_log — add authenticated owner bypass
-- ----------------------------------------------------------
DROP POLICY IF EXISTS "audit_log_owner_read" ON public.audit_log;

CREATE POLICY "audit_log_owner_read"
ON public.audit_log FOR SELECT
USING (
    business_id = (current_setting('request.headers', true)::json->>'x-business-id')::uuid
    OR business_id IN (
        SELECT id FROM public.businesses WHERE owner_id = auth.uid()
    )
);


-- ----------------------------------------------------------
-- 22. RLS FIX: image_generation_logs — add authenticated owner bypass
-- ----------------------------------------------------------
DROP POLICY IF EXISTS "image_generation_logs_owner_all" ON public.image_generation_logs;

CREATE POLICY "image_generation_logs_owner_all"
ON public.image_generation_logs FOR ALL
USING (
    business_id = (current_setting('request.headers', true)::json->>'x-business-id')::uuid
    OR business_id IN (
        SELECT id FROM public.businesses WHERE owner_id = auth.uid()
    )
);


-- ----------------------------------------------------------
-- 23. RLS FIX: image_usage — add authenticated owner bypass
-- ----------------------------------------------------------
DROP POLICY IF EXISTS "image_usage_owner_all" ON public.image_usage;

CREATE POLICY "image_usage_owner_all"
ON public.image_usage FOR ALL
USING (
    business_id = (current_setting('request.headers', true)::json->>'x-business-id')::uuid
    OR business_id IN (
        SELECT id FROM public.businesses WHERE owner_id = auth.uid()
    )
);


-- ----------------------------------------------------------
-- 24. RLS FIX: transaction_ledger — add authenticated owner bypass
-- ----------------------------------------------------------
DROP POLICY IF EXISTS "transaction_ledger_owner_all" ON public.transaction_ledger;

CREATE POLICY "transaction_ledger_owner_all"
ON public.transaction_ledger FOR ALL
USING (
    business_id = (current_setting('request.headers', true)::json->>'x-business-id')::uuid
    OR business_id IN (
        SELECT id FROM public.businesses WHERE owner_id = auth.uid()
    )
);


-- ----------------------------------------------------------
-- 25. RLS FIX: table_ledgers — add authenticated owner bypass
-- ----------------------------------------------------------
DROP POLICY IF EXISTS "table_ledgers_owner_all" ON public.table_ledgers;

CREATE POLICY "table_ledgers_owner_all"
ON public.table_ledgers FOR ALL
USING (
    business_id = (current_setting('request.headers', true)::json->>'x-business-id')::uuid
    OR business_id IN (
        SELECT id FROM public.businesses WHERE owner_id = auth.uid()
    )
);


-- ----------------------------------------------------------
-- 26. RLS FIX: wallets — add authenticated owner bypass
-- ----------------------------------------------------------
DROP POLICY IF EXISTS "wallets_owner_all" ON public.wallets;

CREATE POLICY "wallets_owner_all"
ON public.wallets FOR ALL
USING (
    business_id = (current_setting('request.headers', true)::json->>'x-business-id')::uuid
    OR business_id IN (
        SELECT id FROM public.businesses WHERE owner_id = auth.uid()
    )
);


-- ----------------------------------------------------------
-- 27. RLS FIX: wallet_transactions — add authenticated owner bypass
-- ----------------------------------------------------------
DROP POLICY IF EXISTS "wallet_transactions_owner_all" ON public.wallet_transactions;

CREATE POLICY "wallet_transactions_owner_all"
ON public.wallet_transactions FOR ALL
USING (
    business_id = (current_setting('request.headers', true)::json->>'x-business-id')::uuid
    OR business_id IN (
        SELECT id FROM public.businesses WHERE owner_id = auth.uid()
    )
);


-- ----------------------------------------------------------
-- 28. RLS FIX: el_momento_photos — add authenticated owner bypass
-- ----------------------------------------------------------
DROP POLICY IF EXISTS "el_momento_photos_owner_all" ON public.el_momento_photos;

CREATE POLICY "el_momento_photos_owner_all"
ON public.el_momento_photos FOR ALL
USING (
    business_id = (current_setting('request.headers', true)::json->>'x-business-id')::uuid
    OR business_id IN (
        SELECT id FROM public.businesses WHERE owner_id = auth.uid()
    )
);


-- ----------------------------------------------------------
-- 29. RLS FIX: event_leads — add authenticated owner bypass
-- ----------------------------------------------------------
DROP POLICY IF EXISTS "event_leads_owner_all" ON public.event_leads;

CREATE POLICY "event_leads_owner_all"
ON public.event_leads FOR ALL
USING (
    business_id = (current_setting('request.headers', true)::json->>'x-business-id')::uuid
    OR business_id IN (
        SELECT id FROM public.businesses WHERE owner_id = auth.uid()
    )
);


-- ----------------------------------------------------------
-- 30. RLS FIX: split_payments — add authenticated owner bypass
-- ----------------------------------------------------------
DROP POLICY IF EXISTS "split_payments_owner_all" ON public.split_payments;

CREATE POLICY "split_payments_owner_all"
ON public.split_payments FOR ALL
USING (
    ledger_id IN (
        SELECT id FROM public.table_ledgers tl
        WHERE tl.business_id = (current_setting('request.headers', true)::json->>'x-business-id')::uuid
    )
    OR EXISTS (
        SELECT 1 FROM public.table_ledgers tl
        JOIN public.businesses b ON b.id = tl.business_id
        WHERE tl.id = split_payments.ledger_id
        AND b.owner_id = auth.uid()
    )
);


-- ----------------------------------------------------------
-- 31. RLS FIX: order_sessions — add authenticated owner bypass
-- ----------------------------------------------------------
DROP POLICY IF EXISTS "order_sessions_owner_all" ON public.order_sessions;

CREATE POLICY "order_sessions_owner_all"
ON public.order_sessions FOR ALL
USING (
    business_id = (current_setting('request.headers', true)::json->>'x-business-id')::uuid
    OR business_id IN (
        SELECT id FROM public.businesses WHERE owner_id = auth.uid()
    )
);


-- ----------------------------------------------------------
-- 32. RLS FIX: AI swarm tables — add authenticated owner bypass
-- ----------------------------------------------------------
DROP POLICY IF EXISTS "ai_memory_owner_all" ON public.ai_master_memory;

CREATE POLICY "ai_memory_owner_all"
ON public.ai_master_memory FOR ALL
USING (
    business_id = (current_setting('request.headers', true)::json->>'x-business-id')::uuid
    OR business_id IN (
        SELECT id FROM public.businesses WHERE owner_id = auth.uid()
    )
);

DROP POLICY IF EXISTS "agent_registry_owner_all" ON public.agent_registry;

CREATE POLICY "agent_registry_owner_all"
ON public.agent_registry FOR ALL
USING (
    business_id = (current_setting('request.headers', true)::json->>'x-business-id')::uuid
    OR business_id IN (
        SELECT id FROM public.businesses WHERE owner_id = auth.uid()
    )
);

DROP POLICY IF EXISTS "captain_laws_owner_all" ON public.captain_laws;

CREATE POLICY "captain_laws_owner_all"
ON public.captain_laws FOR ALL
USING (
    business_id = (current_setting('request.headers', true)::json->>'x-business-id')::uuid
    OR business_id IN (
        SELECT id FROM public.businesses WHERE owner_id = auth.uid()
    )
);

DROP POLICY IF EXISTS "ai_conversations_owner_all" ON public.ai_conversations;

CREATE POLICY "ai_conversations_owner_all"
ON public.ai_conversations FOR ALL
USING (
    business_id = (current_setting('request.headers', true)::json->>'x-business-id')::uuid
    OR business_id IN (
        SELECT id FROM public.businesses WHERE owner_id = auth.uid()
    )
);

DROP POLICY IF EXISTS "ai_knowledge_owner_all" ON public.ai_knowledge;

CREATE POLICY "ai_knowledge_owner_all"
ON public.ai_knowledge FOR ALL
USING (
    business_id = (current_setting('request.headers', true)::json->>'x-business-id')::uuid
    OR business_id IN (
        SELECT id FROM public.businesses WHERE owner_id = auth.uid()
    )
);

DROP POLICY IF EXISTS "ai_strategies_owner_all" ON public.ai_strategies;

CREATE POLICY "ai_strategies_owner_all"
ON public.ai_strategies FOR ALL
USING (
    business_id = (current_setting('request.headers', true)::json->>'x-business-id')::uuid
    OR business_id IN (
        SELECT id FROM public.businesses WHERE owner_id = auth.uid()
    )
);


-- ----------------------------------------------------------
-- 33. VERIFY: Show any businesses still missing owner_id
-- If this returns rows, those businesses need manual investigation.
-- ----------------------------------------------------------
SELECT id, slug, name, owner_id, created_at
FROM public.businesses
WHERE owner_id IS NULL;
