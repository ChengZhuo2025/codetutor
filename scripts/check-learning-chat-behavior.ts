import test from "node:test"
import assert from "node:assert/strict"

import {
  buildComposerDraftFromAssistantAction,
  isExplicitTaskCompletionInput,
  mergeAssistantActionIntoInput,
  shouldRenderLearningResumeCard,
  shouldRenderMessageTaskPatch,
  shouldRenderStructuredMessageSection,
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
  assert.equal(isExplicitTaskCompletionInput("我完成了吗？"), false)
  assert.equal(isExplicitTaskCompletionInput("我还没完成，但想知道下一步"), false)
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
