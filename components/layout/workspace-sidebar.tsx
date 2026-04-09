"use client"

import { getDashboardNavItems } from "@/constants/navigation"
import {
  WORKSPACE_SIDEBAR_COLLAPSED_WIDTH_CLASS,
  WORKSPACE_SIDEBAR_WIDTH_CLASS,
} from "@/constants/workspace-layout"
import { DashboardSidebar } from "@/components/layout/dashboard-sidebar"
import { useWorkspaceLayout } from "@/providers/workspace-layout-provider"

type WorkspaceSidebarProps = {
  activeHref: string
  mobile?: boolean
}

export function WorkspaceSidebar({
  activeHref,
  mobile = false,
}: WorkspaceSidebarProps) {
  const { leftCollapsed, toggleLeftCollapsed } = useWorkspaceLayout()
  const collapsed = mobile ? false : leftCollapsed

  return (
    <DashboardSidebar
      collapsed={collapsed}
      items={getDashboardNavItems(activeHref)}
      widthClass={
        mobile
          ? "w-full"
          : collapsed
            ? WORKSPACE_SIDEBAR_COLLAPSED_WIDTH_CLASS
            : WORKSPACE_SIDEBAR_WIDTH_CLASS
      }
      onToggleCollapsed={mobile ? undefined : toggleLeftCollapsed}
    />
  )
}
