"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Code2, ArrowRight, MessageSquare, Phone } from "lucide-react"
import { Button } from "@/components/ui/button"

type Tab = "phone" | "wechat"

export function LoginPage() {
  const router = useRouter()
  const [tab, setTab] = useState<Tab>("phone")
  const [mode, setMode] = useState<"login" | "register">("login")
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
      {/* Left panel — branding */}
      <div className="relative hidden flex-1 flex-col justify-between overflow-hidden bg-surface-2 p-12 lg:flex">
        {/* Grid BG */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage: `
              linear-gradient(to right, oklch(0.26 0.008 240 / 0.3) 1px, transparent 1px),
              linear-gradient(to bottom, oklch(0.26 0.008 240 / 0.3) 1px, transparent 1px)
            `,
            backgroundSize: "48px 48px",
          }}
        />
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,transparent_40%,var(--surface-2)_80%)]" />

        {/* Logo */}
        <div className="relative z-10 flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand text-brand-foreground">
            <Code2 className="h-5 w-5" />
          </div>
          <span className="text-lg font-semibold">CodeTutor</span>
        </div>

        {/* Center — mock AI chat preview */}
        <div className="relative z-10 flex flex-col gap-3">
          {/* feature pills */}
          <div className="mb-2 flex flex-wrap gap-2">
            {["Cursor", "GitHub Copilot", "v0", "Bolt"].map((tool) => (
              <span
                key={tool}
                className="rounded-full border border-border/60 bg-surface-3 px-3 py-1 text-xs text-muted-foreground"
              >
                {tool}
              </span>
            ))}
          </div>
          {/* Chat bubble — user */}
          <div className="flex justify-end">
            <div className="max-w-[80%] rounded-2xl rounded-tr-sm bg-brand/15 px-4 py-2.5 text-sm text-foreground border border-brand/20">
              我想学 Cursor，但不知道从哪开始
            </div>
          </div>
          {/* Chat bubble — AI */}
          <div className="flex gap-2.5">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-brand text-brand-foreground text-xs font-bold">
              AI
            </div>
            <div className="max-w-[80%] rounded-2xl rounded-tl-sm bg-surface-3 px-4 py-2.5 text-sm text-foreground border border-border/50">
              好，我已经拆好了。第一步只需要安装 Cursor 并打开一个文件夹。
              <span className="mt-1 block text-xs text-brand">预计 5 分钟完成</span>
            </div>
          </div>
          {/* Step card */}
          <div className="rounded-xl border border-border/50 bg-surface-3/60 px-4 py-3">
            <div className="flex items-center gap-3">
              <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand text-xs font-bold text-brand-foreground">1</div>
              <div>
                <p className="text-xs font-medium text-foreground">安装 Cursor 编辑器</p>
                <p className="text-xs text-muted-foreground">从 cursor.com 下载并完成安装</p>
              </div>
              <div className="ml-auto h-2 w-2 rounded-full bg-brand animate-pulse" />
            </div>
          </div>
          <div className="rounded-xl border border-border/50 bg-surface-3/60 px-4 py-3 opacity-50">
            <div className="flex items-center gap-3">
              <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-surface-4 text-xs font-bold text-muted-foreground">2</div>
              <div>
                <p className="text-xs font-medium text-muted-foreground">打开你的第一个项目</p>
                <p className="text-xs text-muted-foreground">用 File › Open Folder 打开任意目录</p>
              </div>
            </div>
          </div>
        </div>

        {/* Quote */}
        <div className="relative z-10">
          <blockquote className="mb-8 text-3xl font-semibold leading-snug tracking-tight text-balance">
            “你负责找到
            <span className="text-brand">想学的内容</span>
            ，我负责陪你真正学会。”
          </blockquote>

          {/* Mock progress card */}
          <div className="overflow-hidden rounded-2xl border border-border/60 bg-surface-1 p-5">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">当前段位</p>
                <p className="text-sm font-semibold text-brand">Vibe Coder</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-muted-foreground">累计学分</p>
                <p className="text-sm font-semibold text-gold">680 XP</p>
              </div>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-surface-4">
              <div className="h-full w-[36%] rounded-full bg-brand transition-all" />
            </div>
            <p className="mt-2 text-xs text-muted-foreground">距离 AI 建造者还需 320 XP</p>
          </div>
        </div>
      </div>

      {/* Right panel — form */}
      <div className="flex flex-1 flex-col items-center justify-center px-6 py-12">
        {/* Mobile logo */}
        <div className="mb-8 flex items-center gap-2 lg:hidden">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand text-brand-foreground">
            <Code2 className="h-4 w-4" />
          </div>
          <span className="font-semibold">CodeTutor</span>
        </div>

        <div className="w-full max-w-sm">
          {/* Title */}
          <div className="mb-8">
            <h1 className="text-2xl font-bold tracking-tight">
              {mode === "login" ? "欢迎回来" : "创建账号"}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {mode === "login"
                ? "继续你上次的学习进度"
                : "开始你的 AI 编程学习之旅"}
            </p>
          </div>

          {/* Login method tabs */}
          <div className="mb-6 flex rounded-xl border border-border/60 bg-surface-2 p-1">
            {(["phone", "wechat"] as Tab[]).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`flex flex-1 items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-medium transition-all ${
                  tab === t
                    ? "bg-surface-4 text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {t === "phone" ? (
                  <>
                    <Phone className="h-3.5 w-3.5" />
                    手机号
                  </>
                ) : (
                  <>
                    <MessageSquare className="h-3.5 w-3.5" />
                    微信
                  </>
                )}
              </button>
            ))}
          </div>

          {tab === "phone" ? (
            <form
              className="space-y-4"
              onSubmit={(e) => {
                e.preventDefault()
                router.push("/onboarding")
              }}
            >
              {/* Phone input */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-muted-foreground">
                  手机号
                </label>
                <div className="flex items-center gap-2 rounded-xl border border-border/60 bg-surface-2 px-4 py-3 focus-within:border-brand/60 transition-colors">
                  <span className="text-sm text-muted-foreground">+86</span>
                  <div className="h-4 w-px bg-border/60" />
                  <input
                    type="tel"
                    placeholder="请输入手机号"
                    className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground/50 outline-none"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    maxLength={11}
                  />
                </div>
              </div>

              {/* Code input */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-muted-foreground">
                  验证码
                </label>
                <div className="flex gap-3">
                  <div className="flex flex-1 items-center gap-2 rounded-xl border border-border/60 bg-surface-2 px-4 py-3 focus-within:border-brand/60 transition-colors">
                    <input
                      type="text"
                      placeholder="请输入验证码"
                      className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground/50 outline-none"
                      value={code}
                      onChange={(e) => setCode(e.target.value)}
                      maxLength={6}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={sendCode}
                    disabled={countdown > 0 || phone.length < 11}
                    className="shrink-0 rounded-xl border border-brand/40 bg-brand-dim px-4 text-sm font-medium text-brand transition-colors hover:bg-brand/20 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {countdown > 0 ? `${countdown}s` : "发送验证码"}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                className="mt-2 h-12 w-full bg-brand text-base font-semibold text-brand-foreground hover:bg-brand/90"
              >
                {mode === "login" ? "登录" : "注册并开始"}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </form>
          ) : (
            <div className="flex flex-col items-center gap-4 py-8">
              <div className="flex h-32 w-32 items-center justify-center rounded-2xl border-2 border-dashed border-border/60 bg-surface-2">
                <div className="text-center">
                  <MessageSquare className="mx-auto mb-2 h-8 w-8 text-muted-foreground/40" />
                  <p className="text-xs text-muted-foreground">扫码登录</p>
                </div>
              </div>
              <p className="text-sm text-muted-foreground">
                使用微信扫一扫完成登录
              </p>
            </div>
          )}

          {/* Toggle mode */}
          <p className="mt-6 text-center text-sm text-muted-foreground">
            {mode === "login" ? "还没有账号？" : "已有账号？"}
            <button
              onClick={() => setMode(mode === "login" ? "register" : "login")}
              className="ml-1 font-medium text-brand hover:text-brand/80 transition-colors"
            >
              {mode === "login" ? "免费注册" : "去登录"}
            </button>
          </p>

          <p className="mt-4 text-center text-xs text-muted-foreground/60">
            登录即代表同意{" "}
            <span className="cursor-pointer underline underline-offset-2 hover:text-foreground">
              用户协议
            </span>{" "}
            与{" "}
            <span className="cursor-pointer underline underline-offset-2 hover:text-foreground">
              隐私政策
            </span>
          </p>
        </div>
      </div>
    </div>
  )
}
