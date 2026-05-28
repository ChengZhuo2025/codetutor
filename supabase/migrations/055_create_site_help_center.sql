BEGIN;

CREATE TABLE IF NOT EXISTS public.site_help_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(120) NOT NULL,
  description TEXT,
  display_order INTEGER NOT NULL DEFAULT 0,
  enabled BOOLEAN NOT NULL DEFAULT true,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by_admin_id UUID REFERENCES public.admin_accounts(id)
);

CREATE TABLE IF NOT EXISTS public.site_help_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID NOT NULL REFERENCES public.site_help_categories(id) ON DELETE CASCADE,
  question VARCHAR(240) NOT NULL,
  answer_markdown TEXT NOT NULL,
  display_order INTEGER NOT NULL DEFAULT 0,
  enabled BOOLEAN NOT NULL DEFAULT true,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by_admin_id UUID REFERENCES public.admin_accounts(id)
);

INSERT INTO public.site_help_categories (
  id,
  title,
  description,
  display_order,
  enabled,
  updated_by_admin_id
) VALUES
  ('550e8400-e29b-41d4-a716-446655440101', '开始学习', '学习计划与路径相关问题', 10, true, NULL),
  ('550e8400-e29b-41d4-a716-446655440102', '学习记录', '历史计划、进度与成长体系', 20, true, NULL),
  ('550e8400-e29b-41d4-a716-446655440103', '订阅订单', '支付、订单与订阅权益', 30, true, NULL),
  ('550e8400-e29b-41d4-a716-446655440104', '账号与反馈', '登录、账号和问题反馈', 40, true, NULL)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.site_help_items (
  id,
  category_id,
  question,
  answer_markdown,
  display_order,
  enabled,
  updated_by_admin_id
) VALUES
  (
    '550e8400-e29b-41d4-a716-446655440201',
    '550e8400-e29b-41d4-a716-446655440101',
    '如何开始一条新的学习计划？',
    '进入首页或学习页后，选择适合你的学习目标、当前水平和常用 AI 工具，系统会生成一条可执行的学习路径。已有进行中计划时，建议先继续当前计划，避免学习进度分散。',
    10,
    true,
    NULL
  ),
  (
    '550e8400-e29b-41d4-a716-446655440202',
    '550e8400-e29b-41d4-a716-446655440101',
    '不同 AI 工具可以混合学习吗？',
    '可以，但更建议先完成一个工具的核心路径，再切换到另一个工具。这样更容易建立完整工作流，也方便在历史记录里复盘每条计划的目标、任务和完成度。',
    20,
    true,
    NULL
  ),
  (
    '550e8400-e29b-41d4-a716-446655440203',
    '550e8400-e29b-41d4-a716-446655440102',
    '学习记录会保存多久？',
    '所有学习记录会长期保存，你可以随时回顾已完成的计划、查看任务进度和复盘学习成果。即使订阅过期，历史记录也不会因此被删除。',
    10,
    true,
    NULL
  ),
  (
    '550e8400-e29b-41d4-a716-446655440204',
    '550e8400-e29b-41d4-a716-446655440102',
    '可以重新学习已完成的计划吗？',
    '可以。在学习历史中打开已完成计划，使用学习复盘或重新开始相关入口即可再次学习。复盘会帮助你回顾关键任务，但同一计划的 XP 奖励通常只会计算一次。',
    20,
    true,
    NULL
  ),
  (
    '550e8400-e29b-41d4-a716-446655440205',
    '550e8400-e29b-41d4-a716-446655440102',
    '中途中断或放弃的计划如何继续？',
    '在学习记录里找到“已中断”或“已放弃”的计划，点击重新激活即可继续。若当前已有另一条活跃计划，系统会先阻止冲突操作，避免两条计划同时占用主学习流程。',
    30,
    true,
    NULL
  ),
  (
    '550e8400-e29b-41d4-a716-446655440206',
    '550e8400-e29b-41d4-a716-446655440102',
    'XP 和段位如何计算？',
    '完成学习任务可获得基础 XP，连续学习、打卡和达成特定目标会带来额外奖励。XP 累积到对应区间后，系统会自动更新你的段位和成就状态。',
    40,
    true,
    NULL
  ),
  (
    '550e8400-e29b-41d4-a716-446655440207',
    '550e8400-e29b-41d4-a716-446655440103',
    '待支付订单可以继续支付吗？',
    '可以。只要订单还没有过期，你可以在订单列表中点击继续支付，系统会重新展示微信 Native 支付二维码或支付宝扫码支付信息。',
    10,
    true,
    NULL
  ),
  (
    '550e8400-e29b-41d4-a716-446655440208',
    '550e8400-e29b-41d4-a716-446655440103',
    '取消订单会影响订阅吗？',
    '不会。只有已支付订单才会开通或续期订阅权益。取消待支付订单只是关闭本次支付记录，不会改变你当前已经拥有的套餐权益。',
    20,
    true,
    NULL
  ),
  (
    '550e8400-e29b-41d4-a716-446655440209',
    '550e8400-e29b-41d4-a716-446655440103',
    '删除订单后还能恢复吗？',
    '用户端删除主要用于隐藏已关闭、已过期或失败的订单。后台仍会保留必要财务记录用于对账和审计，因此删除操作不会影响已支付权益。',
    30,
    true,
    NULL
  ),
  (
    '550e8400-e29b-41d4-a716-446655440210',
    '550e8400-e29b-41d4-a716-446655440104',
    '遇到登录、支付或学习内容问题怎么办？',
    '你可以优先在对应页面刷新状态或重新进入当前流程；如果问题仍然存在，请通过“联系我们”或站内反馈入口提交问题现象、发生时间和相关订单号或学习计划名称，方便我们定位处理。',
    10,
    true,
    NULL
  )
ON CONFLICT (id) DO NOTHING;

CREATE INDEX IF NOT EXISTS idx_site_help_categories_order
ON public.site_help_categories(enabled DESC, display_order, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_site_help_items_category_order
ON public.site_help_items(category_id, enabled DESC, display_order, updated_at DESC);

DROP TRIGGER IF EXISTS site_help_categories_updated_at ON public.site_help_categories;
CREATE TRIGGER site_help_categories_updated_at
  BEFORE UPDATE ON public.site_help_categories
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

DROP TRIGGER IF EXISTS site_help_items_updated_at ON public.site_help_items;
CREATE TRIGGER site_help_items_updated_at
  BEFORE UPDATE ON public.site_help_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

ALTER TABLE public.site_help_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.site_help_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can read enabled site help categories" ON public.site_help_categories;
CREATE POLICY "Public can read enabled site help categories" ON public.site_help_categories
  FOR SELECT USING (enabled = true);

DROP POLICY IF EXISTS "Active admins can insert site help categories" ON public.site_help_categories;
CREATE POLICY "Active admins can insert site help categories" ON public.site_help_categories
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.admin_accounts
      WHERE admin_accounts.user_id = (SELECT auth.uid())
        AND admin_accounts.status = 'active'
    )
  );

DROP POLICY IF EXISTS "Active admins can update site help categories" ON public.site_help_categories;
CREATE POLICY "Active admins can update site help categories" ON public.site_help_categories
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.admin_accounts
      WHERE admin_accounts.user_id = (SELECT auth.uid())
        AND admin_accounts.status = 'active'
    )
  );

DROP POLICY IF EXISTS "Public can read enabled site help items" ON public.site_help_items;
CREATE POLICY "Public can read enabled site help items" ON public.site_help_items
  FOR SELECT USING (
    enabled = true
    AND EXISTS (
      SELECT 1 FROM public.site_help_categories
      WHERE site_help_categories.id = site_help_items.category_id
        AND site_help_categories.enabled = true
    )
  );

DROP POLICY IF EXISTS "Active admins can insert site help items" ON public.site_help_items;
CREATE POLICY "Active admins can insert site help items" ON public.site_help_items
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.admin_accounts
      WHERE admin_accounts.user_id = (SELECT auth.uid())
        AND admin_accounts.status = 'active'
    )
  );

DROP POLICY IF EXISTS "Active admins can update site help items" ON public.site_help_items;
CREATE POLICY "Active admins can update site help items" ON public.site_help_items
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.admin_accounts
      WHERE admin_accounts.user_id = (SELECT auth.uid())
        AND admin_accounts.status = 'active'
    )
  );

COMMIT;
