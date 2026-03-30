import { createSupabaseAdminClient } from "@/lib/supabase/admin"
import { assertSupabaseSuccess } from "@/server/lib/supabase"

export const LEARNING_PATH_INTERRUPT_DAYS = 7

export type LearningPathPersistentStatus =
  | "active"
  | "interrupted"
  | "completed"
  | "abandoned"
  | "archived"

type LearningPathSummaryRow = {
  id: string
  status: LearningPathPersistentStatus
  updated_at: string
}

type ReconcileCandidateRow = {
  id: string
  last_activity_at: string | null
  started_at: string
  updated_at: string
  created_at: string
}

export type LearningPathStatusSummary = {
  activeCount: number
  interruptedCount: number
  completedCount: number
  abandonedCount: number
  totalCount: number
  activePathId: string | null
  canCreateNewPlan: boolean
}

function getInterruptCutoffDate() {
  return new Date(Date.now() - LEARNING_PATH_INTERRUPT_DAYS * 24 * 60 * 60 * 1000)
}

function resolveLastActivityAt(row: ReconcileCandidateRow) {
  return (
    row.last_activity_at
    ?? row.updated_at
    ?? row.started_at
    ?? row.created_at
  )
}

export async function reconcileInterruptedLearningPaths(userId: string) {
  const supabase = createSupabaseAdminClient()
  const { data, error } = await supabase
    .from("user_learning_paths")
    .select("id, last_activity_at, started_at, updated_at, created_at")
    .eq("user_id", userId)
    .eq("status", "active")

  assertSupabaseSuccess(error, "failed to query active learning paths for interruption reconciliation")

  const cutoff = getInterruptCutoffDate().getTime()
  const candidates = ((data ?? []) as ReconcileCandidateRow[]).filter((row) => {
    const lastActivityAt = new Date(resolveLastActivityAt(row)).getTime()
    return Number.isFinite(lastActivityAt) && lastActivityAt <= cutoff
  })

  if (candidates.length === 0) {
    return [] as string[]
  }

  const now = new Date().toISOString()
  const interruptedIds = candidates.map((row) => row.id)

  const { error: updateError } = await supabase
    .from("user_learning_paths")
    .update({
      status: "interrupted",
      interrupted_at: now,
      updated_at: now,
    })
    .in("id", interruptedIds)
    .eq("user_id", userId)
    .eq("status", "active")

  assertSupabaseSuccess(updateError, "failed to update interrupted learning paths")

  return interruptedIds
}

export async function getLearningPathStatusSummary(
  userId: string,
): Promise<LearningPathStatusSummary> {
  await reconcileInterruptedLearningPaths(userId)

  const supabase = createSupabaseAdminClient()
  const { data, error } = await supabase
    .from("user_learning_paths")
    .select("id, status, updated_at")
    .eq("user_id", userId)
    .neq("status", "archived")
    .order("updated_at", { ascending: false })

  assertSupabaseSuccess(error, "failed to query learning path summary")

  const rows = (data ?? []) as LearningPathSummaryRow[]
  const summary: LearningPathStatusSummary = {
    activeCount: 0,
    interruptedCount: 0,
    completedCount: 0,
    abandonedCount: 0,
    totalCount: rows.length,
    activePathId: null,
    canCreateNewPlan: true,
  }

  for (const row of rows) {
    if (row.status === "active") {
      summary.activeCount += 1
      if (!summary.activePathId) {
        summary.activePathId = row.id
      }
      continue
    }

    if (row.status === "interrupted") {
      summary.interruptedCount += 1
      continue
    }

    if (row.status === "completed") {
      summary.completedCount += 1
      continue
    }

    if (row.status === "abandoned") {
      summary.abandonedCount += 1
    }
  }

  summary.canCreateNewPlan = summary.activeCount === 0

  return summary
}

export async function touchLearningPathActivity(
  userId: string,
  pathId: string,
  touchedAt = new Date().toISOString(),
) {
  const supabase = createSupabaseAdminClient()

  const { error: pathError } = await supabase
    .from("user_learning_paths")
    .update({
      last_activity_at: touchedAt,
      updated_at: touchedAt,
    })
    .eq("id", pathId)
    .eq("user_id", userId)
    .eq("status", "active")

  assertSupabaseSuccess(pathError, "failed to touch learning path activity")

  const { error: profileError } = await supabase
    .from("user_profiles")
    .update({
      last_learning_at: touchedAt,
      updated_at: touchedAt,
    })
    .eq("user_id", userId)

  assertSupabaseSuccess(profileError, "failed to touch user profile learning activity")
}
