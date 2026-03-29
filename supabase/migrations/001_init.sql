BEGIN;

-- Enable helpers for UUID generation and JSON manipulation.
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Helper to maintain updated_at timestamps.
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Enumerations referenced by the MVP tables.
CREATE TYPE public.learning_level AS ENUM ('beginner', 'intermediate', 'advanced');
CREATE TYPE public.task_status AS ENUM ('not_started', 'in_progress', 'blocked', 'completed', 'archived');
CREATE TYPE public.rank_code AS ENUM ('rookie', 'apprentice', 'vibe_coder', 'builder', 'master');
CREATE TYPE public.path_selection_mode AS ENUM ('self_directed', 'preset_training');
CREATE TYPE public.user_learning_path_status AS ENUM ('active', 'completed', 'abandoned', 'archived');

-- learning_tools dictionary table.
CREATE TABLE public.learning_tools (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(64) NOT NULL UNIQUE,
  name VARCHAR(64) NOT NULL,
  tool_type VARCHAR(32) NOT NULL,
  difficulty_level learning_level NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_learning_tools_tool_type_sort_order ON public.learning_tools(tool_type, sort_order);

-- learning_paths template table.
CREATE TABLE public.learning_paths (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tool_id UUID NOT NULL REFERENCES public.learning_tools(id),
  code VARCHAR(64) NOT NULL UNIQUE,
  name VARCHAR(128) NOT NULL,
  target_level learning_level NOT NULL,
  source_type VARCHAR(32) NOT NULL DEFAULT 'preset_training',
  version INTEGER NOT NULL DEFAULT 1,
  is_default BOOLEAN NOT NULL DEFAULT FALSE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  agent_code VARCHAR(64),
  stage_count INTEGER NOT NULL DEFAULT 1,
  description TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_learning_paths_tool_level ON public.learning_paths(tool_id, target_level);
CREATE INDEX idx_learning_paths_code ON public.learning_paths(code);

-- path_steps for each template.
CREATE TABLE public.path_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  path_id UUID NOT NULL REFERENCES public.learning_paths(id) ON DELETE CASCADE,
  step_no INTEGER NOT NULL,
  title VARCHAR(128) NOT NULL,
  summary TEXT NOT NULL,
  focus TEXT,
  goal TEXT NOT NULL,
  completion_criteria TEXT,
  review_summary TEXT,
  estimated_minutes INTEGER,
  reward_score INTEGER NOT NULL DEFAULT 0,
  knowledge_points JSONB NOT NULL DEFAULT '[]'::jsonb,
  key_points JSONB NOT NULL DEFAULT '[]'::jsonb,
  pitfalls JSONB NOT NULL DEFAULT '[]'::jsonb,
  difficulty_weight INTEGER NOT NULL DEFAULT 1,
  is_required BOOLEAN NOT NULL DEFAULT TRUE,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE public.path_steps ADD CONSTRAINT uq_path_steps_path_no UNIQUE(path_id, step_no);
CREATE INDEX idx_path_steps_path_id_step_no ON public.path_steps(path_id, step_no);

-- user_profiles table stores user state snapshots.
CREATE TABLE public.user_profiles (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id),
  nickname VARCHAR(64),
  avatar_url TEXT,
  primary_tool_id UUID REFERENCES public.learning_tools(id),
  learning_level learning_level NOT NULL,
  current_rank_code rank_code NOT NULL,
  current_score INTEGER NOT NULL DEFAULT 0,
  streak_days INTEGER NOT NULL DEFAULT 0,
  last_learning_at TIMESTAMPTZ,
  last_active_task_id UUID,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_user_profiles_primary_tool_id ON public.user_profiles(primary_tool_id);
CREATE INDEX idx_user_profiles_learning_level ON public.user_profiles(learning_level);

-- user_learning_preferences keeps onboarding choices.
CREATE TABLE public.user_learning_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id),
  preferred_tool_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
  onboarding_completed BOOLEAN NOT NULL DEFAULT FALSE,
  primary_tool_id UUID REFERENCES public.learning_tools(id),
  selected_path_id UUID REFERENCES public.learning_paths(id),
  selection_mode path_selection_mode,
  goal_summary TEXT,
  content_language VARCHAR(16) NOT NULL DEFAULT 'zh-CN',
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- user_learning_paths drives /learn, /map, /history.
CREATE TABLE public.user_learning_paths (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  template_path_id UUID REFERENCES public.learning_paths(id),
  tool_id UUID NOT NULL REFERENCES public.learning_tools(id),
  path_code_snapshot VARCHAR(64) NOT NULL,
  path_name_snapshot VARCHAR(128) NOT NULL,
  path_summary_snapshot TEXT,
  learning_level learning_level NOT NULL,
  selection_mode path_selection_mode NOT NULL,
  status user_learning_path_status NOT NULL DEFAULT 'active',
  total_steps INTEGER NOT NULL DEFAULT 0,
  completed_steps INTEGER NOT NULL DEFAULT 0,
  current_task_id UUID,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_activity_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  abandoned_at TIMESTAMPTZ,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_user_learning_paths_user_status_updated_at ON public.user_learning_paths(user_id, status, updated_at DESC);
CREATE INDEX idx_user_learning_paths_user_tool_id ON public.user_learning_paths(user_id, tool_id);
CREATE INDEX idx_user_learning_paths_template_path_id ON public.user_learning_paths(template_path_id);

-- user_tasks per step instance.
CREATE TABLE public.user_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  user_learning_path_id UUID NOT NULL REFERENCES public.user_learning_paths(id) ON DELETE CASCADE,
  path_step_id UUID NOT NULL REFERENCES public.path_steps(id),
  status task_status NOT NULL DEFAULT 'not_started',
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  blocked_at TIMESTAMPTZ,
  block_reason TEXT,
  attempt_count INTEGER NOT NULL DEFAULT 0,
  last_conversation_id UUID,
  score_awarded INTEGER NOT NULL DEFAULT 0,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE public.user_tasks ADD CONSTRAINT uq_user_tasks_path_step UNIQUE(user_learning_path_id, path_step_id);
CREATE INDEX idx_user_tasks_user_status ON public.user_tasks(user_id, status);
CREATE INDEX idx_user_tasks_user_learning_path_id ON public.user_tasks(user_learning_path_id);
CREATE INDEX idx_user_tasks_last_conversation_id ON public.user_tasks(last_conversation_id);

-- Circular foreign keys are attached after both sides exist.
ALTER TABLE public.user_profiles
ADD CONSTRAINT fk_user_profiles_last_active_task
FOREIGN KEY (last_active_task_id)
REFERENCES public.user_tasks(id)
ON DELETE SET NULL;

ALTER TABLE public.user_learning_paths
ADD CONSTRAINT fk_user_learning_paths_current_task
FOREIGN KEY (current_task_id)
REFERENCES public.user_tasks(id)
ON DELETE SET NULL;

-- Trigger hooks to keep updated_at honest.
CREATE TRIGGER tg_learning_tools_updated_at
BEFORE UPDATE ON public.learning_tools
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER tg_learning_paths_updated_at
BEFORE UPDATE ON public.learning_paths
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER tg_path_steps_updated_at
BEFORE UPDATE ON public.path_steps
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER tg_user_profiles_updated_at
BEFORE UPDATE ON public.user_profiles
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER tg_user_learning_preferences_updated_at
BEFORE UPDATE ON public.user_learning_preferences
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER tg_user_learning_paths_updated_at
BEFORE UPDATE ON public.user_learning_paths
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER tg_user_tasks_updated_at
BEFORE UPDATE ON public.user_tasks
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

COMMIT;
