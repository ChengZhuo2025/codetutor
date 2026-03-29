"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { ROUTES } from "@/constants/routes"
import { WORKSPACE_ASIDE_WIDTH_CLASS } from "@/constants/workspace-layout"
import { AppShell } from "@/components/layout/app-shell"
import { WorkspaceSidebar } from "@/components/layout/workspace-sidebar"
import { StatePanel } from "@/components/ui/state-panel"
import { HistoryList } from "@/features/history/components/history-list"
import { HistorySidebarPanels } from "@/features/history/components/history-sidebar-panels"
import { mockFaqItems } from "@/features/history/data/history-data"
import type { LearningHistoryResponseData } from "@/lib/api/contracts/history"
import { requestData } from "@/lib/api/client"
import type { ApiRequestState } from "@/types/api"

const HISTORY_PAGE_SIZE = 10

export function HistoryPage() {
  const router = useRouter()
  const [historyState, setHistoryState] = useState<ApiRequestState<LearningHistoryResponseData>>({
    status: "loading",
  })
  const [currentPage, setCurrentPage] = useState(1)
  const [isLoadingMore, setIsLoadingMore] = useState(false)

  useEffect(() => {
    let cancelled = false

    async function loadHistory() {
      try {
        const data = await requestData<LearningHistoryResponseData>(
          `/history/recent?page=1&pageSize=${HISTORY_PAGE_SIZE}`,
        )

        if (cancelled) {
          return
        }

        setCurrentPage(1)
        setHistoryState(
          data.items.length > 0
            ? {
                status: "success",
                data,
              }
            : {
                status: "empty",
                message:
                  "当前还没有学习记录。开始学习并完成第一关后，这里会展示你的学习历程。",
              },
        )
      } catch (error) {
        if (cancelled) {
          return
        }

        setHistoryState({
          status: "error",
          message: error instanceof Error ? error.message : "加载学习记录失败",
        })
      }
    }

    loadHistory()

    return () => {
      cancelled = true
    }
  }, [])

  const handleLoadMore = async () => {
    if (historyState.status !== "success" || isLoadingMore || !historyState.data.hasMore) {
      return
    }

    setIsLoadingMore(true)

    try {
      const nextPage = currentPage + 1
      const data = await requestData<LearningHistoryResponseData>(
        `/history/recent?page=${nextPage}&pageSize=${HISTORY_PAGE_SIZE}`,
      )

      setCurrentPage(nextPage)
      setHistoryState({
        status: "success",
        data: {
          ...data,
          items: [...historyState.data.items, ...data.items],
        },
      })
    } catch (error) {
      setHistoryState({
        status: "error",
        message: error instanceof Error ? error.message : "加载更多学习记录失败",
      })
    } finally {
      setIsLoadingMore(false)
    }
  }

  if (historyState.status !== "success") {
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
            <h1 className="text-2xl font-bold tracking-tight">学习记录</h1>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">
              回顾你参与过的所有学习计划，查看进度和成就。
            </p>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto scrollbar-none px-4 py-6 sm:px-6 sm:py-8">
            <StatePanel
              status={historyState.status}
              title="还没有学习记录"
              description={historyState.message}
              actionLabel={historyState.status === "error" ? "重试" : "开始学习第一课"}
              onAction={() =>
                historyState.status === "error"
                  ? window.location.reload()
                  : router.push(ROUTES.learn)
              }
            />
          </div>
        </main>
      </AppShell>
    )
  }

  const { items, total, hasMore } = historyState.data

  return (
    <AppShell
      mobileTitle="学习记录"
      mobileSubtitle={`共 ${total} 条学习计划`}
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
        {/* 页面头部 */}
        <div className="shrink-0 border-b border-border/50 bg-surface-1/80 px-4 py-5 backdrop-blur-sm sm:px-6">
          <h1 className="text-2xl font-bold tracking-tight">学习记录</h1>
          <p className="mt-1 text-sm leading-5 text-muted-foreground">
            回顾你参与过的所有学习计划，查看进度和成就。
          </p>
        </div>

        {/* 主内容区 */}
        <div className="min-h-0 flex-1 overflow-y-auto scrollbar-none">
          <div className="px-4 py-6 sm:px-6 sm:py-8">
            <HistoryList
              items={items}
              total={total}
              hasMore={hasMore}
              isLoadingMore={isLoadingMore}
              onLoadMore={handleLoadMore}
            />
          </div>
        </div>
      </main>
    </AppShell>
  )
}
