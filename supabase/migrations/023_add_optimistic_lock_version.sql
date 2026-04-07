BEGIN;

-- 为 ai_providers 添加 version 字段用于乐观锁
ALTER TABLE public.ai_providers
  ADD COLUMN IF NOT EXISTS version INTEGER NOT NULL DEFAULT 1;

COMMENT ON COLUMN public.ai_providers.version IS
'乐观锁版本号，每次更新时递增。更新时需携带当前版本号，版本不匹配则拒绝更新。';

-- 为 ai_models 添加 version 字段用于乐观锁
ALTER TABLE public.ai_models
  ADD COLUMN IF NOT EXISTS version INTEGER NOT NULL DEFAULT 1;

COMMENT ON COLUMN public.ai_models.version IS
'乐观锁版本号，每次更新时递增。更新时需携带当前版本号，版本不匹配则拒绝更新。';

-- agent_templates 表已有 version 字段，确保默认值为 1
ALTER TABLE public.agent_templates
  ALTER COLUMN version SET DEFAULT 1,
  ALTER COLUMN version SET NOT NULL;

COMMENT ON COLUMN public.agent_templates.version IS
'乐观锁版本号，每次更新时递增。更新时需携带当前版本号，版本不匹配则拒绝更新。';

-- 创建自动递增 version 的触发器函数
CREATE OR REPLACE FUNCTION public.tg_increment_version()
RETURNS TRIGGER AS $$
BEGIN
  -- 仅在有实质性字段变化时递增 version
  -- 注意：updated_at 已由其他触发器管理，这里只管 version
  IF TG_OP = 'UPDATE' THEN
    NEW.version = OLD.version + 1;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 为三个表创建触发器
DROP TRIGGER IF EXISTS tg_ai_providers_version_increment ON public.ai_providers;
CREATE TRIGGER tg_ai_providers_version_increment
BEFORE UPDATE ON public.ai_providers
FOR EACH ROW
EXECUTE FUNCTION public.tg_increment_version();

DROP TRIGGER IF EXISTS tg_ai_models_version_increment ON public.ai_models;
CREATE TRIGGER tg_ai_models_version_increment
BEFORE UPDATE ON public.ai_models
FOR EACH ROW
EXECUTE FUNCTION public.tg_increment_version();

DROP TRIGGER IF EXISTS tg_agent_templates_version_increment ON public.agent_templates;
CREATE TRIGGER tg_agent_templates_version_increment
BEFORE UPDATE ON public.agent_templates
FOR EACH ROW
EXECUTE FUNCTION public.tg_increment_version();

COMMIT;
