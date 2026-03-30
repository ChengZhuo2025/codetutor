BEGIN;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type
    WHERE typnamespace = 'public'::regnamespace
      AND typname = 'ai_provider_type'
  ) THEN
    CREATE TYPE public.ai_provider_type AS ENUM (
      'siliconflow',
      'openai_compatible',
      'anthropic'
    );
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type
    WHERE typnamespace = 'public'::regnamespace
      AND typname = 'ai_auth_mode'
  ) THEN
    CREATE TYPE public.ai_auth_mode AS ENUM (
      'bearer',
      'api_key_header'
    );
  END IF;
END
$$;

CREATE TABLE IF NOT EXISTS public.ai_providers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(64) NOT NULL UNIQUE,
  name VARCHAR(128) NOT NULL,
  provider_type public.ai_provider_type NOT NULL,
  base_url TEXT NOT NULL,
  auth_mode public.ai_auth_mode NOT NULL DEFAULT 'bearer',
  secret_ref VARCHAR(128) NOT NULL,
  supports_stream BOOLEAN NOT NULL DEFAULT TRUE,
  supports_json_mode BOOLEAN NOT NULL DEFAULT FALSE,
  timeout_ms INTEGER NOT NULL DEFAULT 60000,
  retry_count INTEGER NOT NULL DEFAULT 1,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS uidx_ai_providers_code
ON public.ai_providers(code);

DROP TRIGGER IF EXISTS tg_ai_providers_updated_at ON public.ai_providers;
CREATE TRIGGER tg_ai_providers_updated_at
BEFORE UPDATE ON public.ai_providers
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TABLE IF NOT EXISTS public.ai_models (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID NOT NULL REFERENCES public.ai_providers(id) ON DELETE CASCADE,
  code VARCHAR(64) NOT NULL UNIQUE,
  display_name VARCHAR(128) NOT NULL,
  model_name VARCHAR(128) NOT NULL,
  supports_stream BOOLEAN NOT NULL DEFAULT TRUE,
  supports_json_mode BOOLEAN NOT NULL DEFAULT FALSE,
  supports_tool_calling BOOLEAN NOT NULL DEFAULT FALSE,
  max_context_tokens INTEGER NOT NULL,
  default_max_output_tokens INTEGER NOT NULL,
  recommended_temperature NUMERIC(4,2),
  pricing_metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS uidx_ai_models_code
ON public.ai_models(code);

CREATE INDEX IF NOT EXISTS idx_ai_models_provider_id_active
ON public.ai_models(provider_id, is_active);

DROP TRIGGER IF EXISTS tg_ai_models_updated_at ON public.ai_models;
CREATE TRIGGER tg_ai_models_updated_at
BEFORE UPDATE ON public.ai_models
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

COMMIT;
