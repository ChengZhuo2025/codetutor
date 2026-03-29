import type { User } from "@supabase/supabase-js"
import { ROUTES } from "@/constants/routes"
import type {
  AuthLoginResponseData,
  AuthLoginType,
  ProfileMeResponseData,
} from "@/lib/api/contracts/auth"
import { createSupabaseAdminClient } from "@/lib/supabase/admin"
import { assertSupabaseSuccess, toIsoDate } from "@/server/lib/supabase"

type JsonRecord = Record<string, unknown>

type UserPreferenceRow = {
  onboarding_completed: boolean
}

type UserProfileRow = {
  user_id: string
  nickname: string | null
  avatar_url: string | null
  learning_level: string
  current_rank_code: string
  current_score: number
  streak_days: number
  last_learning_at: string | null
  primary_tool_id?: string | null
}

type ToolRow = {
  code: string
  name: string
}

const RANK_NAME_MAP: Record<string, string> = {
  rookie: "萌新码农",
  apprentice: "AI 学徒",
  vibe_coder: "Vibe Coder",
  builder: "AI 建造者",
  master: "AI 编程大师",
}

function readUserMetadataString(user: User, keys: string[]) {
  const metadata = (user.user_metadata ?? {}) as JsonRecord

  for (const key of keys) {
    const value = metadata[key]

    if (typeof value === "string" && value.trim()) {
      return value.trim()
    }
  }

  return null
}

function buildDefaultNickname(user: User) {
  const metadataNickname = readUserMetadataString(user, [
    "nickname",
    "name",
    "full_name",
    "user_name",
    "preferred_username",
  ])

  if (metadataNickname) {
    return metadataNickname
  }

  if (user.phone) {
    return `用户${user.phone.slice(-4)}`
  }

  if (user.email) {
    const [local] = user.email.split("@")
    return local || null
  }

  return null
}

function buildDefaultAvatar(user: User) {
  return readUserMetadataString(user, ["avatar_url", "picture", "headimgurl"])
}

export async function finalizeAuthLogin(
  user: User,
  loginType: AuthLoginType,
): Promise<AuthLoginResponseData> {
  const supabase = createSupabaseAdminClient()
  const now = new Date().toISOString()

  const { data: profile, error: profileError } = await supabase
    .from("user_profiles")
    .select(
      "user_id, nickname, avatar_url, learning_level, current_rank_code, current_score, streak_days, last_learning_at",
    )
    .eq("user_id", user.id)
    .maybeSingle()

  assertSupabaseSuccess(profileError, "failed to query user profile during auth login")

  const { data: preference, error: preferenceError } = await supabase
    .from("user_learning_preferences")
    .select("onboarding_completed")
    .eq("user_id", user.id)
    .maybeSingle()

  assertSupabaseSuccess(
    preferenceError,
    "failed to query learning preferences during auth login",
  )

  const isNewUser = !profile && !preference

  if (!profile) {
    const { error: insertProfileError } = await supabase.from("user_profiles").insert({
      user_id: user.id,
      nickname: buildDefaultNickname(user),
      avatar_url: buildDefaultAvatar(user),
      learning_level: "beginner",
      current_rank_code: "rookie",
      current_score: 0,
      streak_days: 0,
      metadata: {
        signupProvider: loginType,
      },
      created_at: now,
      updated_at: now,
    })

    assertSupabaseSuccess(insertProfileError, "failed to create user profile during auth login")
  }

  if (!preference) {
    const { error: insertPreferenceError } = await supabase
      .from("user_learning_preferences")
      .insert({
        user_id: user.id,
        preferred_tool_ids: [],
        onboarding_completed: false,
        content_language: "zh-CN",
        metadata: {
          signupProvider: loginType,
        },
        created_at: now,
        updated_at: now,
      })

    assertSupabaseSuccess(
      insertPreferenceError,
      "failed to create learning preferences during auth login",
    )
  } else {
    const { error: touchPreferenceError } = await supabase
      .from("user_learning_preferences")
      .update({
        updated_at: now,
      })
      .eq("user_id", user.id)

    assertSupabaseSuccess(
      touchPreferenceError,
      "failed to update learning preferences during auth login",
    )
  }

  const onboardingCompleted = (preference as UserPreferenceRow | null)?.onboarding_completed ?? false

  return {
    userId: user.id,
    isNewUser,
    onboardingCompleted,
    profileCompleted: onboardingCompleted,
    redirectTo: onboardingCompleted ? ROUTES.learn : ROUTES.onboarding,
  }
}

export async function getProfileMe(userId: string): Promise<ProfileMeResponseData | null> {
  const supabase = createSupabaseAdminClient()

  const { data: profile, error: profileError } = await supabase
    .from("user_profiles")
    .select(
      "user_id, nickname, avatar_url, primary_tool_id, learning_level, current_rank_code, current_score, streak_days, last_learning_at",
    )
    .eq("user_id", userId)
    .maybeSingle()

  assertSupabaseSuccess(profileError, "failed to query user profile")

  if (!profile) {
    return null
  }

  const typedProfile = profile as UserProfileRow
  let primaryTool: ToolRow = {
    code: "unselected",
    name: "未选择",
  }

  if (typedProfile.primary_tool_id) {
    const { data: tool, error: toolError } = await supabase
      .from("learning_tools")
      .select("code, name")
      .eq("id", typedProfile.primary_tool_id)
      .maybeSingle()

    assertSupabaseSuccess(toolError, "failed to query primary tool")

    if (tool) {
      primaryTool = tool as ToolRow
    }
  }

  const { count: completedTaskCount, error: completedCountError } = await supabase
    .from("user_tasks")
    .select("id", {
      count: "exact",
      head: true,
    })
    .eq("user_id", userId)
    .eq("status", "completed")

  assertSupabaseSuccess(completedCountError, "failed to count completed tasks")

  return {
    userId,
    nickname: typedProfile.nickname || "新用户",
    primaryTool,
    learningLevel: typedProfile.learning_level,
    currentScore: typedProfile.current_score,
    currentRank: RANK_NAME_MAP[typedProfile.current_rank_code] ?? typedProfile.current_rank_code,
    streakDays: typedProfile.streak_days,
    completedTaskCount: completedTaskCount ?? 0,
    lastLearningAt: toIsoDate(typedProfile.last_learning_at),
  }
}
