"use client"

import { useCallback, useEffect, useState } from "react"
import { Plus, RefreshCw, Search } from "lucide-react"
import type {
  AdminAIAgentSkillBindingListResponseData,
  AdminAIAgentSkillBindingUpsertRequest,
  AdminAISkillListResponseData,
} from "@/lib/api/contracts/admin-ai"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { StatePanel } from "@/components/ui/state-panel"
import { useAppToast } from "@/components/app-feedback/app-toast-provider"
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
  skillCode: "",
  priority: 100,
  isRequired: true,
  contextBudgetTokens: 800,
  isActive: true,
  metadataText: "{}",
  changeReason: "",
}

type SkillBindingFormState = typeof EMPTY_FORM

export function SkillManagement() {
  const toast = useAppToast()
  const [skillData, setSkillData] = useState<AdminAISkillListResponseData | null>(null)
  const [bindingData, setBindingData] = useState<AdminAIAgentSkillBindingListResponseData | null>(null)
  const [keyword, setKeyword] = useState("")
  const [keywordApplied, setKeywordApplied] = useState("")
  const [bindingKeyword, setBindingKeyword] = useState("")
  const [bindingKeywordApplied, setBindingKeywordApplied] = useState("")
  const [selectedBindingId, setSelectedBindingId] = useState<string | null>(null)
  const [form, setForm] = useState<SkillBindingFormState>(EMPTY_FORM)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [authExpired, setAuthExpired] = useState(false)

  useAdminSessionExpiryRedirect(authExpired)

  const fetchAll = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const [skills, bindings] = await Promise.all([
        adminRequestData<AdminAISkillListResponseData>(`/admin/ai/skills?page=1&limit=100${keywordApplied ? `&keyword=${encodeURIComponent(keywordApplied)}` : ""}`, { method: "GET" }, "获取 Skill 列表失败"),
        adminRequestData<AdminAIAgentSkillBindingListResponseData>(`/admin/ai/agent-skill-bindings?page=1&limit=100${bindingKeywordApplied ? `&keyword=${encodeURIComponent(bindingKeywordApplied)}` : ""}`, { method: "GET" }, "获取 Skill 绑定失败"),
      ])
      setSkillData(skills)
      setBindingData(bindings)
      setForm((prev) => ({
        ...prev,
        agentCode: prev.agentCode || bindings.agentOptions?.[0]?.code || "",
        skillCode: prev.skillCode || bindings.skillOptions?.[0]?.code || "",
      }))
    } catch (fetchError) {
      setAuthExpired(isAdminSessionExpiredError(fetchError))
      setError(getAdminApiErrorMessage(fetchError, "获取 Skill 管理数据失败"))
    } finally {
      setIsLoading(false)
    }
  }, [bindingKeywordApplied, keywordApplied])

  useEffect(() => {
    void fetchAll()
  }, [fetchAll])

  useEffect(() => {
    if (!selectedBindingId || !bindingData) {
      return
    }
    const item = bindingData.items.find((row) => row.bindingId === selectedBindingId)
    if (!item) {
      return
    }
    setForm({
      agentCode: item.agentCode,
      skillCode: item.skillCode,
      priority: item.priority,
      isRequired: item.isRequired,
      contextBudgetTokens: item.contextBudgetTokens ?? 0,
      isActive: item.isActive,
      metadataText: prettyJson(item.metadata),
      changeReason: "",
    })
  }, [bindingData, selectedBindingId])

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setIsSaving(true)
    try {
      const payload: AdminAIAgentSkillBindingUpsertRequest = {
        agentCode: form.agentCode,
        skillCode: form.skillCode,
        priority: Number(form.priority),
        isRequired: form.isRequired,
        contextBudgetTokens: Number(form.contextBudgetTokens) || null,
        isActive: form.isActive,
        metadata: safeJsonParse(form.metadataText),
        changeReason: form.changeReason,
      }

      if (selectedBindingId) {
        await adminRequestData(`/admin/ai/agent-skill-bindings/${selectedBindingId}`, {
          method: "PATCH",
          body: JSON.stringify(payload),
        }, "更新 Skill 绑定失败")
        toast.success("Skill 绑定已更新")
      } else {
        await adminRequestData("/admin/ai/agent-skill-bindings", {
          method: "POST",
          body: JSON.stringify(payload),
        }, "创建 Skill 绑定失败")
        toast.success("Skill 绑定已创建")
      }

      await fetchAll()
    } catch (saveError) {
      setAuthExpired(isAdminSessionExpiredError(saveError))
      toast.error(getAdminApiErrorMessage(saveError, selectedBindingId ? "更新 Skill 绑定失败" : "创建 Skill 绑定失败"))
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <AIAccessGate>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Skill 管理</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            左侧查看 Skill registry，右侧维护 `agent_skill_bindings`。不在线编辑 Skill 文件内容。
          </p>
        </div>

        {error && !skillData && !bindingData ? (
          <StatePanel status="error" title="获取 Skill 管理数据失败" description={error} actionLabel="重试" onAction={() => void fetchAll()} />
        ) : (
          <>
            <PageSection
              title="Skill Registry"
              description="当前项目中已登记的 Skill 包。"
              action={
                <div className="flex items-center gap-2">
                  <div className="relative min-w-[260px]">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input value={keyword} onChange={(event) => setKeyword(event.target.value)} placeholder="关键词：code / name / source / trust" className="pl-9" />
                  </div>
                  <Button type="button" variant="outline" onClick={() => setKeywordApplied(keyword.trim())}>搜索</Button>
                  <Button type="button" variant="outline" className="gap-1.5" onClick={() => void fetchAll()}>
                    <RefreshCw className="h-4 w-4" />
                    刷新
                  </Button>
                </div>
              }
            >
              {isLoading && !skillData ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((item) => (
                    <div key={item} className="h-20 animate-pulse rounded-xl border border-border bg-muted/40" />
                  ))}
                </div>
              ) : skillData?.items.length ? (
                <div className="grid gap-3 xl:grid-cols-2">
                  {skillData.items.map((item) => (
                    <div key={item.skillId} className="rounded-xl border border-border bg-background/60 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-foreground">{item.name}</p>
                          <p className="mt-1 text-xs text-muted-foreground">{item.code}</p>
                        </div>
                        <span className={`inline-flex rounded-full border px-2 py-1 text-[11px] ${item.isActive ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" : "border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-300"}`}>{item.isActive ? "启用" : "停用"}</span>
                      </div>
                      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                        <span>{item.sourceType}</span>
                        <span>·</span>
                        <span>{item.trustLevel}</span>
                        <span>·</span>
                        <span>关联 Agent {item.linkedAgentCount}</span>
                      </div>
                      <p className="mt-2 text-xs text-muted-foreground">{item.entryResourcePath ?? item.manifestPath}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <StatePanel status="empty" title="暂无 Skill" description="当前筛选条件下没有匹配的 Skill。" />
              )}
            </PageSection>

            <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
              <PageSection
                title="Skill 绑定"
                description="维护 Agent 到 Skill 的上下文挂载关系。"
                action={
                  <div className="flex items-center gap-2">
                    <div className="relative min-w-[220px]">
                      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input value={bindingKeyword} onChange={(event) => setBindingKeyword(event.target.value)} placeholder="关键词：agent / skill" className="pl-9" />
                    </div>
                    <Button type="button" variant="outline" onClick={() => setBindingKeywordApplied(bindingKeyword.trim())}>搜索</Button>
                    <Button type="button" className="gap-1.5" onClick={() => setSelectedBindingId(null)}>
                      <Plus className="h-4 w-4" />
                      新建绑定
                    </Button>
                  </div>
                }
              >
                {bindingData?.items.length ? (
                  <div className="space-y-3">
                    {bindingData.items.map((item) => (
                      <button
                        key={item.bindingId}
                        type="button"
                        onClick={() => setSelectedBindingId(item.bindingId)}
                        className={`w-full rounded-xl border p-4 text-left transition-colors ${selectedBindingId === item.bindingId ? "border-primary bg-primary/5" : "border-border bg-background/60 hover:bg-muted/30"}`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-semibold text-foreground">{item.agentName}</p>
                            <p className="mt-1 text-xs text-muted-foreground">{item.skillName}</p>
                          </div>
                          <span className={`inline-flex rounded-full border px-2 py-1 text-[11px] ${item.isActive ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" : "border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-300"}`}>{item.isActive ? "启用" : "停用"}</span>
                        </div>
                        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                          <span>priority {item.priority}</span>
                          <span>·</span>
                          <span>{item.isRequired ? "required" : "optional"}</span>
                          <span>·</span>
                          <span>budget {item.contextBudgetTokens ?? "auto"}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                ) : (
                  <StatePanel status="empty" title="暂无 Skill 绑定" description="当前筛选条件下没有匹配的 Skill 绑定。" />
                )}
              </PageSection>

              <PageSection title={selectedBindingId ? "编辑 Skill 绑定" : "新建 Skill 绑定"} description="只管理 registry 与绑定关系，不直接改 Skill 文件。">
                <form className="space-y-4" onSubmit={handleSubmit}>
                  <div className="grid gap-4 md:grid-cols-2">
                    <label className="space-y-1">
                      <span className="text-sm text-muted-foreground">Agent</span>
                      <select value={form.agentCode} onChange={(event) => setForm((prev) => ({ ...prev, agentCode: event.target.value }))} className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm text-foreground">
                        <option value="">请选择 Agent</option>
                        {bindingData?.agentOptions?.map((item) => (
                          <option key={item.code} value={item.code}>{item.name} ({item.code})</option>
                        ))}
                      </select>
                    </label>
                    <label className="space-y-1">
                      <span className="text-sm text-muted-foreground">Skill</span>
                      <select value={form.skillCode} onChange={(event) => setForm((prev) => ({ ...prev, skillCode: event.target.value }))} className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm text-foreground">
                        <option value="">请选择 Skill</option>
                        {bindingData?.skillOptions?.map((item) => (
                          <option key={item.code} value={item.code}>{item.name} ({item.code})</option>
                        ))}
                      </select>
                    </label>
                    <label className="space-y-1">
                      <span className="text-sm text-muted-foreground">Priority</span>
                      <Input type="number" value={String(form.priority)} onChange={(event) => setForm((prev) => ({ ...prev, priority: Number(event.target.value) || 0 }))} />
                    </label>
                    <label className="space-y-1">
                      <span className="text-sm text-muted-foreground">Context Budget Tokens</span>
                      <Input type="number" value={String(form.contextBudgetTokens)} onChange={(event) => setForm((prev) => ({ ...prev, contextBudgetTokens: Number(event.target.value) || 0 }))} />
                    </label>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <label className="flex items-center gap-2 rounded-xl border border-border bg-background/60 px-3 py-3 text-sm text-foreground">
                      <input type="checkbox" checked={form.isRequired} onChange={(event) => setForm((prev) => ({ ...prev, isRequired: event.target.checked }))} />
                      Required
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
                    saveLabel={selectedBindingId ? "保存修改" : "创建绑定"}
                    onReset={() => {
                      setSelectedBindingId(null)
                      setForm((prev) => ({
                        ...EMPTY_FORM,
                        agentCode: bindingData?.agentOptions?.[0]?.code ?? prev.agentCode,
                        skillCode: bindingData?.skillOptions?.[0]?.code ?? prev.skillCode,
                      }))
                    }}
                  />
                </form>
              </PageSection>
            </div>
          </>
        )}
      </div>
    </AIAccessGate>
  )
}
