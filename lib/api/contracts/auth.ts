import type { AuthPreviewStep } from "@/features/auth/types"

export type AuthLoginType = "phone" | "wechat" | "douyin"

export type AuthLoginRequest = {
  loginType: AuthLoginType
}

export type AuthOAuthTempDiscardRequest = {
  provider: Exclude<AuthLoginType, "phone">
}

export type AuthPhoneStatusResponseData = {
  phone: string
  registered: boolean
}

export type AuthLoginResponseData = {
  userId: string
  isNewUser: boolean
  onboardingCompleted: boolean
  profileCompleted: boolean
  redirectTo: string
}

export type AuthOAuthTempDiscardResponseData = {
  discarded: boolean
  userId: string
  provider: Exclude<AuthLoginType, "phone">
}

export type AuthSessionSummaryResponseData = {
  userId: string
  redirectTo: string
  phone: string | null
  nickname: string | null
}

export type ProfileToolContract = {
  code: string
  name: string
}

export type ProfileMeResponseData = {
  userId: string
  nickname: string
  avatarUrl: string | null
  phone: string | null
  email: string | null
  loginEmail?: string | null
  contactEmail?: string | null
  wechat: string | null
  bio: string | null
  primaryTool: ProfileToolContract
  learningLevel: string
  currentScore: number
  currentRank: string
  streakDays: number
  completedTaskCount: number
  lastLearningAt: string
  createdAt?: string
}

export type UpdateProfileMeRequest = {
  nickname: string
  avatarUrl?: string | null
  email?: string | null
  contactEmail?: string | null
  wechat?: string | null
  bio?: string | null
}

export type UpdateAdminLoginEmailRequest = {
  email: string
}

export type UpdateAdminLoginEmailResponseData = {
  userId: string
  email: string
}

export type UploadProfileAvatarResponseData = {
  avatarUrl: string
  storagePath: string
  previousAvatarUrl: string | null
}

export type AuthPreviewContract = {
  previewTools: string[]
  previewSteps: AuthPreviewStep[]
  resumeTitle: string
  resumeSummary: string
}
