export type ApiCode =
  | "OK"
  | "BAD_REQUEST"
  | "AUTH_REQUIRED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "CONFLICT"
  | "VALIDATION_FAILED"
  | "AI_PROVIDER_ERROR"
  | "RATE_LIMITED"
  | "INTERNAL_ERROR"

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
