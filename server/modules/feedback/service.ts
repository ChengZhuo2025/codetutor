import type {
  AdminFeedbackListResponseData,
  AdminFeedbackTicketDetailResponseData,
  AdminReplyFeedbackRequest,
  AdminUpdateFeedbackStatusRequest,
  CreateFeedbackRequest,
  CreateFeedbackResponseData,
  FeedbackMineListResponseData,
  FeedbackReplyItem,
  FeedbackStatus,
  FeedbackTicketDetailResponseData,
  FeedbackTicketListItem,
  FeedbackType,
} from "@/lib/api/contracts/feedback"
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

type AdminFeedbackFilters = {
  status?: FeedbackStatus
  feedbackType?: FeedbackType
  keyword?: string
  userId?: string
  limit?: number
}

export async function getAdminFeedbackList(
  filters: AdminFeedbackFilters,
): Promise<AdminFeedbackListResponseData> {
  const supabase = createSupabaseAdminClient()
  let query = supabase
    .from("feedback_tickets")
    .select(
      "id, user_id, feedback_type, status, priority, source, title, content, contact_method, user_nickname_snapshot, user_phone_snapshot, user_contact_email_snapshot, submitted_at, updated_at, last_reply_at",
    )
    .order("updated_at", { ascending: false })
    .limit(filters.limit ?? 50)

  if (filters.status) {
    query = query.eq("status", filters.status)
  }

  if (filters.feedbackType) {
    query = query.eq("feedback_type", filters.feedbackType)
  }

  if (filters.userId) {
    query = query.eq("user_id", filters.userId)
  }

  if (filters.keyword) {
    query = query.or(
      `title.ilike.%${filters.keyword}%,content.ilike.%${filters.keyword}%,user_nickname_snapshot.ilike.%${filters.keyword}%`,
    )
  }

  const { data, error } = await query

  assertSupabaseSuccess(error, "failed to query admin feedback list")

  const tickets = (data ?? []) as FeedbackTicketRow[]
  const repliesByTicketId = await getFeedbackReplies(tickets.map((item) => item.id))

  return {
    items: tickets.map((ticket) => ({
      ...mapListItem(ticket, repliesByTicketId.get(ticket.id) ?? []),
      userId: ticket.user_id,
      userNicknameSnapshot: normalizeOptionalString(ticket.user_nickname_snapshot),
      userPhoneSnapshot: normalizeOptionalString(ticket.user_phone_snapshot),
      userContactEmailSnapshot: normalizeOptionalString(ticket.user_contact_email_snapshot),
      priority: ticket.priority,
      source: normalizeOptionalString(ticket.source),
    })),
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

  return {
    id: ticket.id,
    userId: ticket.user_id,
    feedbackType: ticket.feedback_type,
    feedbackTypeLabel: FEEDBACK_TYPE_LABEL_MAP[ticket.feedback_type],
    status: ticket.status,
    statusLabel: FEEDBACK_STATUS_LABEL_MAP[ticket.status],
    priority: ticket.priority,
    source: normalizeOptionalString(ticket.source),
    title: ticket.title,
    content: ticket.content,
    contactMethod: normalizeOptionalString(ticket.contact_method),
    userNicknameSnapshot: normalizeOptionalString(ticket.user_nickname_snapshot),
    userPhoneSnapshot: normalizeOptionalString(ticket.user_phone_snapshot),
    userContactEmailSnapshot: normalizeOptionalString(ticket.user_contact_email_snapshot),
    submittedAt: toIsoDate(ticket.submitted_at),
    updatedAt: toIsoDate(ticket.updated_at),
    lastReplyAt: ticket.last_reply_at ? toIsoDate(ticket.last_reply_at) : null,
    replies: (repliesByTicketId.get(ticket.id) ?? []).map(mapReplyRow),
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
