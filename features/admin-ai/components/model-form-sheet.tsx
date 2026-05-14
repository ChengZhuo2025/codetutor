"use client"

import { useEffect, useMemo, useState } from "react"
import {
  AdminConnectionTestButton,
  type AdminConnectionTestPhase,
} from "@/features/admin-ai/components/admin-connection-test-button"
import {
  ADMIN_AI_MODEL_CONNECTION_TEST_MODES,
  ADMIN_AI_MODEL_FAMILIES,
  ADMIN_AI_MODEL_RUNTIME_CAPABILITIES,
  type AdminAIModelConnectionTestMode,
  type AdminAIModelDetailResponseData,
  type AdminAIModelFamily,
  type AdminAIModelRuntimeCapability,
  type AdminAIModelTestConnectionResponseData,
  type AdminAIModelUpsertRequest,
  type AdminAIProviderListResponseData,
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
import { adminAiModelBffDetailUrl } from "@/features/admin-ai/lib/model-admin-urls"
import {
  getAdminAIModelConnectionTestModeLabel,
  getAdminAIModelFamilyLabel,
  getAdminAIModelRuntimeCapabilityLabel,
  prettyJson,
  safeJsonParse,
} from "@/features/admin-ai/lib/view-model"
import { AdminFieldLabel } from "./admin-field-label"

const MODEL_BOOL_TILE_CLASS =
  "flex min-h-9 shrink-0 cursor-pointer items-center gap-2.5 rounded-md border border-border/90 bg-muted/45 px-3 py-2 text-sm text-foreground shadow-none has-[:focus-visible]:outline-none has-[:focus-visible]:ring-[3px] has-[:focus-visible]:ring-ring/50"

type ModelFormState = {
  providerCode: string
  code: string
  displayName: string
  modelName: string
  supportsStream: boolean
  supportsJsonMode: boolean
  supportsToolCalling: boolean
  maxContextTokens: number
  defaultMaxOutputTokens: number
  recommendedTemperature: number
  modelFamily: AdminAIModelFamily
  runtimeCapabilities: AdminAIModelRuntimeCapability[]
  connectionTestMode: AdminAIModelConnectionTestMode
  reasoningEnabled: boolean
  profileGroup: string
  notes: string
  pricingMetadataText: string
  isActive: boolean
  metadataText: string
  changeReason: string
}

const EMPTY_FORM: ModelFormState = {
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
  modelFamily: "chat",
  runtimeCapabilities: [],
  connectionTestMode: "chat",
  reasoningEnabled: false,
  profileGroup: "balanced_default",
  notes: "",
  pricingMetadataText: "{}",
  isActive: true,
  metadataText: "{}",
  changeReason: "",
}

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
    modelFamily: detail.modelFamily,
    runtimeCapabilities: detail.runtimeCapabilities,
    connectionTestMode: detail.connectionTestMode,
    reasoningEnabled: detail.reasoningEnabled,
    profileGroup: detail.profileGroup ?? "",
    notes: detail.notes ?? "",
    pricingMetadataText: prettyJson(detail.pricingMetadata),
    isActive: detail.isActive,
    metadataText: prettyJson(detail.metadata),
    changeReason: "",
  }
}

type ModelFormSheetProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  modelId: string | null
  onSaved: (detail: AdminAIModelDetailResponseData) => Promise<void> | void
  onAuthExpired: () => void
}

export function ModelFormSheet({
  open,
  onOpenChange,
  modelId,
  onSaved,
  onAuthExpired,
}: ModelFormSheetProps) {
  const toast = useAppToast()
  const [form, setForm] = useState<ModelFormState>(EMPTY_FORM)
  const [detail, setDetail] = useState<AdminAIModelDetailResponseData | null>(null)
  const [providers, setProviders] = useState<AdminAIProviderListResponseData | null>(null)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [connectionTestPhase, setConnectionTestPhase] = useState<AdminConnectionTestPhase>("idle")
  const [connectionTestMessage, setConnectionTestMessage] = useState("")

  useEffect(() => {
    if (!open) {
      setConnectionTestPhase("idle")
      setConnectionTestMessage("")
      return
    }

    let cancelled = false
    const loadData = async () => {
      setConnectionTestPhase("idle")
      setConnectionTestMessage("")
      setLoading(true)
      try {
        const providerResult = await adminRequestData<AdminAIProviderListResponseData>(
          "/admin/ai/providers?status=active&page=1&limit=100",
          { method: "GET" },
          "获取 Provider 选项失败",
        )
        if (cancelled) {
          return
        }
        setProviders(providerResult)

        if (!modelId) {
          setDetail(null)
          setForm((prev) => ({
            ...EMPTY_FORM,
            providerCode: providerResult.items[0]?.code ?? prev.providerCode,
          }))
          return
        }

        try {
          const detailResult = await adminRequestData<AdminAIModelDetailResponseData>(
            adminAiModelBffDetailUrl(modelId),
            { method: "GET" },
            "获取 Model 详情失败",
          )
          if (cancelled) {
            return
          }
          setDetail(detailResult)
          setForm(mapDetailToForm(detailResult.model))
        } catch (detailError) {
          if (isAdminSessionExpiredError(detailError)) {
            onAuthExpired()
          }
          if (!cancelled) {
            toast.error(getAdminApiErrorMessage(detailError, "获取 Model 详情失败"))
            setDetail(null)
            setForm((prev) => ({
              ...EMPTY_FORM,
              providerCode: providerResult.items[0]?.code ?? prev.providerCode,
            }))
          }
        }
      } catch (error) {
        if (isAdminSessionExpiredError(error)) {
          onAuthExpired()
        }
        if (!cancelled) {
          toast.error(getAdminApiErrorMessage(error, "获取 Model 配置失败"))
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
  }, [modelId, onAuthExpired, open, toast])

  const description = useMemo(() => {
    if (!detail) {
      return "管理模型类别、运行时用途、连接测试模式与上下文参数。"
    }
    return `当前已关联 ${detail.linkedAgentCodes.length} 个 Agent。`
  }, [detail])

  const capabilityOptions = useMemo(
    () =>
      ADMIN_AI_MODEL_RUNTIME_CAPABILITIES.map((capability) => ({
        value: capability,
        label: getAdminAIModelRuntimeCapabilityLabel(capability),
      })),
    [],
  )

  const handleTestConnection = async () => {
    if (!modelId) {
      return
    }

    const providerCode = form.providerCode.trim()
    const modelName = form.modelName.trim()
    if (!providerCode) {
      toast.error("请先选择 Provider。")
      return
    }
    if (!modelName) {
      toast.error("请填写真实模型名后再测试连接。")
      return
    }

    const maxOut = Math.trunc(Number(form.defaultMaxOutputTokens))
    const maxOutputTokens = Number.isFinite(maxOut) && maxOut >= 1 ? Math.min(512, maxOut) : 16

    setConnectionTestPhase("loading")
    setConnectionTestMessage("")
    try {
      const result = await adminRequestData<AdminAIModelTestConnectionResponseData>(
        `/admin/ai/models/${modelId}/test-connection`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            providerCode,
            modelName,
            modelFamily: form.modelFamily,
            runtimeCapabilities: form.runtimeCapabilities,
            connectionTestMode: form.connectionTestMode,
            maxOutputTokens,
          }),
        },
        "连接测试失败",
      )

      if (result.success) {
        setConnectionTestPhase("success")
        setConnectionTestMessage(result.message)
        toast.success(result.message)
      } else {
        setConnectionTestPhase("error")
        setConnectionTestMessage(result.message)
        toast.error(result.message)
      }
    } catch (error) {
      if (isAdminSessionExpiredError(error)) {
        onAuthExpired()
        setConnectionTestPhase("error")
        setConnectionTestMessage("登录已过期")
        toast.error("登录已过期")
        return
      }
      setConnectionTestPhase("error")
      setConnectionTestMessage("连接失败")
      toast.error("连接失败")
    }
  }

  const handleSave = async () => {
    setSaving(true)
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
        modelFamily: form.modelFamily,
        runtimeCapabilities: form.runtimeCapabilities,
        connectionTestMode: form.connectionTestMode,
        reasoningEnabled: form.reasoningEnabled,
        profileGroup: form.profileGroup.trim() || null,
        notes: form.notes.trim() || null,
        pricingMetadata: safeJsonParse(form.pricingMetadataText),
        isActive: form.isActive,
        metadata: safeJsonParse(form.metadataText),
        changeReason: form.changeReason,
      }

      const result = modelId
        ? await adminRequestData<AdminAIModelDetailResponseData>(
            adminAiModelBffDetailUrl(modelId),
            {
              method: "PATCH",
              body: JSON.stringify(payload),
            },
            "更新 Model 失败",
          )
        : await adminRequestData<AdminAIModelDetailResponseData>(
            "/admin/ai/models",
            {
              method: "POST",
              body: JSON.stringify(payload),
            },
            "创建 Model 失败",
          )

      await onSaved(result)
      onOpenChange(false)
      toast.success(modelId ? "Model 已更新" : "Model 已创建")
    } catch (error) {
      if (isAdminSessionExpiredError(error)) {
        onAuthExpired()
      }
      toast.error(getAdminApiErrorMessage(error, modelId ? "更新 Model 失败" : "创建 Model 失败"))
    } finally {
      setSaving(false)
    }
  }

  const toggleRuntimeCapability = (capability: AdminAIModelRuntimeCapability, checked: boolean) => {
    setForm((prev) => ({
      ...prev,
      runtimeCapabilities: checked
        ? Array.from(new Set([...prev.runtimeCapabilities, capability]))
        : prev.runtimeCapabilities.filter((item) => item !== capability),
    }))
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-xl">
        <SheetHeader className="border-b border-border px-6 py-5">
          <SheetTitle>{modelId ? "编辑 Model" : "新建 Model"}</SheetTitle>
          <SheetDescription>{description}</SheetDescription>
        </SheetHeader>
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {loading ? (
            <div className="h-80 animate-pulse rounded-xl border border-border bg-muted/30" />
          ) : (
            <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-1.5">
                  <AdminFieldLabel htmlFor="model-providerCode" label="Provider" required />
                  <select id="model-providerCode" value={form.providerCode} onChange={(event) => setForm((prev) => ({ ...prev, providerCode: event.target.value }))} className="h-10 w-full rounded-md border border-border bg-muted/45 px-3 text-sm text-foreground shadow-none">
                    <option value="">请选择 Provider</option>
                    {providers?.items.map((item) => (
                      <option key={item.providerId} value={item.code}>{item.name} ({item.code})</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <AdminFieldLabel htmlFor="model-code" label="Code" required />
                  <Input id="model-code" value={form.code} onChange={(event) => setForm((prev) => ({ ...prev, code: event.target.value }))} />
                </div>
                <div className="space-y-1.5">
                  <AdminFieldLabel htmlFor="model-displayName" label="展示名" required />
                  <Input id="model-displayName" value={form.displayName} onChange={(event) => setForm((prev) => ({ ...prev, displayName: event.target.value }))} />
                </div>
                <div className="space-y-1.5">
                  <AdminFieldLabel htmlFor="model-modelName" label="真实模型名" required />
                  <Input id="model-modelName" value={form.modelName} onChange={(event) => setForm((prev) => ({ ...prev, modelName: event.target.value }))} />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-1.5">
                  <AdminFieldLabel htmlFor="model-maxContextTokens" label="最大上下文" required />
                  <Input id="model-maxContextTokens" type="number" value={String(form.maxContextTokens)} onChange={(event) => setForm((prev) => ({ ...prev, maxContextTokens: Number(event.target.value) || 0 }))} />
                </div>
                <div className="space-y-1.5">
                  <AdminFieldLabel htmlFor="model-defaultMaxOutputTokens" label="默认输出上限" required />
                  <Input id="model-defaultMaxOutputTokens" type="number" value={String(form.defaultMaxOutputTokens)} onChange={(event) => setForm((prev) => ({ ...prev, defaultMaxOutputTokens: Number(event.target.value) || 0 }))} />
                </div>
                <div className="space-y-1.5">
                  <AdminFieldLabel htmlFor="model-recommendedTemperature" label="推荐温度" />
                  <Input id="model-recommendedTemperature" type="number" step="0.1" value={String(form.recommendedTemperature)} onChange={(event) => setForm((prev) => ({ ...prev, recommendedTemperature: Number(event.target.value) || 0 }))} />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-1.5">
                  <AdminFieldLabel htmlFor="model-modelFamily" label="模型类别" required helpText="让管理员一眼区分聊天、推理、ASR、视觉等模型。" />
                  <select
                    id="model-modelFamily"
                    value={form.modelFamily}
                    onChange={(event) => setForm((prev) => ({ ...prev, modelFamily: event.target.value as AdminAIModelFamily }))}
                    className="h-10 w-full rounded-md border border-border bg-muted/45 px-3 text-sm text-foreground shadow-none"
                  >
                    {ADMIN_AI_MODEL_FAMILIES.map((item) => (
                      <option key={item} value={item}>{getAdminAIModelFamilyLabel(item)}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <AdminFieldLabel htmlFor="model-connectionTestMode" label="连接测试模式" required helpText="定义后台连接测试应该发起 chat、音频转写，还是仅验证 /models 连通性。" />
                  <select
                    id="model-connectionTestMode"
                    value={form.connectionTestMode}
                    onChange={(event) => setForm((prev) => ({ ...prev, connectionTestMode: event.target.value as AdminAIModelConnectionTestMode }))}
                    className="h-10 w-full rounded-md border border-border bg-muted/45 px-3 text-sm text-foreground shadow-none"
                  >
                    {ADMIN_AI_MODEL_CONNECTION_TEST_MODES.map((item) => (
                      <option key={item} value={item}>{getAdminAIModelConnectionTestModeLabel(item)}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <AdminFieldLabel htmlFor="model-profileGroup" label="配置分组" helpText="例如 balanced_default、reasoning_lab，用于后台识别分组。" />
                  <Input id="model-profileGroup" value={form.profileGroup} onChange={(event) => setForm((prev) => ({ ...prev, profileGroup: event.target.value }))} />
                </div>
                <div className="space-y-1.5">
                  <AdminFieldLabel htmlFor="model-notes" label="管理备注" helpText="用于说明该模型在本项目中的实际用途或限制。" />
                  <Input id="model-notes" value={form.notes} onChange={(event) => setForm((prev) => ({ ...prev, notes: event.target.value }))} />
                </div>
              </div>

              <div className="space-y-2">
                <AdminFieldLabel label="运行时用途" required helpText="用于当前项目真实链路：教程材料 ASR、视觉/OCR、学习计划质量校验。无用途可不选。" />
                <div className="grid gap-2 md:grid-cols-3">
                  {capabilityOptions.map((option) => (
                    <label key={option.value} className={MODEL_BOOL_TILE_CLASS}>
                      <input
                        type="checkbox"
                        className="shrink-0 rounded border-border accent-primary"
                        checked={form.runtimeCapabilities.includes(option.value)}
                        onChange={(event) => toggleRuntimeCapability(option.value, event.target.checked)}
                      />
                      <span>{option.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex w-full min-w-0 flex-wrap items-center justify-between gap-2">
                <label className={MODEL_BOOL_TILE_CLASS}>
                  <input
                    type="checkbox"
                    className="shrink-0 rounded border-border accent-primary"
                    checked={form.supportsStream}
                    onChange={(event) => setForm((prev) => ({ ...prev, supportsStream: event.target.checked }))}
                  />
                  <span className="whitespace-nowrap">支持流式</span>
                </label>
                <label className={MODEL_BOOL_TILE_CLASS}>
                  <input
                    type="checkbox"
                    className="shrink-0 rounded border-border accent-primary"
                    checked={form.supportsJsonMode}
                    onChange={(event) => setForm((prev) => ({ ...prev, supportsJsonMode: event.target.checked }))}
                  />
                  <span className="whitespace-nowrap">支持 JSON</span>
                </label>
                <label className={MODEL_BOOL_TILE_CLASS}>
                  <input
                    type="checkbox"
                    className="shrink-0 rounded border-border accent-primary"
                    checked={form.supportsToolCalling}
                    onChange={(event) => setForm((prev) => ({ ...prev, supportsToolCalling: event.target.checked }))}
                  />
                  <span className="whitespace-nowrap">支持 Tool Calling</span>
                </label>
                <label className={MODEL_BOOL_TILE_CLASS}>
                  <input
                    type="checkbox"
                    className="shrink-0 rounded border-border accent-primary"
                    checked={form.reasoningEnabled}
                    onChange={(event) => setForm((prev) => ({ ...prev, reasoningEnabled: event.target.checked }))}
                  />
                  <span className="whitespace-nowrap">推理模式</span>
                </label>
                <label className={MODEL_BOOL_TILE_CLASS}>
                  <input
                    type="checkbox"
                    className="shrink-0 rounded border-border accent-primary"
                    checked={form.isActive}
                    onChange={(event) => setForm((prev) => ({ ...prev, isActive: event.target.checked }))}
                  />
                  <span className="whitespace-nowrap">启用</span>
                </label>
              </div>

              <div className="space-y-1.5">
                <AdminFieldLabel htmlFor="model-pricingMetadata" label="Pricing Metadata JSON" />
                <Textarea id="model-pricingMetadata" rows={6} value={form.pricingMetadataText} onChange={(event) => setForm((prev) => ({ ...prev, pricingMetadataText: event.target.value }))} />
              </div>

              <details className="rounded-xl border border-border bg-muted/20 px-4 py-3">
                <summary className="cursor-pointer list-none text-sm font-medium text-foreground">
                  高级扩展配置
                </summary>
                <p className="mt-2 text-xs leading-5 text-muted-foreground">
                  `metadata` 仅用于 routePolicy、phase 等少量未结构化的附加信息，不应再承载模型类别、用途或连接测试模式。
                </p>
                <div className="mt-3 space-y-1.5">
                  <AdminFieldLabel
                    htmlFor="model-metadata"
                    label="Metadata JSON"
                    helpText="留空时保持 {}。仅在需要记录少量高级扩展信息时填写。"
                  />
                  <Textarea id="model-metadata" rows={6} value={form.metadataText} onChange={(event) => setForm((prev) => ({ ...prev, metadataText: event.target.value }))} />
                </div>
              </details>

              <div className="space-y-1.5">
                <AdminFieldLabel
                  htmlFor="model-changeReason"
                  label="变更原因"
                  required
                  helpText="用于审计记录。建议写明本次改动目的，例如“新增 ASR 用模型”或“改为 /models 连通性探测”。"
                />
                <Textarea id="model-changeReason" rows={4} value={form.changeReason} onChange={(event) => setForm((prev) => ({ ...prev, changeReason: event.target.value }))} />
              </div>
            </div>
          )}
        </div>
        <SheetFooter className="border-t border-border px-6 py-4 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
          <div className="flex w-full sm:w-auto">
            {modelId ? (
              <AdminConnectionTestButton
                phase={connectionTestPhase}
                statusMessage={connectionTestMessage}
                onClick={() => void handleTestConnection()}
                disabled={saving || loading}
              />
            ) : null}
          </div>
          <div className="flex w-full justify-end gap-2 sm:w-auto">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={saving || connectionTestPhase === "loading"}
            >
              取消
            </Button>
            <Button
              type="button"
              onClick={() => void handleSave()}
              disabled={saving || loading || connectionTestPhase === "loading"}
            >
              {saving ? "保存中…" : modelId ? "保存修改" : "创建 Model"}
            </Button>
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
