"use client"

import {
  createContext,
  useContext,
  Suspense,
} from "react"
import { Analytics } from "@vercel/analytics/next"
import { AppConfirmProvider } from "@/components/app-feedback/app-confirm-provider"
import { AppToastProvider } from "@/components/app-feedback/app-toast-provider"
import { PaymentReturnHandler } from "@/components/payment-return-handler"
import { APP_EVENT_CHANNEL } from "@/constants/events"
import type { AppEventName } from "@/constants/events"
import { PublicSiteProvider } from "@/features/site/providers/public-site-provider"
import type { PublicSiteResponseData } from "@/lib/api/contracts/admin-site"
import { getSafeSupabaseBrowserSession } from "@/lib/supabase/client"
import { ThemeProvider } from "./theme-provider"

type AppProvidersProps = {
  children: React.ReactNode
  initialPublicSite?: PublicSiteResponseData
}

type TrackEventPayload = Record<string, string | number | boolean | null | undefined>

type AppEventContextValue = {
  trackEvent: (name: AppEventName, payload?: TrackEventPayload) => void
}

const AppEventContext = createContext<AppEventContextValue | null>(null)

function trackEvent(name: AppEventName, payload?: TrackEventPayload) {
  const occurredAt = new Date().toISOString()
  const pagePath = typeof window !== "undefined" ? window.location.pathname : undefined
  const detail = {
    name,
    payload: payload ?? {},
    pagePath,
    occurredAt,
  }

  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(APP_EVENT_CHANNEL, { detail }))

    void (async () => {
      try {
        const headers = new Headers({
          "Content-Type": "application/json",
        })
        const session = await getSafeSupabaseBrowserSession()

        if (session?.access_token) {
          headers.set("Authorization", `Bearer ${session.access_token}`)
        }

        await fetch("/api/analytics/event", {
          method: "POST",
          headers,
          body: JSON.stringify({
            eventName: name,
            pagePath,
            properties: payload ?? {},
            occurredAt,
          }),
          keepalive: true,
        })
      } catch {
        // 埋点写入不阻塞主流程。
      }
    })()
  }

  if (process.env.NODE_ENV !== "production") {
    console.info("[app-event]", detail)
  }
}

export function AppProviders({ children, initialPublicSite }: AppProvidersProps) {
  return (
    <ThemeProvider
      defaultTheme="dark"
      storageKey="codetutor-theme"
    >
      <AppEventContext.Provider value={{ trackEvent }}>
        <AppToastProvider>
          <AppConfirmProvider>
            <PublicSiteProvider initialSite={initialPublicSite}>
              <Suspense fallback={null}>
                <PaymentReturnHandler />
              </Suspense>
              {children}
              <Analytics />
            </PublicSiteProvider>
          </AppConfirmProvider>
        </AppToastProvider>
      </AppEventContext.Provider>
    </ThemeProvider>
  )
}

export function useAppEventTracker() {
  const context = useContext(AppEventContext)

  if (!context) {
    throw new Error("useAppEventTracker must be used within AppProviders")
  }

  return context
}
