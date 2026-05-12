import type { MessageTaskPatch } from "../types"

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

export function buildComposerDraftFromAssistantAction(input: {
  label: string
  prompt: string
}) {
  const normalizedPrompt = normalizePlaceholderSegments(input.prompt.trim())
    .replace(/____\s*，/g, "____，")
    .replace(/____\s*。/g, "____。")
    .replace(/\s{2,}/g, " ")
    .trim()

  return normalizedPrompt || input.label.trim()
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
