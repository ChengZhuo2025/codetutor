import test from "node:test"
import assert from "node:assert/strict"

import { createLearningCurrentSessionGetHandler } from "../server/modules/learning/route-handler.ts"

test("learning current-session route returns 401 when request is not authenticated", async () => {
  const handler = createLearningCurrentSessionGetHandler({
    getRequestAuth: async () => null,
    getRequestAuthHelpText: () => "请先登录后再继续。",
    getLearningCurrentSessionData: async () => {
      throw new Error("should not load learning session when unauthenticated")
    },
  })

  const response = await handler({
    url: "http://localhost:3000/api/learning/current-session",
  })

  assert.equal(response.status, 401)
  assert.deepEqual(await response.json(), {
    code: "AUTH_REQUIRED",
    message: "请先登录后再继续。",
    data: null,
  })
})

test("learning current-session route forwards sessionId and taskId query params", async () => {
  let capturedInput:
    | {
        sessionId?: string | null
        taskId?: string | null
      }
    | null = null

  const handler = createLearningCurrentSessionGetHandler({
    getRequestAuth: async () => ({ userId: "user-1" }),
    getRequestAuthHelpText: () => "ignored",
    getLearningCurrentSessionData: async (_userId, input) => {
      capturedInput = input
      return {
        conversationId: "session-456",
        historyPagination: {
          hasMore: false,
          nextBeforeSequenceNo: null,
        },
        pendingMaterialPlanDraft: null,
        path: {
          id: "path-1",
          status: "in_progress",
        },
        task: {
          taskId: "task-123",
          title: "复盘这一关",
          status: "completed",
        },
        profile: {
          userId: "user-1",
          nickname: "学员",
          avatarUrl: null,
          phone: null,
          email: null,
          wechat: null,
          bio: null,
          primaryTool: {
            code: "cursor",
            name: "Cursor",
          },
          learningLevel: "beginner",
          currentScore: 120,
          currentRank: "新手",
          streakDays: 3,
          completedTaskCount: 2,
          lastLearningAt: null,
        },
        planSummary: {
          selectedToolName: "Cursor",
          learningLevelLabel: "零基础",
          selectionModeLabel: "预设训练",
          selectionMode: "preset_training",
          pathName: "Cursor 起步营",
          hasMaterialPlan: false,
        },
        mission: null,
        resume: null,
        messages: [],
        quickActions: [],
        supportOptions: [],
        responseSamples: [],
        rightPanel: {
          currentStep: "复盘这一关",
          whyThisStep: "回看这一关的关键决策。",
          completionCriteria: "能够复述关键做法。",
          hintIfStuck: "先看你当时的操作记录。",
          knowledgePoints: [],
          masteryPoints: [],
          cautions: [],
          nextStepPreview: "完成复盘后回到地图。",
        },
        recentPracticeRounds: [],
        tasks: [],
        knowledgeTags: [],
      }
    },
  })

  const response = await handler({
    url: "http://localhost:3000/api/learning/current-session?taskId=task-123&sessionId=session-456",
  })

  assert.equal(response.status, 200)
  assert.deepEqual(capturedInput, {
    taskId: "task-123",
    sessionId: "session-456",
  })
})
