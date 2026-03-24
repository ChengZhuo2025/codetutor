export type UserProfileSnapshot = {
  userId: string
  nickname: string
  primaryToolCode: string
  primaryToolName: string
  learningLevel: string
  currentScore: number
  currentRank: string
  streakDays: number
  completedTaskCount: number
  lastLearningAt: string
}

export type SubscriptionSnapshot = {
  planName: string
  planPriceLabel: string
  billingCycleLabel: string
  expiresAt: string
  remainingDays: number
  quotaLabel: string
  renewalHint: string
  primaryActionLabel: string
  secondaryActionLabel: string
}
