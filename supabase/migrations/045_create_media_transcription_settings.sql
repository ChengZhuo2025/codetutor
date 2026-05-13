BEGIN;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type
    WHERE typnamespace = 'public'::regnamespace
      AND typname = 'media_transcription_type'
  ) THEN
    CREATE TYPE public.media_transcription_type AS ENUM (
      'image_translation',
      'speech_to_text',
      'text_to_speech'
    );
  END IF;
END
$$;

CREATE TABLE IF NOT EXISTS public.media_transcription_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  media_type public.media_transcription_type NOT NULL UNIQUE,
  model_id UUID REFERENCES public.ai_models(id) ON DELETE SET NULL,
  is_enabled BOOLEAN NOT NULL DEFAULT false,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  version INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_media_transcription_settings_model_id
ON public.media_transcription_settings(model_id);

DROP TRIGGER IF EXISTS tg_media_transcription_settings_updated_at
ON public.media_transcription_settings;
CREATE TRIGGER tg_media_transcription_settings_updated_at
BEFORE UPDATE ON public.media_transcription_settings
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

DROP TRIGGER IF EXISTS tg_media_transcription_settings_version_increment
ON public.media_transcription_settings;
CREATE TRIGGER tg_media_transcription_settings_version_increment
BEFORE UPDATE ON public.media_transcription_settings
FOR EACH ROW
EXECUTE FUNCTION public.tg_increment_version();

WITH active_vision_model AS (
  SELECT id
  FROM public.ai_models
  WHERE is_active = true
    AND runtime_capabilities @> ARRAY['vision']::text[]
  ORDER BY updated_at DESC
  LIMIT 1
),
active_asr_model AS (
  SELECT id
  FROM public.ai_models
  WHERE is_active = true
    AND runtime_capabilities @> ARRAY['asr']::text[]
  ORDER BY updated_at DESC
  LIMIT 1
)
INSERT INTO public.media_transcription_settings (media_type, model_id, is_enabled, metadata)
VALUES
  (
    'image_translation',
    (SELECT id FROM active_vision_model),
    (SELECT id FROM active_vision_model) IS NOT NULL,
    '{"seededBy":"045_create_media_transcription_settings"}'::jsonb
  ),
  (
    'speech_to_text',
    (SELECT id FROM active_asr_model),
    (SELECT id FROM active_asr_model) IS NOT NULL,
    '{"seededBy":"045_create_media_transcription_settings"}'::jsonb
  ),
  (
    'text_to_speech',
    NULL,
    false,
    '{"seededBy":"045_create_media_transcription_settings","reserved":true}'::jsonb
  )
ON CONFLICT (media_type) DO NOTHING;

ALTER TABLE public.media_transcription_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS media_transcription_settings_admin_read
ON public.media_transcription_settings;
CREATE POLICY media_transcription_settings_admin_read
ON public.media_transcription_settings
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.admin_accounts aa
    JOIN public.admin_account_roles aar ON aar.admin_account_id = aa.id
    JOIN public.admin_roles ar ON ar.id = aar.admin_role_id
    WHERE aa.user_id = (SELECT auth.uid())
      AND aa.status = 'active'
      AND ar.code IN ('super_admin', 'ai_ops_admin')
  )
);

DROP POLICY IF EXISTS media_transcription_settings_admin_update
ON public.media_transcription_settings;
CREATE POLICY media_transcription_settings_admin_update
ON public.media_transcription_settings
FOR UPDATE
USING (
  EXISTS (
    SELECT 1
    FROM public.admin_accounts aa
    JOIN public.admin_account_roles aar ON aar.admin_account_id = aa.id
    JOIN public.admin_roles ar ON ar.id = aar.admin_role_id
    WHERE aa.user_id = (SELECT auth.uid())
      AND aa.status = 'active'
      AND ar.code IN ('super_admin', 'ai_ops_admin')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.admin_accounts aa
    JOIN public.admin_account_roles aar ON aar.admin_account_id = aa.id
    JOIN public.admin_roles ar ON ar.id = aar.admin_role_id
    WHERE aa.user_id = (SELECT auth.uid())
      AND aa.status = 'active'
      AND ar.code IN ('super_admin', 'ai_ops_admin')
  )
);

COMMIT;
