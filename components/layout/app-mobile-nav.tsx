"use client"

import { Menu, PanelRightOpen } from "lucide-react"
import { APP_NAME } from "@/constants/app"

type AppMobileNavProps = {
  title: string
  subtitle?: string
  onOpenSidebar: () => void
  onOpenAside?: () => void
  asideLabel?: string
}

export function AppMobileNav({
  title,
  subtitle,
  onOpenSidebar,
  onOpenAside,
  asideLabel = "查看详情",
}: AppMobileNavProps) {
  return (
    <div className="sticky top-0 z-30 border-b border-border/50 bg-background/85 px-4 py-3 backdrop-blur-xl lg:hidden">
      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={onOpenSidebar}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-border/60 bg-surface-2 text-muted-foreground transition-colors hover:border-border hover:text-foreground"
          aria-label="打开导航"
        >
          <Menu className="h-4 w-4" />
        </button>

        <div className="min-w-0 flex-1">
          <p className="truncate text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground/70">
            {APP_NAME}
          </p>
          <h1 className="truncate text-sm font-semibold text-foreground">{title}</h1>
          {subtitle ? (
            <p className="truncate text-xs text-muted-foreground">{subtitle}</p>
          ) : null}
        </div>

        {onOpenAside ? (
          <button
            type="button"
            onClick={onOpenAside}
            aria-label={asideLabel}
            title={asideLabel}
            className="flex h-10 items-center gap-2 rounded-xl border border-border/60 bg-surface-2 px-3 text-xs font-medium text-muted-foreground transition-colors hover:border-border hover:text-foreground"
          >
            <PanelRightOpen className="h-4 w-4" />
            <span className="hidden sm:inline">{asideLabel}</span>
          </button>
        ) : null}
      </div>
    </div>
  )
}
