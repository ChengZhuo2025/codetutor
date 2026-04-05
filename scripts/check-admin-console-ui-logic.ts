import test from "node:test"
import assert from "node:assert/strict"

import type { AdminUserListItem } from "@/lib/api/contracts/admin-users"
import {
  buildAdminFeedbackListQuery,
  readAdminFeedbackUserIdFromSearchParams,
} from "@/features/admin-feedback/lib/list-filters"
import { buildAdminUserPatchPayload } from "@/features/admin-users/lib/edit-payload"

function makeUser(overrides: Partial<AdminUserListItem> = {}): AdminUserListItem {
  return {
    userId: "550e8400-e29b-41d4-a716-446655440001",
    nickname: "程序员小李",
    avatarUrl: null,
    wechat: "coder-li",
    contactEmail: "test@example.com",
    bio: "原始简介",
    signupProvider: null,
    lastLoginProvider: null,
    lastLoginAt: null,
    authPhone: null,
    authEmail: "auth@example.com",
    onboardingCompleted: true,
    contentLanguage: "en-US",
    primaryToolCode: "javascript",
    primaryToolName: "JavaScript",
    activePathStatus: "active",
    activePathSelectionMode: "preset_training",
    activePathLearningLevel: "intermediate",
    activePathCode: "js-fullstack",
    activePathName: "JavaScript 全栈从零到一",
    activePathStartedAt: "2026-04-01T08:00:00.000Z",
    activePathLastActivityAt: "2026-04-03T08:00:00.000Z",
    activePathTotalSteps: 10,
    activePathCompletedSteps: 6,
    activePathCompletionPercent: 60,
    activePathCompletedTaskCount: 6,
    activePathInProgressTaskCount: 2,
    activePathPendingTaskCount: 1,
    activePathBlockedTaskCount: 1,
    completedTaskCountTotal: 12,
    inProgressTaskCountTotal: 3,
    pendingTaskCountTotal: 4,
    blockedTaskCountTotal: 1,
    currentScore: 1200,
    currentRankCode: "silver",
    streakDays: 7,
    lastLearningAt: "2026-04-03T09:00:00.000Z",
    profileCreatedAt: "2026-03-01T08:00:00.000Z",
    profileUpdatedAt: "2026-04-03T09:00:00.000Z",
    deletedAt: null,
    deletedReason: null,
    ...overrides,
  }
}

test("readAdminFeedbackUserIdFromSearchParams trims valid userId", () => {
  const userId = readAdminFeedbackUserIdFromSearchParams(
    new URLSearchParams([["userId", "  550e8400-e29b-41d4-a716-446655440001  "]]),
  )

  assert.equal(userId, "550e8400-e29b-41d4-a716-446655440001")
})

test("buildAdminFeedbackListQuery keeps linked userId filter in request params", () => {
  const params = buildAdminFeedbackListQuery({
    statusFilter: "all",
    typeFilter: "all",
    priorityFilter: "all",
    keywordApplied: "",
    limit: "20",
    page: 1,
    userId: "550e8400-e29b-41d4-a716-446655440001",
  })

  assert.equal(params.get("userId"), "550e8400-e29b-41d4-a716-446655440001")
  assert.equal(params.get("limit"), "20")
  assert.equal(params.get("page"), "1")
})

test("buildAdminUserPatchPayload only submits editable changed fields", () => {
  const payload = buildAdminUserPatchPayload({
    user: makeUser(),
    form: {
      nickname: " 程序员小李 ",
      bio: "  ",
      contactEmail: " new@example.com ",
      wechat: "coder-li",
    },
  })

  assert.deepEqual(payload, {
    bio: null,
    contactEmail: "new@example.com",
  })
  assert.equal("contentLanguage" in payload, false)
})
