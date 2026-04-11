import type { LucideIcon } from "lucide-react"
import {
  Activity,
  BookOpen,
  CheckCircle,
  ClipboardList,
  Clock,
  Flame,
  MessageSquare,
  Users,
} from "lucide-react"
import { ADMIN_ROUTES } from "@/constants/routes"
import type { AdminDashboardOverviewResponseData } from "@/lib/api/contracts/admin"

export type DashboardStatMetricKey = keyof AdminDashboardOverviewResponseData["metrics"]

export type DashboardStatCardDef = {
  metricKey: DashboardStatMetricKey
  label: string
  href: string
  icon: LucideIcon
  iconColorClass: string
  iconBgClass: string
  /** 展示 value 的格式 */
  format: "int" | "percent1" | "latencyMs"
  requiresAi: boolean
}

export const DASHBOARD_STAT_CARDS: DashboardStatCardDef[] = [
  {
    metricKey: "todayNewUsers",
    label: "今日新增用户",
    href: ADMIN_ROUTES.users,
    icon: Users,
    iconColorClass: "text-blue-700 dark:text-blue-400",
    iconBgClass: "bg-blue-100 dark:bg-blue-400/10",
    format: "int",
    requiresAi: false,
  },
  {
    metricKey: "todayOnboardingCompleted",
    label: "今日完成引导",
    href: ADMIN_ROUTES.users,
    icon: CheckCircle,
    iconColorClass: "text-emerald-700 dark:text-green-400",
    iconBgClass: "bg-emerald-100 dark:bg-green-400/10",
    format: "int",
    requiresAi: false,
  },
  {
    metricKey: "activeLearningPaths",
    label: "活跃学习计划",
    href: ADMIN_ROUTES.learning,
    icon: BookOpen,
    iconColorClass: "text-violet-700 dark:text-purple-400",
    iconBgClass: "bg-violet-100 dark:bg-purple-400/10",
    format: "int",
    requiresAi: false,
  },
  {
    metricKey: "todayCompletedTasks",
    label: "今日完成任务",
    href: ADMIN_ROUTES.learning,
    icon: ClipboardList,
    iconColorClass: "text-orange-800 dark:text-orange-400",
    iconBgClass: "bg-orange-100 dark:bg-orange-400/10",
    format: "int",
    requiresAi: false,
  },
  {
    metricKey: "todayCheckinUsers",
    label: "今日打卡人数",
    href: ADMIN_ROUTES.users,
    icon: Flame,
    iconColorClass: "text-red-700 dark:text-red-400",
    iconBgClass: "bg-red-100 dark:bg-red-400/10",
    format: "int",
    requiresAi: false,
  },
  {
    metricKey: "pendingFeedback",
    label: "待处理反馈",
    href: ADMIN_ROUTES.feedback,
    icon: MessageSquare,
    iconColorClass: "text-amber-800 dark:text-yellow-400",
    iconBgClass: "bg-amber-100 dark:bg-yellow-400/10",
    format: "int",
    requiresAi: false,
  },
  {
    metricKey: "aiSuccessRate24h",
    label: "AI 调用成功率",
    href: ADMIN_ROUTES.ai,
    icon: Activity,
    iconColorClass: "text-teal-700 dark:text-cyan-400",
    iconBgClass: "bg-teal-100 dark:bg-cyan-400/10",
    format: "percent1",
    requiresAi: true,
  },
  {
    metricKey: "aiAvgLatencyMs24h",
    label: "AI 平均延迟",
    href: ADMIN_ROUTES.ai,
    icon: Clock,
    iconColorClass: "text-indigo-800 dark:text-indigo-400",
    iconBgClass: "bg-indigo-100 dark:bg-indigo-400/10",
    format: "latencyMs",
    requiresAi: true,
  },
]

export const FEEDBACK_STATUS_BADGE_CLASS: Record<string, string> = {
  待处理:
    "bg-amber-100 text-amber-950 dark:bg-yellow-400/15 dark:text-yellow-400",
  处理中: "bg-sky-100 text-sky-950 dark:bg-blue-400/15 dark:text-blue-400",
  已回复:
    "bg-emerald-100 text-emerald-950 dark:bg-green-400/15 dark:text-green-400",
  已关闭: "bg-muted text-muted-foreground",
}

export const FEEDBACK_PRIORITY_BADGE_CLASS: Record<string, string> = {
  high: "bg-red-100 text-red-900 dark:bg-red-400/20 dark:text-red-400",
  medium:
    "bg-orange-100 text-orange-950 dark:bg-orange-400/20 dark:text-orange-400",
  low: "bg-muted text-muted-foreground",
}
