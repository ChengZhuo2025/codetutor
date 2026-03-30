SELECT
  au.id AS auth_user_id,
  au.phone,
  ulp.onboarding_completed,
  ulp.selection_mode,
  ulp.selected_path_id,
  ulp.updated_at AS preference_updated_at,
  up.nickname,
  up.learning_level,
  ulpath.id AS user_learning_path_id,
  ulpath.status AS path_status,
  ulpath.path_name_snapshot,
  ulpath.started_at,
  ulpath.updated_at AS path_updated_at
FROM auth.users AS au
LEFT JOIN public.user_learning_preferences AS ulp
  ON ulp.user_id = au.id
LEFT JOIN public.user_profiles AS up
  ON up.user_id = au.id
LEFT JOIN public.user_learning_paths AS ulpath
  ON ulpath.user_id = au.id
WHERE au.phone = '8618600165902'
ORDER BY ulpath.updated_at DESC NULLS LAST;
