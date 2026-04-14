"use client"

import { useEffect, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { APP_EVENTS } from "@/constants/events"
import { ROUTES } from "@/constants/routes"
import { useAppToast } from "@/components/app-feedback/app-toast-provider"
import { LoginBrandPanel } from "@/features/auth/components/login-brand-panel"
import { LoginForm } from "@/features/auth/components/login-form"
import {
  loadOAuthProviderAvailability,
  type OAuthProviderAvailability,
} from "@/features/auth/lib/oauth-providers"
import {
  isValidChinaMainlandPhone,
  normalizePhoneInput,
  toFriendlyAuthError,
} from "@/features/auth/lib/phone-auth"
import type { AuthMode, AuthOAuthProvider } from "@/features/auth/types"
import type { AuthLoginResponseData } from "@/lib/api/contracts/auth"
import { requestData } from "@/lib/api/client"
import { createSupabaseBrowserClient } from "@/lib/supabase/client"
import { ThemeToggle } from "@/components/layout/theme-toggle"
import { useAppEventTracker } from "@/providers/app-providers"

function withAuthorization(accessToken: string | null | undefined) {
  if (!accessToken) {
    return undefined
  }

  return {
    Authorization: `Bearer ${accessToken}`,
  }
}

const WECHAT_PROVIDER = "wechat" as never
const DOUYIN_PROVIDER = "douyin" as never

async function clearBrowserAuthSession() {
  const supabase = createSupabaseBrowserClient()
  await supabase.auth.signOut({ scope: "local" }).catch(() => undefined)
  await fetch("/api/auth/logout", { method: "POST" }).catch(() => undefined)
}

export function LoginPage() {
  const router = useRouter()
  const toast = useAppToast()
  const { trackEvent } = useAppEventTracker()
  const [mode, setMode] = useState<AuthMode>("login")
  const [phone, setPhone] = useState("")
  const [code, setCode] = useState("")
  const [countdown, setCountdown] = useState(0)
  const [lastSentPhone, setLastSentPhone] = useState("")
  const [isSendingCode, setIsSendingCode] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [oauthAvailability, setOauthAvailability] = useState<OAuthProviderAvailability | null>(null)
  const [oauthPendingProvider, setOauthPendingProvider] = useState<AuthOAuthProvider | null>(null)

  useEffect(() => {
    let cancelled = false

    void loadOAuthProviderAvailability().then((availability) => {
      if (!cancelled) {
        setOauthAvailability(availability)
      }
    })

    return () => {
      cancelled = true
    }
  }, [])

  const oauthProvidersReady = oauthAvailability ?? {
    wechat: false,
    douyin: false,
  }

  const handleOAuthSubmit = async (provider: AuthOAuthProvider) => {
    if (!oauthProvidersReady[provider]) {
      toast.error(
        "扫码登录暂不可用",
        "该扫码登录方式暂未开放，请先在 Supabase 控制台启用对应 Provider。",
      )
      return
    }

    const providerForSupabase = provider === "wechat" ? WECHAT_PROVIDER : DOUYIN_PROVIDER

    setErrorMessage(null)
    setOauthPendingProvider(provider)

    try {
      const supabase = createSupabaseBrowserClient()
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: providerForSupabase,
        options: {
          redirectTo: `${window.location.origin}${ROUTES.authCallback}?provider=${provider}`,
        },
      })

      if (error) {
        throw error
      }

      if (data.url) {
        window.location.assign(data.url)
        return
      }

      throw new Error(`${provider} oauth url missing`)
    } catch (error) {
      toast.error("扫码登录失败", toFriendlyAuthError(error, "oauth"))
    } finally {
      setOauthPendingProvider(null)
    }
  }
  const [isPending, startSubmitting] = useTransition()

  useEffect(() => {
    if (countdown <= 0) return

    const timer = window.setTimeout(() => {
      setCountdown((prev) => Math.max(prev - 1, 0))
    }, 1000)

    return () => window.clearTimeout(timer)
  }, [countdown])

  useEffect(() => {
    let cancelled = false

    async function restoreExistingSession() {
      try {
        const supabase = createSupabaseBrowserClient()
        const {
          data: { session },
        } = await supabase.auth.getSession()

        if (cancelled) {
          return
        }

        if (!session?.access_token) {
          await clearBrowserAuthSession()
          return
        }

        const data = await requestData<AuthLoginResponseData>("/auth/login", {
          method: "POST",
          headers: withAuthorization(session.access_token),
          body: JSON.stringify({
            loginType: "phone",
          }),
        })

        if (!cancelled) {
          router.replace(data.redirectTo)
        }
      } catch {
        if (!cancelled) {
          await clearBrowserAuthSession()
        }
      }
    }

    void restoreExistingSession()

    return () => {
      cancelled = true
    }
  }, [router])

  const sendCode = async () => {
    if (countdown > 0 || isSendingCode) return

    const normalizedPhone = normalizePhoneInput(phone)

    if (!isValidChinaMainlandPhone(normalizedPhone)) {
      setPhone(normalizedPhone)
      setErrorMessage("请输入真实的 11 位中国大陆手机号。")
      return
    }

    setErrorMessage(null)
    setIsSendingCode(true)

    try {
      const supabase = createSupabaseBrowserClient()
      const { error } = await supabase.auth.signInWithOtp({
        phone: normalizedPhone,
        options: {
          shouldCreateUser: true,
        },
      })

      if (error) {
        throw error
      }

      setLastSentPhone(phone)
      setCountdown(60)
    } catch (error) {
      setErrorMessage(toFriendlyAuthError(error, "send"))
    } finally {
      setIsSendingCode(false)
    }
  }

  const statusMessage = isSendingCode
    ? "验证码发送中，通常 1 秒内送达。"
    : countdown > 0
      ? `验证码已发送至 ${lastSentPhone || phone}，${countdown}s 后可重新获取。`
      : mode === "login"
        ? "输入手机号并获取验证码，继续回到当前学习进度。"
        : "完成手机号注册后，系统会继续引导你初始化学习路径。"

  const handlePhoneSubmit = () => {
    const normalizedPhone = normalizePhoneInput(phone)

    if (!isValidChinaMainlandPhone(normalizedPhone)) {
      setPhone(normalizedPhone)
      setErrorMessage("请输入真实的 11 位中国大陆手机号。")
      return
    }

    if (!/^\d{6}$/.test(code)) {
      setErrorMessage("请输入 6 位数字验证码。")
      return
    }

    setErrorMessage(null)

    startSubmitting(() => {
      void (async () => {
        try {
          const supabase = createSupabaseBrowserClient()
          const { data: otpData, error } = await supabase.auth.verifyOtp({
            phone: normalizedPhone,
            token: code,
            type: "sms",
          })

          if (error) {
            throw error
          }

          const data = await requestData<AuthLoginResponseData>("/auth/login", {
            method: "POST",
            headers: withAuthorization(otpData.session?.access_token),
            body: JSON.stringify({
              loginType: "phone",
            }),
          })

          trackEvent(APP_EVENTS.loginSubmit, {
            mode,
            loginType: "phone",
            onboardingCompleted: data.onboardingCompleted,
          })

          router.push(data.redirectTo)
        } catch (error) {
          setErrorMessage(toFriendlyAuthError(error, "verify"))
        }
      })()
    })
  }

  return (
    <div className="relative flex h-screen overflow-hidden bg-background">
      <div className="absolute right-4 top-4 z-20 sm:right-6 sm:top-6">
        <ThemeToggle />
      </div>
      <LoginBrandPanel mode={mode} />
      <LoginForm
        mode={mode}
        phone={phone}
        code={code}
        countdown={countdown}
        isSendingCode={isSendingCode}
        isSubmitting={isPending}
        statusMessage={statusMessage}
        errorMessage={errorMessage}
        oauthAvailability={oauthAvailability}
        activeOAuthProvider={oauthPendingProvider}
        onModeToggle={() => {
          setErrorMessage(null)
          setMode((prev) => (prev === "login" ? "register" : "login"))
        }}
        onPhoneChange={(value) => {
          setErrorMessage(null)
          setPhone(normalizePhoneInput(value))
        }}
        onCodeChange={setCode}
        onSendCode={sendCode}
        onSubmit={handlePhoneSubmit}
        onOAuthSubmit={handleOAuthSubmit}
      />
    </div>
  )
}
