import "server-only"

import { createSupabaseAdminClient } from "@/lib/supabase/admin"
import { assertSupabaseSuccess } from "@/server/lib/supabase"
import { materialIntakeNotFound } from "@/server/modules/learning-plans/errors.ts"
import { MATERIAL_PLAN_ACTIVE_STATUSES } from "./constants.ts"
import { resumePendingMaterialPlanRuns } from "./queue.ts"

export type MaterialIntakeStatusResult = {
  intakeId: string
  status: "queued" | "extracting" | "planning" | "quality_checking" | "ready" | "failed"
  processingStage: string | null
  progressPercent: number | null
  progressMessage: string | null
  draftId: string | null
  runId: string | null
  errorCode: string | null
  errorMessage: string | null
}

export async function getMaterialIntakeStatus(
  userId: string,
  intakeId: string,
): Promise<MaterialIntakeStatusResult> {
  const supabase = createSupabaseAdminClient()
  return getMaterialIntakeStatusFromClient(
    supabase,
    userId,
    intakeId,
    resumePendingMaterialPlanRuns,
  )
}

export async function getMaterialIntakeStatusFromClient(
  supabase: ReturnType<typeof createSupabaseAdminClient>,
  userId: string,
  intakeId: string,
  resumePendingRuns: (limit?: number, preferredRunId?: string | null) => Promise<unknown>,
): Promise<MaterialIntakeStatusResult> {
  const { data: intakeData, error: intakeError } = await supabase
    .from("learning_material_intakes")
    .select(
      "id, user_id, status, processing_stage, progress_percent, progress_message, latest_run_id, latest_draft_id, error_code",
    )
    .eq("id", intakeId)
    .maybeSingle()

  assertSupabaseSuccess(intakeError, "failed to load material intake status")

  const intake = intakeData as {
    id: string
    user_id: string
    status: MaterialIntakeStatusResult["status"]
    processing_stage: string | null
    progress_percent: number | null
    progress_message: string | null
    latest_run_id: string | null
    latest_draft_id: string | null
    error_code: string | null
  } | null

  if (!intake || intake.user_id !== userId) {
    throw materialIntakeNotFound()
  }

  if ((MATERIAL_PLAN_ACTIVE_STATUSES as readonly string[]).includes(intake.status)) {
    await resumePendingRuns(1, intake.latest_run_id)
  }

  let runId = intake.latest_run_id
  let errorMessage: string | null = null

  if (runId && intake.status !== "ready") {
    const { data: runData, error: runError } = await supabase
      .from("learning_plan_generation_runs")
      .select("id, error_message")
      .eq("id", runId)
      .maybeSingle()

    assertSupabaseSuccess(runError, "failed to load latest material plan run")
    const run = runData as { id: string; error_message: string | null } | null
    runId = run?.id ?? runId
    errorMessage = run?.error_message ?? null
  }

  return {
    intakeId: intake.id,
    status: intake.status,
    processingStage: intake.processing_stage,
    progressPercent: intake.progress_percent,
    progressMessage: intake.progress_message,
    draftId: intake.latest_draft_id,
    runId,
    errorCode: intake.error_code,
    errorMessage,
  }
}
