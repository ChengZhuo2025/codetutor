import "server-only"

import { randomUUID } from "node:crypto"
import { createSupabaseAdminClient } from "@/lib/supabase/admin"
import { assertSupabaseSuccess } from "@/server/lib/supabase"
import { MATERIAL_PLAN_ACTIVE_STATUSES } from "./constants.ts"

type MaterialPlanRunExecutor = (runId: string) => Promise<void>

const activeRunIds = new Set<string>()
let runExecutor: MaterialPlanRunExecutor | null = null
const MATERIAL_PLAN_RUN_CLAIM_TIMEOUT_MS = 10 * 60 * 1000

export function isMaterialPlanRunClaimable(input: {
  status: string
  heartbeatAt: string | null
  now?: Date
}) {
  if (input.status === "ready" || input.status === "failed") {
    return false
  }

  if (input.status === "queued") {
    return true
  }

  if (!input.heartbeatAt) {
    return true
  }

  const heartbeatTime = new Date(input.heartbeatAt).getTime()
  if (!Number.isFinite(heartbeatTime)) {
    return true
  }

  const now = input.now ?? new Date()
  return now.getTime() - heartbeatTime > MATERIAL_PLAN_RUN_CLAIM_TIMEOUT_MS
}

export async function claimMaterialPlanRun(
  supabase: ReturnType<typeof createSupabaseAdminClient>,
  runId: string,
) {
  const claimToken = randomUUID()
  const { data, error } = await supabase.rpc("claim_material_plan_generation_run", {
    p_run_id: runId,
    p_claim_token: claimToken,
    p_timeout_seconds: Math.floor(MATERIAL_PLAN_RUN_CLAIM_TIMEOUT_MS / 1000),
  })

  assertSupabaseSuccess(error, "failed to claim material plan generation run")
  return data === true
}

export function registerMaterialPlanRunExecutor(executor: MaterialPlanRunExecutor) {
  runExecutor = executor
}

export function kickMaterialPlanRun(runId: string) {
  if (!runExecutor || activeRunIds.has(runId)) {
    return false
  }

  activeRunIds.add(runId)
  queueMicrotask(() => {
    Promise.resolve(runExecutor?.(runId))
      .catch((error) => {
        console.error("[material-plan-queue] run failed", { runId, error })
      })
      .finally(() => {
        activeRunIds.delete(runId)
      })
  })

  return true
}

export async function resumePendingMaterialPlanRuns(limit = 1, preferredRunId?: string | null) {
  if (!runExecutor) {
    return 0
  }

  let kicked = 0
  if (preferredRunId && kickMaterialPlanRun(preferredRunId)) {
    kicked += 1
  }

  if (kicked >= limit) {
    return kicked
  }

  const supabase = createSupabaseAdminClient()
  const { data, error } = await supabase
    .from("learning_plan_generation_runs")
    .select("id")
    .in("status", [...MATERIAL_PLAN_ACTIVE_STATUSES])
    .is("finished_at", null)
    .order("created_at", { ascending: true })
    .limit(limit - kicked)

  assertSupabaseSuccess(error, "failed to load pending material plan runs")

  for (const row of (data ?? []) as Array<{ id: string }>) {
    if (row.id === preferredRunId) {
      continue
    }
    if (kickMaterialPlanRun(row.id)) {
      kicked += 1
    }
  }

  return kicked
}
