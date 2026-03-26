"use client"

import { useEffect, useState } from "react"
import {
  AlertCircle,
  CheckCircle2,
  Compass,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Lightbulb,
  Lock,
  Target,
} from "lucide-react"
import { ROUTES } from "@/constants/routes"
import {
  WORKSPACE_ASIDE_CARD_CLASS,
  WORKSPACE_ASIDE_INSET_CARD_CLASS,
  WorkspaceAside,
} from "@/components/layout/workspace-aside"
import { PageSection } from "@/components/ui/page-section"
import { Skeleton } from "@/components/ui/skeleton"
import { StatePanel } from "@/components/ui/state-panel"
import { getLearningPageMock } from "@/lib/api/mock"
import { cn } from "@/lib/utils"

type LearnRightPanelProps = {
  className?: string
}

const tipCardClassNames = [
  "border-brand/25 bg-[linear-gradient(135deg,rgba(31,198,164,0.16),rgba(7,18,27,0.92))]",
  "border-gold/25 bg-[linear-gradient(135deg,rgba(225,168,75,0.18),rgba(24,18,12,0.92))]",
  "border-chart-5/25 bg-[linear-gradient(135deg,rgba(63,118,255,0.16),rgba(10,16,30,0.92))]",
]

export function LearnRightPanel({ className }: LearnRightPanelProps) {
  const { learningKnowledgeTags, learningTasks, learningTips, mission, rightPanel } =
    getLearningPageMock()
  const [detailsOpen, setDetailsOpen] = useState(false)
  const [activeTipIndex, setActiveTipIndex] = useState(0)

  useEffect(() => {
    if (learningTips.length <= 1) return

    const timer = window.setInterval(() => {
      setActiveTipIndex((prev) => (prev + 1) % learningTips.length)
    }, 7000)

    return () => window.clearInterval(timer)
  }, [learningTips.length])

  const activeTip = learningTips[activeTipIndex]

  return (
    <WorkspaceAside className={className}>
      {mission ? (
        <>
          <PageSection
            eyebrow="现在只做这一步"
            title={rightPanel.currentStep}
            description={rightPanel.whyThisStep}
            className="border-brand/20 bg-brand-dim/55"
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
                <div className="h-2 w-full overflow-hidden rounded-full bg-surface-4">
                  <div
                    className="h-full rounded-full bg-brand transition-all"
                    style={{ width: `${mission.progressPercent}%` }}
                  />
                </div>
              </div>
            </div>
          </PageSection>

          <PageSection eyebrow="卡住时先这样做" title="技巧小贴士" description={rightPanel.hintIfStuck}>
            {activeTip ? (
              <div className="space-y-3">
                <div
                  className={cn(
                    "relative overflow-hidden rounded-[16px] border px-4 py-4",
                    tipCardClassNames[activeTipIndex % tipCardClassNames.length],
                  )}
                >
                  <div className="absolute right-4 top-3 h-2 w-2 rounded-full bg-background shadow-[0_0_0_2px_rgba(255,255,255,0.12)]" />
                  <div className="max-w-full">
                    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-foreground/55">
                      Tip {activeTipIndex + 1}
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
                          key={tip.title}
                          type="button"
                          aria-label={`查看提示 ${index + 1}`}
                          onClick={() => setActiveTipIndex(index)}
                          className={cn(
                            "h-2.5 rounded-full transition-all",
                            index === activeTipIndex
                              ? "w-6 bg-brand"
                              : "w-2.5 bg-surface-4 hover:bg-surface-3",
                          )}
                        />
                      ))}
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          setActiveTipIndex((prev) =>
                            prev === 0 ? learningTips.length - 1 : prev - 1,
                          )
                        }
                        className="flex h-8 w-8 items-center justify-center rounded-full border border-border/60 bg-surface-2 text-muted-foreground transition-colors hover:border-border hover:text-foreground"
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setActiveTipIndex((prev) => (prev + 1) % learningTips.length)
                        }
                        className="flex h-8 w-8 items-center justify-center rounded-full border border-border/60 bg-surface-2 text-muted-foreground transition-colors hover:border-border hover:text-foreground"
                      >
                        <ChevronRight className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ) : null}
              </div>
            ) : null}
          </PageSection>

          <div className={cn(WORKSPACE_ASIDE_CARD_CLASS, "bg-surface-2/75 p-0")}>
            <button
              type="button"
              onClick={() => setDetailsOpen((prev) => !prev)}
              className="flex w-full items-center justify-between gap-3 py-4 text-left"
            >
              <div>
                <p className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground/60">
                  更多上下文
                </p>
                <p className="mt-1 text-sm font-semibold text-foreground">路径、知识点、下一步预告</p>
              </div>
              <ChevronDown
                className={cn(
                  "h-4 w-4 text-muted-foreground transition-transform",
                  detailsOpen && "rotate-180",
                )}
              />
            </button>

            {detailsOpen ? (
              <div className="space-y-4 border-t border-border/50 py-4">
                <div>
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground/60">
                      当前学习路径
                    </p>
                    <a
                      href={ROUTES.map}
                      className="flex items-center gap-1 text-xs text-brand transition-colors hover:text-brand/80"
                    >
                      查看全部
                      <ChevronRight className="h-3 w-3" />
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
                            <span className="ml-auto shrink-0 rounded-full bg-brand px-1.5 py-0.5 text-[10px] font-bold text-brand-foreground">
                              进行中
                            </span>
                          ) : null}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-3">
                  <p className="mb-3 text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground/60">
                    本关知识点
                  </p>
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
                </div>

                <div className="rounded-[16px] border border-gold/20 bg-gold-dim/80 px-4 py-4">
                  <div className="flex items-start gap-3">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-gold/15 bg-[linear-gradient(180deg,rgba(255,255,255,0.08),rgba(0,0,0,0.06))] text-gold shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
                      <Compass className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center mt-1 gap-1 text-xs uppercase tracking-[0.12em] text-gold">
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
              </div>
            ) : null}
          </div>
        </>
      ) : (
        <>
          <StatePanel
            status="error"
            title="未获取到任务信息"
            description="当前右侧上下文面板没有拿到可展示的任务数据。联调真实接口后，这里会显示目标、完成标准和分层求助提示。"
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

          <StatePanel
            status="empty"
            title="等待学习任务开始"
            description="当页面拿到当前会话后，这里会展示当前这一步和完成标准。"
            extra={
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                <Target className="h-3.5 w-3.5" />
                当前一步优先
              </div>
            }
          />
        </>
      )}
    </WorkspaceAside>
  )
}
