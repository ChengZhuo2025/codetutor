"use client"

import { ChevronDown, ChevronUp, RefreshCw } from "lucide-react"
import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import type { LearningCurrentSessionResponseData } from "@/lib/api/contracts/learning"
import type { ConnectionState } from "@/features/learning/components/learn-chat-types"
import { cn } from "@/lib/utils"

const HEADER_COLLAPSED_STORAGE_KEY = "learn:chat-header-collapsed"

type LearnChatHeaderProps = {
  mission: LearningCurrentSessionResponseData["mission"]
  planSummary: LearningCurrentSessionResponseData["planSummary"]
  connectionState: ConnectionState
  restartSubmitting: boolean
  onRestart: () => void
}

function readHeaderCollapsedFromStorage() {
  if (typeof window === "undefined") {
    return false
  }

  try {
    return window.localStorage.getItem(HEADER_COLLAPSED_STORAGE_KEY) === "1"
  } catch {
    return false
  }
}

export function LearnChatHeader({
  mission,
  planSummary,
  connectionState,
  restartSubmitting,
  onRestart,
}: LearnChatHeaderProps) {
  const [collapsed, setCollapsed] = useState(false)

  useEffect(() => {
    let active = true

    queueMicrotask(() => {
      if (!active) {
        return
      }

      setCollapsed(readHeaderCollapsedFromStorage())
    })

    return () => {
      active = false
    }
  }, [])

  const handleToggleCollapsed = () => {
    setCollapsed((current) => {
      const next = !current

      try {
        window.localStorage.setItem(HEADER_COLLAPSED_STORAGE_KEY, next ? "1" : "0")
      } catch {
        /* ignore */
      }

      return next
    })
  }

  return (
    <div className="shrink-0 border-b border-border/80 bg-surface-1 px-4 py-4 backdrop-blur-sm sm:px-6">
      <div className="flex flex-row items-center justify-between gap-3 sm:items-start">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <div className="hidden sm:flex flex-wrap items-center gap-2">
              <span className="inline-flex rounded-full border border-brand/20 bg-brand-dim/60 px-2 py-0.5 text-[11px] font-semibold text-brand">
                当前任务
              </span>
              {connectionState === "offline" ? (
                <span className="rounded-full border border-destructive/20 bg-destructive/10 px-2 py-1 text-[11px] font-semibold text-destructive">
                  连接中断
                </span>
              ) : null}
              {connectionState === "reconnecting" ? (
                <span className="rounded-full border border-chart-3/20 bg-chart-3/10 px-2 py-1 text-[11px] font-semibold text-chart-3">
                  正在重连
                </span>
              ) : null}
            </div>
            <h2 className="truncate text-lg font-semibold">
              {mission?.title ?? "当前任务信息暂时不可用"}
            </h2>
          </div>

          {!collapsed ? (
            <>
              <p className="mt-1 text-xs text-muted-foreground">
                {mission
                  ? `${mission.tool} · ${mission.stageLabel}`
                  : "稍后重试，或从学习地图重新进入当前任务。"}
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground/80">
                  本轮学习计划
                </span>
                <span className="rounded-full border border-brand/20 bg-brand/5 px-2.5 py-1 text-xs font-semibold text-brand">
                  {planSummary.selectedToolName}
                </span>
                <span className="rounded-full border border-border bg-surface-2 px-2.5 py-1 text-xs text-foreground">
                  {planSummary.learningLevelLabel}
                </span>
                <span className="rounded-full border border-border bg-surface-2 px-2.5 py-1 text-xs text-foreground">
                  {planSummary.selectionModeLabel}
                </span>
                <span className="rounded-full border border-border bg-surface-2 px-2.5 py-1 text-xs text-foreground">
                  {planSummary.pathName ?? "自主学习"}
                </span>
              </div>
            </>
          ) : null}
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            disabled={connectionState !== "online" || restartSubmitting}
            onClick={onRestart}
            className={cn(
              "hidden sm:inline-flex items-center gap-1.5 rounded-full border border-border/70 bg-surface-3/50 px-3 py-1.5 text-xs font-medium text-muted-foreground shadow-none transition-colors",
              "hover:border-border hover:bg-surface-3/65 hover:text-foreground",
              "dark:border-brand/20 dark:bg-brand/8 dark:text-brand dark:hover:bg-brand/15",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/35 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
              "disabled:pointer-events-none disabled:opacity-40",
            )}
          >
            <RefreshCw className="h-3 w-3 shrink-0 opacity-80" aria-hidden />
            重头开始
          </button>

          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={handleToggleCollapsed}
            aria-label={collapsed ? "展开学习页标题栏" : "收起学习页标题栏"}
            title={collapsed ? "展开标题栏" : "收起标题栏"}
            className="size-7 border-0 bg-transparent text-muted-foreground shadow-none hover:bg-surface-2 hover:text-foreground dark:hover:bg-white/8 sm:size-8 sm:border sm:border-border/70 sm:bg-surface-1/92 sm:shadow-[0_12px_28px_-24px_rgba(15,23,42,0.28)]"
          >
            {collapsed ? <ChevronDown className="h-5 w-5" /> : <ChevronUp className="h-5 w-5" />}
          </Button>
        </div>
      </div>
    </div>
  )
}
