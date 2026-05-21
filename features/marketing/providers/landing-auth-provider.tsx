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
  const [authState, setAuthState] = useState<LandingAuthState>({ status: "checking" })

  useEffect(() => {
    let cancelled = false
    const supabase = createSupabaseBrowserClient()

    async function loadAuthSummary() {
      const session = await getSafeSupabaseBrowserSession(supabase)

      if (cancelled) {
        return
      }

      if (!session?.access_token) {
        setAuthState({ status: "guest" })
        return
      }

      try {
        const summary = await requestData<AuthSessionSummaryResponseData>("/auth/session")

        if (!cancelled) {
          setAuthState({
            status: "authenticated",
            summary,
          })
        }
      } catch {
        if (!cancelled) {
          setAuthState({ status: "guest" })
        }
      }
    }

    void loadAuthSummary()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session?.access_token) {
        setAuthState({ status: "guest" })
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
