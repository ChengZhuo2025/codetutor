import type { User } from "@supabase/supabase-js"
import { ROUTES } from "@/constants/routes"
import { getRankName } from "@/constants/ranks"
import type {
  AuthLoginResponseData,
  AuthSessionSummaryResponseData,
  AuthLoginType,
  ProfileMeResponseData,
  UploadProfileAvatarResponseData,
  UpdateProfileMeRequest,
} from "@/lib/api/contracts/auth"
import {
  PROFILE_AVATAR_BUCKET,
  getAvatarStoragePrefix,
} from "@/lib/supabase/storage"
import { createSupabaseAdminClient } from "@/lib/supabase/admin"
import { ensureUserRankSnapshot } from "@/server/modules/gamification/service"
import { getLearningPathStatusSummary } from "@/server/modules/learning-paths/service"
import { assertSupabaseSuccess, toIsoDate } from "@/server/lib/supabase"
import { UserAccountDisabledError } from "@/server/lib/user-account-disabled"

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
  deleted_at?: string | null
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

function getFileExtension(file: File) {
  const filename = file.name.trim()
  const extension = filename.includes(".") ? filename.split(".").pop() : null

  if (extension && /^[a-zA-Z0-9]+$/.test(extension)) {
    return extension.toLowerCase()
  }

  if (file.type === "image/png") {
    return "png"
  }

  if (file.type === "image/webp") {
    return "webp"
  }

  return "jpg"
}

async function getAuthUserById(userId: string) {
  const supabase = createSupabaseAdminClient()
  const { data, error } = await supabase.auth.admin.getUserById(userId)

  assertSupabaseSuccess(error, "failed to query auth user")

  return data.user ?? null
}

/**
 * 为仅有管理员账号、尚未走过用户端登录链路的 user_id 补齐 user_profiles，便于复用资料 API。
 */
async function ensureUserProfileRowForUserId(userId: string): Promise<void> {
  const supabase = createSupabaseAdminClient()

  const { data: existing, error: existingError } = await supabase
    .from("user_profiles")
    .select("user_id")
    .eq("user_id", userId)
    .maybeSingle()

  assertSupabaseSuccess(existingError, "failed to query user profile existence")

  if (existing) {
    return
  }

  const authUser = await getAuthUserById(userId)

  if (!authUser) {
    return
  }

  const { data: adminAccount, error: adminError } = await supabase
    .from("admin_accounts")
    .select("display_name")
    .eq("user_id", userId)
    .maybeSingle()

  assertSupabaseSuccess(adminError, "failed to query admin account for profile bootstrap")

  const now = new Date().toISOString()
  const adminDisplay =
    typeof (adminAccount as { display_name?: string } | null)?.display_name === "string"
      ? (adminAccount as { display_name: string }).display_name.trim()
      : ""

  const nickname =
    adminDisplay.length > 0 ? adminDisplay : buildDefaultNickname(authUser) ?? "新用户"

  const { error: insertProfileError } = await supabase.from("user_profiles").insert({
    user_id: userId,
    nickname,
    avatar_url: buildDefaultAvatar(authUser),
    signup_provider: "email",
    last_login_provider: "email",
    last_login_at: now,
    learning_level: "beginner",
    current_rank_code: "rookie",
    current_score: 0,
    streak_days: 0,
    created_at: now,
    updated_at: now,
  })

  assertSupabaseSuccess(insertProfileError, "failed to create user profile row")

  await ensureUserRankSnapshot(supabase, {
    userId,
    currentScore: 0,
    updatedAt: now,
  })
}

async function syncAdminAccountDisplayNameFromNickname(userId: string, nickname: string): Promise<void> {
  const supabase = createSupabaseAdminClient()

  const { data: row, error } = await supabase
    .from("admin_accounts")
    .select("id")
    .eq("user_id", userId)
    .maybeSingle()

  assertSupabaseSuccess(error, "failed to query admin account for display name sync")

  if (!row) {
    return
  }

  const { error: updateError } = await supabase
    .from("admin_accounts")
    .update({
      display_name: nickname.trim().slice(0, 100),
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId)

  assertSupabaseSuccess(updateError, "failed to sync admin display name")
}

async function loadUserGateState(userId: string) {
  const supabase = createSupabaseAdminClient()

  const { data: preference, error: preferenceError } = await supabase
    .from("user_learning_preferences")
    .select("onboarding_completed")
    .eq("user_id", userId)
    .maybeSingle()

  assertSupabaseSuccess(preferenceError, "failed to query learning preferences")

  const pathSummary = await getLearningPathStatusSummary(userId)

  const onboardingCompleted =
    (preference as UserPreferenceRow | null)?.onboarding_completed ?? false
  const hasActivePath = pathSummary.activeCount > 0
  const hasHistoryPaths = pathSummary.totalCount > 0

  const redirectTo = hasActivePath
    ? ROUTES.learn
    : onboardingCompleted || hasHistoryPaths
      ? ROUTES.history
      : ROUTES.onboarding

  return {
    onboardingCompleted: onboardingCompleted || hasActivePath || hasHistoryPaths,
    redirectTo,
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
      "user_id, nickname, avatar_url, learning_level, current_rank_code, current_score, streak_days, last_learning_at, deleted_at",
    )
    .eq("user_id", user.id)
    .maybeSingle()

  assertSupabaseSuccess(profileError, "failed to query user profile during auth login")

  if (profile && (profile as UserProfileRow).deleted_at) {
    throw new UserAccountDisabledError()
  }

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

  await ensureUserRankSnapshot(supabase, {
    userId: user.id,
    currentScore: profile?.current_score ?? 0,
    updatedAt: now,
  })

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
    .select("nickname, deleted_at")
    .eq("user_id", userId)
    .maybeSingle()

  assertSupabaseSuccess(profileError, "failed to query auth session profile")

  if ((profile as UserProfileRow | null)?.deleted_at) {
    throw new UserAccountDisabledError()
  }

  return {
    userId,
    redirectTo: gateState.redirectTo,
    phone: authUser?.phone ?? null,
    nickname: normalizeOptionalString((profile as { nickname?: string | null } | null)?.nickname),
  }
}

export async function getProfileMe(userId: string): Promise<ProfileMeResponseData | null> {
  await ensureUserProfileRowForUserId(userId)

  const supabase = createSupabaseAdminClient()

  const { data: profile, error: profileError } = await supabase
    .from("user_profiles")
    .select(
      "user_id, nickname, avatar_url, wechat, contact_email, bio, signup_provider, last_login_provider, last_login_at, primary_tool_id, learning_level, current_rank_code, current_score, streak_days, last_learning_at, deleted_at",
    )
    .eq("user_id", userId)
    .maybeSingle()

  assertSupabaseSuccess(profileError, "failed to query user profile")

  if (!profile) {
    return null
  }

  const typedProfile = profile as UserProfileRow

  if (typedProfile.deleted_at) {
    throw new UserAccountDisabledError()
  }
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
  await ensureUserProfileRowForUserId(userId)

  const supabase = createSupabaseAdminClient()
  const { data: profile, error: profileError } = await supabase
    .from("user_profiles")
    .select("user_id, avatar_url, deleted_at")
    .eq("user_id", userId)
    .maybeSingle()

  assertSupabaseSuccess(profileError, "failed to load user profile before update")

  if (!profile) {
    return null
  }

  if ((profile as UserProfileRow).deleted_at) {
    throw new UserAccountDisabledError()
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

  await syncAdminAccountDisplayNameFromNickname(userId, input.nickname)

  return getProfileMe(userId)
}

export async function uploadProfileAvatar(
  userId: string,
  file: File,
): Promise<UploadProfileAvatarResponseData> {
  await ensureUserProfileRowForUserId(userId)

  const bytes = await file.arrayBuffer()
  const supabase = createSupabaseAdminClient()
  const extension = getFileExtension(file)
  const objectPath = `${getAvatarStoragePrefix(userId)}${Date.now()}-${crypto.randomUUID()}.${extension}`
  const { data: profile, error: profileError } = await supabase
    .from("user_profiles")
    .select("avatar_url, deleted_at")
    .eq("user_id", userId)
    .maybeSingle()

  assertSupabaseSuccess(profileError, "failed to query existing avatar before upload")

  if ((profile as UserProfileRow | null)?.deleted_at) {
    throw new UserAccountDisabledError()
  }

  const { error: uploadError } = await supabase.storage
    .from(PROFILE_AVATAR_BUCKET)
    .upload(objectPath, bytes, {
      contentType: file.type,
      upsert: true,
    })

  assertSupabaseSuccess(uploadError, "failed to upload profile avatar")

  const {
    data: { publicUrl },
  } = supabase.storage.from(PROFILE_AVATAR_BUCKET).getPublicUrl(objectPath)

  return {
    avatarUrl: publicUrl,
    storagePath: objectPath,
    previousAvatarUrl:
      typeof (profile as { avatar_url?: unknown } | null)?.avatar_url === "string"
        ? ((profile as { avatar_url?: string | null }).avatar_url ?? null)
        : null,
  }
}
