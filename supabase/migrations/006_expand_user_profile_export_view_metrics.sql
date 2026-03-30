BEGIN;

DROP VIEW IF EXISTS public.user_profile_export_view;

CREATE VIEW public.user_profile_export_view AS
SELECT
  up.user_id,
  up.nickname,
  up.avatar_url,
  up.wechat,
  up.contact_email,
  up.bio,
  up.signup_provider,
  up.last_login_provider,
  up.last_login_at,
  auth_user.phone AS auth_phone,
  auth_user.email AS auth_email,
  prefs.onboarding_completed,
  prefs.content_language,
  primary_tool.code AS primary_tool_code,
  primary_tool.name AS primary_tool_name,
  active_path.status AS active_path_status,
  active_path.selection_mode AS active_path_selection_mode,
  active_path.learning_level AS active_path_learning_level,
  active_path.path_code_snapshot AS active_path_code,
  active_path.path_name_snapshot AS active_path_name,
  active_path.started_at AS active_path_started_at,
  active_path.last_activity_at AS active_path_last_activity_at,
  active_path.total_steps AS active_path_total_steps,
  active_path.completed_steps AS active_path_completed_steps,
  CASE
    WHEN COALESCE(active_path.total_steps, 0) > 0
      THEN ROUND((active_path.completed_steps::numeric / active_path.total_steps::numeric) * 100, 0)::integer
    ELSE 0
  END AS active_path_completion_percent,
  COALESCE(active_path_task_stats.completed_task_count, 0) AS active_path_completed_task_count,
  COALESCE(active_path_task_stats.in_progress_task_count, 0) AS active_path_in_progress_task_count,
  COALESCE(active_path_task_stats.pending_task_count, 0) AS active_path_pending_task_count,
  COALESCE(active_path_task_stats.blocked_task_count, 0) AS active_path_blocked_task_count,
  COALESCE(total_task_stats.completed_task_count, 0) AS completed_task_count_total,
  COALESCE(total_task_stats.in_progress_task_count, 0) AS in_progress_task_count_total,
  COALESCE(total_task_stats.pending_task_count, 0) AS pending_task_count_total,
  COALESCE(total_task_stats.blocked_task_count, 0) AS blocked_task_count_total,
  up.current_score,
  up.current_rank_code,
  up.streak_days,
  up.last_learning_at,
  up.created_at AS profile_created_at,
  up.updated_at AS profile_updated_at
FROM public.user_profiles AS up
LEFT JOIN auth.users AS auth_user
  ON auth_user.id = up.user_id
LEFT JOIN public.user_learning_preferences AS prefs
  ON prefs.user_id = up.user_id
LEFT JOIN public.learning_tools AS primary_tool
  ON primary_tool.id = up.primary_tool_id
LEFT JOIN LATERAL (
  SELECT
    path.id,
    path.status,
    path.selection_mode,
    path.learning_level,
    path.path_code_snapshot,
    path.path_name_snapshot,
    path.started_at,
    path.last_activity_at,
    path.total_steps,
    path.completed_steps
  FROM public.user_learning_paths AS path
  WHERE path.user_id = up.user_id
    AND path.status = 'active'
  ORDER BY path.updated_at DESC
  LIMIT 1
) AS active_path
  ON TRUE
LEFT JOIN LATERAL (
  SELECT
    COUNT(*) FILTER (WHERE task.status = 'completed')::integer AS completed_task_count,
    COUNT(*) FILTER (WHERE task.status = 'in_progress')::integer AS in_progress_task_count,
    COUNT(*) FILTER (WHERE task.status = 'not_started')::integer AS pending_task_count,
    COUNT(*) FILTER (WHERE task.status = 'blocked')::integer AS blocked_task_count
  FROM public.user_tasks AS task
  WHERE task.user_learning_path_id = active_path.id
) AS active_path_task_stats
  ON TRUE
LEFT JOIN LATERAL (
  SELECT
    COUNT(*) FILTER (WHERE task.status = 'completed')::integer AS completed_task_count,
    COUNT(*) FILTER (WHERE task.status = 'in_progress')::integer AS in_progress_task_count,
    COUNT(*) FILTER (WHERE task.status = 'not_started')::integer AS pending_task_count,
    COUNT(*) FILTER (WHERE task.status = 'blocked')::integer AS blocked_task_count
  FROM public.user_tasks AS task
  WHERE task.user_id = up.user_id
) AS total_task_stats
  ON TRUE;

COMMENT ON VIEW public.user_profile_export_view IS
'运营导出视图：聚合用户资料、账号、引导状态、当前 active path 与任务统计，方便 Table Editor / CSV 导出。';

COMMIT;
