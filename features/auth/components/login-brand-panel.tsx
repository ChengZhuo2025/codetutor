import { ArrowRight, Code2, Sparkles } from "lucide-react"
import { APP_NAME } from "@/constants/app"
import { getAuthPageMock } from "@/lib/api/mock"

export function LoginBrandPanel() {
  const { profile, preview } = getAuthPageMock()

  return (
    <div className="relative hidden flex-1 flex-col justify-between overflow-hidden bg-surface-2 p-12 lg:flex">
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage: `
            linear-gradient(to right, oklch(0.26 0.008 240 / 0.22) 1px, transparent 1px),
            linear-gradient(to bottom, oklch(0.26 0.008 240 / 0.22) 1px, transparent 1px)
          `,
          backgroundSize: "48px 48px",
        }}
      />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,oklch(0.78_0.15_180/0.14),transparent_28%),radial-gradient(circle_at_bottom_right,oklch(0.8_0.18_60/0.12),transparent_24%)]" />

      <div className="relative z-10 flex items-center justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand text-brand-foreground">
            <Code2 className="h-5 w-5" />
          </div>
          <span className="text-lg font-semibold">{APP_NAME}</span>
        </div>
        <div className="rounded-full border border-brand/20 bg-brand-dim px-3 py-1 text-xs font-medium text-brand">
          回到学习流程
        </div>
      </div>

      <div className="relative z-10 max-w-xl">
        <div className="mb-5 flex flex-wrap gap-2">
          {preview.previewTools.map((tool) => (
            <span
              key={tool}
              className="rounded-full border border-border/60 bg-background/50 px-3 py-1 text-xs text-muted-foreground"
            >
              {tool}
            </span>
          ))}
        </div>

        <h1 className="max-w-lg text-4xl font-semibold leading-tight tracking-tight text-balance">
          不只是登录。
          <span className="text-brand"> 是直接回到今天要完成的第一步。</span>
        </h1>
        <p className="mt-4 max-w-lg text-base leading-7 text-muted-foreground">
          登录后立刻看到当前关卡、AI 教练提示和下一步待办，不需要重新回忆自己上次学到哪里。
        </p>

        <div className="mt-8 grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
          <div className="rounded-[28px] border border-border/60 bg-background/60 p-5 backdrop-blur">
            <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.16em] text-brand/80">
              <Sparkles className="h-3.5 w-3.5" />
              AI 教练预览
            </div>

            <div className="mt-5 flex justify-end">
              <div className="max-w-[84%] rounded-2xl rounded-tr-sm border border-brand/20 bg-brand/12 px-4 py-3 text-sm text-foreground">
                我想学 Cursor，但不知道从哪开始。
              </div>
            </div>

            <div className="mt-4 flex gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-brand text-xs font-bold text-brand-foreground">
                AI
              </div>
              <div className="max-w-[84%] rounded-2xl rounded-tl-sm border border-border/50 bg-surface-3 px-4 py-3 text-sm text-foreground">
                好，我已经帮你拆好了。先安装 Cursor，再完成第一次 AI 对话。
                <div className="mt-2 inline-flex items-center gap-1 rounded-full bg-background px-2.5 py-1 text-[11px] font-medium text-brand">
                  预计 5 分钟
                  <ArrowRight className="h-3 w-3" />
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-[28px] border border-border/60 bg-background/60 p-5 backdrop-blur">
            <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
              当前待办
            </p>
            <div className="mt-4 space-y-3">
              {preview.previewSteps.map((step) => (
                <div
                  key={step.id}
                  className={`rounded-2xl border px-4 py-3 ${
                    step.active
                      ? "border-brand/30 bg-brand-dim/70"
                      : "border-border/60 bg-surface-3/70"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                        step.active
                          ? "bg-brand text-brand-foreground"
                          : "bg-surface-4 text-muted-foreground"
                      }`}
                    >
                      {step.id}
                    </div>
                    <div>
                      <p
                        className={`text-sm font-medium ${
                          step.active ? "text-foreground" : "text-muted-foreground"
                        }`}
                      >
                        {step.title}
                      </p>
                      <p className="mt-1 text-xs leading-5 text-muted-foreground">
                        {step.description}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-5 rounded-2xl border border-border/60 bg-surface-1 px-4 py-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">距离下一段位</p>
                  <p className="mt-1 text-sm font-semibold text-gold">还差 320 XP</p>
                </div>
                <div className="rounded-full bg-gold-dim px-2.5 py-1 text-[11px] font-semibold text-gold">
                  连续学习 +1
                </div>
              </div>
              <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-surface-4">
                <div className="h-full w-[36%] rounded-full bg-brand transition-all" />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="relative z-10 rounded-[28px] border border-border/60 bg-background/55 p-5 backdrop-blur">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground">当前段位</p>
            <p className="mt-1 text-lg font-semibold text-brand">{profile.currentRank}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-muted-foreground">累计学分</p>
            <p className="mt-1 text-lg font-semibold text-gold">{profile.currentScore} XP</p>
          </div>
        </div>
        <blockquote className="mt-5 max-w-lg text-2xl font-semibold leading-snug tracking-tight text-balance">
          “你负责找到
          <span className="text-brand">想学的内容</span>
          ，我负责陪你真正学会。”
        </blockquote>
      </div>
    </div>
  )
}
