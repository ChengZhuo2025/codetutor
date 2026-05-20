import test from "node:test"
import assert from "node:assert/strict"

import {
  buildIdempotentReplayResponse,
  classifyLearningRouteError,
  deriveTaskPatch,
  doesAgentBindingMatchLearningScene,
  finalizeAssistantTaskPatch,
  hasLearningResumeHistory,
  parseStoredTaskPatchMetadata,
  resolveAgentBindingInteractionFallbacks,
  resolveAssistantInteractionType,
  resolveLearningUserInteractionType,
  resolveLearningResponseMode,
  shouldPersistTaskPatch,
  shouldTreatAssistantResponseAsCompletion,
} from "../server/modules/learning/logic.ts"
import {
  buildStructuredLearningMessageContent,
  parseStoredStructuredLearningMessageContent,
  resolveRenderableStructuredLearningMessageContent,
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

test("resolveLearningUserInteractionType keeps task setup and installation requests in teaching", () => {
  assert.equal(
    resolveLearningUserInteractionType({
      requestedInteractionType: null,
      content: "请问要如何安装 claude code？我是 mac os 系统",
      taskStatus: "in_progress",
    }),
    "teaching",
  )

  assert.equal(
    resolveLearningUserInteractionType({
      requestedInteractionType: null,
      content: "我的本机环境还没配置好，怎么先完成 Claude Code 的初始化？",
      taskStatus: "not_started",
    }),
    "teaching",
  )
})

test("resolveLearningUserInteractionType still routes explicit concept questions to concept QA", () => {
  assert.equal(
    resolveLearningUserInteractionType({
      requestedInteractionType: null,
      content: "什么是字段映射？它和普通变量有什么区别？",
      taskStatus: "in_progress",
    }),
    "concept_qa",
  )
})

test("resolveLearningUserInteractionType routes free-practice consultation questions to concept QA", () => {
  assert.equal(
    resolveLearningUserInteractionType({
      requestedInteractionType: null,
      content: "我想请教一个问题，请问你对 cc-switch 是否了解",
      taskStatus: "in_progress",
    }),
    "concept_qa",
  )

  assert.equal(
    resolveLearningUserInteractionType({
      requestedInteractionType: null,
      content: "你了解 MCP server 吗？",
      taskStatus: "in_progress",
    }),
    "concept_qa",
  )
})

test("resolveAgentBindingInteractionFallbacks falls back from unmatched teaching to global concept QA", () => {
  assert.deepEqual(resolveAgentBindingInteractionFallbacks("concept_qa"), ["concept_qa"])
  assert.deepEqual(resolveAgentBindingInteractionFallbacks("teaching"), ["teaching", "concept_qa"])
  assert.deepEqual(resolveAgentBindingInteractionFallbacks("path_guidance"), ["path_guidance", "concept_qa"])
  assert.deepEqual(resolveAgentBindingInteractionFallbacks("blocked_help"), ["blocked_help"])
})

test("resolveAgentBindingInteractionFallbacks keeps the requested teaching binding ahead of concept QA fallback", () => {
  const interactionTypes = resolveAgentBindingInteractionFallbacks("teaching")
  const sorted = [
    { interaction_type: "concept_qa", priority: 1 },
    { interaction_type: "teaching", priority: 999 },
  ].sort((left, right) => {
    const leftRank = interactionTypes.indexOf(left.interaction_type as (typeof interactionTypes)[number])
    const rightRank = interactionTypes.indexOf(right.interaction_type as (typeof interactionTypes)[number])
    if (leftRank !== rightRank) {
      return leftRank - rightRank
    }

    return left.priority - right.priority
  })

  assert.equal(sorted[0].interaction_type, "teaching")
})

test("doesAgentBindingMatchLearningScene allows generated self-directed paths to reuse generic self-study coach", () => {
  assert.equal(
    doesAgentBindingMatchLearningScene(
      {
        tool_id: "tool-claude",
        learning_level: null,
        selection_mode: "self_directed",
        path_id: "default-self-study-template",
        step_no: null,
      },
      {
        tool: { id: "tool-claude" },
        path: {
          learning_level: "intermediate",
          selection_mode: "self_directed",
          template_path_id: "material-plan-template",
          metadata: {
            seedSource: "plan_draft_confirmed",
          },
        },
        step: {
          step_no: 1,
        },
      },
    ),
    true,
  )

  assert.equal(
    doesAgentBindingMatchLearningScene(
      {
        tool_id: "tool-claude",
        learning_level: null,
        selection_mode: "self_directed",
        path_id: "default-self-study-template",
        step_no: null,
      },
      {
        tool: { id: "tool-claude" },
        path: {
          learning_level: "beginner",
          selection_mode: "self_directed",
          template_path_id: "onboarding-generated-template",
          metadata: {
            seedSource: "api_onboarding_complete",
          },
        },
        step: {
          step_no: 1,
        },
      },
    ),
    true,
  )

  assert.equal(
    doesAgentBindingMatchLearningScene(
      {
        tool_id: "tool-claude",
        learning_level: null,
        selection_mode: "self_directed",
        path_id: "default-self-study-template",
        step_no: null,
      },
      {
        tool: { id: "tool-claude" },
        path: {
          learning_level: "intermediate",
          selection_mode: "self_directed",
          template_path_id: "another-custom-template",
          metadata: {},
        },
        step: {
          step_no: 1,
        },
      },
    ),
    false,
  )
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

test("assistant completion detection only upgrades real pass/fail conclusions", () => {
  assert.equal(
    shouldTreatAssistantResponseAsCompletion(
      "结合你之前对 /clear 的准确理解，你已经满足了本关的完成标准。",
    ),
    true,
  )

  assert.equal(
    shouldTreatAssistantResponseAsCompletion(
      "为了全面验收本关，我们还需要确认其他三项技巧的掌握情况。",
    ),
    false,
  )
})

test("resolveAssistantInteractionType upgrades teaching replies that clearly confirm current-stage completion", () => {
  assert.equal(
    resolveAssistantInteractionType({
      requestedInteractionType: "teaching",
      assistantContent:
        "非常好！结合你之前的展示，你已经满足了本关的完成标准。建议进入下一关。",
    }),
    "completion_feedback",
  )

  assert.equal(
    resolveAssistantInteractionType({
      requestedInteractionType: "teaching",
      assistantContent: "现在进入关卡验收，请再选择至少一项进行演示。",
    }),
    "teaching",
  )
})

test("finalizeAssistantTaskPatch upgrades accepted review replies into a completion-ready patch", () => {
  assert.deepEqual(
    finalizeAssistantTaskPatch({
      taskId: "task-3",
      initialTaskPatch: {
        taskId: "task-3",
        status: "in_progress",
        suggestedNextAction: "继续围绕当前关卡做最小验证，并把结果反馈回来",
      },
      assistantContent:
        "结合你之前对 /clear 的准确理解，你已经满足了本关的完成标准。",
    }),
    {
      taskId: "task-3",
      status: "completed",
      suggestedNextAction: "你已达到本关完成标准，可点击“我完成了”进入下一关。",
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

test("hasLearningResumeHistory hides resume card for a newly created path with no study trace", () => {
  assert.equal(
    hasLearningResumeHistory({
      completedSteps: 0,
      currentTaskLastConversationId: null,
      persistedMessageCount: 0,
    }),
    false,
  )

  assert.equal(
    hasLearningResumeHistory({
      completedSteps: 1,
      currentTaskLastConversationId: null,
      persistedMessageCount: 0,
    }),
    true,
  )

  assert.equal(
    hasLearningResumeHistory({
      completedSteps: 0,
      currentTaskLastConversationId: "conversation-1",
      persistedMessageCount: 0,
    }),
    true,
  )

  assert.equal(
    hasLearningResumeHistory({
      completedSteps: 0,
      currentTaskLastConversationId: null,
      persistedMessageCount: 2,
    }),
    true,
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
      interactionType: "teaching",
      content: [
        "我们把这一步再缩小。",
        "",
        "1. 先只完成最小验证",
        "2. 再把结果贴回来",
      ].join("\n"),
    }),
    {
      interactionType: "teaching",
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
      interactionType: "completion_feedback",
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
      interactionType: "completion_feedback",
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
          label: "进入下一关",
          prompt: "我已完成当前关卡，请带我进入下一关并告诉我开头第一步该做什么。",
          tone: "success",
        },
      ],
    },
  )
})

test("buildStructuredLearningMessageContent parses agent-native markdown headings and action lines", () => {
  assert.deepEqual(
    buildStructuredLearningMessageContent({
      title: "下一步建议",
      kind: "coach",
      interactionType: "path_guidance",
      content: [
        "先把当前这一步做成，不要一次扩展太多。",
        "",
        "## 当前建议",
        "1. 先完成最小验证",
        "2. 再把结果贴回来",
        "",
        "## 关键提醒",
        "- 先看终端输出，不要凭感觉改",
        "",
        "## 建议动作",
        "- 继续当前关卡｜请根据当前上下文告诉我接下来最小的一步应该做什么。",
        "- 给我最小示例｜请给我一个最小可运行示例，并说明我该先验证什么。",
      ].join("\n"),
    }),
    {
      interactionType: "path_guidance",
      variant: "path_guidance",
      summary: "先把当前这一步做成，不要一次扩展太多。",
      blocks: [
        {
          type: "heading",
          text: "当前建议",
        },
        {
          type: "ordered_list",
          items: ["先完成最小验证", "再把结果贴回来"],
        },
        {
          type: "heading",
          text: "关键提醒",
        },
        {
          type: "unordered_list",
          items: ["先看终端输出，不要凭感觉改"],
        },
        {
          type: "heading",
          text: "建议动作",
        },
        {
          type: "unordered_list",
          items: [
            "继续当前关卡｜请根据当前上下文告诉我接下来最小的一步应该做什么。",
            "给我最小示例｜请给我一个最小可运行示例，并说明我该先验证什么。",
          ],
        },
      ],
      sections: [
        {
          title: "当前建议",
          tone: "info",
          blocks: [
            {
              type: "ordered_list",
              items: ["先完成最小验证", "再把结果贴回来"],
            },
          ],
        },
        {
          title: "关键提醒",
          tone: "info",
          blocks: [
            {
              type: "unordered_list",
              items: ["先看终端输出，不要凭感觉改"],
            },
          ],
        },
      ],
      actions: [
        {
          label: "继续当前关卡",
          prompt: "请根据当前上下文告诉我接下来最小的一步应该做什么。",
          tone: "secondary",
        },
        {
          label: "给我最小示例",
          prompt: "请给我一个最小可运行示例，并说明我该先验证什么。",
          tone: "secondary",
        },
      ],
    },
  )
})

test("buildStructuredLearningMessageContent preserves fenced code blocks for learn chat rendering", () => {
  assert.deepEqual(
    buildStructuredLearningMessageContent({
      title: "最小示例",
      kind: "coach",
      interactionType: "teaching",
      content: [
        "先直接跑通这个最小示例。",
        "",
        "## 示例代码",
        "```bash",
        "pnpm lint",
        "pnpm build",
        "```",
        "",
        "## 关键提醒",
        "- 需要在项目根目录执行",
      ].join("\n"),
    }),
    {
      interactionType: "teaching",
      variant: "example",
      summary: "先直接跑通这个最小示例。",
      blocks: [
        {
          type: "heading",
          text: "示例代码",
        },
        {
          type: "code_block",
          language: "bash",
          code: "pnpm lint\npnpm build",
        },
        {
          type: "heading",
          text: "关键提醒",
        },
        {
          type: "unordered_list",
          items: ["需要在项目根目录执行"],
        },
      ],
      sections: [
        {
          title: "示例代码",
          tone: "info",
          blocks: [
            {
              type: "code_block",
              language: "bash",
              code: "pnpm lint\npnpm build",
            },
          ],
        },
        {
          title: "关键提醒",
          tone: "info",
          blocks: [
            {
              type: "unordered_list",
              items: ["需要在项目根目录执行"],
            },
          ],
        },
      ],
      actions: [
        {
          label: "给我最小示例",
          prompt: "请给我一个最小可运行示例，并说明我该先验证什么。",
          tone: "secondary",
        },
      ],
    },
  )
})

test("buildStructuredLearningMessageContent preserves single line breaks inside paragraphs", () => {
  assert.deepEqual(
    buildStructuredLearningMessageContent({
      title: "排查建议",
      kind: "coach",
      interactionType: "blocked_help",
      content: [
        "先确认下面两点：",
        "当前目录是否正确",
        "分支是否切对了",
      ].join("\n"),
    })?.summary,
    "先确认下面两点：\n当前目录是否正确\n分支是否切对了",
  )
})

test("buildStructuredLearningMessageContent strips markdown from action labels and downgrades fake next-stage actions inside the current task", () => {
  assert.deepEqual(
    buildStructuredLearningMessageContent({
      title: "下一步建议",
      kind: "coach",
      interactionType: "path_guidance",
      content: [
        "先完成本关当前这个练习，再继续。",
        "",
        "## 建议动作",
        "- **进入下一关**｜请介绍第5关的内容和第一步应该做什么。",
        "- **巩固第4关技巧**｜我想再练习一下 [具体技巧，如全局搜索]，有什么建议的练习任务？",
      ].join("\n"),
    })?.actions,
    [
      {
        label: "进入下一步",
        prompt: "请继续当前关卡中的下一项练习，并告诉我先做什么。",
        tone: "secondary",
      },
      {
        label: "巩固本关技巧",
        prompt: "我想再巩固一下当前这一关的一个技巧，请给我一个针对性的练习任务。",
        tone: "secondary",
      },
    ],
  )
})

test("parseStoredStructuredLearningMessageContent falls back to inferred interactionType for legacy payload", () => {
  assert.deepEqual(
    parseStoredStructuredLearningMessageContent({
      variant: "blocked_help",
      summary: "先补充完整报错。",
      blocks: [],
    }),
    {
      interactionType: "blocked_help",
      variant: "blocked_help",
      summary: "先补充完整报错。",
      blocks: [],
      sections: [],
      actions: [
        {
          label: "补充报错信息",
          prompt: "请补充当前执行命令、终端输出和你预期的结果。",
          tone: "warning",
        },
      ],
    },
  )
})

test("parseStoredStructuredLearningMessageContent normalizes stored action labels and prompts", () => {
  assert.deepEqual(
    parseStoredStructuredLearningMessageContent({
      interactionType: "path_guidance",
      variant: "path_guidance",
      summary: "继续推进当前关卡。",
      blocks: [],
      actions: [
        {
          label: "**进入下一关**",
          prompt: "请介绍第5关的内容和第一步应该做什么。",
          tone: "secondary",
        },
      ],
    })?.actions,
    [
      {
        label: "进入下一步",
        prompt: "请继续当前关卡中的下一项练习，并告诉我先做什么。",
        tone: "secondary",
      },
    ],
  )
})

test("parseStoredStructuredLearningMessageContent restores persisted code blocks", () => {
  assert.deepEqual(
    parseStoredStructuredLearningMessageContent({
      interactionType: "teaching",
      variant: "example",
      summary: "先执行下面这段代码。",
      blocks: [
        {
          type: "code_block",
          language: "typescript",
          code: "const answer = 42;",
        },
      ],
    }),
    {
      interactionType: "teaching",
      variant: "example",
      summary: "先执行下面这段代码。",
      blocks: [
        {
          type: "code_block",
          language: "typescript",
          code: "const answer = 42;",
        },
      ],
      sections: [
        {
          title: null,
          tone: "info",
          blocks: [
            {
              type: "code_block",
              language: "typescript",
              code: "const answer = 42;",
            },
          ],
        },
      ],
      actions: [
        {
          label: "给我最小示例",
          prompt: "请给我一个最小可运行示例，并说明我该先验证什么。",
          tone: "secondary",
        },
      ],
    },
  )
})

test("resolveRenderableStructuredLearningMessageContent reparses raw markdown to repair legacy malformed stored blocks", () => {
  assert.deepEqual(
    resolveRenderableStructuredLearningMessageContent({
      title: "排查建议",
      kind: "coach",
      interactionType: "blocked_help",
      content: [
        "先跑这段命令。",
        "",
        "```bash",
        "pwd",
        "git branch",
        "```",
      ].join("\n"),
      storedContent: {
        interactionType: "blocked_help",
        variant: "blocked_help",
        summary: "先跑这段命令。",
        blocks: [
          {
            type: "paragraph",
            text: "```bash pwd git branch ```",
          },
        ],
        sections: [
          {
            title: null,
            tone: "warning",
            blocks: [
              {
                type: "paragraph",
                text: "```bash pwd git branch ```",
              },
            ],
          },
        ],
        actions: [
          {
            label: "补充报错信息",
            prompt: "请补充当前执行命令、终端输出和你预期的结果。",
            tone: "warning",
          },
        ],
      },
    }),
    {
      interactionType: "blocked_help",
      variant: "blocked_help",
      summary: "先跑这段命令。",
      blocks: [
        {
          type: "code_block",
          language: "bash",
          code: "pwd\ngit branch",
        },
      ],
      sections: [
        {
          title: null,
          tone: "warning",
          blocks: [
            {
              type: "code_block",
              language: "bash",
              code: "pwd\ngit branch",
            },
          ],
        },
      ],
      actions: [
        {
          label: "补充报错信息",
          prompt: "请补充当前执行命令、终端输出和你预期的结果。",
          tone: "warning",
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
