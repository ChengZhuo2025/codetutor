"use client"

import { useEffect, useMemo, useState } from "react"
import type {
  AdminAIAgentDetailResponseData,
  AdminAIAgentUpsertRequest,
  AdminAIModelListResponseData,
  AdminAIProviderListResponseData,
} from "@/lib/api/contracts/admin-ai"
import { useAppToast } from "@/components/app-feedback/app-toast-provider"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Textarea } from "@/components/ui/textarea"
import {
  adminRequestData,
  getAdminApiErrorMessage,
  isAdminSessionExpiredError,
} from "@/lib/api/admin-bff-client"
import {
  getAdminAIAgentScenarioTypeLabel,
  prettyJson,
  safeJsonParse,
} from "@/features/admin-ai/lib/view-model"
import { AdminFieldLabel } from "./admin-field-label"

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

const AGENT_SCENARIO_TYPE_OPTIONS = [
  "teaching",
  "blocked_help",
  "task_review",
  "completion_feedback",
  "path_guidance",
  "concept_qa",
  "media_vision_extract",
  "media_audio_transcribe",
] as const

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

type AgentFormSheetProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  agentId: string | null
  onSaved: (detail: AdminAIAgentDetailResponseData) => Promise<void> | void
  onAuthExpired: () => void
}

export function AgentFormSheet({
  open,
  onOpenChange,
  agentId,
  onSaved,
  onAuthExpired,
}: AgentFormSheetProps) {
  const toast = useAppToast()
  const [form, setForm] = useState<AgentFormState>(EMPTY_FORM)
  const [detail, setDetail] = useState<AdminAIAgentDetailResponseData | null>(null)
  const [providers, setProviders] = useState<AdminAIProviderListResponseData | null>(null)
  const [models, setModels] = useState<AdminAIModelListResponseData | null>(null)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const scenarioTypeOptions = AGENT_SCENARIO_TYPE_OPTIONS.includes(form.scenarioType as (typeof AGENT_SCENARIO_TYPE_OPTIONS)[number])
    ? AGENT_SCENARIO_TYPE_OPTIONS
    : [...AGENT_SCENARIO_TYPE_OPTIONS, form.scenarioType]

  useEffect(() => {
    if (!open) {
      return
    }

    let cancelled = false
    const loadData = async () => {
      setLoading(true)
      try {
        const providersPromise = adminRequestData<AdminAIProviderListResponseData>(
          "/admin/ai/providers?status=active&page=1&limit=100",
          { method: "GET" },
          "获取 Provider 选项失败",
        )
        const modelsPromise = adminRequestData<AdminAIModelListResponseData>(
          "/admin/ai/models?status=active&page=1&limit=100",
          { method: "GET" },
          "获取 Model 选项失败",
        )
        const detailPromise = agentId
          ? adminRequestData<AdminAIAgentDetailResponseData>(
              `/admin/ai/agents/${agentId}`,
              { method: "GET" },
              "获取 Agent 详情失败",
            )
          : Promise.resolve(null)

        const [providerResult, modelResult, detailResult] = await Promise.all([providersPromise, modelsPromise, detailPromise])
        if (cancelled) {
          return
        }

        setProviders(providerResult)
        setModels(modelResult)
        if (detailResult) {
          setDetail(detailResult)
          setForm(mapDetailToForm(detailResult.agent))
        } else {
          setDetail(null)
          setForm((prev) => ({
            ...EMPTY_FORM,
            defaultProviderCode: providerResult.items[0]?.code ?? prev.defaultProviderCode,
            defaultModelCode: modelResult.items[0]?.code ?? prev.defaultModelCode,
          }))
        }
      } catch (error) {
        if (isAdminSessionExpiredError(error)) {
          onAuthExpired()
        }
        if (!cancelled) {
          toast.error(getAdminApiErrorMessage(error, agentId ? "获取 Agent 详情失败" : "获取 Agent 配置失败"))
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    void loadData()
    return () => {
      cancelled = true
    }
  }, [agentId, onAuthExpired, open, toast])

  const description = useMemo(() => {
    if (!detail) {
      return "维护真实运行中的 Agent 模板，包括 prompt、默认 Provider/Model、采样参数和上下文预算。"
    }
    return `命中规则 ${detail.bindings.length} 条，Skill 绑定 ${detail.skillBindings.length} 条。`
  }, [detail])

  const handleSave = async () => {
    setSaving(true)
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

      const result = agentId
        ? await adminRequestData<AdminAIAgentDetailResponseData>(
            `/admin/ai/agents/${agentId}`,
            {
              method: "PATCH",
              body: JSON.stringify(payload),
            },
            "更新 Agent 失败",
          )
        : await adminRequestData<AdminAIAgentDetailResponseData>(
            "/admin/ai/agents",
            {
              method: "POST",
              body: JSON.stringify(payload),
            },
            "创建 Agent 失败",
          )

      await onSaved(result)
      onOpenChange(false)
      toast.success(agentId ? "Agent 已更新" : "Agent 已创建")
    } catch (error) {
      if (isAdminSessionExpiredError(error)) {
        onAuthExpired()
      }
      toast.error(getAdminApiErrorMessage(error, agentId ? "更新 Agent 失败" : "创建 Agent 失败"))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-[56rem]">
        <SheetHeader className="border-b border-border px-6 py-5">
          <SheetTitle>{agentId ? "编辑 Agent" : "新建 Agent"}</SheetTitle>
          <SheetDescription>{description}</SheetDescription>
        </SheetHeader>
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {loading ? (
            <div className="h-80 animate-pulse rounded-xl border border-border bg-muted/30" />
          ) : (
            <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-1.5">
                  <AdminFieldLabel htmlFor="agent-code" label="Code" required />
                  <Input id="agent-code" value={form.code} onChange={(event) => setForm((prev) => ({ ...prev, code: event.target.value }))} />
                </div>
                <div className="space-y-1.5">
                  <AdminFieldLabel htmlFor="agent-name" label="名称" required />
                  <Input id="agent-name" value={form.name} onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))} />
                </div>
                <div className="space-y-1.5">
                  <AdminFieldLabel htmlFor="agent-scenarioType" label="场景类型" required />
                  <select id="agent-scenarioType" value={form.scenarioType} onChange={(event) => setForm((prev) => ({ ...prev, scenarioType: event.target.value }))} className="h-10 w-full rounded-md border border-border bg-muted/45 px-3 text-sm text-foreground shadow-none">
                    {scenarioTypeOptions.map((item) => (
                      <option key={item} value={item}>
                        {getAdminAIAgentScenarioTypeLabel(item)}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <AdminFieldLabel htmlFor="agent-defaultProviderCode" label="默认 Provider" required />
                  <select id="agent-defaultProviderCode" value={form.defaultProviderCode} onChange={(event) => setForm((prev) => ({ ...prev, defaultProviderCode: event.target.value }))} className="h-10 w-full rounded-md border border-border bg-muted/45 px-3 text-sm text-foreground shadow-none">
                    <option value="">请选择</option>
                    {providers?.items.map((item) => (
                      <option key={item.providerId} value={item.code}>{item.name} ({item.code})</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <AdminFieldLabel htmlFor="agent-defaultModelCode" label="默认 Model" required />
                  <select id="agent-defaultModelCode" value={form.defaultModelCode} onChange={(event) => setForm((prev) => ({ ...prev, defaultModelCode: event.target.value }))} className="h-10 w-full rounded-md border border-border bg-muted/45 px-3 text-sm text-foreground shadow-none">
                    <option value="">请选择</option>
                    {models?.items.map((item) => (
                      <option key={item.modelId} value={item.code}>{item.displayName} ({item.code})</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <AdminFieldLabel htmlFor="agent-description" label="描述" />
                  <Input id="agent-description" value={form.description} onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))} />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-4">
                <div className="space-y-1.5">
                  <AdminFieldLabel htmlFor="agent-contextMessageLimit" label="上下文消息上限" required />
                  <Input id="agent-contextMessageLimit" type="number" value={String(form.contextMessageLimit)} onChange={(event) => setForm((prev) => ({ ...prev, contextMessageLimit: Number(event.target.value) || 0 }))} />
                </div>
                <div className="space-y-1.5">
                  <AdminFieldLabel htmlFor="agent-maxOutputTokens" label="最大输出 Tokens" required />
                  <Input id="agent-maxOutputTokens" type="number" value={String(form.maxOutputTokens)} onChange={(event) => setForm((prev) => ({ ...prev, maxOutputTokens: Number(event.target.value) || 0 }))} />
                </div>
                <div className="space-y-1.5">
                  <AdminFieldLabel htmlFor="agent-temperature" label="Temperature" required />
                  <Input id="agent-temperature" type="number" step="0.1" value={String(form.temperature)} onChange={(event) => setForm((prev) => ({ ...prev, temperature: Number(event.target.value) || 0 }))} />
                </div>
                <div className="space-y-1.5">
                  <AdminFieldLabel htmlFor="agent-topP" label="Top P" />
                  <Input id="agent-topP" type="number" step="0.05" value={String(form.topP)} onChange={(event) => setForm((prev) => ({ ...prev, topP: Number(event.target.value) || 0 }))} />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-1.5">
                <AdminFieldLabel
                  htmlFor="agent-systemPromptTemplate"
                  label="System Prompt"
                  required
                  helpText="系统级提示词，定义 Agent 的稳定行为边界与输出风格。"
                />
                  <Textarea id="agent-systemPromptTemplate" rows={10} value={form.systemPromptTemplate} onChange={(event) => setForm((prev) => ({ ...prev, systemPromptTemplate: event.target.value }))} />
                </div>
                <div className="space-y-1.5">
                  <AdminFieldLabel
                    htmlFor="agent-developerPromptTemplate"
                    label="Developer Prompt"
                    helpText="可选补充提示词。适合放可迭代策略，不建议覆盖系统级约束。"
                  />
                  <Textarea id="agent-developerPromptTemplate" rows={10} value={form.developerPromptTemplate} onChange={(event) => setForm((prev) => ({ ...prev, developerPromptTemplate: event.target.value }))} />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <label className="flex items-center gap-2 rounded-xl border border-border bg-muted/30 px-3 py-3 text-sm text-foreground shadow-none">
                  <input type="checkbox" checked={form.streamEnabled} onChange={(event) => setForm((prev) => ({ ...prev, streamEnabled: event.target.checked }))} />
                  启用流式输出
                </label>
                <label className="flex items-center gap-2 rounded-xl border border-border bg-muted/30 px-3 py-3 text-sm text-foreground shadow-none">
                  <input type="checkbox" checked={form.isActive} onChange={(event) => setForm((prev) => ({ ...prev, isActive: event.target.checked }))} />
                  启用
                </label>
              </div>

              <div className="space-y-1.5">
                <AdminFieldLabel
                  htmlFor="agent-metadata"
                  label="Metadata JSON"
                  helpText="可留空，默认填 {}。用于记录 Agent 的附加标签或调度提示。"
                />
                <Textarea id="agent-metadata" rows={6} value={form.metadataText} onChange={(event) => setForm((prev) => ({ ...prev, metadataText: event.target.value }))} />
              </div>

              <div className="space-y-1.5">
                <AdminFieldLabel
                  htmlFor="agent-changeReason"
                  label="变更原因"
                  required
                  helpText="用于审计记录。建议写明改动目的，例如“优化教学场景 system prompt”。"
                />
                <Textarea id="agent-changeReason" rows={4} value={form.changeReason} onChange={(event) => setForm((prev) => ({ ...prev, changeReason: event.target.value }))} />
              </div>
            </div>
          )}
        </div>
        <SheetFooter className="border-t border-border px-6 py-4 sm:flex-row sm:justify-end">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            取消
          </Button>
          <Button type="button" onClick={() => void handleSave()} disabled={saving || loading}>
            {saving ? "保存中…" : agentId ? "保存修改" : "创建 Agent"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
