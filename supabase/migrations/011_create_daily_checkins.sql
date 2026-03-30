BEGIN;

CREATE TABLE IF NOT EXISTS public.daily_checkins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  checkin_date DATE NOT NULL,
  score_awarded INTEGER NOT NULL DEFAULT 0,
  idempotency_key VARCHAR(128) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.daily_checkins
DROP CONSTRAINT IF EXISTS uq_daily_checkins_user_date;

ALTER TABLE public.daily_checkins
ADD CONSTRAINT uq_daily_checkins_user_date UNIQUE (user_id, checkin_date);

CREATE UNIQUE INDEX IF NOT EXISTS uidx_daily_checkins_idempotency_key
ON public.daily_checkins(idempotency_key);

CREATE INDEX IF NOT EXISTS idx_daily_checkins_user_date
ON public.daily_checkins(user_id, checkin_date DESC);

COMMIT;
