BEGIN;

ALTER TABLE public.learning_plan_generation_runs
  ADD COLUMN IF NOT EXISTS claim_token UUID,
  ADD COLUMN IF NOT EXISTS claimed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS heartbeat_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_learning_plan_generation_runs_claim_heartbeat
  ON public.learning_plan_generation_runs(status, heartbeat_at)
  WHERE finished_at IS NULL;

CREATE OR REPLACE FUNCTION public.claim_material_plan_generation_run(
  p_run_id UUID,
  p_claim_token UUID,
  p_timeout_seconds INTEGER DEFAULT 600
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_claimed UUID;
BEGIN
  UPDATE public.learning_plan_generation_runs
  SET
    claim_token = p_claim_token,
    claimed_at = timezone('utc', now()),
    heartbeat_at = timezone('utc', now()),
    updated_at = timezone('utc', now())
  WHERE id = p_run_id
    AND finished_at IS NULL
    AND status IN ('queued', 'extracting', 'planning', 'quality_checking')
    AND (
      claim_token IS NULL
      OR heartbeat_at IS NULL
      OR heartbeat_at < timezone('utc', now()) - make_interval(secs => p_timeout_seconds)
    )
  RETURNING id INTO v_claimed;

  RETURN v_claimed IS NOT NULL;
END;
$$;

CREATE OR REPLACE FUNCTION public.confirm_learning_plan_draft(
  p_user_id UUID,
  p_draft_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_draft RECORD;
  v_existing_path RECORD;
  v_profile RECORD;
  v_tool RECORD;
  v_active_path RECORD;
  v_task RECORD;
  v_step RECORD;
  v_template_path_id UUID;
  v_user_learning_path_id UUID;
  v_first_task_id UUID;
  v_inserted_task_id UUID;
  v_path_code TEXT;
  v_path_name TEXT;
  v_path_description TEXT;
  v_now TIMESTAMPTZ := timezone('utc', now());
  v_practice_summary TEXT;
  v_step_metadata JSONB;
  v_step_count INTEGER := 0;
BEGIN
  SELECT *
  INTO v_draft
  FROM public.learning_plan_drafts
  WHERE id = p_draft_id
  FOR UPDATE;

  IF NOT FOUND OR v_draft.user_id <> p_user_id THEN
    RAISE EXCEPTION 'PLAN_DRAFT_NOT_FOUND';
  END IF;

  IF v_draft.status = 'confirmed' AND v_draft.confirmed_user_learning_path_id IS NOT NULL THEN
    SELECT current_task_id, template_path_id
    INTO v_existing_path
    FROM public.user_learning_paths
    WHERE id = v_draft.confirmed_user_learning_path_id
      AND user_id = p_user_id;

    IF FOUND AND v_existing_path.current_task_id IS NOT NULL THEN
      RETURN jsonb_build_object(
        'learningPathId', v_draft.confirmed_user_learning_path_id::TEXT,
        'currentTaskId', v_existing_path.current_task_id::TEXT,
        'redirectTo', '/learn'
      );
    END IF;

    IF FOUND AND v_existing_path.template_path_id IS NOT NULL THEN
      SELECT ut.id
      INTO v_first_task_id
      FROM public.user_tasks ut
      JOIN public.path_steps ps ON ps.id = ut.path_step_id
      WHERE ut.user_learning_path_id = v_draft.confirmed_user_learning_path_id
        AND ps.path_id = v_existing_path.template_path_id
      ORDER BY ps.step_no ASC
      LIMIT 1;

      IF v_first_task_id IS NOT NULL THEN
        RETURN jsonb_build_object(
          'learningPathId', v_draft.confirmed_user_learning_path_id::TEXT,
          'currentTaskId', v_first_task_id::TEXT,
          'redirectTo', '/learn'
        );
      END IF;
    END IF;
  END IF;

  IF v_draft.status <> 'draft' THEN
    RAISE EXCEPTION 'PLAN_DRAFT_ALREADY_CONFIRMED';
  END IF;

  IF v_draft.quality_status = 'pending' THEN
    RAISE EXCEPTION 'PLAN_DRAFT_QUALITY_PENDING';
  END IF;

  IF v_draft.quality_status NOT IN ('passed', 'pilot_fallback') THEN
    RAISE EXCEPTION 'PLAN_DRAFT_QUALITY_INVALID';
  END IF;

  SELECT *
  INTO v_profile
  FROM public.user_profiles
  WHERE user_id = p_user_id
  FOR UPDATE;

  IF NOT FOUND OR v_profile.primary_tool_id IS NULL THEN
    RAISE EXCEPTION 'PLAN_DRAFT_TASKS_INVALID';
  END IF;

  SELECT *
  INTO v_active_path
  FROM public.user_learning_paths
  WHERE user_id = p_user_id
    AND status = 'active'
  ORDER BY updated_at DESC
  LIMIT 1
  FOR UPDATE;

  IF NOT FOUND OR v_active_path.selection_mode <> 'self_directed' THEN
    RAISE EXCEPTION 'SELF_DIRECTED_PLAN_REQUIRED';
  END IF;

  SELECT *
  INTO v_tool
  FROM public.learning_tools
  WHERE id = v_profile.primary_tool_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'PLAN_DRAFT_TASKS_INVALID';
  END IF;

  SELECT COUNT(*)
  INTO v_step_count
  FROM public.learning_plan_draft_tasks
  WHERE draft_id = p_draft_id;

  IF v_step_count = 0 THEN
    RAISE EXCEPTION 'PLAN_DRAFT_TASKS_INVALID';
  END IF;

  FOR v_task IN
    SELECT *
    FROM public.learning_plan_draft_tasks
    WHERE draft_id = p_draft_id
    ORDER BY task_no ASC
  LOOP
    IF jsonb_array_length(COALESCE(v_task.mastery_points, '[]'::jsonb)) < 2 THEN
      RAISE EXCEPTION 'PLAN_DRAFT_TASKS_INVALID';
    END IF;

    IF NOT EXISTS (
      SELECT 1
      FROM jsonb_array_elements(COALESCE(v_task.cautions, '[]'::jsonb)) AS caution(item)
      WHERE btrim(COALESCE(caution.item->>'text', '')) <> ''
    ) THEN
      RAISE EXCEPTION 'PLAN_DRAFT_TASKS_INVALID';
    END IF;
  END LOOP;

  v_path_code := 'mp-' || p_draft_id::TEXT;
  v_path_name := left(v_draft.title, 128);
  v_path_description := COALESCE(left(v_draft.goal, 2000), v_path_name);

  INSERT INTO public.learning_paths (
    tool_id,
    code,
    name,
    target_level,
    source_type,
    version,
    is_default,
    is_active,
    stage_count,
    description,
    metadata,
    created_at,
    updated_at
  )
  VALUES (
    v_tool.id,
    v_path_code,
    v_path_name,
    v_profile.learning_level,
    'self_directed',
    1,
    FALSE,
    TRUE,
    v_step_count,
    v_path_description,
    jsonb_build_object(
      'seed_source', 'plan_draft_confirmed',
      'draft_id', p_draft_id,
      'intake_id', v_draft.intake_id
    ),
    v_now,
    v_now
  )
  RETURNING id INTO v_template_path_id;

  FOR v_task IN
    SELECT *
    FROM public.learning_plan_draft_tasks
    WHERE draft_id = p_draft_id
    ORDER BY task_no ASC
  LOOP
    SELECT string_agg(step_text.value, '；')
    INTO v_practice_summary
    FROM jsonb_array_elements_text(COALESCE(v_task.practice_steps, '[]'::jsonb)) AS step_text(value);

    v_step_metadata := jsonb_build_object(
      'source_refs', v_task.source_refs,
      'goal_alignment_refs', v_task.goal_alignment_refs,
      'recommended_for_week_1', v_task.recommended_for_week_1,
      'draft_revision_no', v_draft.revision_no,
      'lessonBrief', COALESCE(NULLIF(v_task.metadata->>'lessonBrief', ''), v_task.objective),
      'practiceSteps', COALESCE(v_task.practice_steps, '[]'::jsonb),
      'submissionGuide', COALESCE(NULLIF(v_task.metadata->>'submissionGuide', ''), '完成后把你的产出、截图、代码、终端输出或报错信息发给 AI 教练。'),
      'checkpoints', COALESCE(v_task.metadata->'checkpoints', '[]'::jsonb)
    );

    INSERT INTO public.path_steps (
      path_id,
      step_no,
      title,
      summary,
      focus,
      goal,
      completion_criteria,
      review_summary,
      estimated_minutes,
      reward_score,
      knowledge_points,
      key_points,
      pitfalls,
      difficulty_weight,
      is_required,
      metadata,
      created_at,
      updated_at
    )
    VALUES (
      v_template_path_id,
      v_task.task_no,
      left(v_task.title, 128),
      left(COALESCE(v_practice_summary, v_task.objective), 4000),
      left(COALESCE(NULLIF(v_task.metadata->>'lessonBrief', ''), v_task.objective), 4000),
      left(v_task.objective, 4000),
      left(v_task.acceptance_criteria, 4000),
      NULL,
      COALESCE(v_task.estimated_minutes, 45),
      10,
      (
        SELECT COALESCE(jsonb_agg(item), '[]'::jsonb)
        FROM (
          SELECT mastery.item
          FROM jsonb_array_elements(COALESCE(v_task.mastery_points, '[]'::jsonb)) AS mastery(item)
          LIMIT 4
        ) subset
      ),
      COALESCE(v_task.mastery_points, '[]'::jsonb),
      COALESCE(v_task.cautions, '[]'::jsonb),
      1,
      TRUE,
      v_step_metadata,
      v_now,
      v_now
    );
  END LOOP;

  UPDATE public.user_learning_paths
  SET status = 'archived', updated_at = v_now
  WHERE user_id = p_user_id
    AND status = 'active';

  INSERT INTO public.user_learning_paths (
    user_id,
    template_path_id,
    tool_id,
    path_code_snapshot,
    path_name_snapshot,
    path_summary_snapshot,
    learning_level,
    selection_mode,
    status,
    total_steps,
    completed_steps,
    started_at,
    last_activity_at,
    metadata,
    created_at,
    updated_at
  )
  VALUES (
    p_user_id,
    v_template_path_id,
    v_tool.id,
    v_path_code,
    v_path_name,
    v_path_description,
    v_profile.learning_level,
    'self_directed',
    'active',
    v_step_count,
    0,
    v_now,
    v_now,
    jsonb_build_object(
      'seedSource', 'plan_draft_confirmed',
      'draftId', p_draft_id,
      'intakeId', v_draft.intake_id,
      'draftRevisionNo', v_draft.revision_no
    ),
    v_now,
    v_now
  )
  RETURNING id INTO v_user_learning_path_id;

  FOR v_step IN
    SELECT id, step_no
    FROM public.path_steps
    WHERE path_id = v_template_path_id
    ORDER BY step_no ASC
  LOOP
    INSERT INTO public.user_tasks (
      user_id,
      user_learning_path_id,
      path_step_id,
      status,
      started_at,
      attempt_count,
      score_awarded,
      metadata,
      created_at,
      updated_at
    )
    VALUES (
      p_user_id,
      v_user_learning_path_id,
      v_step.id,
      CASE WHEN v_first_task_id IS NULL THEN 'in_progress'::public.task_status ELSE 'not_started'::public.task_status END,
      CASE WHEN v_first_task_id IS NULL THEN v_now ELSE NULL END,
      0,
      0,
      '{}'::jsonb,
      v_now,
      v_now
    )
    RETURNING id INTO v_inserted_task_id;

    IF v_first_task_id IS NULL THEN
      v_first_task_id := v_inserted_task_id;
    END IF;
  END LOOP;

  IF v_first_task_id IS NULL THEN
    RAISE EXCEPTION 'PLAN_DRAFT_TASKS_INVALID';
  END IF;

  UPDATE public.user_learning_paths
  SET current_task_id = v_first_task_id, updated_at = v_now
  WHERE id = v_user_learning_path_id;

  UPDATE public.user_profiles
  SET last_active_task_id = v_first_task_id, updated_at = v_now
  WHERE user_id = p_user_id;

  UPDATE public.learning_plan_drafts
  SET
    status = 'confirmed',
    confirmed_template_path_id = v_template_path_id,
    confirmed_user_learning_path_id = v_user_learning_path_id,
    updated_at = v_now
  WHERE id = p_draft_id
    AND user_id = p_user_id
    AND status = 'draft';

  RETURN jsonb_build_object(
    'learningPathId', v_user_learning_path_id::TEXT,
    'currentTaskId', v_first_task_id::TEXT,
    'redirectTo', '/learn'
  );
END;
$$;

COMMIT;
