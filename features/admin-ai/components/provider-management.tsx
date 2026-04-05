"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { Plus, RefreshCw, Search } from "lucide-react"
import type {
  AdminAIProviderDetailResponseData,
  AdminAIProviderListResponseData,
  AdminAIProviderUpsertRequest,
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
  providerType: "openai_compatible",
  baseUrl: "",
  authMode: "bearer",
  secretRef: "",
  supportsStream: true,
  supportsJsonMode: false,
  timeoutMs: 60000,
  retryCount: 1,
  isActive: true,
  metadataText: "{}",
  changeReason: "",
}

type ProviderFormState = typeof EMPTY_FORM

function mapDetailToForm(detail: AdminAIProviderDetailResponseData["provider"]): ProviderFormState {
  return {
    code: detail.code,
    name: detail.name,
    providerType: detail.providerType,
    baseUrl: detail.baseUrl,
    authMode: detail.authMode,
    secretRef: detail.secretRef,
    supportsStream: detail.supportsStream,
    supportsJsonMode: detail.supportsJsonMode,
    timeoutMs: detail.timeoutMs,
    retryCount: detail.retryCount,
    isActive: detail.isActive,
    metadataText: prettyJson(detail.metadata),
    changeReason: "",
  }
}

export function ProviderManagement() {
  const toast = useAppToast()
  const [data, setData] = useState<AdminAIProviderListResponseData | null>(null)
  const [keyword, setKeyword] = useState("")
  const [keywordApplied, setKeywordApplied] = useState("")
  const [status, setStatus] = useState("all")
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState("20")
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [selectedDetail, setSelectedDetail] = useState<AdminAIProviderDetailResponseData | null>(null)
  const [form, setForm] = useState<ProviderFormState>(EMPTY_FORM)
  const [isLoading, setIsLoading] = useState(true)
  const [isDetailLoading, setIsDetailLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [authExpired, setAuthExpired] = useState(false)

  useAdminSessionExpiryRedirect(authExpired)

  const totalPages = Math.max(1, Math.ceil((data?.total ?? 0) / (Number.parseInt(limit, 10) || 20)) || 1)
  const isCreateMode = selectedId == null

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
      const result = await adminRequestData<AdminAIProviderListResponseData>(
        `/admin/ai/providers?${params.toString()}`,
        { method: "GET" },
        "获取 Provider 列表失败",
      )
      setData(result)
    } catch (fetchError) {
      setAuthExpired(isAdminSessionExpiredError(fetchError))
      setError(getAdminApiErrorMessage(fetchError, "获取 Provider 列表失败"))
    } finally {
      setIsLoading(false)
    }
  }, [keywordApplied, limit, page, status])

  const fetchDetail = useCallback(async (providerId: string) => {
    setIsDetailLoading(true)
    try {
      const result = await adminRequestData<AdminAIProviderDetailResponseData>(
        `/admin/ai/providers/${providerId}`,
        { method: "GET" },
        "获取 Provider 详情失败",
      )
      setSelectedDetail(result)
      setForm(mapDetailToForm(result.provider))
    } catch (fetchError) {
      setAuthExpired(isAdminSessionExpiredError(fetchError))
      toast.error(getAdminApiErrorMessage(fetchError, "获取 Provider 详情失败"))
    } finally {
      setIsDetailLoading(false)
    }
  }, [toast])

  useEffect(() => {
    void fetchList()
  }, [fetchList])

  useEffect(() => {
    if (selectedId) {
      void fetchDetail(selectedId)
    } else {
      setSelectedDetail(null)
      setForm(EMPTY_FORM)
    }
  }, [fetchDetail, selectedId])

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setIsSaving(true)
    try {
      const payload: AdminAIProviderUpsertRequest = {
        code: form.code,
        name: form.name,
        providerType: form.providerType as AdminAIProviderUpsertRequest["providerType"],
        baseUrl: form.baseUrl,
        authMode: form.authMode as AdminAIProviderUpsertRequest["authMode"],
        secretRef: form.secretRef,
        supportsStream: form.supportsStream,
        supportsJsonMode: form.supportsJsonMode,
        timeoutMs: Number(form.timeoutMs),
        retryCount: Number(form.retryCount),
        isActive: form.isActive,
        metadata: safeJsonParse(form.metadataText),
        changeReason: form.changeReason,
      }

      if (selectedId) {
        await adminRequestData<AdminAIProviderDetailResponseData>(
          `/admin/ai/providers/${selectedId}`,
          {
            method: "PATCH",
            body: JSON.stringify(payload),
          },
          "更新 Provider 失败",
        )
        toast.success("Provider 已更新")
        await fetchDetail(selectedId)
      } else {
        const result = await adminRequestData<AdminAIProviderDetailResponseData>(
          "/admin/ai/providers",
          {
            method: "POST",
            body: JSON.stringify(payload),
          },
          "创建 Provider 失败",
        )
        toast.success("Provider 已创建")
        setSelectedId(result.provider.providerId)
      }

      await fetchList()
    } catch (saveError) {
      setAuthExpired(isAdminSessionExpiredError(saveError))
      toast.error(getAdminApiErrorMessage(saveError, selectedId ? "更新 Provider 失败" : "创建 Provider 失败"))
    } finally {
      setIsSaving(false)
    }
  }

  const linkedSummary = useMemo(() => {
    if (!selectedDetail) {
      return "新建 Provider"
    }
    return `关联 Models: ${selectedDetail.linkedModelCodes.length} · 关联 Agents: ${selectedDetail.linkedAgentCodes.length}`
  }, [selectedDetail])

  return (
    <AIAccessGate>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Provider 管理</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            管理底层 Provider 连接配置、鉴权方式、超时重试和启停状态。
          </p>
        </div>

        {error && !data ? (
          <StatePanel
            status="error"
            title="获取 Provider 列表失败"
            description={error}
            actionLabel="重试"
            onAction={() => void fetchList()}
          />
        ) : (
          <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
            <PageSection
              title="Provider 列表"
              description="左侧选择已有 Provider，右侧查看并编辑详情。"
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
                      setForm(EMPTY_FORM)
                    }}
                  >
                    <Plus className="h-4 w-4" />
                    新建 Provider
                  </Button>
                </div>
              }
            >
              <div className="space-y-4">
                <div className="flex flex-col gap-3 md:flex-row">
                  <div className="relative min-w-0 flex-1">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      value={keyword}
                      onChange={(event) => setKeyword(event.target.value)}
                      placeholder="关键词：code / 名称 / baseUrl / secretRef"
                      className="pl-9"
                    />
                  </div>
                  <select
                    value={status}
                    onChange={(event) => {
                      setPage(1)
                      setStatus(event.target.value)
                    }}
                    className="h-10 rounded-md border border-border bg-background px-3 text-sm text-foreground"
                  >
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
                        key={item.providerId}
                        type="button"
                        onClick={() => setSelectedId(item.providerId)}
                        className={`w-full rounded-xl border p-4 text-left transition-colors ${selectedId === item.providerId ? "border-primary bg-primary/5" : "border-border bg-background/60 hover:bg-muted/30"}`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-semibold text-foreground">{item.name}</p>
                            <p className="mt-1 text-xs text-muted-foreground">{item.code}</p>
                            <p className="mt-2 text-xs text-muted-foreground">{item.baseUrl}</p>
                          </div>
                          <span className={`inline-flex rounded-full border px-2 py-1 text-[11px] ${item.isActive ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" : "border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-300"}`}>
                            {item.isActive ? "启用" : "停用"}
                          </span>
                        </div>
                        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                          <span>{item.providerType}</span>
                          <span>·</span>
                          <span>{item.authMode}</span>
                          <span>·</span>
                          <span>{item.modelCount} 个模型</span>
                        </div>
                      </button>
                    ))}
                  </div>
                ) : (
                  <StatePanel status="empty" title="暂无 Provider" description="当前筛选条件下没有匹配的 Provider。" />
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

            <PageSection title={isCreateMode ? "新建 Provider" : "编辑 Provider"} description={linkedSummary}>
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
                      <span className="text-sm text-muted-foreground">Provider 类型</span>
                      <select value={form.providerType} onChange={(event) => setForm((prev) => ({ ...prev, providerType: event.target.value }))} className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm text-foreground">
                        <option value="openai_compatible">openai_compatible</option>
                        <option value="siliconflow">siliconflow</option>
                        <option value="anthropic">anthropic</option>
                      </select>
                    </label>
                    <label className="space-y-1">
                      <span className="text-sm text-muted-foreground">鉴权方式</span>
                      <select value={form.authMode} onChange={(event) => setForm((prev) => ({ ...prev, authMode: event.target.value }))} className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm text-foreground">
                        <option value="bearer">bearer</option>
                        <option value="api_key_header">api_key_header</option>
                      </select>
                    </label>
                  </div>

                  <label className="space-y-1">
                    <span className="text-sm text-muted-foreground">Base URL</span>
                    <Input value={form.baseUrl} onChange={(event) => setForm((prev) => ({ ...prev, baseUrl: event.target.value }))} />
                  </label>

                  <div className="grid gap-4 md:grid-cols-[1.2fr_0.8fr_0.8fr]">
                    <label className="space-y-1">
                      <span className="text-sm text-muted-foreground">Secret Ref</span>
                      <Input value={form.secretRef} onChange={(event) => setForm((prev) => ({ ...prev, secretRef: event.target.value }))} />
                    </label>
                    <label className="space-y-1">
                      <span className="text-sm text-muted-foreground">超时 ms</span>
                      <Input type="number" value={String(form.timeoutMs)} onChange={(event) => setForm((prev) => ({ ...prev, timeoutMs: Number(event.target.value) || 0 }))} />
                    </label>
                    <label className="space-y-1">
                      <span className="text-sm text-muted-foreground">重试次数</span>
                      <Input type="number" value={String(form.retryCount)} onChange={(event) => setForm((prev) => ({ ...prev, retryCount: Number(event.target.value) || 0 }))} />
                    </label>
                  </div>

                  <div className="grid gap-4 md:grid-cols-3">
                    <label className="flex items-center gap-2 rounded-xl border border-border bg-background/60 px-3 py-3 text-sm text-foreground">
                      <input type="checkbox" checked={form.supportsStream} onChange={(event) => setForm((prev) => ({ ...prev, supportsStream: event.target.checked }))} />
                      支持流式输出
                    </label>
                    <label className="flex items-center gap-2 rounded-xl border border-border bg-background/60 px-3 py-3 text-sm text-foreground">
                      <input type="checkbox" checked={form.supportsJsonMode} onChange={(event) => setForm((prev) => ({ ...prev, supportsJsonMode: event.target.checked }))} />
                      支持 JSON mode
                    </label>
                    <label className="flex items-center gap-2 rounded-xl border border-border bg-background/60 px-3 py-3 text-sm text-foreground">
                      <input type="checkbox" checked={form.isActive} onChange={(event) => setForm((prev) => ({ ...prev, isActive: event.target.checked }))} />
                      启用
                    </label>
                  </div>

                  <label className="space-y-1">
                    <span className="text-sm text-muted-foreground">Metadata JSON</span>
                    <textarea value={form.metadataText} onChange={(event) => setForm((prev) => ({ ...prev, metadataText: event.target.value }))} className="min-h-40 w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground" />
                  </label>

                  <label className="space-y-1">
                    <span className="text-sm text-muted-foreground">变更原因</span>
                    <textarea value={form.changeReason} onChange={(event) => setForm((prev) => ({ ...prev, changeReason: event.target.value }))} className="min-h-24 w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground" placeholder="例如：新增备用 provider / 调整 timeout 策略" />
                  </label>

                  <SaveActionRow
                    isSaving={isSaving}
                    saveLabel={isCreateMode ? "创建 Provider" : "保存修改"}
                    onReset={() => {
                      if (selectedDetail) {
                        setForm(mapDetailToForm(selectedDetail.provider))
                      } else {
                        setForm(EMPTY_FORM)
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
