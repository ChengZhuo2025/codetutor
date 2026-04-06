"use client"

import { Suspense, useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { StatePanel } from "@/components/ui/state-panel"
import {
  getOAuthProviderMeta,
  isOAuthProvider,
} from "@/features/auth/lib/oauth-providers"
import type { AuthLoginResponseData } from "@/lib/api/contracts/auth"
import { requestData } from "@/lib/api/client"
import { createSupabaseBrowserClient } from "@/lib/supabase/client"

function withAuthorization(accessToken: string | null | undefined) {
  if (!accessToken) {
    return undefined
  }

  return {
    Authorization: `Bearer ${accessToken}`,
  }
}

function AuthCallbackContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [status, setStatus] = useState<"loading" | "error">("loading")
  const [message, setMessage] = useState("正在完成登录状态同步。")

  useEffect(() => {
    let cancelled = false

    async function completeAuthCallback() {
      const oauthError =
        searchParams.get("error_description") ?? searchParams.get("error")

      if (oauthError) {
        setStatus("error")
        setMessage(oauthError)
        return
      }

      const code = searchParams.get("code")
      const providerParam = searchParams.get("provider")

      if (!code) {
        setStatus("error")
        setMessage("缺少 OAuth 回调 code，无法完成登录。")
        return
      }

      if (!isOAuthProvider(providerParam)) {
        setStatus("error")
        setMessage("缺少可识别的扫码登录 provider，无法完成登录。")
        return
      }

      const provider = providerParam
      const providerMeta = getOAuthProviderMeta(provider)

      try {
        const supabase = createSupabaseBrowserClient()
        const { data: exchangeData, error } = await supabase.auth.exchangeCodeForSession(code)

        if (error) {
          throw error
        }

        const data = await requestData<AuthLoginResponseData>("/auth/login", {
          method: "POST",
          headers: withAuthorization(exchangeData.session?.access_token),
          body: JSON.stringify({
            loginType: provider,
          }),
        })

        if (!cancelled) {
          router.replace(data.redirectTo)
        }
      } catch (error) {
        if (cancelled) {
          return
        }

        setStatus("error")
        setMessage(
          error instanceof Error ? error.message : `${providerMeta.label}回调处理失败`,
        )
      }
    }

    void completeAuthCallback()

    return () => {
      cancelled = true
    }
  }, [router, searchParams])

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6">
      <div className="w-full max-w-lg">
        <StatePanel
          status={status}
          title={status === "loading" ? "正在完成登录" : "登录失败"}
          description={message}
        />
      </div>
    </div>
  )
}

function AuthCallbackFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6">
      <div className="w-full max-w-lg">
        <StatePanel
          status="loading"
          title="正在完成登录"
          description="正在初始化回调页。"
        />
      </div>
    </div>
  )
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={<AuthCallbackFallback />}>
      <AuthCallbackContent />
    </Suspense>
  )
}
