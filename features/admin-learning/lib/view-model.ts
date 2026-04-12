import type {
  AdminLearningPathDetailResponseData,
  AdminLearningPathListItem,
  AdminLearningPathStatus,
} from "@/lib/api/contracts/admin-learning"

export function formatAdminLearningDateTime(iso: string | null) {
  if (!iso) {
    return "暂无"
  }

  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso))
}

export function formatAdminLearningShortDateTime(iso: string | null) {
  if (!iso) {
    return "暂无"
  }

  return new Intl.DateTimeFormat("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso))
}

export function formatAdminLearningTokenCount(value: number | null | undefined) {
  if (value == null) {
    return "暂无"
  }

  return new Intl.NumberFormat("zh-CN").format(value)
}

export function getAdminLearningDraftStatusLabel(status: string) {
  switch (status) {
    case "draft":
      return "草稿中"
    case "confirmed":
      return "已确认"
    case "rejected":
      return "已拒绝"
    case "superseded":
      return "已被替代"
    default:
      return status || "未知"
  }
}

export function getAdminLearningMaterialSourceTypeLabel(sourceType: string) {
  switch (sourceType) {
    case "article":
      return "文章"
    case "video":
      return "视频"
    case "image_post":
      return "图文"
    default:
      return sourceType || "未知"
  }
}

export function getAdminLearningExtractionStageMeta(stage: string) {
  switch (stage) {
    case "raw_text":
      return { label: "正文抓取", variant: "neutral" as const }
    case "subtitle":
      return { label: "字幕提取", variant: "info" as const }
    case "asr":
      return { label: "ASR 转写", variant: "primary" as const }
    case "ocr":
      return { label: "OCR 识别", variant: "warning" as const }
    case "vision":
      return { label: "视觉识别", variant: "warning" as const }
    default:
      return { label: stage || "未知", variant: "neutral" as const }
  }
}

export function getAdminLearningStatusMeta(status: AdminLearningPathStatus | AdminLearningPathListItem["status"]) {
  switch (status) {
    case "active":
      return {
        label: "进行中",
        className: "border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
      }
    case "interrupted":
      return {
        label: "已中断",
        className: "border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-300",
      }
    case "completed":
      return {
        label: "已完成",
        className: "border-sky-500/20 bg-sky-500/10 text-sky-700 dark:text-sky-300",
      }
    case "abandoned":
      return {
        label: "已放弃",
        className: "border-rose-500/20 bg-rose-500/10 text-rose-700 dark:text-rose-300",
      }
    case "archived":
      return {
        label: "已归档",
        className: "border-border bg-muted/70 text-muted-foreground",
      }
    default:
      return {
        label: status,
        className: "border-border bg-muted/70 text-muted-foreground",
      }
  }
}

export function getAdminLearningStepStatusMeta(
  status: AdminLearningPathDetailResponseData["steps"][number]["status"],
) {
  switch (status) {
    case "completed":
      return {
        label: "已完成",
        className: "border-sky-500/20 bg-sky-500/10 text-sky-700 dark:text-sky-300",
      }
    case "in_progress":
      return {
        label: "进行中",
        className: "border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
      }
    case "blocked":
      return {
        label: "阻塞",
        className: "border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-300",
      }
    default:
      return {
        label: "待开始",
        className: "border-border bg-muted/70 text-muted-foreground",
      }
  }
}

export function getAdminLearningSessionStatusMeta(status: string) {
  switch (status) {
    case "active":
      return {
        label: "进行中",
        className: "border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
      }
    case "completed":
      return {
        label: "已完成",
        className: "border-sky-500/20 bg-sky-500/10 text-sky-700 dark:text-sky-300",
      }
    case "interrupted":
      return {
        label: "已中断",
        className: "border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-300",
      }
    case "failed":
      return {
        label: "失败",
        className: "border-rose-500/20 bg-rose-500/10 text-rose-700 dark:text-rose-300",
      }
    case "archived":
      return {
        label: "已归档",
        className: "border-border bg-muted/70 text-muted-foreground",
      }
    default:
      return {
        label: status,
        className: "border-border bg-muted/70 text-muted-foreground",
      }
  }
}
