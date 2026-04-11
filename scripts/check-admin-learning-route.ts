import test from "node:test"
import assert from "node:assert/strict"

import {
  createAdminLearningPathDetailGetHandler,
  createAdminLearningPathExportGetHandler,
  createAdminLearningPathListGetHandler,
  createAdminLearningPathStatusPostHandler,
} from "../server/modules/admin-learning/route-handler.ts"
import type {
  AdminLearningPathDetailResponseData,
  AdminLearningPathListResponseData,
  AdminUpdateLearningPathStatusResponseData,
} from "../lib/api/contracts/admin-learning.ts"

const okAdmin = { ok: true as const, adminId: "admin-uuid-1" }
const forbiddenAdmin = {
  ok: false as const,
  reason: "forbidden" as const,
  message: "nope",
}

const sampleList: AdminLearningPathListResponseData = {
  items: [
    {
      pathId: "550e8400-e29b-41d4-a716-446655440100",
      userId: "550e8400-e29b-41d4-a716-446655440001",
      userNickname: "Bao",
      userAvatarUrl: null,
      userEmail: "bao@example.com",
      toolCode: "cursor",
      toolName: "Cursor",
      pathCode: "cursor-beginner-01",
      pathName: "Cursor 入门训练营",
      learningLevel: "beginner",
      learningLevelLabel: "零基础",
      selectionMode: "preset_training",
      selectionModeLabel: "闯关模式",
      status: "active",
      progressPercent: 40,
      completedTaskCount: 2,
      inProgressTaskCount: 1,
      blockedTaskCount: 0,
      totalTaskCount: 5,
      xpEarned: 120,
      startedAt: "2026-04-01T08:00:00.000Z",
      lastLearningAt: "2026-04-03T09:00:00.000Z",
      updatedAt: "2026-04-03T09:00:00.000Z",
    },
  ],
  total: 1,
  page: 1,
  limit: 20,
  stats: {
    totalPaths: 12,
    activeCount: 3,
    interruptedCount: 2,
    completedCount: 5,
    abandonedCount: 2,
  },
}

const sampleDetail: AdminLearningPathDetailResponseData = {
  pathId: "550e8400-e29b-41d4-a716-446655440100",
  user: {
    userId: "550e8400-e29b-41d4-a716-446655440001",
    nickname: "Bao",
    avatarUrl: null,
    email: "bao@example.com",
    currentScore: 120,
    currentRankLabel: "新手学徒",
    streakDays: 3,
    lastLearningAt: "2026-04-03T09:00:00.000Z",
  },
  path: {
    pathCode: "cursor-beginner-01",
    pathName: "Cursor 入门训练营",
    summary: "从零开始学习 Cursor。",
    toolCode: "cursor",
    toolName: "Cursor",
    learningLevel: "beginner",
    learningLevelLabel: "零基础",
    selectionMode: "preset_training",
    selectionModeLabel: "闯关模式",
    status: "interrupted",
    totalSteps: 5,
    completedSteps: 2,
    progressPercent: 40,
    totalTaskCount: 5,
    completedTaskCount: 2,
    inProgressTaskCount: 1,
    blockedTaskCount: 1,
    pendingTaskCount: 1,
    xpEarned: 120,
  },
  timeline: {
    startedAt: "2026-04-01T08:00:00.000Z",
    lastActivityAt: "2026-04-03T09:00:00.000Z",
    completedAt: null,
    interruptedAt: "2026-04-10T08:00:00.000Z",
    abandonedAt: null,
    archivedAt: null,
  },
  steps: [
    {
      stepId: "step-1",
      stepNo: 1,
      title: "安装 Cursor",
      status: "completed",
      rewardXp: 60,
      completedAt: "2026-04-01T10:00:00.000Z",
    },
  ],
  recentSessions: [
    {
      sessionId: "session-1",
      status: "active",
      startedAt: "2026-04-03T09:00:00.000Z",
      lastMessageAt: "2026-04-03T09:05:00.000Z",
      messageCount: 6,
      latestAssistantSummary: "先确认项目索引完成。",
    },
  ],
  materialPlan: {
    draftId: "550e8400-e29b-41d4-a716-446655440700",
    intakeId: "550e8400-e29b-41d4-a716-446655440701",
    title: "Cursor 自学草稿",
    draftStatus: "confirmed",
    revisionNo: 2,
    qualityStatus: "passed",
    qualityReport: {
      status: "passed",
      checks: [
        {
          code: "TASK_COUNT_RANGE",
          passed: true,
          message: "任务数需在 3 到 8 之间。",
        },
      ],
      warnings: ["材料证据充分。"],
      selfCheck: {
        enabled: false,
        decision: "skipped",
        reason: "规则检查已覆盖当前低风险计划，跳过模型自检。",
      },
      fallbackReason: null,
    },
    updatedAt: "2026-04-03T09:05:00.000Z",
    sources: [
      {
        sourceId: "550e8400-e29b-41d4-a716-446655440702",
        url: "https://www.bilibili.com/video/BV1xx",
        sourceType: "video",
        title: "Cursor 入门教程",
        contentExcerpt: "先用公开标题与简介补齐上下文，再按需升级到 ASR。",
        warnings: ["未拿到稳定字幕，先使用公开标题与简介，必要时继续升级到 ASR。"],
        extractionTrace: [
          {
            stage: "raw_text",
            attempted: true,
            used: true,
            reason: "使用公开页可见正文。",
            producedChars: 220,
          },
          {
            stage: "asr",
            attempted: true,
            used: true,
            reason: "正文不足，升级到 ASR。",
            producedChars: 1800,
          },
        ],
        evidenceCoverage: {
          highConfidenceChars: 220,
          totalUsefulChars: 2020,
          chunkCount: 3,
          isSufficient: true,
          isWeakEvidence: false,
        },
        resolvedModelCodes: {
          asr: "sense-voice-small",
          vision: "qwen-3.5-9b",
          quality: "zai-org-glm-4.6",
        },
      },
    ],
  },
}

test("admin learning list returns 403 without admin", async () => {
  const handler = createAdminLearningPathListGetHandler({
    getRequestAdmin: async () => forbiddenAdmin,
    getAdminLearningPathList: async () => {
      throw new Error("should not call")
    },
  })
  const res = await handler(new Request("http://localhost/api/admin/learning-paths"))
  assert.equal(res.status, 403)
})

test("admin learning list returns 200 with data", async () => {
  const handler = createAdminLearningPathListGetHandler({
    getRequestAdmin: async () => okAdmin,
    getAdminLearningPathList: async () => sampleList,
  })
  const res = await handler(new Request("http://localhost/api/admin/learning-paths"))
  assert.equal(res.status, 200)
  const body = await res.json()
  assert.equal(body.code, "OK")
  assert.equal(body.data.items[0].pathId, sampleList.items[0].pathId)
})

test("admin learning export returns csv", async () => {
  const handler = createAdminLearningPathExportGetHandler({
    getRequestAdmin: async () => okAdmin,
    getAdminLearningPathExportCsv: async () => ({
      csv: "\uFEFFpathId,pathName\n1,Cursor 入门训练营",
      filename: "admin-learning.csv",
    }),
  })
  const res = await handler(new Request("http://localhost/api/admin/learning-paths/export"))
  assert.equal(res.status, 200)
  assert.ok(res.headers.get("Content-Type")?.includes("text/csv"))
})

test("admin learning detail returns 404 when missing", async () => {
  const handler = createAdminLearningPathDetailGetHandler({
    getRequestAdmin: async () => okAdmin,
    getAdminLearningPathDetail: async () => null,
  })
  const res = await handler(
    new Request("http://localhost/api/admin/learning-paths/550e8400-e29b-41d4-a716-446655440100"),
    { params: Promise.resolve({ pathId: "550e8400-e29b-41d4-a716-446655440100" }) },
  )
  assert.equal(res.status, 404)
})

test("admin learning detail returns 200 with data", async () => {
  const handler = createAdminLearningPathDetailGetHandler({
    getRequestAdmin: async () => okAdmin,
    getAdminLearningPathDetail: async () => sampleDetail,
  })
  const res = await handler(
    new Request("http://localhost/api/admin/learning-paths/550e8400-e29b-41d4-a716-446655440100"),
    { params: Promise.resolve({ pathId: "550e8400-e29b-41d4-a716-446655440100" }) },
  )
  assert.equal(res.status, 200)
  const body = await res.json()
  assert.equal(body.data.materialPlan.draftId, sampleDetail.materialPlan?.draftId)
})

test("admin learning status route rejects invalid action", async () => {
  const handler = createAdminLearningPathStatusPostHandler({
    getRequestAdmin: async () => okAdmin,
    updateAdminLearningPathStatus: async () => {
      throw new Error("should not call")
    },
  })
  const res = await handler(
    new Request("http://localhost/api/admin/learning-paths/550e8400-e29b-41d4-a716-446655440100/status", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "abandon" }),
    }),
    { params: Promise.resolve({ pathId: "550e8400-e29b-41d4-a716-446655440100" }) },
  )
  assert.equal(res.status, 400)
})

test("admin learning status route returns 200 on success", async () => {
  const handler = createAdminLearningPathStatusPostHandler({
    getRequestAdmin: async () => okAdmin,
    updateAdminLearningPathStatus: async (): Promise<AdminUpdateLearningPathStatusResponseData> => ({
      pathId: "550e8400-e29b-41d4-a716-446655440100",
      status: "archived",
    }),
  })
  const res = await handler(
    new Request("http://localhost/api/admin/learning-paths/550e8400-e29b-41d4-a716-446655440100/status", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "archive", reason: "重复路径" }),
    }),
    { params: Promise.resolve({ pathId: "550e8400-e29b-41d4-a716-446655440100" }) },
  )
  assert.equal(res.status, 200)
  const body = await res.json()
  assert.equal(body.data.status, "archived")
})
