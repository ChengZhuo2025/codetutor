import { LearnChat } from "@/features/learning/components/chat"
import { LearnRightPanel } from "@/features/learning/components/right-panel"
import { LearnSidebar } from "@/features/learning/components/sidebar"

export function LearnPage() {
  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <LearnSidebar />
      <LearnChat />
      <LearnRightPanel />
    </div>
  )
}
