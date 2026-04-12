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
        className: "border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
      }
    case "failed":
      return {
        label: "失败",
        className: "border-rose-500/20 bg-rose-500/10 text-rose-700 dark:text-rose-300",
      }
    case "timed_out":
      return {
        label: "超时",
        className: "border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-300",
      }
    case "cancelled":
      return {
        label: "取消",
        className: "border-slate-500/20 bg-slate-500/10 text-slate-700 dark:text-slate-300",
      }
    case "streaming":
      return {
        label: "流式中",
        className: "border-sky-500/20 bg-sky-500/10 text-sky-700 dark:text-sky-300",
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
