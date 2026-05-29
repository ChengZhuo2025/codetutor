import test from "node:test"
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"

import {
  mapAdminSiteChangelogRow,
  toPublicSiteChangelogEntry,
  assertCanGenerateDraft,
  assertCanPublishEntry,
  assertCanArchiveEntry,
  buildChangelogKeywordFilter,
  mapSiteChangelogSupabaseError,
} from "../server/modules/site-changelog/service.ts"

const row = {
  id: "550e8400-e29b-41d4-a716-446655440000",
  log_date: "2026-05-29",
  title: "产品更新",
  summary_markdown: "## 新增\n\n- 更新日志",
  status: "draft",
  commit_from_sha: "old",
  commit_to_sha: "new",
  commit_count: 2,
  source_commits_json: [
    {
      sha: "new",
      shortSha: "new",
      subject: "feat: changelog",
      body: null,
      authorName: "Alice",
      authorEmail: "a@example.com",
      committedAt: "2026-05-29T08:00:00.000Z",
    },
  ],
  generated_by_agent_code: "site-changelog-writer",
  provider_code_snapshot: "siliconflow",
  model_code_snapshot: "deepseek-v4-pro",
  llm_invocation_id: "550e8400-e29b-41d4-a716-446655440001",
  generation_error: null,
  published_at: null,
  archived_at: null,
  updated_by_admin_id: "550e8400-e29b-41d4-a716-446655440011",
  created_at: "2026-05-29T08:00:00.000Z",
  updated_at: "2026-05-29T08:00:00.000Z",
}

test("site changelog row mapping keeps admin fields and public projection hides internals", () => {
  const admin = mapAdminSiteChangelogRow(row)
  assert.equal(admin.logDate, "2026-05-29")
  assert.equal(admin.sourceCommits.length, 1)
  assert.equal(admin.llmInvocationId, "550e8400-e29b-41d4-a716-446655440001")

  const publicEntry = toPublicSiteChangelogEntry(admin)
  assert.deepEqual(Object.keys(publicEntry).sort(), [
    "id",
    "logDate",
    "publishedAt",
    "summaryMarkdown",
    "title",
  ].sort())
})

test("site changelog transition guards expose stable business errors", () => {
  assert.doesNotThrow(() => assertCanGenerateDraft(null, false))
  assert.throws(() => assertCanGenerateDraft({ status: "draft" }, false), /CHANGELOG_DRAFT_EXISTS/)
  assert.doesNotThrow(() => assertCanGenerateDraft({ status: "draft" }, true))
  assert.throws(() => assertCanGenerateDraft({ status: "published" }, true), /CHANGELOG_ALREADY_PUBLISHED/)
  assert.doesNotThrow(() => assertCanPublishEntry({ status: "draft" }))
  assert.throws(() => assertCanPublishEntry({ status: "archived" }), /INVALID_STATUS_TRANSITION/)
  assert.doesNotThrow(() => assertCanArchiveEntry({ status: "draft" }))
  assert.throws(() => assertCanArchiveEntry({ status: "archived" }), /INVALID_STATUS_TRANSITION/)
})

test("site changelog service allows published edits and supports audited delete", () => {
  const source = readFileSync("server/modules/site-changelog/service.ts", "utf8")
  assert.doesNotMatch(source, /before\.status !== "draft"[\s\S]{0,120}INVALID_STATUS_TRANSITION/)
  assert.match(source, /deleteSiteChangelogEntry/)
  assert.match(source, /site_changelog_delete/)
  assert.match(source, /\.delete\(\)[\s\S]*\.from\("site_changelog_entries"\)/)
})

test("site changelog keyword filter quotes postgrest reserved characters", () => {
  assert.equal(
    buildChangelogKeywordFilter("release,(admin)%"),
    'title.ilike."%release,(admin)\\%%",summary_markdown.ilike."%release,(admin)\\%%"',
  )
})

test("site changelog unique conflicts map to draft exists business error", () => {
  const mapped = mapSiteChangelogSupabaseError(
    {
      code: "23505",
      message: "duplicate key value violates unique constraint",
      details: "uidx_site_changelog_entries_log_date_active",
    },
    "failed to save generated site changelog",
  )

  assert.equal(mapped.name, "CHANGELOG_DRAFT_EXISTS")
})

test("site changelog generation claims a draft before invoking AI", () => {
  const source = readFileSync("server/modules/site-changelog/service.ts", "utf8")
  assert.ok(source.indexOf("claimGenerationDraft({") > -1)
  assert.ok(source.indexOf("claimGenerationDraft({") < source.indexOf("invokeAIProvider({"))
  assert.match(source, /GENERATION_IN_PROGRESS/)
  assert.match(source, /markGenerationFailed/)
})
