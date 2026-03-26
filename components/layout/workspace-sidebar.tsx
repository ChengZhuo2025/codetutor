"use client"

import { getDashboardNavItems } from "@/constants/navigation"
import { WORKSPACE_SIDEBAR_WIDTH_CLASS } from "@/constants/workspace-layout"
import { DashboardSidebar } from "@/components/layout/dashboard-sidebar"

type WorkspaceSidebarProps = {
  activeHref: string
  mobile?: boolean
}

export function WorkspaceSidebar({
  activeHref,
  mobile = false,
}: WorkspaceSidebarProps) {
  return (
    <DashboardSidebar
      items={getDashboardNavItems(activeHref)}
      widthClass={mobile ? "w-full" : WORKSPACE_SIDEBAR_WIDTH_CLASS}
    />
  )
}
