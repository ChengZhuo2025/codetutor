import type {
  LearningCautionItem,
  LearningKnowledgeTag,
  LearningMission,
  LearningPlanSummary,
  LearningReply,
  LearningResume,
  LearningSupportOption,
  LearningTask,
  Message,
  QuickAction,
  RecentPracticeRound,
} from "@/features/learning/types"
import type { ProfileMeResponseData } from "@/lib/api/contracts/auth"

export type LearningInputType = "text" | "link" | "code"
export type LearningTaskState = "pending" | "in_progress" | "blocked" | "completed"
export type LearningInteractionType =
  | "teaching"
  | "blocked_help"
  | "task_review"
  | "completion_feedback"
  | "path_guidance"
  | "concept_qa"
export type LearningTaskPatchStatus = "in_progress" | "blocked" | "completed"

export type LearningTaskPatch = {
  taskId: string
  status: LearningTaskPatchStatus
  suggestedNextAction: string
}

export type LearningHistoryPagination = {
  hasMore: boolean
  nextBeforeSequenceNo: number | null
}

export type LearningMessageRequest = {
  conversationId?: string | null
  taskId?: string
  clientMessageId?: string
  interactionType?: LearningInteractionType
  inputType: LearningInputType
  content: string
  stream?: boolean
  clientContext?: {
    pagePath: string
    selectionMode?: "self_directed" | "preset_training"
    toolCode?: string
    pathCode?: string
    stepNo?: number
    locale?: string
  }
}

export type LearningAssistantMessageContract = {
  messageId: string
  currentGoal: string
  currentStep: string
  whyThisStep: string
  hintIfStuck: string
  knowledgePoints: string[]
  nextStepPreview: string
}

export type LearningMessageResponseData = {
  conversationId: string | null
  taskId: string
  message: Message
  taskState: LearningTaskState
  taskPatch?: LearningTaskPatch | null
}

export type LearningMessagesResponseData = {
  conversationId: string
  messages: Message[]
  pagination: LearningHistoryPagination
}

export type LearningRestartConversationResponseData = {
  restarted: boolean
  closedSessionId: string | null
  message?: string
}

export type LearningCurrentSessionResponseData = {
  conversationId: string | null
  historyPagination: LearningHistoryPagination
  pendingMaterialPlanDraft: {
    draftId: string
    intakeId: string
    updatedAt: string
  } | null
  path: {
    id: string
    status: "in_progress"
  }
  task: {
    taskId: string
    title: string
    status: LearningTaskState
  }
  profile: ProfileMeResponseData
  planSummary: LearningPlanSummary
  mission: LearningMission | null
  resume: LearningResume | null
  messages: Message[]
  quickActions: QuickAction[]
  supportOptions: LearningSupportOption[]
  responseSamples: LearningReply[]
  rightPanel: {
    currentStep: string
    whyThisStep: string
    completionCriteria: string
    hintIfStuck: string
    knowledgePoints: string[]
    masteryPoints: string[]
    cautions: LearningCautionItem[]
    lessonBrief: string
    practiceSteps: string[]
    submissionGuide: string
    checkpoints: string[]
    nextStepPreview: string
  }
  recentPracticeRounds: RecentPracticeRound[]
  tasks: LearningTask[]
  knowledgeTags: LearningKnowledgeTag[]
}

export type LearningPlanPreviewTaskContract = {
  taskNo: number
  title: string
  objective: string
  lessonBrief: string
  practiceSteps: string[]
  submissionGuide: string
  checkpoints: string[]
  acceptanceCriteria: string
  estimatedMinutes?: number
  sourceRefs: string[]
  masteryPoints: string[]
  cautions: LearningCautionItem[]
}

export type LearningPlanPreviewContract = {
  title: string
  goal: string
  tasks: LearningPlanPreviewTaskContract[]
}

export type MaterialPlanAsyncStatus =
  | "queued"
  | "extracting"
  | "planning"
  | "quality_checking"
  | "ready"
  | "failed"

export type PlanFromMaterialRequestContract = {
  links: string[]
  userGoal?: string | null
  weeklyHours?: number | null
  currentConstraints?: string | null
}

export type PlanFromMaterialResponseData = {
  processingMode: "async"
  intakeId: string
  runId: string
  draftId: string | null
  status: MaterialPlanAsyncStatus
}

export type PlanDraftRegenerateRequestContract = {
  links?: string[]
  userGoal?: string | null
  weeklyHours?: number | null
  currentConstraints?: string | null
}

export type MaterialIntakeStatusResponseData = {
  intakeId: string
  status: MaterialPlanAsyncStatus
  processingStage: string | null
  progressPercent: number | null
  progressMessage: string | null
  draftId: string | null
  runId: string | null
  errorCode: string | null
  errorMessage: string | null
}

export type LearningPlanDraftTaskDetailContract = {
  id: string
  taskNo: number
  position: number | null
  title: string
  objective: string
  lessonBrief: string
  practiceSteps: string[]
  submissionGuide: string
  checkpoints: string[]
  acceptanceCriteria: string
  estimatedMinutes: number | null
  sourceRefs: string[]
  goalAlignmentRefs: string[]
  masteryPoints: string[]
  cautions: LearningCautionItem[]
  recommendedForWeek1: boolean
  isUserEdited: boolean
}

export type LearningPlanDraftQualityReport = {
  status: "passed" | "pilot_fallback"
  checks: Array<{
    code: string
    passed: boolean
    message: string
  }>
  warnings: string[]
  selfCheck: {
    enabled: boolean
    decision: "pass" | "retry" | "fallback" | "skipped"
    reason: string | null
  }
  fallbackReason: string | null
}

export type LearningPlanDraftDetailResponseData = {
  draftId: string
  intakeId: string
  inputContext: {
    links: string[]
    userGoal: string | null
    weeklyHours: number | null
    currentConstraints: string | null
  }
  title: string
  goal: string | null
  status: "draft" | "confirmed" | "rejected" | "superseded"
  revisionNo: number
  qualityStatus: string
  qualityReport: LearningPlanDraftQualityReport | null
  alignmentTable: unknown
  week1TaskIds: string[]
  updatedAt: string
  tasks: LearningPlanDraftTaskDetailContract[]
}

export type LearningPlanDraftPatchTaskRequestContract = {
  id: string
  title?: string | null
  objective?: string | null
  lessonBrief?: string | null
  practiceSteps?: string[]
  submissionGuide?: string | null
  checkpoints?: string[]
  acceptanceCriteria?: string | null
  estimatedMinutes?: number | null
  masteryPoints?: string[]
  cautions?: LearningCautionItem[]
  recommendedForWeek1?: boolean
}

export type LearningPlanDraftPatchRequestContract = {
  title?: string | null
  goal?: string | null
  tasks?: LearningPlanDraftPatchTaskRequestContract[]
}

export type PlanDraftConfirmResponseData = {
  learningPathId: string
  currentTaskId: string
  redirectTo: string
}
