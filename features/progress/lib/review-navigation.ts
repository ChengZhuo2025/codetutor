import { ROUTES } from "@/constants/routes"

type ResolveStageReviewSummaryInput = {
  title: string
  reviewSummary?: string | null
  keyPoints?: string[]
  summary?: string | null
  goal?: string | null
}

function readFirstNonEmptyText(values: Array<string | null | undefined>) {
  for (const value of values) {
    if (typeof value !== "string") {
      continue
    }

    const trimmed = value.trim()
    if (trimmed.length > 0) {
      return trimmed
    }
  }

  return null
}

export function resolveStageReviewSummary(input: ResolveStageReviewSummaryInput) {
  const explicitSummary = readFirstNonEmptyText([input.reviewSummary])
  if (explicitSummary) {
    return explicitSummary
  }

  const keyPoints = Array.isArray(input.keyPoints)
    ? input.keyPoints
        .map((point) => point.trim())
        .filter((point) => point.length > 0)
        .slice(0, 2)
    : []

  if (keyPoints.length > 0) {
    return `你已经完成「${input.title}」，本关重点包括：${keyPoints.join("；")}。`
  }

  const fallbackText = readFirstNonEmptyText([input.summary, input.goal])
  if (fallbackText) {
    return fallbackText
  }

  return `你已经完成「${input.title}」，可以回看这一关的关键做法与结果。`
}

export function buildLearningReviewHref(input: {
  taskId: string
  reviewSessionId?: string | null
}) {
  const params = new URLSearchParams()
  params.set("taskId", input.taskId)

  if (
    typeof input.reviewSessionId === "string"
    && input.reviewSessionId.trim().length > 0
  ) {
    params.set("sessionId", input.reviewSessionId)
  }

  return `${ROUTES.learn}?${params.toString()}`
}
