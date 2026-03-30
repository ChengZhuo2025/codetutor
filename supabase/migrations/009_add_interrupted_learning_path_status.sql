BEGIN;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_enum
    WHERE enumtypid = 'public.user_learning_path_status'::regtype
      AND enumlabel = 'interrupted'
  ) THEN
    ALTER TYPE public.user_learning_path_status ADD VALUE 'interrupted';
  END IF;
END
$$;

ALTER TABLE public.user_learning_paths
ADD COLUMN IF NOT EXISTS interrupted_at TIMESTAMPTZ;

COMMENT ON COLUMN public.user_learning_paths.interrupted_at IS
'系统自动判定学习计划已中断的时间点。默认按连续 7 天未继续学习计算。';

COMMIT;
