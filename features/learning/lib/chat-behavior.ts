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

const PARTIAL_STEP_COMPLETION_PATTERNS = [
  /完成(?:了|好|完)?第?\s*\d+\s*步/,
  /完成(?:了|好|完)?第?\s*[一二三四五六七八九十]+\s*步/,
  /完成(?:了|好|完)?(?:这一步|当前这一步|这个步骤|这项练习|这一项|当前练习|这个小练习|小练习|子步骤)/,
]

const ADVANCE_NEXT_TASK_NEGATION_PATTERNS = [
  /还没完成/,
  /还没有完成/,
  /没完成/,
  /没有完成/,
  /未完成/,
  /尚未完成/,
  /没做完/,
  /还没做完/,
  /不能进入下一关/,
  /不可以进入下一关/,
  /还不能.*下一关/,
  /还不可以.*下一关/,
  /下一关之前/,
  /下一关之后/,
  /没准备好.*下一关/,
  /还需.*才能.*下一关/,
]

const ADVANCE_NEXT_TASK_QUESTION_PATTERNS = [
  /[?？]/,
  /什么时候.*下一关/,
  /可以.*下一关吗/,
  /何时.*下一关/,
  /怎么.*下一关/,
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

const ADVANCE_NEXT_TASK_INTENT_PATTERNS = [
  /(?:开始|进入|开启|去做|来做|跳到|切换到)\s*下一关/,
  /我要(?:进入|开始|做|去做|来做|跳到|切换到)?\s*下一关/,
  /继续(?:做|学|去|进入|进行)?\s*下一关/,
  /下一关.{0,4}(?:开始|开干|走|来吧|启动|出发)/,
  /(?:推进|进入|跳转|切换)\s*到\s*下一关/,
]

// 与 server/modules/learning/logic.ts 中 ASSISTANT_COMPLETION_NEGATION_PATTERNS 保持等价。
// 用于前端识别 AI 上一条回复"是否表示当前任务已完成"。
const ASSISTANT_COMPLETION_NEGATION_PATTERNS = [
  /还需要确认/,
  /还需确认/,
  /再选择至少一项/,
  /继续验收/,
  /尚未达到/,
  /未达到/,
  /完成此项展示后/,
  /即可判断/,
  /还没完成/,
  /还没有完成/,
  /还未完成/,
  /尚未完成/,
  /还需完成/,
]

// 与 server/modules/learning/logic.ts 中 ASSISTANT_COMPLETION_PATTERNS 保持等价。
const ASSISTANT_COMPLETION_PATTERNS = [
  /已经满足了?当前任务的完成标准/,
  /已满足当前任务的完成标准/,
  /已达到当前任务完成标准/,
  /达到当前任务完成标准/,
  /当前任务已通过验收/,
  /当前任务.{0,4}验收(?:通过|完成|合格|成功)/,
  /已通过当前任务(?:的)?验收/,
  /已经满足了?本关的完成标准/,
  /已满足本关的完成标准/,
  /已达到本关完成标准/,
  /达到本关完成标准/,
  /本关已通过验收/,
  /本关.{0,4}验收(?:通过|完成|合格|成功)/,
  /已通过本关(?:的)?验收/,
  /验收(?:结论|合格)/,
  /恭喜你成功掌握了第\s*\d+\s*(?:步|关)/,
  /(?:你|您)?(?:已经|已)(?:成功)?完成(?:了)?第\s*\d+\s*(?:步|关)(?:的)?(?:所有|全部)?(?:操作|内容|步骤|练习|任务)?/,
  /第\s*\d+\s*(?:步|关)(?:已|已经|顺利|成功){1,3}(?:完成|通过|达成)/,
  /可(?:以)?进入下一关/,
  /可(?:以)?进入下一步/,
  /(?:你|您)?已(?:经)?(?:成功)?完成(?:了)?(?:当前任务|这个任务|这项任务)(?![的之])/,
  /(?:当前任务|这个任务|这项任务)(?:的)?(?:学习|内容|目标|任务|练习|挑战)?(?:已经?|顺利|成功){1,3}(?:完成|结束|达成|通过)/,
  /(?:你|您)?已(?:经)?(?:成功)?完成(?:了)?(?:本关|这一关|当前(?:这)?关)(?![的之])/,
  /(?:本关|这一关|当前关卡)(?:的)?(?:学习|内容|目标|任务|练习|关卡|挑战)?(?:已经?|顺利|成功){1,3}(?:完成|结束|过关|达成|通过)/,
  /已达成本关(?:目标|目的|完成标准)/,
  /(?:本关|这一关).{0,8}(?:全部|所有)?(?:检查点|验收点).{0,8}(?:通过|达成|完成)/,
]

function shouldTreatAssistantContentAsCompletion(content: string) {
  const normalized = content.replace(/\s+/g, "").trim()
  if (!normalized) {
    return false
  }

  if (ASSISTANT_COMPLETION_NEGATION_PATTERNS.some((pattern) => pattern.test(normalized))) {
    return false
  }

  return ASSISTANT_COMPLETION_PATTERNS.some((pattern) => pattern.test(normalized))
}

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

  if (PARTIAL_STEP_COMPLETION_PATTERNS.some((pattern) => pattern.test(normalized))) {
    return false
  }

  return COMPLETION_SIGNAL_PATTERNS.some((pattern) => pattern.test(normalized))
}

export function isAdvanceNextTaskIntent(text: string) {
  const normalized = text.replace(/\s+/g, "").trim()
  if (!normalized) {
    return false
  }

  if (ADVANCE_NEXT_TASK_NEGATION_PATTERNS.some((pattern) => pattern.test(normalized))) {
    return false
  }

  if (ADVANCE_NEXT_TASK_QUESTION_PATTERNS.some((pattern) => pattern.test(normalized))) {
    return false
  }

  return ADVANCE_NEXT_TASK_INTENT_PATTERNS.some((pattern) => pattern.test(normalized))
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
            prompt: "我已完成当前任务，请完成本轮学习计划。",
            tone: "success",
            kind: "advance_next_task",
          }
        : {
            label: "进入下一关",
            prompt: input.nextTaskTitle
              ? `进入下一关：${input.nextTaskTitle}`
              : "我已完成当前任务，请进入下一关。",
            tone: "success",
            kind: "advance_next_task",
          }
      : {
          label: "继续下一步",
          prompt: "请继续当前任务中的下一项练习，并告诉我先做什么。",
          tone: "primary",
          kind: "prefill",
        }

  return [...prefillActions, progressAction]
}

export function shouldRenderAssistantMessageActions(input: {
  isReviewMode: boolean
  role: "system" | "ai" | "user"
  actionCount: number
}) {
  return !input.isReviewMode && input.role === "ai" && input.actionCount > 0
}

export function shouldRenderAssistantNextStep(input: {
  isReviewMode: boolean
  nextStep?: string | null
}) {
  return !input.isReviewMode && Boolean(input.nextStep)
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
      /(已满足(?:本关|当前任务).*完成标准|(?:本关|当前任务).*已完成|(?:已经|已)(?:成功)?完成(?:了)?第\s*\d+\s*(?:步|关)|第\s*\d+\s*(?:步|关)(?:已|已经|顺利|成功){1,3}(?:完成|通过|达成)|可以点击.?我完成了.?(?:进入下一关|进入下一步)|可以结束(?:本关|当前任务))/.test(
        message.content,
      )
    ) {
      return true
    }

    return message.actionLabels.some((label) => /完成(?:本关|当前任务)|进入下一(?:关|步)/.test(label))
  })
}

export function shouldAutoAdvanceFromAdvanceIntent(input: {
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
    taskPatchStatus: "in_progress" | "blocked" | "completed" | null
  }>
}) {
  if (input.taskState === "completed") {
    // 任务已经处于完成态，再发“进入下一步/下一关”应通过 /task/complete 推进。
    return true
  }

  const lastAssistantMessage = [...input.messages]
    .reverse()
    .find((message) => message.role === "ai")

  if (!lastAssistantMessage) {
    return false
  }

  if (
    lastAssistantMessage.kind === "task_feedback"
    || lastAssistantMessage.taskPatchStatus === "completed"
    || lastAssistantMessage.interactionType === "completion_feedback"
  ) {
    return true
  }

  return shouldTreatAssistantContentAsCompletion(lastAssistantMessage.content)
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

export function resolveAssistantActionIntent(input: {
  actionKind: StableAssistantAction["kind"]
  messageKind: "system_goal" | "coach" | "user_input" | "task_feedback"
  taskPatchStatus?: "in_progress" | "blocked" | "completed" | null
  actionLabel: string
  nextStep?: string | null
}) {
  if (input.actionKind === "prefill") {
    return "prefill" as const
  }

  return shouldCompleteCurrentTaskFromAssistantAction({
    messageKind: input.messageKind,
    taskPatchStatus: input.taskPatchStatus,
    actionLabel: input.actionLabel,
    nextStep: input.nextStep,
  })
    ? "advance_next_task" as const
    : "prefill" as const
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
