import test from "node:test"
import assert from "node:assert/strict"

import {
  buildComposerDraftFromAssistantAction,
  canUseCompletionQuickAction,
  isExplicitTaskCompletionInput,
  mergeAssistantActionIntoInput,
  shouldCompleteCurrentTaskFromAssistantAction,
  shouldRenderLearningResumeCard,
  shouldRenderMessageTaskPatch,
  shouldRenderStructuredMessageSection,
  shouldStabilizePendingAssistantTone,
} from "../features/learning/lib/chat-behavior.ts"

test("shouldRenderMessageTaskPatch hides task patch while the assistant message is still streaming", () => {
  assert.equal(
    shouldRenderMessageTaskPatch(
      {
        taskId: "task-1",
        status: "in_progress",
        suggestedNextAction: "继续推进当前关卡",
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
        suggestedNextAction: "继续推进当前关卡",
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

test("isExplicitTaskCompletionInput recognizes strong completion intents but ignores questions", () => {
  assert.equal(isExplicitTaskCompletionInput("我完成了"), true)
  assert.equal(isExplicitTaskCompletionInput("我已经完成第1关了，请开启下一关"), true)
  assert.equal(isExplicitTaskCompletionInput("这一关我已完成，可以继续下一步"), true)
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
      nextStep: "进入下一关：交互控制与智能辅助",
    }),
    true,
  )

  assert.equal(
    shouldCompleteCurrentTaskFromAssistantAction({
      messageKind: "coach",
      taskPatchStatus: "in_progress",
      actionLabel: "进入下一关",
      nextStep: "进入下一关：交互控制与智能辅助",
    }),
    false,
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
          content: "你已经满足本关完成标准，可以点击“我完成了”进入下一关。",
          interactionType: "task_review",
          actionLabels: ["进入下一关"],
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

test("shouldRenderLearningResumeCard hides the resume prompt after manual dismissal", () => {
  assert.equal(
    shouldRenderLearningResumeCard({
      hasResume: true,
      dismissed: false,
    }),
    true,
  )

  assert.equal(
    shouldRenderLearningResumeCard({
      hasResume: true,
      dismissed: true,
    }),
    false,
  )

  assert.equal(
    shouldRenderLearningResumeCard({
      hasResume: false,
      dismissed: false,
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
