BEGIN;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type
    WHERE typnamespace = 'public'::regnamespace
      AND typname = 'learning_message_attachment_kind'
  ) THEN
    CREATE TYPE public.learning_message_attachment_kind AS ENUM (
      'image',
      'audio'
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
      AND typname = 'learning_message_attachment_status'
  ) THEN
    CREATE TYPE public.learning_message_attachment_status AS ENUM (
      'pending',
      'processing',
      'completed',
      'failed'
    );
  END IF;
END
$$;

INSERT INTO storage.buckets (id, name, public)
VALUES ('learning-chat-attachments', 'learning-chat-attachments', false)
ON CONFLICT (id) DO UPDATE
SET
  name = EXCLUDED.name,
  public = EXCLUDED.public;

CREATE TABLE IF NOT EXISTS public.learning_message_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id UUID REFERENCES public.conversation_sessions(id) ON DELETE SET NULL,
  message_id UUID REFERENCES public.conversation_messages(id) ON DELETE SET NULL,
  kind public.learning_message_attachment_kind NOT NULL,
  processing_status public.learning_message_attachment_status NOT NULL DEFAULT 'pending',
  storage_bucket VARCHAR(128) NOT NULL DEFAULT 'learning-chat-attachments',
  storage_path TEXT NOT NULL,
  original_filename TEXT,
  mime_type VARCHAR(128) NOT NULL,
  size_bytes INTEGER NOT NULL CHECK (size_bytes > 0),
  duration_ms INTEGER CHECK (duration_ms IS NULL OR duration_ms >= 0),
  width INTEGER CHECK (width IS NULL OR width > 0),
  height INTEGER CHECK (height IS NULL OR height > 0),
  extracted_text TEXT,
  visual_summary TEXT,
  transcript_text TEXT,
  error_message TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT learning_message_attachments_storage_unique UNIQUE (storage_bucket, storage_path)
);

CREATE INDEX IF NOT EXISTS idx_learning_message_attachments_user_created_at
ON public.learning_message_attachments(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_learning_message_attachments_session_id
ON public.learning_message_attachments(session_id);

CREATE INDEX IF NOT EXISTS idx_learning_message_attachments_message_id
ON public.learning_message_attachments(message_id);

CREATE INDEX IF NOT EXISTS idx_learning_message_attachments_processing_status
ON public.learning_message_attachments(processing_status);

DROP TRIGGER IF EXISTS tg_learning_message_attachments_updated_at ON public.learning_message_attachments;
CREATE TRIGGER tg_learning_message_attachments_updated_at
BEFORE UPDATE ON public.learning_message_attachments
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

ALTER TABLE public.learning_message_attachments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS learning_message_attachments_select_own
ON public.learning_message_attachments;
CREATE POLICY learning_message_attachments_select_own
ON public.learning_message_attachments
FOR SELECT
USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS learning_message_attachments_insert_own
ON public.learning_message_attachments;
CREATE POLICY learning_message_attachments_insert_own
ON public.learning_message_attachments
FOR INSERT
WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS learning_message_attachments_update_own
ON public.learning_message_attachments;
CREATE POLICY learning_message_attachments_update_own
ON public.learning_message_attachments
FOR UPDATE
USING ((SELECT auth.uid()) = user_id)
WITH CHECK ((SELECT auth.uid()) = user_id);

COMMIT;
