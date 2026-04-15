BEGIN;

INSERT INTO public.ai_providers (
  id,
  code,
  name,
  provider_type,
  base_url,
  auth_mode,
  secret_ref,
  supports_stream,
  supports_json_mode,
  timeout_ms,
  retry_count,
  is_active,
  metadata,
  created_at,
  updated_at
)
VALUES (
  'a1000000-0000-0000-0000-000000000001'::uuid,
  'siliconflow',
  'SiliconFlow',
  'siliconflow',
  'https://api.siliconflow.cn/v1',
  'bearer',
  'SILICONFLOW_API_KEY',
  true,
  false,
  60000,
  1,
  true,
  '{
    "consoleUrl":"https://cloud.siliconflow.cn/models",
    "apiStyle":"openai-compatible",
    "phase":"phase1"
  }'::jsonb,
  NOW(),
  NOW()
)
ON CONFLICT (code) DO UPDATE
SET
  name = EXCLUDED.name,
  provider_type = EXCLUDED.provider_type,
  base_url = EXCLUDED.base_url,
  auth_mode = EXCLUDED.auth_mode,
  secret_ref = EXCLUDED.secret_ref,
  supports_stream = EXCLUDED.supports_stream,
  supports_json_mode = EXCLUDED.supports_json_mode,
  timeout_ms = EXCLUDED.timeout_ms,
  retry_count = EXCLUDED.retry_count,
  is_active = EXCLUDED.is_active,
  metadata = EXCLUDED.metadata,
  updated_at = NOW();

INSERT INTO public.ai_models (
  id,
  provider_id,
  code,
  display_name,
  model_name,
  supports_stream,
  supports_json_mode,
  supports_tool_calling,
  max_context_tokens,
  default_max_output_tokens,
  recommended_temperature,
  model_family,
  runtime_capabilities,
  connection_test_mode,
  reasoning_enabled,
  profile_group,
  notes,
  pricing_metadata,
  is_active,
  metadata,
  created_at,
  updated_at
)
SELECT
  seed.id,
  provider.id,
  seed.code,
  seed.display_name,
  seed.model_name,
  true,
  false,
  false,
  seed.max_context_tokens,
  seed.default_max_output_tokens,
  seed.recommended_temperature,
  seed.model_family,
  seed.runtime_capabilities,
  seed.connection_test_mode,
  seed.reasoning_enabled,
  seed.profile_group,
  seed.notes,
  '{}'::jsonb,
  true,
  seed.metadata::jsonb,
  NOW(),
  NOW()
FROM public.ai_providers AS provider
JOIN (
  VALUES
    (
      'a1000000-0000-0000-0000-000000000101'::uuid,
      'deepseek-v3-2',
      'DeepSeek V3.2',
      'Pro/deepseek-ai/DeepSeek-V3.2',
      64000,
      4096,
      0.30::numeric,
      'chat',
      ARRAY[]::text[],
      'chat',
      false,
      'balanced_default',
      '默认主聊天模型',
      '{"phase":"phase1","routePolicy":"production_default"}'
    ),
    (
      'a1000000-0000-0000-0000-000000000102'::uuid,
      'glm-5',
      'GLM-5',
      'Pro/zai-org/GLM-5',
      64000,
      4096,
      0.40::numeric,
      'chat',
      ARRAY[]::text[],
      'chat',
      false,
      'longform_coach',
      '长文生成与讲解备用模型',
      '{"phase":"phase1","routePolicy":"production_default"}'
    ),
    (
      'a1000000-0000-0000-0000-000000000103'::uuid,
      'deepseek-r1',
      'DeepSeek R1',
      'Pro/deepseek-ai/DeepSeek-R1',
      64000,
      4096,
      0.60::numeric,
      'reasoning',
      ARRAY[]::text[],
      'models_list',
      true,
      'reasoning_lab',
      '复杂推理与人工调试验证模型',
      '{"phase":"phase1","routePolicy":"manual_test_only"}'
    )
) AS seed(
  id,
  code,
  display_name,
  model_name,
  max_context_tokens,
  default_max_output_tokens,
  recommended_temperature,
  model_family,
  runtime_capabilities,
  connection_test_mode,
  reasoning_enabled,
  profile_group,
  notes,
  metadata
)
  ON provider.code = 'siliconflow'
ON CONFLICT (code) DO UPDATE
SET
  provider_id = EXCLUDED.provider_id,
  display_name = EXCLUDED.display_name,
  model_name = EXCLUDED.model_name,
  supports_stream = EXCLUDED.supports_stream,
  supports_json_mode = EXCLUDED.supports_json_mode,
  supports_tool_calling = EXCLUDED.supports_tool_calling,
  max_context_tokens = EXCLUDED.max_context_tokens,
  default_max_output_tokens = EXCLUDED.default_max_output_tokens,
  recommended_temperature = EXCLUDED.recommended_temperature,
  model_family = EXCLUDED.model_family,
  runtime_capabilities = EXCLUDED.runtime_capabilities,
  connection_test_mode = EXCLUDED.connection_test_mode,
  reasoning_enabled = EXCLUDED.reasoning_enabled,
  profile_group = EXCLUDED.profile_group,
  notes = EXCLUDED.notes,
  pricing_metadata = EXCLUDED.pricing_metadata,
  is_active = EXCLUDED.is_active,
  metadata = EXCLUDED.metadata,
  updated_at = NOW();

COMMIT;
