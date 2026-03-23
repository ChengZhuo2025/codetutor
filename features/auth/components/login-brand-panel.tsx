import { Code2 } from "lucide-react"
import { APP_NAME } from "@/constants/app"
import { loginPreviewSteps, loginPreviewTools } from "@/features/auth/data/login-data"

export function LoginBrandPanel() {
  return (
    <div className="relative hidden flex-1 flex-col justify-between overflow-hidden bg-surface-2 p-12 lg:flex">
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage: `
            linear-gradient(to right, oklch(0.26 0.008 240 / 0.3) 1px, transparent 1px),
            linear-gradient(to bottom, oklch(0.26 0.008 240 / 0.3) 1px, transparent 1px)
          `,
          backgroundSize: "48px 48px",
        }}
      />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,transparent_40%,var(--surface-2)_80%)]" />

      <div className="relative z-10 flex items-center gap-2.5">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand text-brand-foreground">
          <Code2 className="h-5 w-5" />
        </div>
        <span className="text-lg font-semibold">{APP_NAME}</span>
      </div>

      <div className="relative z-10 flex flex-col gap-3">
        <div className="mb-2 flex flex-wrap gap-2">
          {loginPreviewTools.map((tool) => (
            <span
              key={tool}
              className="rounded-full border border-border/60 bg-surface-3 px-3 py-1 text-xs text-muted-foreground"
            >
              {tool}
            </span>
          ))}
        </div>

        <div className="flex justify-end">
          <div className="max-w-[80%] rounded-2xl rounded-tr-sm border border-brand/20 bg-brand/15 px-4 py-2.5 text-sm text-foreground">
            我想学 Cursor，但不知道从哪开始
          </div>
        </div>

        <div className="flex gap-2.5">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-brand text-xs font-bold text-brand-foreground">
            AI
          </div>
          <div className="max-w-[80%] rounded-2xl rounded-tl-sm border border-border/50 bg-surface-3 px-4 py-2.5 text-sm text-foreground">
            好，我已经拆好了。第一步只需要安装 Cursor 并打开一个文件夹。
            <span className="mt-1 block text-xs text-brand">预计 5 分钟完成</span>
          </div>
        </div>

        {loginPreviewSteps.map((step) => (
          <div
            key={step.id}
            className={`rounded-xl border border-border/50 px-4 py-3 ${
              step.active ? "bg-surface-3/60" : "bg-surface-3/60 opacity-50"
            }`}
          >
            <div className="flex items-center gap-3">
              <div
                className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                  step.active
                    ? "bg-brand text-brand-foreground"
                    : "bg-surface-4 text-muted-foreground"
                }`}
              >
                {step.id}
              </div>
              <div>
                <p
                  className={`text-xs font-medium ${
                    step.active ? "text-foreground" : "text-muted-foreground"
                  }`}
                >
                  {step.title}
                </p>
                <p className="text-xs text-muted-foreground">{step.description}</p>
              </div>
              {step.active && (
                <div className="ml-auto h-2 w-2 rounded-full bg-brand animate-pulse" />
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="relative z-10">
        <blockquote className="mb-8 text-3xl font-semibold leading-snug tracking-tight text-balance">
          “你负责找到
          <span className="text-brand">想学的内容</span>
          ，我负责陪你真正学会。”
        </blockquote>

        <div className="overflow-hidden rounded-2xl border border-border/60 bg-surface-1 p-5">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">当前段位</p>
              <p className="text-sm font-semibold text-brand">Vibe Coder</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-muted-foreground">累计学分</p>
              <p className="text-sm font-semibold text-gold">680 XP</p>
            </div>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-surface-4">
            <div className="h-full w-[36%] rounded-full bg-brand transition-all" />
          </div>
          <p className="mt-2 text-xs text-muted-foreground">距离 AI 建造者还需 320 XP</p>
        </div>
      </div>
    </div>
  )
}
