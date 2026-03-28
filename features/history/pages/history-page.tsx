"use client"

import { useRouter } from "next/navigation"
import { ROUTES } from "@/constants/routes"
import { WORKSPACE_ASIDE_WIDTH_CLASS } from "@/constants/workspace-layout"
import { AppShell } from "@/components/layout/app-shell"
import { WorkspaceSidebar } from "@/components/layout/workspace-sidebar"
import { StatePanel } from "@/components/ui/state-panel"
import { HistoryList } from "@/features/history/components/history-list"
import { HistorySidebarPanels } from "@/features/history/components/history-sidebar-panels"
import { mockLearningHistoryList, mockFaqItems } from "@/features/history/data/history-data"
import type { ApiRequestState } from "@/types/api"

export function HistoryPage() {
  const router = useRouter()

  // 模拟 API 响应数据
  const historyState: ApiRequestState<{
    items: typeof mockLearningHistoryList
    total: number
    hasMore: boolean
  }> =
    mockLearningHistoryList.length > 0
      ? {
          status: "success",
          data: {
            items: mockLearningHistoryList,
            total: mockLearningHistoryList.length,
            hasMore: mockLearningHistoryList.length > 10,
          },
        }
      : {
          status: "empty",
          message: "当前还没有学习记录。开始学习并完成第一关后，这里会展示你的学习历程。",
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
              actionLabel="开始学习第一课"
              onAction={() => router.push(ROUTES.learn)}
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
            <HistoryList items={items} total={total} hasMore={hasMore} />
          </div>
        </div>
      </main>
    </AppShell>
  )
}
