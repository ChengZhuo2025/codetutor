BEGIN;

ALTER TABLE public.user_profiles
ADD COLUMN IF NOT EXISTS wechat VARCHAR(64),
ADD COLUMN IF NOT EXISTS contact_email VARCHAR(255),
ADD COLUMN IF NOT EXISTS bio TEXT;

UPDATE public.user_profiles
SET
  wechat = COALESCE(
    wechat,
    NULLIF(BTRIM(metadata ->> 'wechat'), '')
  ),
  contact_email = COALESCE(
    contact_email,
    NULLIF(BTRIM(metadata ->> 'contactEmail'), '')
  ),
  bio = COALESCE(
    bio,
    NULLIF(BTRIM(metadata ->> 'bio'), '')
  ),
  metadata = COALESCE(metadata, '{}'::jsonb) - 'wechat' - 'contactEmail' - 'bio',
  updated_at = NOW()
WHERE
  metadata ? 'wechat'
  OR metadata ? 'contactEmail'
  OR metadata ? 'bio';

COMMIT;
