import { CheckCircle2, Code2, Sparkles } from "lucide-react"
import { APP_NAME } from "@/constants/app"
import { marketingConversationMessages } from "@/features/marketing/data/marketing-content"
import { cn } from "@/lib/utils"
import type { AuthMode } from "@/features/auth/types"

type LoginBrandPanelProps = {
  mode: AuthMode
}

export function LoginBrandPanel({ mode }: LoginBrandPanelProps) {
  const previewTools = ["Cursor", "Claude Code", "Codex CLI", "Google Stitch"]
  const profile = {
    currentRank: "Vibe Coder",
    currentScore: 680,
  }

  return (
    <div className="relative hidden w-[60%] flex-col overflow-hidden bg-surface-2 p-8 lg:flex">
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage: `
            linear-gradient(to right, oklch(0.26 0.008 240 / 0.22) 1px, transparent 1px),
            linear-gradient(to bottom, oklch(0.26 0.008 240 / 0.22) 1px, transparent 1px)
          `,
          backgroundSize: "32px 32px",
        }}
      />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,oklch(0.78_0.15_180/0.14),transparent_28%),radial-gradient(circle_at_bottom_right,oklch(0.8_0.18_60/0.12),transparent_24%)]" />

      {/* 顶部 Logo + 标签 */}
      <div className="relative z-10 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand text-brand-foreground shadow-[0_10px_28px_-18px_oklch(0.78_0.15_180/0.72)]">
            <Code2 className="h-[18px] w-[18px]" />
          </div>
          <div className="leading-[1.02]">
            <span className="block text-[1.06rem] font-extrabold tracking-tight">{APP_NAME}</span>
            <span className="mt-0.5 block text-[11px] text-muted-foreground">
              AI 编程学习教练
            </span>
          </div>
        </div>
        <div className="rounded-full border border-brand/20 bg-brand-dim px-3 py-1 text-xs font-medium text-brand">
          {mode === "login" ? "回到学习流程" : "开始学习之旅"}
        </div>
      </div>

      {/* 欢迎语 - 根据登录/注册模式切换，比 logo 栏更缩进形成层次 */}
      <div className="relative z-10 mt-10 px-12">
        <div className="mb-4 flex flex-wrap gap-2">
          {previewTools.map((tool) => (
            <span
              key={tool}
              className="rounded-full border border-border/60 bg-background/50 px-3 py-1 text-xs text-muted-foreground"
            >
              {tool}
            </span>
          ))}
        </div>

        {mode === "login" ? (
          <>
            <h1 className="text-3xl font-semibold leading-tight tracking-tight text-balance">
              不只是登录。
              <span className="text-brand"> 是直接回到今天要完成的第一步。</span>
            </h1>
            <p className="mt-2 text-sm leading-7 text-muted-foreground">
              登录后立刻看到当前关卡、AI 教练提示和下一步待办，不需要重新回忆自己上次学到哪里。
            </p>
          </>
        ) : (
          <>
            <h1 className="text-3xl font-semibold leading-tight tracking-tight text-balance">
              从零开始也没关系。
              <span className="text-brand"> AI 教练会陪你走完每一步。</span>
            </h1>
            <p className="mt-2 text-sm leading-7 text-muted-foreground">
              注册后会根据你选择的工具和水平，自动生成一条适合你的学习路径，从第一步开始陪你练。
            </p>
          </>
        )}
      </div>

      {/* AI 导师对话 - 复用首页滚动对话 */}
      <div className="relative z-10 mx-12 mt-6 flex-1 overflow-hidden rounded-[24px] border border-white/10 bg-[oklch(0.15_0.012_240/0.48)] backdrop-blur-xl">
        <div className="flex items-center gap-2 border-b border-white/8 px-4 py-2.5">
          <div className="h-2.5 w-2.5 rounded-full bg-destructive/70" />
          <div className="h-2.5 w-2.5 rounded-full bg-gold/70" />
          <div className="h-2.5 w-2.5 rounded-full bg-brand/70" />
          <span className="ml-3 text-xs font-mono text-muted-foreground">AI 导师对话</span>
        </div>

        <div className="relative h-full overflow-hidden">
          <div className="pointer-events-none absolute inset-x-0 top-0 z-10 h-12 bg-[linear-gradient(180deg,oklch(0.14_0.01_240/0.78),transparent)]" />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-16 bg-[linear-gradient(180deg,transparent,oklch(0.14_0.01_240/0.86))]" />

          <div className="animate-[hero-chat-scroll_26s_linear_infinite] space-y-3.5 p-5">
            {[0, 1].flatMap((loop) =>
              marketingConversationMessages.map((message) => (
                <div
                  key={`${loop}-${message.id}`}
                  className="flex gap-3"
                >
                  <div
                    className={cn(
                      "flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-xs font-bold",
                      message.speaker === "user"
                        ? "bg-white/8 text-foreground"
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
                        ? "rounded-tl-sm border border-white/8 bg-white/6 text-foreground"
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
                        <span className="rounded-full border border-white/8 bg-black/16 px-2 py-0.5 text-[10px] text-muted-foreground">
                          {message.meta}
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-1.5 leading-6 text-foreground/92">{message.body}</p>
                    {message.speaker === "ai" ? (
                      <div className="mt-2 flex items-center gap-2 rounded-2xl bg-black/18 px-3 py-1.5">
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

      {/* 底部信息栏 */}
      <div className="relative z-10 mx-12 mt-5 flex items-center justify-between rounded-2xl border border-border/60 bg-background/55 px-5 py-3 backdrop-blur">
        <div className="flex items-center gap-4">
          <div>
            <p className="text-[11px] text-muted-foreground">当前段位</p>
            <p className="text-sm font-semibold text-brand">{profile.currentRank}</p>
          </div>
          <div className="h-8 w-px bg-border/40" />
          <div>
            <p className="text-[11px] text-muted-foreground">累计学分</p>
            <p className="text-sm font-semibold text-gold">{profile.currentScore} XP</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <Sparkles className="h-3.5 w-3.5 text-brand" />
          <span>AI 陪你真正学会</span>
        </div>
      </div>
    </div>
  )
}
