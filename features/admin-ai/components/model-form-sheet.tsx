"use client"

import { useEffect, useMemo, useState } from "react"
import type {
  AdminAIModelDetailResponseData,
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
import { prettyJson, safeJsonParse } from "@/features/admin-ai/lib/view-model"

/** 与抽屉内 Input / select 同系：底色、边框与内阴影一致 */
const MODEL_BOOL_TILE_CLASS =
  "flex min-h-9 shrink-0 cursor-pointer items-center gap-2.5 rounded-md border border-border/90 bg-muted/45 px-3 py-2 text-sm text-foreground shadow-[inset_0_1px_2px_rgba(0,0,0,0.18)] has-[:focus-visible]:outline-none has-[:focus-visible]:ring-[3px] has-[:focus-visible]:ring-ring/50"

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

  useEffect(() => {
    if (!open) {
      return
    }

    let cancelled = false
    const loadData = async () => {
      setLoading(true)
      try {
        const providerPromise = adminRequestData<AdminAIProviderListResponseData>(
          "/admin/ai/providers?status=active&page=1&limit=100",
          { method: "GET" },
          "获取 Provider 选项失败",
        )
        const detailPromise = modelId
          ? adminRequestData<AdminAIModelDetailResponseData>(
              `/admin/ai/models/${modelId}`,
              { method: "GET" },
              "获取 Model 详情失败",
            )
          : Promise.resolve(null)

        const [providerResult, detailResult] = await Promise.all([providerPromise, detailPromise])
        if (cancelled) {
          return
        }

        setProviders(providerResult)
        if (detailResult) {
          setDetail(detailResult)
          setForm(mapDetailToForm(detailResult.model))
        } else {
          setDetail(null)
          setForm((prev) => ({
            ...EMPTY_FORM,
            providerCode: providerResult.items[0]?.code ?? prev.providerCode,
          }))
        }
      } catch (error) {
        if (isAdminSessionExpiredError(error)) {
          onAuthExpired()
        }
        if (!cancelled) {
          toast.error(getAdminApiErrorMessage(error, modelId ? "获取 Model 详情失败" : "获取 Model 配置失败"))
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
            `/admin/ai/models/${modelId}`,
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
                  <select id="model-providerCode" value={form.providerCode} onChange={(event) => setForm((prev) => ({ ...prev, providerCode: event.target.value }))} className="h-10 w-full rounded-md border border-border bg-muted/45 px-3 text-sm text-foreground shadow-[inset_0_1px_2px_rgba(0,0,0,0.18)]">
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
        <SheetFooter className="border-t border-border px-6 py-4 sm:flex-row sm:justify-end">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            取消
          </Button>
          <Button type="button" onClick={() => void handleSave()} disabled={saving || loading}>
            {saving ? "保存中…" : modelId ? "保存修改" : "创建 Model"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
