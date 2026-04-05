"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { RefreshCw, Search } from "lucide-react"
import type { AdminAIInvocationListResponseData } from "@/lib/api/contracts/admin-ai"
import { Badge } from "@/components/ui/badge"
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
                    placeholder="关键词：invocation / session / user / provider / model / agent / errorCode"
                    className="h-9 w-full rounded-md border border-border bg-background pl-8 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                  />
                </div>
                <select value={status} onChange={(event) => {
                  setPage(1)
                  setStatus(event.target.value)
                }} className="h-9 rounded-md border border-border bg-background px-3 text-sm text-foreground">
                  <option value="all">全部状态</option>
                  <option value="succeeded">succeeded</option>
                  <option value="failed">failed</option>
                  <option value="timed_out">timed_out</option>
                  <option value="cancelled">cancelled</option>
                  <option value="streaming">streaming</option>
                </select>
                <select value={providerCode} onChange={(event) => {
                  setPage(1)
                  setProviderCode(event.target.value)
                }} className="h-9 rounded-md border border-border bg-background px-3 text-sm text-foreground">
                  <option value="">全部 Provider</option>
                  {data?.providerOptions?.map((item) => (
                    <option key={item.code} value={item.code}>{item.name}</option>
                  ))}
                </select>
                <select value={modelCode} onChange={(event) => {
                  setPage(1)
                  setModelCode(event.target.value)
                }} className="h-9 rounded-md border border-border bg-background px-3 text-sm text-foreground">
                  <option value="">全部 Model</option>
                  {data?.modelOptions?.map((item) => (
                    <option key={item.code} value={item.code}>{item.name}</option>
                  ))}
                </select>
                <select value={agentCode} onChange={(event) => {
                  setPage(1)
                  setAgentCode(event.target.value)
                }} className="h-9 rounded-md border border-border bg-background px-3 text-sm text-foreground">
                  <option value="">全部 Agent</option>
                  {data?.agentOptions?.map((item) => (
                    <option key={item.code} value={item.code}>{item.name}</option>
                  ))}
                </select>
                <select value={dateRange} onChange={(event) => {
                  setPage(1)
                  setDateRange(event.target.value)
                }} className="h-9 rounded-md border border-border bg-background px-3 text-sm text-foreground">
                  <option value="24h">24h</option>
                  <option value="7d">7d</option>
                  <option value="30d">30d</option>
                  <option value="90d">90d</option>
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
                        <th className="w-[24%] px-4 py-3 text-left text-xs font-medium text-muted-foreground">调用</th>
                        <th className="w-[8%] px-4 py-3 text-left text-xs font-medium text-muted-foreground">状态</th>
                        <th className="w-[16%] px-4 py-3 text-left text-xs font-medium text-muted-foreground">Agent</th>
                        <th className="w-[12%] px-4 py-3 text-left text-xs font-medium text-muted-foreground">Provider / Model</th>
                        <th className="w-[9%] px-4 py-3 text-left text-xs font-medium text-muted-foreground">Tokens</th>
                        <th className="w-[9%] px-4 py-3 text-left text-xs font-medium text-muted-foreground">耗时 / 结果</th>
                        <th className="w-[12%] px-4 py-3 text-left text-xs font-medium text-muted-foreground">时间</th>
                        <th className="w-[8%] px-4 py-3 text-right text-xs font-medium text-muted-foreground">操作</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {data.items.map((item) => {
                        const meta = getInvocationStatusMeta(item.status)
                        return (
                          <tr key={item.invocationId} className="transition-colors hover:bg-muted/20">
                            <td className="px-4 py-4 align-top">
                              <p className="break-all text-sm text-foreground">{item.invocationId}</p>
                              <p className="mt-1 break-all text-xs text-muted-foreground">{item.sessionId}</p>
                              <p className="mt-1 text-xs text-muted-foreground">user {item.userId}</p>
                            </td>
                            <td className="px-4 py-4 align-top">
                              <Badge size="sm" className={meta.className}>
                                {meta.label}
                              </Badge>
                            </td>
                            <td className="px-4 py-4 align-top">
                              <p className="text-sm text-foreground">{item.agentCode}</p>
                            </td>
                            <td className="px-4 py-4 align-top">
                              <p className="text-sm text-foreground">{item.providerCode}</p>
                              <p className="mt-1 text-xs text-muted-foreground">{item.modelCode}</p>
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
