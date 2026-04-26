BEGIN;

-- ============================================
-- Restrict site_contact_settings updates to active admins only
-- ============================================

DROP POLICY IF EXISTS "Authenticated users can update site contact settings"
  ON public.site_contact_settings;

CREATE POLICY "Active admins can update site contact settings"
  ON public.site_contact_settings
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1
      FROM public.admin_accounts
      WHERE user_id = (SELECT auth.uid())
        AND status = 'active'
    )
  );

COMMENT ON POLICY "Active admins can update site contact settings"
  ON public.site_contact_settings
  IS '仅允许 active admin_accounts 更新企业联系方式。';

COMMIT;
