BEGIN;

ALTER TABLE public.payment_orders
  ADD COLUMN IF NOT EXISTS user_deleted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS cancelled_by_user_id UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS cancel_reason TEXT;

CREATE INDEX IF NOT EXISTS idx_payment_orders_created_at
  ON public.payment_orders(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_payment_orders_paid_at
  ON public.payment_orders(paid_at DESC)
  WHERE paid_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_payment_orders_channel_status_created
  ON public.payment_orders(payment_channel, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_payment_orders_plan_created
  ON public.payment_orders(plan_code, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_payment_orders_user_visible_created
  ON public.payment_orders(user_id, user_deleted_at, created_at DESC);

COMMIT;
