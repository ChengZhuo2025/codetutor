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
  type OAuthProviderAvailability,
} from "@/features/auth/lib/oauth-providers";
import { isValidChinaMainlandPhone } from "@/features/auth/lib/phone-auth";
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
  activeOAuthProvider: AuthOAuthProvider | null;
  agreedToLegal: boolean;
  onModeToggle: () => void;
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

const USER_AGREEMENT_CONTENT = `生效日期：2026-04-17

欢迎使用 CodeTutor（以下简称“本平台”）。本《用户协议》是你与本平台运营方之间就账号注册、登录和使用本平台服务所订立的协议。请在使用前认真阅读并充分理解全部内容；当你完成注册、登录或继续使用本平台服务时，即视为你已阅读、理解并同意本协议。

一、服务内容与适用范围
1. 本平台定位为 AI 编程学习辅导产品，当前主要提供：手机号验证码登录、第三方授权登录（如微信/抖音，按实际开通情况）、学习路径与任务管理、学习地图、学习历史、学习成就、学习提醒、意见反馈等功能。
2. 本平台部分功能依赖外部服务提供商（如短信服务、第三方登录服务、云数据库与云存储、AI 模型服务）。如因第三方服务可用性、网络环境或政策要求导致功能受限、延迟或中断，本平台将在合理范围内协助处理，但不承担超出法律规定的责任。
3. 本协议适用于本平台网页端及未来可能上线的其他终端形态；若某项增值功能另有专项规则，以该专项规则为准。

二、账号注册、登录与安全
1. 你可通过中国大陆手机号验证码方式注册/登录，或使用本平台已开通的第三方账号授权登录。
2. 你应保证注册信息真实、合法、有效，不得冒用他人身份或利用技术手段绕过账号安全机制。
3. 你应妥善保管账号凭证、验证码及登录设备，因你主动泄露、管理不善或被钓鱼/木马攻击造成的风险与损失，由你自行承担；你发现账号异常时应及时联系平台处理。
4. 本平台有权在合理范围内采取安全措施，包括但不限于登录风控、异常行为识别、频率限制、会话失效处理等，以保障账号与系统安全。

三、使用规范
1. 你在使用本平台服务时，不得实施任何违反法律法规、公序良俗或侵害他人合法权益的行为，不得利用本平台从事以下行为：
   （1）发布、传播违法有害信息，或侵犯他人知识产权、名誉权、隐私权等合法权益；
   （2）对本平台进行逆向工程、恶意爬取、接口滥用、流量攻击、批量注册、刷量等干扰系统正常运行的行为；
   （3）利用 AI 生成能力从事欺诈、作弊、侵权、违法自动化操作等高风险用途。
2. 你应自行判断并承担基于平台内容（含 AI 输出）作出决策的后果。AI 输出仅供学习参考，不构成任何专业建议或保证。
3. 若你违反本协议，本平台有权根据违规程度采取警示、限流、功能限制、账号冻结或终止服务等措施，并保留依法追责的权利。

四、内容与知识产权
1. 本平台界面、代码、文档、商标、标识及相关内容的知识产权归本平台或依法享有权利的主体所有。
2. 你在使用本平台过程中提交或生成的学习相关内容（如学习目标、任务记录、反馈信息等），你仍保留相应合法权益；你授予本平台在提供服务、保障安全、改进产品所必需范围内进行处理与使用的权利。
3. 未经权利人书面许可，任何人不得对本平台内容进行复制、传播、出售、出租、反向利用或用于商业性再分发。

五、服务变更、中断与终止
1. 本平台可根据业务需要对功能、规则、交互进行更新、调整或优化，并尽量以适当方式通知。
2. 在系统维护、故障处置、合规整改或不可抗力情况下，平台可能出现暂时中断或部分不可用，本平台将尽合理努力恢复服务。
3. 如你主动注销账号、长期未使用、违反本协议或法律法规，本平台有权在符合法律规定前提下暂停或终止向你提供全部或部分服务。

六、责任限制
1. 本平台按“现状”提供服务，在法律允许范围内，不对服务连续性、无错误、完全适配特定需求作绝对保证。
2. 对于因网络故障、第三方服务异常、黑客攻击、不可抗力等非本平台可控原因导致的损失，本平台在法律允许范围内承担相应责任。
3. 因你违反本协议或法律法规给本平台、其他用户或第三方造成损失的，你应依法承担赔偿责任。

七、未成年人保护
1. 若你为未成年人，应在监护人陪同下阅读并在取得监护人同意后使用本平台。
2. 监护人应对未成年人使用行为进行合理监督和引导；如发现不适宜内容或异常使用，请及时联系平台。

八、协议更新与法律适用
1. 本平台有权根据法律法规、监管要求及业务发展对本协议进行更新。更新后的协议在公布后生效；如你继续使用服务，视为接受更新内容。
2. 本协议的订立、生效、履行与争议解决适用中华人民共和国法律（不含冲突规范）。如发生争议，双方应先友好协商；协商不成的，任一方可向有管辖权的人民法院提起诉讼。

九、联系我们
如你对本协议有任何疑问，或需要行使相关权利，可通过平台“联系我们/反馈入口”提交申请，我们将在合理期限内处理。`;

const PRIVACY_POLICY_CONTENT = `生效日期：2026-04-17

欢迎使用 CodeTutor。本《隐私政策》说明我们如何收集、使用、存储、共享和保护你的个人信息，以及你可行使的相关权利。请在使用服务前认真阅读。

一、我们收集的信息
1. 账号与身份验证信息
   （1）手机号、验证码登录结果、第三方授权登录标识（如已开通微信/抖音登录）。
   （2）账号基础资料（如昵称、头像等，取决于你主动填写或第三方授权范围）。
2. 学习与使用信息
   （1）学习路径、任务状态、学习历史、成就信息、打卡与提醒设置；
   （2）你主动输入/上传的学习相关内容（如学习目标、问题、反馈）；
   （3）为保障产品运行所需的日志信息（如请求标识、设备/浏览器基础信息、访问时间、错误日志、操作事件）。
3. 必要技术信息
   （1）会话与鉴权相关信息（用于保持登录态和接口安全）；
   （2）本地存储信息（如主题模式、界面折叠状态等产品体验配置）。

二、我们如何使用信息
1. 提供核心功能：完成注册登录、身份识别、学习流程管理、历史记录展示、提醒与反馈处理。
2. 服务安全保障：风险识别、异常检测、限流防刷、故障排查、日志审计与安全加固。
3. 产品优化与运营分析：基于去标识化/聚合化统计改进功能体验、稳定性与内容质量。
4. 合规义务履行：根据法律法规、监管要求或司法机关要求进行必要处理。

三、我们如何共享、转让与公开披露
1. 我们不会出售你的个人信息。
2. 在以下情形下，我们可能共享必要信息：
   （1）与为实现功能所必需的服务提供商共享（例如云服务、短信服务、第三方登录服务、AI 能力服务），并要求其按法律法规及合同约定保护信息安全；
   （2）在法律法规要求、诉讼争议解决或行政/司法机关依法要求下进行披露。
3. 如发生合并、收购、资产转让等情形导致信息转移，我们将通过合理方式告知你，并要求新的持有方继续受本政策约束。

四、信息存储与保护
1. 我们在实现目的所需期限内保存你的个人信息，并在超出保存期限后依法删除或匿名化处理。
2. 我们采取合理可行的安全措施保护数据，包括访问控制、传输安全、密钥管理、日志审计和最小权限原则等。
3. 尽管我们已采取安全措施，互联网并非绝对安全环境。若发生个人信息安全事件，我们将依法及时告知并采取补救措施。

五、你的权利
在法律法规规定范围内，你有权：
1. 查询、更正、补充你的个人信息；
2. 删除你的个人信息（法律另有规定或履行法定义务所需的除外）；
3. 撤回授权同意（不影响撤回前基于同意进行的处理活动）；
4. 注销账号；
5. 获取本政策副本并就个人信息处理提出说明请求。
你可通过平台“联系我们/反馈入口”提交请求，我们将在合理期限内处理。

六、未成年人信息保护
1. 我们重视未成年人个人信息保护。若你为未成年人，应在监护人同意和指导下使用本平台。
2. 如我们发现未经监护人同意收集了未成年人个人信息，将依法尽快删除或进行合规处理。

七、Cookie 与本地存储
1. 为保障登录状态、基础功能和体验一致性，我们会使用 Cookie 或类似本地存储技术。
2. 你可通过浏览器设置管理相关存储，但这可能影响部分功能正常使用（如自动登录、主题和界面偏好记忆）。

八、政策更新
1. 我们可能根据法律法规、监管要求或业务变化更新本政策。
2. 更新后我们会通过页面提示等合理方式告知；若你继续使用服务，视为你已阅读并同意更新后的政策。

九、联系我们
如你对本政策有疑问、意见或投诉建议，或需要行使个人信息相关权利，可通过平台“联系我们/反馈入口”与我们联系。`;

const LEGAL_META = {
  operatorName: "CodeTutor 运营团队",
  effectiveDate: "2026-04-17",
  lastUpdatedDate: "2026-04-17",
  contactEmail: "support@codetutor.local",
};

function withLegalMeta(content: string) {
  return `${content}

——
运营方：${LEGAL_META.operatorName}
生效日期：${LEGAL_META.effectiveDate}
最后更新：${LEGAL_META.lastUpdatedDate}
联系邮箱：${LEGAL_META.contactEmail}`;
}

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
  activeOAuthProvider,
  agreedToLegal,
  onModeToggle,
  onPhoneChange,
  onCodeChange,
  onSendCode,
  onSubmit,
  onOAuthSubmit,
  onAgreementChange,
}: LoginFormProps) {
  const isValidPhone = isValidChinaMainlandPhone(phone);
  const isValidCode = /^\d{6}$/.test(code);
  const canSubmit = isValidPhone && isValidCode && agreedToLegal;
  const oauthAvailabilityState = oauthAvailability ?? {
    wechat: false,
    douyin: false,
  };
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
                ? "text-foreground"
                : "text-muted-foreground hover:text-foreground",
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
                ? "text-foreground"
                : "text-muted-foreground hover:text-foreground",
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
                disabled={isChecking || isActive || isSubmitting}
                className={cn(
                  "group relative overflow-hidden rounded-2xl border px-4 py-3 text-left transition-all",
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
            ICP备案号: 沪ICP备2026015857号-1
          </a>
        </div>
      </div>
    </div>
  );
}
