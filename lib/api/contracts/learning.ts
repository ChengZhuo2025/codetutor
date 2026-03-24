import type {
  LearningKnowledgeTag,
  LearningMission,
  LearningReply,
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
  messages: Message[]
  quickActions: QuickAction[]
  responseSamples: LearningReply[]
  rightPanel: {
    currentStep: string
    completionCriteria: string
    knowledgePoints: string[]
  }
  recentHistory: RecentSession[]
  tasks: LearningTask[]
  knowledgeTags: LearningKnowledgeTag[]
  tips: LearningTip[]
}
