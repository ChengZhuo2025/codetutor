"use client"

import { AlertCircle, Lightbulb, Target } from "lucide-react"
import type { LearningCurrentSessionResponseData } from "@/lib/api/contracts/learning"
import { cn } from "@/lib/utils"
import {
  USER_PANEL_HERO_CARD_CLASS,
  USER_PANEL_HERO_TOP_SECTION_CLASS,
} from "@/components/ui/surface-styles"

type LearnChatHeroProps = {
  mission: LearningCurrentSessionResponseData["mission"]
  rightPanel: LearningCurrentSessionResponseData["rightPanel"]
}

export function LearnChatHero({ mission, rightPanel }: LearnChatHeroProps) {
  if (!mission) {
    return (
      <div className="rounded-[1.75rem] border border-border bg-surface-2/95 p-4 pb-6">
        <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground">
          <AlertCircle className="h-4 w-4 text-destructive" />
          未获取到任务信息
        </div>
        <p className="text-sm leading-7 text-muted-foreground">
          当前任务卡暂时没有拿到可展示的数据。你可以回到学习地图重新进入本关，或者等待联调接口后自动恢复。
        </p>
      </div>
    )
  }

  return (
    <div className={cn("overflow-hidden rounded-[2.00rem] mb-6", USER_PANEL_HERO_CARD_CLASS)}>
      <div
        className={cn(
          USER_PANEL_HERO_TOP_SECTION_CLASS,
          "px-5 py-5 sm:px-6 sm:py-6",
        )}
      >
        <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-brand/80">
          <Target className="h-3.5 w-3.5 text-brand" />
          现在只做这一步
        </div>

        <div className="mt-6 flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
          <div className="min-w-0 flex-1">
            <p className="text-2xl font-bold leading-9 tracking-tight text-foreground sm:text-[2.15rem]">
              {rightPanel.currentStep}
            </p>
            <p className="mt-3 max-w-4xl text-[15px] leading-7 text-muted-foreground">
              {rightPanel.whyThisStep}
            </p>
          </div>

          <div className="grid shrink-0 gap-3 sm:grid-cols-3 xl:w-[320px]">
            <div className="rounded-[1.25rem] border border-border/55 bg-surface-1/92 px-4 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.72)] dark:border-white/10 dark:bg-white/6 dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
              <p className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground/75">
                预计时长
              </p>
              <p className="mt-2 text-md font-semibold text-foreground">
                {mission.estimatedTime}
              </p>
            </div>
            <div className="rounded-[1.25rem] border border-border/55 bg-surface-1/92 px-4 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.72)] dark:border-white/10 dark:bg-white/6 dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
              <p className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground/75">
                当前进度
              </p>
              <p className="mt-2 text-md font-semibold text-foreground">
                {mission.progressLabel}
              </p>
            </div>
            <div className="rounded-[1.25rem] border border-gold/30 bg-[linear-gradient(180deg,rgba(255,247,237,0.96),rgba(255,237,213,0.88))] px-4 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.7)] dark:border-gold/20 dark:bg-[linear-gradient(180deg,rgba(120,53,15,0.24),rgba(120,53,15,0.16))] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
              <p className="text-[11px] uppercase tracking-[0.12em] text-gold/80">
                完成奖励
              </p>
              <p className="mt-2 text-md font-bold text-gold">{mission.reward}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="px-5 py-5 sm:px-6">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-foreground/90">
          <Lightbulb className="h-3.5 w-3.5 text-gold" />
          AI 教练提醒
        </div>
        <p className="mt-1 ml-5 text-sm leading-7 text-muted-foreground">{mission.coachCue}</p>
      </div>
    </div>
  )
}
