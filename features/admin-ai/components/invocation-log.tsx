"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { RefreshCw } from "lucide-react"
import type { AdminAIInvocationListResponseData } from "@/lib/api/contracts/admin-ai"
import { Button } from "@/components/ui/button"
import { SearchInput } from "@/components/ui/search-input"
import { StatePanel } from "@/components/ui/state-panel"
import { AdminListPaginationFooter } from "@/features/admin-shell/components/admin-list-pagination-footer"
import { AdminSelect } from "@/features/admin-shell/components/admin-select"
import { AdminTag } from "@/features/admin-shell/components/admin-tag"
import { useAdminSessionExpiryRedirect } from "@/features/admin-shell/lib/use-admin-session-expiry-redirect"
import {
  adminRequestData,
  getAdminApiErrorMessage,
  isAdminSessionExpiredError,
} from "@/lib/api/admin-bff-client"
import { ADMIN_ROUTES } from "@/constants/routes"
import {
  formatDateTime,
  formatNumber,
  getInvocationStatusMeta,
} from "@/features/admin-ai/lib/view-model"
import { ListFilterCard, ListPageHeader } from "./shared"

export function InvocationLog() {
  const [data, setData] = useState<AdminAIInvocationListResponseData | null>(null)
  const [keyword, setKeyword] = useState("")
  const [keywordApplied, setKeywordApplied] = useState("")
  const [status, setStatus] = useState("all")
  const [providerCode, setProviderCode] = useState("")
  const [modelCode, setModelCode] = useState("")
  const [agentCode, setAgentCode] = useState("")
  const [dateRange, setDateRange] = useState("7d")
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
      params.set("status", status)
      params.set("dateRange", dateRange)
      params.set("page", String(page))
      params.set("limit", limit)
      if (providerCode) params.set("providerCode", providerCode)
      if (modelCode) params.set("modelCode", modelCode)
      if (agentCode) params.set("agentCode", agentCode)
      if (keywordApplied) params.set("keyword", keywordApplied)

      const result = await adminRequestData<AdminAIInvocationListResponseData>(
        `/admin/ai/invocations?${params.toString()}`,
        { method: "GET" },
        "获取调用日志失败",
      )
      setData(result)
    } catch (fetchError) {
      setAuthExpired(isAdminSessionExpiredError(fetchError))
      setError(getAdminApiErrorMessage(fetchError, "获取调用日志失败"))
    } finally {
      setIsLoading(false)
    }
  }, [agentCode, dateRange, keywordApplied, limit, modelCode, page, providerCode, status])

  useEffect(() => {
    void fetchList()
  }, [fetchList])

  const applySearch = () => {
    setPage(1)
    setKeywordApplied(keyword.trim())
  }

  const invocationStatusOptions = useMemo(
    () => [
      { value: "all", label: "全部状态" },
      { value: "succeeded", label: "succeeded" },
      { value: "failed", label: "failed" },
      { value: "timed_out", label: "timed_out" },
      { value: "cancelled", label: "cancelled" },
      { value: "streaming", label: "streaming" },
    ],
    [],
  )

  const providerFilterOptions = useMemo(
    () => [
      { value: "", label: "全部 Provider" },
      ...(data?.providerOptions?.map((item) => ({ value: item.code, label: item.name })) ?? []),
    ],
    [data?.providerOptions],
  )

  const modelFilterOptions = useMemo(
    () => [
      { value: "", label: "全部 Model" },
      ...(data?.modelOptions?.map((item) => ({ value: item.code, label: item.name })) ?? []),
    ],
    [data?.modelOptions],
  )

  const agentFilterOptions = useMemo(
    () => [
      { value: "", label: "全部 Agent" },
      ...(data?.agentOptions?.map((item) => ({ value: item.code, label: item.name })) ?? []),
    ],
    [data?.agentOptions],
  )

  const dateRangeOptions = useMemo(
    () => [
      { value: "24h", label: "24h" },
      { value: "7d", label: "7d" },
      { value: "30d", label: "30d" },
      { value: "90d", label: "90d" },
    ],
    [],
  )

  return (
    <>
      <div className="space-y-6">
        <ListPageHeader
          title="调用日志"
          description="查看真实 `llm_invocations` 调用记录，包括状态、耗时、Token 与脱敏请求响应载荷。"
          total={data?.total}
          action={
            <Button type="button" variant="outline" className="gap-1.5 self-start lg:self-auto" onClick={() => void fetchList()}>
              <RefreshCw className="h-4 w-4" />
              刷新
            </Button>
          }
        />

        {error && !data ? (
          <StatePanel status="error" title="获取调用日志失败" description={error} actionLabel="重试" onAction={() => void fetchList()} />
        ) : (
          <>
            <ListFilterCard>
            <div className="flex flex-col gap-3 md:flex-row">
                <SearchInput
                  value={keyword}
                  onChange={(event) => setKeyword(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      applySearch()
                    }
                  }}
                  placeholder="关键词：invocation / session / user / provider / model / agent / errorCode"
                />
                <AdminSelect
                  value={status}
                  onValueChange={(next) => {
                    setPage(1)
                    setStatus(next)
                  }}
                  options={invocationStatusOptions}
                />
                <AdminSelect
                  value={providerCode}
                  onValueChange={(next) => {
                    setPage(1)
                    setProviderCode(next)
                  }}
                  options={providerFilterOptions}
                />
                <AdminSelect
                  value={modelCode}
                  onValueChange={(next) => {
                    setPage(1)
                    setModelCode(next)
                  }}
                  options={modelFilterOptions}
                />
                <AdminSelect
                  value={agentCode}
                  onValueChange={(next) => {
                    setPage(1)
                    setAgentCode(next)
                  }}
                  options={agentFilterOptions}
                />
                <AdminSelect
                  value={dateRange}
                  onValueChange={(next) => {
                    setPage(1)
                    setDateRange(next)
                  }}
                  options={dateRangeOptions}
                />
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
                        <th className="w-[28%] px-4 py-3 text-left text-xs font-medium text-muted-foreground">调用</th>
                        <th className="w-[7%] px-4 py-3 text-left text-xs font-medium text-muted-foreground">状态</th>
                        <th className="w-[16%] px-4 py-3 text-left text-xs font-medium text-muted-foreground">Agent</th>
                        <th className="w-[12%] px-4 py-3 text-left text-xs font-medium text-muted-foreground">Provider / Model</th>
                        <th className="w-[8%] px-4 py-3 text-left text-xs font-medium text-muted-foreground">Tokens</th>
                        <th className="w-[9%] px-4 py-3 text-left text-xs font-medium text-muted-foreground">耗时 / 结果</th>
                        <th className="w-[10%] px-4 py-3 text-left text-xs font-medium text-muted-foreground">时间</th>
                        <th className="w-[8%] px-4 py-3 text-right text-xs font-medium text-muted-foreground">操作</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {data.items.map((item) => {
                        const meta = getInvocationStatusMeta(item.status)
                        return (
                          <tr key={item.invocationId} className="transition-colors hover:bg-muted/20">
                            <td className="px-4 py-4 align-top">
                              <p className="break-all text-sm line-clamp-1 text-foreground">{item.invocationId}</p>
                              <p className="mt-1 break-all text-xs line-clamp-1 text-muted-foreground">{item.sessionId}</p>
                              <p className="mt-1 text-xs line-clamp-1 text-muted-foreground">user {item.userId}</p>
                            </td>
                            <td className="px-4 py-4 align-top">
                              <AdminTag category="tone" value={mapInvocationTone(item.status)} className={meta.className}>
                                {meta.label}
                              </AdminTag>
                            </td>
                            <td className="px-4 py-4 align-top">
                              <p className="text-sm line-clamp-1 text-foreground">{item.agentCode}</p>
                            </td>
                            <td className="px-4 py-4 align-top">
                              <p className="text-sm text-foreground">{item.providerName}</p>
                              <p className="mt-1 text-xs text-muted-foreground">{item.modelDisplayName}</p>
                            </td>
                            <td className="px-4 py-4 align-top">
                              <p className="text-sm text-foreground">{formatNumber(item.totalTokens)}</p>
                            </td>
                            <td className="px-4 py-4 align-top">
                              <p className="text-sm text-foreground">{formatNumber(item.latencyMs)} ms</p>
                              <p className="mt-1 text-xs text-muted-foreground">{item.finishReason ?? item.errorCode ?? "no-finish-reason"}</p>
                            </td>
                            <td className="px-4 py-4 align-top">
                              <p className="text-sm text-foreground">{formatDateTime(item.createdAt)}</p>
                            </td>
                            <td className="px-4 py-4 align-top">
                              <div className="flex flex-wrap items-center justify-end gap-2">
                                <Button type="button" variant="outline" size="sm" className="h-8 px-2.5" asChild>
                                  <Link href={`${ADMIN_ROUTES.ai}/invocations/${item.invocationId}`}>详情</Link>
                                </Button>
                              </div>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="p-4">
                  <StatePanel status="empty" title="暂无调用日志" description="当前筛选条件下没有匹配的调用记录。" />
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
    </>
  )
}

function mapInvocationTone(status: string) {
  switch (status) {
    case "succeeded":
      return "success"
    case "failed":
      return "danger"
    case "timed_out":
      return "warning"
    case "streaming":
      return "info"
    case "cancelled":
      return "neutral"
    default:
      return "neutral"
  }
}
