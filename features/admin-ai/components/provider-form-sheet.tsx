"use client"

import { useEffect, useMemo, useState } from "react"
import { Eye, EyeOff } from "lucide-react"
import {
  AdminConnectionTestButton,
  type AdminConnectionTestPhase,
} from "@/features/admin-ai/components/admin-connection-test-button"
import type {
  AdminAIProviderDetailResponseData,
  AdminAIProviderTestConnectionResponseData,
  AdminAIProviderUpsertRequest,
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
import { ProviderSecretDisplay } from "./provider-secret-display"
import { AdminFieldLabel } from "./admin-field-label"

const SECRET_SOURCE_LABELS = {
  database: "数据库加密托管",
  env_fallback: "环境变量回退",
  missing: "未配置",
} as const

const EMPTY_FORM = {
  code: "",
  name: "",
  providerType: "openai_compatible",
  baseUrl: "",
  authMode: "bearer",
  envSecretRef: "",
  apiKey: "",
  supportsStream: true,
  supportsJsonMode: false,
  timeoutMs: 60000,
  retryCount: 1,
  isActive: true,
  metadataText: "{}",
  changeReason: "更新 Provider 配置",
}

type ProviderFormState = typeof EMPTY_FORM

function mapDetailToForm(detail: AdminAIProviderDetailResponseData["provider"]): ProviderFormState {
  return {
    code: detail.code,
    name: detail.name,
    providerType: detail.providerType,
    baseUrl: detail.baseUrl,
    authMode: detail.authMode,
    envSecretRef: detail.envSecretRef ?? "",
    apiKey: "",
    supportsStream: detail.supportsStream,
    supportsJsonMode: detail.supportsJsonMode,
    timeoutMs: detail.timeoutMs,
    retryCount: detail.retryCount,
    isActive: detail.isActive,
    metadataText: prettyJson(detail.metadata),
    changeReason: "更新 Provider 配置",
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
  const [connectionTestPhase, setConnectionTestPhase] = useState<AdminConnectionTestPhase>("idle")
  const [connectionTestMessage, setConnectionTestMessage] = useState("")
  const [showNewSecret, setShowNewSecret] = useState(false)

  useEffect(() => {
    if (!open) {
      setShowNewSecret(false)
      setConnectionTestPhase("idle")
      setConnectionTestMessage("")
      return
    }

    if (!providerId) {
      setDetail(null)
      setForm(EMPTY_FORM)
      setConnectionTestPhase("idle")
      setConnectionTestMessage("")
      return
    }

    let cancelled = false
    const loadDetail = async () => {
      setConnectionTestPhase("idle")
      setConnectionTestMessage("")
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

  const handleTestConnection = async () => {
    if (!providerId) {
      return
    }

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

    setConnectionTestPhase("loading")
    setConnectionTestMessage("")
    try {
      const result = await adminRequestData<AdminAIProviderTestConnectionResponseData>(
        `/admin/ai/providers/${providerId}/test-connection`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            baseUrl: baseUrlTrimmed,
            authMode: form.authMode,
            providerType: form.providerType,
            envSecretRef: form.envSecretRef.trim() || null,
            apiKey: form.apiKey.trim() || null,
            timeoutMs,
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

      const changeReasonTrimmed = form.changeReason.trim()
      if (changeReasonTrimmed.length < 2 || changeReasonTrimmed.length > 500) {
        toast.error("变更原因至少 2 个字符且最多 500 个字符。")
        return
      }

      const apiKeyTrimmed = form.apiKey.trim()
      const hasExistingSecret = detail?.provider.hasStoredSecret || detail?.provider.secretSource === "env_fallback"
      if (!providerId && apiKeyTrimmed.length === 0) {
        toast.error("新建 Provider 时必须填写 API Key。")
        return
      }
      if (providerId && !hasExistingSecret && apiKeyTrimmed.length === 0) {
        toast.error("当前 Provider 尚未配置 API Key，请填写新 API Key 后再保存。")
        return
      }

      const payload: AdminAIProviderUpsertRequest = {
        code: form.code.trim().toLowerCase(),
        name: form.name.trim(),
        providerType: form.providerType as AdminAIProviderUpsertRequest["providerType"],
        baseUrl: baseUrlTrimmed,
        authMode: form.authMode as AdminAIProviderUpsertRequest["authMode"],
        envSecretRef: form.envSecretRef.trim() || null,
        apiKey: apiKeyTrimmed || null,
        keepExistingSecret: Boolean(providerId && apiKeyTrimmed.length === 0),
        supportsStream: form.supportsStream,
        supportsJsonMode: form.supportsJsonMode,
        timeoutMs,
        retryCount,
        isActive: form.isActive,
        metadata: metadataParsed.data,
        changeReason: changeReasonTrimmed,
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
      const fallbackMessage = providerId ? "更新 Provider 失败" : "创建 Provider 失败"
      const apiErrorMessage = getAdminApiErrorMessage(error, fallbackMessage)
      if (
        form.changeReason.trim().length < 2
        || /Provider 请求体不合法|changeReason/i.test(apiErrorMessage)
      ) {
        toast.error("请填写变更原因（至少 2 个字符，最多 500 个字符）。")
        return
      }
      toast.error(apiErrorMessage)
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
                  <AdminFieldLabel
                    htmlFor="provider-code"
                    label="Code"
                    required
                    helpText={codeLocked ? "当前有 Agent 将本 Provider 设为默认，不能修改 Code。请先在 Agent 管理中调整默认 Provider。" : undefined}
                  />
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
                </div>
                <div className="space-y-1.5">
                  <AdminFieldLabel htmlFor="provider-name" label="名称" required />
                  <Input id="provider-name" value={form.name} onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))} />
                </div>
                <div className="space-y-1.5">
                  <AdminFieldLabel htmlFor="provider-type" label="Provider 类型" required />
                  <select id="provider-type" value={form.providerType} onChange={(event) => setForm((prev) => ({ ...prev, providerType: event.target.value }))} className="h-10 w-full rounded-md border border-border bg-muted/45 px-3 text-sm text-foreground shadow-none">
                    <option value="openai_compatible">openai_compatible</option>
                    <option value="siliconflow">siliconflow</option>
                    <option value="anthropic">anthropic</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <AdminFieldLabel htmlFor="provider-authMode" label="鉴权方式" required />
                  <select id="provider-authMode" value={form.authMode} onChange={(event) => setForm((prev) => ({ ...prev, authMode: event.target.value }))} className="h-10 w-full rounded-md border border-border bg-muted/45 px-3 text-sm text-foreground shadow-none">
                    <option value="bearer">bearer</option>
                    <option value="api_key_header">api_key_header</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <AdminFieldLabel htmlFor="provider-baseUrl" label="Base URL" required />
                <Input id="provider-baseUrl" value={form.baseUrl} onChange={(event) => setForm((prev) => ({ ...prev, baseUrl: event.target.value }))} />
              </div>

              <div className="space-y-3 rounded-xl border border-border bg-muted/20 p-4">
                <div className="space-y-1.5">
                  <AdminFieldLabel
                    label="当前 API Key"
                    helpText={providerId && detail
                      ? `密钥来源：${SECRET_SOURCE_LABELS[detail.provider.secretSource]}${detail.provider.envSecretRef ? `\n兼容 Env Secret Ref：${detail.provider.envSecretRef}` : ""}`
                      : undefined}
                  />
                  {providerId && detail ? (
                    <ProviderSecretDisplay
                      providerId={providerId}
                      secretMasked={detail.provider.secretMasked}
                      secretSource={detail.provider.secretSource}
                      envSecretRef={detail.provider.envSecretRef}
                      onAuthExpired={onAuthExpired}
                      showSecretMeta={false}
                    />
                  ) : (
                    <p className="text-sm text-muted-foreground">新建 Provider 时请直接填写下方 API Key。</p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <AdminFieldLabel htmlFor="provider-apiKey" label="新 API Key" required={!providerId} />
                  <div className="flex items-center gap-2">
                    <Input
                      id="provider-apiKey"
                      type={showNewSecret ? "text" : "password"}
                      value={form.apiKey}
                      onChange={(event) => setForm((prev) => ({ ...prev, apiKey: event.target.value }))}
                      placeholder={providerId ? "留空表示保留当前密钥；填写后覆盖" : "请输入 Provider API Key"}
                      className="font-mono"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="shrink-0"
                      onClick={() => setShowNewSecret((prev) => !prev)}
                      aria-label={showNewSecret ? "隐藏新 API Key" : "显示新 API Key"}
                    >
                      {showNewSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-[1.2fr_0.8fr_0.8fr]">
                <div className="space-y-1.5">
                  <AdminFieldLabel htmlFor="provider-envSecretRef" label="兼容 Env Secret Ref" />
                  <Input id="provider-envSecretRef" value={form.envSecretRef} onChange={(event) => setForm((prev) => ({ ...prev, envSecretRef: event.target.value }))} placeholder="例如：SILICONFLOW_API_KEY（可留空）" />
                </div>
                <div className="space-y-1.5">
                  <AdminFieldLabel htmlFor="provider-timeoutMs" label="超时 ms" required />
                  <Input id="provider-timeoutMs" type="number" value={String(form.timeoutMs)} onChange={(event) => setForm((prev) => ({ ...prev, timeoutMs: Number(event.target.value) || 0 }))} />
                </div>
                <div className="space-y-1.5">
                  <AdminFieldLabel htmlFor="provider-retryCount" label="重试次数" required />
                  <Input id="provider-retryCount" type="number" value={String(form.retryCount)} onChange={(event) => setForm((prev) => ({ ...prev, retryCount: Number(event.target.value) || 0 }))} />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <label className="flex items-center gap-2 rounded-xl border border-border bg-muted/30 px-3 py-3 text-sm text-foreground shadow-none">
                  <input type="checkbox" checked={form.supportsStream} onChange={(event) => setForm((prev) => ({ ...prev, supportsStream: event.target.checked }))} />
                  支持流式输出
                </label>
                <label className="flex items-center gap-2 rounded-xl border border-border bg-muted/30 px-3 py-3 text-sm text-foreground shadow-none">
                  <input type="checkbox" checked={form.supportsJsonMode} onChange={(event) => setForm((prev) => ({ ...prev, supportsJsonMode: event.target.checked }))} />
                  支持 JSON mode
                </label>
                <label className="flex items-center gap-2 rounded-xl border border-border bg-muted/30 px-3 py-3 text-sm text-foreground shadow-none">
                  <input type="checkbox" checked={form.isActive} onChange={(event) => setForm((prev) => ({ ...prev, isActive: event.target.checked }))} />
                  启用
                </label>
              </div>

              <div className="space-y-1.5">
                <AdminFieldLabel
                  htmlFor="provider-metadata"
                  label="Metadata JSON"
                  helpText={`可留空，默认填 {} 即可。\n仅在需要自定义“连接测试探测方式”时再填写，例如：\n{"connectionTest":{"path":"/text/chatcompletion_v2","method":"POST","body":{},"successHttpStatuses":[200,400]}}`}
                />
                <Textarea id="provider-metadata" rows={8} value={form.metadataText} onChange={(event) => setForm((prev) => ({ ...prev, metadataText: event.target.value }))} />
              </div>

              <div className="space-y-1.5">
                <AdminFieldLabel htmlFor="provider-changeReason" label="变更原因" required />
                <Textarea id="provider-changeReason" rows={4} value={form.changeReason} onChange={(event) => setForm((prev) => ({ ...prev, changeReason: event.target.value }))} placeholder="例如：新增备用 provider / 调整 timeout 策略" />
              </div>
            </div>
          )}
        </div>
        <SheetFooter className="border-t border-border px-6 py-4 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
          <div className="flex w-full sm:w-auto">
            {providerId ? (
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
              {saving ? "保存中…" : providerId ? "保存修改" : "创建 Provider"}
            </Button>
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
