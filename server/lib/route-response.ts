export type AdminAuthFailure =
  | {
      ok: false
      reason: "missing-config" | "forbidden"
      message: string
    }

export function jsonSuccess<T>(data: T, message = "success", init?: ResponseInit) {
  return Response.json(
    {
      code: "OK",
      message,
      data,
    },
    {
      status: 200,
      ...init,
    },
  )
}

export function jsonError(code: string, message: string, status: number, init?: ResponseInit) {
  return Response.json(
    {
      code,
      message,
      data: null,
    },
    {
      status,
      ...init,
    },
  )
}

export function jsonAuthRequired(message: string) {
  return jsonError("AUTH_REQUIRED", message, 401)
}

export function jsonAdminAuthError(result: AdminAuthFailure) {
  return jsonError(
    result.reason === "missing-config" ? "INTERNAL_ERROR" : "FORBIDDEN",
    result.message,
    result.reason === "missing-config" ? 500 : 403,
  )
}
