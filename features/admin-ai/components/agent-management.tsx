"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Plus, RefreshCw, Search } from "lucide-react"
import type { AdminAIAgentDetailResponseData, AdminAIAgentListResponseData } from "@/lib/api/contracts/admin-ai"
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
import { AgentFormSheet } from "./agent-form-sheet"
import { ActiveStateBadge, ListFilterCard, ListPageHeader } from "./shared"

export function AgentManagement() {
  const router = useRouter()
  const [data, setData] = useState<AdminAIAgentListResponseData | null>(null)
  const [keyword, setKeyword] = useState("")
  const [keywordApplied, setKeywordApplied] = useState("")
  const [status, setStatus] = useState("all")
  const [scenarioType, setScenarioType] = useState("all")
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
      if (scenarioType !== "all") {
        params.set("scenarioType", scenarioType)
      }
      if (keywordApplied) {
        params.set("keyword", keywordApplied)
      }
      const result = await adminRequestData<AdminAIAgentListResponseData>(
        `/admin/ai/agents?${params.toString()}`,
        { method: "GET" },
        "获取 Agent 列表失败",
      )
      setData(result)
    } catch (fetchError) {
      setAuthExpired(isAdminSessionExpiredError(fetchError))
      setError(getAdminApiErrorMessage(fetchError, "获取 Agent 列表失败"))
    } finally {
      setIsLoading(false)
    }
  }, [keywordApplied, limit, page, scenarioType, status])

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
          title="Agent 管理"
          description="维护真实运行中的 Agent 模板，包括 prompt、默认 Provider/Model、采样参数和上下文预算。"
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
              新建 Agent
            </Button>
          </div>}
        />

        {error && !data ? (
          <StatePanel
            status="error"
            title="获取 Agent 列表失败"
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
                    placeholder="关键词：code / 名称 / provider / model"
                    className="h-9 w-full rounded-md border border-border bg-background pl-8 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                  />
                </div>
                <select value={scenarioType} onChange={(event) => {
                  setPage(1)
                  setScenarioType(event.target.value)
                }} className="h-9 rounded-md border border-border bg-background px-3 text-sm text-foreground">
                  <option value="all">全部场景</option>
                  <option value="teaching">teaching</option>
                  <option value="blocked_help">blocked_help</option>
                  <option value="task_review">task_review</option>
                  <option value="completion_feedback">completion_feedback</option>
                  <option value="path_guidance">path_guidance</option>
                </select>
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
                  <table className="w-full min-w-[1120px] table-fixed">
                    <thead className="bg-muted/40">
                      <tr className="border-b border-border">
                        <th className="w-[24%] px-4 py-3 text-left text-xs font-medium text-muted-foreground">Agent</th>
                        <th className="w-[12%] px-4 py-3 text-left text-xs font-medium text-muted-foreground">场景</th>
                        <th className="w-[16%] px-4 py-3 text-left text-xs font-medium text-muted-foreground">默认 Provider / Model</th>
                        <th className="w-[12%] px-4 py-3 text-left text-xs font-medium text-muted-foreground">规则 / 技能</th>
                        <th className="w-[10%] px-4 py-3 text-left text-xs font-medium text-muted-foreground">流式 / 状态</th>
                        <th className="w-[10%] px-4 py-3 text-left text-xs font-medium text-muted-foreground">最近更新</th>
                        <th className="w-[16%] px-4 py-3 text-right text-xs font-medium text-muted-foreground">操作</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {data.items.map((item) => (
                        <tr key={item.agentId} className="transition-colors hover:bg-muted/20">
                          <td className="px-4 py-4 align-top">
                            <div className="space-y-2">
                              <div className="flex flex-wrap items-center gap-2">
                                <p className="truncate text-sm font-medium text-foreground">{item.name}</p>
                                <ActiveStateBadge active={item.isActive} />
                              </div>
                              <p className="font-mono text-[11px] text-muted-foreground">{item.code}</p>
                            </div>
                          </td>
                          <td className="px-4 py-4 align-top">
                            <p className="text-sm text-foreground">{item.scenarioType}</p>
                          </td>
                          <td className="px-4 py-4 align-top">
                            <p className="text-sm text-foreground">{item.providerCode}</p>
                            <p className="mt-1 text-xs text-muted-foreground">{item.modelCode}</p>
                          </td>
                          <td className="px-4 py-4 align-top">
                            <p className="text-sm text-foreground">{item.bindingCount} 条规则</p>
                            <p className="mt-1 text-xs text-muted-foreground">{item.skillCount} 个技能</p>
                          </td>
                          <td className="px-4 py-4 align-top">
                            <p className="text-sm text-foreground">{item.streamEnabled ? "流式" : "非流式"}</p>
                            <p className="mt-1 text-xs text-muted-foreground">{item.isActive ? "启用中" : "已停用"}</p>
                          </td>
                          <td className="px-4 py-4 align-top">
                            <p className="text-sm text-foreground">{formatDateTime(item.updatedAt)}</p>
                          </td>
                          <td className="px-4 py-4 align-top">
                            <div className="flex flex-wrap items-center justify-end gap-2">
                              <Button type="button" variant="outline" size="sm" className="h-8 px-2.5" asChild>
                                <Link href={`${ADMIN_ROUTES.ai}/agents/${item.agentId}`}>详情</Link>
                              </Button>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="h-8 px-2.5"
                                onClick={() => {
                                  setEditingId(item.agentId)
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
                  <StatePanel status="empty" title="暂无 Agent" description="当前筛选条件下没有匹配的 Agent。" />
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

      <AgentFormSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        agentId={editingId}
        onSaved={async (detail: AdminAIAgentDetailResponseData) => {
          await fetchList()
          if (!editingId) {
            router.push(`${ADMIN_ROUTES.ai}/agents/${detail.agent.agentId}`)
          }
        }}
        onAuthExpired={() => setAuthExpired(true)}
      />
    </>
  )
}
