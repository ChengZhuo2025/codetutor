import test from "node:test"
import assert from "node:assert/strict"

import {
  parseAdminFeedbackBatchDeleteBody,
  parseAdminFeedbackListQuery,
  parseAdminReplyFeedbackBody,
  parseAdminUpdateFeedbackStatusBody,
  parseAuthLoginBody,
  parseCompleteOnboardingBody,
  parseCompleteTaskBody,
  parseCreateFeedbackBody,
  parseOnboardingPathOptionsQuery,
  parseProfileAvatarFile,
  parseRequiredRouteId,
  parseLearningMessagesQuery,
  parseHistoryRecentQuery,
  parsePlanDraftRegenerateBody,
  parsePlanFromMaterialBody,
  parseUpdateHistoryStatusBody,
  parseUpdateProfileMeBody,
  parseUpdateTaskStatusBody,
} from "../server/lib/request-validation.ts"

test("parseUpdateProfileMeBody trims optional fields and keeps validation semantics", () => {
  const result = parseUpdateProfileMeBody({
    nickname: "小王",
    avatarUrl: "  https://example.com/a.png  ",
    email: "  a@example.com ",
    wechat: "  wechat-id ",
    bio: "  hello ",
  })

  assert.equal(result.ok, true)
  if (!result.ok) {
    return
  }

  assert.deepEqual(result.data, {
    nickname: "小王",
    avatarUrl: "https://example.com/a.png",
    email: "a@example.com",
    wechat: "wechat-id",
    bio: "hello",
  })
})

test("parseCreateFeedbackBody rejects short title with stable message", () => {
  const result = parseCreateFeedbackBody({
    feedbackType: "issue_report",
    title: "abc",
    content: "这是一段足够长的反馈内容。",
  })

  assert.deepEqual(result, {
    ok: false,
    code: "VALIDATION_FAILED",
    message: "标题至少需要 4 个字符。",
  })
})

test("parseAdminFeedbackListQuery validates enums and limit", () => {
  const invalid = parseAdminFeedbackListQuery(
    new URLSearchParams("status=bad&limit=10"),
  )

  assert.deepEqual(invalid, {
    ok: false,
    code: "VALIDATION_FAILED",
    message: "status 参数不合法。",
  })

  const valid = parseAdminFeedbackListQuery(
    new URLSearchParams(
      "status=submitted&feedbackType=issue_report&keyword=%20bug%20&userId=%20user-1%20&limit=20&page=2&priority=high",
    ),
  )

  assert.equal(valid.ok, true)
  if (!valid.ok) {
    return
  }

  assert.deepEqual(valid.data, {
    status: "submitted",
    feedbackType: "issue_report",
    priority: "high",
    keyword: "bug",
    userId: "user-1",
    limit: 20,
    page: 2,
  })

  const badPage = parseAdminFeedbackListQuery(new URLSearchParams("page=0&limit=10"))
  assert.deepEqual(badPage, {
    ok: false,
    code: "VALIDATION_FAILED",
    message: "page 必须是大于等于 1 的整数。",
  })
})

test("parseAdminFeedbackBatchDeleteBody validates selected ids", () => {
  const empty = parseAdminFeedbackBatchDeleteBody({
    ids: [],
  })

  assert.deepEqual(empty, {
    ok: false,
    code: "VALIDATION_FAILED",
    message: "至少选择 1 条工单。",
  })

  const invalid = parseAdminFeedbackBatchDeleteBody({
    ids: ["ticket-1", "   "],
  })

  assert.deepEqual(invalid, {
    ok: false,
    code: "VALIDATION_FAILED",
    message: "ids 中存在不合法的工单 ID。",
  })

  const valid = parseAdminFeedbackBatchDeleteBody({
    ids: ["  ticket-1  ", "ticket-2"],
  })

  assert.equal(valid.ok, true)
  if (!valid.ok) {
    return
  }

  assert.deepEqual(valid.data, {
    ids: ["ticket-1", "ticket-2"],
  })
})

test("parseLearningMessagesQuery keeps 422-style validation semantics", () => {
  const invalid = parseLearningMessagesQuery(
    new URLSearchParams("conversationId=123&beforeSequenceNo=0"),
  )

  assert.deepEqual(invalid, {
    ok: false,
    code: "VALIDATION_FAILED",
    message: "conversationId 不合法。",
  })

  const valid = parseLearningMessagesQuery(
    new URLSearchParams("conversationId=550e8400-e29b-41d4-a716-446655440000&beforeSequenceNo=2&limit=10"),
  )

  assert.equal(valid.ok, true)
  if (!valid.ok) {
    return
  }

  assert.deepEqual(valid.data, {
    conversationId: "550e8400-e29b-41d4-a716-446655440000",
    beforeSequenceNo: 2,
    limit: 10,
  })
})

test("parseHistoryRecentQuery falls back to existing defaults", () => {
  const result = parseHistoryRecentQuery(new URLSearchParams("status=bad"))

  assert.equal(result.ok, true)
  if (!result.ok) {
    return
  }

  assert.deepEqual(result.data, {
    page: 1,
    pageSize: 20,
    filter: "all",
  })
})

test("request validation helpers cover body parsers used by app routes", () => {
  assert.equal(parseAuthLoginBody({ loginType: "phone" }).ok, true)
  assert.equal(
    parseCompleteOnboardingBody({
      toolCode: "cursor",
      learningLevel: "beginner",
      selectionMode: "self_directed",
    }).ok,
    true,
  )
  assert.equal(parseCompleteTaskBody({ taskId: "task-1" }).ok, true)
  assert.equal(
    parseUpdateTaskStatusBody({ taskId: "task-1", status: "blocked" }).ok,
    true,
  )
  assert.equal(parseUpdateHistoryStatusBody({ action: "archive" }).ok, true)
  assert.equal(
    parseAdminReplyFeedbackBody({ content: "  已处理  ", status: "replied" }).ok,
    true,
  )
  assert.equal(
    parseAdminUpdateFeedbackStatusBody({ status: "closed" }).ok,
    true,
  )
})

test("query and path helpers preserve existing route semantics", () => {
  const onboarding = parseOnboardingPathOptionsQuery(
    new URLSearchParams("toolCode=%20cursor%20&learningLevel=beginner"),
  )

  assert.equal(onboarding.ok, true)
  if (onboarding.ok) {
    assert.deepEqual(onboarding.data, {
      toolCode: "cursor",
      learningLevel: "beginner",
    })
  }

  const routeId = parseRequiredRouteId("history-1", "学习计划 ID 不合法。")

  assert.equal(routeId.ok, true)
  if (routeId.ok) {
    assert.equal(routeId.data, "history-1")
  }
})

test("parseProfileAvatarFile preserves avatar upload validation messages", () => {
  const missing = parseProfileAvatarFile(null)
  assert.deepEqual(missing, {
    ok: false,
    code: "BAD_REQUEST",
    message: "请先选择要上传的头像图片。",
  })

  const invalidType = parseProfileAvatarFile(
    new File(["hello"], "avatar.gif", { type: "image/gif" }),
  )
  assert.deepEqual(invalidType, {
    ok: false,
    code: "VALIDATION_FAILED",
    message: "头像仅支持 JPG、PNG、WebP 格式。",
  })

  const empty = parseProfileAvatarFile(
    new File([""], "avatar.png", { type: "image/png" }),
  )
  assert.deepEqual(empty, {
    ok: false,
    code: "VALIDATION_FAILED",
    message: "头像文件为空，请重新选择。",
  })

  const valid = parseProfileAvatarFile(
    new File(["avatar"], "avatar.png", { type: "image/png" }),
  )
  assert.equal(valid.ok, true)
})

test("parsePlanFromMaterialBody validates links and optional fields", () => {
  const bad = parsePlanFromMaterialBody({ links: [] })
  assert.equal(bad.ok, false)

  const okParsed = parsePlanFromMaterialBody({
    links: ["https://web.dev/learn/"],
    userGoal: "  ",
    weeklyHours: 6,
  })
  assert.equal(okParsed.ok, true)
  if (okParsed.ok) {
    assert.deepEqual(okParsed.data.links, ["https://web.dev/learn/"])
    assert.equal(okParsed.data.userGoal, null)
    assert.equal(okParsed.data.weeklyHours, 6)
  }
})

test("parsePlanDraftRegenerateBody allows empty object", () => {
  const empty = parsePlanDraftRegenerateBody({})
  assert.equal(empty.ok, true)
  if (empty.ok) {
    assert.deepEqual(empty.data, {})
  }
})
