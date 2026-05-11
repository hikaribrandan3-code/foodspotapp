-- ========================================================
-- PRODUCTION MIGRATION: Demo Events Seeding for All Tenants
-- Created: 2026-05-11
-- Purpose: Auto-seed 8 demo events when a new business is created
-- ========================================================

-- PART 1: SEED DEMO EVENTS FOR EXISTING TENANTS
-- Run once to backfill all existing businesses without events
INSERT INTO public.events (
    id, business_id, name, description, category, start_date, end_date,
    venue_name, address, image_url, is_free, status, ticket_tiers, addons,
    total_capacity
)
SELECT
    gen_random_uuid(),
    b.id,
    event_data->>'name',
    event_data->>'description',
    event_data->>'category',
    (event_data->>'start_date')::TIMESTAMP WITH TIME ZONE,
    (event_data->>'end_date')::TIMESTAMP WITH TIME ZONE,
    event_data->>'venue_name',
    event_data->>'address',
    event_data->>'image_url',
    (event_data->>'is_free')::BOOLEAN,
    'live',
    (event_data->>'ticket_tiers')::JSONB,
    '[]'::JSONB,
    (event_data->>'total_capacity')::INTEGER
FROM public.businesses b
CROSS JOIN (
    SELECT jsonb_build_object(
        'name', 'Neon Tech Summit 2026',
        'description', 'An exclusive deep dive into the future of food technology and sustainable automation. Join industry leaders for a day of innovation.',
        'category', 'Exclusives',
        'start_date', '2026-06-15T14:00:00Z',
        'end_date', '2026-06-15T20:00:00Z',
        'venue_name', 'Main Hall A',
        'address', 'Cyber Park Convention Center',
        'image_url', 'https://images.unsplash.com/photo-1505373877841-8d25f7d46678?q=80&w=800',
        'is_free', false,
        'ticket_tiers', '[{"id":"tier_vip_table","name":"VIP Table for 4","price_cents":120000,"capacity":10,"sold":0},{"id":"tier_vip","name":"VIP Pass","price_cents":25000,"capacity":50,"sold":0},{"id":"tier_regular","name":"General Admission","price_cents":9500,"capacity":200,"sold":0}]',
        'total_capacity', 260
    ) AS event_data
    UNION ALL
    SELECT jsonb_build_object(
        'name', 'Midnight Market Sessions',
        'description', 'Live jazz, craft cocktails, and the best night vibes in the city. A recurring session for those who appreciate the finer things.',
        'category', 'Music',
        'start_date', '2026-05-28T21:00:00Z',
        'end_date', '2026-05-29T02:00:00Z',
        'venue_name', 'The Velvet Lounge',
        'address', 'Downtown District',
        'image_url', 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?q=80&w=800',
        'is_free', false,
        'ticket_tiers', '[{"id":"tier_vip","name":"VIP Pass","price_cents":7500,"capacity":30,"sold":0},{"id":"tier_regular","name":"General Admission","price_cents":3000,"capacity":100,"sold":0}]',
        'total_capacity', 130
    ) AS event_data
    UNION ALL
    SELECT jsonb_build_object(
        'name', 'Summer Garden Acoustics',
        'description', 'Relaxed acoustic performances in our open-air garden. Perfect for families and weekend relaxation.',
        'category', 'Free',
        'start_date', '2026-07-04T16:00:00Z',
        'end_date', '2026-07-04T20:00:00Z',
        'venue_name', 'Bistro Terrace',
        'address', 'Botanical Bistro Terrace',
        'image_url', 'https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?q=80&w=800',
        'is_free', true,
        'ticket_tiers', '[{"id":"tier_free","name":"General Admission","price_cents":0,"capacity":500,"sold":0}]',
        'total_capacity', 500
    ) AS event_data
    UNION ALL
    SELECT jsonb_build_object(
        'name', 'Electronic Echoes Festival',
        'description', 'A massive celebration of electronic music featuring international DJs and immersive light shows.',
        'category', 'Festivals',
        'start_date', '2026-08-12T18:00:00Z',
        'end_date', '2026-08-13T04:00:00Z',
        'venue_name', 'Stadium Ground',
        'address', 'Starlight Stadium',
        'image_url', 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?q=80&w=800',
        'is_free', false,
        'ticket_tiers', '[{"id":"tier_vip_l","name":"VIP Lounge North","price_cents":45000,"capacity":50,"sold":0},{"id":"tier_vip_r","name":"VIP Lounge South","price_cents":45000,"capacity":50,"sold":0},{"id":"tier_tables","name":"Front Row Tables","price_cents":180000,"capacity":12,"sold":0},{"id":"tier_general","name":"GA Field Access","price_cents":15000,"capacity":5000,"sold":0}]',
        'total_capacity', 5112
    ) AS event_data
    UNION ALL
    SELECT jsonb_build_object(
        'name', 'Secret Sneaker Pop-Up',
        'description', 'Limited edition drops and exclusive collaborations. First come, first served. Location revealed 24h before.',
        'category', 'Pop-ups',
        'start_date', '2026-05-30T10:00:00Z',
        'end_date', '2026-05-30T16:00:00Z',
        'venue_name', 'The Vault',
        'address', 'Secret Location, DT',
        'image_url', 'https://images.unsplash.com/photo-1552346154-21d32810aba3?q=80&w=800',
        'is_free', true,
        'ticket_tiers', '[{"id":"tier_free","name":"General Admission","price_cents":0,"capacity":200,"sold":0}]',
        'total_capacity', 200
    ) AS event_data
    UNION ALL
    SELECT jsonb_build_object(
        'name', 'Rooftop Dining Experience',
        'description', 'An elevated dining experience with 360-degree city views. Multi-course tasting menu from our award-winning chef.',
        'category', 'Dining',
        'start_date', '2026-06-22T18:00:00Z',
        'end_date', '2026-06-22T23:30:00Z',
        'venue_name', 'The Peak Restaurant',
        'address', 'Tower District',
        'image_url', 'https://images.unsplash.com/photo-1551632786-de41ec16aWeeklyCheckIn-Restaurant.jpg?q=80&w=800',
        'is_free', false,
        'ticket_tiers', '[{"id":"tier_exclusive","name":"Chef\'s Table (6 seats)","price_cents":350000,"capacity":6,"sold":0},{"id":"tier_vip","name":"VIP Seating","price_cents":95000,"capacity":20,"sold":0},{"id":"tier_regular","name":"Standard Seating","price_cents":65000,"capacity":40,"sold":0}]',
        'total_capacity', 66
    ) AS event_data
    UNION ALL
    SELECT jsonb_build_object(
        'name', 'Fitness & Wellness Expo',
        'description', 'A one-day expo celebrating health, wellness, and community. Fitness classes, wellness booths, and healthy food vendors.',
        'category', 'Wellness',
        'start_date', '2026-06-01T09:00:00Z',
        'end_date', '2026-06-01T17:00:00Z',
        'venue_name', 'Wellness Center Hub',
        'address', 'Park Avenue',
        'image_url', 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?q=80&w=800',
        'is_free', true,
        'ticket_tiers', '[{"id":"tier_free","name":"General Admission","price_cents":0,"capacity":1000,"sold":0}]',
        'total_capacity', 1000
    ) AS event_data
) AS demo_events
WHERE NOT EXISTS (
    -- Only seed if business has NO existing events
    SELECT 1 FROM public.events WHERE business_id = b.id
)
ON CONFLICT DO NOTHING;


-- PART 2: CREATE TRIGGER FUNCTION FOR NEW BUSINESS CREATION
-- Auto-seed demo events whenever a new business is created
DROP FUNCTION IF EXISTS public.seed_demo_events_for_business() CASCADE;

CREATE OR REPLACE FUNCTION public.seed_demo_events_for_business()
RETURNS TRIGGER AS $$
BEGIN
    -- Insert 8 demo events for the new business
    INSERT INTO public.events (
        id, business_id, name, description, category, start_date, end_date,
        venue_name, address, image_url, is_free, status, ticket_tiers, addons,
        total_capacity
    ) VALUES
    (
        gen_random_uuid(),
        NEW.id,
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
        '[{"id":"tier_vip_table","name":"VIP Table for 4","price_cents":120000,"capacity":10,"sold":0},{"id":"tier_vip","name":"VIP Pass","price_cents":25000,"capacity":50,"sold":0},{"id":"tier_regular","name":"General Admission","price_cents":9500,"capacity":200,"sold":0}]'::JSONB,
        '[]'::JSONB,
        260
    ),
    (
        gen_random_uuid(),
        NEW.id,
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
        '[{"id":"tier_vip","name":"VIP Pass","price_cents":7500,"capacity":30,"sold":0},{"id":"tier_regular","name":"General Admission","price_cents":3000,"capacity":100,"sold":0}]'::JSONB,
        '[]'::JSONB,
        130
    ),
    (
        gen_random_uuid(),
        NEW.id,
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
        '[{"id":"tier_free","name":"General Admission","price_cents":0,"capacity":500,"sold":0}]'::JSONB,
        '[]'::JSONB,
        500
    ),
    (
        gen_random_uuid(),
        NEW.id,
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
        '[{"id":"tier_vip_l","name":"VIP Lounge North","price_cents":45000,"capacity":50,"sold":0},{"id":"tier_vip_r","name":"VIP Lounge South","price_cents":45000,"capacity":50,"sold":0},{"id":"tier_tables","name":"Front Row Tables","price_cents":180000,"capacity":12,"sold":0},{"id":"tier_general","name":"GA Field Access","price_cents":15000,"capacity":5000,"sold":0}]'::JSONB,
        '[]'::JSONB,
        5112
    ),
    (
        gen_random_uuid(),
        NEW.id,
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
        '[{"id":"tier_free","name":"General Admission","price_cents":0,"capacity":200,"sold":0}]'::JSONB,
        '[]'::JSONB,
        200
    ),
    (
        gen_random_uuid(),
        NEW.id,
        'Rooftop Dining Experience',
        'An elevated dining experience with 360-degree city views. Multi-course tasting menu from our award-winning chef.',
        'Dining',
        '2026-06-22T18:00:00Z',
        '2026-06-22T23:30:00Z',
        'The Peak Restaurant',
        'Tower District',
        'https://images.unsplash.com/photo-1414235077418-3a51713f493d?q=80&w=800',
        false,
        'live',
        '[{"id":"tier_exclusive","name":"Chef\'s Table (6 seats)","price_cents":350000,"capacity":6,"sold":0},{"id":"tier_vip","name":"VIP Seating","price_cents":95000,"capacity":20,"sold":0},{"id":"tier_regular","name":"Standard Seating","price_cents":65000,"capacity":40,"sold":0}]'::JSONB,
        '[]'::JSONB,
        66
    ),
    (
        gen_random_uuid(),
        NEW.id,
        'Fitness & Wellness Expo',
        'A one-day expo celebrating health, wellness, and community. Fitness classes, wellness booths, and healthy food vendors.',
        'Wellness',
        '2026-06-01T09:00:00Z',
        '2026-06-01T17:00:00Z',
        'Wellness Center Hub',
        'Park Avenue',
        'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?q=80&w=800',
        true,
        'live',
        '[{"id":"tier_free","name":"General Admission","price_cents":0,"capacity":1000,"sold":0}]'::JSONB,
        '[]'::JSONB,
        1000
    ),
    (
        gen_random_uuid(),
        NEW.id,
        'Art Gallery Opening Night',
        'Exclusive preview of our summer collection. Meet the artists, enjoy refreshments, and be among the first to see the new works.',
        'Art & Culture',
        '2026-05-25T19:00:00Z',
        '2026-05-25T22:00:00Z',
        'Contemporary Art Space',
        'Creative District',
        'https://images.unsplash.com/photo-1561214115-6d2f1b0609fa?q=80&w=800',
        true,
        'live',
        '[{"id":"tier_free","name":"General Admission","price_cents":0,"capacity":300,"sold":0}]'::JSONB,
        '[]'::JSONB,
        300
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS trigger_seed_demo_events ON public.businesses;

-- Create trigger on business creation
CREATE TRIGGER trigger_seed_demo_events
AFTER INSERT ON public.businesses
FOR EACH ROW
EXECUTE FUNCTION public.seed_demo_events_for_business();

-- ========================================================
-- PART 3: VERIFY/UPDATE RLS POLICY FOR DELETE OPERATIONS
-- Ensure owners can delete their own events
-- ========================================================
DROP POLICY IF EXISTS "events_owner_delete" ON public.events;

CREATE POLICY "events_owner_delete"
ON public.events FOR DELETE
USING (
    business_id = (current_setting('request.headers', true)::json->>'x-business-id')::uuid
);
