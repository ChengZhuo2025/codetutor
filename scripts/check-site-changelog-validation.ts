import test from "node:test"
import assert from "node:assert/strict"

import {
  parseAdminSiteChangelogGenerateBody,
  parseAdminSiteChangelogListQuery,
  parseAdminSiteChangelogUpdateBody,
  parsePublicSiteChangelogListQuery,
  parseSiteChangelogEntryId,
} from "../server/lib/request-validation.ts"

test("site changelog validation accepts strict dates and status filters", () => {
  assert.equal(parseAdminSiteChangelogListQuery(new URLSearchParams("status=draft&startDate=2026-05-01&endDate=2026-05-29")).ok, true)

  assert.deepEqual(parseAdminSiteChangelogListQuery(new URLSearchParams("status=bad")), {
    ok: false,
    code: "VALIDATION_FAILED",
    message: "status 参数不合法。",
  })

  assert.deepEqual(parseAdminSiteChangelogListQuery(new URLSearchParams("startDate=2026-02-31")), {
    ok: false,
    code: "VALIDATION_FAILED",
    message: "startDate 必须是 YYYY-MM-DD 格式的有效日期。",
  })
})

test("site changelog validation parses ids, generate body, public query and patch body", () => {
  assert.equal(parseSiteChangelogEntryId("550e8400-e29b-41d4-a716-446655440000").ok, true)
  assert.equal(parseSiteChangelogEntryId("bad").ok, false)

  const generate = parseAdminSiteChangelogGenerateBody({
    logDate: "2026-05-29",
    regenerate: true,
  })
  assert.deepEqual(generate, {
    ok: true,
    data: {
      logDate: "2026-05-29",
      regenerate: true,
    },
  })

  assert.deepEqual(parseAdminSiteChangelogGenerateBody({ logDate: "2026-5-29" }), {
    ok: false,
    code: "VALIDATION_FAILED",
    message: "logDate 必须是 YYYY-MM-DD 格式的有效日期。",
  })

  assert.deepEqual(parseAdminSiteChangelogUpdateBody({}), {
    ok: false,
    code: "VALIDATION_FAILED",
    message: "至少提供一个可更新字段。",
  })
  assert.equal(parseAdminSiteChangelogUpdateBody({ title: "产品更新", summaryMarkdown: "## 新增" }).ok, true)
  assert.equal(parsePublicSiteChangelogListQuery(new URLSearchParams("page=2&limit=10")).ok, true)
})
