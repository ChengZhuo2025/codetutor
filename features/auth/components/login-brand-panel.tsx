import Image from "next/image"
import { CheckCircle2, Code2 } from "lucide-react"
import { AUTH_PREVIEW_TOOL_CODES, getToolName } from "@/constants/tools"
import { marketingConversationMessages } from "@/features/marketing/data/marketing-content"
import { usePublicSite } from "@/features/site/providers/public-site-provider"
import { cn } from "@/lib/utils"
export function LoginBrandPanel() {
  const previewTools = AUTH_PREVIEW_TOOL_CODES.map((code) => getToolName(code))
  const { site } = usePublicSite()
  const { information } = site

  return (
    <div className="relative hidden w-[60%] flex-col overflow-hidden bg-surface-2 px-7 pt-6 pb-20 lg:flex">
      <div
        className="pointer-events-none absolute inset-0 dark:hidden"
        style={{
          backgroundImage: `
            linear-gradient(to right, oklch(0.55 0.018 270 / 0.064) 1px, transparent 1px),
            linear-gradient(to bottom, oklch(0.55 0.018 270 / 0.064) 1px, transparent 1px)
          `,
          backgroundSize: "48px 48px",
        }}
      />
      <div
        className="pointer-events-none absolute inset-0 hidden dark:block"
        style={{
          backgroundImage: `
            linear-gradient(to right, oklch(0.62 0.04 150 / 0.16) 1px, transparent 1px),
            linear-gradient(to bottom, oklch(0.62 0.04 150 / 0.16) 1px, transparent 1px)
          `,
          backgroundSize: "48px 48px",
        }}
      />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,oklch(0.60_0.27_270/0.09),transparent_28%),radial-gradient(circle_at_bottom_right,oklch(0.65_0.32_280/0.08),transparent_24%)] dark:bg-[radial-gradient(circle_at_top_left,oklch(0.75_0.24_270/0.14),transparent_28%),radial-gradient(circle_at_bottom_right,oklch(0.64_0.32_280/0.08),transparent_24%)]" />

      {/* 顶部 Logo + 标签 */}
      <div className="relative z-10 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-xl bg-brand text-brand-foreground shadow-[0_10px_28px_-18px_oklch(0.73_0.21_270/0.72)]">
            {information.logoUrl ? (
              <Image src={information.logoUrl} alt={`${information.siteName} logo`} width={36} height={36} className="h-full w-full object-contain" unoptimized />
            ) : (
              <Code2 className="h-[18px] w-[18px]" />
            )}
          </div>
          <div className="leading-[1.02]">
            <span className="block text-[1rem] font-semibold tracking-tight">{information.siteName}</span>
            <span className="mt-1 block text-[11px] text-muted-foreground">
              {information.siteSubtitle}
            </span>
          </div>
        </div>
        <div className="rounded-full border border-brand/20 bg-brand-dim px-3 py-1 text-xs font-medium text-brand">
          开始学习之旅
        </div>
      </div>

      {/* 欢迎语 - 根据登录/注册模式切换，比 logo 栏更缩进形成层次 */}
      <div className="relative z-10 mt-16 px-12">
        <div className="mb-4 flex flex-wrap gap-2">
          {previewTools.map((tool) => (
            <span
              key={tool}
              className="rounded-full border border-border/80 bg-surface-1 px-3 py-1 text-xs text-muted-foreground"
            >
              {tool}
            </span>
          ))}
        </div>

        <h2 className="text-3xl font-bold leading-tight tracking-tight text-balance">
            登录即注册
            <span className="text-brand"> {information.siteSlogan}</span>
          </h2>
          <p className="mt-1 text-sm leading-7 text-muted-foreground">
            {information.siteDescription}
          </p>
      </div>

      {/* AI 导师对话 - 复用首页滚动对话 */}
      <div className="relative z-10 mx-12 mt-5 flex-1 overflow-hidden rounded-2xl border border-border/70 bg-surface-1 shadow-[0_20px_60px_-34px_rgba(15,23,42,0.22)] backdrop-blur-xl dark:border-border/70 dark:bg-[oklch(0.15_0.012_270/0.48)] dark:shadow-none">
        <div className="flex items-center gap-2 border-b border-border/80 px-4 py-2.5 dark:border-white/8">
          <div className="h-2.5 w-2.5 rounded-full bg-destructive/70" />
          <div className="h-2.5 w-2.5 rounded-full bg-gold/70" />
          <div className="h-2.5 w-2.5 rounded-full bg-brand/70" />
          <span className="ml-3 text-xs font-mono text-muted-foreground">AI 导师对话</span>
        </div>

        <div className="relative h-full overflow-hidden">
          <div className="pointer-events-none absolute inset-x-0 top-0 z-10 h-12 bg-[linear-gradient(180deg,oklch(0.98_0.005_270/0.95),transparent)] dark:bg-[linear-gradient(180deg,oklch(0.14_0.01_270/0.78),transparent)]" />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-16 bg-[linear-gradient(180deg,transparent,oklch(0.98_0.005_270/0.92))] dark:bg-[linear-gradient(180deg,transparent,oklch(0.14_0.01_270/0.86))]" />

          <div className="animate-[hero-chat-scroll_26s_linear_infinite] space-y-3.5 p-5">
            {[0, 1].flatMap((loop) =>
              marketingConversationMessages.map((message) => (
                <div
                  key={`${loop}-${message.id}`}
                  className="flex gap-3"
                >
                  <div
                    className={cn(
                      "flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-xs font-semibold",
                      message.speaker === "user"
                        ? "bg-foreground/10 text-foreground dark:bg-white/8"
                        : message.speaker === "system"
                          ? "bg-gold/14 text-gold"
                          : "bg-brand text-brand-foreground",
                    )}
                  >
                    {message.speaker === "user"
                      ? "我"
                      : message.speaker === "system"
                        ? "任"
                        : "AI"}
                  </div>
                  <div
                    className={cn(
                      "max-w-[92%] rounded-2xl px-4 py-2.5 text-left text-sm backdrop-blur-sm",
                      message.speaker === "user"
                        ? "rounded-tl-sm border border-border bg-muted/70 text-foreground dark:border-white/8 dark:bg-white/6"
                        : message.speaker === "system"
                          ? "rounded-tl-sm border border-gold/18 bg-gold/10 text-foreground"
                          : "rounded-tl-sm border border-brand/18 bg-brand/12 text-foreground",
                    )}
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={cn(
                          "text-[11px] font-semibold uppercase tracking-[0.14em]",
                          message.speaker === "ai"
                            ? "text-brand"
                            : message.speaker === "system"
                              ? "text-gold"
                              : "text-muted-foreground",
                        )}
                      >
                        {message.title}
                      </span>
                      {message.meta ? (
                        <span className="rounded-full border border-border bg-muted px-2 py-0.5 text-[10px] text-muted-foreground dark:border-white/8 dark:bg-black/16">
                          {message.meta}
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-1.5 leading-6 text-foreground/92">{message.body}</p>
                    {message.speaker === "ai" ? (
                      <div className="mt-2 flex items-center gap-2 rounded-2xl bg-muted/90 px-3 py-1.5 dark:bg-black/18">
                        <CheckCircle2 className="h-3.5 w-3.5 text-gold" />
                        <span className="text-xs font-semibold text-gold">陪练建议已生成</span>
                        <span className="text-xs text-muted-foreground">下一步会直接进入待办</span>
                      </div>
                    ) : null}
                  </div>
                </div>
              )),
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
