"use client";

import {
  AlertCircle,
  CheckCircle2,
  ClipboardCheck,
  Lightbulb,
  ListChecks,
  Target,
} from "lucide-react";
import type { LearningCurrentSessionResponseData } from "@/lib/api/contracts/learning";
import { cn } from "@/lib/utils";
import {
  USER_PANEL_HERO_CARD_CLASS,
  USER_PANEL_HERO_TOP_SECTION_CLASS,
} from "@/components/ui/surface-styles";

type LearnChatHeroProps = {
  mission: LearningCurrentSessionResponseData["mission"];
  rightPanel: LearningCurrentSessionResponseData["rightPanel"];
};

export function LearnChatHero({ mission, rightPanel }: LearnChatHeroProps) {
  const coachCueTrimmed = mission?.coachCue?.trim() ?? "";
  const whyTrimmed = rightPanel.whyThisStep?.trim() ?? "";
  const showCoachReminder =
    coachCueTrimmed.length > 0 && coachCueTrimmed !== whyTrimmed;

  if (!mission) {
    return (
      <div className="rounded-[1.75rem] border border-border bg-surface-2/95 p-4 pb-6">
        <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground">
          <AlertCircle className="h-4 w-4 text-destructive" />
          未获取到任务信息
        </div>
        <p className="text-sm leading-7 text-muted-foreground">
          当前任务卡暂时没有拿到可展示的数据。你可以回到学习地图重新进入当前任务，或者等待联调接口后自动恢复。
        </p>
      </div>
    );
  }

  const progressLabel = mission.progressLabel.replace(/\s*已完成\s*$/, "");

  return (
    <div
      className={cn(
        "overflow-hidden rounded-[2.00rem] mb-6",
        USER_PANEL_HERO_CARD_CLASS,
      )}
    >
      <div
        className={cn(
          USER_PANEL_HERO_TOP_SECTION_CLASS,
          "px-5 py-5 sm:px-6 sm:py-6",
        )}
      >
        <div className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-brand/80">
          <Target className="h-3.5 w-3.5 text-brand" />
          现在只做这一步
        </div>

        <div className="mt-6 flex gap-4 sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="max-w-[22rem] text-2xl font-bold tracking-tight text-foreground sm:text-[2.15rem]">
              {rightPanel.currentStep}
            </p>
          </div>

          <div className="flex shrink-0 flex-wrap items-stretch gap-3 sm:justify-end">
            <div className="min-w-fit rounded-[1.25rem] border border-border/80 bg-surface-1/92 px-4 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.72)] dark:border-white/10 dark:bg-white/6 dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
              <p className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground/75">
                预计时长
              </p>
              <p className="mt-1 whitespace-nowrap text-md font-semibold text-foreground">
                {mission.estimatedTime}
              </p>
            </div>
            <div className="min-w-fit rounded-[1.25rem] border border-border/80 bg-surface-1/92 px-4 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.72)] dark:border-white/10 dark:bg-white/6 dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
              <p className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground/75">
                完成进度
              </p>
              <p className="mt-1 whitespace-nowrap text-md font-semibold text-foreground">
                {progressLabel}
              </p>
            </div>
            <div className="min-w-fit rounded-[1.25rem] border border-gold/30 bg-[linear-gradient(180deg,rgba(255,247,237,0.96),rgba(255,237,213,0.88))] px-4 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.7)] dark:border-gold/20 dark:bg-[linear-gradient(180deg,rgba(120,53,15,0.24),rgba(120,53,15,0.16))] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
              <p className="text-[11px] uppercase tracking-[0.12em] text-gold/80">
                完成奖励
              </p>
              <p className="mt-1 whitespace-nowrap text-md font-bold text-gold">
                {mission.reward}
              </p>
            </div>
          </div>
        </div>

        <p className="mt-4 text-[15px] leading-7 text-muted-foreground">
          {rightPanel.whyThisStep}
        </p>
      </div>

      {showCoachReminder ? (
        <div className="px-5 py-5 sm:px-6">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-foreground/90">
            <Lightbulb className="h-3.5 w-3.5 text-gold" />
            AI 教练提醒
          </div>
          <p className="mt-1 ml-5 text-sm leading-7 text-muted-foreground">
            {mission.coachCue}
          </p>
        </div>
      ) : null}

      <div className="grid gap-6 border-t border-border/60 px-5 py-5 sm:px-6 lg:grid-cols-[1fr_1.2fr]">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-foreground/90">
            <Lightbulb className="h-3.5 w-3.5 text-gold" />
            先理解方法
          </div>
          <p className="mt-2 text-sm leading-7 text-muted-foreground">
            {rightPanel.lessonBrief}
          </p>
        </div>

        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-foreground/90">
            <ListChecks className="h-3.5 w-3.5 text-brand" />
            跟着做
          </div>
          <div className="mt-3 space-y-2">
            {rightPanel.practiceSteps.map((step, index) => (
              <div
                key={`${step}-${index}`}
                className="flex gap-2 text-sm leading-6 text-muted-foreground"
              >
                <span className="flex mt-0.5 h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand/15 text-[11px] font-semibold text-brand">
                  {index + 1}
                </span>
                <span>{step}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-[1.25rem] border border-border/80 bg-surface-1/80 p-4 lg:col-span-2">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-foreground/90">
            <ClipboardCheck className="h-3.5 w-3.5 text-brand" />
            提交说明
          </div>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            {rightPanel.submissionGuide}
          </p>
          {rightPanel.checkpoints.length > 0 ? (
            <div className="mt-3 flex flex-wrap gap-2">
              {rightPanel.checkpoints.map((checkpoint) => (
                <span
                  key={checkpoint}
                  className="inline-flex items-center gap-1 rounded-full border border-border/70 bg-surface-2 px-2.5 py-1 text-xs text-muted-foreground"
                >
                  <CheckCircle2 className="h-3 w-3 text-brand" />
                  {checkpoint}
                </span>
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
