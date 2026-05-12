BEGIN;

-- 039_finance_hardening.sql
-- 目的：
-- 1. 修正 complete_paid_payment_order：不再要求套餐 active = TRUE，
--    否则当用户付款时管理员刚好归档套餐，订阅无法开通、订单卡在 prepay_created。
-- 2. 预留 finance_stats_daily、user_payment_summary RPC（见后续批次添加）。

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

  -- 放宽：仅按 plan_code 查套餐，不再要求 active = TRUE。
  -- 若套餐确实被物理删除（理论上不应发生），仍会抛错以提示 DBA 介入。
  SELECT *
  INTO v_plan
  FROM public.subscription_plans
  WHERE code = v_order.plan_code;

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

-- 财务统计聚合 RPC：把按渠道、按套餐、按日聚合从 Node 侧内存计算下沉到 SQL。
-- 之前 getAdminFinanceStats 会一次性拉回区间内全部 paid 订单到 Node 做 reduce，
-- 在订单量上来后会带来显著的网络与 CPU 开销，也会阻塞事件循环。
CREATE OR REPLACE FUNCTION public.finance_stats_daily(
  p_date_from DATE,
  p_date_to DATE
)
RETURNS TABLE(
  overview JSONB,
  channel_breakdown JSONB,
  plan_breakdown JSONB,
  daily_trend JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_range_start TIMESTAMPTZ := p_date_from::timestamptz;
  v_range_end TIMESTAMPTZ := (p_date_to + INTERVAL '1 day')::timestamptz;
BEGIN
  RETURN QUERY
  WITH in_range AS (
    SELECT status, amount_cents, payment_channel, plan_code, plan_name, created_at
    FROM public.payment_orders
    WHERE created_at >= v_range_start AND created_at < v_range_end
  ),
  paid AS (
    SELECT * FROM in_range WHERE status = 'paid'
  ),
  ov AS (
    SELECT jsonb_build_object(
      'revenueCents', COALESCE(SUM(amount_cents) FILTER (WHERE status = 'paid'), 0),
      'paidOrders', COUNT(*) FILTER (WHERE status = 'paid'),
      'pendingOrders', COUNT(*) FILTER (WHERE status IN ('created', 'prepay_created')),
      'closedOrders', COUNT(*) FILTER (WHERE status = 'closed'),
      'expiredOrders', COUNT(*) FILTER (WHERE status = 'expired'),
      'failedOrders', COUNT(*) FILTER (WHERE status = 'failed'),
      'averageOrderValueCents', CASE
        WHEN COUNT(*) FILTER (WHERE status = 'paid') > 0
          THEN ROUND((SUM(amount_cents) FILTER (WHERE status = 'paid'))::numeric / COUNT(*) FILTER (WHERE status = 'paid'))::int
        ELSE 0
      END
    ) AS data FROM in_range
  ),
  channels AS (
    SELECT COALESCE(jsonb_agg(jsonb_build_object(
      'channel', payment_channel,
      'revenueCents', revenue_cents,
      'paidOrders', paid_orders
    ) ORDER BY payment_channel), '[]'::jsonb) AS data
    FROM (
      SELECT payment_channel, SUM(amount_cents) AS revenue_cents, COUNT(*) AS paid_orders
      FROM paid
      GROUP BY payment_channel
    ) t
  ),
  plans AS (
    SELECT COALESCE(jsonb_agg(jsonb_build_object(
      'planCode', plan_code,
      'planName', plan_name,
      'revenueCents', revenue_cents,
      'paidOrders', paid_orders
    ) ORDER BY plan_code), '[]'::jsonb) AS data
    FROM (
      SELECT plan_code, MAX(plan_name) AS plan_name, SUM(amount_cents) AS revenue_cents, COUNT(*) AS paid_orders
      FROM paid
      GROUP BY plan_code
    ) t
  ),
  daily AS (
    SELECT COALESCE(jsonb_agg(jsonb_build_object(
      'date', day,
      'revenueCents', revenue_cents,
      'paidOrders', paid_orders
    ) ORDER BY day), '[]'::jsonb) AS data
    FROM (
      SELECT to_char(date_trunc('day', created_at), 'YYYY-MM-DD') AS day,
             SUM(amount_cents) AS revenue_cents,
             COUNT(*) AS paid_orders
      FROM paid
      GROUP BY date_trunc('day', created_at)
    ) t
  )
  SELECT ov.data, channels.data, plans.data, daily.data
  FROM ov, channels, plans, daily;
END;
$$;

-- 用户订单 summary RPC：替代之前的 select('status') + filter 计数。
CREATE OR REPLACE FUNCTION public.user_payment_summary(
  p_user_id UUID
)
RETURNS JSONB
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'totalCount', COUNT(*),
    'pendingCount', COUNT(*) FILTER (WHERE status IN ('created', 'prepay_created')),
    'paidCount', COUNT(*) FILTER (WHERE status = 'paid'),
    'closedCount', COUNT(*) FILTER (WHERE status = 'closed'),
    'expiredCount', COUNT(*) FILTER (WHERE status = 'expired'),
    'failedCount', COUNT(*) FILTER (WHERE status = 'failed')
  )
  FROM public.payment_orders
  WHERE user_id = p_user_id AND user_deleted_at IS NULL;
$$;

COMMIT;
