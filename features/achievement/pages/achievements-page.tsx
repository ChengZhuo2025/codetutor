"use client"

import { useRouter } from "next/navigation"
import { APP_EVENTS } from "@/constants/events"
import { getDashboardNavItems } from "@/constants/navigation"
import { ROUTES } from "@/constants/routes"
import { AppShell } from "@/components/layout/app-shell"
import { DashboardSidebar } from "@/components/layout/dashboard-sidebar"
import { StatePanel } from "@/components/ui/state-panel"
import { AchievementSidebarPanels } from "@/features/achievement/components/achievement-sidebar-panels"
import { AchievementStatsGrid } from "@/features/achievement/components/achievement-stats-grid"
import { BadgeGrid } from "@/features/achievement/components/badge-grid"
import { CheckinCalendar } from "@/features/achievement/components/checkin-calendar"
import { RankProgressCard } from "@/features/achievement/components/rank-progress-card"
import { getAchievementPageMock } from "@/lib/api/mock"
import type { ApiRequestState } from "@/types/api"
import { useAppEventTracker } from "@/providers/app-providers"

export function AchievementsPage() {
  const router = useRouter()
  const { trackEvent } = useAppEventTracker()
  const achievementPayload = getAchievementPageMock()
  const achievementState: ApiRequestState<typeof achievementPayload> =
    achievementPayload.stats.length > 0 &&
    achievementPayload.badges.length > 0 &&
    achievementPayload.ranks.length > 0
      ? { status: "success", data: achievementPayload }
      : {
          status: "empty",
          message: "当前还没有可展示的成长数据。开始学习并完成第一关后，这里会展示 XP、段位和徽章积累。",
        }

  if (achievementState.status !== "success") {
    return (
      <AppShell
        mobileTitle="个人成就"
        mobileSubtitle="等待成长数据"
        asideLabel="XP 流水"
        renderSidebar={({ mobile }) => (
          <DashboardSidebar
            items={getDashboardNavItems(ROUTES.achievements)}
            widthClass={mobile ? "w-full" : "w-72"}
          />
        )}
        renderAside={() => (
          <div className="p-6">
            <StatePanel
              status={achievementState.status}
              title="成长侧栏暂不可用"
              description={achievementState.message}
              compact
            />
          </div>
        )}
        asideClassName="xl:w-[22rem]"
      >
        <main className="flex-1 p-4 sm:p-6">
          <StatePanel
            status={achievementState.status}
            title="还没有成长数据"
            description={achievementState.message}
            actionLabel="去学习页积累第一批 XP"
            onAction={() => router.push(ROUTES.learn)}
          />
        </main>
      </AppShell>
    )
  }

  const achievementData = achievementState.data
  const handleContinueLearning = () => {
    trackEvent(APP_EVENTS.achievementCtaClick, {
      cta: "continue_learning",
      target: ROUTES.learn,
    })
    router.push(ROUTES.learn)
  }
  const handleOpenMap = () => {
    trackEvent(APP_EVENTS.achievementCtaClick, {
      cta: "open_map",
      target: ROUTES.map,
    })
    router.push(ROUTES.map)
  }

  return (
    <AppShell
      mobileTitle="个人成就"
      mobileSubtitle="XP、段位、连续学习与徽章成长"
      asideLabel="XP 流水"
      renderSidebar={({ mobile }) => (
        <DashboardSidebar
          items={getDashboardNavItems(ROUTES.achievements)}
          widthClass={mobile ? "w-full" : "w-72"}
        />
      )}
      renderAside={() => (
        <AchievementSidebarPanels
          guideItems={achievementData.guideItems}
          historyItems={achievementData.history}
        />
      )}
      asideClassName="xl:w-[22rem]"
    >
      <main className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <div className="shrink-0 border-b border-border/50 bg-surface-1/80 px-4 py-5 backdrop-blur-sm sm:px-8">
          <h1 className="text-2xl font-bold tracking-tight">个人成就</h1>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">
            这里不是静态数据看板，而是你从当前学习路径里真实累积出来的成长反馈。
          </p>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto scrollbar-none px-4 py-6 sm:px-8 sm:py-8">
          <RankProgressCard
            currentXP={achievementData.currentXP}
            currentRankIdx={achievementData.currentRankIdx}
            ranks={achievementData.ranks}
            overview={achievementData.overview}
            onContinueLearning={handleContinueLearning}
            onOpenMap={handleOpenMap}
          />

          <div className="mt-6 grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
            <div className="space-y-6">
              <AchievementStatsGrid stats={achievementData.stats} />
              <BadgeGrid badges={achievementData.badges} />
            </div>

            <div className="space-y-6">
              <CheckinCalendar
                weekDays={achievementData.weekDays}
                checkinDays={achievementData.checkinDays}
                calendarDates={achievementData.calendarDates}
                streakDays={achievementData.overview.streakDays}
                monthlyXP={achievementData.overview.monthlyXP}
              />
            </div>
          </div>
        </div>
      </main>
    </AppShell>
  )
}
