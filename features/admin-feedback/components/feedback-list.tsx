"use client"

import { useCallback, useEffect, useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { Download, Search } from "lucide-react"
import { feedbackPriorityLabels, feedbackTypeLabels } from "../data/status-config"
import { buildAdminFeedbackListQuery, readAdminFeedbackUserIdFromSearchParams } from "../lib/list-filters"
import type { AdminFeedbackListResponseData } from "@/lib/api/contracts/feedback"
import { useAppConfirm } from "@/components/app-feedback/app-confirm-provider"
import { useAppToast } from "@/components/app-feedback/app-toast-provider"
import { StatePanel } from "@/components/ui/state-panel"
import { Button } from "@/components/ui/button"
import { AdminListPaginationFooter } from "@/features/admin-shell/components/admin-list-pagination-footer"
import { AdminListTag } from "@/features/admin-shell/components/admin-list-tag"
import { AdminSelect } from "@/features/admin-shell/components/admin-select"
import { useAdminSessionExpiryRedirect } from "@/features/admin-shell/lib/use-admin-session-expiry-redirect"
import { ADMIN_ROUTES } from "@/constants/routes"
import {
  adminRequestData,
  getAdminApiErrorMessage,
  isAdminSessionExpiredError,
} from "@/lib/api/admin-bff-client"

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
  const confirm = useAppConfirm()
  const toast = useAppToast()
  const router = useRouter()
  const searchParams = useSearchParams()
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
  const [authExpired, setAuthExpired] = useState(false)
  const [userIdFilter, setUserIdFilter] = useState<string | undefined>(() => (
    readAdminFeedbackUserIdFromSearchParams(new URLSearchParams(searchParams.toString()))
  ))

  useAdminSessionExpiryRedirect(authExpired)

  const listItems = data?.items ?? []
  const stats = data?.stats ?? EMPTY_STATS
  const total = data?.total ?? 0
  const pageSize = Number.parseInt(limit, 10) || 20
  const totalPages = Math.max(1, Math.ceil(total / pageSize) || 1)

  useEffect(() => {
    const nextUserId = readAdminFeedbackUserIdFromSearchParams(new URLSearchParams(searchParams.toString()))
    setUserIdFilter(nextUserId)
    setPage(1)
  }, [searchParams])

  const fetchList = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const params = buildAdminFeedbackListQuery({
        statusFilter,
        typeFilter,
        priorityFilter,
        keywordApplied,
        limit,
        page,
        userId: userIdFilter,
      })
      const result = await adminRequestData<AdminFeedbackListResponseData>(
        `/admin/feedback?${params.toString()}`,
        {
          method: "GET",
        },
        "获取反馈列表失败",
      )

      setData(result)
      setSelectedIds([])
    } catch (fetchError) {
      setAuthExpired(isAdminSessionExpiredError(fetchError))
      setError(getAdminApiErrorMessage(fetchError, "网络请求失败"))
    } finally {
      setIsLoading(false)
    }
  }, [keywordApplied, limit, page, priorityFilter, statusFilter, typeFilter, userIdFilter])

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

  const handleClearUserFilter = () => {
    setPage(1)
    setUserIdFilter(undefined)
    router.replace(ADMIN_ROUTES.feedback)
  }

  const handleDeleteOne = async (ticketId: string) => {
    const confirmed = await confirm.confirm({
      title: "确定删除该工单？",
      description: "删除后不可恢复，请确认是否继续。",
      confirmText: "删除工单",
      cancelText: "取消",
      destructive: true,
    })

    if (!confirmed) {
      return
    }

    setDeletingId(ticketId)
    try {
      await adminRequestData<{ deleted: boolean }>(
        `/admin/feedback/${ticketId}`,
        {
          method: "DELETE",
        },
        "删除失败",
      )
      await fetchList()
    } catch (deleteError) {
      setAuthExpired(isAdminSessionExpiredError(deleteError))
      toast.error(getAdminApiErrorMessage(deleteError, "删除失败"))
    } finally {
      setDeletingId(null)
    }
  }

  const handleBatchDelete = async () => {
    if (selectedIds.length === 0) {
      return
    }

    const confirmed = await confirm.confirm({
      title: `确定删除已选的 ${selectedIds.length} 条工单？`,
      description: "批量删除后不可恢复，请确认是否继续。",
      confirmText: "批量删除",
      cancelText: "取消",
      destructive: true,
    })

    if (!confirmed) {
      return
    }

    setBatchDeleting(true)
    try {
      await adminRequestData<{ deletedCount: number; deletedIds: string[] }>(
        "/admin/feedback/batch-delete",
        {
          method: "POST",
          body: JSON.stringify({
            ids: selectedIds,
          }),
        },
        "批量删除失败",
      )
      setSelectedIds([])
      await fetchList()
    } catch (batchError) {
      setAuthExpired(isAdminSessionExpiredError(batchError))
      toast.error(getAdminApiErrorMessage(batchError, "批量删除失败"))
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
          <p className="text-sm text-muted-foreground">总工单</p>
          <p className="mt-1 text-xl font-semibold text-foreground">{stats.ticketTotal}</p>
        </div>
        <div className="rounded-lg border border-border bg-card px-4 py-3">
          <p className="text-sm text-muted-foreground">待处理</p>
          <p className="mt-1 text-xl font-semibold text-chart-2">{stats.pending}</p>
        </div>
        <div className="rounded-lg border border-border bg-card px-4 py-3">
          <p className="text-sm text-muted-foreground">处理中</p>
          <p className="mt-1 text-xl font-semibold text-chart-3">{stats.inReview}</p>
        </div>
        <div className="rounded-lg border border-border bg-card px-4 py-3">
          <p className="text-sm text-muted-foreground">高优先级</p>
          <p className="mt-1 text-xl font-semibold text-destructive">{stats.highPriority}</p>
        </div>
      </div>

      <div className="rounded-lg border border-border bg-card p-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-32 max-w-md">
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
          <AdminSelect
            value={statusFilter}
            onValueChange={(next) => {
              setPage(1)
              setStatusFilter(next)
            }}
            options={[
              { value: "all", label: "全部状态" },
              { value: "submitted", label: "待处理" },
              { value: "in_review", label: "处理中" },
              { value: "replied", label: "已解决" },
              { value: "closed", label: "已关闭" },
            ]}
            triggerClassName="min-w-[7rem]"
          />
          <AdminSelect
            value={typeFilter}
            onValueChange={(next) => {
              setPage(1)
              setTypeFilter(next)
            }}
            options={[
              { value: "all", label: "全部类型" },
              { value: "feature_request", label: "功能建议" },
              { value: "issue_report", label: "Bug 报告" },
              { value: "interaction_flow", label: "交互流程" },
              { value: "visual_design", label: "界面视觉" },
            ]}
            triggerClassName="min-w-[7rem]"
          />
          <AdminSelect
            value={priorityFilter}
            onValueChange={(next) => {
              setPage(1)
              setPriorityFilter(next)
            }}
            options={[
              { value: "all", label: "全部优先级" },
              { value: "high", label: "高" },
              { value: "medium", label: "中" },
              { value: "low", label: "低" },
            ]}
            triggerClassName="min-w-[7rem]"
          />
        </div>
        {userIdFilter ? (
          <div className="mt-3 flex flex-wrap items-center gap-2 rounded-md border border-primary/15 bg-primary/5 px-3 py-2">
            <p className="text-xs text-foreground">
              当前仅查看用户工单：
              <span className="ml-1 font-mono text-[11px] text-muted-foreground">{userIdFilter}</span>
            </p>
            <Button type="button" variant="outline" size="sm" className="h-7" onClick={handleClearUserFilter}>
              清除用户筛选
            </Button>
          </div>
        ) : null}
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
                <th className="w-[12%] px-3 py-3 text-left text-sm font-medium text-muted-foreground">工单号</th>
                <th className="px-3 py-3 text-left text-sm font-medium text-muted-foreground">标题</th>
                <th className="w-[12%] px-3 py-3 text-left text-sm font-medium text-muted-foreground">用户</th>
                <th className="w-[10%] px-3 py-3 text-left text-sm font-medium text-muted-foreground">类型</th>
                <th className="w-[8%] px-3 py-3 text-left text-sm font-medium text-muted-foreground">优先级</th>
                <th className="w-[9%] px-3 py-3 text-left text-sm font-medium text-muted-foreground">状态</th>
                <th className="w-[10%] px-3 py-3 text-left text-sm font-medium text-muted-foreground">创建时间</th>
                <th className="w-[130px] px-3 py-3 text-right text-sm font-medium text-muted-foreground">操作</th>
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
                      className="font-mono text-sm line-clamp-1 text-muted-foreground break-all"
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
                      <span className="truncate text-sm text-muted-foreground">
                        {item.userNicknameSnapshot || "未知用户"}
                      </span>
                    </div>
                  </td>
                  <td className="px-3 py-3 align-middle text-sm text-muted-foreground">
                    {feedbackTypeLabels[item.feedbackType]}
                  </td>
                  <td className="px-3 py-3 align-middle">
                    <AdminListTag
                      size="lg"
                      variant={
                        item.priority === "high"
                          ? "danger"
                          : item.priority === "medium"
                            ? "warning"
                            : "neutral"
                      }
                    >
                      {feedbackPriorityLabels[item.priority]}
                    </AdminListTag>
                  </td>
                  <td className="px-3 py-3 align-middle">
                    <AdminListTag
                      size="lg"
                      variant={
                        item.status === "submitted"
                          ? "warning"
                          : item.status === "in_review"
                            ? "info"
                            : item.status === "replied"
                              ? "success"
                              : "neutral"
                      }
                    >
                      {item.statusLabel}
                    </AdminListTag>
                  </td>
                  <td className="px-3 py-3 align-middle text-sm text-muted-foreground whitespace-nowrap">
                    {formatSubmittedAt(item.submittedAt)}
                  </td>
                  <td className="px-3 py-3 align-middle text-right">
                    <div className="flex flex-wrap justify-end gap-1.5">
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 px-2 text-sm hover:bg-primary/15 hover:border-primary/40"
                        asChild
                      >
                        <Link href={`/admin/feedback/${item.id}`}>详情</Link>
                      </Button>
                      <Button
                        variant="destructiveSoft"
                        size="sm"
                        className="h-8 px-2 text-sm"
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

          <AdminListPaginationFooter
            limit={limit}
            onLimitChange={(value) => {
              setPage(1)
              setLimit(value)
            }}
            page={page}
            totalPages={totalPages}
            total={total}
            canPrev={canPrev}
            canNext={canNext}
            isLoading={isLoading}
            onPrevPage={() => setPage((p) => Math.max(1, p - 1))}
            onNextPage={() => setPage((p) => p + 1)}
            centerContent={
              <span>
                已选 <span className="font-medium text-foreground">{selectedIds.length}</span> 条
              </span>
            }
            endActions={
              <Button
                type="button"
                variant="destructiveSoft"
                size="sm"
                className="h-8 gap-1"
                disabled={selectedIds.length === 0 || batchDeleting}
                onClick={() => void handleBatchDelete()}
              >
                {batchDeleting ? "批量删除中…" : "批量删除"}
              </Button>
            }
          />
        </div>
      ) : (
        <StatePanel status="empty" title="暂无反馈工单" description="目前没有匹配筛选条件的反馈工单" />
      )}
    </div>
  )
}
