BEGIN;

ALTER TABLE public.user_profiles
ADD COLUMN IF NOT EXISTS signup_provider VARCHAR(32),
ADD COLUMN IF NOT EXISTS last_login_provider VARCHAR(32),
ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ;

UPDATE public.user_profiles
SET
  signup_provider = COALESCE(
    signup_provider,
    NULLIF(BTRIM(metadata ->> 'signupProvider'), '')
  ),
  last_login_provider = COALESCE(
    last_login_provider,
    NULLIF(BTRIM(metadata ->> 'signupProvider'), '')
  ),
  metadata = COALESCE(metadata, '{}'::jsonb) - 'signupProvider',
  updated_at = NOW()
WHERE metadata ? 'signupProvider';

COMMIT;
