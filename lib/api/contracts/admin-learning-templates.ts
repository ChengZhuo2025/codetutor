export const ADMIN_LEARNING_TEMPLATE_STATUSES = ["all", "active", "inactive"] as const

export type AdminLearningTemplateStatus = (typeof ADMIN_LEARNING_TEMPLATE_STATUSES)[number]

export type AdminLearningTemplateToolOption = {
  code: string
  name: string
}

export type AdminLearningTemplateStepInput = {
  stepId?: string | null
  title: string
  summary: string
  focus?: string | null
  goal: string
  completionCriteria?: string | null
  reviewSummary?: string | null
  estimatedMinutes?: number | null
  rewardScore: number
  knowledgePoints: string[]
  keyPoints: string[]
  pitfalls: string[]
  lessonBrief?: string | null
  practiceSteps: string[]
  submissionGuide?: string | null
  checkpoints: string[]
}

export type AdminLearningTemplateUpsertRequest = {
  toolCode: string
  learningLevel: "beginner" | "intermediate" | "advanced"
  code?: string | null
  name: string
  description?: string | null
  preview: string[]
  agentCode?: string | null
  isActive: boolean
  steps: AdminLearningTemplateStepInput[]
  changeReason: string
}

export type AdminLearningTemplateStep = AdminLearningTemplateStepInput & {
  stepId: string
  stepNo: number
}

export type AdminLearningTemplateListItem = {
  templateId: string
  toolCode: string
  toolName: string
  learningLevel: "beginner" | "intermediate" | "advanced"
  learningLevelLabel: string
  code: string
  name: string
  description: string | null
  stageCount: number
  isActive: boolean
  syncablePathCount: number
  updatedAt: string
}

export type AdminLearningTemplateListResponseData = {
  items: AdminLearningTemplateListItem[]
  total: number
  page: number
  limit: number
  toolOptions: AdminLearningTemplateToolOption[]
}

export type AdminLearningTemplateDetailResponseData = {
  template: AdminLearningTemplateListItem & {
    preview: string[]
    agentCode: string | null
    createdAt: string
  }
  steps: AdminLearningTemplateStep[]
}

export type AdminLearningTemplateGenerateRequest = {
  toolCode: string
  learningLevel: "beginner" | "intermediate" | "advanced"
  operatorGoal?: string | null
  currentTemplate?: {
    name?: string | null
    description?: string | null
    preview?: string[]
    steps?: AdminLearningTemplateStepInput[]
  } | null
}

export type AdminLearningTemplateGenerateResponseData = {
  generated: {
    name: string
    description: string
    preview: string[]
    steps: AdminLearningTemplateStepInput[]
  }
  agentCode: string
  providerCode: string
  modelCode: string
  invocationId: string | null
  usage: {
    promptTokens: number
    completionTokens: number
    totalTokens: number
  }
  latencyMs: number
}

export type AdminLearningTemplateSyncResponseData = {
  templateId: string
  matchedPathCount: number
  syncedPathCount: number
  skippedPathCount: number
}
