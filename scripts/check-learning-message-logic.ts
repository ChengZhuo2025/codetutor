import test from "node:test"
import assert from "node:assert/strict"

import {
  buildIdempotentReplayResponse,
  classifyLearningRouteError,
  deriveTaskPatch,
  resolveLearningResponseMode,
  shouldPersistTaskPatch,
} from "../server/modules/learning/logic.ts"
import {
  LearningAIProviderError,
  LearningValidationError,
} from "../server/modules/learning/errors.ts"

test("resolveLearningResponseMode falls back to json and upgrades to sse when requested", () => {
  assert.equal(resolveLearningResponseMode(null, false), "json")
  assert.equal(resolveLearningResponseMode("application/json", true), "sse")
  assert.equal(resolveLearningResponseMode("text/event-stream", false), "sse")
})

test("deriveTaskPatch marks blocked_help inputs as blocked with a concrete next action", () => {
  assert.deepEqual(
    deriveTaskPatch({
      taskId: "task-1",
      interactionType: "blocked_help",
      currentStatus: "in_progress",
      content: "我在终端执行命令时报错 failed",
    }),
    {
      taskId: "task-1",
      status: "blocked",
      suggestedNextAction: "补充当前执行命令、终端输出和你预期的结果",
    },
  )
})

test("deriveTaskPatch keeps normal teaching interactions in progress before task completion", () => {
  assert.deepEqual(
    deriveTaskPatch({
      taskId: "task-2",
      interactionType: "teaching",
      currentStatus: "blocked",
      content: "我准备继续下一步",
    }),
    {
      taskId: "task-2",
      status: "in_progress",
      suggestedNextAction: "继续围绕当前关卡做最小验证，并把结果反馈回来",
    },
  )
})

test("shouldPersistTaskPatch only persists state changes that are not completion feedback", () => {
  assert.equal(
    shouldPersistTaskPatch(
      {
        taskId: "task-1",
        status: "blocked",
        suggestedNextAction: "补充报错文本",
      },
      "in_progress",
    ),
    true,
  )

  assert.equal(
    shouldPersistTaskPatch(
      {
        taskId: "task-1",
        status: "in_progress",
        suggestedNextAction: "继续验证",
      },
      "in_progress",
    ),
    false,
  )

  assert.equal(
    shouldPersistTaskPatch(
      {
        taskId: "task-1",
        status: "completed",
        suggestedNextAction: "进入下一关",
      },
      "in_progress",
    ),
    false,
  )
})

test("buildIdempotentReplayResponse preserves taskPatch for replayed assistant messages", () => {
  const response = buildIdempotentReplayResponse({
    conversationId: "session-1",
    taskId: "task-1",
    taskStatus: "blocked",
    assistantTitle: "排查建议",
    assistantKind: "coach",
    assistantContent: "请先补充完整报错信息。",
    taskPatch: {
      taskId: "task-1",
      status: "blocked",
      suggestedNextAction: "补充完整报错文本",
    },
  })

  assert.equal(response.conversationId, "session-1")
  assert.equal(response.taskId, "task-1")
  assert.equal(typeof response.message.id, "number")
  assert.equal(response.message.role, "ai")
  assert.equal(response.message.kind, "coach")
  assert.equal(response.message.title, "排查建议")
  assert.equal(response.message.content, "请先补充完整报错信息。")
  assert.equal(response.taskState, "blocked")
  assert.deepEqual(response.taskPatch, {
    taskId: "task-1",
    status: "blocked",
    suggestedNextAction: "补充完整报错文本",
  })
})

test("classifyLearningRouteError maps validation and provider failures to stable API responses", () => {
  assert.deepEqual(
    classifyLearningRouteError(new LearningValidationError("参数缺失")),
    {
      code: "VALIDATION_FAILED",
      status: 422,
      message: "参数缺失",
    },
  )

  assert.deepEqual(
    classifyLearningRouteError(new LearningAIProviderError("上游模型异常")),
    {
      code: "AI_PROVIDER_ERROR",
      status: 502,
      message: "上游模型异常",
    },
  )

  assert.deepEqual(
    classifyLearningRouteError(new Error("未知错误")),
    {
      code: "INTERNAL_ERROR",
      status: 500,
      message: "未知错误",
    },
  )
})
