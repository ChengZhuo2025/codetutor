"use client"

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react"
import { DEFAULT_PUBLIC_SITE } from "@/features/site/data/default-site"
import type { PublicSiteResponseData } from "@/lib/api/contracts/admin-site"
import type { ApiResponse } from "@/lib/api/types"
import { unwrapResponse } from "@/lib/api/types"

type PublicSiteContextValue = {
  site: PublicSiteResponseData
  loading: boolean
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

  useEffect(() => {
    if (initialSite) {
      return
    }

    let cancelled = false

    async function load() {
      try {
        const response = await fetch("/api/site/public", {
          cache: "no-store",
        })
        if (!response.ok) return

        const json = (await response.json()) as ApiResponse<PublicSiteResponseData>
        if (json.code !== "OK") return

        const data = unwrapResponse(json)
        if (!cancelled) {
          setSite(data)
        }
      } catch {
        // Public pages keep rendering with local defaults if the database is temporarily unavailable.
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    void load()

    return () => {
      cancelled = true
    }
  }, [initialSite])

  const value = useMemo(
    () => ({
      site,
      loading,
    }),
    [site, loading],
  )

  return (
    <PublicSiteContext.Provider value={value}>
      {children}
    </PublicSiteContext.Provider>
  )
}

export function usePublicSite() {
  const context = useContext(PublicSiteContext)
  return context ?? { site: DEFAULT_PUBLIC_SITE, loading: false }
}
