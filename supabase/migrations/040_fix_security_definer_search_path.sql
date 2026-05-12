BEGIN;

-- Supabase Security Advisor flags SECURITY DEFINER functions unless their
-- search_path is pinned to an empty string. The function bodies already use
-- schema-qualified public.* object references, so this only hardens execution
-- context without changing behavior.
ALTER FUNCTION public.complete_paid_payment_order(VARCHAR, JSONB, TIMESTAMPTZ)
  SET search_path = '';

ALTER FUNCTION public.finance_stats_daily(DATE, DATE)
  SET search_path = '';

ALTER FUNCTION public.user_payment_summary(UUID)
  SET search_path = '';

COMMIT;
