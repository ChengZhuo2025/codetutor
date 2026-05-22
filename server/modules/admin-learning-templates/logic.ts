import "server-only"

import type {
  AdminLearningTemplateStepInput,
  AdminLearningTemplateUpsertRequest,
} from "@/lib/api/contracts/admin-learning-templates"
import { extractJsonObjectString } from "@/server/modules/learning-plans/json-parse.ts"

export type SyncCandidatePath = {
  id: string
  selection_mode: string
  status: string
  completed_steps: number
  metadata: Record<string, unknown> | null
}

export function isSyncableInitialSelfDirectedPath(path: SyncCandidatePath) {
  return (
    path.selection_mode === "self_directed"
    && (path.status === "active" || path.status === "interrupted")
    && path.completed_steps === 0
    && path.metadata?.seedSource === "api_onboarding_complete"
  )
}

function normalizeStringArray(value: unknown) {
  if (!Array.isArray(value)) {
    return []
  }

  return value
    .map((item) => (typeof item === "string" ? item.trim() : ""))
    .filter((item) => item.length > 0)
}

export function normalizeTemplateStep(input: AdminLearningTemplateStepInput): AdminLearningTemplateStepInput {
  return {
    stepId: input.stepId ?? null,
    title: input.title.trim(),
    summary: input.summary.trim(),
    focus: input.focus?.trim() || null,
    goal: input.goal.trim(),
    completionCriteria: input.completionCriteria?.trim() || null,
    reviewSummary: input.reviewSummary?.trim() || null,
    estimatedMinutes: input.estimatedMinutes ?? null,
    rewardScore: input.rewardScore,
    knowledgePoints: normalizeStringArray(input.knowledgePoints),
    keyPoints: normalizeStringArray(input.keyPoints),
    pitfalls: normalizeStringArray(input.pitfalls),
    lessonBrief: input.lessonBrief?.trim() || null,
    practiceSteps: normalizeStringArray(input.practiceSteps),
    submissionGuide: input.submissionGuide?.trim() || null,
    checkpoints: normalizeStringArray(input.checkpoints),
  }
}

export function validateTemplateUpsert(input: AdminLearningTemplateUpsertRequest) {
  const errors: string[] = []
  if (input.name.trim().length < 2) {
    errors.push("模板名称至少需要 2 个字符。")
  }
  if (input.name.trim().length > 128) {
    errors.push("模板名称最多 128 个字符。")
  }
  if (input.steps.length === 0) {
    errors.push("至少需要 1 个学习步骤。")
  }
  if (input.steps.length > 12) {
    errors.push("学习步骤最多 12 个。")
  }

  input.steps.forEach((step, index) => {
    const label = `第 ${index + 1} 步`
    if (step.title.trim().length < 2) {
      errors.push(`${label}标题至少需要 2 个字符。`)
    }
    if (step.summary.trim().length < 2) {
      errors.push(`${label}摘要至少需要 2 个字符。`)
    }
    if (step.goal.trim().length < 2) {
      errors.push(`${label}目标至少需要 2 个字符。`)
    }
    if (step.estimatedMinutes != null && step.estimatedMinutes < 0) {
      errors.push(`${label}预计时长不能为负数。`)
    }
    if (step.rewardScore < 0) {
      errors.push(`${label}奖励分不能为负数。`)
    }
  })

  return {
    ok: errors.length === 0,
    errors,
  }
}

export type GeneratedTemplatePayload = {
  name: string
  description: string
  preview: string[]
  steps: AdminLearningTemplateStepInput[]
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value))
}

function readString(value: unknown) {
  return typeof value === "string" ? value.trim() : ""
}

function readNumber(value: unknown, fallback: number) {
  return typeof value === "number" && Number.isFinite(value) ? Math.max(0, Math.round(value)) : fallback
}

export function parseGeneratedTemplateJson(rawContent: string): GeneratedTemplatePayload {
  let raw: unknown
  try {
    raw = JSON.parse(extractJsonObjectString(rawContent))
  } catch {
    throw new Error("模型返回内容不是合法 JSON。")
  }

  if (!isRecord(raw) || !Array.isArray(raw.steps)) {
    throw new Error("模型返回内容缺少 steps。")
  }

  const name = readString(raw.name)
  const description = readString(raw.description)
  const preview = normalizeStringArray(raw.preview)
  const steps = raw.steps.map((item) => {
    if (!isRecord(item)) {
      throw new Error("模型返回的 steps 中存在不合法项目。")
    }

    return normalizeTemplateStep({
      title: readString(item.title),
      summary: readString(item.summary),
      focus: readString(item.focus) || null,
      goal: readString(item.goal),
      completionCriteria: readString(item.completionCriteria) || null,
      reviewSummary: readString(item.reviewSummary) || null,
      estimatedMinutes: readNumber(item.estimatedMinutes, 30),
      rewardScore: readNumber(item.rewardScore, 20),
      knowledgePoints: normalizeStringArray(item.knowledgePoints),
      keyPoints: normalizeStringArray(item.keyPoints),
      pitfalls: normalizeStringArray(item.pitfalls),
      lessonBrief: readString(item.lessonBrief) || null,
      practiceSteps: normalizeStringArray(item.practiceSteps),
      submissionGuide: readString(item.submissionGuide) || null,
      checkpoints: normalizeStringArray(item.checkpoints),
      stepId: null,
    })
  })

  const payload = {
    name,
    description,
    preview,
    steps,
  }

  const validation = validateTemplateUpsert({
    toolCode: "placeholder",
    learningLevel: "beginner",
    name: payload.name,
    description: payload.description,
    preview: payload.preview,
    isActive: true,
    steps: payload.steps,
    changeReason: "validate-generated-template",
  })

  if (!validation.ok) {
    throw new Error(validation.errors.join(" "))
  }

  return payload
}
