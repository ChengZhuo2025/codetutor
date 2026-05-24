"use client"

import { useEffect, useState } from "react"
import type { ReactNode } from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { AdminSelect } from "@/features/admin-shell/components/admin-select"

export type AdminListPaginationFooterProps = {
  limit: string
  onLimitChange: (value: string) => void
  page: number
  totalPages: number
  total: number
  canPrev: boolean
  canNext: boolean
  isLoading?: boolean
  onPrevPage: () => void
  onNextPage: () => void
  /** Renders between「每页 n 条」与「第 x 页」（如「已选 N 条」） */
  centerContent?: ReactNode
  /** 翻页按钮左侧的操作区（如批量删除） */
  endActions?: ReactNode
}

/**
 * 管理后台数据表底部分页栏：与反馈工单等列表统一布局。
 */
export function AdminListPaginationFooter({
  limit,
  onLimitChange,
  page,
  totalPages,
  total,
  canPrev,
  canNext,
  isLoading = false,
  onPrevPage,
  onNextPage,
  centerContent,
  endActions,
}: AdminListPaginationFooterProps) {
  const [paginationHydrated, setPaginationHydrated] = useState(false)
  const prevDisabled = !canPrev || isLoading
  const nextDisabled = !canNext || isLoading

  useEffect(() => {
    let active = true

    queueMicrotask(() => {
      if (active) {
        setPaginationHydrated(true)
      }
    })

    return () => {
      active = false
    }
  }, [])

  return (
    <div className="flex flex-col gap-3 border-t border-border bg-muted/20 px-3 py-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
        <span className="inline-flex flex-wrap items-center gap-x-1">
          每页
          <AdminSelect
            value={limit}
            onValueChange={onLimitChange}
            options={[
              { value: "20", label: "20" },
              { value: "50", label: "50" },
              { value: "100", label: "100" },
            ]}
            triggerClassName="mx-0.5 h-8 min-w-20 w-20 px-2.5"
          />
          条
        </span>
        {centerContent ? (
          <>
            <span className="text-border">|</span>
            {centerContent}
          </>
        ) : null}
        <span className="text-border">|</span>
        <span>
          第 {page} / {totalPages} 页 · 共 {total} 条
        </span>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {endActions}
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-8 w-8"
            disabled={paginationHydrated && prevDisabled}
            onClick={() => {
              if (prevDisabled) {
                return
              }
              onPrevPage()
            }}
            aria-label="上一页"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-8 w-8"
            disabled={paginationHydrated && nextDisabled}
            onClick={() => {
              if (nextDisabled) {
                return
              }
              onNextPage()
            }}
            aria-label="下一页"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}
