"use client"

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react"
import type { AuthSessionSummaryResponseData } from "@/lib/api/contracts/auth"
import { requestData } from "@/lib/api/client"
import {
  createSupabaseBrowserClient,
  getSafeSupabaseBrowserSession,
} from "@/lib/supabase/client"
import { ROUTES } from "@/constants/routes"

type LandingAuthState =
  | { status: "checking" }
  | { status: "guest" }
  | { status: "authenticated"; summary: AuthSessionSummaryResponseData }

type LandingAuthContextValue = {
  authState: LandingAuthState
  isAuthenticated: boolean
  ctaHref: string
  ctaLabel: string
  maskedPhone: string | null
}

const LandingAuthContext = createContext<LandingAuthContextValue | null>(null)

const AUTH_CACHE_KEY = "landing-auth-v1"
const AUTH_CACHE_TTL = 30 * 60 * 1000

function getCachedAuthState(): LandingAuthState | null {
  if (typeof window === "undefined") return null
  try {
    const raw = sessionStorage.getItem(AUTH_CACHE_KEY)
    if (!raw) return null
    const { state, ts } = JSON.parse(raw) as { state: LandingAuthState; ts: number }
    if (Date.now() - ts > AUTH_CACHE_TTL) {
      sessionStorage.removeItem(AUTH_CACHE_KEY)
      return null
    }
    if (state.status === "authenticated" && state.summary?.redirectTo) return state
    if (state.status === "guest") return state
    return null
  } catch {
    return null
  }
}

function setCachedAuthState(state: LandingAuthState) {
  if (typeof window === "undefined") return
  try {
    sessionStorage.setItem(AUTH_CACHE_KEY, JSON.stringify({ state, ts: Date.now() }))
  } catch {
    // sessionStorage 不可用时静默忽略。
  }
}

function formatMaskedPhone(phone: string | null, nickname: string | null) {
  const digitsOnly = phone?.replace(/\D/g, "") ?? ""

  if (/^\d{11}$/.test(digitsOnly)) {
    return `${digitsOnly.slice(0, 3)}****${digitsOnly.slice(-4)}`
  }

  if (digitsOnly.length >= 7) {
    return `${digitsOnly.slice(0, 3)}****${digitsOnly.slice(-4)}`
  }

  if (nickname && nickname.trim()) {
    return nickname.trim()
  }

  return "已登录用户"
}

export function LandingAuthProvider({ children }: { children: ReactNode }) {
  const [authState, setAuthState] = useState<LandingAuthState>(() => {
    if (typeof window === "undefined") return { status: "guest" }
    return getCachedAuthState() ?? { status: "guest" }
  })
  useEffect(() => {
    let cancelled = false
    const supabase = createSupabaseBrowserClient()

    async function loadAuthSummary() {
      const session = await getSafeSupabaseBrowserSession(supabase)

      if (cancelled) return

      if (!session?.access_token) {
        const next: LandingAuthState = { status: "guest" }
        setAuthState(next)
        setCachedAuthState(next)
        return
      }

      try {
        const summary = await requestData<AuthSessionSummaryResponseData>("/auth/session")

        if (!cancelled) {
          const next: LandingAuthState = { status: "authenticated", summary }
          setAuthState(next)
          setCachedAuthState(next)
        }
      } catch {
        if (!cancelled) {
          const next: LandingAuthState = { status: "guest" }
          setAuthState(next)
          setCachedAuthState(next)
        }
      }
    }

    void loadAuthSummary()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session?.access_token) {
        const next: LandingAuthState = { status: "guest" }
        setAuthState(next)
        setCachedAuthState(next)
        return
      }

      void loadAuthSummary()
    })

    return () => {
      cancelled = true
      subscription.unsubscribe()
    }
  }, [])

  const value = useMemo<LandingAuthContextValue>(() => {
    if (authState.status === "authenticated") {
      return {
        authState,
        isAuthenticated: true,
        ctaHref: authState.summary.redirectTo,
        ctaLabel: "继续学习",
        maskedPhone: formatMaskedPhone(authState.summary.phone, authState.summary.nickname),
      }
    }

    return {
      authState,
      isAuthenticated: false,
      ctaHref: ROUTES.login,
      ctaLabel: "免费开始",
      maskedPhone: null,
    }
  }, [authState])

  return <LandingAuthContext.Provider value={value}>{children}</LandingAuthContext.Provider>
}

export function useLandingAuthState() {
  const context = useContext(LandingAuthContext)

  if (!context) {
    throw new Error("useLandingAuthState must be used within LandingAuthProvider.")
  }

  return context
}
