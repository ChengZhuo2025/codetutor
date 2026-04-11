"use client"

import { useEffect, useMemo, useState } from "react"
import {
  AdminConnectionTestButton,
  type AdminConnectionTestPhase,
} from "@/features/admin-ai/components/admin-connection-test-button"
import type {
  AdminAIModelDetailResponseData,
  AdminAIModelTestConnectionResponseData,
  AdminAIModelUpsertRequest,
  AdminAIProviderListResponseData,
} from "@/lib/api/contracts/admin-ai"
import { useAppToast } from "@/components/app-feedback/app-toast-provider"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
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
import { prettyJson, safeJsonParse } from "@/features/admin-ai/lib/view-model"

/** 与抽屉内 Input / select 同系：底色与边框一致，保持扁平化样式 */
const MODEL_BOOL_TILE_CLASS =
  "flex min-h-9 shrink-0 cursor-pointer items-center gap-2.5 rounded-md border border-border/90 bg-muted/45 px-3 py-2 text-sm text-foreground shadow-none has-[:focus-visible]:outline-none has-[:focus-visible]:ring-[3px] has-[:focus-visible]:ring-ring/50"

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
      return "管理 Provider 下的模型能力、上下文大小、默认输出长度与推荐温度。"
    }
    return `当前已关联 ${detail.linkedAgentCodes.length} 个 Agent。`
  }, [detail])

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
                  <Label htmlFor="model-providerCode">Provider</Label>
                  <select id="model-providerCode" value={form.providerCode} onChange={(event) => setForm((prev) => ({ ...prev, providerCode: event.target.value }))} className="h-10 w-full rounded-md border border-border bg-muted/45 px-3 text-sm text-foreground shadow-none">
                    <option value="">请选择 Provider</option>
                    {providers?.items.map((item) => (
                      <option key={item.providerId} value={item.code}>{item.name} ({item.code})</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="model-code">Code</Label>
                  <Input id="model-code" value={form.code} onChange={(event) => setForm((prev) => ({ ...prev, code: event.target.value }))} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="model-displayName">展示名</Label>
                  <Input id="model-displayName" value={form.displayName} onChange={(event) => setForm((prev) => ({ ...prev, displayName: event.target.value }))} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="model-modelName">真实模型名</Label>
                  <Input id="model-modelName" value={form.modelName} onChange={(event) => setForm((prev) => ({ ...prev, modelName: event.target.value }))} />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-1.5">
                  <Label htmlFor="model-maxContextTokens">最大上下文</Label>
                  <Input id="model-maxContextTokens" type="number" value={String(form.maxContextTokens)} onChange={(event) => setForm((prev) => ({ ...prev, maxContextTokens: Number(event.target.value) || 0 }))} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="model-defaultMaxOutputTokens">默认输出上限</Label>
                  <Input id="model-defaultMaxOutputTokens" type="number" value={String(form.defaultMaxOutputTokens)} onChange={(event) => setForm((prev) => ({ ...prev, defaultMaxOutputTokens: Number(event.target.value) || 0 }))} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="model-recommendedTemperature">推荐温度</Label>
                  <Input id="model-recommendedTemperature" type="number" step="0.1" value={String(form.recommendedTemperature)} onChange={(event) => setForm((prev) => ({ ...prev, recommendedTemperature: Number(event.target.value) || 0 }))} />
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
                    checked={form.isActive}
                    onChange={(event) => setForm((prev) => ({ ...prev, isActive: event.target.checked }))}
                  />
                  <span className="whitespace-nowrap">启用</span>
                </label>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="model-pricingMetadata">Pricing Metadata JSON</Label>
                <Textarea id="model-pricingMetadata" rows={6} value={form.pricingMetadataText} onChange={(event) => setForm((prev) => ({ ...prev, pricingMetadataText: event.target.value }))} />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="model-metadata">Metadata JSON</Label>
                <Textarea id="model-metadata" rows={6} value={form.metadataText} onChange={(event) => setForm((prev) => ({ ...prev, metadataText: event.target.value }))} />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="model-changeReason">变更原因</Label>
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
