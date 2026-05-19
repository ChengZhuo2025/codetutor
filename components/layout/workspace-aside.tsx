import type { ElementType, ReactNode } from "react"
import { cn } from "@/lib/utils"

export const WORKSPACE_ASIDE_CARD_CLASS =
  "rounded-[28px] border border-border/70 bg-surface-1/95 px-4 py-4 shadow-[0_18px_42px_-30px_rgba(15,23,42,0.2)] ring-1 ring-black/[0.03] dark:border-white/10 dark:bg-white/5 dark:ring-white/6 sm:px-5"
export const WORKSPACE_ASIDE_BRAND_CARD_CLASS =
  "rounded-[28px] border border-brand/22 bg-[linear-gradient(180deg,rgba(243,251,248,0.96),rgba(236,247,243,0.94))] px-4 py-4 shadow-[0_20px_50px_-34px_rgba(15,23,42,0.22)] ring-1 ring-black/[0.03] dark:border-brand/22 dark:bg-[linear-gradient(135deg,rgba(31,198,164,0.16),rgba(10,19,26,0.96))] dark:ring-white/6 sm:px-5"
export const WORKSPACE_ASIDE_GOLD_CARD_CLASS =
  "rounded-[28px] border border-gold/22 bg-[linear-gradient(180deg,rgba(255,249,239,0.98),rgba(250,244,227,0.95))] px-4 py-4 shadow-[0_20px_50px_-34px_rgba(15,23,42,0.22)] ring-1 ring-black/[0.03] dark:border-gold/20 dark:bg-[linear-gradient(135deg,rgba(225,168,75,0.16),rgba(28,20,10,0.96))] dark:ring-white/6 sm:px-5"
export const WORKSPACE_ASIDE_INSET_CARD_CLASS =
  "rounded-2xl border border-border/70 bg-surface-1 px-4 pt-3 pb-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.72)] dark:border-border dark:bg-surface-3 dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.1)]"

type WorkspaceAsideProps = {
  children: ReactNode
  className?: string
  as?: ElementType
}

export function WorkspaceAside({
  children,
  className,
  as: Component = "aside",
}: WorkspaceAsideProps) {
  return (
    <Component
      className={cn(
        "flex h-full min-h-0 flex-col gap-4 overflow-y-auto scrollbar-none p-5 bg-surface-1",
        className,
      )}
    >
      {children}
    </Component>
  )
}
