export type ApiCode =
  | "OK"
  | "BAD_REQUEST"
  | "AUTH_REQUIRED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "CONFLICT"
  | "OAUTH_PHONE_BINDING_REQUIRED"
  | "OAUTH_TEMP_USER_NOT_DISCARDABLE"
  | "VALIDATION_FAILED"
  | "AI_PROVIDER_ERROR"
  | "MATERIAL_UNSUPPORTED_SOURCE"
  | "MATERIAL_FETCH_FAILED"
  | "MATERIAL_INSUFFICIENT_CONTENT"
  | "MATERIAL_INTAKE_NOT_FOUND"
  | "PLAN_DRAFT_NOT_FOUND"
  | "PLAN_DRAFT_ALREADY_CONFIRMED"
  | "AI_RESPONSE_INVALID"
  | "RATE_LIMITED"
  | "INTERNAL_ERROR"
  | "ADMIN_FORBIDDEN"
  | "ADMIN_INVALID_CREDENTIALS"
  | "ADMIN_INACTIVE_ACCOUNT"
  | "ADMIN_PASSWORD_CHANGE_UNSUPPORTED"
  | "USER_ACCOUNT_DISABLED"
  | "USER_EXPORT_LIMIT_EXCEEDED"
  | "USER_NOT_SOFT_DELETED"

export type ApiSuccessResponse<T> = {
  code: "OK"
  message: string
  data: T
}

export type ApiErrorResponse = {
  code: Exclude<ApiCode, "OK">
  message: string
  data: null
}

export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse

export function unwrapResponse<T>(response: ApiResponse<T>): T {
  if (response.code !== "OK") {
    throw new Error(response.message)
  }

  return response.data
}
