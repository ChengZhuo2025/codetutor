"use client"

import Link from "next/link"
import { Code2 } from "lucide-react"
import { APP_NAME } from "@/constants/app"
import { SettingsPopover } from "@/components/ui/settings-popover"
import { cn } from "@/lib/utils"
import type { DashboardNavItem } from "@/types/navigation"

type DashboardSidebarProps = {
  items: DashboardNavItem[]
  widthClass?: string
  showSettings?: boolean
}

export function DashboardSidebar({
  items,
  widthClass = "w-64",
  showSettings = true,
}: DashboardSidebarProps) {
  return (
    <aside
      className={cn(
        "flex h-screen shrink-0 flex-col border-r border-border/50 bg-sidebar",
        widthClass,
      )}
    >
      <div className="flex h-16 items-center gap-2.5 border-b border-border/50 px-5">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand text-brand-foreground">
          <Code2 className="h-4 w-4" />
        </div>
        <span className="font-semibold">{APP_NAME}</span>
      </div>

      <nav className="mt-4 flex-1 space-y-1 px-3">
        {items.map((item) => {
          const Icon = item.icon

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                item.active
                  ? "bg-brand-dim text-brand"
                  : "text-muted-foreground hover:bg-surface-3 hover:text-foreground",
              )}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          )
        })}
      </nav>

      {showSettings && (
        <div className="border-t border-border/50 p-4">
          <SettingsPopover />
        </div>
      )}
    </aside>
  )
}
