import type { AdminLearningPathListItem } from "@/lib/api/contracts/admin-learning"

function formatStatusLabel(status: string) {
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
    default:
      return status
  }
}

function csvEscape(value: string | number) {
  return `"${String(value).replace(/"/g, '""')}"`
}

export function buildAdminLearningPathExportCsv(rows: AdminLearningPathListItem[]) {
  const headers = [
    "路径ID",
    "用户ID",
    "用户昵称",
    "用户邮箱",
    "计划名称",
    "路径代码",
    "工具",
    "学习等级",
    "计划模式",
    "状态",
    "进度",
    "已完成任务",
    "进行中任务",
    "阻塞任务",
    "总任务数",
    "累计XP",
    "开始时间",
    "最近学习时间",
    "更新时间",
  ]

  const lines = [
    headers.join(","),
    ...rows.map((row) => {
      const cells = [
        row.pathId,
        row.userId,
        row.userNickname ?? "",
        row.userEmail ?? "",
        row.pathName,
        row.pathCode,
        row.toolName,
        row.learningLevelLabel,
        row.selectionModeLabel,
        formatStatusLabel(row.status),
        `${row.progressPercent}%`,
        row.completedTaskCount,
        row.inProgressTaskCount,
        row.blockedTaskCount,
        row.totalTaskCount,
        row.xpEarned,
        row.startedAt,
        row.lastLearningAt ?? "",
        row.updatedAt,
      ]

      return cells.map(csvEscape).join(",")
    }),
  ]

  return `\uFEFF${lines.join("\n")}`
}
