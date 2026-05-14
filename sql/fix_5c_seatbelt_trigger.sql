CREATE OR REPLACE FUNCTION public.ensure_business_exists()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM public.businesses WHERE id = NEW.business_id) THEN
        INSERT INTO public.businesses (id, slug, name, created_at)
        VALUES (
            NEW.business_id,
            COALESCE(NULLIF(NEW.slug, ''), 'biz-' || NEW.business_id::text),
            COALESCE(NULLIF(NEW.business_name, ''), 'Unnamed Business'),
            NOW()
        )
        ON CONFLICT (id) DO NOTHING;
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS ensure_business_on_branding ON public.branding;

CREATE TRIGGER ensure_business_on_branding
BEFORE INSERT ON public.branding
FOR EACH ROW
EXECUTE FUNCTION public.ensure_business_exists();
