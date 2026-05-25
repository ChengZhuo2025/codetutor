"use client"

import { Menu, PanelRightOpen } from "lucide-react"
import {
  USER_BUTTON_SECONDARY_CLASS,
  USER_ICON_BUTTON_CLASS,
} from "@/components/ui/surface-styles"
import { usePublicSite } from "@/features/site/providers/public-site-provider"
import { cn } from "@/lib/utils"

type AppMobileNavProps = {
  title: string
  subtitle?: string
  mobileNavVariant?: "default" | "minimal"
  showBrand?: boolean
  onOpenSidebar: () => void
  onOpenAside?: () => void
  asideLabel?: string
}

export function AppMobileNav({
  title,
  subtitle,
  mobileNavVariant = "default",
  showBrand = true,
  onOpenSidebar,
  onOpenAside,
  asideLabel = "查看详情",
}: AppMobileNavProps) {
  const { site } = usePublicSite()

  return (
    <div
      className={cn(
        "sticky top-0 z-30 border-b border-border/50 bg-background/85 py-3 backdrop-blur-xl lg:hidden",
        mobileNavVariant === "minimal" ? "px-2" : "px-4",
      )}
    >
      <div className={cn("flex items-center justify-between", mobileNavVariant === "minimal" ? "gap-2" : "gap-3")}>
        <button
          type="button"
          onClick={onOpenSidebar}
          className={cn(
            mobileNavVariant === "minimal"
              ? "flex size-11 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-surface-2 hover:text-foreground dark:hover:bg-white/8"
              : cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl", USER_ICON_BUTTON_CLASS),
          )}
          aria-label="打开导航"
        >
          <Menu className={cn(mobileNavVariant === "minimal" ? "h-5 w-5" : "h-4 w-4")} />
        </button>

        <div className="min-w-0 flex-1">
          {showBrand ? (
            <p className="truncate text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground/70">
              {site.information.siteName}
            </p>
          ) : null}
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
            className={cn(
              mobileNavVariant === "minimal"
                ? "flex size-11 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-surface-2 hover:text-foreground dark:hover:bg-white/8"
                : cn("flex h-10 items-center gap-2 rounded-xl px-3 text-xs font-medium", USER_BUTTON_SECONDARY_CLASS),
            )}
          >
            <PanelRightOpen className={cn(mobileNavVariant === "minimal" ? "h-5 w-5" : "h-4 w-4")} />
            {mobileNavVariant === "default" ? (
              <span className="hidden sm:inline">{asideLabel}</span>
            ) : null}
          </button>
        ) : null}
      </div>
    </div>
  )
}
