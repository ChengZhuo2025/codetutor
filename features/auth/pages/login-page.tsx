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
const LEGAL_ACCEPTANCE_STORAGE_KEY = "codetutor-legal-acceptance-v1"

type LegalAcceptanceRecord = {
  acceptedAt: string
  userAgent: string
}

type OAuthDialogState = {
  provider: AuthOAuthProvider
  url: string
} | null

type OAuthCompletedMessage = {
  type: "codetutor.oauth.completed"
  provider?: AuthOAuthProvider
  redirectTo?: string
  onboardingCompleted?: boolean
}

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
  const [oauthDialog, setOauthDialog] = useState<OAuthDialogState>(null)
  const [agreedToLegal, setAgreedToLegal] = useState(false)
  const [legalAcceptedAt, setLegalAcceptedAt] = useState<string | null>(null)

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(LEGAL_ACCEPTANCE_STORAGE_KEY)
      if (!raw) return

      const parsed = JSON.parse(raw) as LegalAcceptanceRecord
      if (parsed.acceptedAt) {
        setAgreedToLegal(true)
        setLegalAcceptedAt(parsed.acceptedAt)
      }
    } catch {
      // ignore broken local cache
    }
  }, [])

  const persistLegalAcceptance = (acceptedAt: string) => {
    try {
      const payload: LegalAcceptanceRecord = {
        acceptedAt,
        userAgent: navigator.userAgent,
      }
      window.localStorage.setItem(LEGAL_ACCEPTANCE_STORAGE_KEY, JSON.stringify(payload))
    } catch {
      // ignore localStorage write failure
    }
  }

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

  useEffect(() => {
    function handleOAuthMessage(event: MessageEvent<OAuthCompletedMessage>) {
      if (event.origin !== window.location.origin) {
        return
      }

      if (event.data?.type !== "codetutor.oauth.completed" || !event.data.redirectTo) {
        return
      }

      setOauthDialog(null)
      setOauthPendingProvider(null)

      trackEvent(APP_EVENTS.loginSubmit, {
        mode,
        loginType: event.data.provider ?? oauthDialog?.provider ?? "douyin",
        onboardingCompleted: Boolean(event.data.onboardingCompleted),
        legalAcceptedAt,
      })

      router.replace(event.data.redirectTo)
    }

    window.addEventListener("message", handleOAuthMessage)
    return () => window.removeEventListener("message", handleOAuthMessage)
  }, [legalAcceptedAt, mode, oauthDialog?.provider, router, trackEvent])

  const handleOAuthSubmit = async (provider: AuthOAuthProvider) => {
    if (!agreedToLegal) {
      setErrorMessage("请先阅读并勾选同意《用户协议》和《隐私政策》。")
      return
    }

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

    let openedOAuthDialog = false

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
        setOauthDialog({
          provider,
          url: data.url,
        })
        openedOAuthDialog = true
        return
      }

      throw new Error(`${provider} oauth url missing`)
    } catch (error) {
      toast.error("扫码登录失败", toFriendlyAuthError(error, "oauth"))
    } finally {
      if (!openedOAuthDialog) {
        setOauthPendingProvider(null)
      }
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

    if (!agreedToLegal) {
      setErrorMessage("请先阅读并勾选同意《用户协议》和《隐私政策》。")
      return
    }

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

    if (!agreedToLegal) {
      setErrorMessage("请先阅读并勾选同意《用户协议》和《隐私政策》。")
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
            legalAcceptedAt,
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
        oauthDialog={oauthDialog}
        agreedToLegal={agreedToLegal}
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
        onOAuthDialogOpenChange={(open) => {
          if (open) {
            return
          }

          setOauthDialog(null)
          setOauthPendingProvider(null)
        }}
        onAgreementChange={(checked) => {
          setAgreedToLegal(checked)
          setErrorMessage(null)

          if (checked) {
            const acceptedAt = new Date().toISOString()
            setLegalAcceptedAt(acceptedAt)
            persistLegalAcceptance(acceptedAt)
            return
          }

          setLegalAcceptedAt(null)
        }}
      />
    </div>
  )
}
