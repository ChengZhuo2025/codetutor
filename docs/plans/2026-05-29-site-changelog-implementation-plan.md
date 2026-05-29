# Site Changelog Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build an admin-reviewed site changelog system that generates draft release notes from local Git commits using the configured DeepSeek V4 Pro model, then publishes approved Markdown logs to a public user-facing page.

**Architecture:** Add a `site-changelog` backend module with request validation, route handlers, Supabase service functions, local Git source parsing, and AI draft generation through the existing `invokeAIProvider` path. Add an admin page under `/admin/site/changelog`, a public `/changelog` page, and OpenAPI / persistent docs updates.

**Tech Stack:** Next.js App Router, React 19, TypeScript, Supabase, existing admin BFF helpers, existing AI provider gateway, existing `Textarea variant="code"` and `MarkdownContent`.

---

## Implementation Notes

- Do not commit unless the user explicitly requests it.
- Follow TDD where behavior is non-trivial: validation, route handling, Git parsing, status transitions, and public/private response separation.
- Use `pnpm` commands.
- Keep Markdown editing/rendering on existing components and methods.
- Keep first implementation synchronous and admin-triggered. Do not add cron, queue, Redis, GitHub API, or auto-publish.

## Task 1: Request Contracts And Validation

**Files:**

- Modify: `lib/api/contracts/admin-site.ts`
- Modify: `server/lib/request-validation.ts`
- Test: `scripts/check-api-request-validation.ts` or new `scripts/check-site-changelog-validation.ts`
- Modify: `package.json`

**Step 1: Write failing validation tests**

Add tests for:

- valid ISO date `YYYY-MM-DD`
- invalid date strings
- changelog status values: `draft`, `published`, `archived`
- changelog entry UUID params
- generate request with `{ logDate, regenerate?: boolean }`
- patch request requiring at least one editable field

Run:

```bash
pnpm test:site-changelog-validation
```

Expected: fails because parser functions do not exist.

**Step 2: Add API contract types**

Add types:

```ts
export type SiteChangelogStatus = "draft" | "published" | "archived"

export type AdminSiteChangelogEntry = {
  id: string
  logDate: string
  title: string
  summaryMarkdown: string
  status: SiteChangelogStatus
  commitFromSha: string | null
  commitToSha: string | null
  commitCount: number
  sourceCommits: SiteChangelogCommit[]
  generatedByAgentCode: string | null
  providerCodeSnapshot: string | null
  modelCodeSnapshot: string | null
  llmInvocationId: string | null
  generationError: string | null
  publishedAt: string | null
  archivedAt: string | null
  updatedAt: string | null
  updatedByAdminId: string | null
}

export type PublicSiteChangelogEntry = Pick<
  AdminSiteChangelogEntry,
  "id" | "logDate" | "title" | "summaryMarkdown" | "publishedAt"
>
```

Add list/detail/generate/update request/response types.

**Step 3: Implement validation parsers**

Add functions:

```ts
parseSiteChangelogEntryId(value)
parseAdminSiteChangelogListQuery(input)
parseAdminSiteChangelogGenerateBody(input)
parseAdminSiteChangelogUpdateBody(input)
parsePublicSiteChangelogListQuery(input)
```

Use existing validation helper style.

**Step 4: Run validation tests**

Run:

```bash
pnpm test:site-changelog-validation
```

Expected: pass.

## Task 2: Database Migration

**Files:**

- Create: `supabase/migrations/057_create_site_changelog.sql`
- Modify: `supabase/migrations/README.md`
- Test: lightweight SQL text assertion in `scripts/check-site-changelog-schema.mjs`
- Modify: `package.json`

**Step 1: Write failing schema assertion**

Assert migration contains:

- `site_changelog_entries`
- `status IN ('draft', 'published', 'archived')`
- `source_commits_json`
- `llm_invocation_id`
- active unique index on `log_date`
- updated_at trigger
- RLS enabled

Run:

```bash
pnpm test:site-changelog-schema
```

Expected: fails because migration does not exist.

**Step 2: Add migration**

Create table from the design doc. Include:

- `updated_by_admin_id` FK to `admin_accounts`
- `llm_invocation_id` FK to `llm_invocations`
- `updated_at` trigger using `public.update_updated_at()`
- RLS policies:
  - public can select only published rows
  - active admins can select/insert/update all changelog rows

**Step 3: Run schema assertion**

Run:

```bash
pnpm test:site-changelog-schema
```

Expected: pass.

## Task 3: Agent Seed

**Files:**

- Create: `supabase/seeds/009_site_changelog_writer_agent.sql`
- Modify: `supabase/seeds/README.md`
- Test: `scripts/check-site-changelog-agent-seed.mjs`

**Step 1: Write failing seed assertion**

Assert seed includes:

- `site-changelog-writer`
- `deepseek-v4-pro`
- prompt rules for no internal hash / branch / email exposure
- JSON output contract

Run:

```bash
pnpm test:site-changelog-agent-seed
```

Expected: fails because seed does not exist.

**Step 2: Add seed**

Insert or update `agent_templates` with:

```text
code = site-changelog-writer
name = 更新日志撰写 Agent
scenario_type = concept_qa or a new compatible existing admin scenario if available
default_model_code = deepseek-v4-pro
default_provider_code = siliconflow
stream_enabled = false
```

If enum expansion is required for scenario type, move it to the migration and use `site_changelog`. Prefer avoiding enum expansion if current schema already has a suitable non-user-facing scenario.

**Step 3: Run seed assertion**

Run:

```bash
pnpm test:site-changelog-agent-seed
```

Expected: pass.

## Task 4: Git Source Parser

**Files:**

- Create: `server/modules/site-changelog/git-source.ts`
- Test: `scripts/check-site-changelog-git-source.ts`
- Modify: `package.json`

**Step 1: Write failing parser tests**

Cover:

- parsing structured git log output
- excluding empty subjects
- returning `commitFromSha`, `commitToSha`, `commitCount`
- mapping no commits to `NO_COMMITS_FOUND`
- mapping git command failure to `GIT_SOURCE_UNAVAILABLE`

Run:

```bash
pnpm test:site-changelog-git-source
```

Expected: fails because module does not exist.

**Step 2: Implement parser and command wrapper**

Use `node:child_process` or `node:child_process/promises` style already present in repo if any. Avoid shell string interpolation; pass args array to git.

Suggested format delimiter:

```text
%H%x1f%h%x1f%an%x1f%ae%x1f%cI%x1f%s%x1f%b%x1e
```

**Step 3: Run parser tests**

Run:

```bash
pnpm test:site-changelog-git-source
```

Expected: pass.

## Task 5: Service Layer

**Files:**

- Create: `server/modules/site-changelog/service.ts`
- Test: `scripts/check-site-changelog-service.ts`
- Modify: `package.json`

**Step 1: Write failing service tests**

Use dependency injection or small pure helpers where practical. Cover:

- admin list maps DB rows to admin response
- public list excludes drafts/archived and internal fields
- publish transition sets `published_at`
- archive transition sets `archived_at`
- generate refuses existing published entry
- generate can replace draft only with `regenerate: true`

Run:

```bash
pnpm test:site-changelog-service
```

Expected: fails because service does not exist.

**Step 2: Implement service**

Functions:

```ts
loadAdminSiteChangelogEntries(query)
loadAdminSiteChangelogEntry(id)
generateSiteChangelogDraft(adminId, input)
updateSiteChangelogEntry(adminId, id, input)
publishSiteChangelogEntry(adminId, id)
archiveSiteChangelogEntry(adminId, id)
loadPublicSiteChangelogEntries(query)
loadPublicSiteChangelogEntry(id)
```

Generation function composes:

```text
git-source -> prompt -> invokeAIProvider -> parse JSON -> insert/update draft
```

**Step 3: Run service tests**

Run:

```bash
pnpm test:site-changelog-service
```

Expected: pass.

## Task 6: Route Handlers And App API Routes

**Files:**

- Create: `server/modules/site-changelog/route-handler.ts`
- Create: `app/api/admin/site/changelog/route.ts`
- Create: `app/api/admin/site/changelog/generate/route.ts`
- Create: `app/api/admin/site/changelog/[entryId]/route.ts`
- Create: `app/api/admin/site/changelog/[entryId]/publish/route.ts`
- Create: `app/api/admin/site/changelog/[entryId]/archive/route.ts`
- Create: `app/api/site/changelog/route.ts`
- Create: `app/api/site/changelog/[entryId]/route.ts`
- Test: `scripts/check-site-changelog-route.ts`

**Step 1: Write failing route tests**

Cover:

- admin routes reject missing admin
- generate validates date
- generate maps `NO_COMMITS_FOUND` and `GIT_SOURCE_UNAVAILABLE`
- patch validates body
- publish maps invalid transition
- public list returns only public fields

Run:

```bash
pnpm test:site-changelog-route
```

Expected: fails because handlers do not exist.

**Step 2: Implement route handlers**

Follow `server/modules/admin-site/route-handler.ts` patterns:

- `jsonSuccess`
- `jsonError`
- `withNoStoreHeaders`
- validation parser functions
- named error mapping

**Step 3: Run route tests**

Run:

```bash
pnpm test:site-changelog-route
```

Expected: pass.

## Task 7: Admin UI

**Files:**

- Create: `app/(admin-shell)/admin/site/changelog/page.tsx`
- Create: `features/admin-site/components/site-changelog-page.tsx`
- Modify: `features/admin-shell/data/menu-config.ts`
- Modify: `features/admin-shell/components/admin-header.tsx`
- Test: `scripts/check-admin-site-pages.mjs`

**Step 1: Extend failing page assertions**

Assert:

- menu contains `/admin/site/changelog`
- page route imports `SiteChangelogPage`
- component includes generate action
- component uses `Textarea` with `variant="code"`
- component uses `MarkdownContent`
- component includes publish confirmation text
- component does not import a new Markdown editor package

Run:

```bash
pnpm test:admin-site-pages
```

Expected: fails.

**Step 2: Implement admin page**

Use existing admin site page style:

- `adminRequestData`
- `useAdminSessionExpiryRedirect`
- `StatePanel`
- `Sheet`
- `Dialog`
- `Input`
- `Textarea`
- `MarkdownContent`

**Step 3: Run page assertions**

Run:

```bash
pnpm test:admin-site-pages
```

Expected: pass.

## Task 8: Public Changelog Page

**Files:**

- Create: `app/changelog/page.tsx`
- Create: `features/site/components/changelog-page.tsx`
- Modify: `features/marketing/components/footer.tsx`
- Test: new `scripts/check-public-changelog-page.mjs`
- Modify: `package.json`

**Step 1: Write failing public page assertions**

Assert:

- `/changelog` route exists
- page reads public API or server loader
- page uses `MarkdownContent`
- footer links to `/changelog`
- no internal fields are rendered

Run:

```bash
pnpm test:public-changelog-page
```

Expected: fails.

**Step 2: Implement public page**

Render published entries with:

- date
- title
- Markdown body
- empty state

**Step 3: Run public page assertions**

Run:

```bash
pnpm test:public-changelog-page
```

Expected: pass.

## Task 9: OpenAPI

**Files:**

- Modify: `server/modules/api-docs/schemas.ts`
- Modify: `server/modules/api-docs/openapi.ts`
- Modify: `scripts/check-openapi-document.ts`

**Step 1: Extend failing OpenAPI assertions**

Add path assertions for:

```text
/api/admin/site/changelog
/api/admin/site/changelog/generate
/api/admin/site/changelog/{entryId}
/api/admin/site/changelog/{entryId}/publish
/api/admin/site/changelog/{entryId}/archive
/api/site/changelog
/api/site/changelog/{entryId}
```

Run:

```bash
pnpm test:openapi-document
```

Expected: fails.

**Step 2: Add schemas and paths**

Add admin/public response schemas and request schemas. Ensure public schemas omit internal fields.

**Step 3: Run OpenAPI tests**

Run:

```bash
pnpm test:openapi-document
```

Expected: pass.

## Task 10: Persistent Docs Sync

**Files:**

- Modify: `AGENTS.md`
- Modify: `docs/plans/README.md`
- Modify: `docs/plans/2026-03-23-ai-coding-tutor-api-spec.md`
- Modify: `docs/plans/2026-03-23-ai-coding-tutor-database-schema-design.md`
- Modify: `docs/plans/2026-03-30-ai-coding-tutor-ai-orchestration-design.md`
- Modify: `docs/plans/2026-03-31-ai-coding-tutor-admin-console-design.md`

**Step 1: Update docs**

Reflect:

- migration `057`
- new admin route `/admin/site/changelog`
- new public route `/changelog`
- new APIs
- new `site-changelog-writer` agent
- local Git source limitation

**Step 2: Run lightweight doc checks**

Run:

```bash
rg -n "更新日志|site-changelog|057|site_changelog_entries|site-changelog-writer" AGENTS.md docs/plans
```

Expected: all key docs mention the new capability.

## Task 11: Full Verification

**Files:**

- No new implementation files unless prior tasks found gaps.

**Step 1: Run targeted tests**

Run:

```bash
pnpm test:site-changelog-validation
pnpm test:site-changelog-schema
pnpm test:site-changelog-agent-seed
pnpm test:site-changelog-git-source
pnpm test:site-changelog-service
pnpm test:site-changelog-route
pnpm test:admin-site
pnpm test:public-changelog-page
pnpm test:openapi-document
```

Expected: all pass.

**Step 2: Run broad checks**

Run:

```bash
pnpm lint
pnpm build
git diff --check
```

Expected:

- lint has no errors; existing unrelated warnings must be reported, not hidden
- build exits 0
- diff check exits 0

**Step 3: Manual smoke checks**

If an admin session is available:

1. Visit `/admin/site/changelog`.
2. Generate a draft for a date with commits.
3. Confirm draft appears in the table.
4. Edit Markdown and preview.
5. Publish.
6. Visit `/changelog` and confirm the published entry appears.

If no admin session is available, document that manual admin click-through was not performed.
