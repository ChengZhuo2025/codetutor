import { ROUTES } from "@/constants/routes"
import type { AuthSessionSummaryResponseData } from "@/lib/api/contracts/auth"
import { apiClient } from "@/lib/api/client"

export async function resolveAuthenticatedRedirectTo() {
  const response = await apiClient.get<AuthSessionSummaryResponseData>("/auth/session")

  if (response.code === "OK") {
    return response.data.redirectTo
  }

  if (response.code === "AUTH_REQUIRED") {
    return ROUTES.login
  }

  return null
}
