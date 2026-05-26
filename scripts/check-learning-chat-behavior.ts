import test from "node:test"
import assert from "node:assert/strict"

import {
  buildComposerDraftFromAssistantAction,
  canAssistantMessageAdvanceToNextTask,
  canUseCompletionQuickAction,
  COMPLETION_READY_NEXT_ACTION,
  buildStableAssistantActions,
  isExplicitTaskCompletionInput,
  mergeAssistantActionIntoInput,
  normalizeAssistantAction,
  resolveAssistantActionIntent,
  resolveAssistantTaskPatchForDisplay,
  shouldCompleteCurrentTaskFromAssistantAction,
  shouldRenderAssistantMessageActions,
  shouldRenderAssistantNextStep,
  shouldRenderMessageTaskPatch,
  shouldRenderStructuredMessageSection,
  shouldStabilizePendingAssistantTone,
} from "../features/learning/lib/chat-behavior.ts"

test("buildStableAssistantActions always returns two user prompts plus one current-step action", () => {
  assert.deepEqual(
    buildStableAssistantActions({
      actions: [
        {
          label: "请按这个操作",
          prompt: "打开设置面板并点击保存。",
          tone: "secondary",
        },
      ],
      taskState: "in_progress",
      canAdvanceToNextTask: false,
      isFinalTask: false,
      nextTaskTitle: "变量和状态",
    }),
    [
      {
        label: "我应该先做哪一步？",
        prompt: "我应该先做哪一步？请结合当前任务给我一个最小可执行动作。",
        tone: "secondary",
        kind: "prefill",
      },
      {
        label: "这是我的结果，请帮我判断",
        prompt: "这是我的结果，请帮我判断是否达到当前任务的完成标准：\n",
        tone: "secondary",
        kind: "prefill",
      },
      {
        label: "继续下一步",
        prompt: "请继续当前任务中的下一项练习，并告诉我先做什么。",
        tone: "primary",
        kind: "prefill",
      },
    ],
  )
})

test("buildStableAssistantActions keeps contextual assistant prompts before the stable progress action", () => {
  assert.deepEqual(
    buildStableAssistantActions({
      actions: [
        {
          label: "我可以这样回答吗？",
          prompt: "我准备这样回答：____。请帮我判断这个回答是否清楚。",
          tone: "secondary",
        },
        {
          label: "帮我把答案串起来",
          prompt: "请帮我把上面三个问题连成一段顺畅的总结。",
          tone: "secondary",
        },
        {
          label: "继续当前练习",
          prompt: "请告诉我下一步做什么。",
          tone: "primary",
        },
      ],
      taskState: "in_progress",
      canAdvanceToNextTask: false,
      isFinalTask: false,
      nextTaskTitle: "变量和状态",
    }),
    [
      {
        label: "我可以这样回答吗？",
        prompt: "我准备这样回答：____。请帮我判断这个回答是否清楚。",
        tone: "secondary",
        kind: "prefill",
      },
      {
        label: "帮我把答案串起来",
        prompt: "请帮我把上面三个问题连成一段顺畅的总结。",
        tone: "secondary",
        kind: "prefill",
      },
      {
        label: "继续下一步",
        prompt: "请继续当前任务中的下一项练习，并告诉我先做什么。",
        tone: "primary",
        kind: "prefill",
      },
    ],
  )
})

test("buildStableAssistantActions exposes next-stage progress only after completion is available", () => {
  assert.deepEqual(
    buildStableAssistantActions({
      actions: [
        {
          label: "进入下一关",
          prompt: "我已完成当前关卡，请带我进入下一关。",
          tone: "success",
        },
      ],
      taskState: "in_progress",
      canAdvanceToNextTask: true,
      isFinalTask: false,
      nextTaskTitle: "变量和状态",
    }).at(-1),
    {
      label: "进入下一关",
      prompt: "进入下一关：变量和状态",
      tone: "success",
      kind: "advance_next_task",
    },
  )

  assert.deepEqual(
    buildStableAssistantActions({
      actions: [],
      taskState: "in_progress",
      canAdvanceToNextTask: true,
      isFinalTask: true,
      nextTaskTitle: null,
    }).at(-1),
    {
      label: "完成学习计划",
      prompt: "我已完成当前任务，请完成本轮学习计划。",
      tone: "success",
      kind: "advance_next_task",
    },
  )

  assert.deepEqual(
    buildStableAssistantActions({
      actions: [],
      taskState: "completed",
      canAdvanceToNextTask: true,
      isFinalTask: false,
      nextTaskTitle: "变量和状态",
    }).at(-1),
    {
      label: "进入下一关",
      prompt: "进入下一关：变量和状态",
      tone: "success",
      kind: "advance_next_task",
    },
  )
})

test("review mode hides assistant message actions and next-step progress buttons", () => {
  assert.equal(
    shouldRenderAssistantMessageActions({
      isReviewMode: true,
      role: "ai",
      actionCount: 3,
    }),
    false,
  )
  assert.equal(
    shouldRenderAssistantNextStep({
      isReviewMode: true,
      nextStep: "进入下一关：变量和状态",
    }),
    false,
  )

  assert.equal(
    shouldRenderAssistantMessageActions({
      isReviewMode: false,
      role: "ai",
      actionCount: 3,
    }),
    true,
  )
  assert.equal(
    shouldRenderAssistantNextStep({
      isReviewMode: false,
      nextStep: "进入下一关：变量和状态",
    }),
    true,
  )
})

test("shouldRenderMessageTaskPatch hides task patch while the assistant message is still streaming", () => {
  assert.equal(
    shouldRenderMessageTaskPatch(
      {
        taskId: "task-1",
        status: "in_progress",
        suggestedNextAction: "继续推进当前任务",
      },
      {
        messageId: 101,
        pendingAssistantMessageId: 101,
      },
    ),
    false,
  )

  assert.equal(
    shouldRenderMessageTaskPatch(
      {
        taskId: "task-1",
        status: "in_progress",
        suggestedNextAction: "继续推进当前任务",
      },
      {
        messageId: 101,
        pendingAssistantMessageId: null,
      },
    ),
    true,
  )
})

test("mergeAssistantActionIntoInput prefills the composer instead of sending immediately", () => {
  assert.equal(
    mergeAssistantActionIntoInput(
      "",
      "我通过搜索了解到 Claude Code 是一个 [请在此处用你的话简述]。",
    ),
    "我通过搜索了解到 Claude Code 是一个 [请在此处用你的话简述]。",
  )

  assert.equal(
    mergeAssistantActionIntoInput(
      "我已经做完第一步验证。",
      "我已确认我的 macOS（版本：XXX）满足要求。",
    ),
    "我已经做完第一步验证。\n\n我已确认我的 macOS（版本：XXX）满足要求。",
  )
})

test("buildComposerDraftFromAssistantAction converts placeholder-heavy prompts into editable templates", () => {
  assert.equal(
    buildComposerDraftFromAssistantAction({
      label: "我已了解 Claude Code 的用途",
      prompt:
        "我通过搜索了解到 Claude Code 是一个 [请在此处用你的话简述，例如：基于 AI 的代码解释器和编程助手]，主要用于 [请说明主要用途，例如：在对话中执行代码、帮助调试和编写代码片段]。",
    }),
    "我通过搜索了解到 Claude Code 是一个 ____，主要用于 ____。",
  )

  assert.equal(
    buildComposerDraftFromAssistantAction({
      label: "我的环境已全面就绪",
      prompt:
        "我已确认我的 macOS（版本：XXX）、内存（XX GB）和磁盘空间均满足要求，网络正常，并已准备好安装目录 `~/XXX`。",
    }),
    "我已确认我的 macOS（版本：____）、内存（____ GB）和磁盘空间均满足要求，网络正常，并已准备好安装目录 `~/____`。",
  )
})

test("assistant quick actions strip markdown before rendering and composer prefill", () => {
  const action = normalizeAssistantAction({
    label: "**实现基础交互",
    prompt:
      "请修改 main.js 文件，实现点击按钮获取输入框文本，并打印到控制台。**",
    tone: "secondary",
  })

  assert.deepEqual(action, {
    label: "实现基础交互",
    prompt: "请修改 main.js 文件，实现点击按钮获取输入框文本，并打印到控制台。",
    tone: "secondary",
  })

  assert.equal(
    buildComposerDraftFromAssistantAction(action),
    "请修改 main.js 文件，实现点击按钮获取输入框文本，并打印到控制台。",
  )
})

test("isExplicitTaskCompletionInput recognizes strong completion intents but ignores questions", () => {
  assert.equal(isExplicitTaskCompletionInput("我完成了"), true)
  assert.equal(isExplicitTaskCompletionInput("我已经完成第1关了，请开启下一关"), true)
  assert.equal(isExplicitTaskCompletionInput("这一关我已完成，可以继续下一步"), true)
  assert.equal(isExplicitTaskCompletionInput("我已经完成第一步了"), false)
  assert.equal(isExplicitTaskCompletionInput("我已经完成了这个小练习"), false)
  assert.equal(isExplicitTaskCompletionInput("这项练习完成了，下一步是什么"), false)
  assert.equal(isExplicitTaskCompletionInput("我已经准备好开始第2关的学习"), false)
  assert.equal(isExplicitTaskCompletionInput("进入下一关"), false)
  assert.equal(isExplicitTaskCompletionInput("我完成了吗？"), false)
  assert.equal(isExplicitTaskCompletionInput("我还没完成，但想知道下一步"), false)
})

test("shouldCompleteCurrentTaskFromAssistantAction only promotes real completion actions", () => {
  assert.equal(
    shouldCompleteCurrentTaskFromAssistantAction({
      messageKind: "task_feedback",
      taskPatchStatus: "completed",
      actionLabel: "继续下一步",
      nextStep: "进入下一步：交互控制与智能辅助",
    }),
    true,
  )

  assert.equal(
    shouldCompleteCurrentTaskFromAssistantAction({
      messageKind: "coach",
      taskPatchStatus: "in_progress",
      actionLabel: "进入下一关",
      nextStep: "进入下一步：交互控制与智能辅助",
    }),
    false,
  )
})

test("resolveAssistantActionIntent keeps suggestion buttons as composer prefill only", () => {
  assert.equal(
    resolveAssistantActionIntent({
      actionKind: "prefill",
      messageKind: "task_feedback",
      taskPatchStatus: "completed",
      actionLabel: "继续下一步",
      nextStep: "进入下一步：交互控制与智能辅助",
    }),
    "prefill",
  )

  assert.equal(
    resolveAssistantActionIntent({
      actionKind: "advance_next_task",
      messageKind: "coach",
      taskPatchStatus: "completed",
      actionLabel: "进入下一步",
      nextStep: null,
    }),
    "advance_next_task",
  )
})

test("canUseCompletionQuickAction requires both user evidence and assistant completion cue", () => {
  assert.equal(
    canUseCompletionQuickAction({
      taskState: "in_progress",
      messages: [
        { role: "system", kind: "system_goal", content: "", interactionType: null, actionLabels: [], taskPatchStatus: null },
        { role: "ai", kind: "coach", content: "先继续当前练习。", interactionType: "teaching", actionLabels: ["进入下一步"], taskPatchStatus: "in_progress" },
      ],
    }),
    false,
  )

  assert.equal(
    canUseCompletionQuickAction({
      taskState: "in_progress",
      messages: [
        { role: "system", kind: "system_goal", content: "", interactionType: null, actionLabels: [], taskPatchStatus: null },
        { role: "ai", kind: "coach", content: "先继续当前练习。", interactionType: "teaching", actionLabels: ["进入下一步"], taskPatchStatus: "in_progress" },
        { role: "user", kind: "user_input", content: "我已经完成了这个小练习。", interactionType: null, actionLabels: [], taskPatchStatus: null },
      ],
    }),
    false,
  )

  assert.equal(
    canUseCompletionQuickAction({
      taskState: "in_progress",
      messages: [
        { role: "system", kind: "system_goal", content: "", interactionType: null, actionLabels: [], taskPatchStatus: null },
        { role: "user", kind: "user_input", content: "我已经完成了这个小练习。", interactionType: null, actionLabels: [], taskPatchStatus: null },
        {
          role: "ai",
          kind: "coach",
          content: "你已经满足当前任务完成标准，可以点击“我完成了”进入下一步。",
          interactionType: "task_review",
          actionLabels: ["进入下一步"],
          taskPatchStatus: "in_progress",
        },
      ],
    }),
    true,
  )

  assert.equal(
    canUseCompletionQuickAction({
      taskState: "in_progress",
      messages: [
        { role: "user", kind: "user_input", content: "都执行完了，没有报错。", interactionType: null, actionLabels: [], taskPatchStatus: null },
        {
          role: "ai",
          kind: "coach",
          content: "你已经成功完成了第 1 关的所有操作！",
          interactionType: "task_review",
          actionLabels: [],
          taskPatchStatus: "in_progress",
        },
      ],
    }),
    true,
  )

  assert.equal(
    canUseCompletionQuickAction({
      taskState: "completed",
      messages: [
        { role: "user", kind: "user_input", content: "done", interactionType: null, actionLabels: [], taskPatchStatus: null },
      ],
    }),
    false,
  )
})

test("completion-ready assistant replies unlock the completion and next-task actions", () => {
  assert.equal(
    canUseCompletionQuickAction({
      taskState: "in_progress",
      messages: [
        { role: "user", kind: "user_input", content: "截图里可以看到 codex 正常启动，没有报错。", interactionType: null, actionLabels: [], taskPatchStatus: null },
        {
          role: "ai",
          kind: "coach",
          content: "验收通过 ✅ 你的截图清晰地展示了：终端执行了 codex 命令，Codex CLI 成功启动，没有出现 command not found 等报错。",
          interactionType: "teaching",
          actionLabels: ["进入下一步"],
          taskPatchStatus: null,
        },
      ],
    }),
    true,
  )

  assert.equal(
    canAssistantMessageAdvanceToNextTask({
      taskState: "in_progress",
      canTriggerCompleteQuickAction: true,
      messageKind: "coach",
      taskPatchStatus: null,
      interactionType: "completion_feedback",
      content: "验收通过 ✅ 完全符合完成标准。",
    }),
    true,
  )
})

test("completion-ready assistant replies show next-task guidance in task patch cards", () => {
  assert.deepEqual(
    resolveAssistantTaskPatchForDisplay(
      {
        taskId: "task-2",
        status: "in_progress",
        suggestedNextAction: "继续围绕当前任务做最小验证，并把结果反馈回来",
      },
      {
        messageKind: "coach",
        interactionType: "teaching",
        content: "验收通过 ✅ 当前任务已满足完成标准。",
      },
    ),
    {
      taskId: "task-2",
      status: "completed",
      suggestedNextAction: COMPLETION_READY_NEXT_ACTION,
    },
  )
})

test("shouldStabilizePendingAssistantTone avoids content-based tone drift while streaming", () => {
  assert.equal(
    shouldStabilizePendingAssistantTone({
      messageId: 7,
      pendingAssistantMessageId: 7,
    }),
    true,
  )

  assert.equal(
    shouldStabilizePendingAssistantTone({
      messageId: 7,
      pendingAssistantMessageId: null,
    }),
    false,
  )
})

test("shouldRenderStructuredMessageSection hides empty coach detail containers", () => {
  assert.equal(
    shouldRenderStructuredMessageSection({
      blockCount: 0,
    }),
    false,
  )

  assert.equal(
    shouldRenderStructuredMessageSection({
      blockCount: 1,
    }),
    true,
  )
})
