"use client"

import { useState } from "react"
import {
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Lightbulb,
  Lock,
  Target,
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
  const { learningKnowledgeTags, learningTasks, mission, rightPanel, supportOptions } =
    getLearningPageMock()
  const [detailsOpen, setDetailsOpen] = useState(false)

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
            eyebrow="现在只做这一步"
            title={rightPanel.currentStep}
            description={rightPanel.whyThisStep}
            className="border-brand/20 bg-brand-dim/55"
            bodyClassName="pt-0"
          >
            <div className="grid gap-3">
              <div className="rounded-2xl border border-border/50 bg-background/55 px-3 py-3">
                <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground/60">
                  完成标准
                </p>
                <p className="mt-2 text-sm leading-6 text-foreground">
                  {rightPanel.completionCriteria}
                </p>
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
              </div>
            </div>
          </PageSection>

          <PageSection eyebrow="卡住时先这样做" title="求助优先级" description={rightPanel.hintIfStuck}>
            <div className="space-y-3">
              {supportOptions.map((option, index) => (
                <div
                  key={option.mode}
                  className="rounded-2xl border border-border/50 bg-surface-3/90 px-3 py-3"
                >
                  <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-background/70 text-xs text-muted-foreground">
                      {index + 1}
                    </div>
                    {option.label}
                  </div>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    {option.description}
                  </p>
                </div>
              ))}
            </div>
          </PageSection>

          <div className="rounded-[28px] border border-border/60 bg-surface-2/75">
            <button
              type="button"
              onClick={() => setDetailsOpen((prev) => !prev)}
              className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left sm:px-6"
            >
              <div>
                <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground/60">
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
              <div className="space-y-4 border-t border-border/50 px-5 py-5 sm:px-6">
                <div>
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground/60">
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
                          "rounded-2xl border px-3 py-3 text-sm",
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

                <div>
                  <p className="mb-3 text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground/60">
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

                <StatePanel
                  status="success"
                  title={mission.nextUnlockTitle}
                  description={rightPanel.nextStepPreview}
                  className="border-gold/20 bg-gold-dim"
                  compact
                  extra={
                    <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-gold">
                      <Lightbulb className="h-3.5 w-3.5" />
                      下一关预告
                    </div>
                  }
                />
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
    </aside>
  )
}
