"use client";

import { ArrowRight, MessageSquare, Phone, QrCode } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatePanel } from "@/components/ui/state-panel";
import type { AuthMode, AuthTab } from "@/features/auth/types";

type LoginFormProps = {
  tab: AuthTab;
  mode: AuthMode;
  phone: string;
  code: string;
  countdown: number;
  isSendingCode: boolean;
  isSubmitting: boolean;
  statusMessage: string;
  errorMessage: string | null;
  wechatStatus: "empty" | "loading" | "success" | "error";
  wechatMessage: string;
  onTabChange: (tab: AuthTab) => void;
  onModeToggle: () => void;
  onPhoneChange: (value: string) => void;
  onCodeChange: (value: string) => void;
  onSendCode: () => void;
  onSubmit: () => void;
  onWechatSubmit: () => void;
};

export function LoginForm({
  tab,
  mode,
  phone,
  code,
  countdown,
  isSendingCode,
  isSubmitting,
  statusMessage,
  errorMessage,
  wechatStatus,
  wechatMessage,
  onTabChange,
  onModeToggle,
  onPhoneChange,
  onCodeChange,
  onSendCode,
  onSubmit,
  onWechatSubmit,
}: LoginFormProps) {
  const isValidPhone = /^1[3-9]\d{9}$/.test(phone);
  const isValidCode = /^\d{6}$/.test(code);
  const canSubmit = isValidPhone && isValidCode;
  const verificationState = isSendingCode
    ? "loading"
    : countdown > 0
      ? "success"
      : "empty";
  const verificationTitle = isSendingCode
    ? "验证码发送中"
    : countdown > 0
      ? "验证码已发送"
      : mode === "login"
        ? "准备继续学习"
        : "验证手机号码";

  // 微信扫码的提示信息
  const wechatTitle = mode === "login" ? "扫码登录" : "扫码注册";
  const wechatDesc =
    mode === "login" ? "微信扫码后自动登录" : "微信扫码后快速创建账号";

  return (
    <div className="relative flex w-[40%] flex-col items-center justify-center overflow-hidden px-6 py-8">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,oklch(0.78_0.15_180/0.08),transparent_28%)]" />

      <div className="relative z-10 w-full max-w-sm">
        {/* 登录/注册切换 - 文字链接样式，与下方 tab 区分 */}
        <div className="mb-8 flex items-center justify-center gap-6">
          <button
            onClick={() => mode !== "login" && onModeToggle()}
            className={`text-base font-medium transition-colors ${
              mode === "login"
                ? "text-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            登录
          </button>
          <div className="h-4 w-px bg-border/60" />
          <button
            onClick={() => mode !== "register" && onModeToggle()}
            className={`text-base font-medium transition-colors ${
              mode === "register"
                ? "text-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            注册
          </button>
        </div>

        <div className="mb-6">
          <h1 className="text-2xl font-bold tracking-tight">
            {mode === "login" ? "欢迎回来" : "创建账号"}
          </h1>
          <p className="mt-1.5 text-sm leading-6 text-muted-foreground">
            {mode === "login"
              ? "登录后继续你上次的学习节奏。"
              : "注册后会先确认工具与水平，再生成你的学习路径。"}
          </p>
        </div>

        <div
          role="tablist"
          aria-label="认证方式"
          className="mb-4 flex rounded-2xl border border-border/60 bg-surface-2 p-1"
        >
          {(["phone", "wechat"] as AuthTab[]).map((item) => (
            <button
              key={item}
              role="tab"
              aria-selected={tab === item}
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
            className="space-y-3.5"
            onSubmit={(event) => {
              event.preventDefault();
              onSubmit();
            }}
          >
            <div>
              <label
                htmlFor="phone-input"
                className="mb-1.5 block text-sm font-medium text-muted-foreground"
              >
                手机号
              </label>
              <div className="flex items-center gap-2 rounded-2xl border border-border/60 bg-surface-2 px-4 py-3 transition-all focus-within:border-brand/60 focus-within:bg-surface-1 focus-within:shadow-[0_0_0_4px_oklch(0.78_0.15_180/0.08)]">
                <span className="text-sm text-muted-foreground">+86</span>
                <div className="h-4 w-px bg-border/60" />
                <input
                  id="phone-input"
                  type="tel"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  placeholder="请输入手机号"
                  className="flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground/50"
                  value={phone}
                  onChange={(event) => onPhoneChange(event.target.value)}
                  maxLength={11}
                  aria-describedby="phone-hint"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="code-input"
                className="mb-1.5 block text-sm font-medium text-muted-foreground"
              >
                验证码
              </label>
              <div className="flex gap-3">
                <div className="flex flex-1 items-center gap-2 rounded-2xl border border-border/60 bg-surface-2 px-4 py-3 transition-all focus-within:border-brand/60 focus-within:bg-surface-1 focus-within:shadow-[0_0_0_4px_oklch(0.78_0.15_180/0.08)]">
                  <input
                    id="code-input"
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    placeholder="请输入验证码"
                    className="flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground/50"
                    value={code}
                    onChange={(event) => onCodeChange(event.target.value)}
                    maxLength={6}
                    aria-describedby="code-hint"
                  />
                </div>
                <button
                  type="button"
                  onClick={onSendCode}
                  disabled={countdown > 0 || !isValidPhone || isSendingCode}
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
                className="mt-2"
              />
            </div>

            <Button
              type="submit"
              disabled={!canSubmit || isSubmitting}
              className="mt-1 h-12 w-full rounded-2xl bg-brand text-base font-semibold text-brand-foreground shadow-[0_20px_60px_-24px_oklch(0.78_0.15_180/0.8)] hover:-translate-y-0.5 hover:bg-brand/90 disabled:translate-y-0"
            >
              {isSubmitting
                ? "进入学习流程中..."
                : mode === "login"
                  ? "继续学习"
                  : "注册并开始学习"}
              <ArrowRight className="h-4 w-4" />
            </Button>

            {errorMessage ? (
              <StatePanel
                status="error"
                title={mode === "login" ? "登录失败" : "注册失败"}
                description={errorMessage}
                compact
              />
            ) : null}
          </form>
        ) : (
          <div className="rounded-[28px] border border-border/60 bg-surface-2 p-5">
            <div className="flex flex-col items-center gap-4 py-2">
              <div className="flex h-34 w-34 items-center justify-center overflow-hidden rounded-2xl border border-border/60 bg-background">
                <div className="flex flex-col items-center gap-2 text-center">
                  <QrCode className="h-10 w-10 text-brand" />
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-foreground">
                      进入微信扫码页
                    </p>
                    <p className="text-xs leading-5 text-muted-foreground">
                      跳转到 Supabase 托管授权页完成扫码
                    </p>
                  </div>
                </div>
              </div>
              <p className="text-center text-sm text-muted-foreground">
                {wechatDesc}
              </p>
              <Button
                type="button"
                onClick={onWechatSubmit}
                disabled={isSubmitting || wechatStatus === "loading"}
                className="h-11 w-full rounded-2xl bg-brand text-base font-semibold text-brand-foreground shadow-[0_20px_60px_-24px_oklch(0.78_0.15_180/0.8)] hover:-translate-y-0.5 hover:bg-brand/90 disabled:translate-y-0"
              >
                {wechatStatus === "loading" ? "正在跳转..." : wechatTitle}
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
            <StatePanel
              status={wechatStatus}
              title={wechatTitle}
              description={wechatMessage}
              compact
            />
          </div>
        )}

        <p className="mt-5 text-center text-sm text-muted-foreground">
          {mode === "login" ? "还没有账号？" : "已有账号？"}
          <button
            onClick={onModeToggle}
            className="ml-1 font-medium text-brand transition-colors hover:text-brand/80"
          >
            {mode === "login" ? "免费注册" : "去登录"}
          </button>
        </p>

        <p className="mt-3 text-center text-xs leading-5 text-muted-foreground/60">
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
  );
}
