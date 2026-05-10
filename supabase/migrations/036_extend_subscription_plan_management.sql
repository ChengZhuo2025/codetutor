BEGIN;

ALTER TABLE public.subscription_plans
  ADD COLUMN IF NOT EXISTS period_label VARCHAR(32) NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS cta_label VARCHAR(64) NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS highlight BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS purchasable BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS display_order INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS updated_by_admin_id UUID REFERENCES public.admin_accounts(id);

UPDATE public.subscription_plans
SET
  period_label = CASE code
    WHEN 'personal_monthly' THEN '/月'
    WHEN 'pro_monthly' THEN '/月'
    ELSE period_label
  END,
  cta_label = CASE code
    WHEN 'personal_monthly' THEN '立即订阅'
    WHEN 'pro_monthly' THEN '立即订阅'
    ELSE cta_label
  END,
  highlight = CASE code
    WHEN 'personal_monthly' THEN TRUE
    ELSE highlight
  END,
  purchasable = CASE
    WHEN price_cents > 0 THEN TRUE
    ELSE purchasable
  END,
  display_order = CASE code
    WHEN 'personal_monthly' THEN 20
    WHEN 'pro_monthly' THEN 30
    ELSE COALESCE(NULLIF(display_order, 0), tier_rank)
  END;

INSERT INTO public.subscription_plans (
  code,
  name,
  price_cents,
  currency,
  duration_days,
  tier_rank,
  description,
  features,
  period_label,
  cta_label,
  highlight,
  purchasable,
  active,
  display_order
) VALUES
  (
    'free',
    '免费版',
    0,
    'CNY',
    31,
    0,
    '探索产品核心体验',
    '["每月 30 次 AI 对话", "工具选择与学习路径", "基础学分与段位系统", "学习进度追踪"]'::jsonb,
    '',
    '免费开始',
    FALSE,
    FALSE,
    TRUE,
    10
  ),
  (
    'personal_monthly',
    '个人版',
    3900,
    'CNY',
    31,
    10,
    '无限学习，持续陪练',
    '["无限 AI 导师对话", "完整学习进度追踪", "全部工具学习路径", "段位 + 连续打卡激励", "历史会话与知识点回顾"]'::jsonb,
    '/月',
    '立即订阅',
    TRUE,
    TRUE,
    TRUE,
    20
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
    '/月',
    '立即订阅',
    FALSE,
    TRUE,
    TRUE,
    30
  )
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  price_cents = EXCLUDED.price_cents,
  currency = EXCLUDED.currency,
  duration_days = EXCLUDED.duration_days,
  tier_rank = EXCLUDED.tier_rank,
  description = EXCLUDED.description,
  features = EXCLUDED.features,
  period_label = EXCLUDED.period_label,
  cta_label = EXCLUDED.cta_label,
  highlight = EXCLUDED.highlight,
  purchasable = EXCLUDED.purchasable,
  active = EXCLUDED.active,
  display_order = EXCLUDED.display_order,
  archived_at = NULL,
  updated_at = NOW();

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'subscription_plans_purchasable_price_check'
      AND conrelid = 'public.subscription_plans'::regclass
  ) THEN
    ALTER TABLE public.subscription_plans
      ADD CONSTRAINT subscription_plans_purchasable_price_check
      CHECK (purchasable = FALSE OR price_cents > 0);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_subscription_plans_public_display
  ON public.subscription_plans(active, archived_at, display_order, tier_rank);

COMMIT;
