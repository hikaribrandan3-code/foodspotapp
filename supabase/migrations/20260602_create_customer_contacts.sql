-- ============================================================
-- CRM: customer_contacts table
-- Tracks unique customers per business, auto-populated from orders.
-- Created: 2026-06-02
-- ============================================================

CREATE TABLE IF NOT EXISTS public.customer_contacts (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  phone       TEXT NOT NULL,
  name        TEXT,
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT unique_business_phone UNIQUE(business_id, phone)
);

CREATE INDEX IF NOT EXISTS idx_customer_contacts_business ON public.customer_contacts(business_id);

ALTER TABLE public.customer_contacts ENABLE ROW LEVEL SECURITY;

-- Public insert so the order trigger (SECURITY DEFINER) can fire without auth
CREATE POLICY "contacts_public_insert"
ON public.customer_contacts FOR INSERT WITH CHECK (true);

-- Owners can only read/update/delete their own business contacts
CREATE POLICY "contacts_owner_select"
ON public.customer_contacts FOR SELECT
USING (business_id IN (SELECT id FROM public.businesses WHERE owner_id = auth.uid()));

CREATE POLICY "contacts_owner_update"
ON public.customer_contacts FOR UPDATE
USING (business_id IN (SELECT id FROM public.businesses WHERE owner_id = auth.uid()));

CREATE POLICY "contacts_owner_delete"
ON public.customer_contacts FOR DELETE
USING (business_id IN (SELECT id FROM public.businesses WHERE owner_id = auth.uid()));

-- Auto-capture: upsert contact whenever an order is placed
CREATE OR REPLACE FUNCTION public.upsert_customer_contact()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.customer_phone IS NOT NULL AND NEW.business_id IS NOT NULL THEN
    INSERT INTO public.customer_contacts (business_id, phone, name)
    VALUES (NEW.business_id, NEW.customer_phone, NEW.customer_name)
    ON CONFLICT (business_id, phone)
    DO UPDATE SET
      name       = COALESCE(EXCLUDED.name, public.customer_contacts.name),
      updated_at = now();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_upsert_contact ON public.orders;
CREATE TRIGGER trigger_upsert_contact
AFTER INSERT ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.upsert_customer_contact();
