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
    iconColorClass: "text-chart-1",
    iconBgClass: "bg-chart-1/15",
    format: "int",
    requiresAi: false,
  },
  {
    metricKey: "todayOnboardingCompleted",
    label: "今日完成引导",
    href: ADMIN_ROUTES.users,
    icon: CheckCircle,
    iconColorClass: "text-chart-3",
    iconBgClass: "bg-chart-3/12",
    format: "int",
    requiresAi: false,
  },
  {
    metricKey: "activeLearningPaths",
    label: "活跃学习计划",
    href: ADMIN_ROUTES.learning,
    icon: BookOpen,
    iconColorClass: "text-chart-2",
    iconBgClass: "bg-chart-2/12",
    format: "int",
    requiresAi: false,
  },
  {
    metricKey: "todayCompletedTasks",
    label: "今日完成任务",
    href: ADMIN_ROUTES.learning,
    icon: ClipboardList,
    iconColorClass: "text-chart-5",
    iconBgClass: "bg-chart-5/12",
    format: "int",
    requiresAi: false,
  },
  {
    metricKey: "todayCheckinUsers",
    label: "今日打卡人数",
    href: ADMIN_ROUTES.users,
    icon: Flame,
    iconColorClass: "text-chart-3",
    iconBgClass: "bg-chart-3/12",
    format: "int",
    requiresAi: false,
  },
  {
    metricKey: "pendingFeedback",
    label: "待处理反馈",
    href: ADMIN_ROUTES.feedback,
    icon: MessageSquare,
    iconColorClass: "text-chart-1",
    iconBgClass: "bg-chart-1/12",
    format: "int",
    requiresAi: false,
  },
  {
    metricKey: "aiSuccessRate24h",
    label: "AI 调用成功率",
    href: ADMIN_ROUTES.ai,
    icon: Activity,
    iconColorClass: "text-chart-5",
    iconBgClass: "bg-chart-5/12",
    format: "percent1",
    requiresAi: true,
  },
  {
    metricKey: "aiAvgLatencyMs24h",
    label: "AI 平均延迟",
    href: ADMIN_ROUTES.ai,
    icon: Clock,
    iconColorClass: "text-chart-4",
    iconBgClass: "bg-chart-4/10",
    format: "latencyMs",
    requiresAi: true,
  },
]

export const FEEDBACK_STATUS_BADGE_CLASS: Record<string, string> = {
  待处理: "bg-chart-2/12 text-chart-2",
  处理中: "bg-chart-5/12 text-chart-5",
  已回复: "bg-chart-3/12 text-chart-3",
  已关闭: "bg-chart-4/10 text-chart-4",
}

export const FEEDBACK_PRIORITY_BADGE_CLASS: Record<string, string> = {
  high: "bg-chart-4/10 text-chart-4",
  medium: "bg-chart-2/12 text-chart-2",
  low: "bg-chart-1/12 text-chart-1",
}
