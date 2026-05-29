"use client"

import {
  useCallback,
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react"
import { DEFAULT_PUBLIC_SITE } from "@/features/site/data/default-site"
import { createLatestPublicSiteRequestGate } from "@/features/site/lib/public-site-refresh"
import type { PublicSiteResponseData } from "@/lib/api/contracts/admin-site"
import type { ApiResponse } from "@/lib/api/types"
import { unwrapResponse } from "@/lib/api/types"

type PublicSiteContextValue = {
  site: PublicSiteResponseData
  loading: boolean
  refreshPublicSite: () => Promise<void>
}

const PublicSiteContext = createContext<PublicSiteContextValue | null>(null)

type PublicSiteProviderProps = {
  children: React.ReactNode
  initialSite?: PublicSiteResponseData
}

export function PublicSiteProvider({
  children,
  initialSite,
}: PublicSiteProviderProps) {
  const [site, setSite] = useState<PublicSiteResponseData>(initialSite ?? DEFAULT_PUBLIC_SITE)
  const [loading, setLoading] = useState(!initialSite)
  const requestGate = useMemo(() => createLatestPublicSiteRequestGate(), [])

  const refreshPublicSite = useCallback(async () => {
    const requestId = requestGate.nextRequestId()

    try {
      const response = await fetch("/api/site/public", {
        cache: "no-store",
      })
      if (!response.ok) return

      const json = (await response.json()) as ApiResponse<PublicSiteResponseData>
      if (json.code !== "OK") return

      if (!requestGate.shouldCommit(requestId)) return
      setSite(unwrapResponse(json))
    } catch {
      // Public pages keep rendering with local defaults if the database is temporarily unavailable.
    } finally {
      if (requestGate.shouldCommit(requestId)) {
        setLoading(false)
      }
    }
  }, [requestGate])

  useEffect(() => {
    let cancelled = false

    async function load() {
      if (initialSite) {
        return
      }
      if (cancelled) return
      await refreshPublicSite()
    }

    void load()

    return () => {
      cancelled = true
    }
  }, [initialSite, refreshPublicSite])

  const value = useMemo(
    () => ({
      site,
      loading,
      refreshPublicSite,
    }),
    [site, loading, refreshPublicSite],
  )

  return (
    <PublicSiteContext.Provider value={value}>
      {children}
    </PublicSiteContext.Provider>
  )
}

export function usePublicSite() {
  const context = useContext(PublicSiteContext)
  return context ?? { site: DEFAULT_PUBLIC_SITE, loading: false, refreshPublicSite: async () => {} }
}
