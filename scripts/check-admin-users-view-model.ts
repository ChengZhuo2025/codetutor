import test from "node:test"
import assert from "node:assert/strict"

import type { AdminUserListItem } from "@/lib/api/contracts/admin-users"
import type { AdminFeedbackListItem } from "@/lib/api/contracts/feedback"
import {
  buildUserDetailFeedbackSummary,
  buildUserListStats,
  formatAdminLearningLevelLabel,
  formatAdminRankLabel,
  formatAdminSelectionModeLabel,
  getUserTaskCompletionPercent,
} from "@/features/admin-users/lib/view-model"

function makeUser(overrides: Partial<AdminUserListItem> = {}): AdminUserListItem {
  return {
    userId: "550e8400-e29b-41d4-a716-446655440001",
    nickname: "程序员小李",
    avatarUrl: null,
    wechat: null,
    contactEmail: "test@example.com",
    bio: null,
    signupProvider: null,
    lastLoginProvider: null,
    lastLoginAt: null,
    authPhone: null,
    authEmail: "auth@example.com",
    onboardingCompleted: true,
    contentLanguage: "zh-CN",
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

function makeFeedback(overrides: Partial<AdminFeedbackListItem> = {}): AdminFeedbackListItem {
  return {
    id: "ticket-1",
    feedbackType: "issue_report",
    feedbackTypeLabel: "Bug 报告",
    status: "submitted",
    statusLabel: "待处理",
    title: "AI 回复内容不正确",
    contentPreview: "内容预览",
    contactMethod: null,
    latestReplySnippet: null,
    replyCount: 0,
    submittedAt: "2026-04-03T08:00:00.000Z",
    updatedAt: "2026-04-03T09:00:00.000Z",
    lastReplyAt: null,
    userId: "550e8400-e29b-41d4-a716-446655440001",
    userNicknameSnapshot: "程序员小李",
    userAvatarUrl: null,
    userPhoneSnapshot: null,
    userContactEmailSnapshot: "test@example.com",
    priority: "medium",
    source: null,
    ...overrides,
  }
}

test("buildUserListStats returns honest page stats from current items", () => {
  const stats = buildUserListStats(
    [
      makeUser(),
      makeUser({
        userId: "550e8400-e29b-41d4-a716-446655440002",
        onboardingCompleted: false,
        activePathCode: null,
        activePathName: null,
        streakDays: 0,
      }),
      makeUser({
        userId: "550e8400-e29b-41d4-a716-446655440003",
        deletedAt: "2026-04-03T00:00:00.000Z",
      }),
    ],
    24,
  )

  assert.deepEqual(stats, {
    totalMatchingUsers: 24,
    visibleUsers: 3,
    onboardingCompletedUsers: 2,
    activePlanUsers: 2,
    streakingUsers: 2,
    deletedUsers: 1,
  })
})

test("getUserTaskCompletionPercent prefers active path completion percent when present", () => {
  assert.equal(
    getUserTaskCompletionPercent(
      makeUser({
        activePathCompletionPercent: 73,
        activePathCompletedTaskCount: 2,
        activePathInProgressTaskCount: 1,
        activePathPendingTaskCount: 10,
        activePathBlockedTaskCount: 0,
      }),
    ),
    73,
  )
})

test("getUserTaskCompletionPercent derives from task counts when explicit percent is absent", () => {
  assert.equal(
    getUserTaskCompletionPercent(
      makeUser({
        activePathCompletionPercent: null,
        activePathCompletedTaskCount: 3,
        activePathInProgressTaskCount: 1,
        activePathPendingTaskCount: 1,
        activePathBlockedTaskCount: 1,
      }),
    ),
    50,
  )
})

test("buildUserDetailFeedbackSummary computes totals and latest ticket from feedback list", () => {
  const summary = buildUserDetailFeedbackSummary([
    makeFeedback(),
    makeFeedback({
      id: "ticket-2",
      status: "replied",
      statusLabel: "已解决",
      title: "希望增加更多算法题",
      submittedAt: "2026-04-02T08:00:00.000Z",
    }),
    makeFeedback({
      id: "ticket-3",
      status: "in_review",
      statusLabel: "处理中",
      title: "任务判题有误",
      submittedAt: "2026-04-04T08:00:00.000Z",
    }),
  ])

  assert.equal(summary.total, 3)
  assert.equal(summary.pending, 2)
  assert.equal(summary.latestTicket?.id, "ticket-3")
  assert.equal(summary.latestTicket?.title, "任务判题有误")
})

test("admin user enum formatters map raw codes to Chinese labels", () => {
  assert.equal(formatAdminLearningLevelLabel("intermediate"), "有基础")
  assert.equal(formatAdminSelectionModeLabel("preset_training"), "闯关模式")
  assert.equal(formatAdminRankLabel("apprentice"), "AI 学徒")
})
