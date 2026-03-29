"use client"

import { useEffect, useState } from "react"
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
import type {
  ProgressCurrentResponseData,
  ProgressMapResponseData,
} from "@/lib/api/contracts/progress"
import { requestData } from "@/lib/api/client"
import type { ApiRequestState } from "@/types/api"
import { useAppEventTracker } from "@/providers/app-providers"

export function MapPage() {
  const router = useRouter()
  const { trackEvent } = useAppEventTracker()
  const [progressState, setProgressState] = useState<
    ApiRequestState<{
      current: ProgressCurrentResponseData
      map: ProgressMapResponseData
    }>
  >({
    status: "loading",
  })
  const [selectedId, setSelectedId] = useState<number>(0)

  useEffect(() => {
    let cancelled = false

    async function loadProgress() {
      try {
        const [current, map] = await Promise.all([
          requestData<ProgressCurrentResponseData>("/progress/current"),
          requestData<ProgressMapResponseData>("/progress/map"),
        ])

        if (cancelled) {
          return
        }

        if (map.stages.length === 0) {
          setProgressState({
            status: "empty",
            message: "当前还没有激活的学习路径。完成 onboarding 后，这里会显示你的主线计划。",
          })
          return
        }

        setProgressState({
          status: "success",
          data: {
            current,
            map,
          },
        })
        setSelectedId(map.currentStageId ?? map.stages[0]?.id ?? 0)
      } catch (error) {
        if (cancelled) {
          return
        }

        setProgressState({
          status: "error",
          message: error instanceof Error ? error.message : "加载当前进度失败",
        })
      }
    }

    loadProgress()

    return () => {
      cancelled = true
    }
  }, [])

  if (progressState.status !== "success") {
    return (
      <AppShell
        mobileTitle="路径地图"
        mobileSubtitle="等待当前学习计划"
        asideLabel="任务摘要"
        renderSidebar={({ mobile }) => (
          <WorkspaceSidebar activeHref={ROUTES.map} mobile={mobile} />
        )}
        renderAside={() => (
          <div className="p-6">
            <StatePanel
              status={progressState.status}
              title="当前还没有可展示的主线计划"
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
              title="还没有当前学习路径"
              description={progressState.message}
              actionLabel={progressState.status === "error" ? "重试" : "回到学习页"}
              onAction={() =>
                progressState.status === "error"
                  ? window.location.reload()
                  : router.push(ROUTES.learn)
              }
            />
          </div>
        </main>
      </AppShell>
    )
  }

  const { current, map } = progressState.data
  const currentStage =
    map.stages.find((stage) => stage.id === map.currentStageId) ??
    map.stages.find((stage) => stage.status === "current") ??
    map.stages[0]

  const done = map.completedSteps
  const total = map.totalSteps
  const selected = map.stages.find((stage) => stage.id === selectedId) ?? currentStage
  const nextStage = map.stages.find((stage) => stage.id > currentStage.id)

  return (
    <AppShell
      mobileTitle="路径地图"
      mobileSubtitle={`${map.pathName} · 第 ${currentStage.id} 关 / 共 ${total} 关`}
      asideLabel="任务摘要"
      renderSidebar={({ mobile }) => (
        <WorkspaceSidebar activeHref={ROUTES.map} mobile={mobile} />
      )}
      renderAside={() => (
        <StageDetailPanel
          stage={selected}
          onContinueLearning={() => router.push(ROUTES.learn)}
          onOpenReview={() => router.push(ROUTES.learn)}
        />
      )}
      asideClassName={WORKSPACE_ASIDE_WIDTH_CLASS}
    >
      <main className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <MapHeader
          pathName={map.pathName}
          pathSummary={map.pathSummary}
          done={done}
          total={total}
          currentStage={currentStage}
        />

        <div className="min-h-0 flex-1 overflow-y-auto scrollbar-none">
          <ProgressOverview
            done={done}
            total={total}
            summary={current.summary}
            currentStage={currentStage}
            nextStage={nextStage}
            onContinueLearning={() => router.push(ROUTES.learn)}
            onOpenAchievements={() => router.push(ROUTES.achievements)}
          />

          <div className="px-4 py-4 sm:px-6 sm:py-6">
            <PageSection
              eyebrow="闯关地图"
              title="计划全部关卡一览"
              description="展示当前学习计划中的所有关卡，已完成的关卡支持回顾复盘，未解锁关卡在完成前置关卡后自动开放。"
              bodyClassName="px-0 py-0"
            >
              <StageTimeline
                stages={map.stages}
                currentStageId={currentStage.id}
                selectedId={selectedId}
                onSelect={setSelectedId}
                onStageClick={(stage) =>
                  trackEvent(APP_EVENTS.mapStageClick, {
                    stageId: stage.id,
                    stageStatus: stage.status,
                    pathName: map.pathName,
                  })
                }
                onOpenLearning={() => router.push(ROUTES.learn)}
              />
            </PageSection>
          </div>
        </div>
      </main>
    </AppShell>
  )
}
