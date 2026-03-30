BEGIN;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type
    WHERE typnamespace = 'public'::regnamespace
      AND typname = 'agent_scenario_type'
  ) THEN
    CREATE TYPE public.agent_scenario_type AS ENUM (
      'teaching',
      'blocked_help',
      'task_review',
      'completion_feedback',
      'path_guidance'
    );
  END IF;
END
$$;

CREATE TABLE IF NOT EXISTS public.agent_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(64) NOT NULL UNIQUE,
  name VARCHAR(128) NOT NULL,
  scenario_type public.agent_scenario_type NOT NULL,
  description TEXT,
  system_prompt_template TEXT NOT NULL,
  developer_prompt_template TEXT,
  default_provider_code VARCHAR(64) NOT NULL REFERENCES public.ai_providers(code) ON UPDATE CASCADE,
  default_model_code VARCHAR(64) NOT NULL REFERENCES public.ai_models(code) ON UPDATE CASCADE,
  context_message_limit INTEGER NOT NULL DEFAULT 8,
  max_output_tokens INTEGER NOT NULL DEFAULT 2048,
  temperature NUMERIC(4,2) NOT NULL DEFAULT 0.70,
  top_p NUMERIC(4,2),
  stream_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  version INTEGER NOT NULL DEFAULT 1,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS uidx_agent_templates_code
ON public.agent_templates(code);

CREATE INDEX IF NOT EXISTS idx_agent_templates_scenario_active
ON public.agent_templates(scenario_type, is_active);

DROP TRIGGER IF EXISTS tg_agent_templates_updated_at ON public.agent_templates;
CREATE TRIGGER tg_agent_templates_updated_at
BEFORE UPDATE ON public.agent_templates
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TABLE IF NOT EXISTS public.agent_bindings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_code VARCHAR(64) NOT NULL REFERENCES public.agent_templates(code) ON UPDATE CASCADE ON DELETE CASCADE,
  tool_id UUID REFERENCES public.learning_tools(id) ON DELETE SET NULL,
  learning_level public.learning_level,
  selection_mode public.path_selection_mode,
  path_id UUID REFERENCES public.learning_paths(id) ON DELETE SET NULL,
  step_no INTEGER,
  interaction_type VARCHAR(32) NOT NULL,
  priority INTEGER NOT NULL DEFAULT 100,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_agent_bindings_priority_active
ON public.agent_bindings(priority, is_active);

CREATE INDEX IF NOT EXISTS idx_agent_bindings_tool_mode_path_step
ON public.agent_bindings(tool_id, selection_mode, path_id, step_no, interaction_type);

DROP TRIGGER IF EXISTS tg_agent_bindings_updated_at ON public.agent_bindings;
CREATE TRIGGER tg_agent_bindings_updated_at
BEFORE UPDATE ON public.agent_bindings
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

COMMIT;
