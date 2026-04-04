import test from "node:test"
import assert from "node:assert/strict"

import { buildAdminUsersExportCsv } from "@/server/modules/admin-users/export"
import type { AdminUserDetailResponseData } from "@/lib/api/contracts/admin-users"

function makeUser(overrides: Partial<AdminUserDetailResponseData> = {}): AdminUserDetailResponseData {
  return {
    userId: "550e8400-e29b-41d4-a716-446655440001",
    nickname: "程序员小李",
    avatarUrl: null,
    wechat: "coder-li",
    contactEmail: "ops@example.com",
    bio: null,
    signupProvider: null,
    lastLoginProvider: null,
    lastLoginAt: null,
    authPhone: "13800138000",
    authEmail: "auth@example.com",
    onboardingCompleted: true,
    contentLanguage: "zh-CN",
    primaryToolCode: "cursor",
    primaryToolName: "Cursor",
    activePathStatus: "active",
    activePathSelectionMode: "preset_training",
    activePathLearningLevel: "intermediate",
    activePathCode: "cursor-basic",
    activePathName: "Cursor 起步营",
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
    currentRankCode: "builder",
    streakDays: 7,
    lastLearningAt: "2026-04-03T09:00:00.000Z",
    profileCreatedAt: "2026-03-01T08:00:00.000Z",
    profileUpdatedAt: "2026-04-03T09:00:00.000Z",
    deletedAt: null,
    deletedReason: null,
    ...overrides,
  }
}

test("buildAdminUsersExportCsv includes list-critical fields and localized labels", () => {
  const csv = buildAdminUsersExportCsv([makeUser()])
  const [headerLine, dataLine] = csv.replace(/^\uFEFF/, "").trim().split("\n")

  assert.match(headerLine, /手机号/)
  assert.match(headerLine, /主工具/)
  assert.match(headerLine, /计划状态/)
  assert.match(headerLine, /学习等级/)
  assert.match(headerLine, /计划模式/)
  assert.match(headerLine, /计划完成率/)
  assert.match(headerLine, /当前积分/)
  assert.match(headerLine, /当前段位/)
  assert.match(headerLine, /连续打卡天数/)
  assert.match(headerLine, /最近学习时间/)

  assert.match(dataLine, /"13800138000"/)
  assert.match(dataLine, /"Cursor"/)
  assert.match(dataLine, /"进行中"/)
  assert.match(dataLine, /"有基础"/)
  assert.match(dataLine, /"闯关模式"/)
  assert.match(dataLine, /"AI 建造者"/)
  assert.match(dataLine, /"60"/)
})
