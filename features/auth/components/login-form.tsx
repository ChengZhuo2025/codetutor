"use client"

import { ArrowRight, Code2, MessageSquare, Phone } from "lucide-react"
import { APP_NAME } from "@/constants/app"
import { Button } from "@/components/ui/button"
import type { AuthMode, AuthTab } from "@/features/auth/types"

type LoginFormProps = {
  tab: AuthTab
  mode: AuthMode
  phone: string
  code: string
  countdown: number
  onTabChange: (tab: AuthTab) => void
  onModeToggle: () => void
  onPhoneChange: (value: string) => void
  onCodeChange: (value: string) => void
  onSendCode: () => void
  onSubmit: () => void
}

export function LoginForm({
  tab,
  mode,
  phone,
  code,
  countdown,
  onTabChange,
  onModeToggle,
  onPhoneChange,
  onCodeChange,
  onSendCode,
  onSubmit,
}: LoginFormProps) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6 py-12">
      <div className="mb-8 flex items-center gap-2 lg:hidden">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand text-brand-foreground">
          <Code2 className="h-4 w-4" />
        </div>
        <span className="font-semibold">{APP_NAME}</span>
      </div>

      <div className="w-full max-w-sm">
        <div className="mb-8">
          <h1 className="text-2xl font-bold tracking-tight">
            {mode === "login" ? "欢迎回来" : "创建账号"}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {mode === "login" ? "继续你上次的学习进度" : "开始你的 AI 编程学习之旅"}
          </p>
        </div>

        <div className="mb-6 flex rounded-xl border border-border/60 bg-surface-2 p-1">
          {(["phone", "wechat"] as AuthTab[]).map((item) => (
            <button
              key={item}
              onClick={() => onTabChange(item)}
              className={`flex flex-1 items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-medium transition-all ${
                tab === item
                  ? "bg-surface-4 text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {item === "phone" ? (
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
            onSubmit={(event) => {
              event.preventDefault()
              onSubmit()
            }}
          >
            <div>
              <label className="mb-1.5 block text-sm font-medium text-muted-foreground">
                手机号
              </label>
              <div className="flex items-center gap-2 rounded-xl border border-border/60 bg-surface-2 px-4 py-3 transition-colors focus-within:border-brand/60">
                <span className="text-sm text-muted-foreground">+86</span>
                <div className="h-4 w-px bg-border/60" />
                <input
                  type="tel"
                  placeholder="请输入手机号"
                  className="flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground/50"
                  value={phone}
                  onChange={(event) => onPhoneChange(event.target.value)}
                  maxLength={11}
                />
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-muted-foreground">
                验证码
              </label>
              <div className="flex gap-3">
                <div className="flex flex-1 items-center gap-2 rounded-xl border border-border/60 bg-surface-2 px-4 py-3 transition-colors focus-within:border-brand/60">
                  <input
                    type="text"
                    placeholder="请输入验证码"
                    className="flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground/50"
                    value={code}
                    onChange={(event) => onCodeChange(event.target.value)}
                    maxLength={6}
                  />
                </div>
                <button
                  type="button"
                  onClick={onSendCode}
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
            <p className="text-sm text-muted-foreground">使用微信扫一扫完成登录</p>
          </div>
        )}

        <p className="mt-6 text-center text-sm text-muted-foreground">
          {mode === "login" ? "还没有账号？" : "已有账号？"}
          <button
            onClick={onModeToggle}
            className="ml-1 font-medium text-brand transition-colors hover:text-brand/80"
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
  )
}
