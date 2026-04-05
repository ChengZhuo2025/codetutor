"use client"

import { useCallback, useEffect, useState } from "react"
import { Plus, RefreshCw, Search } from "lucide-react"
import type {
  AdminAIAgentDetailResponseData,
  AdminAIAgentListResponseData,
  AdminAIAgentUpsertRequest,
  AdminAIModelListResponseData,
  AdminAIProviderListResponseData,
} from "@/lib/api/contracts/admin-ai"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { StatePanel } from "@/components/ui/state-panel"
import { useAppToast } from "@/components/app-feedback/app-toast-provider"
import { AdminListPaginationFooter } from "@/features/admin-shell/components/admin-list-pagination-footer"
import { useAdminSessionExpiryRedirect } from "@/features/admin-shell/lib/use-admin-session-expiry-redirect"
import {
  adminRequestData,
  getAdminApiErrorMessage,
  isAdminSessionExpiredError,
} from "@/lib/api/admin-bff-client"
import { AIAccessGate } from "./ai-access-gate"
import { PageSection, SaveActionRow } from "./shared"
import { prettyJson, safeJsonParse } from "@/features/admin-ai/lib/view-model"

const EMPTY_FORM = {
  code: "",
  name: "",
  scenarioType: "teaching",
  description: "",
  systemPromptTemplate: "",
  developerPromptTemplate: "",
  defaultProviderCode: "",
  defaultModelCode: "",
  contextMessageLimit: 8,
  maxOutputTokens: 2048,
  temperature: 0.3,
  topP: 0.85,
  streamEnabled: true,
  isActive: true,
  metadataText: "{}",
  changeReason: "",
}

type AgentFormState = typeof EMPTY_FORM

function mapDetailToForm(detail: AdminAIAgentDetailResponseData["agent"]): AgentFormState {
  return {
    code: detail.code,
    name: detail.name,
    scenarioType: detail.scenarioType,
    description: detail.description ?? "",
    systemPromptTemplate: detail.systemPromptTemplate,
    developerPromptTemplate: detail.developerPromptTemplate ?? "",
    defaultProviderCode: detail.defaultProviderCode,
    defaultModelCode: detail.defaultModelCode,
    contextMessageLimit: detail.contextMessageLimit,
    maxOutputTokens: detail.maxOutputTokens,
    temperature: detail.temperature,
    topP: detail.topP ?? 0.85,
    streamEnabled: detail.streamEnabled,
    isActive: detail.isActive,
    metadataText: prettyJson(detail.metadata),
    changeReason: "",
  }
}

export function AgentManagement() {
  const toast = useAppToast()
  const [data, setData] = useState<AdminAIAgentListResponseData | null>(null)
  const [providerData, setProviderData] = useState<AdminAIProviderListResponseData | null>(null)
  const [modelData, setModelData] = useState<AdminAIModelListResponseData | null>(null)
  const [keyword, setKeyword] = useState("")
  const [keywordApplied, setKeywordApplied] = useState("")
  const [status, setStatus] = useState("all")
  const [scenarioType, setScenarioType] = useState("all")
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState("20")
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [selectedDetail, setSelectedDetail] = useState<AdminAIAgentDetailResponseData | null>(null)
  const [form, setForm] = useState<AgentFormState>(EMPTY_FORM)
  const [isLoading, setIsLoading] = useState(true)
  const [isDetailLoading, setIsDetailLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [authExpired, setAuthExpired] = useState(false)

  useAdminSessionExpiryRedirect(authExpired)

  const totalPages = Math.max(1, Math.ceil((data?.total ?? 0) / (Number.parseInt(limit, 10) || 20)) || 1)
  const isCreateMode = selectedId == null

  const fetchReferenceData = useCallback(async () => {
    try {
      const [providers, models] = await Promise.all([
        adminRequestData<AdminAIProviderListResponseData>("/admin/ai/providers?status=active&page=1&limit=100", { method: "GET" }, "获取 Provider 选项失败"),
        adminRequestData<AdminAIModelListResponseData>("/admin/ai/models?status=active&page=1&limit=100", { method: "GET" }, "获取 Model 选项失败"),
      ])
      setProviderData(providers)
      setModelData(models)
      setForm((prev) => ({
        ...prev,
        defaultProviderCode: prev.defaultProviderCode || providers.items[0]?.code || "",
        defaultModelCode: prev.defaultModelCode || models.items[0]?.code || "",
      }))
    } catch (fetchError) {
      setAuthExpired(isAdminSessionExpiredError(fetchError))
      toast.error(getAdminApiErrorMessage(fetchError, "获取 Agent 选项失败"))
    }
  }, [toast])

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

  const fetchDetail = useCallback(async (agentId: string) => {
    setIsDetailLoading(true)
    try {
      const result = await adminRequestData<AdminAIAgentDetailResponseData>(
        `/admin/ai/agents/${agentId}`,
        { method: "GET" },
        "获取 Agent 详情失败",
      )
      setSelectedDetail(result)
      setForm(mapDetailToForm(result.agent))
    } catch (fetchError) {
      setAuthExpired(isAdminSessionExpiredError(fetchError))
      toast.error(getAdminApiErrorMessage(fetchError, "获取 Agent 详情失败"))
    } finally {
      setIsDetailLoading(false)
    }
  }, [toast])

  useEffect(() => {
    void fetchReferenceData()
  }, [fetchReferenceData])

  useEffect(() => {
    void fetchList()
  }, [fetchList])

  useEffect(() => {
    if (selectedId) {
      void fetchDetail(selectedId)
    } else {
      setSelectedDetail(null)
      setForm((prev) => ({
        ...EMPTY_FORM,
        defaultProviderCode: providerData?.items[0]?.code ?? prev.defaultProviderCode,
        defaultModelCode: modelData?.items[0]?.code ?? prev.defaultModelCode,
      }))
    }
  }, [fetchDetail, modelData?.items, providerData?.items, selectedId])

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setIsSaving(true)
    try {
      const payload: AdminAIAgentUpsertRequest = {
        code: form.code,
        name: form.name,
        scenarioType: form.scenarioType as AdminAIAgentUpsertRequest["scenarioType"],
        description: form.description || null,
        systemPromptTemplate: form.systemPromptTemplate,
        developerPromptTemplate: form.developerPromptTemplate || null,
        defaultProviderCode: form.defaultProviderCode,
        defaultModelCode: form.defaultModelCode,
        contextMessageLimit: Number(form.contextMessageLimit),
        maxOutputTokens: Number(form.maxOutputTokens),
        temperature: Number(form.temperature),
        topP: Number(form.topP),
        streamEnabled: form.streamEnabled,
        isActive: form.isActive,
        metadata: safeJsonParse(form.metadataText),
        changeReason: form.changeReason,
      }

      if (selectedId) {
        await adminRequestData<AdminAIAgentDetailResponseData>(
          `/admin/ai/agents/${selectedId}`,
          {
            method: "PATCH",
            body: JSON.stringify(payload),
          },
          "更新 Agent 失败",
        )
        toast.success("Agent 已更新")
        await fetchDetail(selectedId)
      } else {
        const result = await adminRequestData<AdminAIAgentDetailResponseData>(
          "/admin/ai/agents",
          {
            method: "POST",
            body: JSON.stringify(payload),
          },
          "创建 Agent 失败",
        )
        toast.success("Agent 已创建")
        setSelectedId(result.agent.agentId)
      }

      await fetchList()
    } catch (saveError) {
      setAuthExpired(isAdminSessionExpiredError(saveError))
      toast.error(getAdminApiErrorMessage(saveError, selectedId ? "更新 Agent 失败" : "创建 Agent 失败"))
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <AIAccessGate>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Agent 管理</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            维护真实运行中的 Agent 模板，包括 prompt、默认 Provider/Model、采样参数和上下文预算。
          </p>
        </div>

        {error && !data ? (
          <StatePanel
            status="error"
            title="获取 Agent 列表失败"
            description={error}
            actionLabel="重试"
            onAction={() => void fetchList()}
          />
        ) : (
          <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
            <PageSection
              title="Agent 列表"
              description="按场景类型和启停状态查看当前 Agent 模板。"
              action={
                <div className="flex items-center gap-2">
                  <Button type="button" variant="outline" className="gap-1.5" onClick={() => void fetchList()}>
                    <RefreshCw className="h-4 w-4" />
                    刷新
                  </Button>
                  <Button type="button" className="gap-1.5" onClick={() => setSelectedId(null)}>
                    <Plus className="h-4 w-4" />
                    新建 Agent
                  </Button>
                </div>
              }
            >
              <div className="space-y-4">
                <div className="grid gap-3 md:grid-cols-[1fr_auto_auto_auto]">
                  <div className="relative min-w-0">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input value={keyword} onChange={(event) => setKeyword(event.target.value)} placeholder="关键词：code / 名称 / provider / model" className="pl-9" />
                  </div>
                  <select value={scenarioType} onChange={(event) => {
                    setPage(1)
                    setScenarioType(event.target.value)
                  }} className="h-10 rounded-md border border-border bg-background px-3 text-sm text-foreground">
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
                  }} className="h-10 rounded-md border border-border bg-background px-3 text-sm text-foreground">
                    <option value="all">全部状态</option>
                    <option value="active">仅启用</option>
                    <option value="inactive">仅停用</option>
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
                    {data.items.map((item) => (
                      <button
                        key={item.agentId}
                        type="button"
                        onClick={() => setSelectedId(item.agentId)}
                        className={`w-full rounded-xl border p-4 text-left transition-colors ${selectedId === item.agentId ? "border-primary bg-primary/5" : "border-border bg-background/60 hover:bg-muted/30"}`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-semibold text-foreground">{item.name}</p>
                            <p className="mt-1 text-xs text-muted-foreground">{item.code}</p>
                          </div>
                          <span className={`inline-flex rounded-full border px-2 py-1 text-[11px] ${item.isActive ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" : "border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-300"}`}>
                            {item.isActive ? "启用" : "停用"}
                          </span>
                        </div>
                        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                          <span>{item.scenarioType}</span>
                          <span>·</span>
                          <span>{item.providerCode} / {item.modelCode}</span>
                          <span>·</span>
                          <span>{item.bindingCount} 条规则</span>
                          <span>·</span>
                          <span>{item.skillCount} 个技能</span>
                        </div>
                      </button>
                    ))}
                  </div>
                ) : (
                  <StatePanel status="empty" title="暂无 Agent" description="当前筛选条件下没有匹配的 Agent。" />
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

            <PageSection
              title={isCreateMode ? "新建 Agent" : "编辑 Agent"}
              description={selectedDetail ? `命中规则 ${selectedDetail.bindings.length} · Skill 绑定 ${selectedDetail.skillBindings.length}` : "新建 Agent"}
            >
              {isDetailLoading ? (
                <div className="h-80 animate-pulse rounded-xl border border-border bg-muted/30" />
              ) : (
                <form className="space-y-4" onSubmit={handleSubmit}>
                  <div className="grid gap-4 md:grid-cols-2">
                    <label className="space-y-1">
                      <span className="text-sm text-muted-foreground">Code</span>
                      <Input value={form.code} onChange={(event) => setForm((prev) => ({ ...prev, code: event.target.value }))} />
                    </label>
                    <label className="space-y-1">
                      <span className="text-sm text-muted-foreground">名称</span>
                      <Input value={form.name} onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))} />
                    </label>
                    <label className="space-y-1">
                      <span className="text-sm text-muted-foreground">场景类型</span>
                      <select value={form.scenarioType} onChange={(event) => setForm((prev) => ({ ...prev, scenarioType: event.target.value }))} className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm text-foreground">
                        <option value="teaching">teaching</option>
                        <option value="blocked_help">blocked_help</option>
                        <option value="task_review">task_review</option>
                        <option value="completion_feedback">completion_feedback</option>
                        <option value="path_guidance">path_guidance</option>
                      </select>
                    </label>
                    <label className="space-y-1">
                      <span className="text-sm text-muted-foreground">默认 Provider</span>
                      <select value={form.defaultProviderCode} onChange={(event) => setForm((prev) => ({ ...prev, defaultProviderCode: event.target.value }))} className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm text-foreground">
                        <option value="">请选择</option>
                        {providerData?.items.map((item) => (
                          <option key={item.providerId} value={item.code}>{item.name} ({item.code})</option>
                        ))}
                      </select>
                    </label>
                    <label className="space-y-1">
                      <span className="text-sm text-muted-foreground">默认 Model</span>
                      <select value={form.defaultModelCode} onChange={(event) => setForm((prev) => ({ ...prev, defaultModelCode: event.target.value }))} className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm text-foreground">
                        <option value="">请选择</option>
                        {modelData?.items.map((item) => (
                          <option key={item.modelId} value={item.code}>{item.displayName} ({item.code})</option>
                        ))}
                      </select>
                    </label>
                    <label className="space-y-1">
                      <span className="text-sm text-muted-foreground">描述</span>
                      <Input value={form.description} onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))} />
                    </label>
                  </div>

                  <div className="grid gap-4 md:grid-cols-4">
                    <label className="space-y-1">
                      <span className="text-sm text-muted-foreground">上下文消息上限</span>
                      <Input type="number" value={String(form.contextMessageLimit)} onChange={(event) => setForm((prev) => ({ ...prev, contextMessageLimit: Number(event.target.value) || 0 }))} />
                    </label>
                    <label className="space-y-1">
                      <span className="text-sm text-muted-foreground">最大输出 Tokens</span>
                      <Input type="number" value={String(form.maxOutputTokens)} onChange={(event) => setForm((prev) => ({ ...prev, maxOutputTokens: Number(event.target.value) || 0 }))} />
                    </label>
                    <label className="space-y-1">
                      <span className="text-sm text-muted-foreground">Temperature</span>
                      <Input type="number" step="0.1" value={String(form.temperature)} onChange={(event) => setForm((prev) => ({ ...prev, temperature: Number(event.target.value) || 0 }))} />
                    </label>
                    <label className="space-y-1">
                      <span className="text-sm text-muted-foreground">Top P</span>
                      <Input type="number" step="0.05" value={String(form.topP)} onChange={(event) => setForm((prev) => ({ ...prev, topP: Number(event.target.value) || 0 }))} />
                    </label>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <label className="space-y-1">
                      <span className="text-sm text-muted-foreground">System Prompt</span>
                      <textarea value={form.systemPromptTemplate} onChange={(event) => setForm((prev) => ({ ...prev, systemPromptTemplate: event.target.value }))} className="min-h-40 w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground" />
                    </label>
                    <label className="space-y-1">
                      <span className="text-sm text-muted-foreground">Developer Prompt</span>
                      <textarea value={form.developerPromptTemplate} onChange={(event) => setForm((prev) => ({ ...prev, developerPromptTemplate: event.target.value }))} className="min-h-40 w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground" />
                    </label>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <label className="flex items-center gap-2 rounded-xl border border-border bg-background/60 px-3 py-3 text-sm text-foreground">
                      <input type="checkbox" checked={form.streamEnabled} onChange={(event) => setForm((prev) => ({ ...prev, streamEnabled: event.target.checked }))} />
                      启用流式输出
                    </label>
                    <label className="flex items-center gap-2 rounded-xl border border-border bg-background/60 px-3 py-3 text-sm text-foreground">
                      <input type="checkbox" checked={form.isActive} onChange={(event) => setForm((prev) => ({ ...prev, isActive: event.target.checked }))} />
                      启用
                    </label>
                  </div>

                  <label className="space-y-1">
                    <span className="text-sm text-muted-foreground">Metadata JSON</span>
                    <textarea value={form.metadataText} onChange={(event) => setForm((prev) => ({ ...prev, metadataText: event.target.value }))} className="min-h-28 w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground" />
                  </label>

                  <label className="space-y-1">
                    <span className="text-sm text-muted-foreground">变更原因</span>
                    <textarea value={form.changeReason} onChange={(event) => setForm((prev) => ({ ...prev, changeReason: event.target.value }))} className="min-h-24 w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground" />
                  </label>

                  <SaveActionRow
                    isSaving={isSaving}
                    saveLabel={isCreateMode ? "创建 Agent" : "保存修改"}
                    onReset={() => {
                      if (selectedDetail) {
                        setForm(mapDetailToForm(selectedDetail.agent))
                      } else {
                        setForm((prev) => ({
                          ...EMPTY_FORM,
                          defaultProviderCode: providerData?.items[0]?.code ?? prev.defaultProviderCode,
                          defaultModelCode: modelData?.items[0]?.code ?? prev.defaultModelCode,
                        }))
                      }
                    }}
                  />
                </form>
              )}
            </PageSection>
          </div>
        )}
      </div>
    </AIAccessGate>
  )
}
