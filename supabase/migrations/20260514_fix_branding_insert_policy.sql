DROP POLICY IF EXISTS branding_insert_owner ON public.branding;
CREATE POLICY branding_insert_owner ON public.branding FOR INSERT WITH CHECK (auth.uid() = user_id);
