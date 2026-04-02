export const FEEDBACK_TYPES = [
  "visual_design",
  "interaction_flow",
  "feature_request",
  "issue_report",
] as const

export const FEEDBACK_STATUSES = [
  "submitted",
  "in_review",
  "replied",
  "closed",
] as const

export const FEEDBACK_PRIORITIES = ["low", "medium", "high"] as const

export const FEEDBACK_REPLY_AUTHOR_TYPES = ["user", "admin", "system"] as const

export const FEEDBACK_SOURCES = ["settings_popover", "history_sidebar"] as const

export type FeedbackType = (typeof FEEDBACK_TYPES)[number]
export type FeedbackStatus = (typeof FEEDBACK_STATUSES)[number]
export type FeedbackPriority = (typeof FEEDBACK_PRIORITIES)[number]
export type FeedbackReplyAuthorType = (typeof FEEDBACK_REPLY_AUTHOR_TYPES)[number]
export type FeedbackSource = (typeof FEEDBACK_SOURCES)[number]

export type CreateFeedbackRequest = {
  feedbackType: FeedbackType
  title: string
  content: string
  contactMethod?: string | null
  source?: FeedbackSource | null
}

export type CreateFeedbackResponseData = {
  ticketId: string
}

export type FeedbackReplyItem = {
  id: string
  authorType: FeedbackReplyAuthorType
  authorId: string | null
  content: string
  createdAt: string
}

export type FeedbackTicketListItem = {
  id: string
  feedbackType: FeedbackType
  feedbackTypeLabel: string
  status: FeedbackStatus
  statusLabel: string
  title: string
  contentPreview: string
  contactMethod: string | null
  latestReplySnippet: string | null
  replyCount: number
  submittedAt: string
  updatedAt: string
  lastReplyAt: string | null
}

export type FeedbackMineListResponseData = {
  items: FeedbackTicketListItem[]
}

export type FeedbackTicketDetail = {
  id: string
  feedbackType: FeedbackType
  feedbackTypeLabel: string
  status: FeedbackStatus
  statusLabel: string
  title: string
  content: string
  contactMethod: string | null
  submittedAt: string
  updatedAt: string
  lastReplyAt: string | null
  replies: FeedbackReplyItem[]
}

export type FeedbackTicketDetailResponseData = FeedbackTicketDetail

export type AdminFeedbackListItem = FeedbackTicketListItem & {
  userId: string
  userNicknameSnapshot: string | null
  userAvatarUrl: string | null
  userPhoneSnapshot: string | null
  userContactEmailSnapshot: string | null
  priority: FeedbackPriority
  source: string | null
}

export type AdminFeedbackListStats = {
  ticketTotal: number
  pending: number
  inReview: number
  highPriority: number
}

export type AdminFeedbackListResponseData = {
  items: AdminFeedbackListItem[]
  total: number
  page: number
  limit: number
  stats: AdminFeedbackListStats
}

export type AdminFeedbackTicketDetailResponseData = FeedbackTicketDetail & {
  userId: string
  userNicknameSnapshot: string | null
  userPhoneSnapshot: string | null
  userContactEmailSnapshot: string | null
  priority: FeedbackPriority
  source: string | null
}

export type AdminReplyFeedbackRequest = {
  content: string
  status?: FeedbackStatus
}

export type AdminUpdateFeedbackStatusRequest = {
  status: FeedbackStatus
}
