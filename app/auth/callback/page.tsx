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

function getHashSessionTokens() {
  if (typeof window === "undefined" || !window.location.hash) {
    return null
  }

  const hashParams = new URLSearchParams(window.location.hash.slice(1))
  const accessToken = hashParams.get("access_token")
  const refreshToken = hashParams.get("refresh_token")

  if (!accessToken) {
    return null
  }

  return {
    accessToken,
    refreshToken,
  }
}

function notifyParentAuthCompleted(data: AuthLoginResponseData, provider: string) {
  if (typeof window === "undefined") {
    return false
  }

  const payload = {
    type: "codetutor.oauth.completed",
    provider,
    redirectTo: data.redirectTo,
    onboardingCompleted: data.onboardingCompleted,
  }

  let notified = false

  if (window.parent !== window) {
    window.parent.postMessage(payload, window.location.origin)
    notified = true
  }

  if (window.opener && !window.opener.closed) {
    window.opener.postMessage(payload, window.location.origin)
    notified = true
  }

  return notified
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

      const providerParam = searchParams.get("provider")

      if (!isOAuthProvider(providerParam)) {
        setStatus("error")
        setMessage("缺少可识别的扫码登录 provider，无法完成登录。")
        return
      }

      const provider = providerParam
      const providerMeta = getOAuthProviderMeta(provider)

      try {
        const supabase = createSupabaseBrowserClient()
        const code = searchParams.get("code")
        let accessToken: string | null | undefined

        if (code) {
          const { data: exchangeData, error } = await supabase.auth.exchangeCodeForSession(code)

          if (error) {
            throw error
          }

          accessToken = exchangeData.session?.access_token
        } else {
          const hashTokens = getHashSessionTokens()

          if (!hashTokens) {
            setStatus("error")
            setMessage("缺少 OAuth 回调 code 或 access_token，无法完成登录。")
            return
          }

          if (hashTokens.refreshToken) {
            const { data: sessionData, error } = await supabase.auth.setSession({
              access_token: hashTokens.accessToken,
              refresh_token: hashTokens.refreshToken,
            })

            if (error) {
              throw error
            }

            accessToken = sessionData.session?.access_token
          } else {
            const {
              data: { session },
            } = await supabase.auth.getSession()

            accessToken = session?.access_token ?? hashTokens.accessToken
          }
        }

        const data = await requestData<AuthLoginResponseData>("/auth/login", {
          method: "POST",
          headers: withAuthorization(accessToken),
          body: JSON.stringify({
            loginType: provider,
          }),
        })

        if (!cancelled && notifyParentAuthCompleted(data, provider)) {
          setMessage("登录成功，正在返回主页面。")
          return
        }

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
