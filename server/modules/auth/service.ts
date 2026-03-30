import type { User } from "@supabase/supabase-js"
import { ROUTES } from "@/constants/routes"
import { getRankName } from "@/constants/ranks"
import type {
  AuthLoginResponseData,
  AuthSessionSummaryResponseData,
  AuthLoginType,
  ProfileMeResponseData,
  UpdateProfileMeRequest,
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
  wechat: string | null
  contact_email: string | null
  bio: string | null
  signup_provider?: string | null
  last_login_provider?: string | null
  last_login_at?: string | null
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

function normalizeOptionalString(value: string | null | undefined) {
  if (typeof value !== "string") {
    return null
  }

  const normalized = value.trim()
  return normalized.length > 0 ? normalized : null
}

async function getAuthUserById(userId: string) {
  const supabase = createSupabaseAdminClient()
  const { data, error } = await supabase.auth.admin.getUserById(userId)

  assertSupabaseSuccess(error, "failed to query auth user")

  return data.user ?? null
}

async function loadUserGateState(userId: string) {
  const supabase = createSupabaseAdminClient()

  const { data: preference, error: preferenceError } = await supabase
    .from("user_learning_preferences")
    .select("onboarding_completed")
    .eq("user_id", userId)
    .maybeSingle()

  assertSupabaseSuccess(preferenceError, "failed to query learning preferences")

  const { count: activePathCount, error: activePathError } = await supabase
    .from("user_learning_paths")
    .select("id", {
      count: "exact",
      head: true,
    })
    .eq("user_id", userId)
    .eq("status", "active")

  assertSupabaseSuccess(activePathError, "failed to query active learning path")

  const onboardingCompleted =
    (preference as UserPreferenceRow | null)?.onboarding_completed ?? false
  const hasActivePath = (activePathCount ?? 0) > 0

  return {
    onboardingCompleted: onboardingCompleted || hasActivePath,
    redirectTo: onboardingCompleted || hasActivePath ? ROUTES.learn : ROUTES.onboarding,
  }
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
      signup_provider: loginType,
      last_login_provider: loginType,
      last_login_at: now,
      learning_level: "beginner",
      current_rank_code: "rookie",
      current_score: 0,
      streak_days: 0,
      created_at: now,
      updated_at: now,
    })

    assertSupabaseSuccess(insertProfileError, "failed to create user profile during auth login")
  } else {
    const { error: touchProfileError } = await supabase
      .from("user_profiles")
      .update({
        last_login_provider: loginType,
        last_login_at: now,
        updated_at: now,
      })
      .eq("user_id", user.id)

    assertSupabaseSuccess(touchProfileError, "failed to update user profile during auth login")
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

  const gateState = await loadUserGateState(user.id)

  return {
    userId: user.id,
    isNewUser,
    onboardingCompleted: gateState.onboardingCompleted,
    profileCompleted: gateState.onboardingCompleted,
    redirectTo: gateState.redirectTo,
  }
}

export async function getAuthSessionSummary(
  userId: string,
): Promise<AuthSessionSummaryResponseData> {
  const supabase = createSupabaseAdminClient()
  const authUser = await getAuthUserById(userId)
  const gateState = await loadUserGateState(userId)

  const { data: profile, error: profileError } = await supabase
    .from("user_profiles")
    .select("nickname")
    .eq("user_id", userId)
    .maybeSingle()

  assertSupabaseSuccess(profileError, "failed to query auth session profile")

  return {
    userId,
    redirectTo: gateState.redirectTo,
    phone: authUser?.phone ?? null,
    nickname: normalizeOptionalString((profile as { nickname?: string | null } | null)?.nickname),
  }
}

export async function getProfileMe(userId: string): Promise<ProfileMeResponseData | null> {
  const supabase = createSupabaseAdminClient()

  const { data: profile, error: profileError } = await supabase
    .from("user_profiles")
    .select(
      "user_id, nickname, avatar_url, wechat, contact_email, bio, signup_provider, last_login_provider, last_login_at, primary_tool_id, learning_level, current_rank_code, current_score, streak_days, last_learning_at",
    )
    .eq("user_id", userId)
    .maybeSingle()

  assertSupabaseSuccess(profileError, "failed to query user profile")

  if (!profile) {
    return null
  }

  const typedProfile = profile as UserProfileRow
  const authUser = await getAuthUserById(userId)
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
    avatarUrl: typedProfile.avatar_url ?? (authUser ? buildDefaultAvatar(authUser) : null) ?? null,
    phone: authUser?.phone ?? null,
    email: normalizeOptionalString(typedProfile.contact_email) ?? normalizeOptionalString(authUser?.email) ?? null,
    wechat: normalizeOptionalString(typedProfile.wechat),
    bio: normalizeOptionalString(typedProfile.bio),
    primaryTool,
    learningLevel: typedProfile.learning_level,
    currentScore: typedProfile.current_score,
    currentRank: getRankName(typedProfile.current_rank_code),
    streakDays: typedProfile.streak_days,
    completedTaskCount: completedTaskCount ?? 0,
    lastLearningAt: toIsoDate(typedProfile.last_learning_at),
  }
}

export async function updateProfileMe(
  userId: string,
  input: UpdateProfileMeRequest,
): Promise<ProfileMeResponseData | null> {
  const supabase = createSupabaseAdminClient()
  const { data: profile, error: profileError } = await supabase
    .from("user_profiles")
    .select("user_id, avatar_url")
    .eq("user_id", userId)
    .maybeSingle()

  assertSupabaseSuccess(profileError, "failed to load user profile before update")

  if (!profile) {
    return null
  }

  const { error: updateError } = await supabase
    .from("user_profiles")
    .update({
      nickname: input.nickname.trim(),
      avatar_url: normalizeOptionalString(input.avatarUrl),
      wechat: normalizeOptionalString(input.wechat),
      contact_email: normalizeOptionalString(input.email),
      bio: normalizeOptionalString(input.bio),
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId)

  assertSupabaseSuccess(updateError, "failed to update user profile")

  return getProfileMe(userId)
}
