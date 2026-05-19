"use client";

import { ArrowRight, Phone } from "lucide-react";
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
import type { AuthStep, AuthOAuthProvider } from "@/features/auth/types";
import { MarkdownContent } from "@/features/site/components/markdown-content";
import { usePublicSite } from "@/features/site/providers/public-site-provider";
import { cn } from "@/lib/utils";

type LoginFormProps = {
  step: AuthStep;
  phone: string;
  code: string;
  countdown: number;
  isSendingCode: boolean;
  isSubmitting: boolean;
  statusMessage: string;
  errorMessage: string | null;
  activeOAuthProvider: AuthOAuthProvider | null;
  agreedToLegal: boolean;
  onCancelOAuthBinding: () => void;
  onPhoneChange: (value: string) => void;
  onCodeChange: (value: string) => void;
  onSendCode: () => void;
  onSubmit: () => void;
  onOAuthSubmit: (provider: AuthOAuthProvider) => void;
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
            <div className="max-h-[65vh] overflow-y-auto pr-1">
              <MarkdownContent content={content} />
            </div>
          </DialogDescription>
        </DialogHeader>
      </DialogContent>
    </Dialog>
  );
}

export function LoginForm({
  step,
  phone,
  code,
  countdown,
  isSendingCode,
  isSubmitting,
  statusMessage,
  errorMessage,
  activeOAuthProvider,
  agreedToLegal,
  onCancelOAuthBinding,
  onPhoneChange,
  onCodeChange,
  onSendCode,
  onSubmit,
  onOAuthSubmit,
  onAgreementChange,
}: LoginFormProps) {
  const isOAuthBinding = step === "oauth-binding";
  const feedbackStatus = isOAuthBinding ? "warning" : "error";
  const { site } = usePublicSite();
  const { userAgreement, privacyPolicy } = site.articles;
  const isValidPhone = isValidChinaMainlandPhone(phone);
  const isValidCode = /^\d{6}$/.test(code);
  const canSubmit = isValidPhone && isValidCode && agreedToLegal;
  const hasPhoneInput = phone.length > 0;
  const showPhoneLengthHint = hasPhoneInput && phone.length < 11;
  const showPhoneFormatError = phone.length === 11 && !isValidPhone;
  const phoneValidationMessage = showPhoneLengthHint
    ? `请输入 11 位中国大陆手机号，当前已输入 ${phone.length} 位。`
    : showPhoneFormatError
      ? "请输入真实的 11 位中国大陆手机号。"
      : null;

  return (
    <div className="relative flex w-full flex-col items-center justify-center overflow-hidden px-6 py-6 lg:w-[40%]">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,oklch(0.62_0.24_270/0.06),transparent_28%)] dark:bg-[radial-gradient(circle_at_top,oklch(0.73_0.21_270/0.08),transparent_28%)]" />

      <div className="relative z-10 w-full max-w-sm">
        <div className="mb-8">
          <h1 className="text-[2rem] font-bold tracking-tight">
            {isOAuthBinding ? "绑定手机号" : "登录 / 注册"}
          </h1>
          <p className="text-sm text-muted-foreground">
            {isOAuthBinding
              ? "请输入手机号完成绑定，已有账号会自动关联。"
              : "输入手机号，验证码登录或注册。"}
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
                  : "border-border focus-within:border-brand/60 focus-within:bg-surface-1 focus-within:shadow-[0_0_0_4px_oklch(0.72_0.24_270/0.08)]",
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
              <div className="flex flex-1 items-center gap-2 rounded-2xl border border-border bg-surface-2 px-4 py-3 transition-all focus-within:border-brand/60 focus-within:bg-surface-1 focus-within:shadow-[0_0_0_4px_oklch(0.73_0.21_270/0.08)]">
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
            {isSubmitting ? "处理中..." : "继续"}
            <ArrowRight className="h-4 w-4" />
          </Button>

          {errorMessage ? (
            <StatePanel
              status={feedbackStatus}
              title={feedbackStatus === "warning" ? "需要绑定手机号" : "操作失败"}
              description={errorMessage}
              compact
            />
          ) : null}

          <label className="mt-1 flex cursor-pointer items-start gap-2 rounded-lg px-1 text-xs leading-5 text-muted-foreground/80">
            <input
              type="checkbox"
              className="mt-0.5 h-4 w-4 rounded border-border bg-background accent-[oklch(0.73_0.21_270)]"
              checked={agreedToLegal}
              onChange={(event) => onAgreementChange(event.target.checked)}
            />
            <span>
              我已阅读并同意{" "}
              <AgreementDialogTrigger
                triggerLabel="用户协议"
                title={userAgreement.title}
                content={userAgreement.contentMarkdown}
              />{" "}
              与{" "}
              <AgreementDialogTrigger
                triggerLabel="隐私政策"
                title={privacyPolicy.title}
                content={privacyPolicy.contentMarkdown}
              />
            </span>
          </label>
        </form>

        {!isOAuthBinding ? (
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
                      "group relative overflow-hidden rounded-2xl border border-border/70 bg-surface-2 transition-all hover:-translate-y-0.5 hover:border-brand/50 hover:bg-surface-3",
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
                          className="flex h-10 w-13 shrink-0 items-center justify-center border-r border-brand/20 text-foreground"
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
        ) : (
          <div className="mt-4 text-center">
            <button
              type="button"
              onClick={onCancelOAuthBinding}
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              取消绑定，返回登录
            </button>
          </div>
        )}

        <p className="mt-6 text-center text-xs leading-5 text-muted-foreground/60">
          未勾选协议前不可发送验证码或提交。
        </p>

        {site.information.icpNumber ? (
          <div className="mt-3 pt-2 border-t border-border/50 text-center">
            <a
              href="https://beian.miit.gov.cn"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-muted-foreground/70 hover:text-foreground transition-colors hover:underline"
            >
              ICP备案号: {site.information.icpNumber}
            </a>
          </div>
        ) : null}
      </div>
    </div>
  );
}
