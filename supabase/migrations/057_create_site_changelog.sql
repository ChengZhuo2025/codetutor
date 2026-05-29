BEGIN;

CREATE EXTENSION IF NOT EXISTS pg_trgm WITH SCHEMA extensions;

CREATE TABLE IF NOT EXISTS public.site_changelog_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  log_date DATE NOT NULL,
  title VARCHAR(160) NOT NULL,
  summary_markdown TEXT NOT NULL,
  status VARCHAR(24) NOT NULL DEFAULT 'draft',
  commit_from_sha VARCHAR(64),
  commit_to_sha VARCHAR(64),
  commit_count INTEGER NOT NULL DEFAULT 0,
  source_commits_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  generated_by_agent_code VARCHAR(64),
  provider_code_snapshot VARCHAR(64),
  model_code_snapshot VARCHAR(128),
  llm_invocation_id UUID REFERENCES public.llm_invocations(id) ON DELETE SET NULL,
  generation_error TEXT,
  published_at TIMESTAMPTZ,
  archived_at TIMESTAMPTZ,
  updated_by_admin_id UUID REFERENCES public.admin_accounts(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT site_changelog_entries_status_check
    CHECK (status IN ('draft', 'published', 'archived')),
  CONSTRAINT site_changelog_entries_publish_check
    CHECK (
      (status = 'published' AND published_at IS NOT NULL)
      OR (status <> 'published')
    )
);

CREATE UNIQUE INDEX IF NOT EXISTS uidx_site_changelog_entries_log_date_active
ON public.site_changelog_entries(log_date)
WHERE status IN ('draft', 'published');

CREATE INDEX IF NOT EXISTS idx_site_changelog_entries_status_date
ON public.site_changelog_entries(status, log_date DESC);

CREATE INDEX IF NOT EXISTS idx_site_changelog_entries_published_at
ON public.site_changelog_entries(published_at DESC)
WHERE status = 'published';

CREATE INDEX IF NOT EXISTS idx_site_changelog_entries_title_trgm
ON public.site_changelog_entries USING GIN (title extensions.gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_site_changelog_entries_summary_trgm
ON public.site_changelog_entries USING GIN (summary_markdown extensions.gin_trgm_ops);

DROP TRIGGER IF EXISTS site_changelog_entries_updated_at ON public.site_changelog_entries;
CREATE TRIGGER site_changelog_entries_updated_at
  BEFORE UPDATE ON public.site_changelog_entries
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

ALTER TABLE public.site_changelog_entries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can read published site changelog" ON public.site_changelog_entries;
CREATE POLICY "Public can read published site changelog" ON public.site_changelog_entries
  FOR SELECT USING (status = 'published');

DROP POLICY IF EXISTS "Active admins can read site changelog" ON public.site_changelog_entries;
CREATE POLICY "Active admins can read site changelog" ON public.site_changelog_entries
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.admin_accounts
      WHERE admin_accounts.user_id = (SELECT auth.uid())
        AND admin_accounts.status = 'active'
    )
  );

DROP POLICY IF EXISTS "Active admins can insert site changelog" ON public.site_changelog_entries;
CREATE POLICY "Active admins can insert site changelog" ON public.site_changelog_entries
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.admin_accounts
      WHERE admin_accounts.user_id = (SELECT auth.uid())
        AND admin_accounts.status = 'active'
    )
  );

DROP POLICY IF EXISTS "Active admins can update site changelog" ON public.site_changelog_entries;
CREATE POLICY "Active admins can update site changelog" ON public.site_changelog_entries
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.admin_accounts
      WHERE admin_accounts.user_id = (SELECT auth.uid())
        AND admin_accounts.status = 'active'
    )
  );

COMMIT;
