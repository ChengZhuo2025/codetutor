import type { MessageTaskPatch } from "../types"
import type { StructuredLearningMessageAction } from "@/lib/learning/structured-message"

export type StableAssistantAction = StructuredLearningMessageAction & {
  kind: "prefill" | "advance_next_task"
}

function stripAssistantActionMarkdown(value: string) {
  return value
    .replace(/\[([^[\]]+)\]\([^)]+\)/g, "$1")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/__([^_]+)__/g, "$1")
    .replace(/\*\*/g, "")
    .replace(/\s+/g, " ")
    .trim()
}

function isContextualSuggestionAction(action: StructuredLearningMessageAction) {
  const combined = `${action.label} ${action.prompt}`

  if (/(继续|进入|开始|完成).*(下一步|下一关|第\s*\d+\s*关|学习计划|本关)/.test(combined)) {
    return false
  }

  if (/(点击|打开|执行|复制|粘贴|运行|修改|保存|提交).*(按钮|面板|命令|文件|代码|设置|终端)/.test(combined)) {
    return false
  }

  if (/^(请按|请先|现在请|你需要|你可以先)/.test(action.label)) {
    return false
  }

  return /[？?]|我|帮我|请帮我|我的|这是/.test(combined)
}

function normalizePlaceholderSegments(prompt: string) {
  return prompt
    .replace(/\[[^[\]]*?\]/g, "____")
    .replace(/`~\/(?:XXX|XX|待填写|请填写|your-path)`/gi, "`~/____`")
    .replace(/（版本：XXX）/g, "（版本：____）")
    .replace(/\bXX GB\b/g, "____ GB")
    .replace(/\bXXX\b/g, "____")
}

const COMPLETION_NEGATION_PATTERNS = [
  /还没完成/,
  /还没有完成/,
  /没完成/,
  /没有完成/,
  /未完成/,
  /尚未完成/,
  /没做完/,
  /还没做完/,
]

const COMPLETION_QUESTION_PATTERNS = [
  /[?？]/,
  /完成了吗/,
  /做完了吗/,
  /算完成/,
  /是不是.*完成/,
  /是否.*完成/,
]

const COMPLETION_SIGNAL_PATTERNS = [
  /我完成了/,
  /我已经完成/,
  /我已完成/,
  /这一关我已完成/,
  /这关我已完成/,
  /当前关卡我已完成/,
  /我做完了/,
  /我已经做完/,
  /我已做完/,
  /我搞定了/,
  /我已经搞定/,
  /第\s*\d+\s*关.*完成/,
]

export function isExplicitTaskCompletionInput(text: string) {
  const normalized = text.replace(/\s+/g, "").trim()
  if (!normalized) {
    return false
  }

  if (COMPLETION_NEGATION_PATTERNS.some((pattern) => pattern.test(normalized))) {
    return false
  }

  if (COMPLETION_QUESTION_PATTERNS.some((pattern) => pattern.test(normalized))) {
    return false
  }

  return COMPLETION_SIGNAL_PATTERNS.some((pattern) => pattern.test(normalized))
}

export function normalizeAssistantAction<T extends { label: string; prompt: string }>(
  action: T,
): T {
  return {
    ...action,
    label: stripAssistantActionMarkdown(action.label),
    prompt: stripAssistantActionMarkdown(action.prompt),
  }
}

export function normalizeAssistantActions(
  actions: StructuredLearningMessageAction[],
) {
  return actions
    .map(normalizeAssistantAction)
    .filter((action) => action.label.length > 0 && action.prompt.length > 0)
}

export function buildStableAssistantActions(input: {
  actions: StructuredLearningMessageAction[]
  taskState: "pending" | "in_progress" | "blocked" | "completed"
  canAdvanceToNextTask: boolean
  isFinalTask: boolean
  nextTaskTitle?: string | null
}): StableAssistantAction[] {
  const normalizedActions = normalizeAssistantActions(input.actions)
  const hasBlockedCue =
    input.taskState === "blocked"
    || normalizedActions.some((action) => /(报错|错误|卡住|补充)/.test(`${action.label} ${action.prompt}`))
  const fallbackActions: StableAssistantAction[] = [
    hasBlockedCue
      ? {
          label: "我卡在这里了，帮我定位",
          prompt: "我卡在这里了，现象是：\n\n我已经尝试过：\n\n请帮我定位最可能的问题。",
          tone: "warning",
          kind: "prefill",
        }
      : {
          label: "我应该先做哪一步？",
          prompt: "我应该先做哪一步？请结合当前关卡给我一个最小可执行动作。",
          tone: "secondary",
          kind: "prefill",
        },
    {
      label: "这是我的结果，请帮我判断",
      prompt: "这是我的结果，请帮我判断是否达到当前关卡的完成标准：\n",
      tone: "secondary",
      kind: "prefill",
    },
  ]
  const contextualActions = normalizedActions
    .filter(isContextualSuggestionAction)
    .slice(0, 2)
    .map((action): StableAssistantAction => ({
      ...action,
      tone: action.tone === "success" ? "secondary" : action.tone,
      kind: "prefill",
    }))
  const prefillActions = [...contextualActions, ...fallbackActions].slice(0, 2)
  const progressAction: StableAssistantAction =
    input.canAdvanceToNextTask
      ? input.isFinalTask
        ? {
            label: "完成学习计划",
            prompt: "我已完成当前关卡，请完成本轮学习计划。",
            tone: "success",
            kind: "advance_next_task",
          }
        : {
            label: "继续下一关",
            prompt: input.nextTaskTitle
              ? `进入下一关：${input.nextTaskTitle}`
              : "我已完成当前关卡，请进入下一关。",
            tone: "success",
            kind: "advance_next_task",
          }
      : {
          label: "继续下一步",
          prompt: "请继续当前关卡中的下一项练习，并告诉我先做什么。",
          tone: "primary",
          kind: "prefill",
        }

  return [...prefillActions, progressAction]
}

export function buildComposerDraftFromAssistantAction(input: {
  label: string
  prompt: string
}) {
  const normalizedAction = normalizeAssistantAction(input)
  const normalizedPrompt = normalizePlaceholderSegments(normalizedAction.prompt)
    .replace(/____\s*，/g, "____，")
    .replace(/____\s*。/g, "____。")
    .replace(/\s{2,}/g, " ")
    .trim()

  return normalizedPrompt || normalizedAction.label
}

export function shouldRenderMessageTaskPatch(
  taskPatch: MessageTaskPatch | null | undefined,
  input: {
    messageId: number
    pendingAssistantMessageId: number | null
  },
) {
  if (!taskPatch) {
    return false
  }

  return input.pendingAssistantMessageId !== input.messageId
}

export function shouldRenderLearningResumeCard(input: {
  hasResume: boolean
  dismissed: boolean
}) {
  return input.hasResume && !input.dismissed
}

export function shouldRenderStructuredMessageSection(input: {
  blockCount: number
}) {
  return input.blockCount > 0
}

export function canUseCompletionQuickAction(input: {
  taskState: "pending" | "in_progress" | "blocked" | "completed"
  messages: Array<{
    role: "system" | "ai" | "user"
    kind: "system_goal" | "coach" | "user_input" | "task_feedback"
    content: string
    interactionType:
      | "teaching"
      | "blocked_help"
      | "task_review"
      | "completion_feedback"
      | "path_guidance"
      | "concept_qa"
      | null
    actionLabels: string[]
    taskPatchStatus: "in_progress" | "blocked" | "completed" | null
  }>
}) {
  if (input.taskState === "completed") {
    return false
  }

  const hasUserEvidence = input.messages.some(
    (message) => message.role === "user" && message.kind === "user_input",
  )

  if (!hasUserEvidence) {
    return false
  }

  return [...input.messages].reverse().some((message) => {
    if (message.role !== "ai") {
      return false
    }

    if (
      message.kind === "task_feedback"
      || message.taskPatchStatus === "completed"
      || message.interactionType === "completion_feedback"
    ) {
      return true
    }

    if (
      message.interactionType !== "task_review"
      && message.interactionType !== "path_guidance"
    ) {
      return false
    }

    if (
      /(已满足本关.*完成标准|本关.*已完成|可以点击.?我完成了.?进入下一关|可以结束本关)/.test(
        message.content,
      )
    ) {
      return true
    }

    return message.actionLabels.some((label) => /完成本关|进入下一关/.test(label))
  })
}

export function shouldCompleteCurrentTaskFromAssistantAction(input: {
  messageKind: "system_goal" | "coach" | "user_input" | "task_feedback"
  taskPatchStatus?: "in_progress" | "blocked" | "completed" | null
  actionLabel: string
  nextStep?: string | null
}) {
  if (input.messageKind === "task_feedback") {
    return true
  }

  if (input.taskPatchStatus === "completed") {
    return true
  }

  return false
}

export function shouldStabilizePendingAssistantTone(input: {
  messageId: number
  pendingAssistantMessageId: number | null
}) {
  return input.pendingAssistantMessageId === input.messageId
}

export function mergeAssistantActionIntoInput(
  currentInput: string,
  prompt: string,
) {
  const normalizedPrompt = prompt.trim()
  if (!normalizedPrompt) {
    return currentInput
  }

  const normalizedCurrent = currentInput.trim()
  if (!normalizedCurrent) {
    return normalizedPrompt
  }

  return `${normalizedCurrent}\n\n${normalizedPrompt}`
}
