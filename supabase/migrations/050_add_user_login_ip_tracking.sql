BEGIN;

ALTER TABLE public.user_profiles
ADD COLUMN last_login_ip INET,
ADD COLUMN last_login_city VARCHAR(128);

CREATE TABLE public.user_login_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  login_ip INET NOT NULL,
  login_city VARCHAR(128),
  login_provider VARCHAR(32) NOT NULL,
  login_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX idx_user_login_logs_user_id ON public.user_login_logs(user_id);
CREATE INDEX idx_user_login_logs_login_at ON public.user_login_logs(login_at DESC);
CREATE INDEX idx_user_login_logs_login_ip ON public.user_login_logs(login_ip);

COMMENT ON TABLE public.user_login_logs IS
'用户登录日志表：记录每次用户登录的IP地址、城市等信息，便于运营分析。';

COMMIT;