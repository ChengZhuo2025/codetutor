"use client"

import { useEffect, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { APP_EVENTS } from "@/constants/events"
import { ROUTES } from "@/constants/routes"
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

export function LoginPage() {
  const router = useRouter()
  const { trackEvent } = useAppEventTracker()
  const [mode, setMode] = useState<AuthMode>("login")
  const [phone, setPhone] = useState("")
  const [code, setCode] = useState("")
  const [countdown, setCountdown] = useState(0)
  const [lastSentPhone, setLastSentPhone] = useState("")
  const [isSendingCode, setIsSendingCode] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [oauthAvailability, setOauthAvailability] = useState<OAuthProviderAvailability | null>(null)
  const [oauthState, setOauthState] = useState<{
    status: "empty" | "loading" | "error"
    provider: AuthOAuthProvider | null
    message: string
  }>({
    status: "empty",
    provider: null,
    message: "",
  })
  const [isOauthPending, startOauthTransition] = useTransition()

  const oauthActionLabel = mode === "login" ? "扫码登录" : "扫码注册"
  const oauthActionDescription = mode === "login"
    ? "手机号验证码和扫码入口共享同一登录页，不会因切换方式打断当前操作。"
    : "注册时可直接走扫码授权，后续统一进入学习路径初始化流程。"

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

  useEffect(() => {
    if (oauthState.status !== "error") {
      return
    }

    const timer = window.setTimeout(() => {
      setOauthState((current) => (
        current.status === "error"
          ? {
              status: "empty",
              provider: null,
              message: "",
            }
          : current
      ))
    }, 5000)

    return () => window.clearTimeout(timer)
  }, [oauthState])

  useEffect(() => {
    setOauthState({
      status: "empty",
      provider: null,
      message: "",
    })
  }, [mode])

  const oauthProvidersReady = oauthAvailability ?? {
    wechat: false,
    douyin: false,
  }

  const availableOAuthProviderCount = Object.values(oauthProvidersReady).filter(Boolean).length
  const oauthStatusMessage = oauthState.status === "empty"
    ? availableOAuthProviderCount > 0
      ? oauthActionDescription
      : "微信和抖音扫码入口会在对应 Provider 完成配置后自动开放。"
    : oauthState.message

  const oauthStatusTitle = oauthState.status === "loading"
    ? "正在打开扫码页"
    : oauthState.status === "error"
      ? "扫码登录暂不可用"
      : oauthActionLabel

  const oauthStatus = oauthState.status === "error"
    ? "error"
    : oauthState.status === "loading"
      ? "loading"
      : "empty"

  const handleOAuthSubmit = (provider: AuthOAuthProvider) => {
    if (!oauthProvidersReady[provider]) {
      setOauthState({
        status: "error",
        provider,
        message: "该扫码登录方式暂未开放，请先在 Supabase 控制台启用对应 Provider。",
      })
      return
    }

    const providerForSupabase = provider === "wechat" ? WECHAT_PROVIDER : DOUYIN_PROVIDER
    const providerLabel = provider === "wechat" ? "微信" : "抖音"

    setErrorMessage(null)
    setOauthState({
      status: "loading",
      provider,
      message: `正在跳转到${providerLabel}扫码授权页。`,
    })

    startOauthTransition(() => {
      void (async () => {
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
          setOauthState({
            status: "error",
            provider,
            message: toFriendlyAuthError(error, "oauth"),
          })
        }
      })()
    })
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
      const supabase = createSupabaseBrowserClient()
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (cancelled) {
        return
      }

      if (!session?.access_token) {
        await fetch("/api/auth/logout", { method: "POST" }).catch(() => undefined)
        return
      }

      try {
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
          await fetch("/api/auth/logout", { method: "POST" }).catch(() => undefined)
        }
        // let the user stay on login and retry manually
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
        oauthStatus={oauthStatus}
        oauthStatusTitle={oauthStatusTitle}
        oauthStatusMessage={oauthStatusMessage}
        activeOAuthProvider={isOauthPending ? oauthState.provider : null}
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
