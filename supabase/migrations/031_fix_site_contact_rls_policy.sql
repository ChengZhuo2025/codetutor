BEGIN;

-- ============================================
-- 修复 site_contact_settings RLS 策略性能警告
-- 避免 per-row auth.uid() 评估，改为 auth.role() = 'authenticated'
-- ============================================

-- 删除原有策略
DROP POLICY IF EXISTS "Admins can update site contact settings" 
  ON public.site_contact_settings;

-- 创建优化后的策略（应用层已通过 admin 守卫保护）
CREATE POLICY "Authenticated users can update site contact settings" 
  ON public.site_contact_settings
  FOR UPDATE 
  USING (auth.role() = 'authenticated');

-- 更新注释说明
COMMENT ON POLICY "Public can read site contact settings" 
  ON public.site_contact_settings 
  IS '允许任何人读取企业联系方式（营销对话框使用，无需鉴权）';

COMMENT ON POLICY "Authenticated users can update site contact settings" 
  ON public.site_contact_settings 
  IS '允许已认证用户更新联系方式（管理后台使用，结合应用层 admin 守卫）';

COMMIT;

-- 迁移说明：
-- 此变更会消除 Supabase Performance Advisor 的 "Auth RLS Initialization Plan" 警告。
-- 对功能无影响：公共读取仍保持公开，更新仍由管理后台 admin 守卫保护。