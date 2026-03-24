import {
  ChevronRight,
  Lightbulb,
  Lock,
  Target,
  CheckCircle2,
  AlertCircle,
} from "lucide-react"
import { ROUTES } from "@/constants/routes"
import { PageSection } from "@/components/ui/page-section"
import { Skeleton } from "@/components/ui/skeleton"
import { StatePanel } from "@/components/ui/state-panel"
import { getLearningPageMock } from "@/lib/api/mock"
import { cn } from "@/lib/utils"

type LearnRightPanelProps = {
  className?: string
}

export function LearnRightPanel({ className }: LearnRightPanelProps) {
  const { learningKnowledgeTags, learningTasks, learningTips, mission } =
    getLearningPageMock()

  return (
    <aside
      className={cn(
        "flex h-full min-h-0 flex-col gap-4 overflow-y-auto scrollbar-none p-5",
        className,
      )}
    >
      {mission ? (
        <>
          <PageSection
            eyebrow="当前目标"
            title={mission.goal}
            description={mission.summary}
            className="border-brand/20 bg-brand-dim/60"
            bodyClassName="pt-0"
            action={
              <span className="rounded-full border border-gold/20 bg-gold-dim px-2 py-1 text-[11px] font-semibold text-gold">
                {mission.reward}
              </span>
            }
          >
            <div className="mb-4 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <Target className="h-3.5 w-3.5 text-brand" />
              任务上下文
            </div>

            <div className="grid gap-2">
              <div className="rounded-2xl border border-border/50 bg-background/55 px-3 py-3">
                <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground/60">
                  AI 教练建议
                </p>
                <p className="mt-2 text-sm leading-6 text-foreground">{mission.coachCue}</p>
              </div>
              <div className="rounded-2xl border border-border/50 bg-background/55 px-3 py-3">
                <div className="mb-2 flex items-center justify-between text-[11px] uppercase tracking-[0.16em] text-muted-foreground/60">
                  <span>本关进度</span>
                  <span>{mission.progressLabel}</span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-surface-4">
                  <div
                    className="h-full rounded-full bg-brand transition-all"
                    style={{ width: `${mission.progressPercent}%` }}
                  />
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  先完成当前实验，再进入下一关。
                </p>
              </div>
            </div>
          </PageSection>

          <PageSection
            eyebrow="任务路径"
            title="当前学习路径"
            description="先完成当前实验，再推进下一关。"
            action={
              <a
                href={ROUTES.map}
                className="flex items-center gap-1 text-xs text-brand transition-colors hover:text-brand/80"
              >
                查看全部
                <ChevronRight className="h-3 w-3" />
              </a>
            }
          >
            <div className="space-y-2">
              {learningTasks.map((task) => (
                <div
                  key={task.id}
                  className={cn(
                    "rounded-2xl border px-3 py-3 text-sm",
                    task.current
                      ? "border-brand/25 bg-brand-dim"
                      : "border-border/60 bg-surface-3/90",
                  )}
                >
                  <div className="flex items-center gap-2.5">
                    {task.done ? (
                      <CheckCircle2 className="h-4 w-4 shrink-0 text-brand" />
                    ) : task.locked ? (
                      <Lock className="h-4 w-4 shrink-0 text-muted-foreground" />
                    ) : (
                      <div
                        className={cn(
                          "h-4 w-4 shrink-0 rounded-full border-2",
                          task.current ? "border-brand" : "border-border/60",
                        )}
                      />
                    )}

                    <span
                      className={cn(
                        "truncate",
                        task.current ? "font-medium text-foreground" : "text-muted-foreground",
                        task.locked && "opacity-50",
                      )}
                    >
                      {task.label}
                    </span>

                    {task.current ? (
                      <span className="ml-auto shrink-0 rounded-full bg-brand px-1.5 py-0.5 text-[10px] font-bold text-brand-foreground">
                        现在进行
                      </span>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          </PageSection>

          <div className="grid gap-4">
            <PageSection eyebrow="快速提示" title="卡住时先看这里" bodyClassName="space-y-3">
              <div className="space-y-3">
                {learningTips.map((tip) => (
                  <div key={tip.title} className="rounded-2xl border border-border/50 bg-surface-3 px-3 py-3">
                    <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                      <Lightbulb className="h-3.5 w-3.5 text-gold" />
                      {tip.title}
                    </div>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">{tip.body}</p>
                  </div>
                ))}
              </div>
            </PageSection>

            <PageSection eyebrow="涉及知识点" title="本关核心知识点">
              <div className="flex flex-wrap gap-2">
                {learningKnowledgeTags.map((tag) => (
                  <span
                    key={tag.label}
                    className={cn(
                      "rounded-full border px-2.5 py-1 text-xs font-medium",
                      tag.color,
                    )}
                  >
                    {tag.label}
                  </span>
                ))}
              </div>
            </PageSection>

            <StatePanel
              status="success"
              title={mission.nextUnlockTitle}
              description={mission.nextUnlockSummary}
              className="border-gold/20 bg-gold-dim"
              extra={
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-gold">
                  <Lightbulb className="h-3.5 w-3.5" />
                  下一关预告
                </div>
              }
            />
          </div>
        </>
      ) : (
        <>
          <StatePanel
            status="error"
            title="未获取到任务信息"
            description="当前右侧上下文面板没有拿到可展示的任务数据。联调真实接口后，这里会显示目标、进度和下一关预告。"
            extra={
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-destructive/80">
                <AlertCircle className="h-3.5 w-3.5" />
                任务上下文缺失
              </div>
            }
          />

          <StatePanel
            status="loading"
            title="预留加载态"
            description="真实接口接入后，右侧上下文区域会先显示骨架屏，再按成功或空状态渲染。"
            extra={
              <div className="space-y-3">
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-[88%]" />
                <Skeleton className="h-20 w-full rounded-2xl" />
              </div>
            }
          />
        </>
      )}
    </aside>
  )
}
