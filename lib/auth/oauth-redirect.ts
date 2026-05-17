import { ROUTES } from "@/constants/routes"
import type { AuthOAuthProvider } from "@/features/auth/types"

type OAuthRedirectFlow = "login" | "link"

type BuildOAuthRedirectToInput = {
  provider: AuthOAuthProvider
  flow: OAuthRedirectFlow
  intent?: string | null
  redirectTo?: string | null
}

function normalizeAppOrigin(value: string | undefined) {
  if (!value) return null

  try {
    const url = new URL(value)
    return url.origin
  } catch {
    return null
  }
}

export function getOAuthRedirectOrigin() {
  return normalizeAppOrigin(process.env.NEXT_PUBLIC_APP_URL)
    ?? (typeof window === "undefined" ? null : window.location.origin)
}

export function buildOAuthRedirectTo({
  provider,
  flow,
  intent,
  redirectTo,
}: BuildOAuthRedirectToInput) {
  const origin = getOAuthRedirectOrigin()
  if (!origin) {
    throw new Error("Missing NEXT_PUBLIC_APP_URL for OAuth redirect.")
  }

  const callbackParams = new URLSearchParams({ provider, flow })

  if (intent === "subscribe") {
    callbackParams.set("intent", "subscribe")
  }

  if (redirectTo) {
    callbackParams.set("redirectTo", redirectTo)
  }

  return `${origin}${ROUTES.authCallback}?${callbackParams.toString()}`
}
