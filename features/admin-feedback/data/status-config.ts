// 反馈状态配置
import type { FeedbackStatus } from "@/lib/api/contracts/feedback"

export const feedbackStatusConfig: Record<
  FeedbackStatus,
  { label: string; color: string }
> = {
  submitted: { label: "待处理", color: "bg-chart-2" },
  in_review: { label: "处理中", color: "bg-chart-3" },
  replied: { label: "已回复", color: "bg-primary" },
  closed: { label: "已关闭", color: "bg-muted-foreground" },
}

export const feedbackTypeLabels: Record<
  "visual_design" | "interaction_flow" | "feature_request" | "issue_report",
  string
> = {
  visual_design: "界面视觉",
  interaction_flow: "交互流程",
  feature_request: "功能建议",
  issue_report: "问题反馈",
}

export const feedbackPriorityLabels: Record<
  "low" | "medium" | "high",
  string
> = {
  low: "低",
  medium: "中",
  high: "高",
}

export const feedbackPriorityColors: Record<
  "low" | "medium" | "high",
  string
> = {
  low: "bg-chart-4",
  medium: "bg-chart-2",
  high: "bg-destructive",
}
