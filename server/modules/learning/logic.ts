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
      suggestedNextAction: "完成当前总结后，可进入下一关或回到地图查看进度",
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
          : "继续围绕当前关卡做最小验证，并把结果反馈回来",
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
}): LearningMessageResponseData {
  return {
    conversationId: input.conversationId,
    taskId: input.taskId,
    message: {
      id: Date.now(),
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
