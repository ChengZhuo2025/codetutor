import type { AuthPreviewStep } from "@/features/auth/types"

export type AuthLoginType = "phone" | "wechat"

export type AuthLoginRequest = {
  loginType: AuthLoginType
  authCode?: string
}

export type AuthLoginResponseData = {
  userId: string
  isNewUser: boolean
  onboardingCompleted: boolean
  profileCompleted: boolean
  redirectTo: string
}

export type ProfileToolContract = {
  code: string
  name: string
}

export type ProfileMeResponseData = {
  userId: string
  nickname: string
  primaryTool: ProfileToolContract
  learningLevel: string
  currentScore: number
  currentRank: string
  streakDays: number
  completedTaskCount: number
  lastLearningAt: string
}

export type AuthPreviewContract = {
  previewTools: string[]
  previewSteps: AuthPreviewStep[]
  resumeTitle: string
  resumeSummary: string
}
