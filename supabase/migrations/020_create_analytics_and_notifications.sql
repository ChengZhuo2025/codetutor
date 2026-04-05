BEGIN;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type
    WHERE typname = 'event_source'
  ) THEN
    CREATE TYPE public.event_source AS ENUM (
      'web',
      'mobile',
      'server',
      'admin'
    );
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type
    WHERE typname = 'user_notification_type'
  ) THEN
    CREATE TYPE public.user_notification_type AS ENUM (
      'daily_checkin_reminder',
      'progress_milestone'
    );
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type
    WHERE typname = 'user_notification_status'
  ) THEN
    CREATE TYPE public.user_notification_status AS ENUM (
      'unread',
      'read',
      'dismissed'
    );
  END IF;
END
$$;

CREATE TABLE IF NOT EXISTS public.event_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  event_name VARCHAR(128) NOT NULL,
  event_source public.event_source NOT NULL DEFAULT 'web',
  page_path VARCHAR(256),
  properties JSONB NOT NULL DEFAULT '{}'::jsonb,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_event_logs_event_name_occurred_at
  ON public.event_logs(event_name, occurred_at DESC);

CREATE INDEX IF NOT EXISTS idx_event_logs_user_id_occurred_at
  ON public.event_logs(user_id, occurred_at DESC);

CREATE TABLE IF NOT EXISTS public.user_notification_settings (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  checkin_reminder_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  checkin_reminder_time TIME NOT NULL DEFAULT '09:00',
  progress_push_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  channel_in_app_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  channel_email_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  channel_wechat_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  do_not_disturb_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  do_not_disturb_start TIME NOT NULL DEFAULT '22:00',
  do_not_disturb_end TIME NOT NULL DEFAULT '08:00',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.user_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type public.user_notification_type NOT NULL,
  title VARCHAR(120) NOT NULL,
  content TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  status public.user_notification_status NOT NULL DEFAULT 'unread',
  scheduled_for TIMESTAMPTZ,
  read_at TIMESTAMPTZ,
  dismissed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_notifications_user_status_created_at
  ON public.user_notifications(user_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_user_notifications_user_type_created_at
  ON public.user_notifications(user_id, type, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_user_notifications_scheduled_for
  ON public.user_notifications(scheduled_for)
  WHERE scheduled_for IS NOT NULL;

DROP TRIGGER IF EXISTS tg_user_notification_settings_updated_at
  ON public.user_notification_settings;

CREATE TRIGGER tg_user_notification_settings_updated_at
  BEFORE UPDATE ON public.user_notification_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

DROP TRIGGER IF EXISTS tg_user_notifications_updated_at
  ON public.user_notifications;

CREATE TRIGGER tg_user_notifications_updated_at
  BEFORE UPDATE ON public.user_notifications
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

COMMIT;
