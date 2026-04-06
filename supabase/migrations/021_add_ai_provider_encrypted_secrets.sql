BEGIN;

ALTER TABLE public.ai_providers
  ALTER COLUMN secret_ref DROP NOT NULL;

ALTER TABLE public.ai_providers
  ADD COLUMN IF NOT EXISTS secret_ciphertext TEXT,
  ADD COLUMN IF NOT EXISTS secret_iv TEXT,
  ADD COLUMN IF NOT EXISTS secret_auth_tag TEXT,
  ADD COLUMN IF NOT EXISTS secret_key_version VARCHAR(32),
  ADD COLUMN IF NOT EXISTS secret_last_updated_at TIMESTAMPTZ;

COMMENT ON COLUMN public.ai_providers.secret_ref IS
'兼容环境变量回退引用；主密钥优先存于 secret_ciphertext/secret_iv/secret_auth_tag。';

COMMENT ON COLUMN public.ai_providers.secret_ciphertext IS
'应用层 AES-256-GCM 加密后的 Provider API Key 密文（base64）。';

COMMENT ON COLUMN public.ai_providers.secret_iv IS
'Provider API Key 加密使用的随机 IV（base64）。';

COMMENT ON COLUMN public.ai_providers.secret_auth_tag IS
'Provider API Key AES-256-GCM 认证标签（base64）。';

COMMENT ON COLUMN public.ai_providers.secret_key_version IS
'Provider API Key 加密主密钥版本号。';

COMMENT ON COLUMN public.ai_providers.secret_last_updated_at IS
'最近一次更新 Provider API Key 的时间。';

COMMIT;
