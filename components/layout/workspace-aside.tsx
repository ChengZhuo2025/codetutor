import type { ElementType, ReactNode } from "react"
import { cn } from "@/lib/utils"

export const WORKSPACE_ASIDE_CARD_CLASS =
  "rounded-[28px] border border-border/60 bg-surface-2 px-4 py-4 sm:px-5"
export const WORKSPACE_ASIDE_BRAND_CARD_CLASS =
  "rounded-[28px] border border-brand/20 bg-brand-dim/55 px-4 py-4 sm:px-5"
export const WORKSPACE_ASIDE_GOLD_CARD_CLASS =
  "rounded-[28px] border border-gold/20 bg-gold-dim px-4 py-4 sm:px-5"
export const WORKSPACE_ASIDE_INSET_CARD_CLASS =
  "rounded-2xl border border-border/50 bg-background/55 px-4 pt-3 pb-4"

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
        "flex h-full min-h-0 flex-col gap-4 overflow-y-auto scrollbar-none p-5",
        className,
      )}
    >
      {children}
    </Component>
  )
}
