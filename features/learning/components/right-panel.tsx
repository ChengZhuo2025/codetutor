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
            description="本关步骤依序展示：勾选为已完成，「进行中」为当前；全路径点「查看全部」。"
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
                      ? "border-brand/25 bg-brand-dim/70 dark:border-brand/40 dark:bg-brand/20"
                      : "border-border/80 bg-surface-3",
                  )}
                >
                  <div className="flex items-center gap-2.5">
                    {task.done ? (
                      <CheckCircle2 className="h-4 w-4 shrink-0 text-brand" />
                    ) : task.locked ? (
                      <Lock className="h-4 w-4 shrink-0 opacity-70 text-muted-foreground" />
                    ) : (
                      <div
                        className={cn(
                          "h-4 w-4 shrink-0 rounded-full border-2",
                          task.current ? "border-brand" : "border-border/80",
                        )}
                      />
                    )}

                    <span
                      className={cn(
                        "truncate",
                        task.current ? "font-medium text-foreground" : "text-muted-foreground",
                        task.locked && "opacity-75",
                      )}
                    >
                      {task.label}
                    </span>

                    {task.current ? (
                      <span className="ml-auto shrink-0 rounded-full bg-brand px-1.5 py-0.5 text-[11px] font-medium text-white">
                        进行中
                      </span>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          </PageSection>

          <PageSection
            eyebrow="先理解方法"
            title="请先仔细阅读本关教案"
            description={rightPanel.lessonBrief}
          >
            <div className="space-y-2">
              {rightPanel.practiceSteps.map((step, index) => (
                <div key={`${step}-${index}`} className={cn(WORKSPACE_ASIDE_INSET_CARD_CLASS, "flex gap-2")}>
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand/18 text-xs font-semibold text-brand">
                    {index + 1}
                  </div>
                  <p className="text-sm leading-6 text-foreground/85">{step}</p>
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
                  提交说明
                </p>
                <p className="mt-2 text-sm leading-6 text-foreground">
                  {rightPanel.submissionGuide}
                </p>
              </div>
              <div className={WORKSPACE_ASIDE_INSET_CARD_CLASS}>
                <p className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground/60">
                  完成标准
                </p>
                <p className="mt-2 text-sm leading-6 text-foreground">
                  {rightPanel.completionCriteria}
                </p>
              </div>
              {rightPanel.checkpoints.length > 0 ? (
                <div className={WORKSPACE_ASIDE_INSET_CARD_CLASS}>
                  <p className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground/60">
                    AI 检查点
                  </p>
                  <div className="mt-2 space-y-1.5">
                    {rightPanel.checkpoints.map((checkpoint) => (
                      <p key={checkpoint} className="text-sm leading-6 text-foreground/82">
                        {checkpoint}
                      </p>
                    ))}
                  </div>
                </div>
              ) : null}
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
            description="按编号要点逐项对齐掌握标准。"
          >
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
                      caution.isTrap ? "bg-chart-4" : "bg-muted-foreground/45",
                    )}
                  />
                  <div className="min-w-0 flex-1">
                    {caution.isTrap ? (
                      <span className="mb-1 inline-flex items-center gap-1 rounded-full border border-chart-4/25 bg-chart-4/10 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-chart-4">
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

          <div className={cn(WORKSPACE_ASIDE_CARD_CLASS, "border-gold/15 bg-gold-dim/35 dark:border-gold/20 dark:bg-gold/8")}>
            <div className="flex items-start gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-gold/25 bg-gold/10 text-gold dark:border-gold/15 dark:bg-[linear-gradient(180deg,rgba(255,255,255,0.08),rgba(0,0,0,0.06))] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
                <Compass className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="mt-1 flex items-center gap-1 text-xs uppercase tracking-[0.12em] text-gold">
                  <Lightbulb className="h-3 w-3" />
                  {mission.nextPreviewIsFinal ? "学习计划收尾" : "下一关预告"}
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
