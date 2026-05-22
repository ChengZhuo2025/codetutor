import { createClient, type Session, type SupabaseClient } from "@supabase/supabase-js"
import { getPublicSupabaseEnv } from "./env.ts"

let browserClient: SupabaseClient | undefined

type BrowserAuthClient = {
  auth: {
    getSession: () => Promise<{
      data: {
        session: Session | null
      }
      error?: unknown
    }>
    signOut: (options?: { scope?: "global" | "local" | "others" }) => Promise<unknown>
  }
}

export function getSupabaseBrowserClientAuthOptions() {
  return {
    autoRefreshToken: false,
    persistSession: true,
    detectSessionInUrl: true,
  }
}

export function createSupabaseBrowserClient(): SupabaseClient {
  if (browserClient) {
    return browserClient
  }

  const { url, anonKey } = getPublicSupabaseEnv()

  browserClient = createClient(url, anonKey, {
    auth: getSupabaseBrowserClientAuthOptions(),
  })

  return browserClient
}

export function isInvalidSupabaseRefreshTokenError(error: unknown) {
  if (!error || typeof error !== "object") {
    return false
  }

  const { name, message, code } = error as {
    name?: unknown
    message?: unknown
    code?: unknown
  }
  const errorName = typeof name === "string" ? name : ""
  const errorMessage = typeof message === "string" ? message : ""
  const errorCode = typeof code === "string" ? code : ""

  return (
    errorCode === "refresh_token_not_found"
    || errorCode === "session_not_found"
    || errorName === "AuthSessionMissingError"
    || (
      errorName === "AuthApiError"
      && errorMessage.includes("Invalid Refresh Token")
    )
    || errorMessage.includes("Refresh Token Not Found")
  )
}

export async function clearSupabaseBrowserSession(
  supabase: BrowserAuthClient = createSupabaseBrowserClient(),
) {
  await supabase.auth.signOut({ scope: "local" }).catch(() => undefined)

  if (typeof window !== "undefined") {
    await fetch("/api/auth/logout", { method: "POST" }).catch(() => undefined)
  }
}

export async function getSafeSupabaseBrowserSession(
  supabase: BrowserAuthClient = createSupabaseBrowserClient(),
) {
  try {
    const result = await supabase.auth.getSession()

    if (result.error) {
      if (isInvalidSupabaseRefreshTokenError(result.error)) {
        await clearSupabaseBrowserSession(supabase)
        return null
      }

      throw result.error
    }

    return result.data.session ?? null
  } catch (error) {
    if (isInvalidSupabaseRefreshTokenError(error)) {
      await clearSupabaseBrowserSession(supabase)
      return null
    }

    throw error
  }
}
