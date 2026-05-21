import type {
  LearningInteractionType,
  LearningMessageResponseData,
  LearningTaskPatch,
  LearningTaskPatchStatus,
  LearningTaskState,
} from "../../../lib/api/contracts/learning.ts"
import type { MessageKind } from "../../../features/learning/types.ts"
import type { StructuredLearningMessageContent } from "../../../lib/learning/structured-message.ts"
import {
  LearningAIProviderError,
  LearningValidationError,
} from "./errors.ts"

export type LearningTaskPersistentStatus =
  | "not_started"
  | "in_progress"
  | "blocked"
  | "completed"
  | "archived"

export type LearningRouteErrorResult = {
  code: "VALIDATION_FAILED" | "AI_PROVIDER_ERROR" | "INTERNAL_ERROR"
  status: number
  message: string
}

type JsonRecord = Record<string, unknown>

function isGeneratedSelfDirectedPath(path: {
  selection_mode: "self_directed" | "preset_training"
  metadata?: JsonRecord | null
}) {
  const seedSource =
    typeof path.metadata?.seedSource === "string"
      ? path.metadata.seedSource
      : typeof path.metadata?.seed_source === "string"
        ? path.metadata.seed_source
        : null

  return path.selection_mode === "self_directed"
    && (
      seedSource === "plan_draft_confirmed"
      || seedSource === "api_onboarding_complete"
    )
}

export function doesAgentBindingMatchLearningScene(
  binding: {
    tool_id: string | null
    learning_level: "beginner" | "intermediate" | "advanced" | null
    selection_mode: "self_directed" | "preset_training" | null
    path_id: string | null
    step_no: number | null
  },
  input: {
    tool: { id: string }
    path: {
      learning_level: "beginner" | "intermediate" | "advanced"
      selection_mode: "self_directed" | "preset_training"
      template_path_id: string | null
      metadata?: JsonRecord | null
    }
    step: {
      step_no: number
    }
  },
) {
  if (binding.tool_id && binding.tool_id !== input.tool.id) {
    return false
  }

  if (binding.learning_level && binding.learning_level !== input.path.learning_level) {
    return false
  }

  if (binding.selection_mode && binding.selection_mode !== input.path.selection_mode) {
    return false
  }

  if (binding.path_id && binding.path_id !== input.path.template_path_id) {
    if (!isGeneratedSelfDirectedPath(input.path)) {
      return false
    }
  }

  if (binding.step_no && binding.step_no !== input.step.step_no) {
    return false
  }

  return true
}

export function mapPersistentTaskStatusToViewState(
  status: LearningTaskPersistentStatus,
): LearningTaskState {
  if (status === "completed") {
    return "completed"
  }

  if (status === "in_progress") {
    return "in_progress"
  }

  if (status === "blocked") {
    return "blocked"
  }

  return "pending"
}

export function resolveLearningResponseMode(
  acceptHeader: string | null,
  stream?: boolean,
) {
  if (stream === true) {
    return "sse" as const
  }

  if (acceptHeader?.includes("text/event-stream")) {
    return "sse" as const
  }

  return "json" as const
}

function isRequestedLearningInteractionType(
  requested: string | null | undefined,
): requested is LearningInteractionType {
  return requested === "teaching"
    || requested === "blocked_help"
    || requested === "task_review"
    || requested === "completion_feedback"
    || requested === "path_guidance"
    || requested === "concept_qa"
}

export function resolveLearningUserInteractionType(input: {
  requestedInteractionType: string | null | undefined
  content: string
  taskStatus: LearningTaskPersistentStatus
}): LearningInteractionType {
  if (isRequestedLearningInteractionType(input.requestedInteractionType)) {
    return input.requestedInteractionType
  }

  if (input.taskStatus === "blocked") {
    return "blocked_help"
  }

  if (/(卡住|报错|错误|error|failed|失败)/i.test(input.content)) {
    return "blocked_help"
  }

  if (/(复盘|回顾|review|总结)/i.test(input.content)) {
    return "task_review"
  }

  if (/(下一步|接下来|继续学|继续做)/i.test(input.content)) {
    return "path_guidance"
  }

  if (/(安装|初始化|配置|环境|setup|install|configure|config)/i.test(input.content)) {
    return "teaching"
  }

  // 自由对话兜底：未命中任何学习关键词的输入（包含偏题、闲聊、自然口吻提问等）
  // 都路由到概念问答 agent。learning-concept-qa-coach 的 system prompt 会对偏题
  // 给出一两句简短回应并引回当前任务，避免 teaching agent 因结构化生成卡顿超时。
  return "concept_qa"
}

export function resolveAgentBindingInteractionFallbacks(
  interactionType: LearningInteractionType,
): LearningInteractionType[] {
  if (
    interactionType === "teaching"
    || interactionType === "path_guidance"
    || interactionType === "task_review"
  ) {
    return [interactionType, "concept_qa"]
  }

  return [interactionType]
}

export function hasLearningResumeHistory(input: {
  completedSteps: number
  currentTaskLastConversationId: string | null
  persistedMessageCount: number
}) {
  if (input.completedSteps > 0) {
    return true
  }

  if (input.persistedMessageCount > 0) {
    return true
  }

  return typeof input.currentTaskLastConversationId === "string"
    && input.currentTaskLastConversationId.trim().length > 0
}

function buildBlockedHelpNextAction(content: string) {
  if (/(截图|image|图片)/i.test(content)) {
    return "补充截图对应的报错位置、触发步骤和当前看到的结果"
  }

  if (/(命令|终端|cli|console)/i.test(content)) {
    return "补充当前执行命令、终端输出和你预期的结果"
  }

  if (/(报错|错误|error|failed|失败)/i.test(content)) {
    return "补充完整报错文本、触发步骤和最近一次修改内容"
  }

  return "补充当前操作步骤、实际结果和你预期的差异点"
}

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
  /可(?:以)?进入下一关/,
  /可(?:以)?进入下一步/,
  /(?:你|您)?已(?:经)?(?:成功)?完成(?:了)?(?:当前任务|这个任务|这项任务)(?![的之])/,
  /(?:当前任务|这个任务|这项任务)(?:的)?(?:学习|内容|目标|任务|练习|挑战)?(?:已经?|顺利|成功){1,3}(?:完成|结束|达成|通过)/,
  /(?:你|您)?已(?:经)?(?:成功)?完成(?:了)?(?:本关|这一关|当前(?:这)?关)(?![的之])/,
  /(?:本关|这一关|当前关卡)(?:的)?(?:学习|内容|目标|任务|练习|关卡|挑战)?(?:已经?|顺利|成功){1,3}(?:完成|结束|过关|达成|通过)/,
  /已达成本关(?:目标|目的|完成标准)/,
  /(?:本关|这一关).{0,8}(?:全部|所有)?(?:检查点|验收点).{0,8}(?:通过|达成|完成)/,
]

export function shouldTreatAssistantResponseAsCompletion(content: string) {
  const normalized = content.replace(/\s+/g, "").trim()
  if (!normalized) {
    return false
  }

  if (ASSISTANT_COMPLETION_NEGATION_PATTERNS.some((pattern) => pattern.test(normalized))) {
    return false
  }

  return ASSISTANT_COMPLETION_PATTERNS.some((pattern) => pattern.test(normalized))
}

export function resolveAssistantInteractionType(input: {
  requestedInteractionType: LearningInteractionType
  assistantContent: string
}) {
  if (input.requestedInteractionType === "completion_feedback") {
    return "completion_feedback" as const
  }

  return shouldTreatAssistantResponseAsCompletion(input.assistantContent)
    ? "completion_feedback"
    : input.requestedInteractionType
}

export function finalizeAssistantTaskPatch(input: {
  taskId: string
  initialTaskPatch: LearningTaskPatch | null
  assistantContent: string
}) {
  if (shouldTreatAssistantResponseAsCompletion(input.assistantContent)) {
    return {
      taskId: input.taskId,
      status: "completed" as const,
      suggestedNextAction: "你已达到当前任务完成标准，可点击“我完成了”进入下一步。",
    }
  }

  return input.initialTaskPatch
}

export function deriveTaskPatch(input: {
  taskId: string
  interactionType: LearningInteractionType
  currentStatus: LearningTaskPersistentStatus
  content: string
}): LearningTaskPatch | null {
  const normalizedContent = input.content.trim()

  if (input.interactionType === "blocked_help") {
    return {
      taskId: input.taskId,
      status: "blocked",
      suggestedNextAction: buildBlockedHelpNextAction(normalizedContent),
    }
  }

  if (input.interactionType === "completion_feedback") {
    return {
      taskId: input.taskId,
      status: "completed",
      suggestedNextAction: "你已达到当前任务完成标准，可点击“我完成了”进入下一步。",
    }
  }

  if (input.currentStatus === "completed") {
    return null
  }

  return {
    taskId: input.taskId,
    status: "in_progress",
    suggestedNextAction:
      input.interactionType === "path_guidance"
        ? "先按当前建议完成一个最小验证结果，再继续扩展"
        : input.interactionType === "task_review"
          ? "先根据复盘建议修正一个最关键缺口，再反馈结果"
          : "继续围绕当前任务做最小验证，并把结果反馈回来",
  }
}

export function shouldPersistTaskPatch(
  patch: LearningTaskPatch | null,
  currentStatus: LearningTaskPersistentStatus,
) {
  if (!patch) {
    return false
  }

  if (patch.status === "completed") {
    return false
  }

  return patch.status !== currentStatus
}

export function buildIdempotentReplayResponse(input: {
  conversationId: string
  taskId: string
  taskStatus: LearningTaskPersistentStatus
  assistantTitle: string
  assistantKind: MessageKind
  assistantContent: string
  structuredContent?: StructuredLearningMessageContent | null
  taskPatch?: LearningTaskPatch | null
  speechMessageId?: string
}): LearningMessageResponseData {
  return {
    conversationId: input.conversationId,
    taskId: input.taskId,
    message: {
      id: Date.now(),
      speechMessageId: input.speechMessageId,
      role: "ai",
      kind: input.assistantKind,
      title: input.assistantTitle,
      content: input.assistantContent,
      structuredContent: input.structuredContent ?? null,
      taskPatch: input.taskPatch ?? null,
    },
    taskState: mapPersistentTaskStatusToViewState(input.taskStatus),
    taskPatch: input.taskPatch ?? null,
  }
}

export function parseStoredTaskPatchMetadata(input: {
  taskId: string
  metadata: JsonRecord | null | undefined
}): LearningTaskPatch | null {
  if (!input.taskId) {
    return null
  }

  const metadata = input.metadata ?? {}
  const status =
    metadata.taskPatchStatus === "in_progress"
    || metadata.taskPatchStatus === "blocked"
    || metadata.taskPatchStatus === "completed"
      ? metadata.taskPatchStatus
      : null
  const suggestedNextAction =
    typeof metadata.taskPatchSuggestedNextAction === "string"
      ? metadata.taskPatchSuggestedNextAction
      : null

  if (!status || !suggestedNextAction) {
    return null
  }

  return {
    taskId: input.taskId,
    status,
    suggestedNextAction,
  }
}

export function classifyLearningRouteError(
  error: unknown,
): LearningRouteErrorResult {
  if (error instanceof LearningValidationError) {
    return {
      code: "VALIDATION_FAILED",
      status: 422,
      message: error.message,
    }
  }

  if (error instanceof LearningAIProviderError) {
    return {
      code: "AI_PROVIDER_ERROR",
      status: 502,
      message: error.message,
    }
  }

  return {
    code: "INTERNAL_ERROR",
    status: 500,
    message: error instanceof Error ? error.message : "发送学习消息失败",
  }
}

export function taskPatchStatusToPersistentStatus(
  status: LearningTaskPatchStatus,
): Extract<LearningTaskPersistentStatus, "in_progress" | "blocked" | "completed"> {
  return status
}
