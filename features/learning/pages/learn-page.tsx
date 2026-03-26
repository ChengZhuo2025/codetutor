"use client"

import { AppShell } from "@/components/layout/app-shell"
import { WorkspaceSidebar } from "@/components/layout/workspace-sidebar"
import { ROUTES } from "@/constants/routes"
import { LearnChat } from "@/features/learning/components/chat"
import { LearnRightPanel } from "@/features/learning/components/right-panel"

export function LearnPage() {
  return (
    <AppShell
      mobileTitle="学习工作台"
      mobileSubtitle="继续上次学习 · 当前一步 · 任务上下文"
      asideLabel="任务上下文"
      renderSidebar={({ mobile }) => (
        <WorkspaceSidebar activeHref={ROUTES.learn} mobile={mobile} />
      )}
      renderAside={() => <LearnRightPanel />}
      asideClassName="xl:w-[21rem]"
    >
      <LearnChat />
    </AppShell>
  )
}
