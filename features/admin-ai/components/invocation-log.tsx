"use client"

import { useCallback, useEffect, useState } from "react"
import { Eye, RefreshCw, Search } from "lucide-react"
import type {
  AdminAIInvocationDetailResponseData,
  AdminAIInvocationListResponseData,
} from "@/lib/api/contracts/admin-ai"
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
import { AIAccessGate } from "./ai-access-gate"
import { JsonPreview, PageSection } from "./shared"
import {
  formatDateTime,
  formatNumber,
  getInvocationStatusMeta,
} from "@/features/admin-ai/lib/view-model"

export function InvocationLog() {
  const [data, setData] = useState<AdminAIInvocationListResponseData | null>(null)
  const [detail, setDetail] = useState<AdminAIInvocationDetailResponseData | null>(null)
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
  const [isDetailLoading, setIsDetailLoading] = useState(false)
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

  const fetchDetail = useCallback(async (invocationId: string) => {
    setIsDetailLoading(true)
    try {
      const result = await adminRequestData<AdminAIInvocationDetailResponseData>(
        `/admin/ai/invocations/${invocationId}`,
        { method: "GET" },
        "获取调用详情失败",
      )
      setDetail(result)
    } catch (fetchError) {
      setAuthExpired(isAdminSessionExpiredError(fetchError))
      setError(getAdminApiErrorMessage(fetchError, "获取调用详情失败"))
    } finally {
      setIsDetailLoading(false)
    }
  }, [])

  useEffect(() => {
    void fetchList()
  }, [fetchList])

  return (
    <AIAccessGate>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">调用日志</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            查看真实 `llm_invocations` 调用记录，包括状态、耗时、Token 与脱敏请求响应载荷。
          </p>
        </div>

        {error && !data ? (
          <StatePanel status="error" title="获取调用日志失败" description={error} actionLabel="重试" onAction={() => void fetchList()} />
        ) : (
          <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
            <PageSection
              title="调用列表"
              description="支持按状态、Provider、Model、Agent 与日期范围筛选。"
              action={
                <Button type="button" variant="outline" className="gap-1.5" onClick={() => void fetchList()}>
                  <RefreshCw className="h-4 w-4" />
                  刷新
                </Button>
              }
            >
              <div className="space-y-4">
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  <div className="relative md:col-span-2 xl:col-span-3">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input value={keyword} onChange={(event) => setKeyword(event.target.value)} placeholder="关键词：invocation / session / user / provider / model / agent / errorCode" className="pl-9" />
                  </div>
                  <select value={status} onChange={(event) => {
                    setPage(1)
                    setStatus(event.target.value)
                  }} className="h-10 rounded-md border border-border bg-background px-3 text-sm text-foreground">
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
                  }} className="h-10 rounded-md border border-border bg-background px-3 text-sm text-foreground">
                    <option value="">全部 Provider</option>
                    {data?.providerOptions?.map((item) => (
                      <option key={item.code} value={item.code}>{item.name}</option>
                    ))}
                  </select>
                  <select value={modelCode} onChange={(event) => {
                    setPage(1)
                    setModelCode(event.target.value)
                  }} className="h-10 rounded-md border border-border bg-background px-3 text-sm text-foreground">
                    <option value="">全部 Model</option>
                    {data?.modelOptions?.map((item) => (
                      <option key={item.code} value={item.code}>{item.name}</option>
                    ))}
                  </select>
                  <select value={agentCode} onChange={(event) => {
                    setPage(1)
                    setAgentCode(event.target.value)
                  }} className="h-10 rounded-md border border-border bg-background px-3 text-sm text-foreground">
                    <option value="">全部 Agent</option>
                    {data?.agentOptions?.map((item) => (
                      <option key={item.code} value={item.code}>{item.name}</option>
                    ))}
                  </select>
                  <select value={dateRange} onChange={(event) => {
                    setPage(1)
                    setDateRange(event.target.value)
                  }} className="h-10 rounded-md border border-border bg-background px-3 text-sm text-foreground">
                    <option value="24h">24h</option>
                    <option value="7d">7d</option>
                    <option value="30d">30d</option>
                    <option value="90d">90d</option>
                  </select>
                  <Button type="button" variant="outline" onClick={() => {
                    setPage(1)
                    setKeywordApplied(keyword.trim())
                  }}>
                    搜索
                  </Button>
                </div>

                {isLoading && !data ? (
                  <div className="space-y-3">
                    {[1, 2, 3].map((item) => (
                      <div key={item} className="h-24 animate-pulse rounded-xl border border-border bg-muted/40" />
                    ))}
                  </div>
                ) : data?.items.length ? (
                  <div className="space-y-3">
                    {data.items.map((item) => {
                      const meta = getInvocationStatusMeta(item.status)
                      return (
                        <div key={item.invocationId} className="rounded-xl border border-border bg-background/60 p-4">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <div className="flex flex-wrap items-center gap-2">
                                <span className={`inline-flex rounded-full border px-2 py-1 text-[11px] ${meta.className}`}>{meta.label}</span>
                                <span className="text-sm font-semibold text-foreground">{item.agentCode}</span>
                              </div>
                              <p className="mt-2 text-xs text-muted-foreground">{item.providerCode} / {item.modelCode}</p>
                              <p className="mt-1 text-xs text-muted-foreground">{item.invocationId}</p>
                            </div>
                            <Button type="button" variant="outline" size="sm" className="gap-1.5" onClick={() => void fetchDetail(item.invocationId)}>
                              <Eye className="h-3.5 w-3.5" />
                              详情
                            </Button>
                          </div>
                          <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                            <span>tokens {formatNumber(item.totalTokens)}</span>
                            <span>·</span>
                            <span>latency {formatNumber(item.latencyMs)} ms</span>
                            <span>·</span>
                            <span>{item.finishReason ?? item.errorCode ?? "no-finish-reason"}</span>
                            <span>·</span>
                            <span>{formatDateTime(item.createdAt)}</span>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <StatePanel status="empty" title="暂无调用日志" description="当前筛选条件下没有匹配的调用记录。" />
                )}
              </div>

              <div className="mt-4">
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
                />
              </div>
            </PageSection>

            <PageSection title="调用详情" description="展示脱敏后的请求 / 响应 payload。">
              {isDetailLoading ? (
                <div className="h-80 animate-pulse rounded-xl border border-border bg-muted/30" />
              ) : detail ? (
                <div className="space-y-4">
                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="rounded-xl border border-border bg-background/60 p-4 text-sm">
                      <p className="font-medium text-foreground">基础信息</p>
                      <div className="mt-3 space-y-1 text-muted-foreground">
                        <p>状态：{detail.invocation.status}</p>
                        <p>Provider：{detail.invocation.providerCode}</p>
                        <p>Model：{detail.invocation.modelCode}</p>
                        <p>Agent：{detail.invocation.agentCode}</p>
                        <p>耗时：{formatNumber(detail.invocation.latencyMs)} ms</p>
                        <p>首包：{formatNumber(detail.invocation.firstChunkLatencyMs)} ms</p>
                        <p>时间：{formatDateTime(detail.invocation.createdAt)}</p>
                      </div>
                    </div>
                    <div className="rounded-xl border border-border bg-background/60 p-4 text-sm">
                      <p className="font-medium text-foreground">Token 与终止信息</p>
                      <div className="mt-3 space-y-1 text-muted-foreground">
                        <p>prompt：{formatNumber(detail.invocation.promptTokens)}</p>
                        <p>completion：{formatNumber(detail.invocation.completionTokens)}</p>
                        <p>total：{formatNumber(detail.invocation.totalTokens)}</p>
                        <p>finishReason：{detail.invocation.finishReason ?? "暂无"}</p>
                        <p>errorCode：{detail.invocation.errorCode ?? "暂无"}</p>
                        <p>errorMessage：{detail.invocation.errorMessage ?? "暂无"}</p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <p className="mb-2 text-sm font-medium text-foreground">Request Payload</p>
                      <JsonPreview value={detail.invocation.requestPayloadRedacted} />
                    </div>
                    <div>
                      <p className="mb-2 text-sm font-medium text-foreground">Response Payload</p>
                      <JsonPreview value={detail.invocation.responsePayloadRedacted} />
                    </div>
                  </div>
                </div>
              ) : (
                <StatePanel status="empty" title="尚未选择调用记录" description="点击左侧某条调用的“详情”按钮后，在这里查看完整脱敏信息。" />
              )}
            </PageSection>
          </div>
        )}
      </div>
    </AIAccessGate>
  )
}
