BEGIN;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type
    WHERE typnamespace = 'public'::regnamespace
      AND typname = 'llm_invocation_status'
  ) THEN
    CREATE TYPE public.llm_invocation_status AS ENUM (
      'streaming',
      'succeeded',
      'failed',
      'cancelled',
      'timed_out'
    );
  END IF;
END
$$;

CREATE TABLE IF NOT EXISTS public.llm_invocations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.conversation_sessions(id) ON DELETE CASCADE,
  assistant_message_id UUID REFERENCES public.conversation_messages(id) ON DELETE SET NULL,
  user_message_id UUID REFERENCES public.conversation_messages(id) ON DELETE SET NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider_code VARCHAR(64) NOT NULL REFERENCES public.ai_providers(code) ON UPDATE CASCADE,
  model_code VARCHAR(64) NOT NULL REFERENCES public.ai_models(code) ON UPDATE CASCADE,
  agent_code VARCHAR(64) NOT NULL REFERENCES public.agent_templates(code) ON UPDATE CASCADE,
  status public.llm_invocation_status NOT NULL,
  stream_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  prompt_tokens INTEGER,
  completion_tokens INTEGER,
  total_tokens INTEGER,
  latency_ms INTEGER,
  first_chunk_latency_ms INTEGER,
  finish_reason VARCHAR(32),
  error_code VARCHAR(64),
  error_message TEXT,
  request_payload_redacted JSONB NOT NULL DEFAULT '{}'::jsonb,
  response_payload_redacted JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_llm_invocations_session_created_at
ON public.llm_invocations(session_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_llm_invocations_user_created_at
ON public.llm_invocations(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_llm_invocations_provider_model_created_at
ON public.llm_invocations(provider_code, model_code, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_llm_invocations_status_created_at
ON public.llm_invocations(status, created_at DESC);

COMMIT;
