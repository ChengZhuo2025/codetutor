BEGIN;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type
    WHERE typname = 'feedback_type'
      AND typnamespace = 'public'::regnamespace
  ) THEN
    CREATE TYPE public.feedback_type AS ENUM (
      'visual_design',
      'interaction_flow',
      'feature_request',
      'issue_report'
    );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type
    WHERE typname = 'feedback_status'
      AND typnamespace = 'public'::regnamespace
  ) THEN
    CREATE TYPE public.feedback_status AS ENUM (
      'submitted',
      'in_review',
      'replied',
      'closed'
    );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type
    WHERE typname = 'feedback_priority'
      AND typnamespace = 'public'::regnamespace
  ) THEN
    CREATE TYPE public.feedback_priority AS ENUM (
      'low',
      'medium',
      'high'
    );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type
    WHERE typname = 'feedback_reply_author_type'
      AND typnamespace = 'public'::regnamespace
  ) THEN
    CREATE TYPE public.feedback_reply_author_type AS ENUM (
      'user',
      'admin',
      'system'
    );
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.feedback_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  feedback_type public.feedback_type NOT NULL,
  status public.feedback_status NOT NULL DEFAULT 'submitted',
  priority public.feedback_priority NOT NULL DEFAULT 'medium',
  source VARCHAR(32),
  title VARCHAR(80) NOT NULL,
  content TEXT NOT NULL,
  contact_method VARCHAR(120),
  user_nickname_snapshot VARCHAR(64),
  user_phone_snapshot VARCHAR(32),
  user_contact_email_snapshot VARCHAR(255),
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_reply_at TIMESTAMPTZ,
  closed_at TIMESTAMPTZ,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.feedback_replies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES public.feedback_tickets(id) ON DELETE CASCADE,
  author_type public.feedback_reply_author_type NOT NULL,
  author_id VARCHAR(64),
  content TEXT NOT NULL,
  is_internal_note BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_feedback_tickets_user_created_at
ON public.feedback_tickets(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_feedback_tickets_status_updated_at
ON public.feedback_tickets(status, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_feedback_tickets_type_created_at
ON public.feedback_tickets(feedback_type, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_feedback_replies_ticket_created_at
ON public.feedback_replies(ticket_id, created_at ASC);

DROP TRIGGER IF EXISTS tg_feedback_tickets_updated_at ON public.feedback_tickets;

CREATE TRIGGER tg_feedback_tickets_updated_at
BEFORE UPDATE ON public.feedback_tickets
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

COMMIT;
