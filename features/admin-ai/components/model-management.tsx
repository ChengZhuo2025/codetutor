"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Plus, RefreshCw, Search } from "lucide-react"
import type { AdminAIModelDetailResponseData, AdminAIModelListResponseData } from "@/lib/api/contracts/admin-ai"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { StatePanel } from "@/components/ui/state-panel"
import { AdminListPaginationFooter } from "@/features/admin-shell/components/admin-list-pagination-footer"
import { useAdminSessionExpiryRedirect } from "@/features/admin-shell/lib/use-admin-session-expiry-redirect"
import {
  adminRequestData,
  getAdminApiErrorMessage,
  isAdminSessionExpiredError,
} from "@/lib/api/admin-bff-client"
import { ADMIN_ROUTES } from "@/constants/routes"
import { formatDateTime } from "@/features/admin-ai/lib/view-model"
import { ModelFormSheet } from "./model-form-sheet"
import { ActiveStateBadge, ListFilterCard, ListPageHeader } from "./shared"

export function ModelManagement() {
  const router = useRouter()
  const [data, setData] = useState<AdminAIModelListResponseData | null>(null)
  const [keyword, setKeyword] = useState("")
  const [keywordApplied, setKeywordApplied] = useState("")
  const [status, setStatus] = useState("all")
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState("20")
  const [editingId, setEditingId] = useState<string | null>(null)
  const [sheetOpen, setSheetOpen] = useState(false)
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
      params.set("status", status)
      params.set("page", String(page))
      params.set("limit", limit)
      if (keywordApplied) {
        params.set("keyword", keywordApplied)
      }
      const result = await adminRequestData<AdminAIModelListResponseData>(
        `/admin/ai/models?${params.toString()}`,
        { method: "GET" },
        "获取 Model 列表失败",
      )
      setData(result)
    } catch (fetchError) {
      setAuthExpired(isAdminSessionExpiredError(fetchError))
      setError(getAdminApiErrorMessage(fetchError, "获取 Model 列表失败"))
    } finally {
      setIsLoading(false)
    }
  }, [keywordApplied, limit, page, status])

  useEffect(() => {
    void fetchList()
  }, [fetchList])

  const applySearch = () => {
    setPage(1)
    setKeywordApplied(keyword.trim())
  }

  return (
    <>
      <div className="space-y-6">
        <ListPageHeader
          title="Model 管理"
          description="管理 Provider 下的模型能力、上下文大小、默认输出长度与推荐温度。"
          total={data?.total}
          action={<div className="flex flex-wrap items-center gap-2">
            <Button type="button" variant="outline" className="gap-1.5" onClick={() => void fetchList()}>
              <RefreshCw className="h-4 w-4" />
              刷新
            </Button>
            <Button
              type="button"
              className="gap-1.5"
              onClick={() => {
                setEditingId(null)
                setSheetOpen(true)
              }}
            >
              <Plus className="h-4 w-4" />
              新建 Model
            </Button>
          </div>}
        />

        {error && !data ? (
          <StatePanel
            status="error"
            title="获取 Model 列表失败"
            description={error}
            actionLabel="重试"
            onAction={() => void fetchList()}
          />
        ) : (
          <>
            <ListFilterCard>
              <div className="flex flex-col gap-3 md:flex-row">
                <div className="relative flex-1 min-w-32 max-w-md">
                  <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={keyword}
                    onChange={(event) => setKeyword(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        applySearch()
                      }
                    }}
                    placeholder="关键词：code / displayName / modelName / providerCode"
                    className="h-9 w-full rounded-md border border-border bg-background pl-8 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                  />
                </div>
                <select value={status} onChange={(event) => {
                  setPage(1)
                  setStatus(event.target.value)
                }} className="h-9 rounded-md border border-border bg-background px-3 text-sm text-foreground">
                  <option value="all">全部状态</option>
                  <option value="active">仅启用</option>
                  <option value="inactive">仅停用</option>
                </select>
                <Button type="button" variant="secondary" size="sm" className="h-9" onClick={applySearch}>
                  搜索
                </Button>
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
                  <table className="w-full min-w-[1100px] table-fixed">
                    <thead className="bg-muted/40">
                      <tr className="border-b border-border">
                        <th className="w-[20%] px-4 py-3 text-left text-xs font-medium text-muted-foreground">Model</th>
                        <th className="w-[24%] px-4 py-3 text-left text-xs font-medium text-muted-foreground">Provider / 真实模型</th>
                        <th className="w-[18%] px-4 py-3 text-left text-xs font-medium text-muted-foreground">能力开关</th>
                        <th className="w-[12%] px-4 py-3 text-left text-xs font-medium text-muted-foreground">上下文 / Agent</th>
                        <th className="w-[10%] px-4 py-3 text-left text-xs font-medium text-muted-foreground">最近更新</th>
                        <th className="w-[16%] px-4 py-3 text-right text-xs font-medium text-muted-foreground">操作</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {data.items.map((item) => (
                        <tr key={item.modelId} className="transition-colors hover:bg-muted/20">
                          <td className="px-4 py-4 align-top">
                            <div className="space-y-2">
                              <div className="flex flex-wrap items-center gap-2">
                                <p className="truncate text-sm font-medium text-foreground">{item.displayName}</p>
                                <ActiveStateBadge active={item.isActive} />
                              </div>
                              <p className="font-mono text-[11px] text-muted-foreground">{item.code}</p>
                            </div>
                          </td>
                          <td className="px-4 py-4 align-top">
                            <p className="text-sm text-foreground">{item.providerCode}</p>
                            <p className="mt-1 break-all text-xs text-muted-foreground">{item.modelName}</p>
                          </td>
                          <td className="px-4 py-4 align-top">
                            <div className="space-y-1 text-xs text-muted-foreground">
                              <p>{item.supportsStream ? "支持流式" : "非流式"}</p>
                              <p>{item.supportsJsonMode ? "支持 JSON Mode" : "非 JSON Mode"}</p>
                              <p>{item.supportsToolCalling ? "支持 Tool Calling" : "非 Tool Calling"}</p>
                            </div>
                          </td>
                          <td className="px-4 py-4 align-top">
                            <p className="text-sm text-foreground">{item.maxContextTokens}</p>
                            <p className="mt-1 text-xs text-muted-foreground">默认输出 {item.defaultMaxOutputTokens}</p>
                            <p className="mt-1 text-xs text-muted-foreground">{item.linkedAgentCount} 个 Agent</p>
                          </td>
                          <td className="px-4 py-4 align-top">
                            <p className="text-sm text-foreground">{formatDateTime(item.updatedAt)}</p>
                          </td>
                          <td className="px-4 py-4 align-top">
                            <div className="flex flex-wrap items-center justify-end gap-2">
                              <Button type="button" variant="outline" size="sm" className="h-8 px-2.5" asChild>
                                <Link href={`${ADMIN_ROUTES.ai}/models/${item.modelId}`}>详情</Link>
                              </Button>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="h-8 px-2.5"
                                onClick={() => {
                                  setEditingId(item.modelId)
                                  setSheetOpen(true)
                                }}
                              >
                                编辑
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="p-4">
                  <StatePanel status="empty" title="暂无 Model" description="当前筛选条件下没有匹配的 Model。" />
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

      <ModelFormSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        modelId={editingId}
        onSaved={async (detail: AdminAIModelDetailResponseData) => {
          await fetchList()
          if (!editingId) {
            router.push(`${ADMIN_ROUTES.ai}/models/${detail.model.modelId}`)
          }
        }}
        onAuthExpired={() => setAuthExpired(true)}
      />
    </>
  )
}
