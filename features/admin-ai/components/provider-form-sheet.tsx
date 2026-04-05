"use client"

import { useEffect, useMemo, useState } from "react"
import type {
  AdminAIProviderDetailResponseData,
  AdminAIProviderUpsertRequest,
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
import {
  isValidProviderBaseUrl,
  parseProviderMetadataJson,
  PROVIDER_BASE_URL_MAX_LENGTH,
  PROVIDER_BASE_URL_MIN_LENGTH,
  PROVIDER_RETRY_COUNT_MAX,
  PROVIDER_RETRY_COUNT_MIN,
  PROVIDER_TIMEOUT_MS_MAX,
  PROVIDER_TIMEOUT_MS_MIN,
} from "@/features/admin-ai/lib/provider-form-constraints"
import { prettyJson } from "@/features/admin-ai/lib/view-model"

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

type ProviderFormSheetProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  providerId: string | null
  onSaved: (detail: AdminAIProviderDetailResponseData) => Promise<void> | void
  onAuthExpired: () => void
}

export function ProviderFormSheet({
  open,
  onOpenChange,
  providerId,
  onSaved,
  onAuthExpired,
}: ProviderFormSheetProps) {
  const toast = useAppToast()
  const [form, setForm] = useState<ProviderFormState>(EMPTY_FORM)
  const [detail, setDetail] = useState<AdminAIProviderDetailResponseData | null>(null)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) {
      return
    }

    if (!providerId) {
      setDetail(null)
      setForm(EMPTY_FORM)
      return
    }

    let cancelled = false
    const loadDetail = async () => {
      setLoading(true)
      try {
        const result = await adminRequestData<AdminAIProviderDetailResponseData>(
          `/admin/ai/providers/${providerId}`,
          { method: "GET" },
          "获取 Provider 详情失败",
        )
        if (cancelled) {
          return
        }
        setDetail(result)
        setForm(mapDetailToForm(result.provider))
      } catch (error) {
        if (isAdminSessionExpiredError(error)) {
          onAuthExpired()
        }
        if (!cancelled) {
          toast.error(getAdminApiErrorMessage(error, "获取 Provider 详情失败"))
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    void loadDetail()

    return () => {
      cancelled = true
    }
  }, [onAuthExpired, open, providerId, toast])

  const title = providerId ? "编辑 Provider" : "新建 Provider"
  const description = useMemo(() => {
    if (!detail) {
      return "维护底层 Provider 连接配置、鉴权方式、超时重试和启停状态。"
    }
    return `关联 Models ${detail.linkedModelCodes.length} 个，关联 Agents ${detail.linkedAgentCodes.length} 个。`
  }, [detail])

  const codeLocked = Boolean(providerId && detail && detail.linkedAgentCodes.length > 0)

  const handleSave = async () => {
    setSaving(true)
    try {
      const baseUrlTrimmed = form.baseUrl.trim()
      if (
        baseUrlTrimmed.length < PROVIDER_BASE_URL_MIN_LENGTH
        || baseUrlTrimmed.length > PROVIDER_BASE_URL_MAX_LENGTH
      ) {
        toast.error(
          `Base URL 长度须在 ${PROVIDER_BASE_URL_MIN_LENGTH}–${PROVIDER_BASE_URL_MAX_LENGTH} 字符之间。`,
        )
        return
      }
      if (!isValidProviderBaseUrl(baseUrlTrimmed)) {
        toast.error("Base URL 必须是合法的 http(s) 地址。")
        return
      }

      const timeoutMs = Math.trunc(Number(form.timeoutMs))
      if (
        !Number.isFinite(timeoutMs)
        || timeoutMs < PROVIDER_TIMEOUT_MS_MIN
        || timeoutMs > PROVIDER_TIMEOUT_MS_MAX
      ) {
        toast.error(`超时须在 ${PROVIDER_TIMEOUT_MS_MIN}–${PROVIDER_TIMEOUT_MS_MAX} ms 之间。`)
        return
      }

      const retryCount = Math.trunc(Number(form.retryCount))
      if (
        !Number.isFinite(retryCount)
        || retryCount < PROVIDER_RETRY_COUNT_MIN
        || retryCount > PROVIDER_RETRY_COUNT_MAX
      ) {
        toast.error(`重试次数须在 ${PROVIDER_RETRY_COUNT_MIN}–${PROVIDER_RETRY_COUNT_MAX} 之间。`)
        return
      }

      const metadataParsed = parseProviderMetadataJson(form.metadataText)
      if (!metadataParsed.ok) {
        toast.error(metadataParsed.message)
        return
      }

      const payload: AdminAIProviderUpsertRequest = {
        code: form.code.trim().toLowerCase(),
        name: form.name.trim(),
        providerType: form.providerType as AdminAIProviderUpsertRequest["providerType"],
        baseUrl: baseUrlTrimmed,
        authMode: form.authMode as AdminAIProviderUpsertRequest["authMode"],
        secretRef: form.secretRef.trim(),
        supportsStream: form.supportsStream,
        supportsJsonMode: form.supportsJsonMode,
        timeoutMs,
        retryCount,
        isActive: form.isActive,
        metadata: metadataParsed.data,
        changeReason: form.changeReason,
      }

      const result = providerId
        ? await adminRequestData<AdminAIProviderDetailResponseData>(
            `/admin/ai/providers/${providerId}`,
            {
              method: "PATCH",
              body: JSON.stringify(payload),
            },
            "更新 Provider 失败",
          )
        : await adminRequestData<AdminAIProviderDetailResponseData>(
            "/admin/ai/providers",
            {
              method: "POST",
              body: JSON.stringify(payload),
            },
            "创建 Provider 失败",
          )

      await onSaved(result)
      onOpenChange(false)
      toast.success(providerId ? "Provider 已更新" : "Provider 已创建")
    } catch (error) {
      if (isAdminSessionExpiredError(error)) {
        onAuthExpired()
      }
      toast.error(getAdminApiErrorMessage(error, providerId ? "更新 Provider 失败" : "创建 Provider 失败"))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-xl">
        <SheetHeader className="border-b border-border px-6 py-5">
          <SheetTitle>{title}</SheetTitle>
          <SheetDescription>{description}</SheetDescription>
        </SheetHeader>
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {loading ? (
            <div className="h-80 animate-pulse rounded-xl border border-border bg-muted/30" />
          ) : (
            <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="provider-code">Code</Label>
                  <Input
                    id="provider-code"
                    value={form.code}
                    readOnly={codeLocked}
                    className={codeLocked ? "bg-muted/50" : undefined}
                    onChange={(event) => {
                      if (codeLocked) {
                        return
                      }
                      setForm((prev) => ({ ...prev, code: event.target.value }))
                    }}
                  />
                  {codeLocked ? (
                    <p className="text-xs text-muted-foreground">
                      当前有 Agent 将本 Provider 设为默认，不能修改 Code。请先在 Agent 管理中调整默认 Provider。
                    </p>
                  ) : null}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="provider-name">名称</Label>
                  <Input id="provider-name" value={form.name} onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="provider-type">Provider 类型</Label>
                  <select id="provider-type" value={form.providerType} onChange={(event) => setForm((prev) => ({ ...prev, providerType: event.target.value }))} className="h-10 w-full rounded-md border border-border bg-muted/45 px-3 text-sm text-foreground shadow-[inset_0_1px_2px_rgba(0,0,0,0.18)]">
                    <option value="openai_compatible">openai_compatible</option>
                    <option value="siliconflow">siliconflow</option>
                    <option value="anthropic">anthropic</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="provider-authMode">鉴权方式</Label>
                  <select id="provider-authMode" value={form.authMode} onChange={(event) => setForm((prev) => ({ ...prev, authMode: event.target.value }))} className="h-10 w-full rounded-md border border-border bg-muted/45 px-3 text-sm text-foreground shadow-[inset_0_1px_2px_rgba(0,0,0,0.18)]">
                    <option value="bearer">bearer</option>
                    <option value="api_key_header">api_key_header</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="provider-baseUrl">Base URL</Label>
                <Input id="provider-baseUrl" value={form.baseUrl} onChange={(event) => setForm((prev) => ({ ...prev, baseUrl: event.target.value }))} />
              </div>

              <div className="grid gap-4 md:grid-cols-[1.2fr_0.8fr_0.8fr]">
                <div className="space-y-1.5">
                  <Label htmlFor="provider-secretRef">Secret Ref</Label>
                  <Input id="provider-secretRef" value={form.secretRef} onChange={(event) => setForm((prev) => ({ ...prev, secretRef: event.target.value }))} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="provider-timeoutMs">超时 ms</Label>
                  <Input id="provider-timeoutMs" type="number" value={String(form.timeoutMs)} onChange={(event) => setForm((prev) => ({ ...prev, timeoutMs: Number(event.target.value) || 0 }))} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="provider-retryCount">重试次数</Label>
                  <Input id="provider-retryCount" type="number" value={String(form.retryCount)} onChange={(event) => setForm((prev) => ({ ...prev, retryCount: Number(event.target.value) || 0 }))} />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <label className="flex items-center gap-2 rounded-xl border border-border bg-muted/30 px-3 py-3 text-sm text-foreground shadow-[inset_0_1px_2px_rgba(0,0,0,0.12)]">
                  <input type="checkbox" checked={form.supportsStream} onChange={(event) => setForm((prev) => ({ ...prev, supportsStream: event.target.checked }))} />
                  支持流式输出
                </label>
                <label className="flex items-center gap-2 rounded-xl border border-border bg-muted/30 px-3 py-3 text-sm text-foreground shadow-[inset_0_1px_2px_rgba(0,0,0,0.12)]">
                  <input type="checkbox" checked={form.supportsJsonMode} onChange={(event) => setForm((prev) => ({ ...prev, supportsJsonMode: event.target.checked }))} />
                  支持 JSON mode
                </label>
                <label className="flex items-center gap-2 rounded-xl border border-border bg-muted/30 px-3 py-3 text-sm text-foreground shadow-[inset_0_1px_2px_rgba(0,0,0,0.12)]">
                  <input type="checkbox" checked={form.isActive} onChange={(event) => setForm((prev) => ({ ...prev, isActive: event.target.checked }))} />
                  启用
                </label>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="provider-metadata">Metadata JSON</Label>
                <Textarea id="provider-metadata" rows={8} value={form.metadataText} onChange={(event) => setForm((prev) => ({ ...prev, metadataText: event.target.value }))} />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="provider-changeReason">变更原因</Label>
                <Textarea id="provider-changeReason" rows={4} value={form.changeReason} onChange={(event) => setForm((prev) => ({ ...prev, changeReason: event.target.value }))} placeholder="例如：新增备用 provider / 调整 timeout 策略" />
              </div>
            </div>
          )}
        </div>
        <SheetFooter className="border-t border-border px-6 py-4 sm:flex-row sm:justify-end">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            取消
          </Button>
          <Button type="button" onClick={() => void handleSave()} disabled={saving || loading}>
            {saving ? "保存中…" : providerId ? "保存修改" : "创建 Provider"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
