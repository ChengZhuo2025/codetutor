BEGIN;

-- ============================================
-- 进一步优化 site_contact_settings RLS 策略
-- 使用 (SELECT auth.role()) 子查询形式，避免 per-row function evaluation 警告
-- ============================================

-- 删除当前策略
DROP POLICY IF EXISTS "Authenticated users can update site contact settings" 
  ON public.site_contact_settings;

-- 创建优化后的策略（使用子查询形式，这是 Supabase 推荐的最佳实践）
CREATE POLICY "Authenticated users can update site contact settings" 
  ON public.site_contact_settings
  FOR UPDATE 
  USING ((SELECT auth.role()) = 'authenticated');

-- 更新注释
COMMENT ON POLICY "Public can read site contact settings" 
  ON public.site_contact_settings 
  IS '允许任何人读取企业联系方式（营销对话框使用，无需鉴权）';

COMMENT ON POLICY "Authenticated users can update site contact settings" 
  ON public.site_contact_settings 
  IS '允许已认证用户更新联系方式（管理后台使用，结合应用层 admin 守卫）。使用 (SELECT auth.role()) 子查询优化性能，避免 Performance Advisor 警告。';

COMMIT;

-- 迁移说明：
-- 此变更完全解决 Supabase Performance Advisor 的 "Auth RLS Initialization Plan" 警告。
-- 使用 (SELECT auth.role()) = 'authenticated' 是官方推荐的优化方式，可显著减少查询规划开销。
-- 对功能无任何影响：公共读取仍公开，更新仍由应用层 admin 守卫保护。
-- 运行后请刷新 Performance Advisor 页面确认警告消失。
