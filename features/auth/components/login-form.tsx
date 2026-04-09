"use client";

import { ArrowRight, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatePanel } from "@/components/ui/state-panel";
import {
  OAUTH_PROVIDERS,
  getOAuthProviderMeta,
  type OAuthProviderAvailability,
} from "@/features/auth/lib/oauth-providers";
import type { AuthMode, AuthOAuthProvider } from "@/features/auth/types";
import { cn } from "@/lib/utils";

type LoginFormProps = {
  mode: AuthMode;
  phone: string;
  code: string;
  countdown: number;
  isSendingCode: boolean;
  isSubmitting: boolean;
  statusMessage: string;
  errorMessage: string | null;
  oauthAvailability: OAuthProviderAvailability | null;
  oauthStatus: "empty" | "loading" | "error";
  oauthStatusTitle: string;
  oauthStatusMessage: string;
  activeOAuthProvider: AuthOAuthProvider | null;
  onModeToggle: () => void;
  onPhoneChange: (value: string) => void;
  onCodeChange: (value: string) => void;
  onSendCode: () => void;
  onSubmit: () => void;
  onOAuthSubmit: (provider: AuthOAuthProvider) => void;
};

export function LoginForm({
  mode,
  phone,
  code,
  countdown,
  isSendingCode,
  isSubmitting,
  statusMessage,
  errorMessage,
  oauthAvailability,
  oauthStatus,
  oauthStatusTitle,
  oauthStatusMessage,
  activeOAuthProvider,
  onModeToggle,
  onPhoneChange,
  onCodeChange,
  onSendCode,
  onSubmit,
  onOAuthSubmit,
}: LoginFormProps) {
  const isValidPhone = /^1[3-9]\d{9}$/.test(phone);
  const isValidCode = /^\d{6}$/.test(code);
  const canSubmit = isValidPhone && isValidCode;
  const oauthAvailabilityState = oauthAvailability ?? {
    wechat: false,
    douyin: false,
  };
  const showOauthState = oauthStatus !== "empty";

  return (
    <div className="relative flex w-full flex-col items-center justify-center overflow-hidden px-6 py-8 lg:w-[40%]">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,oklch(0.52_0.12_180/0.06),transparent_28%)] dark:bg-[radial-gradient(circle_at_top,oklch(0.78_0.15_180/0.08),transparent_28%)]" />

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

        <div className="mb-5">
          <h1 className="text-[2rem] font-bold tracking-tight">
            {mode === "login" ? "欢迎回来" : "创建账号"}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {mode === "login"
              ? "请输入手机号验证码"
              : "使用手机号快速创建账号"}
          </p>
        </div>

        <form
          className="space-y-3"
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
              <Phone className="h-4 w-4 text-muted-foreground" />
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
            {isSendingCode || countdown > 0 ? (
              <div className="mt-2 flex items-center gap-2 px-1 text-xs text-muted-foreground">
                <span
                  className={cn(
                    "h-2 w-2 rounded-full",
                    isSendingCode ? "animate-pulse bg-chart-3" : "bg-brand",
                  )}
                />
                <span>{statusMessage}</span>
              </div>
            ) : null}
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

        <div className="relative mt-5">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-border/50" />
          </div>
          <div className="relative flex justify-center">
            <span className="rounded-full border border-border/50 bg-background px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
              其他登录方式
            </span>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3">
          {OAUTH_PROVIDERS.map((provider) => {
            const meta = getOAuthProviderMeta(provider.id);
            const available = oauthAvailabilityState[provider.id];
            const isChecking = oauthAvailability === null;
            const isActive = activeOAuthProvider === provider.id;
            const Icon = meta.icon;
            const badgeLabel = isChecking ? "检测中" : available ? "可用" : "待开通";

            return (
              <button
                key={provider.id}
                type="button"
                onClick={() => onOAuthSubmit(provider.id)}
                disabled={isChecking || !available || isActive || isSubmitting}
                className={cn(
                  "group relative overflow-hidden rounded-[22px] border px-4 py-3 text-left transition-all",
                  available
                    ? "border-border/70 bg-surface-2 hover:-translate-y-0.5 hover:border-brand/30 hover:bg-surface-1"
                    : "border-border/50 bg-surface-3/70",
                )}
              >
                <div
                  className={cn(
                    "pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-200 group-hover:opacity-100",
                    `bg-[radial-gradient(circle_at_top_left,var(--tw-gradient-stops))] ${meta.accent}`,
                  )}
                />
                <div className="relative z-10 flex items-center justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <div
                      className={cn(
                        "flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border bg-background/70",
                        available ? "border-brand/20 text-foreground" : "border-border/60 text-muted-foreground",
                      )}
                    >
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-foreground">{meta.label}</p>
                    </div>
                  </div>
                  <span
                    className={cn(
                      "shrink-0 rounded-full border px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.14em]",
                      available
                        ? "border-brand/30 bg-brand-dim text-brand"
                        : "border-border/50 bg-background/65 text-muted-foreground",
                    )}
                  >
                    {isActive ? "跳转中" : badgeLabel}
                  </span>
                </div>
              </button>
            );
          })}
        </div>

        {showOauthState ? (
          <StatePanel
            status={oauthStatus}
            title={oauthStatusTitle}
            description={oauthStatusMessage}
            compact
            className="mt-3"
          />
        ) : null}

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
