import "server-only"

export class LearningPlanServiceError extends Error {
  readonly code: string
  readonly httpStatus: number

  constructor(code: string, message: string, httpStatus: number) {
    super(message)
    this.name = "LearningPlanServiceError"
    this.code = code
    this.httpStatus = httpStatus
  }
}

export function planDraftNotFound(message = "草稿不存在。") {
  return new LearningPlanServiceError("PLAN_DRAFT_NOT_FOUND", message, 404)
}

export function planDraftAlreadyConfirmed(message = "该草稿已确认，无法重复激活。") {
  return new LearningPlanServiceError("PLAN_DRAFT_ALREADY_CONFIRMED", message, 409)
}

export function materialIntakeNotFound(message = "材料摄取记录不存在。") {
  return new LearningPlanServiceError("MATERIAL_INTAKE_NOT_FOUND", message, 404)
}

export function aiResponseInvalid(message = "学习计划生成结果格式无效，请稍后重试或更换材料。") {
  return new LearningPlanServiceError("AI_RESPONSE_INVALID", message, 422)
}

export function aiProviderFailed(message = "AI 服务暂时不可用，请稍后重试。") {
  return new LearningPlanServiceError("AI_PROVIDER_ERROR", message, 502)
}
