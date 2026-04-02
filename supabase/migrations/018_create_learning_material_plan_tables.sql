BEGIN;

CREATE TYPE public.learning_material_intake_status AS ENUM (
  'pending',
  'processing',
  'succeeded',
  'failed'
);

CREATE TYPE public.learning_material_source_type AS ENUM (
  'article',
  'video',
  'unknown'
);

CREATE TYPE public.learning_material_fetch_status AS ENUM (
  'succeeded',
  'failed',
  'unsupported',
  'timeout'
);

CREATE TYPE public.learning_plan_draft_status AS ENUM (
  'draft',
  'confirmed',
  'rejected',
  'superseded'
);

CREATE TABLE public.learning_material_intakes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status public.learning_material_intake_status NOT NULL DEFAULT 'pending',
  input_links JSONB NOT NULL DEFAULT '[]'::jsonb,
  normalized_summary TEXT,
  error_code VARCHAR(64),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_learning_material_intakes_user_created_at
  ON public.learning_material_intakes(user_id, created_at DESC);
CREATE INDEX idx_learning_material_intakes_user_status
  ON public.learning_material_intakes(user_id, status);

CREATE TABLE public.learning_material_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  intake_id UUID NOT NULL REFERENCES public.learning_material_intakes(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  source_type public.learning_material_source_type NOT NULL DEFAULT 'unknown',
  fetch_status public.learning_material_fetch_status NOT NULL DEFAULT 'failed',
  title TEXT,
  language VARCHAR(16),
  content_excerpt TEXT,
  token_estimate INTEGER,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_learning_material_sources_intake_url UNIQUE (intake_id, url)
);

CREATE INDEX idx_learning_material_sources_intake_id
  ON public.learning_material_sources(intake_id);

CREATE TABLE public.learning_plan_drafts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  intake_id UUID NOT NULL REFERENCES public.learning_material_intakes(id) ON DELETE CASCADE,
  title VARCHAR(256) NOT NULL,
  goal TEXT,
  difficulty VARCHAR(32),
  estimated_total_minutes INTEGER,
  status public.learning_plan_draft_status NOT NULL DEFAULT 'draft',
  raw_plan_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  confirmed_template_path_id UUID REFERENCES public.learning_paths(id) ON DELETE SET NULL,
  confirmed_user_learning_path_id UUID REFERENCES public.user_learning_paths(id) ON DELETE SET NULL,
  superseded_by_draft_id UUID REFERENCES public.learning_plan_drafts(id) ON DELETE SET NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_learning_plan_drafts_user_status_updated_at
  ON public.learning_plan_drafts(user_id, status, updated_at DESC);
CREATE INDEX idx_learning_plan_drafts_intake_id
  ON public.learning_plan_drafts(intake_id);

CREATE TABLE public.learning_plan_draft_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  draft_id UUID NOT NULL REFERENCES public.learning_plan_drafts(id) ON DELETE CASCADE,
  task_no INTEGER NOT NULL,
  title VARCHAR(256) NOT NULL,
  objective TEXT NOT NULL,
  practice_steps JSONB NOT NULL DEFAULT '[]'::jsonb,
  acceptance_criteria TEXT NOT NULL,
  estimated_minutes INTEGER,
  source_refs JSONB NOT NULL DEFAULT '[]'::jsonb,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_learning_plan_draft_tasks_draft_task_no UNIQUE (draft_id, task_no)
);

CREATE INDEX idx_learning_plan_draft_tasks_draft_id
  ON public.learning_plan_draft_tasks(draft_id, task_no);

DROP TRIGGER IF EXISTS tg_learning_material_intakes_updated_at ON public.learning_material_intakes;
CREATE TRIGGER tg_learning_material_intakes_updated_at
  BEFORE UPDATE ON public.learning_material_intakes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

DROP TRIGGER IF EXISTS tg_learning_material_sources_updated_at ON public.learning_material_sources;
CREATE TRIGGER tg_learning_material_sources_updated_at
  BEFORE UPDATE ON public.learning_material_sources
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

DROP TRIGGER IF EXISTS tg_learning_plan_drafts_updated_at ON public.learning_plan_drafts;
CREATE TRIGGER tg_learning_plan_drafts_updated_at
  BEFORE UPDATE ON public.learning_plan_drafts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

DROP TRIGGER IF EXISTS tg_learning_plan_draft_tasks_updated_at ON public.learning_plan_draft_tasks;
CREATE TRIGGER tg_learning_plan_draft_tasks_updated_at
  BEFORE UPDATE ON public.learning_plan_draft_tasks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

COMMIT;
