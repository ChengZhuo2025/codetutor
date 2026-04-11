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
