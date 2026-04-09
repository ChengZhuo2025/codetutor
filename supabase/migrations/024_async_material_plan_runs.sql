BEGIN;

ALTER TYPE public.learning_material_intake_status
  ADD VALUE IF NOT EXISTS 'queued';
ALTER TYPE public.learning_material_intake_status
  ADD VALUE IF NOT EXISTS 'extracting';
ALTER TYPE public.learning_material_intake_status
  ADD VALUE IF NOT EXISTS 'planning';
ALTER TYPE public.learning_material_intake_status
  ADD VALUE IF NOT EXISTS 'quality_checking';
ALTER TYPE public.learning_material_intake_status
  ADD VALUE IF NOT EXISTS 'ready';

ALTER TABLE public.learning_material_intakes
  ADD COLUMN processing_stage TEXT,
  ADD COLUMN progress_percent INTEGER,
  ADD COLUMN progress_message TEXT,
  ADD COLUMN source_kind TEXT,
  ADD COLUMN current_constraints TEXT,
  ADD COLUMN latest_draft_id UUID REFERENCES public.learning_plan_drafts(id) ON DELETE SET NULL;

CREATE TABLE public.learning_material_chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  intake_id UUID NOT NULL REFERENCES public.learning_material_intakes(id) ON DELETE CASCADE,
  source_id UUID NOT NULL REFERENCES public.learning_material_sources(id) ON DELETE CASCADE,
  chunk_no INTEGER NOT NULL,
  modality TEXT NOT NULL,
  content TEXT NOT NULL,
  summary TEXT,
  source_ref JSONB NOT NULL DEFAULT '{}'::jsonb,
  token_estimate INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX idx_learning_material_chunks_intake_id
  ON public.learning_material_chunks(intake_id);
CREATE INDEX idx_learning_material_chunks_source_id
  ON public.learning_material_chunks(source_id);

CREATE TABLE public.learning_plan_generation_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  intake_id UUID NOT NULL REFERENCES public.learning_material_intakes(id) ON DELETE CASCADE,
  draft_id UUID REFERENCES public.learning_plan_drafts(id),
  trigger_type TEXT NOT NULL,
  status TEXT NOT NULL,
  source_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
  planner_input JSONB,
  planner_output JSONB,
  quality_report JSONB,
  error_code TEXT,
  error_message TEXT,
  started_at TIMESTAMPTZ,
  finished_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX idx_learning_plan_generation_runs_user_id
  ON public.learning_plan_generation_runs(user_id);
CREATE INDEX idx_learning_plan_generation_runs_intake_id
  ON public.learning_plan_generation_runs(intake_id);
CREATE INDEX idx_learning_plan_generation_runs_status
  ON public.learning_plan_generation_runs(status);

ALTER TABLE public.learning_material_intakes
  ADD COLUMN latest_run_id UUID REFERENCES public.learning_plan_generation_runs(id) ON DELETE SET NULL;

CREATE INDEX idx_learning_material_intakes_latest_run_id
  ON public.learning_material_intakes(latest_run_id);

DROP TRIGGER IF EXISTS tg_learning_material_chunks_updated_at ON public.learning_material_chunks;
CREATE TRIGGER tg_learning_material_chunks_updated_at
  BEFORE UPDATE ON public.learning_material_chunks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

DROP TRIGGER IF EXISTS tg_learning_plan_generation_runs_updated_at ON public.learning_plan_generation_runs;
CREATE TRIGGER tg_learning_plan_generation_runs_updated_at
  BEFORE UPDATE ON public.learning_plan_generation_runs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

COMMIT;
