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
      'path_guidance',
      'concept_qa'
    );
  END IF;
END
$$;

ALTER TYPE public.agent_scenario_type ADD VALUE IF NOT EXISTS 'concept_qa';

COMMIT;
