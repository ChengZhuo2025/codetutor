"use client"

import { useCallback, useEffect, useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { ChevronLeft, ChevronRight, Download, Search } from "lucide-react"
import { feedbackPriorityLabels, feedbackTypeLabels } from "../data/status-config"
import type { AdminFeedbackListResponseData } from "@/lib/api/contracts/feedback"
import { StatePanel } from "@/components/ui/state-panel"
import { Button } from "@/components/ui/button"

function formatSubmittedAt(iso: string) {
  const d = new Date(iso)
  const mm = String(d.getMonth() + 1).padStart(2, "0")
  const dd = String(d.getDate()).padStart(2, "0")
  const h = d.getHours()
  const m = String(d.getMinutes()).padStart(2, "0")
  return `${mm}/${dd} ${h}:${m}`
}

const EMPTY_STATS = {
  ticketTotal: 0,
  pending: 0,
  inReview: 0,
  highPriority: 0,
}

export function FeedbackList() {
  const [data, setData] = useState<AdminFeedbackListResponseData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [typeFilter, setTypeFilter] = useState<string>("all")
  const [priorityFilter, setPriorityFilter] = useState<string>("all")
  const [keyword, setKeyword] = useState("")
  const [keywordApplied, setKeywordApplied] = useState("")
  const [limit, setLimit] = useState("20")
  const [page, setPage] = useState(1)
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [batchDeleting, setBatchDeleting] = useState(false)

  const listItems = data?.items ?? []
  const stats = data?.stats ?? EMPTY_STATS
  const total = data?.total ?? 0
  const pageSize = Number.parseInt(limit, 10) || 20
  const totalPages = Math.max(1, Math.ceil(total / pageSize) || 1)

  const fetchList = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams()
      if (statusFilter !== "all") {
        params.append("status", statusFilter)
      }
      if (typeFilter !== "all") {
        params.append("feedbackType", typeFilter)
      }
      if (priorityFilter !== "all") {
        params.append("priority", priorityFilter)
      }
      if (keywordApplied) {
        params.append("keyword", keywordApplied)
      }
      params.append("limit", limit)
      params.append("page", String(page))
      const response = await fetch(`/api/admin/feedback?${params.toString()}`, {
        cache: "no-store",
        credentials: "include",
      })
      const result = await response.json()

      if (result.code !== "OK") {
        throw new Error(result.message || "获取反馈列表失败")
      }

      setData(result.data as AdminFeedbackListResponseData)
      setSelectedIds([])
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : "网络请求失败")
    } finally {
      setIsLoading(false)
    }
  }, [keywordApplied, limit, page, priorityFilter, statusFilter, typeFilter])

  useEffect(() => {
    void fetchList()
  }, [fetchList])

  const allVisibleSelected = listItems.length > 0 && listItems.every((item) => selectedIds.includes(item.id))

  const toggleSelectAll = () => {
    if (allVisibleSelected) {
      setSelectedIds((prev) => prev.filter((id) => !listItems.some((item) => item.id === id)))
      return
    }
    setSelectedIds((prev) => {
      const next = new Set(prev)
      listItems.forEach((item) => next.add(item.id))
      return Array.from(next)
    })
  }

  const toggleSelectOne = (ticketId: string) => {
    setSelectedIds((prev) => (
      prev.includes(ticketId)
        ? prev.filter((id) => id !== ticketId)
        : [...prev, ticketId]
    ))
  }

  const handleApplySearch = () => {
    setPage(1)
    setKeywordApplied(keyword.trim())
  }

  const handleDeleteOne = async (ticketId: string) => {
    if (!window.confirm("确定删除该工单？此操作不可恢复。")) {
      return
    }
    setDeletingId(ticketId)
    try {
      const response = await fetch(`/api/admin/feedback/${ticketId}`, {
        method: "DELETE",
        credentials: "include",
      })
      const result = await response.json()
      if (result.code !== "OK") {
        throw new Error(result.message || "删除失败")
      }
      await fetchList()
    } catch (deleteError) {
      window.alert(deleteError instanceof Error ? deleteError.message : "删除失败")
    } finally {
      setDeletingId(null)
    }
  }

  const handleBatchDelete = async () => {
    if (selectedIds.length === 0) {
      return
    }
    if (!window.confirm(`确定删除已选的 ${selectedIds.length} 条工单？此操作不可恢复。`)) {
      return
    }
    setBatchDeleting(true)
    try {
      for (const id of selectedIds) {
        const response = await fetch(`/api/admin/feedback/${id}`, {
          method: "DELETE",
          credentials: "include",
        })
        const result = await response.json()
        if (result.code !== "OK") {
          throw new Error(result.message || `删除工单 ${id} 失败`)
        }
      }
      await fetchList()
    } catch (batchError) {
      window.alert(batchError instanceof Error ? batchError.message : "批量删除失败")
    } finally {
      setBatchDeleting(false)
    }
  }

  const handleExportCsv = () => {
    if (listItems.length === 0) {
      return
    }

    const csvLines = [
      ["工单ID", "标题", "用户", "类型", "优先级", "状态", "处理人", "创建时间"].join(","),
      ...listItems.map((item) => {
        const row = [
          item.id,
          item.title,
          item.userNicknameSnapshot ?? "",
          item.feedbackTypeLabel,
          feedbackPriorityLabels[item.priority],
          item.statusLabel,
          item.latestReplySnippet ? "已回复" : "未跟进",
          formatSubmittedAt(item.submittedAt),
        ]
        return row.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(",")
      }),
    ]

    const blob = new Blob(["\uFEFF" + csvLines.join("\n")], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, "-")
    link.href = url
    link.download = `admin-feedback-${timestamp}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  const canPrev = page > 1
  const canNext = page < totalPages

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages)
    }
  }, [page, totalPages])

  if (error) {
    return <StatePanel status="error" title="获取数据失败" description={error} />
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-foreground">反馈工单</h1>
          <p className="text-sm text-muted-foreground mt-1">
            当前筛选共 {total} 条；全库待处理 {stats.pending} 条
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          onClick={handleExportCsv}
          disabled={listItems.length === 0}
          className="gap-2"
        >
          <Download className="h-4 w-4" />
          导出
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <div className="rounded-lg border border-border bg-card px-4 py-3">
          <p className="text-xs text-muted-foreground">总工单</p>
          <p className="mt-1 text-xl font-semibold text-foreground">{stats.ticketTotal}</p>
        </div>
        <div className="rounded-lg border border-border bg-card px-4 py-3">
          <p className="text-xs text-muted-foreground">待处理</p>
          <p className="mt-1 text-xl font-semibold text-chart-2">{stats.pending}</p>
        </div>
        <div className="rounded-lg border border-border bg-card px-4 py-3">
          <p className="text-xs text-muted-foreground">处理中</p>
          <p className="mt-1 text-xl font-semibold text-chart-3">{stats.inReview}</p>
        </div>
        <div className="rounded-lg border border-border bg-card px-4 py-3">
          <p className="text-xs text-muted-foreground">高优先级</p>
          <p className="mt-1 text-xl font-semibold text-destructive">{stats.highPriority}</p>
        </div>
      </div>

      <div className="rounded-lg border border-border bg-card p-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-48 max-w-md">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <input
              type="search"
              placeholder="搜索工单号、标题、用户昵称..."
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleApplySearch()
                }
              }}
              className="h-9 w-full rounded-md border border-border bg-background pl-8 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </div>
          <Button type="button" variant="secondary" size="sm" className="h-9" onClick={handleApplySearch}>
            搜索
          </Button>
          <select
            value={statusFilter}
            onChange={(e) => {
              setPage(1)
              setStatusFilter(e.target.value)
            }}
            className="h-9 rounded-md border border-border bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          >
            <option value="all">全部状态</option>
            <option value="submitted">待处理</option>
            <option value="in_review">处理中</option>
            <option value="replied">已解决</option>
            <option value="closed">已关闭</option>
          </select>
          <select
            value={typeFilter}
            onChange={(e) => {
              setPage(1)
              setTypeFilter(e.target.value)
            }}
            className="h-9 rounded-md border border-border bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          >
            <option value="all">全部类型</option>
            <option value="feature_request">功能建议</option>
            <option value="issue_report">Bug 报告</option>
            <option value="interaction_flow">交互流程</option>
            <option value="visual_design">界面视觉</option>
          </select>
          <select
            value={priorityFilter}
            onChange={(e) => {
              setPage(1)
              setPriorityFilter(e.target.value)
            }}
            className="h-9 rounded-md border border-border bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          >
            <option value="all">全部优先级</option>
            <option value="high">高</option>
            <option value="medium">中</option>
            <option value="low">低</option>
          </select>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className="h-16 bg-card border border-border rounded-lg animate-pulse"
            />
          ))}
        </div>
      ) : data && listItems.length > 0 ? (
        <div className="bg-card border border-border rounded-lg overflow-hidden">
          <table className="w-full table-fixed">
            <thead className="bg-muted/50">
              <tr className="border-b border-border">
                <th className="w-10 px-3 py-3 text-left">
                  <input
                    type="checkbox"
                    checked={allVisibleSelected}
                    onChange={toggleSelectAll}
                    className="h-3.5 w-3.5 rounded border-border bg-background text-primary"
                    aria-label="全选当前列表"
                  />
                </th>
                <th className="w-[14%] px-3 py-3 text-left text-xs font-medium text-muted-foreground">工单号</th>
                <th className="px-3 py-3 text-left text-xs font-medium text-muted-foreground">标题</th>
                <th className="w-[14%] px-3 py-3 text-left text-xs font-medium text-muted-foreground">用户</th>
                <th className="w-[10%] px-3 py-3 text-left text-xs font-medium text-muted-foreground">类型</th>
                <th className="w-[8%] px-3 py-3 text-left text-xs font-medium text-muted-foreground">优先级</th>
                <th className="w-[9%] px-3 py-3 text-left text-xs font-medium text-muted-foreground">状态</th>
                <th className="w-[11%] px-3 py-3 text-left text-xs font-medium text-muted-foreground">创建时间</th>
                <th className="w-[120px] px-3 py-3 text-right text-xs font-medium text-muted-foreground">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {listItems.map((item) => (
                <tr key={item.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-3 py-3 align-middle">
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(item.id)}
                      onChange={() => toggleSelectOne(item.id)}
                      className="h-3.5 w-3.5 rounded border-border bg-background text-primary"
                      aria-label={`选择工单 ${item.id}`}
                    />
                  </td>
                  <td className="px-3 py-3 align-middle">
                    <span
                      className="font-mono text-[11px] text-muted-foreground break-all"
                      title={item.id}
                    >
                      {item.id}
                    </span>
                  </td>
                  <td className="px-3 py-3 align-middle">
                    <span className="text-sm text-foreground line-clamp-2">{item.title}</span>
                  </td>
                  <td className="px-3 py-3 align-middle">
                    <div className="flex items-center gap-2 min-w-0">
                      {item.userAvatarUrl ? (
                        <Image
                          src={item.userAvatarUrl}
                          alt=""
                          width={28}
                          height={28}
                          className="h-7 w-7 shrink-0 rounded-full object-cover"
                          unoptimized
                        />
                      ) : (
                        <div
                          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted text-[10px] font-medium text-muted-foreground"
                          aria-hidden
                        >
                          {(item.userNicknameSnapshot || "?").slice(0, 1)}
                        </div>
                      )}
                      <span className="truncate text-xs text-muted-foreground">
                        {item.userNicknameSnapshot || "未知用户"}
                      </span>
                    </div>
                  </td>
                  <td className="px-3 py-3 align-middle text-xs text-muted-foreground">
                    {feedbackTypeLabels[item.feedbackType]}
                  </td>
                  <td className="px-3 py-3 align-middle">
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                        item.priority === "high"
                          ? "bg-destructive/15 text-destructive"
                          : item.priority === "medium"
                            ? "bg-chart-2/20 text-chart-2"
                            : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {feedbackPriorityLabels[item.priority]}
                    </span>
                  </td>
                  <td className="px-3 py-3 align-middle">
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                        item.status === "submitted"
                          ? "bg-chart-2/20 text-chart-2"
                          : item.status === "in_review"
                            ? "bg-chart-1/20 text-chart-1"
                            : item.status === "replied"
                              ? "bg-primary/20 text-primary"
                              : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {item.statusLabel}
                    </span>
                  </td>
                  <td className="px-3 py-3 align-middle text-xs text-muted-foreground whitespace-nowrap">
                    {formatSubmittedAt(item.submittedAt)}
                  </td>
                  <td className="px-3 py-3 align-middle text-right">
                    <div className="flex flex-wrap justify-end gap-1.5">
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 px-2 text-xs hover:bg-primary/15 hover:border-primary/40"
                        asChild
                      >
                        <Link href={`/admin/feedback/${item.id}`}>详情</Link>
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 px-2 text-xs text-destructive hover:border-destructive/40 hover:bg-destructive/12 hover:text-destructive"
                        disabled={deletingId === item.id}
                        onClick={() => void handleDeleteOne(item.id)}
                      >
                        {deletingId === item.id ? "删除中…" : "删除"}
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="flex flex-col gap-3 border-t border-border bg-muted/20 px-3 py-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <span>
                每页
                <select
                  value={limit}
                  onChange={(e) => {
                    setPage(1)
                    setLimit(e.target.value)
                  }}
                  className="mx-1 h-8 rounded-md border border-border bg-background px-2 text-xs text-foreground"
                >
                  <option value="20">20</option>
                  <option value="50">50</option>
                  <option value="100">100</option>
                </select>
                条
              </span>
              <span className="text-border">|</span>
              <span>
                已选 <span className="font-medium text-foreground">{selectedIds.length}</span> 条
              </span>
              <span className="text-border">|</span>
              <span>
                第 {page} / {totalPages} 页 · 共 {total} 条
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 gap-1"
                disabled={selectedIds.length === 0 || batchDeleting}
                onClick={() => void handleBatchDelete()}
              >
                {batchDeleting ? "批量删除中…" : "批量删除"}
              </Button>
              <div className="flex items-center gap-1">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  disabled={!canPrev || isLoading}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  aria-label="上一页"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  disabled={!canNext || isLoading}
                  onClick={() => setPage((p) => p + 1)}
                  aria-label="下一页"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <StatePanel status="empty" title="暂无反馈工单" description="目前没有匹配筛选条件的反馈工单" />
      )}
    </div>
  )
}
