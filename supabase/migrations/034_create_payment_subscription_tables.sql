BEGIN;

CREATE TABLE IF NOT EXISTS public.payment_settings (
  id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  enabled BOOLEAN NOT NULL DEFAULT FALSE,
  app_id VARCHAR(64),
  mch_id VARCHAR(64),
  notify_url TEXT,
  merchant_serial_no VARCHAR(128),
  merchant_private_key_ciphertext TEXT,
  merchant_private_key_iv TEXT,
  merchant_private_key_auth_tag TEXT,
  api_v3_key_ciphertext TEXT,
  api_v3_key_iv TEXT,
  api_v3_key_auth_tag TEXT,
  wechatpay_public_key_id VARCHAR(128),
  wechatpay_public_key_ciphertext TEXT,
  wechatpay_public_key_iv TEXT,
  wechatpay_public_key_auth_tag TEXT,
  secret_key_version VARCHAR(32),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by_admin_id UUID REFERENCES public.admin_accounts(id)
);

INSERT INTO public.payment_settings (id, enabled)
VALUES (1, FALSE)
ON CONFLICT (id) DO NOTHING;

DROP TRIGGER IF EXISTS payment_settings_updated_at ON public.payment_settings;
CREATE TRIGGER payment_settings_updated_at
  BEFORE UPDATE ON public.payment_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TABLE IF NOT EXISTS public.subscription_plans (
  code VARCHAR(64) PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  price_cents INTEGER NOT NULL CHECK (price_cents >= 0),
  currency VARCHAR(3) NOT NULL DEFAULT 'CNY',
  duration_days INTEGER NOT NULL CHECK (duration_days > 0),
  tier_rank INTEGER NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  features JSONB NOT NULL DEFAULT '[]'::jsonb,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO public.subscription_plans (
  code,
  name,
  price_cents,
  currency,
  duration_days,
  tier_rank,
  description,
  features,
  active
) VALUES
  (
    'personal_monthly',
    '个人版',
    3900,
    'CNY',
    31,
    10,
    '无限学习，持续陪练',
    '["无限 AI 导师对话", "完整学习进度追踪", "全部工具学习路径", "段位 + 连续打卡激励", "历史会话与知识点回顾"]'::jsonb,
    TRUE
  ),
  (
    'pro_monthly',
    '专业版',
    9900,
    'CNY',
    31,
    20,
    '项目实战陪跑',
    '["个人版全部功能", "项目实战陪跑", "优先响应支持", "高级学习路径模版", "专属工具推荐"]'::jsonb,
    TRUE
  )
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  price_cents = EXCLUDED.price_cents,
  currency = EXCLUDED.currency,
  duration_days = EXCLUDED.duration_days,
  tier_rank = EXCLUDED.tier_rank,
  description = EXCLUDED.description,
  features = EXCLUDED.features,
  active = EXCLUDED.active,
  updated_at = NOW();

DROP TRIGGER IF EXISTS subscription_plans_updated_at ON public.subscription_plans;
CREATE TRIGGER subscription_plans_updated_at
  BEFORE UPDATE ON public.subscription_plans
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TABLE IF NOT EXISTS public.payment_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  order_no VARCHAR(64) NOT NULL UNIQUE,
  plan_code VARCHAR(64) NOT NULL REFERENCES public.subscription_plans(code),
  plan_name VARCHAR(100) NOT NULL,
  amount_cents INTEGER NOT NULL CHECK (amount_cents > 0),
  currency VARCHAR(3) NOT NULL DEFAULT 'CNY',
  status VARCHAR(32) NOT NULL DEFAULT 'created' CHECK (status IN ('created', 'prepay_created', 'paid', 'closed', 'expired', 'failed')),
  code_url TEXT,
  wechat_transaction_id VARCHAR(128),
  wechat_trade_state VARCHAR(64),
  wechat_prepay_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  wechat_callback_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  paid_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payment_orders_user_id_created_at ON public.payment_orders(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_payment_orders_status ON public.payment_orders(status);

DROP TRIGGER IF EXISTS payment_orders_updated_at ON public.payment_orders;
CREATE TRIGGER payment_orders_updated_at
  BEFORE UPDATE ON public.payment_orders
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TABLE IF NOT EXISTS public.user_subscriptions (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_code VARCHAR(64) NOT NULL REFERENCES public.subscription_plans(code),
  status VARCHAR(32) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'expired')),
  starts_at TIMESTAMPTZ NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  source_order_no VARCHAR(64) REFERENCES public.payment_orders(order_no),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_subscriptions_expires_at ON public.user_subscriptions(expires_at);

DROP TRIGGER IF EXISTS user_subscriptions_updated_at ON public.user_subscriptions;
CREATE TRIGGER user_subscriptions_updated_at
  BEFORE UPDATE ON public.user_subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TABLE IF NOT EXISTS public.payment_webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wechat_event_id VARCHAR(128),
  order_no VARCHAR(64),
  headers JSONB NOT NULL DEFAULT '{}'::jsonb,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  decrypted_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_payment_webhook_events_wechat_event_id
  ON public.payment_webhook_events(wechat_event_id)
  WHERE wechat_event_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_payment_webhook_events_order_no ON public.payment_webhook_events(order_no);

ALTER TABLE public.payment_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_webhook_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read active subscription plans" ON public.subscription_plans
  FOR SELECT USING (active = TRUE);

CREATE POLICY "Users can read own payment orders" ON public.payment_orders
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can read own subscription" ON public.user_subscriptions
  FOR SELECT USING (auth.uid() = user_id);

COMMIT;
