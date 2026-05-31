-- ============================================
-- 管理后台种子数据：测试管理员账号
-- ============================================

BEGIN;

-- 1. 创建测试管理员 Supabase Auth 用户
-- 注意：这里需要手动创建或使用 Supabase Dashboard 创建
-- 以下是示例 SQL，需要在 Supabase Dashboard 的 SQL Editor 中执行

-- 插入测试管理员账号（假设已经通过 Supabase Auth 创建了用户）
-- 需要先获取 auth.users 的 user_id

-- 2. 插入测试管理员账号记录
-- 获取 super_admin 角色的 ID
DO $$
DECLARE
  v_super_admin_role_id UUID;
  v_test_user_id UUID := '00000000-0000-0000-0000-000000000001'; -- 替换为实际的 auth.users.id
BEGIN
  -- 获取 super_admin 角色 ID
  SELECT id INTO v_super_admin_role_id
  FROM public.admin_roles
  WHERE code = 'super_admin'
  LIMIT 1;

  -- 插入测试管理员账号
  INSERT INTO public.admin_accounts (
    id,
    user_id,
    display_name,
    status
  ) VALUES (
    gen_random_uuid(),
    v_test_user_id,
    '测试管理员',
    'active'
  )
  ON CONFLICT (user_id) DO NOTHING;

  -- 分配 super_admin 角色
  INSERT INTO public.admin_account_roles (
    admin_account_id,
    admin_role_id
  )
  SELECT
    aa.id,
    v_super_admin_role_id
  FROM public.admin_accounts aa
  WHERE aa.user_id = v_test_user_id
    AND NOT EXISTS (
      SELECT 1 FROM public.admin_account_roles aar
      WHERE aar.admin_account_id = aa.id
        AND aar.admin_role_id = v_super_admin_role_id
    );
END $$;

COMMIT;

-- ============================================
-- 手动创建测试管理员账号的步骤
-- ============================================
--
-- 由于 Supabase Auth 用户的创建需要通过 Supabase Client 或 Dashboard，
-- 请按以下步骤操作：
--
-- 1. 访问 Supabase Dashboard -> Authentication -> Users
-- 2. 点击 "Add user" 创建新用户
-- 3. 输入以下信息：
--    - Email: admin@test.local
--    - Password: Admin@123456  （仅用于本地开发测试，生产环境务必更换）
--    - Auto Confirm User: 勾选
-- 4. 创建后，复制该用户的 ID（UUID）
-- 5. 替换上面 SQL 中的 v_test_user_id 值
-- 6. 在 Supabase Dashboard 的 SQL Editor 中执行上述 SQL
--
-- 或者使用以下脚本快速创建（需要 Supabase 服务端权限）：
