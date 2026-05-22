BEGIN;

UPDATE public.learning_paths
SET metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object(
  'templateScope',
  'admin_self_directed_initial'
)
WHERE source_type = 'self_directed'
  AND code LIKE 'path-%-self-study'
  AND COALESCE(metadata->>'templateScope', '') = '';

DROP INDEX IF EXISTS public.uidx_learning_paths_self_directed_active_tool_level;

CREATE UNIQUE INDEX IF NOT EXISTS uidx_learning_paths_self_directed_active_tool_level
ON public.learning_paths(tool_id, target_level)
WHERE source_type = 'self_directed'
  AND metadata->>'templateScope' = 'admin_self_directed_initial'
  AND is_active = true;

CREATE INDEX IF NOT EXISTS idx_path_steps_active_path_step_no
ON public.path_steps(path_id, step_no)
WHERE metadata->>'archivedAt' IS NULL;

CREATE OR REPLACE FUNCTION public.save_self_directed_learning_template(
  p_admin_account_id UUID,
  p_template_id UUID,
  p_tool_code TEXT,
  p_learning_level public.learning_level,
  p_code TEXT,
  p_name TEXT,
  p_description TEXT,
  p_preview JSONB,
  p_agent_code TEXT,
  p_is_active BOOLEAN,
  p_steps JSONB,
  p_change_reason TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_now TIMESTAMPTZ := timezone('utc', now());
  v_tool RECORD;
  v_existing RECORD;
  v_template_id UUID;
  v_code TEXT;
  v_before JSONB := NULL;
  v_after JSONB;
  v_action TEXT;
  v_step JSONB;
  v_step_id UUID;
  v_written_step_id UUID;
  v_submitted_ids UUID[] := ARRAY[]::UUID[];
  v_step_no INTEGER := 0;
  v_temp_offset INTEGER := 1000;
  v_removed RECORD;
  v_referenced BOOLEAN := FALSE;
BEGIN
  IF p_steps IS NULL OR jsonb_typeof(p_steps) <> 'array' OR jsonb_array_length(p_steps) = 0 THEN
    RAISE EXCEPTION 'TEMPLATE_STEPS_EMPTY';
  END IF;

  SELECT *
  INTO v_tool
  FROM public.learning_tools
  WHERE code = btrim(p_tool_code)
    AND is_active = TRUE
  LIMIT 1;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'TEMPLATE_TOOL_NOT_FOUND';
  END IF;

  IF p_template_id IS NULL THEN
    v_code := COALESCE(
      NULLIF(btrim(COALESCE(p_code, '')), ''),
      'path-' || v_tool.code || '-' || p_learning_level::TEXT || '-self-study'
    );
    v_action := 'learning_template_create';

    INSERT INTO public.learning_paths (
      tool_id,
      code,
      name,
      target_level,
      source_type,
      version,
      is_default,
      is_active,
      agent_code,
      stage_count,
      description,
      metadata,
      created_at,
      updated_at
    )
    VALUES (
      v_tool.id,
      v_code,
      left(btrim(p_name), 128),
      p_learning_level,
      'self_directed',
      1,
      FALSE,
      p_is_active,
      NULLIF(btrim(COALESCE(p_agent_code, '')), ''),
      jsonb_array_length(p_steps),
      NULLIF(btrim(COALESCE(p_description, '')), ''),
      jsonb_build_object(
        'templateScope',
        'admin_self_directed_initial',
        'preview',
        CASE WHEN jsonb_typeof(p_preview) = 'array' THEN p_preview ELSE '[]'::jsonb END
      ),
      v_now,
      v_now
    )
    RETURNING id INTO v_template_id;
  ELSE
    SELECT *
    INTO v_existing
    FROM public.learning_paths
    WHERE id = p_template_id
      AND source_type = 'self_directed'
      AND metadata->>'templateScope' = 'admin_self_directed_initial'
    FOR UPDATE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'TEMPLATE_NOT_FOUND';
    END IF;

    v_template_id := p_template_id;
    v_code := COALESCE(NULLIF(btrim(COALESCE(p_code, '')), ''), v_existing.code);
    v_action := 'learning_template_update';
    v_before := to_jsonb(v_existing);

    UPDATE public.learning_paths
    SET
      tool_id = v_tool.id,
      code = v_code,
      name = left(btrim(p_name), 128),
      target_level = p_learning_level,
      description = NULLIF(btrim(COALESCE(p_description, '')), ''),
      metadata = COALESCE(v_existing.metadata, '{}'::jsonb) || jsonb_build_object(
        'templateScope',
        'admin_self_directed_initial',
        'preview',
        CASE WHEN jsonb_typeof(p_preview) = 'array' THEN p_preview ELSE '[]'::jsonb END
      ),
      agent_code = NULLIF(btrim(COALESCE(p_agent_code, '')), ''),
      is_active = p_is_active,
      stage_count = jsonb_array_length(p_steps),
      updated_at = v_now
    WHERE id = v_template_id;
  END IF;

  PERFORM 1
  FROM public.path_steps
  WHERE path_id = v_template_id
  FOR UPDATE;

  SELECT COALESCE(MAX(step_no), 0) + jsonb_array_length(p_steps) + 1000
  INTO v_temp_offset
  FROM public.path_steps
  WHERE path_id = v_template_id;

  UPDATE public.path_steps
  SET
    step_no = step_no + v_temp_offset,
    updated_at = v_now
  WHERE path_id = v_template_id;

  FOR v_step IN
    SELECT value
    FROM jsonb_array_elements(p_steps) AS step(value)
  LOOP
    v_step_no := v_step_no + 1;
    v_step_id := NULL;

    IF NULLIF(v_step->>'stepId', '') IS NOT NULL THEN
      v_step_id := (v_step->>'stepId')::UUID;
    END IF;

    IF v_step_id IS NOT NULL AND EXISTS (
      SELECT 1
      FROM public.path_steps
      WHERE id = v_step_id
        AND path_id = v_template_id
        AND metadata->>'archivedAt' IS NULL
    ) THEN
      UPDATE public.path_steps
      SET
        step_no = v_step_no,
        title = left(btrim(COALESCE(v_step->>'title', '')), 128),
        summary = left(btrim(COALESCE(v_step->>'summary', '')), 3000),
        focus = left(NULLIF(btrim(COALESCE(v_step->>'focus', '')), ''), 3000),
        goal = left(btrim(COALESCE(v_step->>'goal', '')), 3000),
        completion_criteria = left(NULLIF(btrim(COALESCE(v_step->>'completionCriteria', '')), ''), 3000),
        review_summary = left(NULLIF(btrim(COALESCE(v_step->>'reviewSummary', '')), ''), 3000),
        estimated_minutes = CASE
          WHEN jsonb_typeof(v_step->'estimatedMinutes') = 'number'
            THEN GREATEST(0, ((v_step->>'estimatedMinutes')::NUMERIC)::INTEGER)
          ELSE NULL
        END,
        reward_score = CASE
          WHEN jsonb_typeof(v_step->'rewardScore') = 'number'
            THEN GREATEST(0, ((v_step->>'rewardScore')::NUMERIC)::INTEGER)
          ELSE 0
        END,
        knowledge_points = CASE WHEN jsonb_typeof(v_step->'knowledgePoints') = 'array' THEN v_step->'knowledgePoints' ELSE '[]'::jsonb END,
        key_points = CASE WHEN jsonb_typeof(v_step->'keyPoints') = 'array' THEN v_step->'keyPoints' ELSE '[]'::jsonb END,
        pitfalls = CASE WHEN jsonb_typeof(v_step->'pitfalls') = 'array' THEN v_step->'pitfalls' ELSE '[]'::jsonb END,
        difficulty_weight = 1,
        is_required = TRUE,
        metadata = jsonb_build_object(
          'lessonBrief', NULLIF(btrim(COALESCE(v_step->>'lessonBrief', '')), ''),
          'practiceSteps', CASE WHEN jsonb_typeof(v_step->'practiceSteps') = 'array' THEN v_step->'practiceSteps' ELSE '[]'::jsonb END,
          'submissionGuide', NULLIF(btrim(COALESCE(v_step->>'submissionGuide', '')), ''),
          'checkpoints', CASE WHEN jsonb_typeof(v_step->'checkpoints') = 'array' THEN v_step->'checkpoints' ELSE '[]'::jsonb END
        ),
        updated_at = v_now
      WHERE id = v_step_id
        AND path_id = v_template_id
      RETURNING id INTO v_written_step_id;
    ELSE
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
        v_template_id,
        v_step_no,
        left(btrim(COALESCE(v_step->>'title', '')), 128),
        left(btrim(COALESCE(v_step->>'summary', '')), 3000),
        left(NULLIF(btrim(COALESCE(v_step->>'focus', '')), ''), 3000),
        left(btrim(COALESCE(v_step->>'goal', '')), 3000),
        left(NULLIF(btrim(COALESCE(v_step->>'completionCriteria', '')), ''), 3000),
        left(NULLIF(btrim(COALESCE(v_step->>'reviewSummary', '')), ''), 3000),
        CASE
          WHEN jsonb_typeof(v_step->'estimatedMinutes') = 'number'
            THEN GREATEST(0, ((v_step->>'estimatedMinutes')::NUMERIC)::INTEGER)
          ELSE NULL
        END,
        CASE
          WHEN jsonb_typeof(v_step->'rewardScore') = 'number'
            THEN GREATEST(0, ((v_step->>'rewardScore')::NUMERIC)::INTEGER)
          ELSE 0
        END,
        CASE WHEN jsonb_typeof(v_step->'knowledgePoints') = 'array' THEN v_step->'knowledgePoints' ELSE '[]'::jsonb END,
        CASE WHEN jsonb_typeof(v_step->'keyPoints') = 'array' THEN v_step->'keyPoints' ELSE '[]'::jsonb END,
        CASE WHEN jsonb_typeof(v_step->'pitfalls') = 'array' THEN v_step->'pitfalls' ELSE '[]'::jsonb END,
        1,
        TRUE,
        jsonb_build_object(
          'lessonBrief', NULLIF(btrim(COALESCE(v_step->>'lessonBrief', '')), ''),
          'practiceSteps', CASE WHEN jsonb_typeof(v_step->'practiceSteps') = 'array' THEN v_step->'practiceSteps' ELSE '[]'::jsonb END,
          'submissionGuide', NULLIF(btrim(COALESCE(v_step->>'submissionGuide', '')), ''),
          'checkpoints', CASE WHEN jsonb_typeof(v_step->'checkpoints') = 'array' THEN v_step->'checkpoints' ELSE '[]'::jsonb END
        ),
        v_now,
        v_now
      )
      RETURNING id INTO v_written_step_id;
    END IF;

    v_submitted_ids := array_append(v_submitted_ids, v_written_step_id);
  END LOOP;

  FOR v_removed IN
    SELECT id, metadata
    FROM public.path_steps
    WHERE path_id = v_template_id
      AND metadata->>'archivedAt' IS NULL
      AND NOT (id = ANY(v_submitted_ids))
    ORDER BY step_no ASC
  LOOP
    SELECT EXISTS (
      SELECT 1
      FROM public.user_tasks
      WHERE path_step_id = v_removed.id
    )
    INTO v_referenced;

    IF v_referenced THEN
      UPDATE public.path_steps
      SET
        step_no = step_no + v_temp_offset,
        metadata = COALESCE(v_removed.metadata, '{}'::jsonb) || jsonb_build_object(
          'archivedAt', v_now,
          'archiveReason', 'admin_template_step_removed'
        ),
        updated_at = v_now
      WHERE id = v_removed.id;
    ELSE
      DELETE FROM public.path_steps
      WHERE id = v_removed.id;
    END IF;
  END LOOP;

  v_after := jsonb_build_object(
    'templateId', v_template_id::TEXT,
    'toolCode', v_tool.code,
    'learningLevel', p_learning_level::TEXT,
    'code', v_code,
    'name', left(btrim(p_name), 128),
    'description', NULLIF(btrim(COALESCE(p_description, '')), ''),
    'preview', CASE WHEN jsonb_typeof(p_preview) = 'array' THEN p_preview ELSE '[]'::jsonb END,
    'agentCode', NULLIF(btrim(COALESCE(p_agent_code, '')), ''),
    'isActive', p_is_active,
    'steps', p_steps
  );

  INSERT INTO public.admin_audit_logs (
    admin_user_id,
    action,
    target_type,
    target_id,
    before_snapshot,
    after_snapshot,
    reason,
    request_context,
    created_at
  )
  VALUES (
    p_admin_account_id,
    v_action,
    'learning_path_template',
    v_template_id,
    v_before,
    v_after,
    NULLIF(btrim(COALESCE(p_change_reason, '')), ''),
    NULL,
    v_now
  );

  RETURN jsonb_build_object('templateId', v_template_id::TEXT);
END;
$$;

CREATE OR REPLACE FUNCTION public.sync_self_directed_learning_template_unstarted(
  p_admin_account_id UUID,
  p_template_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_template RECORD;
  v_path RECORD;
  v_step RECORD;
  v_now TIMESTAMPTZ := timezone('utc', now());
  v_step_count INTEGER := 0;
  v_matched INTEGER := 0;
  v_synced INTEGER := 0;
  v_first_task_id UUID;
  v_inserted_task_id UUID;
BEGIN
  SELECT *
  INTO v_template
  FROM public.learning_paths
  WHERE id = p_template_id
    AND source_type = 'self_directed'
    AND metadata->>'templateScope' = 'admin_self_directed_initial'
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'TEMPLATE_NOT_FOUND';
  END IF;

  SELECT COUNT(*)
  INTO v_step_count
  FROM public.path_steps
  WHERE path_id = p_template_id
    AND metadata->>'archivedAt' IS NULL;

  IF v_step_count = 0 THEN
    RAISE EXCEPTION 'TEMPLATE_STEPS_EMPTY';
  END IF;

  FOR v_path IN
    SELECT *
    FROM public.user_learning_paths
    WHERE template_path_id = p_template_id
      AND selection_mode = 'self_directed'::public.path_selection_mode
      AND status IN ('active'::public.user_learning_path_status, 'interrupted'::public.user_learning_path_status)
      AND completed_steps = 0
      AND metadata->>'seedSource' = 'api_onboarding_complete'
    FOR UPDATE
  LOOP
    v_matched := v_matched + 1;
    v_first_task_id := NULL;

    DELETE FROM public.user_tasks
    WHERE user_learning_path_id = v_path.id;

    FOR v_step IN
      SELECT id, step_no
      FROM public.path_steps
      WHERE path_id = p_template_id
        AND metadata->>'archivedAt' IS NULL
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
        v_path.user_id,
        v_path.id,
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

    UPDATE public.user_learning_paths
    SET
      tool_id = v_template.tool_id,
      path_code_snapshot = v_template.code,
      path_name_snapshot = v_template.name,
      path_summary_snapshot = v_template.description,
      learning_level = v_template.target_level,
      total_steps = v_step_count,
      completed_steps = 0,
      current_task_id = v_first_task_id,
      last_activity_at = v_now,
      metadata = COALESCE(v_path.metadata, '{}'::jsonb) || jsonb_build_object(
        'templateSyncedAt', v_now,
        'templateSyncedBy', p_admin_account_id
      ),
      updated_at = v_now
    WHERE id = v_path.id;

    v_synced := v_synced + 1;
  END LOOP;

  INSERT INTO public.admin_audit_logs (
    admin_user_id,
    action,
    target_type,
    target_id,
    before_snapshot,
    after_snapshot,
    reason,
    request_context,
    created_at
  )
  VALUES (
    p_admin_account_id,
    'learning_template_sync_unstarted',
    'learning_path_template',
    p_template_id,
    NULL,
    jsonb_build_object(
      'matchedPathCount', v_matched,
      'syncedPathCount', v_synced,
      'skippedPathCount', v_matched - v_synced
    ),
    '同步未开始的初始化自学路径',
    NULL,
    v_now
  );

  RETURN jsonb_build_object(
    'templateId', p_template_id::TEXT,
    'matchedPathCount', v_matched,
    'syncedPathCount', v_synced,
    'skippedPathCount', v_matched - v_synced
  );
END;
$$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.ai_providers WHERE code = 'siliconflow')
    AND EXISTS (SELECT 1 FROM public.ai_models WHERE code = 'deepseek-v3-2')
  THEN
    INSERT INTO public.agent_templates (
      id,
      code,
      name,
      scenario_type,
      description,
      system_prompt_template,
      developer_prompt_template,
      default_provider_code,
      default_model_code,
      context_message_limit,
      max_output_tokens,
      temperature,
      top_p,
      stream_enabled,
      is_active,
      version,
      metadata,
      created_at,
      updated_at
    )
    VALUES (
      'b1000000-0000-0000-0000-0000000000a1'::uuid,
      'self-study-template-planner',
      '自学路径模板生成器',
      'path_guidance'::public.agent_scenario_type,
      '仅供管理后台学习路径模板编辑器使用，根据工具、水平和运营目标生成自学初始化模板 JSON。',
      $planner$你是「AI 编程学习教练」管理后台内的自学路径模板生成器。你只为管理员生成初始化学习路径模板草稿，必须只输出合法 JSON，不要 Markdown、不要代码围栏、不要前后说明文字。

JSON 顶层结构固定为：
{
  "name": "string",
  "description": "string",
  "preview": ["string"],
  "steps": [
    {
      "title": "string",
      "summary": "string",
      "focus": "string",
      "goal": "string",
      "completionCriteria": "string",
      "reviewSummary": "string",
      "estimatedMinutes": 30,
      "rewardScore": 20,
      "knowledgePoints": ["string"],
      "keyPoints": ["string"],
      "pitfalls": ["string"],
      "lessonBrief": "string",
      "practiceSteps": ["string"],
      "submissionGuide": "string",
      "checkpoints": ["string"]
    }
  ]
}

规则：
1. 所有用户可见文案使用简体中文。
2. steps 数量控制在 3 到 8 步，任务从低负担启动，逐步进入真实练习。
3. 每一步必须可执行、可验收；不要写抽象口号。
4. preview 控制在 2 到 5 条，用于学习页首屏预览。
5. estimatedMinutes 使用 15 到 90 的整数；rewardScore 使用 5 到 60 的整数。
6. practiceSteps 至少 2 条，checkpoints 至少 1 条。
7. 如果用户消息包含 currentTemplate，优先基于现有模板改写，不要无视上下文。$planner$,
      '用户消息是包含 tool、learningLevel、operatorGoal、currentTemplate 的 JSON；严格按 system 的 JSON 契约输出。',
      'siliconflow',
      'deepseek-v3-2',
      4,
      4200,
      0.25::numeric,
      0.85::numeric,
      false,
      true,
      1,
      '{"profileCode":"sf-balanced-default","role":"self_study_template_planner","adminOnly":true}'::jsonb,
      NOW(),
      NOW()
    )
    ON CONFLICT (code) DO UPDATE SET
      name = EXCLUDED.name,
      scenario_type = EXCLUDED.scenario_type,
      description = EXCLUDED.description,
      system_prompt_template = EXCLUDED.system_prompt_template,
      developer_prompt_template = EXCLUDED.developer_prompt_template,
      default_provider_code = EXCLUDED.default_provider_code,
      default_model_code = EXCLUDED.default_model_code,
      context_message_limit = EXCLUDED.context_message_limit,
      max_output_tokens = EXCLUDED.max_output_tokens,
      temperature = EXCLUDED.temperature,
      top_p = EXCLUDED.top_p,
      stream_enabled = EXCLUDED.stream_enabled,
      is_active = EXCLUDED.is_active,
      metadata = EXCLUDED.metadata,
      updated_at = NOW();
  END IF;
END
$$;

COMMIT;
