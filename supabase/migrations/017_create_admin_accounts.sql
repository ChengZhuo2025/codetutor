-- ============================================
-- 管理后台 Phase 1: 管理员账号与角色系统
-- ============================================

BEGIN;

-- 1. 创建管理员账号表
CREATE TABLE public.admin_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name VARCHAR(100) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_admin_accounts_user_id ON public.admin_accounts(user_id);
CREATE INDEX idx_admin_accounts_status ON public.admin_accounts(status);

-- 触发器：自动更新 updated_at
CREATE TRIGGER admin_accounts_updated_at
  BEFORE UPDATE ON public.admin_accounts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- 2. 创建角色定义表
CREATE TABLE public.admin_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(50) NOT NULL UNIQUE,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 插入初始角色
INSERT INTO public.admin_roles (code, name, description) VALUES
  ('super_admin', '超级管理员', '拥有所有权限'),
  ('support_admin', '客服管理员', '负责处理用户反馈和工单'),
  ('ops_admin', '运营管理员', '负责用户运营和数据导出'),
  ('ai_ops_admin', 'AI运营管理员', '负责AI配置和调用监控');

-- 3. 创建管理员-角色关联表
CREATE TABLE public.admin_account_roles (
  admin_account_id UUID NOT NULL REFERENCES public.admin_accounts(id) ON DELETE CASCADE,
  admin_role_id UUID NOT NULL REFERENCES public.admin_roles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (admin_account_id, admin_role_id)
);

-- 4. 创建审计日志表
CREATE TABLE public.admin_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id UUID NOT NULL REFERENCES public.admin_accounts(id),
  action VARCHAR(100) NOT NULL,
  target_type VARCHAR(50),
  target_id UUID,
  before_snapshot JSONB,
  after_snapshot JSONB,
  reason TEXT,
  request_context JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_admin_audit_logs_admin_user_id ON public.admin_audit_logs(admin_user_id);
CREATE INDEX idx_admin_audit_logs_target ON public.admin_audit_logs(target_type, target_id);
CREATE INDEX idx_admin_audit_logs_created_at ON public.admin_audit_logs(created_at DESC);

-- 5. 扩展 feedback_tickets 表（为后续功能预留）
ALTER TABLE public.feedback_tickets
  ADD COLUMN IF NOT EXISTS assigned_admin_user_id UUID REFERENCES public.admin_accounts(id),
  ADD COLUMN IF NOT EXISTS first_response_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS sla_due_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS tags JSONB DEFAULT '[]'::jsonb;

COMMIT;
