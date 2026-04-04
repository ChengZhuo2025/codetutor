import type { AdminUserDetailResponseData } from "@/lib/api/contracts/admin-users"
import { getLearningLevelLabel, getSelectionModeLabel } from "@/constants/learning-taxonomy"
import { getRankName } from "@/constants/ranks"

function formatAdminPathStatusLabel(status: string | null) {
  switch (status) {
    case "active":
      return "进行中"
    case "interrupted":
      return "已中断"
    case "completed":
      return "已完成"
    case "abandoned":
      return "已放弃"
    case "archived":
      return "已归档"
    case null:
      return ""
    default:
      return status
  }
}

function formatAdminLearningLevelLabel(code: string | null) {
  return code ? getLearningLevelLabel(code, "short") : "未标注"
}

function formatAdminSelectionModeLabel(code: string | null) {
  return code ? getSelectionModeLabel(code, "short") : "未标注"
}

function formatAdminRankLabel(code: string | null) {
  return code ? getRankName(code) : "未定级"
}

function csvEscape(value: string | number) {
  return `"${String(value).replace(/"/g, '""')}"`
}

export function buildAdminUsersExportCsv(rows: AdminUserDetailResponseData[]) {
  const headers = [
    "用户ID",
    "昵称",
    "手机号",
    "联系邮箱",
    "Auth邮箱",
    "微信",
    "主工具",
    "当前计划",
    "计划状态",
    "学习等级",
    "计划模式",
    "计划完成率",
    "当前计划已完成任务",
    "当前计划进行中任务",
    "当前计划待开始任务",
    "当前计划阻塞任务",
    "当前积分",
    "当前段位",
    "连续打卡天数",
    "最近学习时间",
    "软删时间",
    "软删原因",
    "资料更新时间",
  ]

  const lines = [
    headers.join(","),
    ...rows.map((user) => {
      const cells = [
        user.userId,
        user.nickname ?? "",
        user.authPhone ?? "",
        user.contactEmail ?? "",
        user.authEmail ?? "",
        user.wechat ?? "",
        user.primaryToolName ?? "",
        user.activePathName ?? "",
        formatAdminPathStatusLabel(user.activePathStatus),
        formatAdminLearningLevelLabel(user.activePathLearningLevel),
        formatAdminSelectionModeLabel(user.activePathSelectionMode),
        user.activePathCompletionPercent ?? "",
        user.activePathCompletedTaskCount,
        user.activePathInProgressTaskCount,
        user.activePathPendingTaskCount,
        user.activePathBlockedTaskCount,
        user.currentScore ?? "",
        formatAdminRankLabel(user.currentRankCode),
        user.streakDays ?? "",
        user.lastLearningAt ?? "",
        user.deletedAt ?? "",
        user.deletedReason ?? "",
        user.profileUpdatedAt ?? "",
      ]

      return cells.map(csvEscape).join(",")
    }),
  ]

  return `\uFEFF${lines.join("\n")}`
}
