import { mockAuthPreviewResponse, mockProfileMeResponse } from "@/features/auth/data/login-data"
import {
  buildAchievementGuideItems,
  buildAchievementStats,
  mockAchievementSummaryResponse,
  toAchievementBadges,
  toAchievementRanks,
} from "@/features/achievement/data/achievement-data"
import { mockLearningCurrentSessionResponse } from "@/features/learning/data/learning-content"
import {
  colorMap,
  getMockOnboardingPathOptionsResponse,
  getOnboardingToolByCode,
  mockOnboardingToolsResponse,
  onboardingPresets,
  selectedBorderMap,
} from "@/features/onboarding/data/onboarding-data"
import type { Level } from "@/features/onboarding/types"
import {
  mockProgressCurrentResponse,
  mockProgressMapResponse,
} from "@/features/progress/data/map-data"
import { unwrapResponse } from "@/lib/api/types"
import type { SubscriptionSnapshot, UserProfileSnapshot } from "@/types/profile"

function toUserProfileSnapshot(): UserProfileSnapshot {
  const profile = unwrapResponse(mockProfileMeResponse)

  return {
    userId: profile.userId,
    nickname: profile.nickname,
    primaryToolCode: profile.primaryTool.code,
    primaryToolName: profile.primaryTool.name,
    learningLevel: profile.learningLevel,
    currentScore: profile.currentScore,
    currentRank: profile.currentRank,
    streakDays: profile.streakDays,
    completedTaskCount: profile.completedTaskCount,
    lastLearningAt: profile.lastLearningAt,
  }
}

export function getAuthPageMock() {
  return {
    profile: toUserProfileSnapshot(),
    preview: unwrapResponse(mockAuthPreviewResponse),
  }
}

export function getOnboardingPageMock() {
  const toolsResponse = unwrapResponse(mockOnboardingToolsResponse)

  return {
    levels: onboardingPresets.levels,
    tools: onboardingPresets.toolCards,
    toolGroups: toolsResponse.groups.map((group) => ({
      groupCode: group.groupCode,
      groupName: group.groupName,
      tools: group.tools.map((tool) => ({
        id: tool.id,
        code: tool.code,
        name: tool.name,
        category: tool.category,
        desc: tool.summary,
        popular: tool.popular,
        color: tool.color,
      })),
    })),
    colorMap,
    selectedBorderMap,
  }
}

export function getOnboardingPathOptionsMock(toolCode: string, learningLevel: Level) {
  return unwrapResponse(getMockOnboardingPathOptionsResponse(toolCode, learningLevel))
}

export function getOnboardingToolMock(toolCode: string) {
  return getOnboardingToolByCode(toolCode)
}

export function getLearningPageMock() {
  const session = unwrapResponse(mockLearningCurrentSessionResponse)

  return {
    profile: toUserProfileSnapshot(),
    conversationId: session.conversationId,
    task: session.task,
    planSummary: session.planSummary,
    mission: session.mission,
    initialMessages: session.messages,
    quickActions: session.quickActions,
    supportOptions: session.supportOptions,
    aiResponses: session.responseSamples,
    rightPanel: session.rightPanel,
    recentPracticeRounds: session.recentPracticeRounds,
    learningTasks: session.tasks,
    learningKnowledgeTags: session.knowledgeTags,
  }
}

export function getProgressPageMock() {
  const current = unwrapResponse(mockProgressCurrentResponse)
  const map = unwrapResponse(mockProgressMapResponse)

  return {
    current,
    map,
  }
}

export function getAchievementPageMock() {
  const summary = unwrapResponse(mockAchievementSummaryResponse)
  const currentRankIdx = summary.ranks.findIndex((rank) => rank.code === summary.currentRankCode)

  return {
    summary,
    history: summary.history.map((item) => ({
      ...item,
      xp: `+${item.xp}`,
    })),
    currentXP: summary.currentScore,
    currentRankIdx: currentRankIdx >= 0 ? currentRankIdx : 0,
    ranks: toAchievementRanks(summary.ranks),
    badges: toAchievementBadges(summary.badges),
    stats: buildAchievementStats(summary),
    guideItems: buildAchievementGuideItems(),
    calendarDates: summary.calendar.dates,
    checkinDays: summary.calendar.checkins,
    weekDays: summary.calendar.weekDays,
    overview: summary.overview,
  }
}

export function getWorkspaceSidebarMock(): {
  profile: UserProfileSnapshot
  subscription: SubscriptionSnapshot
} {
  return {
    profile: toUserProfileSnapshot(),
    subscription: {
      planName: "个人版",
      planPriceLabel: "¥39/月",
      billingCycleLabel: "按月订阅",
      expiresAt: "2026-04-21",
      remainingDays: 28,
      quotaLabel: "无限 AI 导师对话 · 历史会话保留",
      renewalHint: "将于到期前 3 天提醒你续费，避免学习记录中断。",
      primaryActionLabel: "升级套餐",
      secondaryActionLabel: "立即续费",
    },
  }
}
