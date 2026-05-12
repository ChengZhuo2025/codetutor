BEGIN;

-- Performance Advisor suggests wrapping auth.uid() in a scalar subquery in RLS
-- policies so Postgres initializes it once per statement instead of per row.
DROP POLICY IF EXISTS "Users can read own payment orders" ON public.payment_orders;
CREATE POLICY "Users can read own payment orders" ON public.payment_orders
  FOR SELECT USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can read own subscription" ON public.user_subscriptions;
CREATE POLICY "Users can read own subscription" ON public.user_subscriptions
  FOR SELECT USING ((SELECT auth.uid()) = user_id);

COMMIT;
