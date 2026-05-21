BEGIN;

-- 为管理后台登录态预热提供单次查询入口：
-- 聚合 admin_accounts、admin_account_roles、admin_roles 与 user_profiles.avatar_url，
-- 避免登录后再拆成多次表查询。
CREATE OR REPLACE FUNCTION public.get_admin_session_lookup(p_user_id UUID)
RETURNS TABLE (
  admin_account_id UUID,
  user_id UUID,
  display_name VARCHAR(100),
  status VARCHAR(20),
  avatar_url TEXT,
  roles TEXT[]
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT
    aa.id AS admin_account_id,
    aa.user_id,
    aa.display_name,
    aa.status,
    up.avatar_url,
    COALESCE(
      array_agg(ar.code ORDER BY ar.code) FILTER (WHERE ar.code IS NOT NULL),
      ARRAY[]::TEXT[]
    ) AS roles
  FROM public.admin_accounts AS aa
  LEFT JOIN public.admin_account_roles AS aar
    ON aar.admin_account_id = aa.id
  LEFT JOIN public.admin_roles AS ar
    ON ar.id = aar.admin_role_id
  LEFT JOIN public.user_profiles AS up
    ON up.user_id = aa.user_id
  WHERE aa.user_id = p_user_id
  GROUP BY aa.id, aa.user_id, aa.display_name, aa.status, up.avatar_url;
$$;

COMMENT ON FUNCTION public.get_admin_session_lookup(UUID) IS
  '管理后台登录态聚合 RPC：一次返回管理员账号、角色和头像，供登录/会话校验使用。';

COMMIT;
