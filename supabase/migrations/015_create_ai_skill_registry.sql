BEGIN;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type
    WHERE typnamespace = 'public'::regnamespace
      AND typname = 'skill_source_type'
  ) THEN
    CREATE TYPE public.skill_source_type AS ENUM (
      'built_in',
      'imported',
      'custom'
    );
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type
    WHERE typnamespace = 'public'::regnamespace
      AND typname = 'skill_trust_level'
  ) THEN
    CREATE TYPE public.skill_trust_level AS ENUM (
      'internal_verified',
      'reviewed_external',
      'untrusted'
    );
  END IF;
END
$$;

CREATE TABLE IF NOT EXISTS public.skill_packs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(64) NOT NULL UNIQUE,
  name VARCHAR(128) NOT NULL,
  version VARCHAR(32) NOT NULL,
  source_type public.skill_source_type NOT NULL,
  trust_level public.skill_trust_level NOT NULL,
  root_path TEXT NOT NULL,
  manifest_path TEXT NOT NULL,
  entry_resource_path TEXT,
  scripts_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_skill_packs_scripts_trust
    CHECK (NOT (scripts_enabled = TRUE AND trust_level = 'untrusted'))
);

CREATE UNIQUE INDEX IF NOT EXISTS uidx_skill_packs_code
ON public.skill_packs(code);

CREATE INDEX IF NOT EXISTS idx_skill_packs_active_trust_level
ON public.skill_packs(is_active, trust_level);

DROP TRIGGER IF EXISTS tg_skill_packs_updated_at ON public.skill_packs;
CREATE TRIGGER tg_skill_packs_updated_at
BEFORE UPDATE ON public.skill_packs
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TABLE IF NOT EXISTS public.agent_skill_bindings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_code VARCHAR(64) NOT NULL REFERENCES public.agent_templates(code) ON UPDATE CASCADE ON DELETE CASCADE,
  skill_code VARCHAR(64) NOT NULL REFERENCES public.skill_packs(code) ON UPDATE CASCADE ON DELETE CASCADE,
  priority INTEGER NOT NULL DEFAULT 100,
  is_required BOOLEAN NOT NULL DEFAULT TRUE,
  context_budget_tokens INTEGER,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_agent_skill_bindings_agent_skill UNIQUE(agent_code, skill_code)
);

CREATE INDEX IF NOT EXISTS idx_agent_skill_bindings_agent_priority
ON public.agent_skill_bindings(agent_code, priority);

DROP TRIGGER IF EXISTS tg_agent_skill_bindings_updated_at ON public.agent_skill_bindings;
CREATE TRIGGER tg_agent_skill_bindings_updated_at
BEFORE UPDATE ON public.agent_skill_bindings
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

COMMIT;
