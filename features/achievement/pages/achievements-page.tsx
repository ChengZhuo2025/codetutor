"use client"

import { getDashboardNavItems } from "@/constants/navigation"
import { ROUTES } from "@/constants/routes"
import {
  DashboardSidebar,
} from "@/components/layout/dashboard-sidebar"
import {
  badges,
  calendarDates,
  checkinDays,
  currentRankIdx,
  currentXP,
  ranks,
  stats,
  weekDays,
  xpGuideItems,
  xpHistory,
} from "@/features/achievement/data/achievement-data"
import { AchievementSidebarPanels } from "@/features/achievement/components/achievement-sidebar-panels"
import { AchievementStatsGrid } from "@/features/achievement/components/achievement-stats-grid"
import { BadgeGrid } from "@/features/achievement/components/badge-grid"
import { CheckinCalendar } from "@/features/achievement/components/checkin-calendar"
import { RankProgressCard } from "@/features/achievement/components/rank-progress-card"

export function AchievementsPage() {
  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <DashboardSidebar items={getDashboardNavItems(ROUTES.achievements)} widthClass="w-64" />

      <main className="flex-1 overflow-y-auto">
        <div className="border-b border-border/50 bg-surface-1/80 px-8 py-5 backdrop-blur-sm">
          <h1 className="text-xl font-bold tracking-tight">个人成就</h1>
          <p className="text-sm text-muted-foreground">你的学习轨迹与成长记录</p>
        </div>

        <div className="flex flex-1 overflow-hidden">
          <div className="min-w-0 flex-1 space-y-6 overflow-y-auto px-8 py-8">
            <RankProgressCard
              currentXP={currentXP}
              currentRankIdx={currentRankIdx}
              ranks={ranks}
            />
            <AchievementStatsGrid stats={stats} />
            <CheckinCalendar
              weekDays={weekDays}
              checkinDays={checkinDays}
              calendarDates={calendarDates}
            />
            <BadgeGrid badges={badges} />
          </div>

          <AchievementSidebarPanels
            guideItems={xpGuideItems}
            historyItems={xpHistory}
          />
        </div>
      </main>
    </div>
  )
}
