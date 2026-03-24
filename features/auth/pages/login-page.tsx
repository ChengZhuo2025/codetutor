"use client"

import { useEffect, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { APP_EVENTS } from "@/constants/events"
import { ROUTES } from "@/constants/routes"
import { LoginBrandPanel } from "@/features/auth/components/login-brand-panel"
import { LoginForm } from "@/features/auth/components/login-form"
import type { AuthMode, AuthTab } from "@/features/auth/types"
import { useAppEventTracker } from "@/providers/app-providers"

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
  const [isSubmitting, startSubmitting] = useTransition()

  useEffect(() => {
    if (countdown <= 0) return

    const timer = window.setTimeout(() => {
      setCountdown((prev) => Math.max(prev - 1, 0))
    }, 1000)

    return () => window.clearTimeout(timer)
  }, [countdown])

  const sendCode = () => {
    if (countdown > 0 || phone.length < 11 || isSendingCode) return

    setIsSendingCode(true)

    window.setTimeout(() => {
      setLastSentPhone(phone)
      setCountdown(60)
      setIsSendingCode(false)
    }, 900)
  }

  const statusMessage = isSendingCode
    ? "验证码发送中，通常 1 秒内送达。"
    : countdown > 0
      ? `验证码已发送至 ${lastSentPhone || phone}，${countdown}s 后可重新获取。`
      : mode === "login"
        ? "登录后将直接回到你上次未完成的学习任务。"
        : "注册后会先帮你生成一条适合当前水平的学习路径。"

  return (
    <div className="flex min-h-screen bg-background">
      <LoginBrandPanel />
      <LoginForm
        tab={tab}
        mode={mode}
        phone={phone}
        code={code}
        countdown={countdown}
        isSendingCode={isSendingCode}
        isSubmitting={isSubmitting}
        statusMessage={statusMessage}
        onTabChange={setTab}
        onModeToggle={() =>
          setMode((prev) => (prev === "login" ? "register" : "login"))
        }
        onPhoneChange={setPhone}
        onCodeChange={setCode}
        onSendCode={sendCode}
        onSubmit={() => {
          trackEvent(APP_EVENTS.loginSubmit, {
            tab,
            mode,
          })
          startSubmitting(() => {
            router.push(ROUTES.onboarding)
          })
        }}
      />
    </div>
  )
}
