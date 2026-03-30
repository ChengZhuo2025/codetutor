import test from "node:test"
import assert from "node:assert/strict"

import {
  buildIdempotentReplayResponse,
  classifyLearningRouteError,
  deriveTaskPatch,
  parseStoredTaskPatchMetadata,
  resolveLearningResponseMode,
  shouldPersistTaskPatch,
} from "../server/modules/learning/logic.ts"
import {
  buildStructuredLearningMessageContent,
  parseStoredStructuredLearningMessageContent,
} from "../lib/learning/structured-message.ts"
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
  assert.deepEqual(response.message.taskPatch, {
    taskId: "task-1",
    status: "blocked",
    suggestedNextAction: "补充完整报错文本",
  })
  assert.equal(response.message.structuredContent, null)
  assert.equal(response.taskState, "blocked")
  assert.deepEqual(response.taskPatch, {
    taskId: "task-1",
    status: "blocked",
    suggestedNextAction: "补充完整报错文本",
  })
})

test("buildStructuredLearningMessageContent derives variant, summary and ordered blocks from assistant text", () => {
  assert.deepEqual(
    buildStructuredLearningMessageContent({
      title: "拆小当前步骤",
      kind: "coach",
      content: [
        "我们把这一步再缩小。",
        "",
        "1. 先只完成最小验证",
        "2. 再把结果贴回来",
      ].join("\n"),
    }),
    {
      variant: "breakdown",
      summary: "我们把这一步再缩小。",
      blocks: [
        {
          type: "ordered_list",
          items: ["先只完成最小验证", "再把结果贴回来"],
        },
      ],
      sections: [
        {
          title: null,
          tone: "default",
          blocks: [
            {
              type: "ordered_list",
              items: ["先只完成最小验证", "再把结果贴回来"],
            },
          ],
        },
      ],
      actions: [
        {
          label: "再拆细一点",
          prompt: "请把刚才这一步继续拆细，直到我可以立即执行第一个动作。",
          tone: "secondary",
        },
      ],
    },
  )
})

test("parseStoredStructuredLearningMessageContent restores persisted structured assistant payload", () => {
  assert.deepEqual(
    parseStoredStructuredLearningMessageContent({
      variant: "completion",
      summary: "很好，这一步已经完成。",
      blocks: [
        {
          type: "unordered_list",
          items: ["你已经确认了当前关卡的关键能力", "接下来可以进入下一关"],
        },
      ],
    }),
    {
      variant: "completion",
      summary: "很好，这一步已经完成。",
      blocks: [
        {
          type: "unordered_list",
          items: ["你已经确认了当前关卡的关键能力", "接下来可以进入下一关"],
        },
      ],
      sections: [
        {
          title: null,
          tone: "success",
          blocks: [
            {
              type: "unordered_list",
              items: ["你已经确认了当前关卡的关键能力", "接下来可以进入下一关"],
            },
          ],
        },
      ],
      actions: [
        {
          label: "继续下一步",
          prompt: "请根据我刚完成的结果，告诉我当前最值得做的下一步。",
          tone: "success",
        },
      ],
    },
  )
})

test("parseStoredTaskPatchMetadata restores task_patch payload from persisted assistant metadata", () => {
  assert.deepEqual(
    parseStoredTaskPatchMetadata({
      taskId: "task-3",
      metadata: {
        taskPatchStatus: "in_progress",
        taskPatchSuggestedNextAction: "先完成一个最小验证结果",
      },
    }),
    {
      taskId: "task-3",
      status: "in_progress",
      suggestedNextAction: "先完成一个最小验证结果",
    },
  )

  assert.equal(
    parseStoredTaskPatchMetadata({
      taskId: "task-3",
      metadata: {
        taskPatchStatus: "unknown",
        taskPatchSuggestedNextAction: "无效",
      },
    }),
    null,
  )
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
