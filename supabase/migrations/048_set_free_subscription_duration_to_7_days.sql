UPDATE public.subscription_plans
SET
  duration_days = 7,
  updated_at = NOW()
WHERE code = 'free'
  AND duration_days <> 7;
