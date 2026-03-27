"use client"

import { useState } from "react"
import { HistoryCard } from "./history-card"
import { Button } from "@/components/ui/button"
import { StatePanel } from "@/components/ui/state-panel"
import { Loader2 } from "lucide-react"
import type { LearningHistory } from "@/features/history/types"

interface HistoryListProps {
  items: LearningHistory[]
  total: number
  hasMore: boolean
}

const PAGE_SIZE = 10

export function HistoryList({ items, total, hasMore: initialHasMore }: HistoryListProps) {
  const [displayItems, setDisplayItems] = useState<LearningHistory[]>(items.slice(0, PAGE_SIZE))
  const [page, setPage] = useState(1)
  const [isLoading, setIsLoading] = useState(false)
  const [hasMore, setHasMore] = useState(initialHasMore)

  // 如果初始数据为空，显示空状态
  if (items.length === 0) {
    return (
      <StatePanel
        status="empty"
        title="还没有学习记录"
        description="开始学习并完成第一个关卡后，这里会展示你的学习历程。"
      />
    )
  }

  const handleLoadMore = async () => {
    if (isLoading || !hasMore) return

    setIsLoading(true)

    // 模拟 API 延迟
    await new Promise((resolve) => setTimeout(resolve, 800))

    const nextPage = page + 1
    const startIndex = page * PAGE_SIZE
    const endIndex = startIndex + PAGE_SIZE
    const newItems = items.slice(startIndex, endIndex)

    setDisplayItems((prev) => [...prev, ...newItems])
    setPage(nextPage)
    setHasMore(endIndex < items.length)
    setIsLoading(false)
  }

  return (
    <div className="space-y-4">
      {/* 列表统计 */}
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>
          共 <span className="font-medium text-foreground">{total}</span> 条记录
        </span>
        <span>
          已展示 <span className="font-medium text-foreground">{displayItems.length}</span> 条
        </span>
      </div>

      {/* 卡片列表 */}
      <div className="grid gap-4">
        {displayItems.map((item) => (
          <HistoryCard key={item.id} item={item} />
        ))}
      </div>

      {/* 加载更多 */}
      {hasMore && (
        <div className="flex justify-center">
          <Button
            variant="outline"
            size="lg"
            onClick={handleLoadMore}
            disabled={isLoading}
            className="min-w-[200px] rounded-2xl border-border/60 bg-surface-2 hover:bg-surface-3 hover:text-white"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                加载中...
              </>
            ) : (
              <>加载更多</>
            )}
          </Button>
        </div>
      )}

      {/* 已加载全部提示 */}
      {!hasMore && displayItems.length > 0 && (
        <p className="text-center text-sm text-muted-foreground/60">
          已加载全部 {total} 条记录
        </p>
      )}
    </div>
  )
}
