"use client"

import type { ReactElement } from "react"
import Image from "next/image"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useState } from "react"
import { ChevronDown, ChevronRight, PanelLeftClose, PanelLeft } from "lucide-react"
import { ADMIN_ROUTES } from "@/constants/routes"
import { menuItems, brandIcon } from "../data/menu-config"
import type { MenuItem } from "../types"
import { cn } from "@/lib/utils"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { useAdminSession } from "./admin-shell-client"
import { canAccessAdminAI } from "@/features/admin-ai/lib/access"
import { usePublicSite } from "@/features/site/providers/public-site-provider"
import {
  getNextExpandedAdminMenuHref,
  getRenderedExpandedAdminMenuHref,
  isAdminMenuItemActive,
} from "../lib/sidebar-menu"

const BrandIcon = brandIcon

const navItemBase =
  "flex items-center rounded-lg text-sm font-medium transition-[color,background-color,box-shadow] duration-150 ease-out outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-sidebar"

type AdminSidebarProps = {
  collapsed: boolean
  onToggleCollapsed: () => void
}

function withCollapsedTooltip(collapsed: boolean, label: string, node: ReactElement) {
  if (!collapsed) {
    return node
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>{node}</TooltipTrigger>
      <TooltipContent side="right" sideOffset={10} className="font-medium">
        {label}
      </TooltipContent>
    </Tooltip>
  )
}

export function AdminSidebar({ collapsed, onToggleCollapsed }: AdminSidebarProps) {
  const pathname = usePathname()
  const { session } = useAdminSession()
  const { site } = usePublicSite()
  const { information } = site
  const [manualExpandedItemHref, setManualExpandedItemHref] = useState<string | null | undefined>(undefined)
  const aiAccessible = canAccessAdminAI(session.roles)

  function renderMenuItems(items: MenuItem[], level = 0, siblings = items) {
    const activeExpandableHref = items.find((item) => (
      Boolean(item.children?.length) && isAdminMenuItemActive(item, pathname, siblings)
    ))?.href ?? null
    const expandedItemHref = getRenderedExpandedAdminMenuHref(manualExpandedItemHref, activeExpandableHref)

    return items.map((item) => {
      const isActive = isAdminMenuItemActive(item, pathname, siblings)
      const Icon = item.icon

      if (!item.active && item.href !== ADMIN_ROUTES.home) {
        return null
      }

      if ((item.href === ADMIN_ROUTES.ai || item.href.startsWith(`${ADMIN_ROUTES.ai}/`)) && !aiAccessible) {
        return null
      }

      if (item.children?.length) {
        const expanded = expandedItemHref === item.href
        const parentLink = (
          <button
            type="button"
            onClick={() => {
              setManualExpandedItemHref((current) => {
                const renderedCurrent = getRenderedExpandedAdminMenuHref(current, activeExpandableHref)

                return getNextExpandedAdminMenuHref(renderedCurrent, item.href)
              })
            }}
            className={cn(
              navItemBase,
              "w-full text-sidebar-foreground",
              collapsed ? "min-h-10 justify-center px-0 py-2" : "gap-2.5 px-3 py-2.5",
              level > 0 && !collapsed && "py-2 text-xs",
              "hover:bg-sidebar-accent/90 hover:text-sidebar-accent-foreground",
              isActive && "bg-sidebar-accent text-sidebar-accent-foreground",
            )}
            aria-expanded={expanded}
          >
            <Icon className={cn("shrink-0 opacity-90", level > 0 ? "size-3.5" : "size-4")} />
            {!collapsed ? (
              <>
                <span className="min-w-0 flex-1 text-left">{item.label}</span>
                {expanded
                  ? <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
                  : <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
                }
              </>
            ) : null}
          </button>
        )

        return (
          <li key={item.href}>
            {withCollapsedTooltip(collapsed, item.label, parentLink)}
            {expanded ? (
              <ul
                className={cn(
                  "mt-1 space-y-0.5 border-sidebar-border/80",
                  collapsed ? "border-l-0 pl-0" : "ml-2.5 border-l-2 border-l-primary/15 pl-3",
                )}
              >
                {renderMenuItems(item.children, level + 1, item.children)}
              </ul>
            ) : null}
          </li>
        )
      }

      const link = (
        <Link
          href={item.href}
          className={cn(
            navItemBase,
            level > 0 ? "text-muted-foreground" : "text-sidebar-foreground",
            collapsed ? "min-h-10 justify-center px-0 py-2" : "gap-2.5 px-3 py-2.5",
            level > 0 && !collapsed && "gap-2 px-2 py-2 text-xs",
            "hover:bg-sidebar-accent/90 hover:text-sidebar-accent-foreground",
            isActive
              && (level > 0
                ? "bg-primary/12 font-semibold text-primary ring-1 ring-primary/15"
                : "bg-primary/[0.14] font-semibold text-primary ring-1 ring-primary/20"),
          )}
        >
          <Icon
            className={cn(
              "shrink-0",
              level > 0 ? "size-3.5" : "size-4",
              isActive ? "text-primary" : "opacity-90",
            )}
            aria-hidden
          />
          {!collapsed ? <span className="truncate">{item.label}</span> : null}
        </Link>
      )

      return (
        <li key={item.href}>
          {withCollapsedTooltip(collapsed, item.label, link)}
        </li>
      )
    })
  }

  return (
    <aside
      className={cn(
        "flex shrink-0 flex-col border-r border-sidebar-border/80 bg-sidebar",
        "transition-[width] duration-200 ease-[cubic-bezier(0.33,1,0.68,1)]",
        collapsed ? "w-[72px]" : "w-56",
      )}
    >
      {/* Brand */}
      <div
        className={cn(
          "flex h-14 shrink-0 items-center border-b border-sidebar-border bg-sidebar/50",
          collapsed ? "justify-center px-2" : "gap-2.5 px-3.5",
        )}
      >
        <div className="flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-primary text-primary-foreground">
          {information.logoUrl ? (
            <Image
              src={information.logoUrl}
              alt={`${information.siteName} logo`}
              width={36}
              height={36}
              className="h-full w-full object-contain"
              unoptimized
            />
          ) : (
            <BrandIcon className="size-4.5" aria-hidden />
          )}
        </div>
        {!collapsed ? (
          <div className="min-w-0 flex-1">
            <p className="truncate text-md font-semibold tracking-tight text-sidebar-foreground">{information.siteName}</p>
            <p className="truncate text-[10px] leading-tight text-muted-foreground">系统管理后台 v{information.version} Beta</p>
          </div>
        ) : null}
      </div>

      <nav
        className={cn(
          "min-h-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-contain",
          collapsed ? "px-2 py-3" : "px-2.5 py-3",
        )}
        aria-label="管理后台主导航"
      >
        <ul className="space-y-1">
          {renderMenuItems(menuItems)}
        </ul>
      </nav>

      {/* Footer: brand + collapse */}
      <div className="shrink-0 border-t border-sidebar-border/70 bg-sidebar/40 p-2">
        <div
          className={cn(
            "flex min-h-10 items-center",
            collapsed ? "justify-center" : "justify-between gap-2",
          )}
        >
          {!collapsed ? (
            <span className="min-w-0 pl-2 truncate text-xs leading-tight text-muted-foreground">
              {information.copyright}
            </span>
          ) : null}
          <button
            type="button"
            onClick={onToggleCollapsed}
            className={cn(
              "flex shrink-0 items-center justify-center rounded-lg border border-transparent",
              "text-muted-foreground transition-[color,background-color,border-color,box-shadow] duration-150",
              "hover:border-border/60 hover:bg-sidebar-accent/70 hover:text-sidebar-foreground",
              "active:bg-sidebar-accent/90",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-sidebar",
              "size-10",
            )}
            title={collapsed ? "展开侧栏" : "收起侧栏"}
            aria-expanded={!collapsed}
            aria-label={collapsed ? "展开侧栏" : "收起侧栏"}
          >
            {collapsed ? (
              <PanelLeft className="size-4 shrink-0" aria-hidden />
            ) : (
              <PanelLeftClose className="size-4 shrink-0" aria-hidden />
            )}
          </button>
        </div>
      </div>
    </aside>
  )
}
