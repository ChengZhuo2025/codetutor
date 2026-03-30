BEGIN;

CREATE OR REPLACE VIEW public.user_profile_export_view AS
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
    path.status,
    path.selection_mode,
    path.learning_level,
    path.path_code_snapshot,
    path.path_name_snapshot,
    path.started_at,
    path.last_activity_at
  FROM public.user_learning_paths AS path
  WHERE path.user_id = up.user_id
    AND path.status = 'active'
  ORDER BY path.updated_at DESC
  LIMIT 1
) AS active_path
  ON TRUE;

COMMENT ON VIEW public.user_profile_export_view IS
'运营导出视图：聚合 user_profiles、auth.users、user_learning_preferences 与当前 active path，方便 Table Editor / CSV 导出。';

COMMIT;
