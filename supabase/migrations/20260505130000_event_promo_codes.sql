-- ============================================================
-- Event Promo Codes Table
-- ============================================================
CREATE TABLE IF NOT EXISTS public.event_promo_codes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
    code TEXT NOT NULL,
    discount_percent INTEGER NOT NULL DEFAULT 10,
    max_uses INTEGER,
    used_count INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(event_id, code)
);

CREATE INDEX IF NOT EXISTS idx_promo_event ON public.event_promo_codes(event_id);

-- Enable RLS
ALTER TABLE public.event_promo_codes ENABLE ROW LEVEL SECURITY;

-- Owners can CRUD their own promo codes
CREATE POLICY "event_promo_codes_owner_all"
ON public.event_promo_codes FOR ALL
USING (
    business_id = (current_setting('request.headers', true)::json->>'x-business-id')::uuid
);

-- RPC function to atomically increment promo used_count
CREATE OR REPLACE FUNCTION public.increment_promo_used_count(p_event_id UUID, p_code TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE public.event_promo_codes
    SET used_count = used_count + 1
    WHERE event_id = p_event_id AND code = p_code;
END;
$$;

-- Seed test codes for demo events
DO $$
DECLARE
    demo_business_id UUID;
    demo_event_id UUID;
BEGIN
    SELECT id INTO demo_business_id FROM public.businesses WHERE slug = 'demo' LIMIT 1;
    
    IF demo_business_id IS NOT NULL THEN
        SELECT id INTO demo_event_id FROM public.events WHERE business_id = demo_business_id LIMIT 1;
        
        IF demo_event_id IS NOT NULL THEN
            INSERT INTO public.event_promo_codes (business_id, event_id, code, discount_percent, max_uses)
            VALUES (demo_business_id, demo_event_id, 'LAUNCH10', 10, 999)
            ON CONFLICT (event_id, code) DO NOTHING;
        END IF;
    END IF;
END $$;