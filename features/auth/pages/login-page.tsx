"use client"

import { useCallback, useEffect, useState, useTransition } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { APP_EVENTS } from "@/constants/events"
import { ROUTES } from "@/constants/routes"
import { useAppToast } from "@/components/app-feedback/app-toast-provider"
import { LoginBrandPanel } from "@/features/auth/components/login-brand-panel"
import { LoginForm } from "@/features/auth/components/login-form"
import {
  isValidChinaMainlandPhone,
  normalizePhoneInput,
  toFriendlyAuthError,
} from "@/features/auth/lib/phone-auth"
import type { AuthStep, AuthOAuthProvider } from "@/features/auth/types"
import type { AuthLoginResponseData } from "@/lib/api/contracts/auth"
import { requestData } from "@/lib/api/client"
import { buildOAuthRedirectTo } from "@/lib/auth/oauth-redirect"
import {
  clearSupabaseBrowserSession,
  createSupabaseBrowserClient,
  getSafeSupabaseBrowserSession,
} from "@/lib/supabase/client"
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
const SUBSCRIBE_INTENT_PARAM = "intent=subscribe"

type LegalAcceptanceRecord = {
  acceptedAt: string
  userAgent: string
}

type OAuthCompletedMessage = {
  type: "codetutor.oauth.completed"
  provider?: AuthOAuthProvider
  redirectTo?: string
  onboardingCompleted?: boolean
}

type OAuthBindingRequiredMessage = {
  type: "codetutor.oauth.binding_required"
  provider?: AuthOAuthProvider
}

type OAuthLinkedMessage = {
  type: "codetutor.oauth.linked"
  provider?: AuthOAuthProvider
}

type OAuthMessage =
  | OAuthCompletedMessage
  | OAuthBindingRequiredMessage
  | OAuthLinkedMessage

async function clearBrowserAuthSession() {
  const supabase = createSupabaseBrowserClient()
  await clearSupabaseBrowserSession(supabase)
}

function openOAuthPopup(url?: string) {
  const popup = window.open(
    url ?? "about:blank",
    "oauth_popup",
    "width=820,height=720,scrollbars=yes,resizable=yes",
  )

  if (popup && !popup.closed) {
    popup.focus()
  }

  return popup
}

export function LoginPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const toast = useAppToast()
  const { trackEvent } = useAppEventTracker()
  const [step, setStep] = useState<AuthStep>("idle")
  const [phone, setPhone] = useState("")
  const [code, setCode] = useState("")
  const [countdown, setCountdown] = useState(0)
  const [lastSentPhone, setLastSentPhone] = useState("")
  const [isSendingCode, setIsSendingCode] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [oauthPendingProvider, setOauthPendingProvider] = useState<AuthOAuthProvider | null>(null)
  const [pendingBindProvider, setPendingBindProvider] = useState<AuthOAuthProvider | null>(null)
  const [pendingBindRedirectTo, setPendingBindRedirectTo] = useState<string | null>(null)
  const [agreedToLegal, setAgreedToLegal] = useState(false)
  const [legalAcceptedAt, setLegalAcceptedAt] = useState<string | null>(null)

  const getLoginRedirectTo = useCallback((defaultRedirectTo: string) => {
    if (searchParams.get("intent") === "subscribe") {
      return `${ROUTES.home}?${SUBSCRIBE_INTENT_PARAM}`
    }

    return defaultRedirectTo
  }, [searchParams])

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

  const startOAuthLink = useCallback(async (provider: AuthOAuthProvider, redirectTo?: string) => {
    const popup = openOAuthPopup()
    const supabase = createSupabaseBrowserClient()
    const callbackUrl = buildOAuthRedirectTo({
      provider,
      flow: "link",
      redirectTo,
    })
    const oauthProvider = provider === "wechat" ? WECHAT_PROVIDER : DOUYIN_PROVIDER
    const { data, error } = await supabase.auth.linkIdentity({
      provider: oauthProvider,
      options: {
        redirectTo: callbackUrl,
        skipBrowserRedirect: true,
      },
    })

    if (error) {
      throw error
    }

    if (!data.url) {
      throw new Error(`${provider} link url missing`)
    }

    if (popup && !popup.closed) {
      popup.location.href = data.url
    } else {
      openOAuthPopup(data.url)
    }

    if (redirectTo) {
      setPendingBindRedirectTo(redirectTo)
    }

    setOauthPendingProvider(null)
  }, [])

  useEffect(() => {
    async function handleOAuthMessage(event: MessageEvent<OAuthMessage>) {
      if (event.origin !== window.location.origin) {
        return
      }

      if (!event.data?.type) {
        return
      }

      if (event.data.type === "codetutor.oauth.binding_required") {
        const provider = event.data.provider
        setOauthPendingProvider(null)

        if (provider) {
          await clearBrowserAuthSession()
          setPendingBindProvider(provider)
          setStep("oauth-binding")
          setCode("")
          setErrorMessage("该扫码账号还未绑定手机号，请完成手机号验证后继续。")
        }
        return
      }

      if (event.data.type === "codetutor.oauth.linked") {
        setOauthPendingProvider(null)
        const redirectTo = pendingBindRedirectTo ?? ROUTES.learn
        setPendingBindProvider(null)
        setPendingBindRedirectTo(null)
        setStep("idle")
        router.replace(getLoginRedirectTo(redirectTo))
        return
      }

      if (event.data.type !== "codetutor.oauth.completed" || !event.data.redirectTo) {
        return
      }

      setOauthPendingProvider(null)

      trackEvent(APP_EVENTS.loginSubmit, {
        step,
        loginType: event.data.provider ?? "douyin",
        onboardingCompleted: Boolean(event.data.onboardingCompleted),
        legalAcceptedAt,
      })

      router.replace(getLoginRedirectTo(event.data.redirectTo))
    }

    window.addEventListener("message", handleOAuthMessage)
    return () => window.removeEventListener("message", handleOAuthMessage)
  }, [
    getLoginRedirectTo,
    legalAcceptedAt,
    step,
    pendingBindRedirectTo,
    router,
    trackEvent,
  ])

  const handleOAuthSubmit = async (provider: AuthOAuthProvider) => {
    if (!agreedToLegal) {
      setErrorMessage("请先阅读并勾选同意《用户协议》和《隐私政策》。")
      return
    }

    setErrorMessage(null)
    setOauthPendingProvider(provider)
    const popup = openOAuthPopup()

    try {
      const supabase = createSupabaseBrowserClient()
      const redirectTo = buildOAuthRedirectTo({
        provider,
        flow: "login",
        intent: searchParams.get("intent"),
      })
      const oauthProvider = provider === "wechat" ? WECHAT_PROVIDER : DOUYIN_PROVIDER
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: oauthProvider,
        options: {
          redirectTo,
          skipBrowserRedirect: true,
        },
      })

      if (error) {
        throw error
      }

      if (!data.url) {
        throw new Error(`${provider} oauth url missing`)
      }

      if (popup && !popup.closed) {
        popup.location.href = data.url
      } else {
        openOAuthPopup(data.url)
      }

      setOauthPendingProvider(null)
    } catch (error) {
      if (popup && !popup.closed) {
        popup.close()
      }
      setOauthPendingProvider(null)
      toast.error("扫码登录失败", toFriendlyAuthError(error, "oauth"))
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
        const session = await getSafeSupabaseBrowserSession(supabase)

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
          router.replace(getLoginRedirectTo(data.redirectTo))
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
  }, [getLoginRedirectTo, router])

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
      if (pendingBindProvider) {
        await clearBrowserAuthSession()
      }
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
      ? `验证码请求已提交至 ${lastSentPhone || phone}，${countdown}s 后可重新获取。`
      : "输入手机号，获取验证码登录或注册。"

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
        let appLoginFinalized = false

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
          appLoginFinalized = true

          trackEvent(APP_EVENTS.loginSubmit, {
            step,
            loginType: "phone",
            onboardingCompleted: data.onboardingCompleted,
            legalAcceptedAt,
          })

          const redirectTo = getLoginRedirectTo(data.redirectTo)

          if (pendingBindProvider) {
            await startOAuthLink(pendingBindProvider, redirectTo)
            return
          }

          router.push(redirectTo)
        } catch (error) {
          if (!appLoginFinalized) {
            await clearBrowserAuthSession()
          }
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
      <LoginBrandPanel />
      <LoginForm
        step={step}
        phone={phone}
        code={code}
        countdown={countdown}
        isSendingCode={isSendingCode}
        isSubmitting={isPending}
        statusMessage={statusMessage}
        errorMessage={errorMessage}
        activeOAuthProvider={oauthPendingProvider}
        agreedToLegal={agreedToLegal}
        onCancelOAuthBinding={() => {
          setStep("idle")
          setPendingBindProvider(null)
          const bindRedirectTo = pendingBindRedirectTo ?? null
          setPendingBindRedirectTo(null)
          setCode("")
          setErrorMessage(null)
          if (bindRedirectTo) {
            router.replace(bindRedirectTo)
          }
        }}
        onPhoneChange={(value) => {
          setErrorMessage(null)
          setPhone(normalizePhoneInput(value))
        }}
        onCodeChange={setCode}
        onSendCode={sendCode}
        onSubmit={handlePhoneSubmit}
        onOAuthSubmit={handleOAuthSubmit}
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
