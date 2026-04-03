import { ADMIN_ROUTES } from "@/constants/routes"

type ApiFailurePayload = {
  code?: string
  message?: string
} | null | undefined

export function resolveAdminApiFailure(
  status: number,
  payload: ApiFailurePayload,
  fallbackMessage: string,
) {
  const authExpired = status === 403 && payload?.code === "ADMIN_FORBIDDEN"
  return {
    authExpired,
    message:
      typeof payload?.message === "string" && payload.message.trim().length > 0
        ? payload.message
        : fallbackMessage,
  }
}

export function buildAdminLoginRedirectPath(pathname: string) {
  return `${ADMIN_ROUTES.login}?next=${encodeURIComponent(pathname)}`
}
