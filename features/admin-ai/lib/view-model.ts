import {
  getLearningLevelLabel,
  getSelectionModeLabel,
} from "@/constants/learning-taxonomy"

export function formatDateTime(value: string | null) {
  if (!value) {
    return "暂无"
  }

  return new Intl.DateTimeFormat("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value))
}

export function formatPercent(value: number) {
  return `${Math.round(value * 100)}%`
}

export function formatNumber(value: number | null | undefined) {
  if (value == null) {
    return "暂无"
  }
  return new Intl.NumberFormat("zh-CN").format(value)
}

export function safeJsonParse(text: string) {
  const normalized = text.trim()
  if (!normalized) {
    return {}
  }

  return JSON.parse(normalized) as Record<string, unknown>
}

export function prettyJson(value: unknown) {
  return JSON.stringify(value ?? {}, null, 2)
}

export function getInvocationStatusMeta(status: string) {
  switch (status) {
    case "succeeded":
      return {
        label: "成功",
        className: "border-chart-3/20 bg-chart-3/10 text-chart-3",
      }
    case "failed":
      return {
        label: "失败",
        className: "border-chart-4/20 bg-chart-4/10 text-chart-4",
      }
    case "timed_out":
      return {
        label: "超时",
        className: "border-chart-2/20 bg-chart-2/10 text-chart-2",
      }
    case "cancelled":
      return {
        label: "取消",
        className: "border-slate-500/20 bg-slate-500/10 text-slate-700 dark:text-slate-300",
      }
    case "streaming":
      return {
        label: "流式中",
        className: "border-chart-1/20 bg-chart-1/10 text-chart-1",
      }
    default:
      return {
        label: status,
        className: "border-border bg-muted/60 text-muted-foreground",
      }
  }
}

export function getAdminAIInteractionTypeLabel(interactionType: string) {
  switch (interactionType) {
    case "teaching":
      return "教学对话"
    case "blocked_help":
      return "卡关求助"
    case "task_review":
      return "任务点评"
    case "completion_feedback":
      return "完成反馈"
    case "path_guidance":
      return "路径引导"
    case "concept_qa":
      return "概念问答"
    case "media_vision_extract":
      return "图片理解"
    case "media_audio_transcribe":
      return "语音转写"
    default:
      return interactionType
  }
}

export function getAdminAIAgentScenarioTypeLabel(scenarioType: string) {
  return getAdminAIInteractionTypeLabel(scenarioType)
}

export function getAdminAILearningLevelLabel(learningLevel: string | null | undefined, fallbackLabel: string) {
  if (!learningLevel) {
    return fallbackLabel
  }

  return getLearningLevelLabel(learningLevel, "short")
}

export function getAdminAISelectionModeLabel(selectionMode: string | null | undefined, fallbackLabel: string) {
  if (!selectionMode) {
    return fallbackLabel
  }

  return getSelectionModeLabel(selectionMode, "short")
}

export function getAdminAIModelFamilyLabel(modelFamily: string | null | undefined) {
  switch (modelFamily) {
    case "chat":
      return "聊天"
    case "reasoning":
      return "推理"
    case "asr":
      return "ASR"
    case "tts":
      return "TTS"
    case "vision":
      return "视觉"
    case "other":
      return "其他"
    default:
      return "未分类"
  }
}

export function getAdminAIModelRuntimeCapabilityLabel(capability: string) {
  switch (capability) {
    case "asr":
      return "ASR 转写"
    case "vision":
      return "视觉 / OCR"
    case "quality_check":
      return "质量校验"
    case "tts":
      return "TTS"
    default:
      return capability
  }
}

export function getAdminAIModelConnectionTestModeLabel(mode: string | null | undefined) {
  switch (mode) {
    case "chat":
      return "Chat 探测"
    case "asr":
    case "audio_transcription":
      return "ASR 探测"
    case "tts":
      return "TTS 探测"
    case "models_list":
      return "/models 连通性"
    default:
      return "自动推断"
  }
}
