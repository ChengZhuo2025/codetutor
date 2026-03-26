"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { APP_EVENTS } from "@/constants/events"
import { ROUTES } from "@/constants/routes"
import { WORKSPACE_ASIDE_WIDTH_CLASS } from "@/constants/workspace-layout"
import { AppShell } from "@/components/layout/app-shell"
import { WorkspaceSidebar } from "@/components/layout/workspace-sidebar"
import { PageSection } from "@/components/ui/page-section"
import { StatePanel } from "@/components/ui/state-panel"
import { MapHeader } from "@/features/progress/components/map-header"
import { ProgressOverview } from "@/features/progress/components/progress-overview"
import { StageDetailPanel } from "@/features/progress/components/stage-detail-panel"
import { StageTimeline } from "@/features/progress/components/stage-timeline"
import { getProgressPageMock } from "@/lib/api/mock"
import type { ApiRequestState } from "@/types/api"
import { useAppEventTracker } from "@/providers/app-providers"

export function MapPage() {
  const router = useRouter()
  const { trackEvent } = useAppEventTracker()
  const progressPayload = getProgressPageMock()
  const progressState: ApiRequestState<typeof progressPayload> =
    progressPayload.map.stages.length > 0
      ? { status: "success", data: progressPayload }
      : {
          status: "empty",
          message: "当前还没有可展示的关卡数据。接入真实接口后，这里会显示你的学习路径与当前关卡。",
        }

  const [activeTool, setActiveTool] = useState("cursor")
  const [selectedId, setSelectedId] = useState<number>(3)

  if (progressState.status !== "success") {
    return (
      <AppShell
        mobileTitle="路径地图"
        mobileSubtitle="等待路径数据"
        asideLabel="关卡详情"
        renderSidebar={({ mobile }) => (
          <WorkspaceSidebar activeHref={ROUTES.map} mobile={mobile} />
        )}
        renderAside={() => (
          <div className="p-6">
            <StatePanel
              status={progressState.status}
              title="路径详情暂不可用"
              description={progressState.message}
              compact
            />
          </div>
        )}
        asideClassName={WORKSPACE_ASIDE_WIDTH_CLASS}
      >
        <main className="flex flex-1 items-start p-4 sm:p-6">
          <div className="w-full">
            <StatePanel
              status={progressState.status}
              title="还没有可展示的学习路径"
              description={progressState.message}
              actionLabel="回到学习页"
              onAction={() => router.push(ROUTES.learn)}
            />
          </div>
        </main>
      </AppShell>
    )
  }

  const { current, map } = progressState.data

  const done = map.stages.filter((stage) => stage.status === "done").length
  const total = map.stages.length
  const currentStage =
    map.stages.find((stage) => stage.status === "current") ?? map.stages[0]
  const selected = map.stages.find((stage) => stage.id === selectedId) ?? currentStage

  return (
    <AppShell
      mobileTitle="路径地图"
      mobileSubtitle={`已完成 ${done}/${total} 关 · 当前关卡 ${currentStage.id}`}
      asideLabel="关卡详情"
      renderSidebar={({ mobile }) => (
        <WorkspaceSidebar activeHref={ROUTES.map} mobile={mobile} />
      )}
      renderAside={() => (
        <StageDetailPanel
          stage={selected}
          onContinueLearning={() => router.push(ROUTES.learn)}
        />
      )}
      asideClassName={WORKSPACE_ASIDE_WIDTH_CLASS}
    >
      <main className="flex flex-1 flex-col overflow-hidden">
        <MapHeader
          done={done}
          total={total}
          activeTool={activeTool}
          tools={map.tools}
          summary={current.summary}
          currentStage={currentStage}
          onToolChange={setActiveTool}
        />
        <ProgressOverview
          done={done}
          total={total}
          summary={current.summary}
          currentStage={currentStage}
          onContinueLearning={() => router.push(ROUTES.learn)}
        />

        <div className="flex min-h-0 flex-1 overflow-hidden">
          <PageSection
            eyebrow="关卡地图"
            title="按当前路径逐关推进"
            description="点击关卡可查看详情，当前关卡和可开始关卡会显示明确的继续动作。"
            className="m-4 flex min-h-0 flex-1 flex-col overflow-hidden sm:m-6"
            bodyClassName="flex min-h-0 flex-1 px-0 py-0"
          >
            <StageTimeline
              stages={map.stages}
              selectedId={selectedId}
              onSelect={setSelectedId}
              onStageClick={(stage) =>
                trackEvent(APP_EVENTS.mapStageClick, {
                  stageId: stage.id,
                  stageStatus: stage.status,
                  tool: activeTool,
                })
              }
              onOpenLearning={() => router.push(ROUTES.learn)}
            />
          </PageSection>
        </div>
      </main>
    </AppShell>
  )
}
