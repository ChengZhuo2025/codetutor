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
      '{"profileGroup":"balanced_default","phase":"phase1","routePolicy":"production_default"}'
    ),
    (
      'a1000000-0000-0000-0000-000000000102'::uuid,
      'glm-5',
      'GLM-5',
      'Pro/zai-org/GLM-5',
      64000,
      4096,
      0.40::numeric,
      '{"profileGroup":"longform_coach","phase":"phase1","routePolicy":"production_default"}'
    ),
    (
      'a1000000-0000-0000-0000-000000000103'::uuid,
      'deepseek-r1',
      'DeepSeek R1',
      'Pro/deepseek-ai/DeepSeek-R1',
      64000,
      4096,
      0.60::numeric,
      '{"profileGroup":"reasoning_lab","phase":"phase1","routePolicy":"manual_test_only","enableThinking":true}'
    )
) AS seed(
  id,
  code,
  display_name,
  model_name,
  max_context_tokens,
  default_max_output_tokens,
  recommended_temperature,
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
  pricing_metadata = EXCLUDED.pricing_metadata,
  is_active = EXCLUDED.is_active,
  metadata = EXCLUDED.metadata,
  updated_at = NOW();

COMMIT;
