import "server-only"

import { createSupabaseAdminClient } from "@/lib/supabase/admin"
import { assertSupabaseSuccess } from "@/server/lib/supabase"
import { MATERIAL_PLAN_ACTIVE_STATUSES } from "./constants.ts"

type MaterialPlanRunExecutor = (runId: string) => Promise<void>

const activeRunIds = new Set<string>()
let runExecutor: MaterialPlanRunExecutor | null = null

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

export async function resumePendingMaterialPlanRuns(limit = 1) {
  if (!runExecutor) {
    return 0
  }

  const supabase = createSupabaseAdminClient()
  const { data, error } = await supabase
    .from("learning_plan_generation_runs")
    .select("id")
    .in("status", [...MATERIAL_PLAN_ACTIVE_STATUSES])
    .is("finished_at", null)
    .order("created_at", { ascending: true })
    .limit(limit)

  assertSupabaseSuccess(error, "failed to load pending material plan runs")

  let kicked = 0
  for (const row of (data ?? []) as Array<{ id: string }>) {
    if (kickMaterialPlanRun(row.id)) {
      kicked += 1
    }
  }

  return kicked
}
