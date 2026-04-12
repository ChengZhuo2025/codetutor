"use client"

import { useEffect, useState } from "react"
import {
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Compass,
  ChevronLeft,
  ChevronRight,
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
import { USER_ICON_BUTTON_CLASS } from "@/components/ui/surface-styles"
import type { LearningCurrentSessionResponseData } from "@/lib/api/contracts/learning"
import { cn } from "@/lib/utils"

// 常量定义
const TIP_ROTATION_INTERVAL_MS = 7000

type LearnRightPanelProps = {
  className?: string
  learningData: LearningCurrentSessionResponseData
}

const tipCardClassNames = [
  "border-brand/30 bg-brand/12 dark:border-brand/25 dark:bg-[linear-gradient(135deg,rgba(31,198,164,0.16),rgba(7,18,27,0.92))]",
  "border-amber-500/25 bg-amber-500/10 dark:border-gold/25 dark:bg-[linear-gradient(135deg,rgba(225,168,75,0.18),rgba(24,18,12,0.92))]",
  "border-sky-500/25 bg-sky-500/8 dark:border-chart-5/25 dark:bg-[linear-gradient(135deg,rgba(63,118,255,0.16),rgba(10,16,30,0.92))]",
]

export function LearnRightPanel({ className, learningData }: LearnRightPanelProps) {
  const {
    knowledgeTags: learningKnowledgeTags,
    tasks: learningTasks,
    tips: learningTips,
    mission,
    rightPanel,
  } = learningData
  const [activeTipIndex, setActiveTipIndex] = useState(0)

  const safeActiveTipIndex =
    learningTips.length === 0
      ? 0
      : Math.min(activeTipIndex, learningTips.length - 1)

  useEffect(() => {
    if (learningTips.length <= 1) return

    const timer = window.setInterval(() => {
      setActiveTipIndex((prev) => {
        const len = learningTips.length
        const clamped = Math.min(Math.max(prev, 0), len - 1)
        return (clamped + 1) % len
      })
    }, TIP_ROTATION_INTERVAL_MS)

    return () => window.clearInterval(timer)
  }, [learningTips.length])

  const activeTip =
    learningTips.length > 0 ? learningTips[safeActiveTipIndex] : undefined

  return (
    <WorkspaceAside className={className}>
      {mission ? (
        <>
          <PageSection
            eyebrow="现在只做这一步"
            title={rightPanel.currentStep}
            description={rightPanel.whyThisStep}
            className="border-brand/20 bg-brand-dim/50"
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
            <div className="mb-3 flex flex-wrap gap-2">
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
            <div className="space-y-2.5">
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
            <div className="space-y-2.5">
              {rightPanel.cautions.map((caution, index) => (
                <div key={`${caution.text}-${index}`} className={cn(WORKSPACE_ASIDE_INSET_CARD_CLASS, "flex gap-2")}>
                  <div
                    className={cn(
                      "mt-2 h-1.5 w-1.5 shrink-0 rounded-full",
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

          <PageSection eyebrow="卡住时先这样做" title="技巧小贴士" description="执行过程中不确定时，优先用这些轻量提示把问题缩小。">
            {activeTip ? (
              <div className="space-y-3">
                <div
                  className={cn(
                    "relative overflow-hidden rounded-[16px] border px-4 py-4",
                    tipCardClassNames[safeActiveTipIndex % tipCardClassNames.length],
                  )}
                >
                  <div className="absolute right-4 top-3 h-2 w-2 rounded-full bg-card ring-2 ring-border/60 dark:bg-background dark:shadow-[0_0_0_2px_rgba(255,255,255,0.12)] dark:ring-0" />
                  <div className="max-w-full">
                    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-foreground/55">
                      Tip {safeActiveTipIndex + 1}
                    </p>
                    <p className="mt-3 text-base font-semibold leading-7 text-foreground">
                      {activeTip.title}
                    </p>
                    <p className="mt-2 text-sm leading-6 text-foreground/78">{activeTip.body}</p>
                  </div>
                </div>

                {learningTips.length > 1 ? (
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      {learningTips.map((tip, index) => (
                        <button
                          key={`${index}-${tip.title}`}
                          type="button"
                          aria-label={`查看提示 ${index + 1}`}
                          onClick={() => setActiveTipIndex(index)}
                          className={cn(
                            "h-2.5 rounded-full transition-all",
                            index === safeActiveTipIndex
                              ? "w-6 bg-brand"
                              : "w-2.5 bg-surface-4 hover:bg-surface-3",
                          )}
                        />
                      ))}
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        aria-label="上一条技巧"
                        onClick={() =>
                          setActiveTipIndex((prev) => {
                            const len = learningTips.length
                            const clamped = Math.min(Math.max(prev, 0), len - 1)
                            return clamped === 0 ? len - 1 : clamped - 1
                          })
                        }
                        className={cn(
                          "flex h-8 w-8 items-center justify-center rounded-full",
                          USER_ICON_BUTTON_CLASS,
                        )}
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        aria-label="下一条技巧"
                        onClick={() =>
                          setActiveTipIndex((prev) => {
                            const len = learningTips.length
                            const clamped = Math.min(Math.max(prev, 0), len - 1)
                            return (clamped + 1) % len
                          })
                        }
                        className={cn(
                          "flex h-8 w-8 items-center justify-center rounded-full",
                          USER_ICON_BUTTON_CLASS,
                        )}
                      >
                        <ChevronRight className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ) : null}
              </div>
            ) : null}
          </PageSection>

          <PageSection
            eyebrow="当前学习路径"
            title="继续沿着这条路径推进"
            description="地图页负责选关，这里保留当前路径状态，方便你边学边判断下一步。"
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
                      <span className="ml-auto shrink-0 rounded-full bg-brand px-1.5 py-0.5 text-[11px] font-bold text-brand-foreground">
                        进行中
                      </span>
                    ) : null}
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
