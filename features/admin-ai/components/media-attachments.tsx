"use client"

import { useCallback, useEffect, useState } from "react"
import { RefreshCw, Search } from "lucide-react"
import type { AdminAIMediaAttachmentListResponseData } from "@/lib/api/contracts/admin-ai"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { StatePanel } from "@/components/ui/state-panel"
import { AdminListPaginationFooter } from "@/features/admin-shell/components/admin-list-pagination-footer"
import { AdminSelect } from "@/features/admin-shell/components/admin-select"
import { useAdminSessionExpiryRedirect } from "@/features/admin-shell/lib/use-admin-session-expiry-redirect"
import {
  adminRequestData,
  getAdminApiErrorMessage,
  isAdminSessionExpiredError,
} from "@/lib/api/admin-bff-client"
import { formatDateTime } from "@/features/admin-ai/lib/view-model"
import { ListFilterCard, ListPageHeader } from "./shared"

function formatBytes(size: number) {
  if (size >= 1024 * 1024) {
    return `${(size / 1024 / 1024).toFixed(1)} MB`
  }
  if (size >= 1024) {
    return `${(size / 1024).toFixed(1)} KB`
  }
  return `${size} B`
}

function statusLabel(status: string) {
  switch (status) {
    case "pending":
      return "待处理"
    case "processing":
      return "处理中"
    case "completed":
      return "已完成"
    case "failed":
      return "失败"
    default:
      return status
  }
}

export function MediaAttachments() {
  const [data, setData] = useState<AdminAIMediaAttachmentListResponseData | null>(null)
  const [kind, setKind] = useState("all")
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")
  const [appliedStartDate, setAppliedStartDate] = useState("")
  const [appliedEndDate, setAppliedEndDate] = useState("")
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState("20")
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [authExpired, setAuthExpired] = useState(false)

  useAdminSessionExpiryRedirect(authExpired)

  const totalPages = Math.max(1, Math.ceil((data?.total ?? 0) / (Number.parseInt(limit, 10) || 20)) || 1)

  const fetchList = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams()
      params.set("kind", kind)
      params.set("page", String(page))
      params.set("limit", limit)
      if (appliedStartDate) {
        params.set("startDate", appliedStartDate)
      }
      if (appliedEndDate) {
        params.set("endDate", appliedEndDate)
      }
      const result = await adminRequestData<AdminAIMediaAttachmentListResponseData>(
        `/admin/ai/media/attachments?${params.toString()}`,
        { method: "GET" },
        "获取附件管理列表失败",
      )
      setData(result)
    } catch (fetchError) {
      setAuthExpired(isAdminSessionExpiredError(fetchError))
      setError(getAdminApiErrorMessage(fetchError, "获取附件管理列表失败"))
    } finally {
      setIsLoading(false)
    }
  }, [appliedEndDate, appliedStartDate, kind, limit, page])

  useEffect(() => {
    void fetchList()
  }, [fetchList])

  const applyDateFilter = () => {
    setPage(1)
    setAppliedStartDate(startDate)
    setAppliedEndDate(endDate)
  }

  return (
    <div className="space-y-6">
      <ListPageHeader
        title="附件管理"
        description="查看用户上传的图片、语音文件及其转译处理结果。"
        total={data?.total}
        action={(
          <Button type="button" variant="outline" className="gap-1.5" onClick={() => void fetchList()}>
            <RefreshCw className="h-4 w-4" />
            刷新
          </Button>
        )}
      />

      {error && !data ? (
        <StatePanel status="error" title="获取附件管理列表失败" description={error} actionLabel="重试" onAction={() => void fetchList()} />
      ) : (
        <>
          <ListFilterCard>
            <div className="flex flex-col gap-3 md:flex-row md:items-center">
              <AdminSelect
                value={kind}
                onValueChange={(value) => {
                  setPage(1)
                  setKind(value)
                }}
                options={[
                  { value: "all", label: "全部类型" },
                  { value: "image", label: "图片" },
                  { value: "audio", label: "语音" },
                ]}
              />
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    type="date"
                    value={startDate}
                    onChange={(event) => setStartDate(event.target.value)}
                    className="h-9 w-40 pl-8"
                    aria-label="开始时间段"
                  />
                </div>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(event) => setEndDate(event.target.value)}
                  className="h-9 w-40"
                  aria-label="结束时间段"
                />
                <Button type="button" variant="secondary" size="sm" className="h-9" onClick={applyDateFilter}>
                  筛选时间段
                </Button>
              </div>
            </div>
          </ListFilterCard>

          <div className="overflow-hidden rounded-xl border border-border bg-card">
            {isLoading && !data ? (
              <div className="space-y-3 p-4">
                {[1, 2, 3].map((item) => (
                  <div key={item} className="h-24 animate-pulse rounded-xl border border-border bg-muted/40" />
                ))}
              </div>
            ) : data?.items.length ? (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[1180px] table-fixed">
                  <thead className="bg-muted/40">
                    <tr className="border-b border-border">
                      <th className="w-[14%] px-4 py-3 text-left text-xs font-medium text-muted-foreground">附件</th>
                      <th className="w-[15%] px-4 py-3 text-left text-xs font-medium text-muted-foreground">用户 / 会话</th>
                      <th className="w-[12%] px-4 py-3 text-left text-xs font-medium text-muted-foreground">类型 / 文件</th>
                      <th className="w-[10%] px-4 py-3 text-left text-xs font-medium text-muted-foreground">大小</th>
                      <th className="w-[12%] px-4 py-3 text-left text-xs font-medium text-muted-foreground">处理状态</th>
                      <th className="w-[24%] px-4 py-3 text-left text-xs font-medium text-muted-foreground">转译结果</th>
                      <th className="w-[13%] px-4 py-3 text-left text-xs font-medium text-muted-foreground">创建时间</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {data.items.map((item) => (
                      <tr key={item.attachmentId} className="transition-colors hover:bg-muted/20">
                        <td className="px-4 py-4 align-top">
                          <p className="truncate font-mono text-xs text-foreground">{item.attachmentId}</p>
                          <p className="mt-1 truncate font-mono text-[11px] text-muted-foreground">{item.messageId ?? "未关联消息"}</p>
                        </td>
                        <td className="px-4 py-4 align-top">
                          <p className="truncate font-mono text-xs text-foreground">{item.userId}</p>
                          <p className="mt-1 truncate font-mono text-[11px] text-muted-foreground">{item.sessionId ?? "无会话"}</p>
                        </td>
                        <td className="px-4 py-4 align-top">
                          <p className="text-sm text-foreground">{item.kind === "image" ? "图片" : "语音"}</p>
                          <p className="mt-1 truncate text-xs text-muted-foreground">{item.originalFilename ?? item.mimeType}</p>
                        </td>
                        <td className="px-4 py-4 align-top">
                          <p className="text-sm text-foreground">{formatBytes(item.sizeBytes)}</p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {item.kind === "audio" && item.durationMs ? `${Math.round(item.durationMs / 1000)} 秒` : item.width && item.height ? `${item.width}x${item.height}` : item.mimeType}
                          </p>
                        </td>
                        <td className="px-4 py-4 align-top">
                          <p className="text-sm text-foreground">{statusLabel(item.processingStatus)}</p>
                          {item.errorMessage ? <p className="mt-1 line-clamp-2 text-xs text-destructive">{item.errorMessage}</p> : null}
                        </td>
                        <td className="px-4 py-4 align-top">
                          <p className="line-clamp-2 text-sm text-foreground">
                            {item.transcriptText ?? item.visualSummary ?? item.extractedText ?? "暂无结果"}
                          </p>
                          {item.extractedText && item.extractedText !== item.visualSummary ? (
                            <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">{item.extractedText}</p>
                          ) : null}
                        </td>
                        <td className="px-4 py-4 align-top">
                          <p className="text-sm text-foreground">{formatDateTime(item.createdAt)}</p>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-4">
                <StatePanel status="empty" title="暂无附件" description="当前筛选条件下没有用户上传的图片或语音文件。" />
              </div>
            )}

            <AdminListPaginationFooter
              limit={limit}
              onLimitChange={(value) => {
                setLimit(value)
                setPage(1)
              }}
              page={page}
              totalPages={totalPages}
              total={data?.total ?? 0}
              canPrev={page > 1}
              canNext={page < totalPages}
              isLoading={isLoading}
              onPrevPage={() => setPage((prev) => Math.max(1, prev - 1))}
              onNextPage={() => setPage((prev) => Math.min(totalPages, prev + 1))}
              centerContent={<span>当前页显示 {data?.items.length ?? 0} 条</span>}
            />
          </div>
        </>
      )}
    </div>
  )
}

export default MediaAttachments
