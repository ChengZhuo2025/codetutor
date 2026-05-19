"use client"

import { useState } from "react"
import { Eye, EyeOff } from "lucide-react"
import type { AdminAIProviderSecretRevealResponseData, AdminAIProviderSecretSource } from "@/lib/api/contracts/admin-ai"
import { useAppToast } from "@/components/app-feedback/app-toast-provider"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  adminRequestData,
  getAdminApiErrorMessage,
  isAdminSessionExpiredError,
} from "@/lib/api/admin-bff-client"

const SECRET_SOURCE_LABELS: Record<AdminAIProviderSecretSource, string> = {
  database: "数据库加密托管",
  env_fallback: "环境变量回退",
  missing: "未配置",
}

type ProviderSecretDisplayProps = {
  providerId: string
  secretMasked: string
  secretSource: AdminAIProviderSecretSource
  envSecretRef: string | null
  onAuthExpired?: () => void
  showSecretMeta?: boolean
}

export function ProviderSecretDisplay({
  providerId,
  secretMasked,
  secretSource,
  envSecretRef,
  onAuthExpired,
  showSecretMeta = true,
}: ProviderSecretDisplayProps) {
  const toast = useAppToast()
  const [revealedSecret, setRevealedSecret] = useState<string | null>(null)
  const [revealed, setRevealed] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleToggle = async () => {
    if (revealed) {
      setRevealed(false)
      return
    }

    if (revealedSecret) {
      setRevealed(true)
      return
    }

    setLoading(true)
    try {
      const result = await adminRequestData<AdminAIProviderSecretRevealResponseData>(
        `/admin/ai/providers/${providerId}/reveal-secret`,
        { method: "POST" },
        "读取 Provider API Key 失败",
      )
      setRevealedSecret(result.apiKey)
      setRevealed(true)
    } catch (error) {
      if (isAdminSessionExpiredError(error)) {
        onAuthExpired?.()
      }
      toast.error(getAdminApiErrorMessage(error, "读取 Provider API Key 失败"))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Input
          value={revealed ? (revealedSecret ?? secretMasked) : secretMasked}
          type={revealed ? "text" : "password"}
          readOnly
          variant="code"
        />
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="shrink-0"
          onClick={() => void handleToggle()}
          disabled={loading || secretSource === "missing"}
          aria-label={revealed ? "隐藏 API Key" : "显示 API Key"}
        >
          {revealed ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </Button>
      </div>
      {showSecretMeta ? (
        <div className="space-y-1 text-xs text-muted-foreground">
          <p>密钥来源：{SECRET_SOURCE_LABELS[secretSource]}</p>
          {envSecretRef ? <p>兼容 Env Secret Ref：{envSecretRef}</p> : null}
        </div>
      ) : null}
    </div>
  )
}
