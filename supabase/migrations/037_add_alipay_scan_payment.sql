BEGIN;

ALTER TABLE public.payment_settings
  ADD COLUMN IF NOT EXISTS alipay_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS alipay_app_id VARCHAR(64),
  ADD COLUMN IF NOT EXISTS alipay_notify_url TEXT,
  ADD COLUMN IF NOT EXISTS alipay_sign_type VARCHAR(16) NOT NULL DEFAULT 'RSA2',
  ADD COLUMN IF NOT EXISTS alipay_app_private_key_ciphertext TEXT,
  ADD COLUMN IF NOT EXISTS alipay_app_private_key_iv TEXT,
  ADD COLUMN IF NOT EXISTS alipay_app_private_key_auth_tag TEXT,
  ADD COLUMN IF NOT EXISTS alipay_public_key_ciphertext TEXT,
  ADD COLUMN IF NOT EXISTS alipay_public_key_iv TEXT,
  ADD COLUMN IF NOT EXISTS alipay_public_key_auth_tag TEXT;

ALTER TABLE public.payment_orders
  ADD COLUMN IF NOT EXISTS payment_channel VARCHAR(16) NOT NULL DEFAULT 'wechat',
  ADD COLUMN IF NOT EXISTS alipay_trade_no VARCHAR(128),
  ADD COLUMN IF NOT EXISTS alipay_trade_status VARCHAR(64),
  ADD COLUMN IF NOT EXISTS alipay_prepay_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS alipay_callback_payload JSONB NOT NULL DEFAULT '{}'::jsonb;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'payment_orders_payment_channel_check'
      AND conrelid = 'public.payment_orders'::regclass
  ) THEN
    ALTER TABLE public.payment_orders
      ADD CONSTRAINT payment_orders_payment_channel_check
      CHECK (payment_channel IN ('wechat', 'alipay'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_payment_orders_channel_status
  ON public.payment_orders(payment_channel, status);

ALTER TABLE public.payment_webhook_events
  ADD COLUMN IF NOT EXISTS provider VARCHAR(16) NOT NULL DEFAULT 'wechat',
  ADD COLUMN IF NOT EXISTS alipay_notify_id VARCHAR(128);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'payment_webhook_events_provider_check'
      AND conrelid = 'public.payment_webhook_events'::regclass
  ) THEN
    ALTER TABLE public.payment_webhook_events
      ADD CONSTRAINT payment_webhook_events_provider_check
      CHECK (provider IN ('wechat', 'alipay'));
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS idx_payment_webhook_events_alipay_notify_id
  ON public.payment_webhook_events(alipay_notify_id)
  WHERE alipay_notify_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.complete_paid_payment_order(
  p_order_no VARCHAR,
  p_transaction JSONB,
  p_paid_at TIMESTAMPTZ
)
RETURNS public.payment_orders
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order public.payment_orders%ROWTYPE;
  v_plan public.subscription_plans%ROWTYPE;
  v_subscription public.user_subscriptions%ROWTYPE;
  v_starts_at TIMESTAMPTZ;
  v_expires_at TIMESTAMPTZ;
BEGIN
  SELECT *
  INTO v_order
  FROM public.payment_orders
  WHERE order_no = p_order_no
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'payment order not found: %', p_order_no;
  END IF;

  IF v_order.status = 'paid' THEN
    RETURN v_order;
  END IF;

  IF v_order.status IN ('closed', 'expired', 'failed') THEN
    RETURN v_order;
  END IF;

  IF p_paid_at > v_order.expires_at THEN
    UPDATE public.payment_orders
    SET
      status = 'expired',
      wechat_trade_state = CASE WHEN v_order.payment_channel = 'wechat' THEN COALESCE(p_transaction->>'trade_state', wechat_trade_state) ELSE wechat_trade_state END,
      wechat_callback_payload = CASE WHEN v_order.payment_channel = 'wechat' THEN p_transaction ELSE wechat_callback_payload END,
      alipay_trade_status = CASE WHEN v_order.payment_channel = 'alipay' THEN COALESCE(p_transaction->>'trade_status', alipay_trade_status) ELSE alipay_trade_status END,
      alipay_callback_payload = CASE WHEN v_order.payment_channel = 'alipay' THEN p_transaction ELSE alipay_callback_payload END
    WHERE id = v_order.id
    RETURNING * INTO v_order;
    RETURN v_order;
  END IF;

  SELECT *
  INTO v_plan
  FROM public.subscription_plans
  WHERE code = v_order.plan_code
    AND active = TRUE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'subscription plan not found: %', v_order.plan_code;
  END IF;

  SELECT *
  INTO v_subscription
  FROM public.user_subscriptions
  WHERE user_id = v_order.user_id
  FOR UPDATE;

  IF FOUND
    AND v_subscription.plan_code = v_order.plan_code
    AND v_subscription.expires_at > p_paid_at THEN
    v_starts_at := v_subscription.expires_at;
  ELSE
    v_starts_at := p_paid_at;
  END IF;
  v_expires_at := v_starts_at + (v_plan.duration_days || ' days')::interval;

  INSERT INTO public.user_subscriptions (
    user_id,
    plan_code,
    status,
    starts_at,
    expires_at,
    source_order_no
  )
  VALUES (
    v_order.user_id,
    v_order.plan_code,
    'active',
    v_starts_at,
    v_expires_at,
    v_order.order_no
  )
  ON CONFLICT (user_id) DO UPDATE SET
    plan_code = EXCLUDED.plan_code,
    status = EXCLUDED.status,
    starts_at = EXCLUDED.starts_at,
    expires_at = EXCLUDED.expires_at,
    source_order_no = EXCLUDED.source_order_no;

  UPDATE public.payment_orders
  SET
    status = 'paid',
    paid_at = p_paid_at,
    wechat_transaction_id = CASE WHEN v_order.payment_channel = 'wechat' THEN p_transaction->>'transaction_id' ELSE wechat_transaction_id END,
    wechat_trade_state = CASE WHEN v_order.payment_channel = 'wechat' THEN COALESCE(p_transaction->>'trade_state', 'SUCCESS') ELSE wechat_trade_state END,
    wechat_callback_payload = CASE WHEN v_order.payment_channel = 'wechat' THEN p_transaction ELSE wechat_callback_payload END,
    alipay_trade_no = CASE WHEN v_order.payment_channel = 'alipay' THEN p_transaction->>'trade_no' ELSE alipay_trade_no END,
    alipay_trade_status = CASE WHEN v_order.payment_channel = 'alipay' THEN COALESCE(p_transaction->>'trade_status', 'TRADE_SUCCESS') ELSE alipay_trade_status END,
    alipay_callback_payload = CASE WHEN v_order.payment_channel = 'alipay' THEN p_transaction ELSE alipay_callback_payload END
  WHERE id = v_order.id
  RETURNING * INTO v_order;

  RETURN v_order;
END;
$$;

COMMIT;
