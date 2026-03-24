import { mockAuthPreviewResponse, mockProfileMeResponse } from "@/features/auth/data/login-data"
import {
  mockAchievementHistoryResponse,
  mockAchievementSummaryResponse,
} from "@/features/achievement/data/achievement-data"
import { mockLearningCurrentSessionResponse } from "@/features/learning/data/learning-content"
import {
  colorMap,
  mockOnboardingInitialPathResponse,
  mockOnboardingToolsResponse,
  onboardingPresets,
  selectedBorderMap,
} from "@/features/onboarding/data/onboarding-data"
import {
  mockProgressCurrentResponse,
  mockProgressMapResponse,
} from "@/features/progress/data/map-data"
import { unwrapResponse } from "@/lib/api/types"
import type { UserProfileSnapshot } from "@/types/profile"

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
  const initialPath = unwrapResponse(mockOnboardingInitialPathResponse)
  const toolCards = toolsResponse.groups.flatMap((group) =>
    group.tools.map((tool) => ({
      id: tool.id,
      name: tool.name,
      category: tool.category,
      desc: tool.summary,
      popular: tool.popular,
      color: tool.color,
    })),
  )

  return {
    levels: onboardingPresets.levels,
    tools: toolCards,
    initialPreview: initialPath.initialPreview,
    colorMap,
    selectedBorderMap,
  }
}

export function getLearningPageMock() {
  const session = unwrapResponse(mockLearningCurrentSessionResponse)

  return {
    profile: toUserProfileSnapshot(),
    conversationId: session.conversationId,
    task: session.task,
    mission: session.mission,
    initialMessages: session.messages,
    quickActions: session.quickActions,
    aiResponses: session.responseSamples,
    rightPanel: session.rightPanel,
    recentSessions: session.recentHistory,
    learningTasks: session.tasks,
    learningKnowledgeTags: session.knowledgeTags,
    learningTips: session.tips,
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
  const history = unwrapResponse(mockAchievementHistoryResponse)
  const currentRankIdx = summary.ranks.findIndex((rank) => rank.name === summary.currentRank)

  return {
    summary,
    history: history.items,
    currentXP: summary.currentScore,
    currentRankIdx: currentRankIdx >= 0 ? currentRankIdx : 0,
    ranks: summary.ranks,
    badges: summary.badges,
    stats: summary.stats,
    guideItems: summary.guideItems,
    calendarDates: summary.calendar.dates,
    checkinDays: summary.calendar.checkins,
    weekDays: summary.calendar.weekDays,
    overview: summary.overview,
  }
}
