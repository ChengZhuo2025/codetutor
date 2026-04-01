"use client"

import { useEffect, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { APP_EVENTS } from "@/constants/events"
import { ROUTES } from "@/constants/routes"
import { LoginBrandPanel } from "@/features/auth/components/login-brand-panel"
import { LoginForm } from "@/features/auth/components/login-form"
import type { AuthMode, AuthTab } from "@/features/auth/types"
import type { AuthLoginResponseData } from "@/lib/api/contracts/auth"
import { requestData } from "@/lib/api/client"
import { createSupabaseBrowserClient } from "@/lib/supabase/client"
import { useAppEventTracker } from "@/providers/app-providers"

function normalizePhoneInput(value: string) {
  const digitsOnly = value.replace(/\D/g, "")

  if (/^86\d{11}$/.test(digitsOnly)) {
    return digitsOnly.slice(2, 13)
  }

  return digitsOnly.slice(0, 11)
}

function isValidChinaMainlandPhone(phone: string) {
  return /^1[3-9]\d{9}$/.test(phone)
}

function toFriendlyAuthError(error: unknown, action: "send" | "verify" | "oauth") {
  const fallback =
    action === "send"
      ? "验证码发送失败，请稍后重试。"
      : action === "verify"
        ? "登录失败，请检查验证码后重试。"
        : "微信登录跳转失败，请稍后重试。"

  if (!(error instanceof Error)) {
    return fallback
  }

  const message = error.message.toLowerCase()

  if (message.includes("otp_expired") || message.includes("token has expired")) {
    return "验证码已失效或不正确，请重新获取后再试。"
  }

  if (message.includes("request_timeout")) {
    return "短信服务响应超时，请稍后再试。若多次失败，可先使用测试验证码或检查短信通道配置。"
  }

  if (message.includes("invalid phone") || message.includes("phone_number_invalid")) {
    return "手机号格式不正确，请输入真实的 11 位中国大陆手机号。"
  }

  if (
    message.includes("rate limit") ||
    message.includes("over_sms_send_rate_limit") ||
    message.includes("too many requests")
  ) {
    return "发送过于频繁，请稍后再试。"
  }

  if (message.includes("sms provider") || message.includes("sms")) {
    return "短信发送失败，请检查短信模板、签名和服务商配置。"
  }

  if (message.includes("network")) {
    return "网络连接异常，请稍后重试。"
  }

  return error.message || fallback
}

function withAuthorization(accessToken: string | null | undefined) {
  if (!accessToken) {
    return undefined
  }

  return {
    Authorization: `Bearer ${accessToken}`,
  }
}

const WECHAT_PROVIDER = "wechat" as never

export function LoginPage() {
  const router = useRouter()
  const { trackEvent } = useAppEventTracker()
  const [tab, setTab] = useState<AuthTab>("phone")
  const [mode, setMode] = useState<AuthMode>("login")
  const [phone, setPhone] = useState("")
  const [code, setCode] = useState("")
  const [countdown, setCountdown] = useState(0)
  const [lastSentPhone, setLastSentPhone] = useState("")
  const [isSendingCode, setIsSendingCode] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [wechatStatus, setWechatStatus] = useState<"empty" | "loading" | "success" | "error">(
    "empty",
  )
  const [wechatMessage, setWechatMessage] = useState(
    "点击进入微信扫码页，使用 Supabase 托管的微信 OAuth 完成登录或注册。",
  )
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
        ? "登录后将直接回到你上次未完成的学习任务。"
        : "注册后Ai生成一条适合当前水平的学习路径。"

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
            tab,
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

  const handleWechatSubmit = () => {
    setErrorMessage(null)
    setWechatStatus("loading")
    setWechatMessage("正在跳转到微信扫码授权页。")

    startSubmitting(() => {
      void (async () => {
        try {
          const supabase = createSupabaseBrowserClient()
          const { data, error } = await supabase.auth.signInWithOAuth({
            provider: WECHAT_PROVIDER,
            options: {
              redirectTo: `${window.location.origin}${ROUTES.authCallback}?provider=wechat`,
            },
          })

          if (error) {
            throw error
          }

          if (data.url) {
            window.location.assign(data.url)
          }
        } catch (error) {
          setWechatStatus("error")
          setWechatMessage(toFriendlyAuthError(error, "oauth"))
        }
      })()
    })
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <LoginBrandPanel mode={mode} />
      <LoginForm
        tab={tab}
        mode={mode}
        phone={phone}
        code={code}
        countdown={countdown}
        isSendingCode={isSendingCode}
        isSubmitting={isPending}
        statusMessage={statusMessage}
        errorMessage={errorMessage}
        wechatStatus={wechatStatus}
        wechatMessage={wechatMessage}
        onTabChange={setTab}
        onModeToggle={() => {
          setErrorMessage(null)
          setWechatStatus("empty")
          setWechatMessage("点击进入微信扫码页，使用 Supabase 托管的微信 OAuth 完成登录或注册。")
          setMode((prev) => (prev === "login" ? "register" : "login"))
        }}
        onPhoneChange={(value) => {
          setErrorMessage(null)
          setPhone(normalizePhoneInput(value))
        }}
        onCodeChange={setCode}
        onSendCode={sendCode}
        onSubmit={handlePhoneSubmit}
        onWechatSubmit={handleWechatSubmit}
      />
    </div>
  )
}
