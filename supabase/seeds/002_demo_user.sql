BEGIN;

DO $$
DECLARE
  dev_user_id UUID := 'c53ca227-d0b9-40f2-8274-cea851f7ad03'; -- REPLACE WITH YOUR Supabase Auth user ID
  user_pref_id UUID := '77777777-7777-7777-7777-777777777777';
  user_path_id UUID := '99999999-0000-0000-0000-999999999999';
  tool_id UUID;
  demo_path_id UUID;
  current_task_uuid UUID;
BEGIN
  SELECT id INTO tool_id FROM public.learning_tools WHERE code = 'cursor';
  SELECT id INTO demo_path_id FROM public.learning_paths WHERE code = 'cursor-quickstart';

  IF tool_id IS NULL OR demo_path_id IS NULL THEN
    RAISE EXCEPTION 'Cursor tool or path is missing; run supabase/seeds/001_dictionary.sql first.';
  END IF;

  INSERT INTO public.user_profiles (
    user_id,
    nickname,
    avatar_url,
    primary_tool_id,
    learning_level,
    current_rank_code,
    current_score,
    streak_days,
    last_learning_at,
    metadata,
    created_at,
    updated_at
  )
  VALUES (
    dev_user_id,
    '陈小明',
    'https://example.com/avatar.png',
    tool_id,
    'beginner',
    'vibe_coder',
    680,
    7,
    NOW() - INTERVAL '1 hour',
    '{"seed":"demo-user"}'::jsonb,
    NOW(),
    NOW()
  )
  ON CONFLICT (user_id) DO UPDATE
  SET
    nickname = EXCLUDED.nickname,
    primary_tool_id = EXCLUDED.primary_tool_id,
    learning_level = EXCLUDED.learning_level,
    current_rank_code = EXCLUDED.current_rank_code,
    current_score = EXCLUDED.current_score,
    streak_days = EXCLUDED.streak_days,
    last_learning_at = NOW(),
    metadata = EXCLUDED.metadata,
    updated_at = NOW();

  INSERT INTO public.user_learning_preferences (
    id,
    user_id,
    preferred_tool_ids,
    onboarding_completed,
    primary_tool_id,
    selected_path_id,
    selection_mode,
    goal_summary,
    content_language,
    metadata,
    created_at,
    updated_at
  )
  VALUES (
    user_pref_id,
    dev_user_id,
    jsonb_build_array(tool_id),
    true,
    tool_id,
    demo_path_id,
    'preset_training',
    '完成 Cursor 入门路径，开启 AI 编程旅程。',
    'zh-CN',
    '{"seed":"demo-user"}'::jsonb,
    NOW(),
    NOW()
  )
  ON CONFLICT (user_id) DO UPDATE
  SET
    preferred_tool_ids = EXCLUDED.preferred_tool_ids,
    onboarding_completed = EXCLUDED.onboarding_completed,
    primary_tool_id = EXCLUDED.primary_tool_id,
    selected_path_id = EXCLUDED.selected_path_id,
    selection_mode = EXCLUDED.selection_mode,
    goal_summary = EXCLUDED.goal_summary,
    updated_at = NOW();

  INSERT INTO public.user_learning_paths (
    id,
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
    user_path_id,
    dev_user_id,
    demo_path_id,
    tool_id,
    'cursor-quickstart',
    'Cursor 零基础起步营',
    '从第一次 AI 对话到第一个迷你项目，建立完整的入门路径。',
    'beginner',
    'preset_training',
    'active',
    6,
    0,
    NOW() - INTERVAL '10 days',
    NOW(),
    '{"seed":"demo-user"}'::jsonb,
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE
  SET
    tool_id = EXCLUDED.tool_id,
    path_code_snapshot = EXCLUDED.path_code_snapshot,
    path_name_snapshot = EXCLUDED.path_name_snapshot,
    path_summary_snapshot = EXCLUDED.path_summary_snapshot,
    learning_level = EXCLUDED.learning_level,
    selection_mode = EXCLUDED.selection_mode,
    status = EXCLUDED.status,
    started_at = EXCLUDED.started_at,
    last_activity_at = NOW(),
    metadata = EXCLUDED.metadata,
    updated_at = NOW();

  INSERT INTO public.user_tasks (
    user_id,
    user_learning_path_id,
    path_step_id,
    status,
    started_at,
    completed_at,
    attempt_count,
    score_awarded,
    metadata,
    created_at,
    updated_at
  )
  SELECT
    dev_user_id,
    user_path_id,
    lp.step_id,
    CASE
      WHEN lp.step_no <= 2 THEN 'completed'
      WHEN lp.step_no = 3 THEN 'in_progress'
      ELSE 'not_started'
    END::public.task_status,
    CASE
      WHEN lp.step_no <= 2 THEN NOW() - (8 - lp.step_no) * INTERVAL '1 day'
      WHEN lp.step_no = 3 THEN NOW() - INTERVAL '1 day'
      ELSE NULL
    END,
    CASE
      WHEN lp.step_no <= 2 THEN NOW() - (7 - lp.step_no) * INTERVAL '1 day'
      ELSE NULL
    END,
    CASE
      WHEN lp.step_no <= 2 THEN 1
      WHEN lp.step_no = 3 THEN 2
      ELSE 0
    END,
    CASE
      WHEN lp.step_no <= 2 THEN lp.reward_score
      ELSE 0
    END,
    '{}'::jsonb,
    NOW(),
    NOW()
  FROM (
    SELECT
      id AS step_id,
      step_no,
      reward_score
    FROM public.path_steps
    AS ps
    WHERE ps.path_id = demo_path_id
  ) AS lp
  ON CONFLICT (user_learning_path_id, path_step_id) DO UPDATE
  SET
    status = EXCLUDED.status,
    started_at = EXCLUDED.started_at,
    completed_at = EXCLUDED.completed_at,
    attempt_count = EXCLUDED.attempt_count,
    score_awarded = EXCLUDED.score_awarded,
    updated_at = NOW();

  SELECT id INTO current_task_uuid
  FROM public.user_tasks
  WHERE user_learning_path_id = user_path_id AND status = 'in_progress'
  LIMIT 1;

  UPDATE public.user_learning_paths
  SET
    current_task_id = current_task_uuid,
    completed_steps = (
      SELECT COUNT(*)
      FROM public.user_tasks ut
      WHERE ut.user_learning_path_id = user_path_id AND ut.status = 'completed'
    ),
    last_activity_at = NOW()
  WHERE id = user_path_id;

  UPDATE public.user_profiles
  SET
    last_active_task_id = current_task_uuid,
    updated_at = NOW()
  WHERE user_id = dev_user_id;
END;
$$;

COMMIT;
