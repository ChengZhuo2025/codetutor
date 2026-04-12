"use client"

import { Sparkles, X } from "lucide-react"
import { USER_BUTTON_PRIMARY_CLASS } from "@/components/ui/surface-styles"
import type { LearningResume } from "@/features/learning/types"
import { cn } from "@/lib/utils"

type LearnChatResumeCardProps = {
  resume: LearningResume
  onDismiss: () => void
  onResume: () => void
}

export function LearnChatResumeCard({
  resume,
  onDismiss,
  onResume,
}: LearnChatResumeCardProps) {
  return (
    <div className="relative rounded-[1.6rem] border border-brand/20 bg-brand/6 p-4 pr-12">
      <button
        type="button"
        aria-label="关闭继续上次学习提醒"
        onClick={onDismiss}
        className={cn(
          "absolute top-3 right-3 inline-flex h-8 w-8 items-center justify-center rounded-full border border-brand/15 bg-surface-1/88 text-muted-foreground shadow-[0_12px_28px_-24px_rgba(15,23,42,0.24)] backdrop-blur-sm transition-all duration-200 hover:border-brand/20 hover:bg-surface-1 hover:text-foreground focus-visible:ring-brand/25 dark:border-white/10 dark:bg-white/8 dark:text-white/72 dark:hover:bg-white/12 dark:hover:text-white",
        )}
      >
        <X className="h-4 w-4" />
      </button>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-brand/80">
            <Sparkles className="h-3.5 w-3.5" />
            {resume.title}
          </div>
          <p className="mt-2 text-sm leading-6 text-foreground">{resume.summary}</p>
          <p className="mt-1 text-xs text-muted-foreground">{resume.lastSeenLabel}</p>
        </div>
        <button
          type="button"
          onClick={onResume}
          className={cn("shrink-0 px-4 py-2 text-sm font-medium", USER_BUTTON_PRIMARY_CLASS)}
        >
          {resume.ctaLabel}
        </button>
      </div>
    </div>
  )
}
