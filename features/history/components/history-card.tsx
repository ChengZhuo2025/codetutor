"use client"

import {
  ArrowRight,
  BookOpen,
  Calendar,
  Clock,
  Play,
  RefreshCw,
  Target,
  Trash2,
  Zap,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  USER_BUTTON_DANGER_CLASS,
  USER_BUTTON_PRIMARY_CLASS,
} from "@/components/ui/surface-styles"
import { cn } from "@/lib/utils"
import type {
  HistoryPlanAction,
  LearningHistory,
} from "@/features/history/types"

interface HistoryCardProps {
  item: LearningHistory
  isMutating?: boolean
  onContinue: (item: LearningHistory) => void
  onReview: (item: LearningHistory) => void
  onManageAction: (item: LearningHistory, action: HistoryPlanAction) => void
}

const statusConfig = {
  completed: {
    label: "已完成",
    color: "text-green-700 dark:text-green-300",
    bgColor: "bg-green-600/10 dark:bg-green-500/16",
    borderColor: "border-green-600/25 dark:border-green-400/25",
  },
  in_progress: {
    label: "进行中",
    color: "text-brand",
    bgColor: "bg-brand/12 dark:bg-brand/18",
    borderColor: "border-brand/25 dark:border-brand/30",
  },
  interrupted: {
    label: "已中断",
    color: "text-chart-3",
    bgColor: "bg-chart-3/10 dark:bg-chart-3/16",
    borderColor: "border-chart-3/25 dark:border-chart-3/28",
  },
  abandoned: {
    label: "已放弃",
    color: "text-muted-foreground",
    bgColor: "bg-muted/65 dark:bg-white/6",
    borderColor: "border-border/70 dark:border-white/10",
  },
} as const

function formatDate(dateStr: string) {
  const date = new Date(dateStr)
  return date.toLocaleDateString("zh-CN", {
    year: "numeric",
    month: "short",
    day: "numeric",
  })
}

export function HistoryCard({
  item,
  isMutating = false,
  onContinue,
  onReview,
  onManageAction,
}: HistoryCardProps) {
  const status = statusConfig[item.status]

  const renderActions = () => {
    if (item.status === "in_progress") {
      return (
        <>
          <Button
            size="sm"
            onClick={() => onManageAction(item, "abandon")}
            disabled={isMutating}
            variant="outline"
            className={USER_BUTTON_DANGER_CLASS}
          >
            放弃本轮练习
          </Button>
          <Button
            size="sm"
            onClick={() => onContinue(item)}
            disabled={isMutating}
            className={cn("gap-1.5 px-4", USER_BUTTON_PRIMARY_CLASS)}
          >
            <Play className="h-4 w-4" />
            继续学习
            <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        </>
      )
    }

    if (item.status === "interrupted") {
      return (
        <>
          <Button
            size="sm"
            onClick={() => onManageAction(item, "archive")}
            disabled={isMutating}
            variant="outline"
            className={USER_BUTTON_DANGER_CLASS}
          >
            <Trash2 className="h-4 w-4" />
            删除记录
          </Button>
          <Button
            size="sm"
            onClick={() => onManageAction(item, "reactivate")}
            disabled={isMutating}
            className={cn("gap-1.5 px-4", USER_BUTTON_PRIMARY_CLASS)}
          >
            <RefreshCw className="h-4 w-4" />
            重新激活
            <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        </>
      )
    }

    if (item.status === "completed") {
      return (
        <>
          <Button
            size="sm"
            onClick={() => onManageAction(item, "archive")}
            disabled={isMutating}
            variant="outline"
            className={USER_BUTTON_DANGER_CLASS}
          >
            <Trash2 className="h-4 w-4" />
            删除记录
          </Button>
          <Button
            size="sm"
            onClick={() => onReview(item)}
            disabled={isMutating}
            className={cn("gap-1.5 px-4", USER_BUTTON_PRIMARY_CLASS)}
          >
            <BookOpen className="h-4 w-4" />
            学习复盘
            <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        </>
      )
    }

    return (
      <Button
        size="sm"
        onClick={() => onManageAction(item, "archive")}
        disabled={isMutating}
        variant="outline"
        className={USER_BUTTON_DANGER_CLASS}
      >
        <Trash2 className="h-4 w-4" />
        删除记录
      </Button>
    )
  }

  return (
    <div
      className={cn(
        "group rounded-[26px] border bg-surface-2 p-5 shadow-[0_18px_48px_-34px_rgba(15,23,42,0.22)] ring-1 ring-black/[0.03] transition-all dark:ring-white/5",
        "hover:-translate-y-0.5 hover:shadow-[0_24px_64px_-34px_rgba(15,23,42,0.3)]",
        item.status === "completed" && "border-green-600/20 hover:border-green-600/38",
        item.status === "in_progress" && "border-brand/22 bg-brand/8 hover:border-brand/42",
        item.status === "interrupted" && "border-chart-3/20 hover:border-chart-3/38",
        item.status === "abandoned" && "border-border/70 hover:border-border",
      )}
    >
      <div className="mb-2">
        <div className="flex items-start justify-between gap-3">
          <h3 className="text-lg font-semibold text-foreground">{item.title}</h3>
          <span
            className={cn(
              "shrink-0 rounded-full border px-2.5 py-0.5 text-[11px] font-medium",
              status.bgColor,
              status.borderColor,
              status.color,
            )}
          >
            {status.label}
          </span>
        </div>
        <p className="mt-1 line-clamp-2 text-sm leading-6 text-muted-foreground">
          {item.summary}
        </p>
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        <span className="inline-flex items-center gap-1 rounded-full border border-border/70 bg-muted/55 px-2.5 py-1 text-xs text-muted-foreground shadow-[inset_0_1px_0_rgba(255,255,255,0.6)] dark:border-white/10 dark:bg-white/5 dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
          <Target className="h-3 w-3" />
          {item.tool}
        </span>
        <span className="inline-flex items-center gap-1 rounded-full border border-border/70 bg-muted/55 px-2.5 py-1 text-xs text-muted-foreground shadow-[inset_0_1px_0_rgba(255,255,255,0.6)] dark:border-white/10 dark:bg-white/5 dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
          <BookOpen className="h-3 w-3" />
          {item.level}
        </span>
        <span className="inline-flex items-center gap-1 rounded-full border border-border/70 bg-muted/55 px-2.5 py-1 text-xs text-muted-foreground shadow-[inset_0_1px_0_rgba(255,255,255,0.6)] dark:border-white/10 dark:bg-white/5 dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
          <Clock className="h-3 w-3" />
          {item.mode}
        </span>
      </div>

      <div className="mb-4">
        <div className="mb-2 flex items-center justify-between text-xs">
          <span className="text-muted-foreground">
            进度 {item.progress.completed}/{item.progress.total}
          </span>
          <span
            className={cn(
              "font-medium",
              item.status === "completed"
                ? "text-green-700 dark:text-green-300"
                : item.status === "in_progress"
                  ? "text-brand"
                  : item.status === "interrupted"
                    ? "text-chart-3"
                    : "text-foreground",
            )}
          >
            {item.progress.percent}%
          </span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-black/6 dark:bg-white/10">
          <div
            className={cn(
              "h-full rounded-full transition-all",
              item.status === "completed"
                ? "bg-green-600"
                : item.status === "in_progress"
                  ? "bg-brand"
                  : item.status === "interrupted"
                    ? "bg-chart-3"
                    : "bg-muted-foreground/40",
            )}
            style={{ width: `${item.progress.percent}%` }}
          />
        </div>
      </div>

      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <Zap className="h-3.5 w-3.5 text-gold" />
            <span className="font-medium text-foreground">{item.xpEarned}</span> XP
          </span>
          <span className="inline-flex items-center gap-1">
            <Calendar className="h-3.5 w-3.5" />
            {formatDate(item.createdAt)} 开始
          </span>
          <span className="inline-flex items-center gap-1">
            <Clock className="h-3.5 w-3.5" />
            {formatDate(item.updatedAt)} 更新
          </span>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2">
          {renderActions()}
        </div>
      </div>
    </div>
  )
}
