import type {
  AdminUpdateUserRequest,
  AdminUserDetailResponseData,
  AdminUserListResponseData,
  AdminUserListStats,
} from "@/lib/api/contracts/admin-users"
import type { AdminAuditAction } from "@/lib/api/contracts/admin"
import { createSupabaseAdminClient } from "@/lib/supabase/admin"
import { assertSupabaseSuccess } from "@/server/lib/supabase"
import { isUuid } from "@/server/lib/identifiers"
import { buildAdminUsersExportCsv } from "./export"

const EXPORT_VIEW = "user_profile_export_view"
export const ADMIN_USER_EXPORT_MAX_ROWS = 10_000

const USER_ID_UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function escapeIlikeFragment(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/%/g, "\\%").replace(/_/g, "\\_")
}

function buildAdminUserKeywordOrClause(keyword: string) {
  const kw = keyword.trim()
  const pattern = `%${escapeIlikeFragment(kw)}%`
  if (USER_ID_UUID.test(kw)) {
    return `user_id.eq.${kw},nickname.ilike.${pattern},contact_email.ilike.${pattern},auth_email.ilike.${pattern},auth_phone.ilike.${pattern}`
  }
  return `nickname.ilike.${pattern},contact_email.ilike.${pattern},auth_email.ilike.${pattern},auth_phone.ilike.${pattern}`
}

type ListFilters = {
  accountStatus: "active" | "deleted" | "all"
  onboardingCompleted?: boolean
  hasActiveLearningPath?: boolean
  keyword?: string
  limit: number
  page: number
}

type ExportViewRow = Record<string, unknown>

type SupabaseAuthIdentity = {
  provider?: string | null
  identity_data?: Record<string, unknown> | null
}

type AuthUserRow = {
  identities?: SupabaseAuthIdentity[] | null
}

function normalizeProviderName(provider: string | null | undefined) {
  if (!provider) {
    return null
  }

  const normalized = provider.trim().toLowerCase()
  if (!normalized) {
    return null
  }
  if (normalized === "wechat" || normalized === "douyin" || normalized === "phone") {
    return normalized
  }

  return normalized
}

function buildOAuthLinkedProviders(user: AuthUserRow | null | undefined) {
  const providers = new Set<string>()

  for (const identity of user?.identities ?? []) {
    const provider = normalizeProviderName(identity.provider)
    if (provider === "wechat" || provider === "douyin") {
      providers.add(provider)
      continue
    }

    const identityDataProvider = normalizeProviderName(
      typeof identity.identity_data?.provider === "string"
        ? identity.identity_data.provider
        : null,
    )
    if (identityDataProvider === "wechat" || identityDataProvider === "douyin") {
      providers.add(identityDataProvider)
    }
  }

  return Array.from(providers).sort()
}

function mapExportRow(row: ExportViewRow): AdminUserDetailResponseData {
  const linkedProviders = Array.isArray(row.oauth_linked_providers)
    ? row.oauth_linked_providers.map((item) => String(item))
    : []

  return {
    userId: String(row.user_id),
    nickname: row.nickname == null ? null : String(row.nickname),
    avatarUrl: row.avatar_url == null ? null : String(row.avatar_url),
    wechat: row.wechat == null ? null : String(row.wechat),
    oauthWechatLinked: row.oauth_wechat_linked == null ? null : Boolean(row.oauth_wechat_linked),
    oauthDouyinLinked: row.oauth_douyin_linked == null ? null : Boolean(row.oauth_douyin_linked),
    oauthLinkedProviders: linkedProviders.length > 0 ? linkedProviders : null,
    contactEmail: row.contact_email == null ? null : String(row.contact_email),
    bio: row.bio == null ? null : String(row.bio),
    signupProvider: row.signup_provider == null ? null : String(row.signup_provider),
    lastLoginProvider: row.last_login_provider == null ? null : String(row.last_login_provider),
    lastLoginAt: row.last_login_at == null ? null : String(row.last_login_at),
    authPhone: row.auth_phone == null ? null : String(row.auth_phone),
    authEmail: row.auth_email == null ? null : String(row.auth_email),
    onboardingCompleted:
      row.onboarding_completed == null ? null : Boolean(row.onboarding_completed),
    contentLanguage: row.content_language == null ? null : String(row.content_language),
    primaryToolCode: row.primary_tool_code == null ? null : String(row.primary_tool_code),
    primaryToolName: row.primary_tool_name == null ? null : String(row.primary_tool_name),
    activePathStatus: row.active_path_status == null ? null : String(row.active_path_status),
    activePathSelectionMode:
      row.active_path_selection_mode == null ? null : String(row.active_path_selection_mode),
    activePathLearningLevel:
      row.active_path_learning_level == null ? null : String(row.active_path_learning_level),
    activePathCode: row.active_path_code == null ? null : String(row.active_path_code),
    activePathName: row.active_path_name == null ? null : String(row.active_path_name),
    activePathStartedAt:
      row.active_path_started_at == null ? null : String(row.active_path_started_at),
    activePathLastActivityAt:
      row.active_path_last_activity_at == null ? null : String(row.active_path_last_activity_at),
    activePathTotalSteps:
      row.active_path_total_steps == null ? null : Number(row.active_path_total_steps),
    activePathCompletedSteps:
      row.active_path_completed_steps == null ? null : Number(row.active_path_completed_steps),
    activePathCompletionPercent:
      row.active_path_completion_percent == null ? null : Number(row.active_path_completion_percent),
    activePathCompletedTaskCount: Number(row.active_path_completed_task_count ?? 0),
    activePathInProgressTaskCount: Number(row.active_path_in_progress_task_count ?? 0),
    activePathPendingTaskCount: Number(row.active_path_pending_task_count ?? 0),
    activePathBlockedTaskCount: Number(row.active_path_blocked_task_count ?? 0),
    completedTaskCountTotal: Number(row.completed_task_count_total ?? 0),
    inProgressTaskCountTotal: Number(row.in_progress_task_count_total ?? 0),
    pendingTaskCountTotal: Number(row.pending_task_count_total ?? 0),
    blockedTaskCountTotal: Number(row.blocked_task_count_total ?? 0),
    currentScore: row.current_score == null ? null : Number(row.current_score),
    currentRankCode: row.current_rank_code == null ? null : String(row.current_rank_code),
    streakDays: row.streak_days == null ? null : Number(row.streak_days),
    lastLearningAt: row.last_learning_at == null ? null : String(row.last_learning_at),
    profileCreatedAt: row.profile_created_at == null ? null : String(row.profile_created_at),
    profileUpdatedAt: row.profile_updated_at == null ? null : String(row.profile_updated_at),
    deletedAt: row.deleted_at == null ? null : String(row.deleted_at),
    deletedReason: row.deleted_reason == null ? null : String(row.deleted_reason),
  }
}

function applyViewFilters(
  query: unknown,
  filters: Pick<ListFilters, "accountStatus" | "onboardingCompleted" | "hasActiveLearningPath" | "keyword">,
): unknown {
  let q = query as {
    is: (c: string, v: null) => unknown
    not: (c: string, op: string, v: null) => unknown
    eq: (c: string, v: boolean) => unknown
    or: (clause: string) => unknown
  }

  if (filters.accountStatus === "active") {
    q = q.is("deleted_at", null) as typeof q
  } else if (filters.accountStatus === "deleted") {
    q = q.not("deleted_at", "is", null) as typeof q
  }

  if (filters.onboardingCompleted === true) {
    q = q.eq("onboarding_completed", true) as typeof q
  } else if (filters.onboardingCompleted === false) {
    q = q.or("onboarding_completed.eq.false,onboarding_completed.is.null") as typeof q
  }

  if (filters.hasActiveLearningPath === true) {
    q = q.not("active_path_code", "is", null) as typeof q
  } else if (filters.hasActiveLearningPath === false) {
    q = q.is("active_path_code", null) as typeof q
  }

  if (filters.keyword) {
    q = q.or(buildAdminUserKeywordOrClause(filters.keyword)) as typeof q
  }

  return q
}

async function writeAdminUserAudit(input: {
  adminAccountId: string
  action: AdminAuditAction
  targetUserId: string
  beforeSnapshot: Record<string, unknown> | null
  afterSnapshot: Record<string, unknown> | null
  reason?: string | null
}) {
  const supabase = createSupabaseAdminClient()
  const { error } = await supabase.from("admin_audit_logs").insert({
    admin_user_id: input.adminAccountId,
    action: input.action,
    target_type: "user_profile",
    target_id: input.targetUserId,
    before_snapshot: input.beforeSnapshot,
    after_snapshot: input.afterSnapshot,
    reason: input.reason ?? null,
    request_context: null,
  })

  if (error) {
    throw new Error(`AUDIT_LOG_WRITE_FAILED:failed to write admin user audit log: ${error.message}`)
  }
}

async function assertUserNotLinkedToAdminAccount(userId: string) {
  const supabase = createSupabaseAdminClient()
  const { data, error } = await supabase
    .from("admin_accounts")
    .select("id")
    .eq("user_id", userId)
    .maybeSingle()

  assertSupabaseSuccess(error, "failed to query admin account relation before soft delete")

  if (data) {
    const conflict = new Error("管理员关联的用户档案不允许软删除。")
    conflict.name = "CONFLICT"
    throw conflict
  }
}

async function getAdminUserListStats(): Promise<AdminUserListStats> {
  const supabase = createSupabaseAdminClient()

  const [totalResult, activePlanResult, streakingResult, deletedResult] = await Promise.all([
    supabase.from(EXPORT_VIEW).select("*", { count: "exact", head: true }),
    supabase.from(EXPORT_VIEW).select("*", { count: "exact", head: true }).not("active_path_code", "is", null),
    supabase.from(EXPORT_VIEW).select("*", { count: "exact", head: true }).gt("streak_days", 0),
    supabase.from(EXPORT_VIEW).select("*", { count: "exact", head: true }).not("deleted_at", "is", null),
  ])

  assertSupabaseSuccess(totalResult.error, "failed to count total admin users")
  assertSupabaseSuccess(activePlanResult.error, "failed to count admin users with active plans")
  assertSupabaseSuccess(streakingResult.error, "failed to count streaking admin users")
  assertSupabaseSuccess(deletedResult.error, "failed to count deleted admin users")

  return {
    totalUsers: totalResult.count ?? 0,
    activePlanUsers: activePlanResult.count ?? 0,
    streakingUsers: streakingResult.count ?? 0,
    deletedUsers: deletedResult.count ?? 0,
  }
}

export async function getAdminUserList(filters: ListFilters): Promise<AdminUserListResponseData> {
  const supabase = createSupabaseAdminClient()
  const limit = filters.limit
  const page = filters.page > 0 ? filters.page : 1
  const from = (page - 1) * limit
  const to = from + limit - 1

  const filterPayload = {
    accountStatus: filters.accountStatus,
    onboardingCompleted: filters.onboardingCompleted,
    hasActiveLearningPath: filters.hasActiveLearningPath,
    keyword: filters.keyword,
  }

  let countQuery = supabase.from(EXPORT_VIEW).select("*", { count: "exact", head: true })
  countQuery = applyViewFilters(countQuery, filterPayload) as typeof countQuery

  const [countResult, stats] = await Promise.all([countQuery, getAdminUserListStats()])
  assertSupabaseSuccess(countResult.error, "failed to count admin user list")

  let listQuery = supabase.from(EXPORT_VIEW).select("*").order("profile_updated_at", {
    ascending: false,
    nullsFirst: false,
  }).range(from, to)
  listQuery = applyViewFilters(listQuery, filterPayload) as typeof listQuery

  const { data, error } = await listQuery
  assertSupabaseSuccess(error, "failed to query admin user list")

  const rows = (data ?? []) as ExportViewRow[]

  return {
    items: rows.map((r) => mapExportRow(r)),
    total: countResult.count ?? 0,
    page,
    limit,
    stats,
  }
}

export async function getAdminUserDetail(userId: string): Promise<AdminUserDetailResponseData | null> {
  if (!isUuid(userId)) {
    return null
  }

  const supabase = createSupabaseAdminClient()
  const { data, error } = await supabase.from(EXPORT_VIEW).select("*").eq("user_id", userId).maybeSingle()

  assertSupabaseSuccess(error, "failed to query admin user detail")

  if (!data) {
    return null
  }

  const { data: authData, error: authError } = await supabase.auth.admin.getUserById(userId)
  assertSupabaseSuccess(authError, "failed to query auth user for admin user detail")

  const linkedProviders = buildOAuthLinkedProviders(authData.user as AuthUserRow | null | undefined)

  return {
    ...mapExportRow(data as ExportViewRow),
    oauthWechatLinked: linkedProviders.includes("wechat"),
    oauthDouyinLinked: linkedProviders.includes("douyin"),
    oauthLinkedProviders: linkedProviders.length > 0 ? linkedProviders : null,
  }
}

export async function getAdminUsersExportCsv(
  filters: Omit<ListFilters, "limit" | "page">,
): Promise<{ csv: string; filename: string }> {
  const supabase = createSupabaseAdminClient()

  const filterPayload = {
    accountStatus: filters.accountStatus,
    onboardingCompleted: filters.onboardingCompleted,
    hasActiveLearningPath: filters.hasActiveLearningPath,
    keyword: filters.keyword,
  }

  let countQuery = supabase.from(EXPORT_VIEW).select("*", { count: "exact", head: true })
  countQuery = applyViewFilters(countQuery, filterPayload) as typeof countQuery
  const countResult = await countQuery
  assertSupabaseSuccess(countResult.error, "failed to count admin user export")

  const total = countResult.count ?? 0
  if (total > ADMIN_USER_EXPORT_MAX_ROWS) {
    throw new Error("USER_EXPORT_LIMIT_EXCEEDED")
  }

  let listQuery = supabase
    .from(EXPORT_VIEW)
    .select("*")
    .order("profile_updated_at", { ascending: false, nullsFirst: false })
    .range(0, Math.max(0, total - 1))

  listQuery = applyViewFilters(listQuery, filterPayload) as typeof listQuery
  const { data, error } = await listQuery
  assertSupabaseSuccess(error, "failed to query admin user export rows")

  const rows = (data ?? []) as ExportViewRow[]

  const csv = buildAdminUsersExportCsv(rows.map((row) => mapExportRow(row)))
  const ts = new Date().toISOString().slice(0, 19).replace(/:/g, "-")
  return { csv, filename: `admin-users-export-${ts}.csv` }
}

export async function updateAdminUser(
  adminAccountId: string,
  userId: string,
  patch: AdminUpdateUserRequest,
): Promise<AdminUserDetailResponseData | null> {
  if (!isUuid(userId)) {
    return null
  }

  const supabase = createSupabaseAdminClient()
  const before = await getAdminUserDetail(userId)
  if (!before) {
    return null
  }

  const profileUpdate: Record<string, unknown> = {}
  if (patch.nickname !== undefined) {
    profileUpdate.nickname = patch.nickname
  }
  if (patch.bio !== undefined) {
    profileUpdate.bio = patch.bio
  }
  if (patch.contactEmail !== undefined) {
    profileUpdate.contact_email = patch.contactEmail
  }
  if (patch.wechat !== undefined) {
    profileUpdate.wechat = patch.wechat
  }

  if (Object.keys(profileUpdate).length > 0) {
    profileUpdate.updated_at = new Date().toISOString()
    const { error: profileError } = await supabase
      .from("user_profiles")
      .update(profileUpdate)
      .eq("user_id", userId)

    assertSupabaseSuccess(profileError, "failed to update user profile from admin")
  }

  if (patch.contentLanguage !== undefined || patch.onboardingCompleted !== undefined) {
    const { data: pref, error: prefReadError } = await supabase
      .from("user_learning_preferences")
      .select("id")
      .eq("user_id", userId)
      .maybeSingle()

    assertSupabaseSuccess(prefReadError, "failed to read user preferences for admin update")

    const prefUpdate: Record<string, unknown> = {}
    if (patch.contentLanguage !== undefined) {
      prefUpdate.content_language = patch.contentLanguage
    }
    if (patch.onboardingCompleted !== undefined) {
      prefUpdate.onboarding_completed = patch.onboardingCompleted
    }

    if (pref) {
      prefUpdate.updated_at = new Date().toISOString()
      const { error: prefErr } = await supabase
        .from("user_learning_preferences")
        .update(prefUpdate)
        .eq("user_id", userId)

      assertSupabaseSuccess(prefErr, "failed to update user preferences from admin")
    } else {
      const now = new Date().toISOString()
      const { error: insertPrefErr } = await supabase.from("user_learning_preferences").insert({
        user_id: userId,
        preferred_tool_ids: [],
        onboarding_completed: patch.onboardingCompleted ?? false,
        content_language: patch.contentLanguage ?? "zh-CN",
        metadata: {},
        created_at: now,
        updated_at: now,
      })

      assertSupabaseSuccess(insertPrefErr, "failed to insert user preferences from admin")
    }
  }

  const after = await getAdminUserDetail(userId)

  try {
    await writeAdminUserAudit({
      adminAccountId,
      action: "user_profile_update",
      targetUserId: userId,
      beforeSnapshot: before as unknown as Record<string, unknown>,
      afterSnapshot: (after ?? before) as unknown as Record<string, unknown>,
    })
  } catch (auditError) {
    throw auditError
  }

  return after
}

export async function softDeleteAdminUser(
  adminAccountId: string,
  userId: string,
  reason: string | null | undefined,
): Promise<AdminUserDetailResponseData | null> {
  if (!isUuid(userId)) {
    return null
  }

  const supabase = createSupabaseAdminClient()
  const before = await getAdminUserDetail(userId)
  if (!before) {
    return null
  }

  if (before.deletedAt) {
    return before
  }

  await assertUserNotLinkedToAdminAccount(userId)

  const now = new Date().toISOString()
  const { error } = await supabase
    .from("user_profiles")
    .update({
      deleted_at: now,
      deleted_reason: reason ?? null,
      updated_at: now,
    })
    .eq("user_id", userId)

  assertSupabaseSuccess(error, "failed to soft-delete user profile")

  const after = await getAdminUserDetail(userId)

  try {
    await writeAdminUserAudit({
      adminAccountId,
      action: "user_soft_delete",
      targetUserId: userId,
      beforeSnapshot: { deletedAt: before.deletedAt },
      afterSnapshot: { deletedAt: after?.deletedAt ?? null, deletedReason: after?.deletedReason ?? null },
      reason: reason ?? null,
    })
  } catch (auditError) {
    throw auditError
  }

  return after
}

export type RestoreAdminUserResult = AdminUserDetailResponseData | "not_soft_deleted" | null

export async function restoreAdminUser(
  adminAccountId: string,
  userId: string,
): Promise<RestoreAdminUserResult> {
  if (!isUuid(userId)) {
    return null
  }

  const supabase = createSupabaseAdminClient()
  const before = await getAdminUserDetail(userId)
  if (!before) {
    return null
  }

  if (!before.deletedAt) {
    return "not_soft_deleted"
  }

  const now = new Date().toISOString()
  const { error } = await supabase
    .from("user_profiles")
    .update({
      deleted_at: null,
      deleted_reason: null,
      updated_at: now,
    })
    .eq("user_id", userId)

  assertSupabaseSuccess(error, "failed to restore user profile")

  const after = await getAdminUserDetail(userId)

  try {
    await writeAdminUserAudit({
      adminAccountId,
      action: "user_restore",
      targetUserId: userId,
      beforeSnapshot: { deletedAt: before.deletedAt },
      afterSnapshot: { deletedAt: after?.deletedAt ?? null },
    })
  } catch (auditError) {
    throw auditError
  }

  return after
}
