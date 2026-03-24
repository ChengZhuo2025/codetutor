"use client"

import { ArrowRight, Code2, MessageSquare, Phone } from "lucide-react"
import { APP_NAME } from "@/constants/app"
import { Button } from "@/components/ui/button"
import { StatePanel } from "@/components/ui/state-panel"
import type { AuthMode, AuthTab } from "@/features/auth/types"

type LoginFormProps = {
  tab: AuthTab
  mode: AuthMode
  phone: string
  code: string
  countdown: number
  isSendingCode: boolean
  isSubmitting: boolean
  statusMessage: string
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
  isSendingCode,
  isSubmitting,
  statusMessage,
  onTabChange,
  onModeToggle,
  onPhoneChange,
  onCodeChange,
  onSendCode,
  onSubmit,
}: LoginFormProps) {
  const canSubmit = tab === "wechat" || (phone.length === 11 && code.length === 6)
  const verificationState =
    isSendingCode ? "loading" : countdown > 0 ? "success" : "empty"
  const verificationTitle =
    isSendingCode
      ? "验证码发送中"
      : countdown > 0
        ? "验证码已发送"
        : mode === "login"
          ? "准备继续学习"
          : "完成注册前验证手机号"

  return (
    <div className="relative flex flex-1 flex-col items-center justify-center overflow-hidden px-6 py-12">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,oklch(0.78_0.15_180/0.08),transparent_28%)]" />

      <div className="mb-8 flex items-center gap-2 lg:hidden">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand text-brand-foreground">
          <Code2 className="h-4 w-4" />
        </div>
        <span className="font-semibold">{APP_NAME}</span>
      </div>

      <div className="relative z-10 w-full max-w-sm">
        <div className="mb-5 rounded-3xl border border-brand/20 bg-brand-dim/60 p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-brand/80">
                上次学习进度
              </p>
              <h2 className="mt-2 text-sm font-semibold text-foreground">
                Cursor 入门 · 第 1 关
              </h2>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">
                还差一步：打开项目并发起第一次 AI 对话。
              </p>
            </div>
            <span className="rounded-full border border-brand/30 bg-background/60 px-2.5 py-1 text-[11px] font-semibold text-brand">
              继续中
            </span>
          </div>
        </div>

        <div className="mb-6 flex rounded-full border border-border/60 bg-surface-2 p-1">
          {(["login", "register"] as AuthMode[]).map((item) => (
            <button
              key={item}
              onClick={() => item !== mode && onModeToggle()}
              className={`flex-1 rounded-full px-3 py-2 text-sm font-medium transition-all ${
                mode === item
                  ? "bg-background text-foreground shadow-[0_10px_24px_-18px_oklch(0.96_0.01_240/0.85)]"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {item === "login" ? "登录" : "注册"}
            </button>
          ))}
        </div>

        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight">
            {mode === "login" ? "欢迎回来" : "创建账号"}
          </h1>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            {mode === "login"
              ? "登录后继续你上次的学习节奏，不用重新选择工具和路径。"
              : "注册后会先确认工具与水平，再生成你的第一条学习路径。"}
          </p>
        </div>

        <div className="mb-5 flex rounded-2xl border border-border/60 bg-surface-2 p-1">
          {(["phone", "wechat"] as AuthTab[]).map((item) => (
            <button
              key={item}
              onClick={() => onTabChange(item)}
              className={`flex flex-1 items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-medium transition-all ${
                tab === item
                  ? "bg-background text-foreground shadow-[0_10px_24px_-18px_oklch(0.96_0.01_240/0.85)]"
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
              <div className="flex items-center gap-2 rounded-2xl border border-border/60 bg-surface-2 px-4 py-3.5 transition-all focus-within:border-brand/60 focus-within:bg-surface-1 focus-within:shadow-[0_0_0_4px_oklch(0.78_0.15_180/0.08)]">
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
                <div className="flex flex-1 items-center gap-2 rounded-2xl border border-border/60 bg-surface-2 px-4 py-3.5 transition-all focus-within:border-brand/60 focus-within:bg-surface-1 focus-within:shadow-[0_0_0_4px_oklch(0.78_0.15_180/0.08)]">
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
                  disabled={countdown > 0 || phone.length < 11 || isSendingCode}
                  className="shrink-0 rounded-2xl border border-brand/40 bg-brand-dim px-4 text-sm font-medium text-brand transition-all hover:-translate-y-0.5 hover:bg-brand/20 disabled:translate-y-0 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isSendingCode
                    ? "发送中..."
                    : countdown > 0
                      ? `${countdown}s`
                      : "发送验证码"}
                </button>
              </div>
              <StatePanel
                status={verificationState}
                title={verificationTitle}
                description={statusMessage}
                compact
                className="mt-3"
              />
            </div>

            <Button
              type="submit"
              disabled={!canSubmit || isSubmitting}
              className="mt-2 h-14 w-full rounded-2xl bg-brand text-base font-semibold text-brand-foreground shadow-[0_20px_60px_-24px_oklch(0.78_0.15_180/0.8)] hover:-translate-y-0.5 hover:bg-brand/90 disabled:translate-y-0"
            >
              {isSubmitting
                ? "进入学习流程中..."
                : mode === "login"
                  ? "继续学习"
                  : "注册并开始学习"}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </form>
        ) : (
          <div className="rounded-[28px] border border-border/60 bg-surface-2 p-6">
            <div className="flex flex-col items-center gap-4 py-4">
              <div className="rounded-full border border-brand/20 bg-brand-dim px-3 py-1 text-xs font-medium text-brand">
                扫码后自动回到学习流程
              </div>
              <div className="flex h-32 w-32 items-center justify-center rounded-2xl border-2 border-dashed border-border/60 bg-background">
                <div className="text-center">
                  <MessageSquare className="mx-auto mb-2 h-8 w-8 text-muted-foreground/40" />
                  <p className="text-xs text-muted-foreground">扫码登录</p>
                </div>
              </div>
              <p className="text-center text-sm text-muted-foreground">
                使用微信扫一扫完成登录，随后继续当前学习进度。
              </p>
            </div>
            <StatePanel
              status={verificationState}
              title={tab === "wechat" ? "扫码后自动续上进度" : verificationTitle}
              description={statusMessage}
              compact
            />
          </div>
        )}

        <div className="mt-6 rounded-2xl border border-border/60 bg-surface-2 px-4 py-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
                登录后你会看到
              </p>
              <p className="mt-1 text-sm text-foreground">
                当前关卡、AI 教练提示、下一步待办与连续学习记录。
              </p>
            </div>
            <div className="rounded-full bg-background px-2.5 py-1 text-[11px] font-semibold text-brand">
              即刻继续
            </div>
          </div>
        </div>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          {mode === "login" ? "还没有账号？" : "已有账号？"}
          <button
            onClick={onModeToggle}
            className="ml-1 font-medium text-brand transition-colors hover:text-brand/80"
          >
            {mode === "login" ? "免费注册" : "去登录"}
          </button>
        </p>

        <p className="mt-4 text-center text-xs leading-5 text-muted-foreground/60">
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
