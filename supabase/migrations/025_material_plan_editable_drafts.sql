BEGIN;

ALTER TABLE public.learning_plan_drafts
  ADD COLUMN alignment_json JSONB,
  ADD COLUMN week_1_task_ids JSONB,
  ADD COLUMN revision_no INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN editable_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN quality_status TEXT NOT NULL DEFAULT 'pending',
  ADD COLUMN quality_report JSONB;

ALTER TABLE public.learning_plan_draft_tasks
  ADD COLUMN position INTEGER,
  ADD COLUMN is_user_edited BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN goal_alignment_refs JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN recommended_for_week_1 BOOLEAN NOT NULL DEFAULT FALSE;

CREATE TABLE public.learning_plan_draft_revisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  draft_id UUID NOT NULL REFERENCES public.learning_plan_drafts(id) ON DELETE CASCADE,
  revision_no INTEGER NOT NULL,
  change_type TEXT NOT NULL,
  patch_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  generated_by_run_id UUID REFERENCES public.learning_plan_generation_runs(id) ON DELETE SET NULL,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT uq_learning_plan_draft_revisions_draft_revision UNIQUE (draft_id, revision_no)
);

CREATE INDEX idx_learning_plan_draft_revisions_draft_id
  ON public.learning_plan_draft_revisions(draft_id);
CREATE INDEX idx_learning_plan_draft_revisions_generated_by_run_id
  ON public.learning_plan_draft_revisions(generated_by_run_id);

COMMIT;
