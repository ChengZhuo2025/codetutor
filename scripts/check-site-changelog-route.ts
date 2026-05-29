import test from "node:test"
import assert from "node:assert/strict"

import {
  createAdminSiteChangelogGeneratePostHandler,
  createAdminSiteChangelogDeleteHandler,
  createAdminSiteChangelogListGetHandler,
  createAdminSiteChangelogPatchHandler,
  createAdminSiteChangelogArchivePostHandler,
  createAdminSiteChangelogPublishPostHandler,
  createPublicSiteChangelogListGetHandler,
} from "../server/modules/site-changelog/route-handler.ts"

const okAdmin = { ok: true as const, adminId: "550e8400-e29b-41d4-a716-446655440011" }
const forbiddenAdmin = { ok: false as const, reason: "forbidden" as const, message: "需要管理员登录" }

const sampleEntry = {
  id: "550e8400-e29b-41d4-a716-446655440000",
  logDate: "2026-05-29",
  title: "产品更新",
  summaryMarkdown: "## 新增",
  status: "draft" as const,
  commitFromSha: null,
  commitToSha: null,
  commitCount: 0,
  sourceCommits: [],
  generatedByAgentCode: null,
  providerCodeSnapshot: null,
  modelCodeSnapshot: null,
  llmInvocationId: null,
  generationError: null,
  publishedAt: null,
  archivedAt: null,
  updatedAt: null,
  updatedByAdminId: null,
}

test("admin changelog list requires admin", async () => {
  const handler = createAdminSiteChangelogListGetHandler({
    getRequestAdmin: async () => forbiddenAdmin,
    loadAdminSiteChangelogEntries: async () => ({ items: [], total: 0, page: 1, pageSize: 20, hasMore: false }),
  })
  const res = await handler(new Request("http://localhost/api/admin/site/changelog"))
  assert.equal(res.status, 403)
})

test("admin changelog generate validates date and maps business errors", async () => {
  const invalidHandler = createAdminSiteChangelogGeneratePostHandler({
    getRequestAdmin: async () => okAdmin,
    generateSiteChangelogDraft: async () => sampleEntry,
  })
  const invalid = await invalidHandler(new Request("http://localhost/api/admin/site/changelog/generate", {
    method: "POST",
    body: JSON.stringify({ logDate: "bad" }),
  }))
  assert.equal(invalid.status, 400)

  const handler = createAdminSiteChangelogGeneratePostHandler({
    getRequestAdmin: async () => okAdmin,
    generateSiteChangelogDraft: async () => {
      const error = new Error("NO_COMMITS_FOUND")
      error.name = "NO_COMMITS_FOUND"
      throw error
    },
  })
  const res = await handler(new Request("http://localhost/api/admin/site/changelog/generate", {
    method: "POST",
    body: JSON.stringify({ logDate: "2026-05-29" }),
  }))
  assert.equal(res.status, 409)
})

test("admin changelog patch validates body and publish maps invalid transition", async () => {
  const patch = createAdminSiteChangelogPatchHandler({
    getRequestAdmin: async () => okAdmin,
    updateSiteChangelogEntry: async () => sampleEntry,
  })
  const badPatch = await patch(new Request("http://localhost/api/admin/site/changelog/550e8400-e29b-41d4-a716-446655440000", {
    method: "PATCH",
    body: JSON.stringify({}),
  }), { params: Promise.resolve({ entryId: sampleEntry.id }) })
  assert.equal(badPatch.status, 400)

  const publish = createAdminSiteChangelogPublishPostHandler({
    getRequestAdmin: async () => okAdmin,
    publishSiteChangelogEntry: async () => {
      const error = new Error("INVALID_STATUS_TRANSITION")
      error.name = "INVALID_STATUS_TRANSITION"
      throw error
    },
  })
  const res = await publish(new Request("http://localhost/api/admin/site/changelog/x/publish", { method: "POST" }), {
    params: Promise.resolve({ entryId: sampleEntry.id }),
  })
  assert.equal(res.status, 409)

  const archive = createAdminSiteChangelogArchivePostHandler({
    getRequestAdmin: async () => okAdmin,
    archiveSiteChangelogEntry: async () => {
      const error = new Error("INVALID_STATUS_TRANSITION")
      error.name = "INVALID_STATUS_TRANSITION"
      throw error
    },
  })
  const archiveRes = await archive(new Request("http://localhost/api/admin/site/changelog/x/archive", { method: "POST" }), {
    params: Promise.resolve({ entryId: sampleEntry.id }),
  })
  assert.equal(archiveRes.status, 409)
})

test("admin changelog delete requires admin and returns deleted entry", async () => {
  const forbidden = createAdminSiteChangelogDeleteHandler({
    getRequestAdmin: async () => forbiddenAdmin,
    deleteSiteChangelogEntry: async () => sampleEntry,
  })
  const forbiddenRes = await forbidden(new Request("http://localhost/api/admin/site/changelog/x", { method: "DELETE" }), {
    params: Promise.resolve({ entryId: sampleEntry.id }),
  })
  assert.equal(forbiddenRes.status, 403)

  const handler = createAdminSiteChangelogDeleteHandler({
    getRequestAdmin: async () => okAdmin,
    deleteSiteChangelogEntry: async () => sampleEntry,
  })
  const res = await handler(new Request("http://localhost/api/admin/site/changelog/x", { method: "DELETE" }), {
    params: Promise.resolve({ entryId: sampleEntry.id }),
  })
  assert.equal(res.status, 200)
  const body = await res.json()
  assert.equal(body.data.id, sampleEntry.id)
})

test("public changelog list returns public fields only", async () => {
  const handler = createPublicSiteChangelogListGetHandler({
    loadPublicSiteChangelogEntries: async () => ({
      items: [{ id: sampleEntry.id, logDate: sampleEntry.logDate, title: sampleEntry.title, summaryMarkdown: sampleEntry.summaryMarkdown, publishedAt: "2026-05-29T08:00:00.000Z" }],
      total: 1,
      page: 1,
      pageSize: 20,
      hasMore: false,
    }),
  })
  const res = await handler(new Request("http://localhost/api/site/changelog"))
  assert.equal(res.status, 200)
  const body = await res.json()
  assert.equal(body.data.items[0].sourceCommits, undefined)
})
