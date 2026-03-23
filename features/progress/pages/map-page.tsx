"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { ROUTES } from "@/constants/routes"
import { getDashboardNavItems } from "@/constants/navigation"
import {
  DashboardSidebar,
} from "@/components/layout/dashboard-sidebar"
import { progressTools, stages } from "@/features/progress/data/map-data"
import { MapHeader } from "@/features/progress/components/map-header"
import { ProgressOverview } from "@/features/progress/components/progress-overview"
import { StageDetailPanel } from "@/features/progress/components/stage-detail-panel"
import { StageTimeline } from "@/features/progress/components/stage-timeline"

export function MapPage() {
  const [activeTool, setActiveTool] = useState("cursor")
  const [selectedId, setSelectedId] = useState<number>(3)
  const router = useRouter()
  const done = stages.filter((stage) => stage.status === "done").length
  const total = stages.length
  const selected = stages.find((stage) => stage.id === selectedId) ?? stages[2]

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <DashboardSidebar
        items={getDashboardNavItems(ROUTES.map)}
        widthClass="w-56"
        showSettings={false}
      />

      <main className="flex flex-1 flex-col overflow-hidden">
        <MapHeader
          done={done}
          total={total}
          activeTool={activeTool}
          tools={progressTools}
          onToolChange={setActiveTool}
        />
        <ProgressOverview done={done} total={total} />

        <div className="flex flex-1 overflow-hidden">
          <StageTimeline
            stages={stages}
            selectedId={selectedId}
            onSelect={setSelectedId}
            onOpenLearning={() => router.push(ROUTES.learn)}
          />
          <StageDetailPanel stage={selected} />
        </div>
      </main>
    </div>
  )
}
