import "server-only"

import { ROUTES } from "@/constants/routes"
import { createSupabaseAdminClient } from "@/lib/supabase/admin"

import { aiResponseInvalid, planDraftAlreadyConfirmed, planDraftNotFound } from "./errors.ts"

export type ConfirmDraftResult = {
  learningPathId: string
  currentTaskId: string
  redirectTo: string
}

export function assertDraftQualityReadyForConfirm(qualityStatus: string | null | undefined) {
  if (qualityStatus === "passed" || qualityStatus === "pilot_fallback") {
    return
  }

  if (qualityStatus === "pending") {
    throw aiResponseInvalid("草稿刚被编辑或重生成，质量复检尚未完成，请稍后再确认。")
  }

  throw aiResponseInvalid("草稿质量状态异常，请重新生成或稍后重试。")
}

function mapConfirmDraftRpcError(error: { message?: string } | null | undefined): never {
  const message = error?.message ?? ""

  if (message.includes("PLAN_DRAFT_NOT_FOUND")) {
    throw planDraftNotFound()
  }

  if (message.includes("PLAN_DRAFT_ALREADY_CONFIRMED")) {
    throw planDraftAlreadyConfirmed()
  }

  if (message.includes("PLAN_DRAFT_QUALITY_PENDING")) {
    throw aiResponseInvalid("草稿刚被编辑或重生成，质量复检尚未完成，请稍后再确认。")
  }

  if (message.includes("PLAN_DRAFT_QUALITY_INVALID")) {
    throw aiResponseInvalid("草稿质量状态异常，请重新生成或稍后重试。")
  }

  if (message.includes("PLAN_DRAFT_TASKS_INVALID")) {
    throw aiResponseInvalid("草稿任务明细不完整，请先修正或重新生成。")
  }

  if (message.includes("SELF_DIRECTED_PLAN_REQUIRED")) {
    throw aiResponseInvalid("仅自学模式支持启用教程链接生成的学习计划。")
  }

  throw new Error(`failed to confirm learning plan draft: ${message || "unknown error"}`)
}

export async function confirmPlanDraft(
  userId: string,
  draftId: string,
): Promise<ConfirmDraftResult> {
  const supabase = createSupabaseAdminClient()
  const { data, error } = await supabase.rpc("confirm_learning_plan_draft", {
    p_user_id: userId,
    p_draft_id: draftId,
  })

  if (error) {
    mapConfirmDraftRpcError(error)
  }

  const result = data as {
    learningPathId?: unknown
    currentTaskId?: unknown
    redirectTo?: unknown
  } | null

  if (
    !result
    || typeof result.learningPathId !== "string"
    || typeof result.currentTaskId !== "string"
  ) {
    throw new Error("confirm_learning_plan_draft returned invalid result")
  }

  return {
    learningPathId: result.learningPathId,
    currentTaskId: result.currentTaskId,
    redirectTo: typeof result.redirectTo === "string" ? result.redirectTo : ROUTES.learn,
  }
}
