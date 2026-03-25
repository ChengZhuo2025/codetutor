import type {
  LearningKnowledgeTag,
  LearningMission,
  LearningReply,
  LearningResume,
  LearningSupportOption,
  LearningTask,
  LearningTip,
  Message,
  QuickAction,
  RecentSession,
} from "@/features/learning/types"
import type { ProfileMeResponseData } from "@/lib/api/contracts/auth"

export type LearningInputType = "text" | "link" | "code"
export type LearningTaskState = "pending" | "in_progress" | "blocked" | "completed"

export type LearningMessageRequest = {
  conversationId?: string
  taskId?: string
  inputType: LearningInputType
  content: string
  clientContext?: {
    pagePath: string
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
  conversationId: string
  taskId: string
  assistantMessage: LearningAssistantMessageContract
  taskState: LearningTaskState
}

export type LearningCurrentSessionResponseData = {
  conversationId: string
  task: {
    taskId: string
    title: string
    status: LearningTaskState
  }
  profile: ProfileMeResponseData
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
    nextStepPreview: string
  }
  recentHistory: RecentSession[]
  tasks: LearningTask[]
  knowledgeTags: LearningKnowledgeTag[]
  tips: LearningTip[]
}
