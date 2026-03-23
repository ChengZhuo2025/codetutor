"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { ROUTES } from "@/constants/routes"
import { LoginBrandPanel } from "@/features/auth/components/login-brand-panel"
import { LoginForm } from "@/features/auth/components/login-form"
import type { AuthMode, AuthTab } from "@/features/auth/types"

export function LoginPage() {
  const router = useRouter()
  const [tab, setTab] = useState<AuthTab>("phone")
  const [mode, setMode] = useState<AuthMode>("login")
  const [phone, setPhone] = useState("")
  const [code, setCode] = useState("")
  const [countdown, setCountdown] = useState(0)

  const sendCode = () => {
    if (countdown > 0) return

    setCountdown(60)

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer)
          return 0
        }
        return prev - 1
      })
    }, 1000)
  }

  return (
    <div className="flex min-h-screen bg-background">
      <LoginBrandPanel />
      <LoginForm
        tab={tab}
        mode={mode}
        phone={phone}
        code={code}
        countdown={countdown}
        onTabChange={setTab}
        onModeToggle={() =>
          setMode((prev) => (prev === "login" ? "register" : "login"))
        }
        onPhoneChange={setPhone}
        onCodeChange={setCode}
        onSendCode={sendCode}
        onSubmit={() => router.push(ROUTES.onboarding)}
      />
    </div>
  )
}
