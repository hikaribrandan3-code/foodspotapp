-- Up migration for Strike 4 CRM Fix: event_leads table
CREATE TABLE IF NOT EXISTS public.event_leads (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    business_id UUID NOT NULL,
    event_id TEXT NOT NULL,
    full_name TEXT NOT NULL,
    phone TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.event_leads ENABLE ROW LEVEL SECURITY;

-- Allow anonymous inserts (from the box office)
CREATE POLICY "Allow anonymous inserts to event_leads"
ON public.event_leads FOR INSERT
TO public
WITH CHECK (true);

-- Allow owners to view their own leads
CREATE POLICY "Allow owners to view their own event_leads"
ON public.event_leads FOR SELECT
USING (
    business_id = (current_setting('request.headers', true)::json->>'x-business-id')::uuid
);
