BEGIN;

CREATE TABLE IF NOT EXISTS public.admin_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  severity VARCHAR(16) NOT NULL DEFAULT 'info' CHECK (severity IN ('info', 'warning', 'critical')),
  category VARCHAR(32) NOT NULL,
  title VARCHAR(160) NOT NULL,
  content TEXT NOT NULL,
  status VARCHAR(16) NOT NULL DEFAULT 'unread' CHECK (status IN ('unread', 'read', 'dismissed')),
  target_url TEXT,
  source_type VARCHAR(32) NOT NULL,
  source_id UUID,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  read_at TIMESTAMPTZ,
  dismissed_at TIMESTAMPTZ,
  created_by_admin_id UUID REFERENCES public.admin_accounts(id),
  updated_by_admin_id UUID REFERENCES public.admin_accounts(id)
);

CREATE INDEX IF NOT EXISTS idx_admin_notifications_status_created_at
  ON public.admin_notifications(status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_admin_notifications_category_created_at
  ON public.admin_notifications(category, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_admin_notifications_severity_created_at
  ON public.admin_notifications(severity, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_admin_notifications_source
  ON public.admin_notifications(source_type, source_id);

DROP TRIGGER IF EXISTS tg_admin_notifications_updated_at ON public.admin_notifications;
CREATE TRIGGER tg_admin_notifications_updated_at
  BEFORE UPDATE ON public.admin_notifications
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

COMMENT ON TABLE public.admin_notifications IS
'管理后台消息中心：承载反馈、支付、AI、系统告警与用户运营提醒。';

COMMIT;
