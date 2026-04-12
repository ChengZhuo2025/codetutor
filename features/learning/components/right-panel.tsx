"use client"

import {
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Compass,
  Lightbulb,
  Lock,
} from "lucide-react"
import { ROUTES } from "@/constants/routes"
import {
  WORKSPACE_ASIDE_CARD_CLASS,
  WORKSPACE_ASIDE_INSET_CARD_CLASS,
  WorkspaceAside,
} from "@/components/layout/workspace-aside"
import { PageSection } from "@/components/ui/page-section"
import { StatePanel } from "@/components/ui/state-panel"
import type { LearningCurrentSessionResponseData } from "@/lib/api/contracts/learning"
import { cn } from "@/lib/utils"

type LearnRightPanelProps = {
  className?: string
  learningData: LearningCurrentSessionResponseData
}

export function LearnRightPanel({ className, learningData }: LearnRightPanelProps) {
  const {
    knowledgeTags: learningKnowledgeTags,
    tasks: learningTasks,
    mission,
    rightPanel,
  } = learningData

  return (
    <WorkspaceAside className={className}>
      {mission ? (
        <>
          <PageSection
            eyebrow="你现在学到哪了"
            title="本关任务进行到哪一步"
            description="这里按顺序列出本关内的各个步骤：已完成的会显示勾选；当前正在做的会标注「进行中」；尚未解锁的会在你完成前置步骤后依次开放。需要对照整条学习路径时，可点击「查看全部」。"
          >
            <div className="mb-3 flex items-center justify-end">
              <a
                href={ROUTES.map}
                className="flex items-center gap-1 text-xs text-brand transition-colors hover:text-brand/80"
              >
                查看全部
                <ArrowRight className="h-3 w-3" />
              </a>
            </div>
            <div className="space-y-2">
              {learningTasks.map((task) => (
                <div
                  key={task.id}
                  className={cn(
                    WORKSPACE_ASIDE_INSET_CARD_CLASS,
                    "text-sm",
                    task.current
                      ? "border-brand/25 bg-brand-dim/70"
                      : "border-border/60 bg-surface-3/80",
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
                      <span className="ml-auto shrink-0 rounded-full bg-brand px-1.5 py-0.5 text-[11px] font-medium text-brand-foreground">
                        进行中
                      </span>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          </PageSection>

          <PageSection
            eyebrow="现在只做这一步"
            title={rightPanel.currentStep}
            description={rightPanel.whyThisStep}
            bodyClassName="pt-0"
          >
            <div className="grid gap-3 pt-4 pb-1">
              <div className={WORKSPACE_ASIDE_INSET_CARD_CLASS}>
                <p className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground/60">
                  完成标准
                </p>
                <p className="mt-2 text-sm leading-6 text-foreground">
                  {rightPanel.completionCriteria}
                </p>
              </div>
              <div className={WORKSPACE_ASIDE_INSET_CARD_CLASS}>
                <div className="mb-2 flex items-center justify-between text-[11px] uppercase tracking-[0.12em] text-muted-foreground/60">
                  <span>本关进度</span>
                  <span>{mission.progressLabel}</span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-black/6 dark:bg-white/10">
                  <div
                    className="h-full rounded-full bg-brand transition-all"
                    style={{ width: `${mission.progressPercent}%` }}
                  />
                </div>
              </div>
            </div>
          </PageSection>

          <PageSection
            eyebrow="本关要掌握"
            title="这一步真正要学会什么"
            description="进入实操前先对齐这关真正要掌握的判断标准。"
          >
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
            <div className="space-y-2">
              {rightPanel.masteryPoints.map((point, index) => (
                <div key={point} className={cn(WORKSPACE_ASIDE_INSET_CARD_CLASS, "flex gap-2")}>
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand/18 text-xs font-semibold text-brand">
                    {index + 1}
                  </div>
                  <p className="text-sm leading-6 text-foreground/85">{point}</p>
                </div>
              ))}
            </div>
          </PageSection>

          <PageSection
            eyebrow="注意事项"
            title="先避开这些高频卡点"
            description={rightPanel.hintIfStuck}
          >
            <div className="space-y-2">
              {rightPanel.cautions.map((caution, index) => (
                <div key={`${caution.text}-${index}`} className={cn(WORKSPACE_ASIDE_INSET_CARD_CLASS, "flex gap-2")}>
                  <div
                    className={cn(
                      "mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full",
                      caution.isTrap ? "bg-rose-500" : "bg-muted-foreground/45",
                    )}
                  />
                  <div className="min-w-0 flex-1">
                    {caution.isTrap ? (
                      <span className="mb-1 inline-flex items-center gap-1 rounded-full border border-destructive/20 bg-rose-500/10 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-rose-500">
                        <AlertTriangle className="h-3 w-3" />
                        卡点提醒
                      </span>
                    ) : null}
                    <p className="text-sm leading-6 text-foreground/82">{caution.text}</p>
                  </div>
                </div>
              ))}
            </div>
          </PageSection>

          <div className={cn(WORKSPACE_ASIDE_CARD_CLASS, "border-gold/15 bg-gold-dim/35")}>
            <div className="flex items-start gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-gold/25 bg-gold/10 text-gold dark:border-gold/15 dark:bg-[linear-gradient(180deg,rgba(255,255,255,0.08),rgba(0,0,0,0.06))] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
                <Compass className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="mt-1 flex items-center gap-1 text-xs uppercase tracking-[0.12em] text-gold">
                  <Lightbulb className="h-3 w-3" />
                  下一关预告
                </div>
                <p className="mt-1 text-sm font-semibold text-foreground">
                  {mission.nextUnlockTitle}
                </p>
              </div>
            </div>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              {rightPanel.nextStepPreview}
            </p>
          </div>
        </>
      ) : (
        <StatePanel
          status="empty"
          title="任务上下文暂不可用"
          description="当前会话没有可展示的关卡摘要。请刷新页面或从学习地图重新进入本关；若问题持续，请联系支持。"
          extra={
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <AlertCircle className="h-3.5 w-3.5" />
              缺少 mission 数据
            </div>
          }
        />
      )}
    </WorkspaceAside>
  )
}
