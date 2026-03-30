import type {
  LearningCautionItem,
  LearningKnowledgeTag,
  LearningMission,
  LearningPlanSummary,
  LearningReply,
  LearningResume,
  LearningSupportOption,
  LearningTask,
  LearningTip,
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
}

export type LearningCurrentSessionResponseData = {
  conversationId: string | null
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
    nextStepPreview: string
  }
  recentPracticeRounds: RecentPracticeRound[]
  tasks: LearningTask[]
  knowledgeTags: LearningKnowledgeTag[]
  tips: LearningTip[]
}
