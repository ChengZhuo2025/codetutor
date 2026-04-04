import { getLearningLevelLabel, getSelectionModeLabel } from "@/constants/learning-taxonomy"
import { getRankName } from "@/constants/ranks"
import type { AdminFeedbackListItem } from "@/lib/api/contracts/feedback"
import type { AdminUserDetailResponseData, AdminUserListItem } from "@/lib/api/contracts/admin-users"

export type UserListStats = {
  totalMatchingUsers: number
  visibleUsers: number
  onboardingCompletedUsers: number
  activePlanUsers: number
  streakingUsers: number
  deletedUsers: number
}

export type UserDetailFeedbackSummary = {
  total: number
  pending: number
  latestTicket: Pick<AdminFeedbackListItem, "id" | "title" | "status" | "statusLabel" | "submittedAt"> | null
}

export function getUserTaskCompletionPercent(user: Pick<
  AdminUserDetailResponseData,
  | "activePathCompletionPercent"
  | "activePathCompletedTaskCount"
  | "activePathInProgressTaskCount"
  | "activePathPendingTaskCount"
  | "activePathBlockedTaskCount"
>) {
  if (typeof user.activePathCompletionPercent === "number") {
    return Math.max(0, Math.min(100, Math.round(user.activePathCompletionPercent)))
  }

  const total =
    user.activePathCompletedTaskCount
    + user.activePathInProgressTaskCount
    + user.activePathPendingTaskCount
    + user.activePathBlockedTaskCount

  if (total <= 0) {
    return 0
  }

  return Math.round((user.activePathCompletedTaskCount / total) * 100)
}

export function buildUserListStats(items: AdminUserListItem[], totalMatchingUsers: number): UserListStats {
  return {
    totalMatchingUsers,
    visibleUsers: items.length,
    onboardingCompletedUsers: items.filter((item) => item.onboardingCompleted === true).length,
    activePlanUsers: items.filter((item) => Boolean(item.activePathCode)).length,
    streakingUsers: items.filter((item) => (item.streakDays ?? 0) > 0).length,
    deletedUsers: items.filter((item) => Boolean(item.deletedAt)).length,
  }
}

export function formatAdminLearningLevelLabel(code: string | null) {
  return code ? getLearningLevelLabel(code, "short") : "未标注"
}

export function formatAdminSelectionModeLabel(code: string | null) {
  return code ? getSelectionModeLabel(code, "short") : "未标注"
}

export function formatAdminRankLabel(code: string | null) {
  return code ? getRankName(code) : "未定级"
}

export function buildUserDetailFeedbackSummary(
  items: AdminFeedbackListItem[],
): UserDetailFeedbackSummary {
  const latestTicket =
    [...items].sort((a, b) => {
      return new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime()
    })[0] ?? null

  return {
    total: items.length,
    pending: items.filter((item) => item.status === "submitted" || item.status === "in_review").length,
    latestTicket: latestTicket
      ? {
          id: latestTicket.id,
          title: latestTicket.title,
          status: latestTicket.status,
          statusLabel: latestTicket.statusLabel,
          submittedAt: latestTicket.submittedAt,
        }
      : null,
  }
}
