"use client"

import { Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { StatePanel } from "@/components/ui/state-panel"
import { USER_PANEL_OUTLINE_BUTTON_CLASS } from "@/components/ui/surface-styles"
import { cn } from "@/lib/utils"
import { HistoryCard } from "./history-card"
import type {
  HistoryPlanAction,
  LearningHistory,
} from "@/features/history/types"

interface HistoryListProps {
  items: LearningHistory[]
  total: number
  hasMore: boolean
  emptyTitle?: string
  emptyDescription?: string
  isMutating?: boolean
  isLoadingMore?: boolean
  onContinue: (item: LearningHistory) => void
  onReview: (item: LearningHistory) => void
  onManageAction: (item: LearningHistory, action: HistoryPlanAction) => void
  onLoadMore?: () => void
}

export function HistoryList({
  items,
  total,
  hasMore,
  emptyTitle = "还没有学习记录",
  emptyDescription = "开始学习并完成第一个关卡后，这里会展示你的学习历程。",
  isMutating = false,
  isLoadingMore = false,
  onContinue,
  onReview,
  onManageAction,
  onLoadMore,
}: HistoryListProps) {
  if (items.length === 0) {
    return (
      <StatePanel
        status="empty"
        title={emptyTitle}
        description={emptyDescription}
      />
    )
  }

  return (
    <div className="space-y-4">
      {/* 列表统计 */}
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>
          共 <span className="font-medium text-foreground">{total}</span> 条记录
        </span>
        <span>
          已展示 <span className="font-medium text-foreground">{items.length}</span> 条
        </span>
      </div>

      {/* 卡片列表 */}
      <div className="grid gap-4">
        {items.map((item) => (
          <HistoryCard
            key={item.id}
            item={item}
            isMutating={isMutating}
            onContinue={onContinue}
            onReview={onReview}
            onManageAction={onManageAction}
          />
        ))}
      </div>

      {/* 加载更多 */}
      {hasMore && onLoadMore ? (
        <div className="flex justify-center">
          <Button
            variant="outline"
            size="lg"
            onClick={onLoadMore}
            disabled={isLoadingMore}
            className={cn("min-w-[200px] rounded-2xl", USER_PANEL_OUTLINE_BUTTON_CLASS)}
          >
            {isLoadingMore ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                加载中...
              </>
            ) : (
              <>加载更多</>
            )}
          </Button>
        </div>
      ) : null}

      {/* 已加载全部提示 */}
      {!hasMore && items.length > 0 && (
        <p className="text-center text-sm text-muted-foreground/60">
          已加载全部 {total} 条记录
        </p>
      )}
    </div>
  )
}
