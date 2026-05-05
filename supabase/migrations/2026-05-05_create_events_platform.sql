-- ========================================================
-- DAY 1: Events Platform Backend Schema
-- 3 tables: events, event_orders, event_checkins
-- INTEGER math only (cents). No floats.
-- ========================================================

-- ========================================================
-- 1. EVENTS TABLE
-- ========================================================
CREATE TABLE IF NOT EXISTS public.events (
    id                  UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    business_id         UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    name                TEXT NOT NULL,
    description         TEXT,
    category            TEXT NOT NULL DEFAULT 'Food',
    start_date          TIMESTAMP WITH TIME ZONE NOT NULL,
    end_date            TIMESTAMP WITH TIME ZONE,
    venue_name          TEXT,
    address             TEXT,
    image_url           TEXT,
    is_free             BOOLEAN NOT NULL DEFAULT false,
    -- CRITICAL: status controls visibility. Only 'live' events appear on frontend.
    status              TEXT NOT NULL DEFAULT 'draft'
                        CHECK (status IN ('draft', 'live', 'archived')),
    -- Tiers stored as JSONB: [{id, name, price_cents, capacity, sold}]
    -- price_cents is INTEGER (minor units). $25.00 = 2500.
    ticket_tiers        JSONB NOT NULL DEFAULT '[]'::jsonb,
    -- Addons stored as JSONB: [{id, name, price_cents}]
    addons              JSONB NOT NULL DEFAULT '[]'::jsonb,
    -- Optional lineup for festivals
    lineup              JSONB DEFAULT '[]'::jsonb,
    venue_map           JSONB DEFAULT NULL,
    -- Aggregates (auto-maintained by trigger)
    total_capacity      INTEGER NOT NULL DEFAULT 0,
    tickets_sold        INTEGER NOT NULL DEFAULT 0,
    total_revenue_cents INTEGER NOT NULL DEFAULT 0,
    checkins_count      INTEGER NOT NULL DEFAULT 0,
    created_at          TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at          TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_events_business ON public.events(business_id);
CREATE INDEX IF NOT EXISTS idx_events_status ON public.events(status);
CREATE INDEX IF NOT EXISTS idx_events_start_date ON public.events(start_date);

-- Enable RLS
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

-- Owners can CRUD their own events
CREATE POLICY "events_owner_all"
ON public.events FOR ALL
USING (
    business_id = (current_setting('request.headers', true)::json->>'x-business-id')::uuid
);

-- Customers can ONLY read live events
CREATE POLICY "events_public_read"
ON public.events FOR SELECT
USING (status = 'live');


-- ========================================================
-- 2. EVENT_ORDERS TABLE
-- ========================================================
CREATE TABLE IF NOT EXISTS public.event_orders (
    id                UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    business_id       UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    event_id          UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
    -- Customer info (guest checkout, no auth required)
    customer_name     TEXT,
    customer_email    TEXT,
    customer_phone    TEXT,
    -- Ticket details stored as JSONB snapshots
    tier_snapshot     JSONB NOT NULL,
    quantity          INTEGER NOT NULL DEFAULT 1,
    addons_snapshot   JSONB NOT NULL DEFAULT '[]'::jsonb,
    -- Pricing -- ALL integers (cents). No floats. Ever.
    subtotal_cents    INTEGER NOT NULL,
    discount_cents    INTEGER NOT NULL DEFAULT 0,
    total_cents       INTEGER NOT NULL,
    -- Promo / Referral
    promo_code        TEXT,
    referral_code     TEXT,
    -- Payment
    payment_status    TEXT NOT NULL DEFAULT 'pending'
                      CHECK (payment_status IN ('pending', 'paid', 'refunded', 'cancelled')),
    payment_method    TEXT,
    -- CRITICAL: mp_preference_id stored BEFORE customer pays (webhook routing)
    mp_preference_id  TEXT,
    mp_payment_id     TEXT,
    -- Ticket
    ticket_code       TEXT NOT NULL UNIQUE,
    -- Guest token for unauthenticated "My Tickets" access
    guest_token       TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    created_at        TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at        TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_event_orders_event ON public.event_orders(event_id);
CREATE INDEX IF NOT EXISTS idx_event_orders_business ON public.event_orders(business_id);
CREATE INDEX IF NOT EXISTS idx_event_orders_guest_token ON public.event_orders(guest_token);
CREATE INDEX IF NOT EXISTS idx_event_orders_ticket_code ON public.event_orders(ticket_code);
CREATE INDEX IF NOT EXISTS idx_event_orders_mp_payment ON public.event_orders(mp_payment_id);

-- Enable RLS
ALTER TABLE public.event_orders ENABLE ROW LEVEL SECURITY;

-- Owners can see all orders for their events
CREATE POLICY "event_orders_owner_read"
ON public.event_orders FOR SELECT
USING (
    business_id = (current_setting('request.headers', true)::json->>'x-business-id')::uuid
);

-- Guests can see their own orders via guest_token
CREATE POLICY "event_orders_guest_read"
ON public.event_orders FOR SELECT
USING (
    guest_token = current_setting('request.headers', true)::json->>'x-guest-token'
);

-- Public can create orders (checkout flow)
CREATE POLICY "event_orders_public_insert"
ON public.event_orders FOR INSERT
WITH CHECK (true);


-- ========================================================
-- 3. EVENT_CHECKINS TABLE
-- ========================================================
CREATE TABLE IF NOT EXISTS public.event_checkins (
    id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    event_id        UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
    order_id        UUID NOT NULL REFERENCES public.event_orders(id) ON DELETE CASCADE,
    checked_in_at   TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    checked_in_by   UUID,
    checkin_method  TEXT NOT NULL DEFAULT 'qr_scan'
                      CHECK (checkin_method IN ('qr_scan', 'manual', 'wristband')),
    notes           TEXT,
    -- Prevent double check-in at the door
    UNIQUE(event_id, order_id)
);

CREATE INDEX IF NOT EXISTS idx_event_checkins_event ON public.event_checkins(event_id);
CREATE INDEX IF NOT EXISTS idx_event_checkins_order ON public.event_checkins(order_id);

-- Enable RLS
ALTER TABLE public.event_checkins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "event_checkins_owner_all"
ON public.event_checkins FOR ALL
USING (
    event_id IN (
        SELECT id FROM public.events
        WHERE business_id = (current_setting('request.headers', true)::json->>'x-business-id')::uuid
    )
);


-- ========================================================
-- 4. TRIGGER: Auto-Update Event Aggregates
-- ========================================================
CREATE OR REPLACE FUNCTION public.recalc_event_stats()
RETURNS TRIGGER AS $$
DECLARE
    v_event_id UUID;
BEGIN
    IF TG_OP = 'DELETE' THEN
        v_event_id := OLD.event_id;
    ELSE
        v_event_id := NEW.event_id;
    END IF;

    UPDATE public.events
    SET
        tickets_sold = COALESCE((
            SELECT SUM(quantity) FROM public.event_orders
            WHERE event_id = v_event_id AND payment_status = 'paid'
        ), 0),
        total_revenue_cents = COALESCE((
            SELECT SUM(total_cents) FROM public.event_orders
            WHERE event_id = v_event_id AND payment_status = 'paid'
        ), 0),
        checkins_count = COALESCE((
            SELECT COUNT(*) FROM public.event_checkins
            WHERE event_id = v_event_id
        ), 0),
        updated_at = NOW()
    WHERE id = v_event_id;

    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS event_orders_stats_trigger ON public.event_orders;
CREATE TRIGGER event_orders_stats_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.event_orders
FOR EACH ROW
EXECUTE FUNCTION public.recalc_event_stats();

DROP TRIGGER IF EXISTS event_checkins_stats_trigger ON public.event_checkins;
CREATE TRIGGER event_checkins_stats_trigger
AFTER INSERT OR DELETE ON public.event_checkins
FOR EACH ROW
EXECUTE FUNCTION public.recalc_event_stats();


-- ========================================================
-- 5. SEED: Demo Events (survive DB resets)
-- ========================================================
-- Only seed if a business with slug 'demo' exists
DO $$
DECLARE
    demo_business_id UUID;
BEGIN
    SELECT id INTO demo_business_id FROM public.businesses WHERE slug = 'demo' LIMIT 1;

    IF demo_business_id IS NOT NULL THEN
        -- Only seed if no events exist for this business
        IF NOT EXISTS (SELECT 1 FROM public.events WHERE business_id = demo_business_id LIMIT 1) THEN

            INSERT INTO public.events (
                business_id, name, description, category, start_date, end_date,
                venue_name, address, image_url, is_free, status, ticket_tiers, addons,
                total_capacity, created_at
            ) VALUES
            (
                demo_business_id,
                'Neon Tech Summit 2026',
                'An exclusive deep dive into the future of food technology and sustainable automation. Join industry leaders for a day of innovation.',
                'Exclusives',
                '2026-06-15T14:00:00Z',
                '2026-06-15T20:00:00Z',
                'Main Hall A',
                'Cyber Park Convention Center',
                'https://images.unsplash.com/photo-1505373877841-8d25f7d46678?q=80&w=800',
                false,
                'live',
                '[
                    {"id":"tier_vip_table","name":"VIP Table for 4","price_cents":120000,"capacity":10,"sold":0},
                    {"id":"tier_vip","name":"VIP Pass","price_cents":25000,"capacity":50,"sold":0},
                    {"id":"tier_regular","name":"General Admission","price_cents":9500,"capacity":200,"sold":0}
                ]'::jsonb,
                '[]'::jsonb,
                260,
                NOW()
            ),
            (
                demo_business_id,
                'Midnight Market Sessions',
                'Live jazz, craft cocktails, and the best night vibes in the city. A recurring session for those who appreciate the finer things.',
                'Music',
                '2026-05-28T21:00:00Z',
                '2026-05-29T02:00:00Z',
                'The Velvet Lounge',
                'Downtown District',
                'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?q=80&w=800',
                false,
                'live',
                '[
                    {"id":"tier_vip","name":"VIP Pass","price_cents":7500,"capacity":30,"sold":0},
                    {"id":"tier_regular","name":"General Admission","price_cents":3000,"capacity":100,"sold":0}
                ]'::jsonb,
                '[]'::jsonb,
                130,
                NOW()
            ),
            (
                demo_business_id,
                'Summer Garden Acoustics',
                'Relaxed acoustic performances in our open-air garden. Perfect for families and weekend relaxation.',
                'Free',
                '2026-07-04T16:00:00Z',
                '2026-07-04T20:00:00Z',
                'Bistro Terrace',
                'Botanical Bistro Terrace',
                'https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?q=80&w=800',
                true,
                'live',
                '[
                    {"id":"tier_free","name":"General Admission","price_cents":0,"capacity":500,"sold":0}
                ]'::jsonb,
                '[]'::jsonb,
                500,
                NOW()
            ),
            (
                demo_business_id,
                'Electronic Echoes Festival',
                'A massive celebration of electronic music featuring international DJs and immersive light shows.',
                'Festivals',
                '2026-08-12T18:00:00Z',
                '2026-08-13T04:00:00Z',
                'Stadium Ground',
                'Starlight Stadium',
                'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?q=80&w=800',
                false,
                'live',
                '[
                    {"id":"tier_vip_l","name":"VIP Lounge North","price_cents":45000,"capacity":50,"sold":0},
                    {"id":"tier_vip_r","name":"VIP Lounge South","price_cents":45000,"capacity":50,"sold":0},
                    {"id":"tier_tables","name":"Front Row Tables","price_cents":180000,"capacity":12,"sold":0},
                    {"id":"tier_general","name":"GA Field Access","price_cents":15000,"capacity":5000,"sold":0}
                ]'::jsonb,
                '[]'::jsonb,
                5112,
                NOW()
            ),
            (
                demo_business_id,
                'Secret Sneaker Pop-Up',
                'Limited edition drops and exclusive collaborations. First come, first served. Location revealed 24h before.',
                'Pop-ups',
                '2026-05-30T10:00:00Z',
                '2026-05-30T16:00:00Z',
                'The Vault',
                'Secret Location, DT',
                'https://images.unsplash.com/photo-1552346154-21d32810aba3?q=80&w=800',
                true,
                'live',
                '[
                    {"id":"tier_free","name":"General Admission","price_cents":0,"capacity":200,"sold":0}
                ]'::jsonb,
                '[]'::jsonb,
                200,
                NOW()
            );

        END IF;
    END IF;
END $$;
