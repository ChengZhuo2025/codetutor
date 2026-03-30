BEGIN;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type
    WHERE typnamespace = 'public'::regnamespace
      AND typname = 'conversation_session_status'
  ) THEN
    CREATE TYPE public.conversation_session_status AS ENUM (
      'active',
      'completed',
      'interrupted',
      'failed',
      'archived'
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
      AND typname = 'conversation_message_role'
  ) THEN
    CREATE TYPE public.conversation_message_role AS ENUM (
      'system',
      'developer',
      'user',
      'assistant',
      'tool'
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
      AND typname = 'conversation_message_type'
  ) THEN
    CREATE TYPE public.conversation_message_type AS ENUM (
      'plain_text',
      'structured_prompt_context',
      'skill_context',
      'assistant_answer',
      'assistant_error',
      'tool_result'
    );
  END IF;
END
$$;

CREATE TABLE IF NOT EXISTS public.conversation_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_learning_path_id UUID REFERENCES public.user_learning_paths(id) ON DELETE SET NULL,
  user_task_id UUID REFERENCES public.user_tasks(id) ON DELETE SET NULL,
  selection_mode public.path_selection_mode NOT NULL,
  tool_id UUID NOT NULL REFERENCES public.learning_tools(id),
  agent_code_snapshot VARCHAR(64) NOT NULL,
  provider_code_snapshot VARCHAR(64) NOT NULL,
  model_code_snapshot VARCHAR(64) NOT NULL,
  status public.conversation_session_status NOT NULL DEFAULT 'active',
  message_count INTEGER NOT NULL DEFAULT 0,
  last_user_message_at TIMESTAMPTZ,
  last_assistant_message_at TIMESTAMPTZ,
  last_message_at TIMESTAMPTZ,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  closed_at TIMESTAMPTZ,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_conversation_sessions_user_status_last_message_at
ON public.conversation_sessions(user_id, status, last_message_at DESC);

CREATE INDEX IF NOT EXISTS idx_conversation_sessions_user_learning_path_id
ON public.conversation_sessions(user_learning_path_id);

CREATE INDEX IF NOT EXISTS idx_conversation_sessions_user_task_id
ON public.conversation_sessions(user_task_id);

CREATE UNIQUE INDEX IF NOT EXISTS uidx_conversation_sessions_active_task
ON public.conversation_sessions(user_task_id)
WHERE status = 'active' AND user_task_id IS NOT NULL;

DROP TRIGGER IF EXISTS tg_conversation_sessions_updated_at ON public.conversation_sessions;
CREATE TRIGGER tg_conversation_sessions_updated_at
BEFORE UPDATE ON public.conversation_sessions
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TABLE IF NOT EXISTS public.conversation_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.conversation_sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_task_id UUID REFERENCES public.user_tasks(id) ON DELETE SET NULL,
  role public.conversation_message_role NOT NULL,
  message_type public.conversation_message_type NOT NULL,
  sequence_no INTEGER NOT NULL,
  client_message_id VARCHAR(128),
  reply_to_message_id UUID REFERENCES public.conversation_messages(id) ON DELETE SET NULL,
  content_text TEXT,
  content_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  provider_code VARCHAR(64),
  model_code VARCHAR(64),
  input_tokens INTEGER,
  output_tokens INTEGER,
  stream_chunk_count INTEGER NOT NULL DEFAULT 0,
  finish_reason VARCHAR(32),
  trace_id VARCHAR(128),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS uidx_conversation_messages_session_sequence
ON public.conversation_messages(session_id, sequence_no);

CREATE UNIQUE INDEX IF NOT EXISTS uidx_conversation_messages_session_client_message_id
ON public.conversation_messages(session_id, client_message_id)
WHERE client_message_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_conversation_messages_session_sequence
ON public.conversation_messages(session_id, sequence_no);

CREATE INDEX IF NOT EXISTS idx_conversation_messages_user_task_id
ON public.conversation_messages(user_task_id);

CREATE INDEX IF NOT EXISTS idx_conversation_messages_trace_id
ON public.conversation_messages(trace_id);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'fk_user_tasks_last_conversation_session'
  ) THEN
    ALTER TABLE public.user_tasks
    ADD CONSTRAINT fk_user_tasks_last_conversation_session
    FOREIGN KEY (last_conversation_id)
    REFERENCES public.conversation_sessions(id)
    ON DELETE SET NULL;
  END IF;
END
$$;

COMMIT;
