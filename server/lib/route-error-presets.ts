import { jsonError } from "./route-response.ts"

export const ROUTE_ERROR_MESSAGES = {
  userProfileNotFound: "当前用户档案不存在。",
  currentTaskNotFound: "当前任务不存在。",
  historyPlanNotFound: "学习计划不存在。",
  feedbackTicketNotFound: "反馈单不存在。",
  feedbackRecordNotFound: "反馈记录不存在。",
  onboardingTemplateNotFound: "未找到对应的工具或路径模板。",
  onboardingPathOptionsNotFound: "未找到对应的工具或路径选项。",
  invalidHistoryPlanId: "学习计划 ID 不合法。",
  invalidFeedbackTicketId: "反馈单 ID 不合法。",
  invalidAdminReplyBody: "管理员回复请求体不合法。",
  invalidAdminStatusBody: "管理员状态更新请求体不合法。",
} as const

export function jsonUserProfileNotFound() {
  return jsonError("NOT_FOUND", ROUTE_ERROR_MESSAGES.userProfileNotFound, 404)
}

export function jsonCurrentTaskNotFound() {
  return jsonError("NOT_FOUND", ROUTE_ERROR_MESSAGES.currentTaskNotFound, 404)
}

export function jsonHistoryPlanNotFound() {
  return jsonError("NOT_FOUND", ROUTE_ERROR_MESSAGES.historyPlanNotFound, 404)
}

export function jsonFeedbackTicketNotFound() {
  return jsonError("NOT_FOUND", ROUTE_ERROR_MESSAGES.feedbackTicketNotFound, 404)
}

export function jsonFeedbackRecordNotFound() {
  return jsonError("NOT_FOUND", ROUTE_ERROR_MESSAGES.feedbackRecordNotFound, 404)
}

export function jsonOnboardingTemplateNotFound() {
  return jsonError("NOT_FOUND", ROUTE_ERROR_MESSAGES.onboardingTemplateNotFound, 404)
}

export function jsonOnboardingPathOptionsNotFound() {
  return jsonError("NOT_FOUND", ROUTE_ERROR_MESSAGES.onboardingPathOptionsNotFound, 404)
}

export function jsonInvalidHistoryPlanId() {
  return jsonError("BAD_REQUEST", ROUTE_ERROR_MESSAGES.invalidHistoryPlanId, 400)
}

export function jsonInvalidFeedbackTicketId() {
  return jsonError("BAD_REQUEST", ROUTE_ERROR_MESSAGES.invalidFeedbackTicketId, 400)
}

export function jsonInvalidAdminReplyBody() {
  return jsonError("BAD_REQUEST", ROUTE_ERROR_MESSAGES.invalidAdminReplyBody, 400)
}

export function jsonInvalidAdminStatusBody() {
  return jsonError("BAD_REQUEST", ROUTE_ERROR_MESSAGES.invalidAdminStatusBody, 400)
}
