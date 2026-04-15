BEGIN;

ALTER TABLE public.ai_models
  ADD COLUMN IF NOT EXISTS model_family VARCHAR(32),
  ADD COLUMN IF NOT EXISTS runtime_capabilities TEXT[] NOT NULL DEFAULT ARRAY[]::text[],
  ADD COLUMN IF NOT EXISTS connection_test_mode VARCHAR(32),
  ADD COLUMN IF NOT EXISTS reasoning_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS profile_group VARCHAR(128),
  ADD COLUMN IF NOT EXISTS notes TEXT;

UPDATE public.ai_models AS model
SET
  runtime_capabilities = COALESCE((
    SELECT ARRAY_AGG(DISTINCT capability)
    FROM (
      SELECT CASE
        WHEN lower(replace(item.value, '-', '_')) IN ('asr', 'speech_to_text') THEN 'asr'
        WHEN lower(replace(item.value, '-', '_')) = 'vision' THEN 'vision'
        WHEN lower(replace(item.value, '-', '_')) = 'quality_check' THEN 'quality_check'
        ELSE NULL
      END AS capability
      FROM jsonb_array_elements_text(COALESCE(model.metadata->'capabilities', '[]'::jsonb)) AS item(value)
    ) AS normalized
    WHERE capability IS NOT NULL
  ), ARRAY[]::text[]),
  reasoning_enabled = COALESCE((model.metadata->>'enableThinking')::boolean, FALSE),
  profile_group = NULLIF(model.metadata->>'profileGroup', ''),
  notes = NULLIF(model.metadata->>'notes', '')
WHERE
  COALESCE(array_length(model.runtime_capabilities, 1), 0) = 0
  OR model.reasoning_enabled = FALSE
  OR model.profile_group IS NULL
  OR model.notes IS NULL;

UPDATE public.ai_models AS model
SET
  model_family = CASE
    WHEN model.reasoning_enabled OR model.profile_group = 'reasoning_lab' THEN 'reasoning'
    WHEN array_position(model.runtime_capabilities, 'asr') IS NOT NULL THEN 'asr'
    WHEN array_position(model.runtime_capabilities, 'vision') IS NOT NULL THEN 'vision'
    ELSE 'chat'
  END
WHERE model.model_family IS NULL;

UPDATE public.ai_models AS model
SET
  connection_test_mode = CASE
    WHEN lower(replace(COALESCE(
      NULLIF(model.metadata->>'connectionTest', ''),
      NULLIF(model.metadata->'connectionTest'->>'mode', '')
    ), '-', '_')) IN ('audio_transcription', 'asr', 'speech_to_text') THEN 'audio_transcription'
    WHEN lower(replace(COALESCE(
      NULLIF(model.metadata->>'connectionTest', ''),
      NULLIF(model.metadata->'connectionTest'->>'mode', '')
    ), '-', '_')) IN ('chat', 'chat_completions') THEN 'chat'
    WHEN array_position(model.runtime_capabilities, 'asr') IS NOT NULL THEN 'audio_transcription'
    WHEN array_position(model.runtime_capabilities, 'quality_check') IS NOT NULL THEN 'models_list'
    WHEN model.reasoning_enabled OR model.profile_group = 'reasoning_lab' THEN 'models_list'
    ELSE 'chat'
  END
WHERE model.connection_test_mode IS NULL;

COMMIT;
