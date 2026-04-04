"use client"

import {
  createContext,
  useContext,
} from "react"
import { Analytics } from "@vercel/analytics/next"
import { AppConfirmProvider } from "@/components/app-feedback/app-confirm-provider"
import { AppToastProvider } from "@/components/app-feedback/app-toast-provider"
import { APP_EVENT_CHANNEL } from "@/constants/events"
import type { AppEventName } from "@/constants/events"

type AppProvidersProps = {
  children: React.ReactNode
}

type TrackEventPayload = Record<string, string | number | boolean | null | undefined>

type AppEventContextValue = {
  trackEvent: (name: AppEventName, payload?: TrackEventPayload) => void
}

const AppEventContext = createContext<AppEventContextValue | null>(null)

function trackEvent(name: AppEventName, payload?: TrackEventPayload) {
  const detail = {
    name,
    payload: payload ?? {},
    occurredAt: new Date().toISOString(),
  }

  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(APP_EVENT_CHANNEL, { detail }))
  }

  if (process.env.NODE_ENV !== "production") {
    console.info("[app-event]", detail)
  }
}

export function AppProviders({ children }: AppProvidersProps) {
  return (
    <AppEventContext.Provider value={{ trackEvent }}>
      <AppToastProvider>
        <AppConfirmProvider>
          {children}
          <Analytics />
        </AppConfirmProvider>
      </AppToastProvider>
    </AppEventContext.Provider>
  )
}

export function useAppEventTracker() {
  const context = useContext(AppEventContext)

  if (!context) {
    throw new Error("useAppEventTracker must be used within AppProviders")
  }

  return context
}
