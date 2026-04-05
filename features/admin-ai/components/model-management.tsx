"use client"

import { useCallback, useEffect, useState } from "react"
import { Plus, RefreshCw, Search } from "lucide-react"
import type {
  AdminAIModelDetailResponseData,
  AdminAIModelListResponseData,
  AdminAIModelUpsertRequest,
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
  providerCode: "",
  code: "",
  displayName: "",
  modelName: "",
  supportsStream: true,
  supportsJsonMode: false,
  supportsToolCalling: false,
  maxContextTokens: 64000,
  defaultMaxOutputTokens: 4096,
  recommendedTemperature: 0.3,
  pricingMetadataText: "{}",
  isActive: true,
  metadataText: "{}",
  changeReason: "",
}

type ModelFormState = typeof EMPTY_FORM

function mapDetailToForm(detail: AdminAIModelDetailResponseData["model"]): ModelFormState {
  return {
    providerCode: detail.providerCode,
    code: detail.code,
    displayName: detail.displayName,
    modelName: detail.modelName,
    supportsStream: detail.supportsStream,
    supportsJsonMode: detail.supportsJsonMode,
    supportsToolCalling: detail.supportsToolCalling,
    maxContextTokens: detail.maxContextTokens,
    defaultMaxOutputTokens: detail.defaultMaxOutputTokens,
    recommendedTemperature: detail.recommendedTemperature ?? 0.3,
    pricingMetadataText: prettyJson(detail.pricingMetadata),
    isActive: detail.isActive,
    metadataText: prettyJson(detail.metadata),
    changeReason: "",
  }
}

export function ModelManagement() {
  const toast = useAppToast()
  const [data, setData] = useState<AdminAIModelListResponseData | null>(null)
  const [providerData, setProviderData] = useState<AdminAIProviderListResponseData | null>(null)
  const [keyword, setKeyword] = useState("")
  const [keywordApplied, setKeywordApplied] = useState("")
  const [status, setStatus] = useState("all")
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState("20")
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [selectedDetail, setSelectedDetail] = useState<AdminAIModelDetailResponseData | null>(null)
  const [form, setForm] = useState<ModelFormState>(EMPTY_FORM)
  const [isLoading, setIsLoading] = useState(true)
  const [isDetailLoading, setIsDetailLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [authExpired, setAuthExpired] = useState(false)

  useAdminSessionExpiryRedirect(authExpired)

  const totalPages = Math.max(1, Math.ceil((data?.total ?? 0) / (Number.parseInt(limit, 10) || 20)) || 1)
  const isCreateMode = selectedId == null

  const fetchProviders = useCallback(async () => {
    try {
      const result = await adminRequestData<AdminAIProviderListResponseData>(
        "/admin/ai/providers?status=active&page=1&limit=100",
        { method: "GET" },
        "获取 Provider 选项失败",
      )
      setProviderData(result)
      if (!form.providerCode && result.items[0]) {
        setForm((prev) => ({ ...prev, providerCode: result.items[0].code }))
      }
    } catch (fetchError) {
      setAuthExpired(isAdminSessionExpiredError(fetchError))
      toast.error(getAdminApiErrorMessage(fetchError, "获取 Provider 选项失败"))
    }
  }, [form.providerCode, toast])

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

  const fetchDetail = useCallback(async (modelId: string) => {
    setIsDetailLoading(true)
    try {
      const result = await adminRequestData<AdminAIModelDetailResponseData>(
        `/admin/ai/models/${modelId}`,
        { method: "GET" },
        "获取 Model 详情失败",
      )
      setSelectedDetail(result)
      setForm(mapDetailToForm(result.model))
    } catch (fetchError) {
      setAuthExpired(isAdminSessionExpiredError(fetchError))
      toast.error(getAdminApiErrorMessage(fetchError, "获取 Model 详情失败"))
    } finally {
      setIsDetailLoading(false)
    }
  }, [toast])

  useEffect(() => {
    void fetchProviders()
  }, [fetchProviders])

  useEffect(() => {
    void fetchList()
  }, [fetchList])

  useEffect(() => {
    if (selectedId) {
      void fetchDetail(selectedId)
    } else {
      setSelectedDetail(null)
      setForm({
        ...EMPTY_FORM,
        providerCode: providerData?.items[0]?.code ?? "",
      })
    }
  }, [fetchDetail, providerData?.items, selectedId])

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setIsSaving(true)
    try {
      const payload: AdminAIModelUpsertRequest = {
        providerCode: form.providerCode,
        code: form.code,
        displayName: form.displayName,
        modelName: form.modelName,
        supportsStream: form.supportsStream,
        supportsJsonMode: form.supportsJsonMode,
        supportsToolCalling: form.supportsToolCalling,
        maxContextTokens: Number(form.maxContextTokens),
        defaultMaxOutputTokens: Number(form.defaultMaxOutputTokens),
        recommendedTemperature: Number(form.recommendedTemperature),
        pricingMetadata: safeJsonParse(form.pricingMetadataText),
        isActive: form.isActive,
        metadata: safeJsonParse(form.metadataText),
        changeReason: form.changeReason,
      }

      if (selectedId) {
        await adminRequestData<AdminAIModelDetailResponseData>(
          `/admin/ai/models/${selectedId}`,
          {
            method: "PATCH",
            body: JSON.stringify(payload),
          },
          "更新 Model 失败",
        )
        toast.success("Model 已更新")
        await fetchDetail(selectedId)
      } else {
        const result = await adminRequestData<AdminAIModelDetailResponseData>(
          "/admin/ai/models",
          {
            method: "POST",
            body: JSON.stringify(payload),
          },
          "创建 Model 失败",
        )
        toast.success("Model 已创建")
        setSelectedId(result.model.modelId)
      }

      await fetchList()
    } catch (saveError) {
      setAuthExpired(isAdminSessionExpiredError(saveError))
      toast.error(getAdminApiErrorMessage(saveError, selectedId ? "更新 Model 失败" : "创建 Model 失败"))
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <AIAccessGate>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Model 管理</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            管理 Provider 下的模型能力、上下文大小、默认输出长度与推荐温度。
          </p>
        </div>

        {error && !data ? (
          <StatePanel
            status="error"
            title="获取 Model 列表失败"
            description={error}
            actionLabel="重试"
            onAction={() => void fetchList()}
          />
        ) : (
          <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
            <PageSection
              title="Model 列表"
              description="先从左侧选择当前模型，再在右侧编辑。"
              action={
                <div className="flex items-center gap-2">
                  <Button type="button" variant="outline" className="gap-1.5" onClick={() => void fetchList()}>
                    <RefreshCw className="h-4 w-4" />
                    刷新
                  </Button>
                  <Button
                    type="button"
                    className="gap-1.5"
                    onClick={() => {
                      setSelectedId(null)
                      setSelectedDetail(null)
                      setForm((prev) => ({ ...EMPTY_FORM, providerCode: providerData?.items[0]?.code ?? prev.providerCode }))
                    }}
                  >
                    <Plus className="h-4 w-4" />
                    新建 Model
                  </Button>
                </div>
              }
            >
              <div className="space-y-4">
                <div className="flex flex-col gap-3 md:flex-row">
                  <div className="relative min-w-0 flex-1">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input value={keyword} onChange={(event) => setKeyword(event.target.value)} placeholder="关键词：code / displayName / modelName / providerCode" className="pl-9" />
                  </div>
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
                        key={item.modelId}
                        type="button"
                        onClick={() => setSelectedId(item.modelId)}
                        className={`w-full rounded-xl border p-4 text-left transition-colors ${selectedId === item.modelId ? "border-primary bg-primary/5" : "border-border bg-background/60 hover:bg-muted/30"}`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-semibold text-foreground">{item.displayName}</p>
                            <p className="mt-1 text-xs text-muted-foreground">{item.code}</p>
                            <p className="mt-2 text-xs text-muted-foreground">{item.providerCode} / {item.modelName}</p>
                          </div>
                          <span className={`inline-flex rounded-full border px-2 py-1 text-[11px] ${item.isActive ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" : "border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-300"}`}>
                            {item.isActive ? "启用" : "停用"}
                          </span>
                        </div>
                        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                          <span>上下文 {item.maxContextTokens}</span>
                          <span>·</span>
                          <span>默认输出 {item.defaultMaxOutputTokens}</span>
                          <span>·</span>
                          <span>{item.linkedAgentCount} 个 Agent</span>
                        </div>
                      </button>
                    ))}
                  </div>
                ) : (
                  <StatePanel status="empty" title="暂无 Model" description="当前筛选条件下没有匹配的 Model。" />
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
              title={isCreateMode ? "新建 Model" : "编辑 Model"}
              description={selectedDetail ? `关联 Agents: ${selectedDetail.linkedAgentCodes.length}` : "新建 Model"}
            >
              {isDetailLoading ? (
                <div className="h-80 animate-pulse rounded-xl border border-border bg-muted/30" />
              ) : (
                <form className="space-y-4" onSubmit={handleSubmit}>
                  <div className="grid gap-4 md:grid-cols-2">
                    <label className="space-y-1">
                      <span className="text-sm text-muted-foreground">Provider</span>
                      <select value={form.providerCode} onChange={(event) => setForm((prev) => ({ ...prev, providerCode: event.target.value }))} className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm text-foreground">
                        <option value="">请选择 Provider</option>
                        {providerData?.items.map((item) => (
                          <option key={item.providerId} value={item.code}>{item.name} ({item.code})</option>
                        ))}
                      </select>
                    </label>
                    <label className="space-y-1">
                      <span className="text-sm text-muted-foreground">Code</span>
                      <Input value={form.code} onChange={(event) => setForm((prev) => ({ ...prev, code: event.target.value }))} />
                    </label>
                    <label className="space-y-1">
                      <span className="text-sm text-muted-foreground">展示名</span>
                      <Input value={form.displayName} onChange={(event) => setForm((prev) => ({ ...prev, displayName: event.target.value }))} />
                    </label>
                    <label className="space-y-1">
                      <span className="text-sm text-muted-foreground">真实模型名</span>
                      <Input value={form.modelName} onChange={(event) => setForm((prev) => ({ ...prev, modelName: event.target.value }))} />
                    </label>
                  </div>

                  <div className="grid gap-4 md:grid-cols-3">
                    <label className="space-y-1">
                      <span className="text-sm text-muted-foreground">最大上下文</span>
                      <Input type="number" value={String(form.maxContextTokens)} onChange={(event) => setForm((prev) => ({ ...prev, maxContextTokens: Number(event.target.value) || 0 }))} />
                    </label>
                    <label className="space-y-1">
                      <span className="text-sm text-muted-foreground">默认输出上限</span>
                      <Input type="number" value={String(form.defaultMaxOutputTokens)} onChange={(event) => setForm((prev) => ({ ...prev, defaultMaxOutputTokens: Number(event.target.value) || 0 }))} />
                    </label>
                    <label className="space-y-1">
                      <span className="text-sm text-muted-foreground">推荐温度</span>
                      <Input type="number" step="0.1" value={String(form.recommendedTemperature)} onChange={(event) => setForm((prev) => ({ ...prev, recommendedTemperature: Number(event.target.value) || 0 }))} />
                    </label>
                  </div>

                  <div className="grid gap-4 md:grid-cols-4">
                    <label className="flex items-center gap-2 rounded-xl border border-border bg-background/60 px-3 py-3 text-sm text-foreground">
                      <input type="checkbox" checked={form.supportsStream} onChange={(event) => setForm((prev) => ({ ...prev, supportsStream: event.target.checked }))} />
                      支持流式
                    </label>
                    <label className="flex items-center gap-2 rounded-xl border border-border bg-background/60 px-3 py-3 text-sm text-foreground">
                      <input type="checkbox" checked={form.supportsJsonMode} onChange={(event) => setForm((prev) => ({ ...prev, supportsJsonMode: event.target.checked }))} />
                      支持 JSON
                    </label>
                    <label className="flex items-center gap-2 rounded-xl border border-border bg-background/60 px-3 py-3 text-sm text-foreground">
                      <input type="checkbox" checked={form.supportsToolCalling} onChange={(event) => setForm((prev) => ({ ...prev, supportsToolCalling: event.target.checked }))} />
                      支持 Tool Calling
                    </label>
                    <label className="flex items-center gap-2 rounded-xl border border-border bg-background/60 px-3 py-3 text-sm text-foreground">
                      <input type="checkbox" checked={form.isActive} onChange={(event) => setForm((prev) => ({ ...prev, isActive: event.target.checked }))} />
                      启用
                    </label>
                  </div>

                  <label className="space-y-1">
                    <span className="text-sm text-muted-foreground">Pricing Metadata JSON</span>
                    <textarea value={form.pricingMetadataText} onChange={(event) => setForm((prev) => ({ ...prev, pricingMetadataText: event.target.value }))} className="min-h-28 w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground" />
                  </label>

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
                    saveLabel={isCreateMode ? "创建 Model" : "保存修改"}
                    onReset={() => {
                      if (selectedDetail) {
                        setForm(mapDetailToForm(selectedDetail.model))
                      } else {
                        setForm((prev) => ({ ...EMPTY_FORM, providerCode: providerData?.items[0]?.code ?? prev.providerCode }))
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
