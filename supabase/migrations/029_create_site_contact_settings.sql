BEGIN;

-- ============================================
-- 企业联系方式管理系统设置
-- 支持管理后台编辑企业信息和联系渠道，供营销联系对话框动态加载
-- ============================================

-- 1. 创建企业联系设置表 (单行记录，id固定为1)
CREATE TABLE IF NOT EXISTS public.site_contact_settings (
  id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  company_name VARCHAR(200) NOT NULL DEFAULT '上海智酷数能科技有限公司',
  address TEXT NOT NULL DEFAULT '上海市崇明区长兴镇潘园公路1800号',
  website VARCHAR(255) NOT NULL DEFAULT 'https://www.zicool.cn',
  contact_email VARCHAR(255) NOT NULL DEFAULT 'server@zicool.cn',
  service_hours VARCHAR(100) NOT NULL DEFAULT '工作日 10:00-19:00',
  contact_channels JSONB NOT NULL DEFAULT '[]'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by_admin_id UUID REFERENCES public.admin_accounts(id)
);

-- 插入初始数据 (匹配当前 hardcoded contact-dialog.tsx)
INSERT INTO public.site_contact_settings (
  id,
  company_name,
  address,
  website,
  contact_email,
  service_hours,
  contact_channels,
  updated_by_admin_id
) VALUES (
  1,
  '上海智酷数能科技有限公司',
  '上海市崇明区长兴镇潘园公路1800号',
  'https://www.zicool.cn',
  'server@zicool.cn',
  '工作日 10:00-19:00',
  '[
    {
      "title": "客服微信",
      "handle": "18600165902",
      "maskedHandle": "186****5902",
      "summary": "产品/合作/试用咨询",
      "qrLabel": "微信扫码添加",
      "qrSeed": 13,
      "type": "wechat"
    },
    {
      "title": "官方抖音",
      "handle": "818740482",
      "maskedHandle": "81****82",
      "summary": "动态/案例/教程分享",
      "qrLabel": "抖音扫码关注",
      "qrSeed": 29,
      "type": "douyin"
    }
  ]'::jsonb,
  NULL
) ON CONFLICT (id) DO NOTHING;

-- 索引
CREATE INDEX IF NOT EXISTS idx_site_contact_settings_updated_at ON public.site_contact_settings(updated_at);

-- 触发器：自动更新 updated_at
DROP TRIGGER IF EXISTS site_contact_settings_updated_at ON public.site_contact_settings;
CREATE TRIGGER site_contact_settings_updated_at
  BEFORE UPDATE ON public.site_contact_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- 启用 RLS (admin can manage, public can read)
ALTER TABLE public.site_contact_settings ENABLE ROW LEVEL SECURITY;

-- Policy for public read (anyone can read contact info)
CREATE POLICY "Public can read site contact settings" ON public.site_contact_settings
  FOR SELECT USING (true);

-- Policy for admin update (only authenticated admins)
CREATE POLICY "Admins can update site contact settings" ON public.site_contact_settings
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.admin_accounts 
      WHERE user_id = auth.uid() 
      AND status = 'active'
    )
  );

COMMIT;

-- Note: Assumes update_updated_at() function exists from previous migrations (002, etc.).
-- If RLS policies conflict with existing, they can be adjusted in follow-up migration.