BEGIN;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type
    WHERE typnamespace = 'public'::regnamespace
      AND typname = 'score_event_type'
  ) THEN
    CREATE TYPE public.score_event_type AS ENUM (
      'task_completion',
      'daily_checkin',
      'achievement_reward',
      'manual_adjustment',
      'migration_backfill'
    );
  END IF;
END
$$;

CREATE TABLE IF NOT EXISTS public.score_ledgers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  task_id UUID REFERENCES public.user_tasks(id) ON DELETE SET NULL,
  event_type public.score_event_type NOT NULL,
  score_delta INTEGER NOT NULL,
  idempotency_key VARCHAR(128) NOT NULL,
  source_ref VARCHAR(128),
  remark TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS uidx_score_ledgers_idempotency_key
ON public.score_ledgers(idempotency_key);

CREATE INDEX IF NOT EXISTS idx_score_ledgers_user_created_at
ON public.score_ledgers(user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.user_ranks (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  rank_code public.rank_code NOT NULL,
  score_snapshot INTEGER NOT NULL DEFAULT 0,
  next_rank_code public.rank_code,
  score_to_next_rank INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DROP TRIGGER IF EXISTS tg_user_ranks_updated_at ON public.user_ranks;
CREATE TRIGGER tg_user_ranks_updated_at
BEFORE UPDATE ON public.user_ranks
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

WITH task_backfill AS (
  SELECT
    ut.id AS task_id,
    ut.user_id,
    ut.user_learning_path_id,
    ut.score_awarded,
    COALESCE(ut.completed_at, ut.updated_at, ut.created_at, NOW()) AS created_at
  FROM public.user_tasks AS ut
  WHERE ut.score_awarded > 0
)
INSERT INTO public.score_ledgers (
  user_id,
  task_id,
  event_type,
  score_delta,
  idempotency_key,
  source_ref,
  remark,
  created_at
)
SELECT
  tb.user_id,
  tb.task_id,
  'migration_backfill'::public.score_event_type,
  tb.score_awarded,
  'backfill-task-score:' || tb.task_id::text,
  tb.user_learning_path_id::text,
  'Backfilled from historical user_tasks.score_awarded',
  tb.created_at
FROM task_backfill AS tb
ON CONFLICT (idempotency_key) DO NOTHING;

WITH user_score_delta AS (
  SELECT
    up.user_id,
    up.current_score,
    up.updated_at,
    up.current_score - COALESCE(SUM(sl.score_delta), 0) AS score_delta
  FROM public.user_profiles AS up
  LEFT JOIN public.score_ledgers AS sl
    ON sl.user_id = up.user_id
  GROUP BY up.user_id, up.current_score, up.updated_at
)
INSERT INTO public.score_ledgers (
  user_id,
  task_id,
  event_type,
  score_delta,
  idempotency_key,
  source_ref,
  remark,
  created_at
)
SELECT
  usd.user_id,
  NULL,
  'migration_backfill'::public.score_event_type,
  usd.score_delta,
  'backfill-profile-score:' || usd.user_id::text,
  'user_profiles.current_score',
  'Backfilled profile score delta during growth write model migration',
  usd.updated_at
FROM user_score_delta AS usd
WHERE usd.score_delta <> 0
ON CONFLICT (idempotency_key) DO NOTHING;

UPDATE public.user_profiles AS up
SET current_rank_code = CASE
  WHEN up.current_score >= 2000 THEN 'master'::public.rank_code
  WHEN up.current_score >= 1000 THEN 'builder'::public.rank_code
  WHEN up.current_score >= 500 THEN 'vibe_coder'::public.rank_code
  WHEN up.current_score >= 200 THEN 'apprentice'::public.rank_code
  ELSE 'rookie'::public.rank_code
END
WHERE up.current_rank_code IS DISTINCT FROM CASE
  WHEN up.current_score >= 2000 THEN 'master'::public.rank_code
  WHEN up.current_score >= 1000 THEN 'builder'::public.rank_code
  WHEN up.current_score >= 500 THEN 'vibe_coder'::public.rank_code
  WHEN up.current_score >= 200 THEN 'apprentice'::public.rank_code
  ELSE 'rookie'::public.rank_code
END;

INSERT INTO public.user_ranks (
  user_id,
  rank_code,
  score_snapshot,
  next_rank_code,
  score_to_next_rank,
  updated_at
)
SELECT
  up.user_id,
  up.current_rank_code,
  up.current_score,
  CASE
    WHEN up.current_score >= 2000 THEN NULL
    WHEN up.current_score >= 1000 THEN 'master'::public.rank_code
    WHEN up.current_score >= 500 THEN 'builder'::public.rank_code
    WHEN up.current_score >= 200 THEN 'vibe_coder'::public.rank_code
    ELSE 'apprentice'::public.rank_code
  END AS next_rank_code,
  CASE
    WHEN up.current_score >= 2000 THEN 0
    WHEN up.current_score >= 1000 THEN 2000 - up.current_score
    WHEN up.current_score >= 500 THEN 1000 - up.current_score
    WHEN up.current_score >= 200 THEN 500 - up.current_score
    ELSE 200 - up.current_score
  END AS score_to_next_rank,
  up.updated_at
FROM public.user_profiles AS up
ON CONFLICT (user_id) DO UPDATE
SET
  rank_code = EXCLUDED.rank_code,
  score_snapshot = EXCLUDED.score_snapshot,
  next_rank_code = EXCLUDED.next_rank_code,
  score_to_next_rank = EXCLUDED.score_to_next_rank,
  updated_at = EXCLUDED.updated_at;

COMMIT;
