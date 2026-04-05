"use client"

import { useCallback, useEffect, useState } from "react"
import { Plus, RefreshCw, Search } from "lucide-react"
import type {
  AdminAIAgentBindingListResponseData,
  AdminAIAgentBindingUpsertRequest,
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
  agentCode: "",
  toolId: "",
  learningLevel: "",
  selectionMode: "",
  pathId: "",
  stepNo: "",
  interactionType: "teaching",
  priority: 100,
  isActive: true,
  metadataText: "{}",
  changeReason: "",
}

type BindingFormState = typeof EMPTY_FORM

export function BindingManagement() {
  const toast = useAppToast()
  const [data, setData] = useState<AdminAIAgentBindingListResponseData | null>(null)
  const [keyword, setKeyword] = useState("")
  const [keywordApplied, setKeywordApplied] = useState("")
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState("20")
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [form, setForm] = useState<BindingFormState>(EMPTY_FORM)
  const [isLoading, setIsLoading] = useState(true)
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
      params.set("page", String(page))
      params.set("limit", limit)
      if (keywordApplied) {
        params.set("keyword", keywordApplied)
      }
      const result = await adminRequestData<AdminAIAgentBindingListResponseData>(
        `/admin/ai/agent-bindings?${params.toString()}`,
        { method: "GET" },
        "获取命中规则失败",
      )
      setData(result)
      if (!form.agentCode && result.agentOptions?.[0]) {
        setForm((prev) => ({ ...prev, agentCode: result.agentOptions?.[0]?.code ?? "" }))
      }
    } catch (fetchError) {
      setAuthExpired(isAdminSessionExpiredError(fetchError))
      setError(getAdminApiErrorMessage(fetchError, "获取命中规则失败"))
    } finally {
      setIsLoading(false)
    }
  }, [form.agentCode, keywordApplied, limit, page])

  useEffect(() => {
    void fetchList()
  }, [fetchList])

  useEffect(() => {
    if (!selectedId || !data) {
      return
    }
    const item = data.items.find((row) => row.bindingId === selectedId)
    if (!item) {
      return
    }
    setForm({
      agentCode: item.agentCode,
      toolId: item.toolId ?? "",
      learningLevel: item.learningLevel ?? "",
      selectionMode: item.selectionMode ?? "",
      pathId: item.pathId ?? "",
      stepNo: item.stepNo == null ? "" : String(item.stepNo),
      interactionType: item.interactionType,
      priority: item.priority,
      isActive: item.isActive,
      metadataText: prettyJson(item.metadata),
      changeReason: "",
    })
  }, [data, selectedId])

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setIsSaving(true)
    try {
      const payload: AdminAIAgentBindingUpsertRequest = {
        agentCode: form.agentCode,
        toolId: form.toolId || null,
        learningLevel: (form.learningLevel || null) as AdminAIAgentBindingUpsertRequest["learningLevel"],
        selectionMode: (form.selectionMode || null) as AdminAIAgentBindingUpsertRequest["selectionMode"],
        pathId: form.pathId || null,
        stepNo: form.stepNo ? Number(form.stepNo) : null,
        interactionType: form.interactionType,
        priority: Number(form.priority),
        isActive: form.isActive,
        metadata: safeJsonParse(form.metadataText),
        changeReason: form.changeReason,
      }

      if (selectedId) {
        await adminRequestData(`/admin/ai/agent-bindings/${selectedId}`, {
          method: "PATCH",
          body: JSON.stringify(payload),
        }, "更新命中规则失败")
        toast.success("命中规则已更新")
      } else {
        await adminRequestData("/admin/ai/agent-bindings", {
          method: "POST",
          body: JSON.stringify(payload),
        }, "创建命中规则失败")
        toast.success("命中规则已创建")
      }

      await fetchList()
      if (!selectedId) {
        setForm((prev) => ({ ...EMPTY_FORM, agentCode: data?.agentOptions?.[0]?.code ?? prev.agentCode }))
      }
    } catch (saveError) {
      setAuthExpired(isAdminSessionExpiredError(saveError))
      toast.error(getAdminApiErrorMessage(saveError, selectedId ? "更新命中规则失败" : "创建命中规则失败"))
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <AIAccessGate>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">命中规则</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            直接维护 `agent_bindings`，决定不同工具、路径、等级与交互类型下命中的 Agent。
          </p>
        </div>

        {error && !data ? (
          <StatePanel status="error" title="获取命中规则失败" description={error} actionLabel="重试" onAction={() => void fetchList()} />
        ) : (
          <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
            <PageSection
              title="规则列表"
              description="优先级越小越优先命中。"
              action={
                <div className="flex items-center gap-2">
                  <Button type="button" variant="outline" className="gap-1.5" onClick={() => void fetchList()}>
                    <RefreshCw className="h-4 w-4" />
                    刷新
                  </Button>
                  <Button type="button" className="gap-1.5" onClick={() => setSelectedId(null)}>
                    <Plus className="h-4 w-4" />
                    新建规则
                  </Button>
                </div>
              }
            >
              <div className="space-y-4">
                <div className="flex gap-3">
                  <div className="relative min-w-0 flex-1">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input value={keyword} onChange={(event) => setKeyword(event.target.value)} placeholder="关键词：agent / tool / path / interaction" className="pl-9" />
                  </div>
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
                        key={item.bindingId}
                        type="button"
                        onClick={() => setSelectedId(item.bindingId)}
                        className={`w-full rounded-xl border p-4 text-left transition-colors ${selectedId === item.bindingId ? "border-primary bg-primary/5" : "border-border bg-background/60 hover:bg-muted/30"}`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-semibold text-foreground">{item.agentName}</p>
                            <p className="mt-1 text-xs text-muted-foreground">{item.interactionType} · priority {item.priority}</p>
                          </div>
                          <span className={`inline-flex rounded-full border px-2 py-1 text-[11px] ${item.isActive ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" : "border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-300"}`}>{item.isActive ? "启用" : "停用"}</span>
                        </div>
                        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                          <span>tool: {item.toolCode ?? "all"}</span>
                          <span>·</span>
                          <span>level: {item.learningLevel ?? "all"}</span>
                          <span>·</span>
                          <span>path: {item.pathCode ?? "all"}</span>
                          <span>·</span>
                          <span>step: {item.stepNo ?? "all"}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                ) : (
                  <StatePanel status="empty" title="暂无命中规则" description="当前筛选条件下没有匹配的规则。" />
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

            <PageSection title={isCreateMode ? "新建规则" : "编辑规则"} description="字段为 null 表示通配。">
              <form className="space-y-4" onSubmit={handleSubmit}>
                <div className="grid gap-4 md:grid-cols-2">
                  <label className="space-y-1">
                    <span className="text-sm text-muted-foreground">Agent</span>
                    <select value={form.agentCode} onChange={(event) => setForm((prev) => ({ ...prev, agentCode: event.target.value }))} className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm text-foreground">
                      <option value="">请选择 Agent</option>
                      {data?.agentOptions?.map((item) => (
                        <option key={item.code} value={item.code}>{item.name} ({item.code})</option>
                      ))}
                    </select>
                  </label>
                  <label className="space-y-1">
                    <span className="text-sm text-muted-foreground">交互类型</span>
                    <select value={form.interactionType} onChange={(event) => setForm((prev) => ({ ...prev, interactionType: event.target.value }))} className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm text-foreground">
                      <option value="teaching">teaching</option>
                      <option value="blocked_help">blocked_help</option>
                      <option value="task_review">task_review</option>
                      <option value="completion_feedback">completion_feedback</option>
                      <option value="path_guidance">path_guidance</option>
                    </select>
                  </label>
                  <label className="space-y-1">
                    <span className="text-sm text-muted-foreground">Tool</span>
                    <select value={form.toolId} onChange={(event) => setForm((prev) => ({ ...prev, toolId: event.target.value }))} className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm text-foreground">
                      <option value="">全部 Tool</option>
                      {data?.toolOptions?.map((item) => (
                        <option key={item.id} value={item.id}>{item.name} ({item.code})</option>
                      ))}
                    </select>
                  </label>
                  <label className="space-y-1">
                    <span className="text-sm text-muted-foreground">Path</span>
                    <select value={form.pathId} onChange={(event) => setForm((prev) => ({ ...prev, pathId: event.target.value }))} className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm text-foreground">
                      <option value="">全部 Path</option>
                      {data?.pathOptions?.map((item) => (
                        <option key={item.id} value={item.id}>{item.name} ({item.code})</option>
                      ))}
                    </select>
                  </label>
                  <label className="space-y-1">
                    <span className="text-sm text-muted-foreground">Learning Level</span>
                    <select value={form.learningLevel} onChange={(event) => setForm((prev) => ({ ...prev, learningLevel: event.target.value }))} className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm text-foreground">
                      <option value="">全部等级</option>
                      <option value="beginner">beginner</option>
                      <option value="intermediate">intermediate</option>
                      <option value="advanced">advanced</option>
                    </select>
                  </label>
                  <label className="space-y-1">
                    <span className="text-sm text-muted-foreground">Selection Mode</span>
                    <select value={form.selectionMode} onChange={(event) => setForm((prev) => ({ ...prev, selectionMode: event.target.value }))} className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm text-foreground">
                      <option value="">全部模式</option>
                      <option value="self_directed">self_directed</option>
                      <option value="preset_training">preset_training</option>
                    </select>
                  </label>
                  <label className="space-y-1">
                    <span className="text-sm text-muted-foreground">Step No</span>
                    <Input value={form.stepNo} onChange={(event) => setForm((prev) => ({ ...prev, stepNo: event.target.value }))} placeholder="留空表示全部 step" />
                  </label>
                  <label className="space-y-1">
                    <span className="text-sm text-muted-foreground">Priority</span>
                    <Input type="number" value={String(form.priority)} onChange={(event) => setForm((prev) => ({ ...prev, priority: Number(event.target.value) || 0 }))} />
                  </label>
                </div>

                <label className="flex items-center gap-2 rounded-xl border border-border bg-background/60 px-3 py-3 text-sm text-foreground">
                  <input type="checkbox" checked={form.isActive} onChange={(event) => setForm((prev) => ({ ...prev, isActive: event.target.checked }))} />
                  启用该规则
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
                  saveLabel={isCreateMode ? "创建规则" : "保存修改"}
                  onReset={() => {
                    setSelectedId(null)
                    setForm((prev) => ({ ...EMPTY_FORM, agentCode: data?.agentOptions?.[0]?.code ?? prev.agentCode }))
                  }}
                />
              </form>
            </PageSection>
          </div>
        )}
      </div>
    </AIAccessGate>
  )
}
