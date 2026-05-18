import type { AdminNotificationListItem } from "@/lib/api/contracts/admin"

const CATEGORY_LABELS: Record<AdminNotificationListItem["category"], string> = {
  feedback: "反馈",
  payment: "支付",
  ai: "AI",
  system: "系统",
  user: "用户",
}

const SEVERITY_LABELS: Record<AdminNotificationListItem["severity"], string> = {
  info: "信息",
  warning: "警告",
  critical: "紧急",
}

export function formatAdminNotificationCategory(category: AdminNotificationListItem["category"]) {
  return CATEGORY_LABELS[category] ?? category
}

export function formatAdminNotificationSeverity(severity: AdminNotificationListItem["severity"]) {
  return SEVERITY_LABELS[severity] ?? severity
}

export function getAdminNotificationSeverityBadgeClass(severity: AdminNotificationListItem["severity"]) {
  switch (severity) {
    case "critical":
      return "border-destructive/20 bg-destructive/10 text-destructive"
    case "warning":
      return "border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-300"
    default:
      return "border-sky-500/20 bg-sky-500/10 text-sky-700 dark:text-sky-300"
  }
}

export function getAdminNotificationStatusBadgeClass(status: AdminNotificationListItem["status"]) {
  switch (status) {
    case "unread":
      return "border-primary/20 bg-primary/10 text-primary"
    case "read":
      return "border-border bg-muted/70 text-muted-foreground"
    default:
      return "border-border bg-muted/60 text-muted-foreground"
  }
}

export function formatAdminNotificationDateTime(iso: string) {
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso))
}
