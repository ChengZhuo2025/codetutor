type MaterialPlanStatusDisplayInput = {
  status?: string | null
  progressMessage?: string | null
  errorCode?: string | null
  errorMessage?: string | null
}

const TRANSIENT_DRAFT_LOAD_MESSAGE =
  "草稿已生成，但读取详情时网络临时异常。系统会自动重试，请稍等；如果仍失败，可以关闭后重新打开生成弹框。"

export function isTransientMaterialPlanDraftLoadError(
  code: string | undefined,
  message: string | null | undefined,
) {
  if (code !== "INTERNAL_ERROR") {
    return false
  }

  const text = message ?? ""
  return (
    text.includes("fetch failed")
    || text.includes("ENOTFOUND")
    || text.includes("failed to load plan draft detail")
    || text.includes("failed to load draft tasks")
    || text.includes("failed to load draft input context")
  )
}

export function resolveMaterialPlanDraftLoadErrorMessage(
  code: string | undefined,
  fallback: string | null | undefined,
) {
  if (isTransientMaterialPlanDraftLoadError(code, fallback)) {
    return TRANSIENT_DRAFT_LOAD_MESSAGE
  }

  return fallback?.trim() || "读取学习计划草稿失败。"
}

function resolveMaterialPlanFailureMessage(
  errorCode: string | null | undefined,
  fallback: string | null | undefined,
) {
  switch (errorCode) {
    case "AI_PROVIDER_ERROR":
      return "AI 服务响应超时，请稍后重试，或在后台检查当前规划模型的可用性与超时配置。"
    case "AI_RESPONSE_INVALID":
      return "AI 返回的学习计划结构不完整，请稍后重试或更换更清晰的教程材料。"
    case "MATERIAL_FETCH_FAILED":
      return "教程链接抓取失败或超时，请稍后重试，或换用公开视频详情页链接。"
    case "MATERIAL_INSUFFICIENT_CONTENT":
      return "教程内容证据不足，无法生成稳定计划，请换一篇教程或补充学习目标。"
    case "MATERIAL_PLAN_MIGRATION_REQUIRED":
      return "生成队列尚未完成数据库迁移，请联系管理员处理后再重试。"
    default:
      return fallback?.trim() || "生成学习计划失败，请稍后重试。"
  }
}

export function resolveMaterialPlanStatusDisplay(input: MaterialPlanStatusDisplayInput) {
  if (input.status !== "failed") {
    return {
      progressMessage: input.progressMessage ?? "处理中",
      errorMessage: input.errorMessage ?? null,
    }
  }

  const failureMessage = resolveMaterialPlanFailureMessage(
    input.errorCode,
    input.errorMessage ?? input.progressMessage,
  )

  return {
    progressMessage: failureMessage,
    errorMessage: failureMessage,
  }
}
