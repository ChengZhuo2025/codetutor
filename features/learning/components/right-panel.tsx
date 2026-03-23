import { ChevronRight, Target, Lightbulb, CheckCircle2, Lock } from "lucide-react"
import { cn } from "@/lib/utils"

const tasks = [
  { id: 1, label: "安装 Cursor", done: true },
  { id: 2, label: "完成第一次 AI 对话", done: true },
  { id: 3, label: "理解 Chat vs Composer", done: false, current: true },
  { id: 4, label: "AI 调试助手", done: false },
  { id: 5, label: "多文件上下文", done: false, locked: true },
]

const knowledgeTags = [
  { label: "Composer 模式", color: "text-brand bg-brand-dim border-brand/20" },
  { label: "Chat 模式", color: "text-chart-3 bg-chart-3/10 border-chart-3/20" },
  { label: "AI 上下文", color: "text-chart-5 bg-chart-5/10 border-chart-5/20" },
]

export function LearnRightPanel() {
  return (
    <aside className="flex h-screen w-72 shrink-0 flex-col gap-4 overflow-y-auto border-l border-border/50 bg-sidebar p-5">
      {/* Current goal */}
      <div className="rounded-2xl border border-border/60 bg-surface-2 p-4">
        <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          <Target className="h-3.5 w-3.5 text-brand" />
          当前目标
        </div>
        <p className="text-sm font-medium leading-relaxed">
          用 Composer 创建一个 React 时钟组件
        </p>
        <div className="mt-3 flex items-center justify-between rounded-lg bg-surface-3 px-3 py-2">
          <span className="text-xs text-muted-foreground">本关进度</span>
          <div className="flex items-center gap-2">
            <div className="h-1.5 w-16 overflow-hidden rounded-full bg-surface-4">
              <div className="h-full w-1/3 rounded-full bg-brand" />
            </div>
            <span className="text-xs font-medium text-brand">1/3</span>
          </div>
        </div>
      </div>

      {/* Task path mini */}
      <div className="rounded-2xl border border-border/60 bg-surface-2 p-4">
        <div className="mb-3 flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            任务路径
          </span>
          <a href="/map" className="flex items-center gap-1 text-xs text-brand hover:text-brand/80 transition-colors">
            查看全部
            <ChevronRight className="h-3 w-3" />
          </a>
        </div>
        <div className="space-y-2">
          {tasks.map((task) => (
            <div
              key={task.id}
              className={cn(
                "flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm transition-colors",
                task.current
                  ? "border border-brand/30 bg-brand-dim font-medium text-brand"
                  : task.done
                  ? "text-muted-foreground"
                  : task.locked
                  ? "opacity-40"
                  : "text-muted-foreground"
              )}
            >
              {task.done ? (
                <CheckCircle2 className="h-4 w-4 shrink-0 text-brand" />
              ) : task.locked ? (
                <Lock className="h-4 w-4 shrink-0" />
              ) : (
                <div
                  className={cn(
                    "h-4 w-4 shrink-0 rounded-full border-2",
                    task.current ? "border-brand" : "border-border/60"
                  )}
                />
              )}
              <span className="truncate">{task.label}</span>
              {task.current && (
                <span className="ml-auto shrink-0 rounded-full bg-brand px-1.5 py-0.5 text-[10px] font-bold text-brand-foreground">
                  进行中
                </span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Knowledge tags */}
      <div className="rounded-2xl border border-border/60 bg-surface-2 p-4">
        <div className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          涉及知识点
        </div>
        <div className="flex flex-wrap gap-2">
          {knowledgeTags.map((tag) => (
            <span
              key={tag.label}
              className={cn(
                "rounded-full border px-2.5 py-1 text-xs font-medium",
                tag.color
              )}
            >
              {tag.label}
            </span>
          ))}
        </div>
      </div>

      {/* Hint */}
      <div className="rounded-2xl border border-gold/20 bg-gold-dim p-4">
        <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-gold">
          <Lightbulb className="h-3.5 w-3.5" />
          快速提示
        </div>
        <p className="text-sm leading-relaxed text-foreground/80">
          Composer 擅长生成整块代码，Chat 适合解释和问答。遇到复杂任务优先用 Composer，遇到不懂的概念用 Chat 追问。
        </p>
      </div>

      {/* Next preview */}
      <div className="rounded-2xl border border-border/60 bg-surface-2 p-4">
        <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          下一关预告
        </div>
        <p className="text-sm font-medium">AI 调试助手</p>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
          学会用 Cmd+K 让 Cursor 直接定位并修复代码 bug，不再手动排查错误。
        </p>
        <div className="mt-2 flex items-center gap-1.5 text-xs text-gold">
          <span>完成本关后解锁</span>
          <span className="font-semibold">+10 XP</span>
        </div>
      </div>
    </aside>
  )
}
