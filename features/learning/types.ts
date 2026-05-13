import type { LucideIcon } from "lucide-react"
import type { StructuredLearningMessageContent } from "@/lib/learning/structured-message"

export type MessageRole = "system" | "ai" | "user"

export type MessageKind =
  | "system_goal"
  | "coach"
  | "user_input"
  | "task_feedback"

export type MessageAttachment = {
  id?: string
  type: "image" | "audio"
  url?: string
  name: string
  mimeType?: string
  sizeBytes?: number
  durationMs?: number | null
  processingStatus?: "pending" | "processing" | "completed" | "failed"
  extractedText?: string | null
  visualSummary?: string | null
  transcriptText?: string | null
  errorMessage?: string | null
}

export type MessageTaskPatchStatus = "in_progress" | "blocked" | "completed"

export type MessageTaskPatch = {
  taskId: string
  status: MessageTaskPatchStatus
  suggestedNextAction: string
}

export type Message = {
  id: number
  role: MessageRole
  kind: MessageKind
  title?: string
  content: string
  structuredContent?: StructuredLearningMessageContent | null
  taskPatch?: MessageTaskPatch | null
  xp?: number
  nextStep?: string
  attachment?: MessageAttachment
  attachments?: MessageAttachment[]
}

export type QuickActionCategory = "progress" | "help" | "hint"

export type QuickAction = {
  label: string
  tone: "primary" | "secondary" | "warning"
  helper: string
  category: QuickActionCategory
}

export type LearningReply = {
  trigger?: string
  kind: Extract<MessageKind, "coach" | "task_feedback">
  title?: string
  content: string
  xp?: number
  nextStep?: string
}

export type LearningResume = {
  title: string
  summary: string
  lastSeenLabel: string
  ctaLabel: string
}

export type LearningPlanSummary = {
  selectedToolName: string
  learningLevelLabel: string
  selectionModeLabel: string
  selectionMode: "self_directed" | "preset_training"
  pathName?: string
  hasMaterialPlan?: boolean
}

export type LearningSupportMode = "hint" | "breakdown" | "minimal_example"

export type LearningSupportOption = {
  mode: LearningSupportMode
  label: string
  description: string
  prompt: string
}

export type LearnSidebarNavItem = {
  href: string
  label: string
  icon: LucideIcon
  active: boolean
}

export type RecentPracticeRound = {
  id: string
  taskTitle: string
  stageLabel: string
  lastActiveLabel: string
  status: "completed" | "in_progress" | "paused"
}

export type LearningTask = {
  id: number
  label: string
  done: boolean
  current?: boolean
  locked?: boolean
}

export type LearningKnowledgeTag = {
  label: string
  color: string
}

export type LearningCautionItem = {
  text: string
  isTrap?: boolean
}

export type LearningMission = {
  title: string
  tool: string
  stageLabel: string
  goal: string
  summary: string
  estimatedTime: string
  reward: string
  progressLabel: string
  progressPercent: number
  coachCue: string
  nextUnlockTitle: string
  nextUnlockSummary: string
  /** 为 true 时表示当前已是路径上最后一关，预告区应展示收尾语义而非「下一关」 */
  nextPreviewIsFinal: boolean
}
