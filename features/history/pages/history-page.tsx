"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { CirclePlus, RotateCcw, Sparkles } from "lucide-react"
import { ROUTES } from "@/constants/routes"
import { WORKSPACE_ASIDE_WIDTH_CLASS } from "@/constants/workspace-layout"
import { AppShell } from "@/components/layout/app-shell"
import { WorkspaceSidebar } from "@/components/layout/workspace-sidebar"
import { Button } from "@/components/ui/button"
import {
  USER_BUTTON_PRIMARY_CLASS,
  USER_BUTTON_SECONDARY_CLASS,
} from "@/components/ui/surface-styles"
import { StatePanel } from "@/components/ui/state-panel"
import { HistoryActionDialog } from "@/features/history/components/history-action-dialog"
import { HistoryList } from "@/features/history/components/history-list"
import { HistoryReviewDialog } from "@/features/history/components/history-review-dialog"
import { HistorySidebarPanels } from "@/features/history/components/history-sidebar-panels"
import { mockFaqItems } from "@/features/history/data/history-data"
import type {
  LearningHistoryResponseData,
  UpdateLearningHistoryStatusResponseData,
} from "@/lib/api/contracts/history"
import { requestData } from "@/lib/api/client"
import type {
  ApiRequestState,
  ViewStateStatus,
} from "@/types/api"
import type {
  HistoryFilter,
  HistoryPlanAction,
  LearningHistory,
} from "@/features/history/types"
import { cn } from "@/lib/utils"

const HISTORY_PAGE_SIZE = 10

const HISTORY_FILTERS: Array<{
  id: HistoryFilter
  label: string
  getCount: (data: LearningHistoryResponseData["summary"]) => number
}> = [
  {
    id: "all",
    label: "全部",
    getCount: (summary) => summary.totalCount,
  },
  {
    id: "in_progress",
    label: "进行中",
    getCount: (summary) => summary.activeCount,
  },
  {
    id: "interrupted",
    label: "已中断",
    getCount: (summary) => summary.interruptedCount,
  },
  {
    id: "completed",
    label: "已完成",
    getCount: (summary) => summary.completedCount,
  },
  {
    id: "abandoned",
    label: "已放弃",
    getCount: (summary) => summary.abandonedCount,
  },
]

function getEmptyCopy(filter: HistoryFilter) {
  if (filter === "in_progress") {
    return {
      title: "当前没有进行中的学习计划",
      description: "你可以重新激活已中断计划，或创建一条新的学习计划继续前进。",
    }
  }

  if (filter === "interrupted") {
    return {
      title: "没有已中断的学习计划",
      description: "最近没有因为长期未继续而自动中断的学习计划。",
    }
  }

  if (filter === "completed") {
    return {
      title: "还没有已完成的学习计划",
      description: "完成一整条学习路径后，这里会出现可复盘的历史记录。",
    }
  }

  if (filter === "abandoned") {
    return {
      title: "没有已放弃的学习计划",
      description: "主动放弃的学习计划会出现在这里，你也可以随时清理这些记录。",
    }
  }

  return {
    title: "还没有学习记录",
    description: "开始学习并完成第一个关卡后，这里会展示你的学习历程。",
  }
}

export function HistoryPage() {
  const router = useRouter()
  const [historyState, setHistoryState] = useState<ApiRequestState<LearningHistoryResponseData>>({
    status: "loading",
  })
  const [currentPage, setCurrentPage] = useState(1)
  const [currentFilter, setCurrentFilter] = useState<HistoryFilter>("all")
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [isMutating, setIsMutating] = useState(false)
  const [feedbackState, setFeedbackState] = useState<{
    status: ViewStateStatus
    message: string
  } | null>(null)
  const [reviewPlanId, setReviewPlanId] = useState<string | null>(null)
  const [actionTarget, setActionTarget] = useState<{
    item: LearningHistory
    action: HistoryPlanAction
  } | null>(null)

  const loadHistory = useCallback(
    async (filter: HistoryFilter, page = 1, append = false) => {
      const data = await requestData<LearningHistoryResponseData>(
        `/history/recent?page=${page}&pageSize=${HISTORY_PAGE_SIZE}&status=${filter}`,
      )

      setCurrentPage(page)
      setHistoryState((current) => {
        if (!append || current.status !== "success") {
          return {
            status: "success",
            data,
          }
        }

        return {
          status: "success",
          data: {
            ...data,
            items: [...current.data.items, ...data.items],
          },
        }
      })
    },
    [],
  )

  useEffect(() => {
    let cancelled = false

    async function initialLoad() {
      try {
        await loadHistory(currentFilter, 1, false)
      } catch (error) {
        if (!cancelled) {
          setHistoryState({
            status: "error",
            message: error instanceof Error ? error.message : "加载学习记录失败",
          })
        }
      }
    }

    void initialLoad()

    return () => {
      cancelled = true
    }
  }, [currentFilter, loadHistory])

  const handleLoadMore = async () => {
    if (historyState.status !== "success" || isLoadingMore || !historyState.data.hasMore) {
      return
    }

    setIsLoadingMore(true)

    try {
      await loadHistory(currentFilter, currentPage + 1, true)
    } catch (error) {
      setHistoryState({
        status: "error",
        message: error instanceof Error ? error.message : "加载更多学习记录失败",
      })
    } finally {
      setIsLoadingMore(false)
    }
  }

  const handleFilterChange = (filter: HistoryFilter) => {
    if (filter === currentFilter) {
      return
    }

    setCurrentFilter(filter)
    setFeedbackState(null)
    setHistoryState({ status: "loading" })
  }

  const handleContinueOrCreate = () => {
    if (historyState.status === "success" && historyState.data.summary.activeCount > 0) {
      router.push(ROUTES.learn)
      return
    }

    router.push(ROUTES.onboarding)
  }

  const handleManageAction = (item: LearningHistory, action: HistoryPlanAction) => {
    setActionTarget({ item, action })
  }

  const handleConfirmAction = async () => {
    if (!actionTarget) {
      return
    }

    setIsMutating(true)

    try {
      await requestData<UpdateLearningHistoryStatusResponseData>(`/history/${actionTarget.item.id}/status`, {
        method: "POST",
        body: JSON.stringify({
          action: actionTarget.action,
        }),
      })

      const messageMap: Record<HistoryPlanAction, string> = {
        abandon: "当前学习计划已放弃",
        reactivate: "学习计划已重新激活",
        archive: "学习记录已删除",
      }

      setFeedbackState({
        status: "success",
        message: messageMap[actionTarget.action],
      })

      setActionTarget(null)
      await loadHistory(currentFilter, 1, false)

      if (actionTarget.action === "reactivate") {
        router.push(ROUTES.learn)
      }
    } catch (error) {
      setFeedbackState({
        status: "error",
        message: error instanceof Error ? error.message : "学习计划操作失败",
      })
    } finally {
      setIsMutating(false)
    }
  }

  const pageSummary = historyState.status === "success" ? historyState.data.summary : null
  const pageItems = historyState.status === "success" ? historyState.data.items : []
  const pageTotal = historyState.status === "success" ? historyState.data.total : 0
  const pageHasMore = historyState.status === "success" ? historyState.data.hasMore : false
  const headerActionLabel =
    pageSummary?.activeCount && pageSummary.activeCount > 0 ? "继续当前计划" : "新增学习计划"

  const emptyCopy = useMemo(() => getEmptyCopy(currentFilter), [currentFilter])

  const renderHeaderAction = (
    <Button
      type="button"
      onClick={handleContinueOrCreate}
      className={USER_BUTTON_PRIMARY_CLASS}
    >
      {pageSummary?.activeCount ? (
        <RotateCcw className="h-4 w-4" />
      ) : (
        <CirclePlus className="h-4 w-4" />
      )}
      {headerActionLabel}
    </Button>
  )

  if (historyState.status === "error") {
    return (
      <AppShell
        mobileTitle="学习记录"
        mobileSubtitle="历史学习计划回顾"
        asideLabel="常见问题"
        renderSidebar={({ mobile }) => (
          <WorkspaceSidebar activeHref={ROUTES.history} mobile={mobile} />
        )}
        renderAside={() => (
          <div className="p-6">
            <HistorySidebarPanels faqItems={mockFaqItems} />
          </div>
        )}
        asideClassName={WORKSPACE_ASIDE_WIDTH_CLASS}
      >
        <main className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <div className="shrink-0 border-b border-border/50 bg-surface-1/80 px-4 py-5 backdrop-blur-sm sm:px-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h1 className="text-2xl font-bold tracking-tight">学习记录</h1>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">
                  回顾你参与过的所有学习计划，查看进度和成就。
                </p>
              </div>
              {renderHeaderAction}
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto scrollbar-none px-4 py-6 sm:px-6 sm:py-8">
            <StatePanel
              status="error"
              title="学习记录加载失败"
              description={historyState.message}
              actionLabel="重新加载"
              onAction={() => window.location.reload()}
            />
          </div>
        </main>
      </AppShell>
    )
  }

  return (
    <>
      <AppShell
        mobileTitle="学习记录"
        mobileSubtitle={
          pageSummary
            ? `共 ${pageSummary.totalCount} 条学习计划`
            : "历史学习计划回顾"
        }
        asideLabel="常见问题"
        renderSidebar={({ mobile }) => (
          <WorkspaceSidebar activeHref={ROUTES.history} mobile={mobile} />
        )}
        renderAside={() => (
          <div className="p-5">
            <HistorySidebarPanels faqItems={mockFaqItems} />
          </div>
        )}
        asideClassName={WORKSPACE_ASIDE_WIDTH_CLASS}
      >
        <main className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <div className="shrink-0 border-b border-border/50 bg-surface-1/80 px-4 py-5 backdrop-blur-sm sm:px-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h1 className="text-2xl font-bold tracking-tight">学习记录</h1>
                <p className="mt-1 text-sm leading-5 text-muted-foreground">
                  回顾你参与过的所有学习计划，并按状态继续、复盘、放弃或清理记录。
                </p>
              </div>
              {renderHeaderAction}
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto scrollbar-none">
            <div className="space-y-5 px-4 py-6 sm:px-6 sm:py-8">
              {feedbackState ? (
                <StatePanel
                  status={feedbackState.status}
                  title={feedbackState.status === "success" ? "操作已完成" : "操作未成功"}
                  description={feedbackState.message}
                  compact
                />
              ) : null}

              {pageSummary && pageSummary.interruptedCount > 0 && pageSummary.activeCount === 0 ? (
                <StatePanel
                  status="success"
                  title="你有可恢复的学习计划"
                  description={`当前有 ${pageSummary.interruptedCount} 条已中断计划。你可以直接重新激活，也可以新建一条学习计划。`}
                  compact
                  extra={
                    <div className="inline-flex items-center gap-2 rounded-full bg-brand/10 px-3 py-1 text-xs text-brand">
                      <Sparkles className="h-3.5 w-3.5" />
                      没有进行中计划时，允许重新进入 onboarding 创建新计划
                    </div>
                  }
                />
              ) : null}

              {pageSummary ? (
                <div className="flex flex-wrap gap-2">
                  {HISTORY_FILTERS.map((filter) => {
                    const count = filter.getCount(pageSummary)
                    const active = currentFilter === filter.id

                    return (
                      <Button
                        key={filter.id}
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => handleFilterChange(filter.id)}
                        className={cn(
                          "rounded-full px-4",
                          active
                            ? USER_BUTTON_PRIMARY_CLASS
                            : USER_BUTTON_SECONDARY_CLASS,
                        )}
                      >
                        {filter.label}
                        <span
                          className={cn(
                            "rounded-full border px-1.5 py-0.5 text-[11px]",
                            active
                              ? "border-white/20 bg-white/12 text-white"
                              : "border-white/16 bg-white/10 text-white/88",
                          )}
                        >
                          {count}
                        </span>
                      </Button>
                    )
                  })}
                </div>
              ) : null}

              {historyState.status === "loading" ? (
                <StatePanel
                  status="loading"
                  title="正在加载学习记录"
                  description="正在同步你的学习计划状态和历史记录，请稍候。"
                />
              ) : (
                <HistoryList
                  items={pageItems}
                  total={pageTotal}
                  hasMore={pageHasMore}
                  isMutating={isMutating}
                  isLoadingMore={isLoadingMore}
                  emptyTitle={emptyCopy.title}
                  emptyDescription={emptyCopy.description}
                  onContinue={() => router.push(ROUTES.learn)}
                  onReview={(item) => setReviewPlanId(item.id)}
                  onManageAction={handleManageAction}
                  onLoadMore={handleLoadMore}
                />
              )}
            </div>
          </div>
        </main>
      </AppShell>

      <HistoryReviewDialog
        open={Boolean(reviewPlanId)}
        planId={reviewPlanId}
        onOpenChange={(open) => {
          if (!open) {
            setReviewPlanId(null)
          }
        }}
      />

      <HistoryActionDialog
        open={Boolean(actionTarget)}
        item={actionTarget?.item ?? null}
        action={actionTarget?.action ?? null}
        isPending={isMutating}
        onOpenChange={(open) => {
          if (!open) {
            setActionTarget(null)
          }
        }}
        onConfirm={handleConfirmAction}
      />
    </>
  )
}
