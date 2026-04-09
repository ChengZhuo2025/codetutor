"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { APP_EVENTS } from "@/constants/events"
import { ROUTES } from "@/constants/routes"
import { WORKSPACE_ASIDE_WIDTH_CLASS } from "@/constants/workspace-layout"
import { AppShell } from "@/components/layout/app-shell"
import { WorkspaceSidebar } from "@/components/layout/workspace-sidebar"
import { StatePanel } from "@/components/ui/state-panel"
import { AchievementSidebarPanels } from "@/features/achievement/components/achievement-sidebar-panels"
import { AchievementStatsGrid } from "@/features/achievement/components/achievement-stats-grid"
import { BadgeGrid } from "@/features/achievement/components/badge-grid"
import { CheckinCalendar } from "@/features/achievement/components/checkin-calendar"
import { RankProgressCard } from "@/features/achievement/components/rank-progress-card"
import {
  buildAchievementGuideItems,
  buildAchievementStats,
  toAchievementBadges,
  toAchievementRanks,
} from "@/features/achievement/data/achievement-data"
import { resolveAuthenticatedRedirectTo } from "@/lib/auth/client-session"
import { apiClient, requestData } from "@/lib/api/client"
import type { AchievementSummaryResponseData } from "@/lib/api/contracts/achievement"
import type { CheckinDailyResponseData } from "@/lib/api/contracts/checkin"
import type { ApiRequestState } from "@/types/api"
import { useAppEventTracker } from "@/providers/app-providers"

export function AchievementsPage() {
  const router = useRouter()
  const { trackEvent } = useAppEventTracker()
  const [emptyAction, setEmptyAction] = useState<{
    href: string
    label: string
  }>({
    href: ROUTES.learn,
    label: "去学习页积累第一批 XP",
  })
  const [achievementState, setAchievementState] =
    useState<ApiRequestState<AchievementSummaryResponseData>>({
      status: "loading",
    })
  const [isSubmittingCheckin, setIsSubmittingCheckin] = useState(false)
  const [checkinMessage, setCheckinMessage] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function loadAchievementSummary() {
      const response = await apiClient.get<AchievementSummaryResponseData>("/achievement/summary")

      if (cancelled) {
        return
      }

      if (response.code === "OK") {
        const data = response.data
        if (data.ranks.length > 0 && data.badges.length > 0) {
          setAchievementState({
            status: "success",
            data,
          })
          return
        }

        setAchievementState({
          status: "empty",
          message:
            "当前还没有可展示的成长数据。开始学习并完成第一关后，这里会展示 XP、段位和徽章积累。",
        })
        return
      }

      if (response.code === "AUTH_REQUIRED") {
        router.replace(ROUTES.login)
        return
      }

      if (response.code === "NOT_FOUND") {
        const redirectTo = await resolveAuthenticatedRedirectTo()

        if (cancelled) {
          return
        }

        if (redirectTo === ROUTES.history) {
          setEmptyAction({
            href: ROUTES.history,
            label: "去学习计划页",
          })
        } else if (redirectTo === ROUTES.onboarding) {
          setEmptyAction({
            href: ROUTES.onboarding,
            label: "去创建学习计划",
          })
        }

        setAchievementState({
          status: "empty",
          message:
            redirectTo === ROUTES.history
              ? "当前没有新的成长数据，可以先回到历史计划中继续或新建学习计划。"
              : response.message,
        })
        return
      }

      setAchievementState({
        status: "error",
        message: response.message,
      })
    }

    void loadAchievementSummary()

    return () => {
      cancelled = true
    }
  }, [router])

  const reloadAchievementSummary = async () => {
    const response = await apiClient.get<AchievementSummaryResponseData>("/achievement/summary")

    if (response.code === "OK") {
      setAchievementState({
        status: "success",
        data: response.data,
      })
    }
  }

  if (achievementState.status !== "success") {
    return (
      <AppShell
        workspacePage="achievements"
        mobileTitle="我的学习成就"
        mobileSubtitle="等待成长数据"
        asideLabel="XP 流水"
        renderSidebar={({ mobile }) => (
          <WorkspaceSidebar activeHref={ROUTES.achievements} mobile={mobile} />
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
        asideClassName={WORKSPACE_ASIDE_WIDTH_CLASS}
      >
        <main className="flex-1 p-4 sm:p-6">
          <StatePanel
            status={achievementState.status}
            title="还没有成长数据"
            description={achievementState.message}
            actionLabel={emptyAction.label}
            onAction={() => router.push(emptyAction.href)}
          />
        </main>
      </AppShell>
    )
  }

  const summary = achievementState.data
  const ranks = toAchievementRanks(summary.ranks)
  const badges = toAchievementBadges(summary.badges)
  const stats = buildAchievementStats(summary)
  const guideItems = buildAchievementGuideItems()
  const historyItems = summary.history.map((item) => ({
    ...item,
    xp: `+${item.xp}`,
  }))
  const currentRankIdx = summary.ranks.findIndex(
    (rank) => rank.code === summary.currentRankCode,
  )

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

  const handleDailyCheckin = async () => {
    if (achievementState.status !== "success" || achievementState.data.checkedInToday || isSubmittingCheckin) {
      return
    }

    setIsSubmittingCheckin(true)
    setCheckinMessage(null)

    try {
      const data = await requestData<CheckinDailyResponseData>("/checkin/daily", {
        method: "POST",
      })

      trackEvent(APP_EVENTS.dailyCheckin, {
        source: ROUTES.achievements,
        alreadyCheckedIn: data.alreadyCheckedIn,
        scoreDelta: data.scoreDelta,
        streakDays: data.streakDays,
      })

      setCheckinMessage(
        data.alreadyCheckedIn
          ? "今天已经打过卡了。"
          : `打卡成功，获得 +${data.scoreDelta} XP，当前连续 ${data.streakDays} 天。`,
      )

      await reloadAchievementSummary()
    } catch (error) {
      setCheckinMessage(error instanceof Error ? error.message : "打卡失败，请稍后重试。")
    } finally {
      setIsSubmittingCheckin(false)
    }
  }

  return (
    <AppShell
      workspacePage="achievements"
      mobileTitle="我的学习成就"
      mobileSubtitle="XP、段位、连续学习与徽章成长"
      asideLabel="XP 流水"
      renderSidebar={({ mobile }) => (
        <WorkspaceSidebar activeHref={ROUTES.achievements} mobile={mobile} />
      )}
      renderAside={() => (
        <AchievementSidebarPanels
          guideItems={guideItems}
          historyItems={historyItems}
          totalXP={summary.overview.totalXP}
        />
      )}
      asideClassName={WORKSPACE_ASIDE_WIDTH_CLASS}
    >
      <main className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <div className="shrink-0 border-b border-border/50 bg-[linear-gradient(180deg,rgba(255,255,255,0.9),rgba(247,249,251,0.82))] px-4 py-5 shadow-[0_14px_38px_-34px_rgba(15,23,42,0.24)] backdrop-blur-sm dark:bg-[linear-gradient(180deg,oklch(0.19_0.012_250/0.92),oklch(0.16_0.01_250/0.82))] sm:px-6">
          <h1 className="text-2xl font-bold tracking-tight">我的学习成就</h1>
          <p className="mt-1 text-sm leading-5 text-muted-foreground">
            你在学习路径中真实积累的 XP、段位和徽章记录。
          </p>
          {checkinMessage ? (
            <p className="mt-2 text-sm text-brand">{checkinMessage}</p>
          ) : null}
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto scrollbar-none px-4 py-4 sm:px-5 sm:py-5">
          <RankProgressCard
            currentXP={summary.currentScore}
            currentRankIdx={currentRankIdx >= 0 ? currentRankIdx : 0}
            ranks={ranks}
            overview={summary.overview}
            onContinueLearning={handleContinueLearning}
            onOpenMap={handleOpenMap}
          />

          <div className="mt-6 space-y-6">
            <AchievementStatsGrid stats={stats} />

            <CheckinCalendar
              weekDays={summary.calendar.weekDays}
              checkinDays={summary.calendar.checkins}
              calendarDates={summary.calendar.dates}
              streakDays={summary.overview.streakDays}
              monthlyXP={summary.overview.monthlyXP}
              totalCheckinDays={summary.overview.totalCheckinDays}
              checkedInToday={summary.checkedInToday}
              isSubmitting={isSubmittingCheckin}
              onCheckIn={handleDailyCheckin}
            />

            <BadgeGrid badges={badges} />
          </div>
        </div>
      </main>
    </AppShell>
  )
}
