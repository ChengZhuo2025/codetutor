"use client"

import { useRouter } from "next/navigation"
import {
  ArrowRight,
  BookOpen,
  Calendar,
  Clock,
  Play,
  RefreshCw,
  RotateCcw,
  Target,
  Zap,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { ROUTES } from "@/constants/routes"
import type { LearningHistory } from "@/features/history/types"

interface HistoryCardProps {
  item: LearningHistory
}

const statusConfig = {
  completed: {
    label: "已完成",
    color: "text-green-600",
    bgColor: "bg-green-600/10",
    borderColor: "border-green-600/30",
    icon: RotateCcw,
    actionLabel: "学习复盘",
  },
  in_progress: {
    label: "进行中",
    color: "text-brand",
    bgColor: "bg-brand/10",
    borderColor: "border-brand/30",
    icon: Play,
    actionLabel: "继续学习",
  },
  abandoned: {
    label: "已中断",
    color: "text-muted-foreground",
    bgColor: "bg-surface-4",
    borderColor: "border-border",
    icon: RefreshCw,
    actionLabel: "重新激活",
  },
} as const

export function HistoryCard({ item }: HistoryCardProps) {
  const router = useRouter()
  const status = statusConfig[item.status]
  const StatusIcon = status.icon

  const handleAction = () => {
    if (item.status === "in_progress") {
      router.push(ROUTES.learn)
    } else {
      router.push(`${ROUTES.map}?plan=${item.planId}`)
    }
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString("zh-CN", {
      year: "numeric",
      month: "short",
      day: "numeric",
    })
  }

  return (
    <div
      className={cn(
        "group rounded-[26px] border bg-surface-2 p-5 transition-all",
        "hover:-translate-y-0.5 hover:shadow-[0_18px_48px_rgba(0,0,0,0.14)]",
        item.status === "completed" && "border-green-600/15 hover:border-green-600/40",
        item.status === "in_progress" && "border-brand/15 hover:border-brand/40",
        item.status === "abandoned" && "border-border/60 hover:border-border",
      )}
    >
      {/* 标题和简介 */}
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

      {/* 工具/水平/模式标签 */}
      <div className="mb-4 flex flex-wrap gap-2">
        <span className="inline-flex items-center gap-1 rounded-full border border-border bg-background/50 px-2.5 py-1 text-xs text-muted-foreground">
          <Target className="h-3 w-3" />
          {item.tool}
        </span>
        <span className="inline-flex items-center gap-1 rounded-full border border-border bg-background/50 px-2.5 py-1 text-xs text-muted-foreground">
          <BookOpen className="h-3 w-3" />
          {item.level}
        </span>
        <span className="inline-flex items-center gap-1 rounded-full border border-border bg-background/50 px-2.5 py-1 text-xs text-muted-foreground">
          <Clock className="h-3 w-3" />
          {item.mode}
        </span>
      </div>

      {/* 进度条 */}
      <div className="mb-4">
        <div className="mb-2 flex items-center justify-between text-xs">
          <span className="text-muted-foreground">
            进度 {item.progress.completed}/{item.progress.total}
          </span>
          <span
            className={cn(
              "font-medium",
              item.status === "completed"
                ? "text-green-600"
                : item.status === "in_progress"
                  ? "text-brand"
                  : "text-foreground",
            )}
          >
            {item.progress.percent}%
          </span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-surface-4">
          <div
            className={cn(
              "h-full rounded-full transition-all",
              item.status === "completed"
                ? "bg-green-600"
                : item.status === "in_progress"
                  ? "bg-brand"
                  : "bg-muted-foreground/40",
            )}
            style={{ width: `${item.progress.percent}%` }}
          />
        </div>
      </div>

      {/* 底部信息 */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <Zap className="h-3.5 w-3.5 text-gold" />
            <span className="font-medium text-foreground">{item.xpEarned}</span> XP
          </span>
          <span className="inline-flex items-center gap-1">
            <Calendar className="h-3.5 w-3.5" />
            {formatDate(item.createdAt)} 开始
          </span>
          {item.status !== "in_progress" && (
            <span className="hidden sm:inline-flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" />
              {formatDate(item.updatedAt)} 更新
            </span>
          )}
        </div>

        <Button
          size="sm"
          onClick={handleAction}
          className={cn(
            "gap-1.5 rounded-xl px-4",
            item.status === "completed"
              ? "bg-green-600 text-background hover:bg-green-600/90"
              : item.status === "in_progress"
                ? "bg-brand text-brand-foreground hover:bg-brand/90"
                : "bg-surface-3 text-foreground hover:bg-surface-4",
          )}
        >
          <StatusIcon className="h-4 w-4" />
          {status.actionLabel}
          <ArrowRight className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  )
}
