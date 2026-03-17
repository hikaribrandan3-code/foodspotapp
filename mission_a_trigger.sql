-- FoodSpot Mission A: Auto-create tenant on user signup
-- Deployed: 2025-03-15

-- 1. Create the trigger function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.tenants (
        owner_id,
        venue_name,
        language
    ) VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'business_name', 'Unnamed Venue'),
        COALESCE(NEW.raw_user_meta_data->>'language', 'es')
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Create the trigger (drop if exists for idempotency)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- 3. Verify deployment
SELECT 
    proname as function_name,
    prosrc IS NOT NULL as function_exists
FROM pg_proc 
WHERE proname = 'handle_new_user';

SELECT 
    tgname as trigger_name,
    tgrelid::regclass as table_name,
    CASE tgenabled 
        WHEN 'O' THEN 'ENABLED'
        WHEN 'D' THEN 'DISABLED'
        ELSE tgenabled::text
    END as status
FROM pg_trigger 
WHERE tgname = 'on_auth_user_created';
