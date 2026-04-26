BEGIN;

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
      wechat_trade_state = COALESCE(p_transaction->>'trade_state', wechat_trade_state),
      wechat_callback_payload = p_transaction
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
    wechat_transaction_id = p_transaction->>'transaction_id',
    wechat_trade_state = COALESCE(p_transaction->>'trade_state', 'SUCCESS'),
    wechat_callback_payload = p_transaction
  WHERE id = v_order.id
  RETURNING * INTO v_order;

  RETURN v_order;
END;
$$;

COMMIT;
