"use client";

import { useState } from "react";
import { ArrowRight, ExternalLink, Phone, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  USER_BUTTON_PRIMARY_CLASS,
  USER_BUTTON_SECONDARY_CLASS,
} from "@/components/ui/surface-styles";
import { StatePanel } from "@/components/ui/state-panel";
import {
  OAUTH_PROVIDERS,
  getOAuthProviderMeta,
} from "@/features/auth/lib/oauth-providers";
import { isValidChinaMainlandPhone } from "@/features/auth/lib/phone-auth";
import type { AuthMode, AuthOAuthProvider } from "@/features/auth/types";
import {
  PRIVACY_POLICY_CONTENT,
  USER_AGREEMENT_CONTENT,
  withLegalMeta,
} from "@/features/legal/data/legal-content";
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
  activeOAuthProvider: AuthOAuthProvider | null;
  oauthDialog: {
    provider: AuthOAuthProvider;
    url: string;
  } | null;
  agreedToLegal: boolean;
  onModeToggle: () => void;
  onPhoneChange: (value: string) => void;
  onCodeChange: (value: string) => void;
  onSendCode: () => void;
  onSubmit: () => void;
  onOAuthSubmit: (provider: AuthOAuthProvider) => void;
  onOAuthDialogOpenChange: (open: boolean) => void;
  onAgreementChange: (checked: boolean) => void;
};

type AgreementDialogTriggerProps = {
  triggerLabel: string;
  title: string;
  content: string;
};

function AgreementDialogTrigger({
  triggerLabel,
  title,
  content,
}: AgreementDialogTriggerProps) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <button
          type="button"
          className="underline underline-offset-2 transition-colors hover:text-foreground"
        >
          {triggerLabel}
        </button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription asChild>
            <div className="max-h-[65vh] overflow-y-auto whitespace-pre-line pr-1 text-sm leading-6 text-muted-foreground">
              {content}
            </div>
          </DialogDescription>
        </DialogHeader>
      </DialogContent>
    </Dialog>
  );
}

type OAuthScanDialogProps = {
  dialog: LoginFormProps["oauthDialog"];
  onOpenChange: (open: boolean) => void;
};

function OAuthScanDialog({ dialog, onOpenChange }: OAuthScanDialogProps) {
  const [frameKey, setFrameKey] = useState(0);
  const [loadedFrameId, setLoadedFrameId] = useState("");
  const meta = dialog ? getOAuthProviderMeta(dialog.provider) : null;
  const Icon = meta?.icon;
  const frameId = dialog ? `${dialog.provider}-${dialog.url}-${frameKey}` : "";
  const isFrameLoading = Boolean(dialog && loadedFrameId !== frameId);
  const refreshOAuthFrame = () => {
    setFrameKey((current) => current + 1);
  };

  return (
    <Dialog open={Boolean(dialog)} onOpenChange={onOpenChange}>
      <DialogContent className="gap-0 overflow-hidden p-0 sm:max-w-[440px]">
        <div className="border-b border-border/70 bg-surface-2/80 px-5 py-4">
          <DialogHeader className="pr-4 text-left">
            <div className="flex items-center gap-3">
              {Icon ? (
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-border/70 bg-background">
                  <Icon className="h-5 w-5" />
                </div>
              ) : null}
              <div className="min-w-0">
                <DialogTitle className="text-base">
                  {meta ? `${meta.label}登录` : "扫码登录"}
                </DialogTitle>
                <DialogDescription className="mt-1 text-xs leading-5">
                  请在下方二维码区域完成授权，成功后会自动返回当前页面。
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
        </div>

        <div className="flex flex-col gap-4 px-5 py-5">
          <div className="relative flex h-[430px] items-center justify-center overflow-hidden rounded-2xl border border-border/70 bg-white shadow-sm">
            {dialog ? (
              <iframe
                key={frameId}
                title={`${meta?.label ?? "扫码"}授权二维码`}
                src={dialog.url}
                className="h-[340px] w-full border-0 bg-white"
                onLoad={() => setLoadedFrameId(frameId)}
                sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-top-navigation-by-user-activation"
              />
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                正在准备扫码授权...
              </div>
            )}
            {dialog && isFrameLoading ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-white">
                <div className="relative h-14 w-14">
                  <div className="absolute inset-0 rounded-full border-4 border-brand/15" />
                  <div className="absolute inset-0 animate-spin rounded-full border-4 border-transparent border-t-brand" />
                  <div className="absolute inset-3 rounded-full bg-brand/10" />
                </div>
                <div className="space-y-1 text-center">
                  <p className="text-sm font-semibold text-foreground">正在加载二维码</p>
                  <p className="text-xs text-muted-foreground">请稍等，授权页面马上显示。</p>
                </div>
              </div>
            ) : null}
          </div>

          <div className="rounded-2xl border border-brand/15 bg-brand-dim px-4 py-3 text-xs leading-5 text-muted-foreground">
            <p className="font-medium text-foreground">等待扫码确认</p>
            <p>如果二维码区域无法加载，请使用下方按钮在新窗口完成授权。</p>
          </div>
        </div>

        <div className="flex items-center justify-center gap-3 border-t border-border/70 bg-surface-2/70 px-5 py-4">
          {dialog ? (
            <>
              <button
                type="button"
                onClick={refreshOAuthFrame}
                className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-background px-4 py-2 text-xs font-semibold text-foreground transition-colors hover:border-brand/40 hover:text-brand"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                刷新二维码
              </button>
              <button
                type="button"
                onClick={() => {
                  window.open(
                    dialog.url,
                    "oauth_popup",
                    "width=600,height=700,scrollbars=yes,resizable=yes",
                  );
                }}
                className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-background px-4 py-2 text-xs font-semibold text-foreground transition-colors hover:border-brand/40 hover:text-brand"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                新窗口打开
              </button>
            </>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function LoginForm({
  mode,
  phone,
  code,
  countdown,
  isSendingCode,
  isSubmitting,
  statusMessage,
  errorMessage,
  activeOAuthProvider,
  oauthDialog,
  agreedToLegal,
  onModeToggle,
  onPhoneChange,
  onCodeChange,
  onSendCode,
  onSubmit,
  onOAuthSubmit,
  onOAuthDialogOpenChange,
  onAgreementChange,
}: LoginFormProps) {
  const isValidPhone = isValidChinaMainlandPhone(phone);
  const isValidCode = /^\d{6}$/.test(code);
  const canSubmit = isValidPhone && isValidCode && agreedToLegal;
  const hasPhoneInput = phone.length > 0;
  const shouldShowOAuthLoginMethods = mode === "login";
  const showPhoneLengthHint = hasPhoneInput && phone.length < 11;
  const showPhoneFormatError = phone.length === 11 && !isValidPhone;
  const phoneValidationMessage = showPhoneLengthHint
    ? `请输入 11 位中国大陆手机号，当前已输入 ${phone.length} 位。`
    : showPhoneFormatError
      ? "请输入真实的 11 位中国大陆手机号。"
      : null;

  return (
    <div className="relative flex w-full flex-col items-center justify-center overflow-hidden px-6 py-6 lg:w-[40%]">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,oklch(0.52_0.12_180/0.06),transparent_28%)] dark:bg-[radial-gradient(circle_at_top,oklch(0.78_0.15_180/0.08),transparent_28%)]" />

      <div className="relative z-10 w-full max-w-sm">
        {/* 登录/注册切换 - 文字链接样式，与下方 tab 区分 */}
        <div className="mb-8 flex items-center justify-center gap-6">
          <button
            type="button"
            onClick={() => mode !== "login" && onModeToggle()}
            className={cn(
              "text-base font-medium transition-colors",
              mode === "login"
                ? "text-brand font-bold"
                : "text-muted-foreground hover:text-brand",
            )}
          >
            登录
          </button>
          <div className="h-4 w-px bg-border" />
          <button
            type="button"
            onClick={() => mode !== "register" && onModeToggle()}
            className={cn(
              "text-base font-medium transition-colors",
              mode === "register"
                ? "text-brand font-bold"
                : "text-muted-foreground hover:text-brand",
            )}
          >
            注册
          </button>
        </div>

        <div className="mt-6 mb-6">
          <h1 className="text-[2rem] font-bold tracking-tight">
            {mode === "login" ? "欢迎回来" : "创建账号"}
          </h1>
          <p className="text-sm text-muted-foreground">
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
            <div
              className={cn(
                "flex items-center gap-2 rounded-2xl border bg-surface-2 px-4 py-3 transition-all",
                showPhoneFormatError
                  ? "border-destructive/60 bg-destructive/5 shadow-[0_0_0_4px_oklch(0.64_0.21_25/0.12)] focus-within:border-destructive/70"
                  : "border-border focus-within:border-brand/60 focus-within:bg-surface-1 focus-within:shadow-[0_0_0_4px_oklch(0.78_0.15_180/0.08)]",
              )}
            >
              <Phone
                className={cn(
                  "h-4 w-4",
                  showPhoneFormatError ? "text-destructive" : "text-muted-foreground",
                )}
              />
              <span
                className={cn(
                  "text-sm",
                  showPhoneFormatError ? "text-destructive" : "text-muted-foreground",
                )}
              >
                +86
              </span>
              <div
                className={cn(
                  "h-4 w-px",
                  showPhoneFormatError ? "bg-destructive/35" : "bg-border/60",
                )}
              />
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
                aria-invalid={showPhoneFormatError}
                aria-describedby={phoneValidationMessage ? "phone-input-hint" : undefined}
              />
            </div>
            {phoneValidationMessage ? (
              <div
                id="phone-input-hint"
                className={cn(
                  "mt-2 flex items-center gap-2 px-1 text-xs",
                  showPhoneFormatError ? "text-destructive" : "text-muted-foreground",
                )}
              >
                <span
                  className={cn(
                    "h-1.5 w-1.5 shrink-0 rounded-full",
                    showPhoneFormatError ? "bg-destructive" : "bg-muted-foreground/55",
                  )}
                />
                <span>{phoneValidationMessage}</span>
              </div>
            ) : null}
          </div>

          <div>
            <label
              htmlFor="code-input"
              className="mb-1.5 block text-sm font-medium text-muted-foreground"
            >
              验证码
            </label>
            <div className="flex gap-3">
              <div className="flex flex-1 items-center gap-2 rounded-2xl border border-border bg-surface-2 px-4 py-3 transition-all focus-within:border-brand/60 focus-within:bg-surface-1 focus-within:shadow-[0_0_0_4px_oklch(0.78_0.15_180/0.08)]">
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
                />
              </div>
              <button
                type="button"
                onClick={onSendCode}
                disabled={countdown > 0 || !isValidPhone || isSendingCode || !agreedToLegal}
                className={cn(
                  "shrink-0 px-4 text-sm font-medium",
                  USER_BUTTON_SECONDARY_CLASS,
                )}
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
            className={cn("mt-1 h-12 w-full text-base font-semibold", USER_BUTTON_PRIMARY_CLASS)}
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

          <label className="mt-1 flex cursor-pointer items-start gap-2 rounded-lg px-1 text-xs leading-5 text-muted-foreground/80">
            <input
              type="checkbox"
              className="mt-0.5 h-4 w-4 rounded border-border bg-background accent-[oklch(0.7_0.16_180)]"
              checked={agreedToLegal}
              onChange={(event) => onAgreementChange(event.target.checked)}
            />
            <span>
              我已阅读并同意{" "}
              <AgreementDialogTrigger
                triggerLabel="用户协议"
                title="用户协议"
                content={withLegalMeta(USER_AGREEMENT_CONTENT)}
              />{" "}
              与{" "}
              <AgreementDialogTrigger
                triggerLabel="隐私政策"
                title="隐私政策"
                content={withLegalMeta(PRIVACY_POLICY_CONTENT)}
              />
            </span>
          </label>
        </form>

        {shouldShowOAuthLoginMethods ? (
          <>
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
                const isActive = activeOAuthProvider === provider.id;
                const Icon = meta.icon;

                return (
                  <button
                    key={provider.id}
                    type="button"
                    onClick={() => onOAuthSubmit(provider.id)}
                    disabled={isActive || isSubmitting}
                    className={cn(
                      "group relative overflow-hidden rounded-2xl border border-border/70 bg-surface-2 transition-all hover:-translate-y-0.5 hover:border-brand/30 hover:bg-surface-1",
                      (isActive || isSubmitting) && "cursor-not-allowed opacity-65 hover:translate-y-0",
                    )}
                  >
                    <div
                      className={cn(
                        "pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-200 group-hover:opacity-100",
                        `bg-[radial-gradient(circle_at_top_left,var(--tw-gradient-stops))] ${meta.accent}`,
                      )}
                    />
                    <div className="relative z-10 flex items-center justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-5">
                        <div
                          className="flex h-10 w-13 shrink-0 items-center justify-center border-r border-brand/20 bg-background/70 text-foreground"
                        >
                          <Icon className="h-5 w-5" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-foreground">{meta.label}</p>
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </>
        ) : null}

        {shouldShowOAuthLoginMethods ? (
          <OAuthScanDialog dialog={oauthDialog} onOpenChange={onOAuthDialogOpenChange} />
        ) : null}

        <p className="mt-6 text-center text-sm text-muted-foreground">
          {mode === "login" ? "还没有账号？" : "已有账号？"}
          <button
            type="button"
            onClick={onModeToggle}
            className="ml-1 font-medium text-brand transition-colors hover:text-brand/80"
          >
            {mode === "login" ? "免费注册" : "去登录"}
          </button>
        </p>

        <p className="mt-2 text-center text-xs leading-5 text-muted-foreground/60">
          未勾选协议前不可发送验证码或提交登录。
        </p>

        <div className="mt-3 pt-2 border-t border-border/50 text-center">
          <a
            href="https://beian.miit.gov.cn"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-muted-foreground/70 hover:text-foreground transition-colors hover:underline"
          >
            ICP备案号: 沪ICP备2026015857号-2
          </a>
        </div>
      </div>
    </div>
  );
}
