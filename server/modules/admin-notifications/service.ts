import type {
  AdminCreateNotificationRequest,
  AdminNotificationListResponseData,
  AdminNotificationMutationResponseData,
} from "@/lib/api/contracts/admin"
import { createSupabaseAdminClient } from "@/lib/supabase/admin"
import { assertSupabaseSuccess } from "@/server/lib/supabase"

type AdminNotificationRow = {
  id: string
  severity: "info" | "warning" | "critical"
  category: "feedback" | "payment" | "ai" | "system" | "user"
  title: string
  content: string
  status: "unread" | "read" | "dismissed"
  target_url: string | null
  source_type: string
  source_id: string | null
  payload: Record<string, unknown> | null
  created_at: string
  updated_at: string
  read_at: string | null
  dismissed_at: string | null
}

function mapRow(row: AdminNotificationRow) {
  return {
    id: row.id,
    severity: row.severity,
    category: row.category,
    title: row.title,
    content: row.content,
    status: row.status,
    targetUrl: row.target_url,
    sourceType: row.source_type,
    sourceId: row.source_id,
    payload: row.payload ?? {},
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    readAt: row.read_at,
    dismissedAt: row.dismissed_at,
  }
}

export async function listAdminNotifications(input: {
  status?: "unread" | "read" | "dismissed" | "all"
  category?: "feedback" | "payment" | "ai" | "system" | "user" | "all"
  limit: number
  page: number
}): Promise<AdminNotificationListResponseData> {
  const supabase = createSupabaseAdminClient()
  const limit = input.limit
  const page = input.page > 0 ? input.page : 1
  const from = (page - 1) * limit
  const to = from + limit - 1

  let countQuery = supabase.from("admin_notifications").select("*", { count: "exact", head: true })
  if (input.status && input.status !== "all") {
    countQuery = countQuery.eq("status", input.status)
  }
  if (input.category && input.category !== "all") {
    countQuery = countQuery.eq("category", input.category)
  }

  const [countResult, unreadResult] = await Promise.all([
    countQuery,
    supabase.from("admin_notifications").select("*", { count: "exact", head: true }).eq("status", "unread"),
  ])

  assertSupabaseSuccess(countResult.error, "failed to count admin notifications")
  assertSupabaseSuccess(unreadResult.error, "failed to count unread admin notifications")

  let listQuery = supabase
    .from("admin_notifications")
    .select("*")
    .order("created_at", { ascending: false })
    .range(from, to)

  if (input.status && input.status !== "all") {
    listQuery = listQuery.eq("status", input.status)
  }
  if (input.category && input.category !== "all") {
    listQuery = listQuery.eq("category", input.category)
  }

  const { data, error } = await listQuery
  assertSupabaseSuccess(error, "failed to list admin notifications")

  return {
    items: ((data ?? []) as AdminNotificationRow[]).map(mapRow),
    total: countResult.count ?? 0,
    unreadCount: unreadResult.count ?? 0,
  }
}

async function loadNotification(notificationId: string) {
  const supabase = createSupabaseAdminClient()
  const { data, error } = await supabase
    .from("admin_notifications")
    .select("*")
    .eq("id", notificationId)
    .maybeSingle()

  assertSupabaseSuccess(error, "failed to load admin notification")
  return (data as AdminNotificationRow | null) ?? null
}

async function updateAdminNotificationStatus(
  notificationId: string,
  status: "read" | "dismissed",
): Promise<AdminNotificationMutationResponseData | null> {
  const current = await loadNotification(notificationId)
  if (!current) {
    return null
  }

  const supabase = createSupabaseAdminClient()
  const now = new Date().toISOString()
  const patch: Record<string, unknown> = {
    status,
    updated_at: now,
  }
  if (status === "read") {
    patch.read_at = current.read_at ?? now
  } else {
    patch.dismissed_at = current.dismissed_at ?? now
  }

  const { error } = await supabase
    .from("admin_notifications")
    .update(patch)
    .eq("id", notificationId)

  assertSupabaseSuccess(error, "failed to update admin notification status")

  const next = await loadNotification(notificationId)
  if (!next) {
    return null
  }

  return {
    id: next.id,
    status: next.status,
    readAt: next.read_at,
    dismissedAt: next.dismissed_at,
  }
}

export async function markAdminNotificationRead(notificationId: string) {
  return updateAdminNotificationStatus(notificationId, "read")
}

export async function dismissAdminNotification(notificationId: string) {
  return updateAdminNotificationStatus(notificationId, "dismissed")
}

export async function createAdminNotification(
  input: AdminCreateNotificationRequest & {
    dedupeKey?: string
    dedupeWindowMs?: number
  },
): Promise<AdminNotificationMutationResponseData | null> {
  const supabase = createSupabaseAdminClient()
  const now = new Date().toISOString()
  const dedupeKey = input.dedupeKey?.trim() || (typeof input.payload?.dedupeKey === "string" ? input.payload.dedupeKey.trim() : "")
  if (dedupeKey) {
    const dedupeWindowMs = Math.max(60_000, input.dedupeWindowMs ?? 15 * 60_000)
    const since = new Date(Date.now() - dedupeWindowMs).toISOString()
    const { data: existing, error: existingError } = await supabase
      .from("admin_notifications")
      .select("id, status, read_at, dismissed_at")
      .eq("category", input.category)
      .eq("source_type", input.sourceType)
      .gte("created_at", since)
      .contains("payload", { dedupeKey })
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle()

    assertSupabaseSuccess(existingError, "failed to query admin notification dedupe state")
    if (existing) {
      return {
        id: String(existing.id),
        status: existing.status,
        readAt: existing.read_at,
        dismissedAt: existing.dismissed_at,
      }
    }
  }

  const { data, error } = await supabase
    .from("admin_notifications")
    .insert({
      severity: input.severity ?? "info",
      category: input.category,
      title: input.title,
      content: input.content,
      status: "unread",
      target_url: input.targetUrl ?? null,
      source_type: input.sourceType,
      source_id: input.sourceId ?? null,
      payload: input.payload ?? {},
      created_at: now,
      updated_at: now,
    })
    .select("id, status, read_at, dismissed_at")
    .single()

  assertSupabaseSuccess(error, "failed to create admin notification")

  if (!data) {
    throw new Error("admin notification creation returned no data")
  }

  return {
    id: String(data.id),
    status: data.status,
    readAt: data.read_at,
    dismissedAt: data.dismissed_at,
  }
}

export async function emitAdminNotification(
  input: AdminCreateNotificationRequest & {
    dedupeKey?: string
    dedupeWindowMs?: number
  },
) {
  try {
    return await createAdminNotification(input)
  } catch (error) {
    console.error("failed to emit admin notification", {
      title: input.title,
      category: input.category,
      sourceType: input.sourceType,
      error: error instanceof Error ? error.message : String(error),
    })
    return null
  }
}
