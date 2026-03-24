"use client"

import { AppShell } from "@/components/layout/app-shell"
import { DashboardSidebar } from "@/components/layout/dashboard-sidebar"
import { getDashboardNavItems } from "@/constants/navigation"
import { ROUTES } from "@/constants/routes"
import { LearnChat } from "@/features/learning/components/chat"
import { LearnRightPanel } from "@/features/learning/components/right-panel"

export function LearnPage() {
  return (
    <AppShell
      mobileTitle="学习工作台"
      mobileSubtitle="AI 教练 · 当前任务 · 任务上下文"
      asideLabel="任务上下文"
      renderSidebar={({ mobile }) => (
        <DashboardSidebar
          items={getDashboardNavItems(ROUTES.learn)}
          widthClass={mobile ? "w-full" : "w-72"}
        />
      )}
      renderAside={() => <LearnRightPanel />}
      asideClassName="xl:w-[22rem]"
    >
      <LearnChat />
    </AppShell>
  )
}
