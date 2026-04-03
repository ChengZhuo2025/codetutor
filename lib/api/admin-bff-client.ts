import { resolveAdminApiFailure } from "@/features/admin-shell/lib/admin-session-expiry"
import type { ApiResponse, ApiErrorResponse } from "@/lib/api/types"
import { unwrapResponse } from "@/lib/api/types"

const API_BASE_PATH = "/api"
export const ADMIN_SESSION_EXPIRED_MESSAGE = "管理员登录已失效，正在返回登录页…"

type AdminApiFailurePayload = Pick<ApiErrorResponse, "code" | "message"> | null | undefined

export class AdminApiError extends Error {
  readonly status: number
  readonly code?: string
  readonly authExpired: boolean

  constructor(options: {
    status: number
    code?: string
    message: string
    authExpired: boolean
  }) {
    super(options.message)
    this.name = "AdminApiError"
    this.status = options.status
    this.code = options.code
    this.authExpired = options.authExpired
  }
}

function buildAdminApiError(
  status: number,
  payload: AdminApiFailurePayload,
  fallbackMessage: string,
) {
  const failure = resolveAdminApiFailure(status, payload, fallbackMessage)
  return new AdminApiError({
    status,
    code: payload?.code,
    message: failure.authExpired ? ADMIN_SESSION_EXPIRED_MESSAGE : failure.message,
    authExpired: failure.authExpired,
  })
}

async function readAdminErrorPayload(response: Response): Promise<AdminApiFailurePayload> {
  const contentType = response.headers.get("Content-Type") ?? ""
  if (!contentType.includes("application/json")) {
    return null
  }

  try {
    return (await response.clone().json()) as ApiErrorResponse
  } catch {
    return null
  }
}

export function isAdminApiError(error: unknown): error is AdminApiError {
  return error instanceof AdminApiError
}

export function isAdminSessionExpiredError(error: unknown): error is AdminApiError {
  return isAdminApiError(error) && error.authExpired
}

export function getAdminApiErrorMessage(error: unknown, fallbackMessage: string) {
  if (isAdminApiError(error)) {
    return error.message
  }

  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message
  }

  return fallbackMessage
}

export async function adminBffFetch(
  path: string,
  init?: RequestInit,
  fallbackMessage = "请求失败",
): Promise<Response> {
  const headers = new Headers(init?.headers)
  const isFormData =
    typeof FormData !== "undefined" && init?.body instanceof FormData

  if (
    init?.body
    && typeof init.body === "string"
    && !headers.has("Content-Type")
  ) {
    headers.set("Content-Type", "application/json")
  }

  if (isFormData) {
    headers.delete("Content-Type")
  }

  const response = await fetch(`${API_BASE_PATH}${path}`, {
    ...init,
    credentials: "include",
    headers,
    cache: "no-store",
  })

  if (!response.ok) {
    throw buildAdminApiError(
      response.status,
      await readAdminErrorPayload(response),
      fallbackMessage,
    )
  }

  return response
}

export async function adminRequestData<T>(
  path: string,
  init?: RequestInit,
  fallbackMessage = "请求失败",
): Promise<T> {
  const response = await adminBffFetch(path, init, fallbackMessage)
  const json = (await response.json()) as ApiResponse<T>

  if (json.code !== "OK") {
    throw buildAdminApiError(response.status, json, fallbackMessage)
  }

  return unwrapResponse(json)
}
