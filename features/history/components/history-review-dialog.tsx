"use client"

import { useEffect, useState } from "react"
import { CheckCircle2, Clock3, LoaderCircle, PauseCircle, Trophy } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { StatePanel } from "@/components/ui/state-panel"
import {
  USER_PANEL_DIVIDER_CLASS,
  USER_PANEL_SECTION_CLASS,
  USER_PANEL_SUBTLE_SECTION_CLASS,
} from "@/components/ui/surface-styles"
import type { LearningHistoryDetailResponseData } from "@/lib/api/contracts/history"
import { requestData } from "@/lib/api/client"
import { cn } from "@/lib/utils"
import type { ApiRequestState } from "@/types/api"

type HistoryReviewDialogProps = {
  planId: string | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

function formatDateTime(dateStr: string | null) {
  if (!dateStr) {
    return "—"
  }

  return new Date(dateStr).toLocaleString("zh-CN", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

export function HistoryReviewDialog({
  planId,
  open,
  onOpenChange,
}: HistoryReviewDialogProps) {
  const [detailState, setDetailState] =
    useState<ApiRequestState<LearningHistoryDetailResponseData>>({
      status: "loading",
    })

  useEffect(() => {
    if (!open || !planId) {
      return
    }

    let cancelled = false

    async function loadDetail() {
      try {
        if (!cancelled) {
          setDetailState({ status: "loading" })
        }

        const data = await requestData<LearningHistoryDetailResponseData>(`/history/${planId}`)

        if (!cancelled) {
          setDetailState({
            status: "success",
            data,
          })
        }
      } catch (error) {
        if (!cancelled) {
          setDetailState({
            status: "error",
            message: error instanceof Error ? error.message : "加载学习复盘失败",
          })
        }
      }
    }

    void loadDetail()

    return () => {
      cancelled = true
    }
  }, [open, planId])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-h-[85vh] overflow-y-auto p-0 sm:max-w-3xl"
      >
        {detailState.status === "success" ? (
          <div className="overflow-hidden rounded-2xl">
            <div className={cn("border-b px-5 pt-5 pb-4", USER_PANEL_DIVIDER_CLASS)}>
              <DialogHeader>
                <DialogTitle>{detailState.data.detail.item.title}</DialogTitle>
                <DialogDescription className="mt-2 leading-6">
                  {detailState.data.detail.item.summary}
                </DialogDescription>
              </DialogHeader>
            </div>

            <div className="space-y-4 px-5 py-5">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className={cn(USER_PANEL_SECTION_CLASS, "rounded-2xl p-4")}>
                  <p className="text-sm font-semibold text-foreground">计划概览</p>
                  <div className="mt-3 space-y-2 text-sm text-muted-foreground">
                    <p>工具：{detailState.data.detail.item.tool}</p>
                    <p>难度：{detailState.data.detail.item.level}</p>
                    <p>模式：{detailState.data.detail.item.mode}</p>
                    <p>总 XP：{detailState.data.detail.item.xpEarned}</p>
                    <p>
                      进度：{detailState.data.detail.item.progress.completed}/
                      {detailState.data.detail.item.progress.total}
                    </p>
                  </div>
                </div>
                <div className={cn(USER_PANEL_SECTION_CLASS, "rounded-2xl p-4")}>
                  <p className="text-sm font-semibold text-foreground">时间线</p>
                  <div className="mt-3 space-y-2 text-sm text-muted-foreground">
                    <p>开始时间：{formatDateTime(detailState.data.detail.timeline.startedAt)}</p>
                    <p>最近活跃：{formatDateTime(detailState.data.detail.timeline.lastActivityAt)}</p>
                    <p>完成时间：{formatDateTime(detailState.data.detail.timeline.completedAt)}</p>
                    <p>中断时间：{formatDateTime(detailState.data.detail.timeline.interruptedAt)}</p>
                    <p>放弃时间：{formatDateTime(detailState.data.detail.timeline.abandonedAt)}</p>
                  </div>
                </div>
              </div>

              <div className={cn(USER_PANEL_SECTION_CLASS, "rounded-2xl p-4")}>
                <div className="flex items-center gap-2">
                  <Trophy className="h-4 w-4 text-gold" />
                  <p className="text-sm font-semibold text-foreground">关卡回顾</p>
                </div>
                <div className="mt-4 space-y-3">
                  {detailState.data.detail.steps.map((step) => (
                    <div
                      key={step.id}
                      className={cn(
                        USER_PANEL_SUBTLE_SECTION_CLASS,
                        "flex flex-col items-start gap-3 rounded-2xl px-4 py-3 sm:flex-row sm:justify-between",
                      )}
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground">
                          第 {step.stepNo} 关 · {step.title}
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          奖励 {step.rewardXp} XP
                        </p>
                      </div>
                      <div className="shrink-0 self-start sm:text-right">
                        {step.status === "completed" ? (
                          <div className="inline-flex items-center gap-1 rounded-full border border-green-600/20 bg-green-600/10 px-2 py-1 text-xs font-medium text-green-700 dark:border-green-400/25 dark:bg-green-500/16 dark:text-green-300">
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            已完成
                          </div>
                        ) : step.status === "in_progress" ? (
                          <div className="inline-flex items-center gap-1 rounded-full border border-brand/25 bg-brand/12 px-2 py-1 text-xs font-medium text-brand dark:border-brand/30 dark:bg-brand/18">
                            <LoaderCircle className="h-3.5 w-3.5" />
                            进行中
                          </div>
                        ) : step.status === "blocked" ? (
                          <div className="inline-flex items-center gap-1 rounded-full border border-chart-3/25 bg-chart-3/10 px-2 py-1 text-xs font-medium text-chart-3 dark:border-chart-3/28 dark:bg-chart-3/16">
                            <PauseCircle className="h-3.5 w-3.5" />
                            已阻塞
                          </div>
                        ) : (
                          <div className="inline-flex items-center gap-1 rounded-full border border-border/70 bg-muted/65 px-2 py-1 text-xs font-medium text-muted-foreground dark:border-white/10 dark:bg-white/6">
                            <Clock3 className="h-3.5 w-3.5" />
                            待开始
                          </div>
                        )}
                        <p className="mt-1 text-[11px] text-muted-foreground">
                          {formatDateTime(step.completedAt)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <StatePanel
            status={detailState.status}
            title={
              detailState.status === "loading"
                ? "正在生成学习复盘"
                : "学习复盘暂时不可用"
            }
            description={detailState.message}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}
