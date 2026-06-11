-- 20260610_fix_security_definer_search_path.sql
--
-- Supabase Advisor: SECURITY DEFINER functions without SET search_path = ''
-- are vulnerable to search_path injection. This migration explicitly sets
-- search_path = public for all affected functions, which matches the existing
-- implicit behavior and closes the attack vector without code changes.
--
-- Functions already fixed: get_user_primary_business (already has SET search_path = public)

-- ── Core order FSM ────────────────────────────────────────────────────────────
ALTER FUNCTION public.advance_order_status(p_order_id UUID, p_target_status TEXT)
  SET search_path = public;

-- ── Event management ──────────────────────────────────────────────────────────
ALTER FUNCTION public.delete_event(p_event_id UUID, p_business_id UUID)
  SET search_path = public;

ALTER FUNCTION public.increment_event_tier_sold(p_event_id UUID, p_tier_id TEXT, p_quantity INTEGER)
  SET search_path = public;

ALTER FUNCTION public.increment_promo_used_count(p_event_id UUID, p_code TEXT)
  SET search_path = public;

-- ── AI context functions ──────────────────────────────────────────────────────
ALTER FUNCTION public.get_ai_business_context(p_business_id UUID, p_days INTEGER)
  SET search_path = public;

ALTER FUNCTION public.get_ai_menu_context(p_business_id UUID)
  SET search_path = public;

ALTER FUNCTION public.get_ai_inventory_context(p_business_id UUID)
  SET search_path = public;

-- ── Tier gating ───────────────────────────────────────────────────────────────
ALTER FUNCTION public.check_tier_limits(p_business_id UUID)
  SET search_path = public;

ALTER FUNCTION public.increment_mp_usage(p_business_id UUID)
  SET search_path = public;

ALTER FUNCTION public.upgrade_to_pro(p_business_id UUID)
  SET search_path = public;

-- ── CRM trigger ───────────────────────────────────────────────────────────────
ALTER FUNCTION public.upsert_customer_contact()
  SET search_path = public;

-- ── Scheduler (stalled order detection) ──────────────────────────────────────
ALTER FUNCTION public.check_stalled_orders()
  SET search_path = public;
