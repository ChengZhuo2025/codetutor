import type {
  AdminFeedbackBatchDeleteResponseData,
  AdminFeedbackListResponseData,
  AdminFeedbackListStats,
  AdminFeedbackTicketDetailResponseData,
  AdminFeedbackUserSnapshot,
  AdminFeedbackUserSnapshotResponseData,
  AdminReplyFeedbackRequest,
  AdminUpdateFeedbackStatusRequest,
  CreateFeedbackRequest,
  CreateFeedbackResponseData,
  FeedbackMineListResponseData,
  FeedbackPriority,
  FeedbackReplyItem,
  FeedbackStatus,
  FeedbackTicketDetailResponseData,
  FeedbackTicketListItem,
  FeedbackType,
} from "@/lib/api/contracts/feedback"
import { createAdminNotification } from "@/server/modules/admin-notifications/service"
import { getLearningLevelLabel } from "@/constants/learning-taxonomy"
import { getRankName } from "@/constants/ranks"
import { createSupabaseAdminClient } from "@/lib/supabase/admin"
import { assertSupabaseSuccess, toIsoDate } from "@/server/lib/supabase"

type FeedbackTicketRow = {
  id: string
  user_id: string
  feedback_type: FeedbackType
  status: FeedbackStatus
  priority: "low" | "medium" | "high"
  source: string | null
  title: string
  content: string
  contact_method: string | null
  user_nickname_snapshot: string | null
  user_phone_snapshot: string | null
  user_contact_email_snapshot: string | null
  submitted_at: string
  updated_at: string
  last_reply_at: string | null
}

type FeedbackReplyRow = {
  id: string
  ticket_id: string
  author_type: "user" | "admin" | "system"
  author_id: string | null
  content: string
  is_internal_note: boolean
  created_at: string
}

type UserProfileSnapshotRow = {
  nickname: string | null
  contact_email: string | null
  avatar_url?: string | null
  primary_tool_id?: string | null
  learning_level?: "beginner" | "intermediate" | "advanced" | null
  current_rank_code?: string | null
  current_score?: number | null
  streak_days?: number | null
  last_learning_at?: string | null
}

const FEEDBACK_TYPE_LABEL_MAP: Record<FeedbackType, string> = {
  visual_design: "界面视觉",
  interaction_flow: "交互流程",
  feature_request: "功能建议",
  issue_report: "问题反馈",
}

const FEEDBACK_STATUS_LABEL_MAP: Record<FeedbackStatus, string> = {
  submitted: "已提交",
  in_review: "处理中",
  replied: "已回复",
  closed: "已关闭",
}

const ADMIN_FEEDBACK_STATUS_LABEL_MAP: Record<FeedbackStatus, string> = {
  submitted: "待处理",
  in_review: "处理中",
  replied: "已解决",
  closed: "已关闭",
}

const FEEDBACK_TICKET_UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function buildAdminFeedbackKeywordOrClause(keyword: string) {
  const kw = keyword.trim()
  if (FEEDBACK_TICKET_UUID.test(kw)) {
    return `id.eq.${kw},title.ilike.%${kw}%,content.ilike.%${kw}%,user_nickname_snapshot.ilike.%${kw}%`
  }

  return `title.ilike.%${kw}%,content.ilike.%${kw}%,user_nickname_snapshot.ilike.%${kw}%`
}

function normalizeOptionalString(value: string | null | undefined) {
  if (typeof value !== "string") {
    return null
  }

  const normalized = value.trim()
  return normalized.length > 0 ? normalized : null
}

function summarizeText(value: string, maxLength: number) {
  if (value.length <= maxLength) {
    return value
  }

  return `${value.slice(0, maxLength - 1)}…`
}

async function getAuthUserSnapshot(userId: string) {
  const supabase = createSupabaseAdminClient()
  const { data, error } = await supabase.auth.admin.getUserById(userId)

  assertSupabaseSuccess(error, "failed to query feedback auth user snapshot")

  return {
    phone: normalizeOptionalString(data.user?.phone),
    email: normalizeOptionalString(data.user?.email),
  }
}

async function buildAdminFeedbackUserSnapshot(
  userId: string,
  fallbacks: {
    nicknameSnapshot: string | null
    emailSnapshot: string | null
  },
): Promise<AdminFeedbackUserSnapshot> {
  const supabase = createSupabaseAdminClient()

  const [profileRes, countRes, activePathRes, completedCountRes, authUserRes] = await Promise.all([
    supabase
      .from("user_profiles")
      .select(
        "nickname, contact_email, avatar_url, primary_tool_id, learning_level, current_rank_code, current_score, streak_days, last_learning_at",
      )
      .eq("user_id", userId)
      .maybeSingle(),
    supabase
      .from("feedback_tickets")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId),
    supabase
      .from("user_learning_paths")
      .select("path_name_snapshot")
      .eq("user_id", userId)
      .eq("status", "active")
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("user_tasks")
      .select("id", {
        count: "exact",
        head: true,
      })
      .eq("user_id", userId)
      .eq("status", "completed"),
    supabase.auth.admin.getUserById(userId),
  ])

  assertSupabaseSuccess(profileRes.error, "failed to query user profile for admin feedback detail")
  assertSupabaseSuccess(countRes.error, "failed to count user feedback tickets for admin detail")
  assertSupabaseSuccess(activePathRes.error, "failed to query active learning path for admin detail")
  assertSupabaseSuccess(completedCountRes.error, "failed to count completed tasks for admin detail")
  assertSupabaseSuccess(authUserRes.error, "failed to query auth user for admin feedback detail")

  const profile = profileRes.data as
    | UserProfileSnapshotRow
    | null
  const activePath = activePathRes.data as { path_name_snapshot: string | null } | null

  const authEmail = normalizeOptionalString(authUserRes.data.user?.email)
  const createdRaw = authUserRes.data.user?.created_at
  const createdAt =
    createdRaw != null && createdRaw !== ""
      ? toIsoDate(typeof createdRaw === "string" ? createdRaw : String(createdRaw))
      : null
  const lastLearningAt = profile?.last_learning_at ? toIsoDate(profile.last_learning_at) : null
  const currentScore = profile?.current_score ?? 0
  const streakDays = profile?.streak_days ?? 0
  const currentRank = profile?.current_rank_code
    ? getRankName(profile.current_rank_code)
    : null
  const learningLevelLabel = profile?.learning_level
    ? getLearningLevelLabel(profile.learning_level, "short")
    : null
  let primaryToolName: string | null = null

  if (profile?.primary_tool_id) {
    const { data: tool, error: toolError } = await supabase
      .from("learning_tools")
      .select("name")
      .eq("id", profile.primary_tool_id)
      .maybeSingle()

    assertSupabaseSuccess(toolError, "failed to query primary tool for admin feedback detail")
    primaryToolName = normalizeOptionalString((tool as { name?: string | null } | null)?.name)
  }

  return {
    avatarUrl: normalizeOptionalString(profile?.avatar_url),
    nickname: normalizeOptionalString(profile?.nickname) ?? fallbacks.nicknameSnapshot,
    email:
      normalizeOptionalString(profile?.contact_email)
      ?? authEmail
      ?? fallbacks.emailSnapshot,
    currentScore,
    currentRank,
    streakDays,
    activePlanName: normalizeOptionalString(activePath?.path_name_snapshot),
    primaryToolName,
    learningLevelLabel,
    completedTaskCount: completedCountRes.count ?? 0,
    lastLearningAt,
    totalTicketCount: countRes.count ?? 0,
    createdAt,
  }
}

async function getFeedbackReplies(ticketIds: string[]) {
  if (ticketIds.length === 0) {
    return new Map<string, FeedbackReplyRow[]>()
  }

  const supabase = createSupabaseAdminClient()
  const { data, error } = await supabase
    .from("feedback_replies")
    .select("id, ticket_id, author_type, author_id, content, is_internal_note, created_at")
    .in("ticket_id", ticketIds)
    .order("created_at", { ascending: true })

  assertSupabaseSuccess(error, "failed to query feedback replies")

  const grouped = new Map<string, FeedbackReplyRow[]>()

  for (const row of (data ?? []) as FeedbackReplyRow[]) {
    const bucket = grouped.get(row.ticket_id)

    if (bucket) {
      bucket.push(row)
      continue
    }

    grouped.set(row.ticket_id, [row])
  }

  return grouped
}

function mapReplyRow(row: FeedbackReplyRow): FeedbackReplyItem {
  return {
    id: row.id,
    authorType: row.author_type,
    authorId: row.author_id,
    content: row.content,
    createdAt: toIsoDate(row.created_at),
  }
}

function mapListItem(row: FeedbackTicketRow, replies: FeedbackReplyRow[]): FeedbackTicketListItem {
  const publicReplies = replies.filter((item) => !item.is_internal_note)
  const latestReply = publicReplies[publicReplies.length - 1]

  return {
    id: row.id,
    feedbackType: row.feedback_type,
    feedbackTypeLabel: FEEDBACK_TYPE_LABEL_MAP[row.feedback_type],
    status: row.status,
    statusLabel: FEEDBACK_STATUS_LABEL_MAP[row.status],
    title: row.title,
    contentPreview: summarizeText(row.content, 72),
    contactMethod: normalizeOptionalString(row.contact_method),
    latestReplySnippet: latestReply ? summarizeText(latestReply.content, 72) : null,
    replyCount: publicReplies.length,
    submittedAt: toIsoDate(row.submitted_at),
    updatedAt: toIsoDate(row.updated_at),
    lastReplyAt: row.last_reply_at ? toIsoDate(row.last_reply_at) : null,
  }
}

export async function createFeedbackTicket(
  userId: string,
  input: CreateFeedbackRequest,
): Promise<CreateFeedbackResponseData> {
  const supabase = createSupabaseAdminClient()
  const now = new Date().toISOString()

  const { data: profile, error: profileError } = await supabase
    .from("user_profiles")
    .select("nickname, contact_email")
    .eq("user_id", userId)
    .maybeSingle()

  assertSupabaseSuccess(profileError, "failed to query feedback profile snapshot")

  const authUser = await getAuthUserSnapshot(userId)
  const profileSnapshot = (profile ?? null) as UserProfileSnapshotRow | null

  const { data, error } = await supabase
    .from("feedback_tickets")
    .insert({
      user_id: userId,
      feedback_type: input.feedbackType,
      status: "submitted",
      priority: "medium",
      source: normalizeOptionalString(input.source ?? null),
      title: input.title.trim(),
      content: input.content.trim(),
      contact_method: normalizeOptionalString(input.contactMethod),
      user_nickname_snapshot: normalizeOptionalString(profileSnapshot?.nickname),
      user_phone_snapshot: authUser.phone,
      user_contact_email_snapshot:
        normalizeOptionalString(profileSnapshot?.contact_email) ?? authUser.email,
      submitted_at: now,
      created_at: now,
      updated_at: now,
    })
    .select("id")
    .single()

  assertSupabaseSuccess(error, "failed to create feedback ticket")

  if (!data) {
    throw new Error("failed to create feedback ticket: missing inserted row")
  }

  void createAdminNotification({
    category: "feedback",
    severity: "warning",
    title: `新的反馈工单：${input.title.trim()}`,
    content: input.content.trim().slice(0, 240),
    targetUrl: `/admin/feedback/${data.id}`,
    sourceType: "feedback_ticket",
    sourceId: data.id,
    payload: {
      ticketId: data.id,
      feedbackType: input.feedbackType,
      source: normalizeOptionalString(input.source ?? null),
      contactMethod: normalizeOptionalString(input.contactMethod),
    },
  }).catch((error) => {
    console.error("failed to create admin feedback notification", error)
  })

  return {
    ticketId: data.id,
  }
}

export async function getMyFeedbackList(userId: string): Promise<FeedbackMineListResponseData> {
  const supabase = createSupabaseAdminClient()
  const { data, error } = await supabase
    .from("feedback_tickets")
    .select(
      "id, user_id, feedback_type, status, priority, source, title, content, contact_method, user_nickname_snapshot, user_phone_snapshot, user_contact_email_snapshot, submitted_at, updated_at, last_reply_at",
    )
    .eq("user_id", userId)
    .order("updated_at", { ascending: false })

  assertSupabaseSuccess(error, "failed to query user feedback list")

  const tickets = (data ?? []) as FeedbackTicketRow[]
  const repliesByTicketId = await getFeedbackReplies(tickets.map((item) => item.id))

  return {
    items: tickets.map((ticket) => mapListItem(ticket, repliesByTicketId.get(ticket.id) ?? [])),
  }
}

export async function getMyFeedbackDetail(
  userId: string,
  ticketId: string,
): Promise<FeedbackTicketDetailResponseData | null> {
  const supabase = createSupabaseAdminClient()
  const { data, error } = await supabase
    .from("feedback_tickets")
    .select(
      "id, user_id, feedback_type, status, priority, source, title, content, contact_method, user_nickname_snapshot, user_phone_snapshot, user_contact_email_snapshot, submitted_at, updated_at, last_reply_at",
    )
    .eq("id", ticketId)
    .eq("user_id", userId)
    .maybeSingle()

  assertSupabaseSuccess(error, "failed to query feedback detail")

  if (!data) {
    return null
  }

  const ticket = data as FeedbackTicketRow
  const repliesByTicketId = await getFeedbackReplies([ticket.id])
  const replies = (repliesByTicketId.get(ticket.id) ?? []).filter((item) => !item.is_internal_note)

  return {
    id: ticket.id,
    feedbackType: ticket.feedback_type,
    feedbackTypeLabel: FEEDBACK_TYPE_LABEL_MAP[ticket.feedback_type],
    status: ticket.status,
    statusLabel: FEEDBACK_STATUS_LABEL_MAP[ticket.status],
    title: ticket.title,
    content: ticket.content,
    contactMethod: normalizeOptionalString(ticket.contact_method),
    submittedAt: toIsoDate(ticket.submitted_at),
    updatedAt: toIsoDate(ticket.updated_at),
    lastReplyAt: ticket.last_reply_at ? toIsoDate(ticket.last_reply_at) : null,
    replies: replies.map(mapReplyRow),
  }
}

async function getAdminFeedbackGlobalStats(): Promise<AdminFeedbackListStats> {
  const supabase = createSupabaseAdminClient()
  const [totalRes, pendingRes, inReviewRes, highRes] = await Promise.all([
    supabase.from("feedback_tickets").select("*", { count: "exact", head: true }),
    supabase
      .from("feedback_tickets")
      .select("*", { count: "exact", head: true })
      .eq("status", "submitted"),
    supabase
      .from("feedback_tickets")
      .select("*", { count: "exact", head: true })
      .eq("status", "in_review"),
    supabase
      .from("feedback_tickets")
      .select("*", { count: "exact", head: true })
      .eq("priority", "high"),
  ])

  assertSupabaseSuccess(totalRes.error, "failed to count admin feedback tickets")
  assertSupabaseSuccess(pendingRes.error, "failed to count pending feedback tickets")
  assertSupabaseSuccess(inReviewRes.error, "failed to count in_review feedback tickets")
  assertSupabaseSuccess(highRes.error, "failed to count high priority feedback tickets")

  return {
    ticketTotal: totalRes.count ?? 0,
    pending: pendingRes.count ?? 0,
    inReview: inReviewRes.count ?? 0,
    highPriority: highRes.count ?? 0,
  }
}

async function getUserAvatarByUserIds(userIds: string[]): Promise<Map<string, string | null>> {
  const map = new Map<string, string | null>()
  if (userIds.length === 0) {
    return map
  }

  const supabase = createSupabaseAdminClient()
  const { data, error } = await supabase
    .from("user_profiles")
    .select("user_id, avatar_url")
    .in("user_id", userIds)

  assertSupabaseSuccess(error, "failed to query user avatars for admin feedback list")

  for (const row of (data ?? []) as { user_id: string; avatar_url: string | null }[]) {
    map.set(row.user_id, normalizeOptionalString(row.avatar_url))
  }

  return map
}

type AdminFeedbackFilters = {
  status?: FeedbackStatus
  feedbackType?: FeedbackType
  priority?: FeedbackPriority
  keyword?: string
  userId?: string
  limit?: number
  page?: number
}

export async function getAdminFeedbackList(
  filters: AdminFeedbackFilters,
): Promise<AdminFeedbackListResponseData> {
  const supabase = createSupabaseAdminClient()
  const limit = filters.limit ?? 50
  const page = filters.page && filters.page > 0 ? filters.page : 1
  const from = (page - 1) * limit
  const to = from + limit - 1

  let countQuery = supabase.from("feedback_tickets").select("*", { count: "exact", head: true })
  if (filters.status) {
    countQuery = countQuery.eq("status", filters.status)
  }

  if (filters.feedbackType) {
    countQuery = countQuery.eq("feedback_type", filters.feedbackType)
  }

  if (filters.priority) {
    countQuery = countQuery.eq("priority", filters.priority)
  }

  if (filters.userId) {
    countQuery = countQuery.eq("user_id", filters.userId)
  }

  if (filters.keyword) {
    countQuery = countQuery.or(buildAdminFeedbackKeywordOrClause(filters.keyword))
  }

  const [stats, countResult, ticketsResult] = await Promise.all([
    getAdminFeedbackGlobalStats(),
    countQuery,
    (async () => {
      let listQuery = supabase
        .from("feedback_tickets")
        .select(
          "id, user_id, feedback_type, status, priority, source, title, content, contact_method, user_nickname_snapshot, user_phone_snapshot, user_contact_email_snapshot, submitted_at, updated_at, last_reply_at",
        )
        .order("updated_at", { ascending: false })
        .range(from, to)

      if (filters.status) {
        listQuery = listQuery.eq("status", filters.status)
      }

      if (filters.feedbackType) {
        listQuery = listQuery.eq("feedback_type", filters.feedbackType)
      }

      if (filters.priority) {
        listQuery = listQuery.eq("priority", filters.priority)
      }

      if (filters.userId) {
        listQuery = listQuery.eq("user_id", filters.userId)
      }

      if (filters.keyword) {
        listQuery = listQuery.or(buildAdminFeedbackKeywordOrClause(filters.keyword))
      }

      return await listQuery
    })(),
  ])

  assertSupabaseSuccess(countResult.error, "failed to count filtered admin feedback list")

  const { data, error } = ticketsResult

  assertSupabaseSuccess(error, "failed to query admin feedback list")

  const tickets = (data ?? []) as FeedbackTicketRow[]
  const repliesByTicketId = await getFeedbackReplies(tickets.map((item) => item.id))
  const avatarByUserId = await getUserAvatarByUserIds([...new Set(tickets.map((t) => t.user_id))])

  return {
    items: tickets.map((ticket) => ({
      ...mapListItem(ticket, repliesByTicketId.get(ticket.id) ?? []),
      statusLabel: ADMIN_FEEDBACK_STATUS_LABEL_MAP[ticket.status],
      userId: ticket.user_id,
      userNicknameSnapshot: normalizeOptionalString(ticket.user_nickname_snapshot),
      userAvatarUrl: avatarByUserId.get(ticket.user_id) ?? null,
      userPhoneSnapshot: normalizeOptionalString(ticket.user_phone_snapshot),
      userContactEmailSnapshot: normalizeOptionalString(ticket.user_contact_email_snapshot),
      priority: ticket.priority,
      source: normalizeOptionalString(ticket.source),
    })),
    total: countResult.count ?? 0,
    page,
    limit,
    stats,
  }
}

export async function getAdminFeedbackDetail(
  ticketId: string,
): Promise<AdminFeedbackTicketDetailResponseData | null> {
  const supabase = createSupabaseAdminClient()
  const { data, error } = await supabase
    .from("feedback_tickets")
    .select(
      "id, user_id, feedback_type, status, priority, source, title, content, contact_method, user_nickname_snapshot, user_phone_snapshot, user_contact_email_snapshot, submitted_at, updated_at, last_reply_at",
    )
    .eq("id", ticketId)
    .maybeSingle()

  assertSupabaseSuccess(error, "failed to query admin feedback detail")

  if (!data) {
    return null
  }

  const ticket = data as FeedbackTicketRow
  const repliesByTicketId = await getFeedbackReplies([ticket.id])

  const nicknameSnapshot = normalizeOptionalString(ticket.user_nickname_snapshot)
  const emailSnapshot = normalizeOptionalString(ticket.user_contact_email_snapshot)

  const userSnapshot = await buildAdminFeedbackUserSnapshot(ticket.user_id, {
    nicknameSnapshot,
    emailSnapshot,
  })

  return {
    id: ticket.id,
    userId: ticket.user_id,
    feedbackType: ticket.feedback_type,
    feedbackTypeLabel: FEEDBACK_TYPE_LABEL_MAP[ticket.feedback_type],
    status: ticket.status,
    statusLabel: ADMIN_FEEDBACK_STATUS_LABEL_MAP[ticket.status],
    priority: ticket.priority,
    source: normalizeOptionalString(ticket.source),
    title: ticket.title,
    content: ticket.content,
    contactMethod: normalizeOptionalString(ticket.contact_method),
    userNicknameSnapshot: nicknameSnapshot,
    userPhoneSnapshot: normalizeOptionalString(ticket.user_phone_snapshot),
    userContactEmailSnapshot: emailSnapshot,
    submittedAt: toIsoDate(ticket.submitted_at),
    updatedAt: toIsoDate(ticket.updated_at),
    lastReplyAt: ticket.last_reply_at ? toIsoDate(ticket.last_reply_at) : null,
    replies: (repliesByTicketId.get(ticket.id) ?? []).map(mapReplyRow),
    userSnapshot,
  }
}

export async function adminReplyFeedback(
  ticketId: string,
  input: AdminReplyFeedbackRequest,
  fallbackAdminId: string,
) {
  const supabase = createSupabaseAdminClient()
  const now = new Date().toISOString()
  const nextStatus = input.status ?? "replied"

  const { data: ticket, error: ticketError } = await supabase
    .from("feedback_tickets")
    .select("id")
    .eq("id", ticketId)
    .maybeSingle()

  assertSupabaseSuccess(ticketError, "failed to check feedback ticket before reply")

  if (!ticket) {
    return null
  }

  const { error: replyError } = await supabase.from("feedback_replies").insert({
    ticket_id: ticketId,
    author_type: "admin",
    author_id: fallbackAdminId,
    content: input.content.trim(),
    is_internal_note: false,
    created_at: now,
  })

  assertSupabaseSuccess(replyError, "failed to create admin feedback reply")

  const { error: updateError } = await supabase
    .from("feedback_tickets")
    .update({
      status: nextStatus,
      last_reply_at: now,
      closed_at: nextStatus === "closed" ? now : null,
      updated_at: now,
    })
    .eq("id", ticketId)

  assertSupabaseSuccess(updateError, "failed to update feedback ticket after reply")

  return getAdminFeedbackDetail(ticketId)
}

export async function adminUpdateFeedbackStatus(
  ticketId: string,
  input: AdminUpdateFeedbackStatusRequest,
) {
  const supabase = createSupabaseAdminClient()
  const now = new Date().toISOString()
  const { data: ticket, error: ticketError } = await supabase
    .from("feedback_tickets")
    .select("id")
    .eq("id", ticketId)
    .maybeSingle()

  assertSupabaseSuccess(ticketError, "failed to check feedback ticket before status update")

  if (!ticket) {
    return null
  }

  const { error: updateError } = await supabase
    .from("feedback_tickets")
    .update({
      status: input.status,
      closed_at: input.status === "closed" ? now : null,
      updated_at: now,
    })
    .eq("id", ticketId)

  assertSupabaseSuccess(updateError, "failed to update feedback ticket status")

  return getAdminFeedbackDetail(ticketId)
}

export async function adminDeleteFeedback(ticketId: string): Promise<boolean> {
  const supabase = createSupabaseAdminClient()
  const { data, error } = await supabase
    .from("feedback_tickets")
    .delete()
    .eq("id", ticketId)
    .select("id")

  assertSupabaseSuccess(error, "failed to delete feedback ticket")

  return Array.isArray(data) && data.length > 0
}

export async function adminBatchDeleteFeedback(
  ticketIds: string[],
): Promise<AdminFeedbackBatchDeleteResponseData> {
  const supabase = createSupabaseAdminClient()
  const normalizedIds = Array.from(
    new Set(ticketIds.map((id) => id.trim()).filter((id) => id.length > 0)),
  )

  const { data, error } = await supabase
    .from("feedback_tickets")
    .delete()
    .in("id", normalizedIds)
    .select("id")

  assertSupabaseSuccess(error, "failed to batch delete feedback tickets")

  const deletedIds = Array.isArray(data)
    ? (data as Array<{ id: string }>).map((item) => item.id)
    : []

  return {
    deletedCount: deletedIds.length,
    deletedIds,
  }
}

export async function getAdminFeedbackUserSnapshot(
  ticketId: string,
): Promise<AdminFeedbackUserSnapshotResponseData | null> {
  const supabase = createSupabaseAdminClient()
  const { data, error } = await supabase
    .from("feedback_tickets")
    .select("id, user_id, user_nickname_snapshot, user_contact_email_snapshot")
    .eq("id", ticketId)
    .maybeSingle()

  assertSupabaseSuccess(error, "failed to query admin feedback user snapshot")

  if (!data) {
    return null
  }

  const ticket = data as {
    id: string
    user_id: string
    user_nickname_snapshot: string | null
    user_contact_email_snapshot: string | null
  }

  const userSnapshot = await buildAdminFeedbackUserSnapshot(ticket.user_id, {
    nicknameSnapshot: normalizeOptionalString(ticket.user_nickname_snapshot),
    emailSnapshot: normalizeOptionalString(ticket.user_contact_email_snapshot),
  })

  return {
    ticketId: ticket.id,
    userId: ticket.user_id,
    userSnapshot,
  }
}
