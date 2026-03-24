"use client"

import { AppShell } from "@/components/layout/app-shell"
import { LearnChat } from "@/features/learning/components/chat"
import { LearnRightPanel } from "@/features/learning/components/right-panel"
import { LearnSidebar } from "@/features/learning/components/sidebar"

export function LearnPage() {
  return (
    <AppShell
      mobileTitle="学习工作台"
      mobileSubtitle="AI 教练 · 当前任务 · 任务上下文"
      asideLabel="任务上下文"
      renderSidebar={({ mobile }) => <LearnSidebar mobile={mobile} />}
      renderAside={() => <LearnRightPanel />}
      asideClassName="xl:w-[22rem]"
    >
      <LearnChat />
    </AppShell>
  )
}
