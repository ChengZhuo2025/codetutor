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
import type { AuthMode, AuthOAuthProvider } from "@/features/auth/types"
import type {
  AuthLoginResponseData,
  AuthPhoneStatusResponseData,
} from "@/lib/api/contracts/auth"
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
const SUBSCRIBE_INTENT_PARAM = "intent=subscribe"

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
  await supabase.auth.signOut({ scope: "local" }).catch(() => undefined)
  await fetch("/api/auth/logout", { method: "POST" }).catch(() => undefined)
}

export function LoginPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const toast = useAppToast()
  const { trackEvent } = useAppEventTracker()
  const [mode, setMode] = useState<AuthMode>("login")
  const [phone, setPhone] = useState("")
  const [code, setCode] = useState("")
  const [countdown, setCountdown] = useState(0)
  const [lastSentPhone, setLastSentPhone] = useState("")
  const [isSendingCode, setIsSendingCode] = useState(false)
  const [phoneRegistrationCache, setPhoneRegistrationCache] = useState<Record<string, boolean>>({})
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [oauthPendingProvider, setOauthPendingProvider] = useState<AuthOAuthProvider | null>(null)
  const [oauthDialog, setOauthDialog] = useState<OAuthDialogState>(null)
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

  const checkPhoneRegistered = useCallback(async (normalizedPhone: string) => {
    const cached = phoneRegistrationCache[normalizedPhone]

    if (typeof cached === "boolean") {
      return cached
    }

    const data = await requestData<AuthPhoneStatusResponseData>(
      `/auth/phone-status?phone=${encodeURIComponent(normalizedPhone)}`,
      {
        method: "GET",
      },
    )

    setPhoneRegistrationCache((prev) => ({
      ...prev,
      [normalizedPhone]: data.registered,
    }))

    return data.registered
  }, [phoneRegistrationCache])

  const switchToRegisterForUnregisteredPhone = useCallback(() => {
    setCode("")
    setCountdown(0)
    setLastSentPhone("")
    setMode("register")
    setErrorMessage("当前手机号未注册，请先注册")
  }, [])

  const startOAuthLink = useCallback(async (provider: AuthOAuthProvider, redirectTo?: string) => {
    const supabase = createSupabaseBrowserClient()
    const callbackParams = new URLSearchParams({ provider, flow: "link" })
    const callbackUrl = `${window.location.origin}${ROUTES.authCallback}?${callbackParams.toString()}`
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

    if (redirectTo) {
      setPendingBindRedirectTo(redirectTo)
    }

    setOauthPendingProvider(provider)
    setOauthDialog({
      provider,
      url: data.url,
    })
  }, [])

  useEffect(() => {
    function handleOAuthMessage(event: MessageEvent<OAuthMessage>) {
      if (event.origin !== window.location.origin) {
        return
      }

      if (!event.data?.type) {
        return
      }

      if (event.data.type === "codetutor.oauth.binding_required") {
        const provider = event.data.provider ?? oauthDialog?.provider
        setOauthDialog(null)
        setOauthPendingProvider(null)

        if (provider) {
          setPendingBindProvider(provider)
          setMode("login")
          setCode("")
          setErrorMessage("该扫码账号还未绑定手机号。请先完成手机号验证，随后再次扫码完成绑定。")
        }
        return
      }

      if (event.data.type === "codetutor.oauth.linked") {
        setOauthDialog(null)
        setOauthPendingProvider(null)
        const redirectTo = pendingBindRedirectTo ?? ROUTES.learn
        setPendingBindProvider(null)
        setPendingBindRedirectTo(null)
        router.replace(getLoginRedirectTo(redirectTo))
        return
      }

      if (event.data.type !== "codetutor.oauth.completed" || !event.data.redirectTo) {
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

      router.replace(getLoginRedirectTo(event.data.redirectTo))
    }

    window.addEventListener("message", handleOAuthMessage)
    return () => window.removeEventListener("message", handleOAuthMessage)
  }, [
    getLoginRedirectTo,
    legalAcceptedAt,
    mode,
    oauthDialog?.provider,
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

    try {
      const supabase = createSupabaseBrowserClient()
      const callbackParams = new URLSearchParams({ provider })
      callbackParams.set("flow", "login")
      if (searchParams.get("intent") === "subscribe") {
        callbackParams.set("intent", "subscribe")
      }
      const redirectTo = `${window.location.origin}${ROUTES.authCallback}?${callbackParams.toString()}`
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

      setOauthDialog({
        provider,
        url: data.url,
      })
    } catch (error) {
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
    if (mode !== "login" || pendingBindProvider) {
      return
    }

    const normalizedPhone = normalizePhoneInput(phone)

    if (normalizedPhone !== phone) {
      return
    }

    if (!isValidChinaMainlandPhone(normalizedPhone)) {
      return
    }

    if (phoneRegistrationCache[normalizedPhone] === true) {
      return
    }

    if (phoneRegistrationCache[normalizedPhone] === false) {
      switchToRegisterForUnregisteredPhone()
      return
    }

    let cancelled = false
    const timer = window.setTimeout(() => {
      void (async () => {
        try {
          const registered = await checkPhoneRegistered(normalizedPhone)

          if (cancelled) {
            return
          }

          if (!registered) {
            switchToRegisterForUnregisteredPhone()
          }
        } catch {
          if (!cancelled) {
            setPhoneRegistrationCache((prev) => {
              const next = { ...prev }
              delete next[normalizedPhone]
              return next
            })
          }
        }
      })()
    }, 250)

    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
  }, [
    checkPhoneRegistered,
    mode,
    pendingBindProvider,
    phone,
    phoneRegistrationCache,
    switchToRegisterForUnregisteredPhone,
  ])

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

    if (mode === "login" && !pendingBindProvider) {
      try {
        const registered = await checkPhoneRegistered(normalizedPhone)

        if (!registered) {
          switchToRegisterForUnregisteredPhone()
          return
        }
      } catch {
        setErrorMessage("手机号注册状态检查失败，请稍后重试。")
        return
      }
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

          const redirectTo = getLoginRedirectTo(data.redirectTo)

          if (pendingBindProvider) {
            await startOAuthLink(pendingBindProvider, redirectTo)
            return
          }

          router.push(redirectTo)
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
        activeOAuthProvider={oauthPendingProvider}
        oauthDialog={oauthDialog}
        agreedToLegal={agreedToLegal}
        onModeToggle={() => {
          setErrorMessage(null)
          setOauthDialog(null)
          setOauthPendingProvider(null)
          setPendingBindProvider(null)
          setPendingBindRedirectTo(null)
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
