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

function toCnPhoneE164(phone: string) {
  return `+86${phone}`
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

      if (!session?.access_token || cancelled) {
        return
      }

      try {
        const data = await requestData<AuthLoginResponseData>("/auth/login", {
          method: "POST",
          body: JSON.stringify({
            loginType: "phone",
          }),
        })

        if (!cancelled) {
          router.replace(data.redirectTo)
        }
      } catch {
        // let the user stay on login and retry manually
      }
    }

    void restoreExistingSession()

    return () => {
      cancelled = true
    }
  }, [router])

  const sendCode = async () => {
    if (countdown > 0 || phone.length < 11 || isSendingCode) return

    setErrorMessage(null)
    setIsSendingCode(true)

    try {
      const supabase = createSupabaseBrowserClient()
      const { error } = await supabase.auth.signInWithOtp({
        phone: toCnPhoneE164(phone),
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
      setErrorMessage(error instanceof Error ? error.message : "验证码发送失败")
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
    setErrorMessage(null)

    startSubmitting(() => {
      void (async () => {
        try {
          const supabase = createSupabaseBrowserClient()
          const { error } = await supabase.auth.verifyOtp({
            phone: toCnPhoneE164(phone),
            token: code,
            type: "sms",
          })

          if (error) {
            throw error
          }

          const data = await requestData<AuthLoginResponseData>("/auth/login", {
            method: "POST",
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
          setErrorMessage(error instanceof Error ? error.message : "手机号登录失败")
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
          setWechatMessage(error instanceof Error ? error.message : "微信登录跳转失败")
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
        onPhoneChange={setPhone}
        onCodeChange={setCode}
        onSendCode={sendCode}
        onSubmit={handlePhoneSubmit}
        onWechatSubmit={handleWechatSubmit}
      />
    </div>
  )
}
