"use client"

import { useEffect } from "react"
import { usePathname, useRouter } from "next/navigation"
import { ADMIN_ROUTES } from "@/constants/routes"
import { buildAdminLoginRedirectPath } from "./admin-session-expiry"

export function useAdminSessionExpiryRedirect(authExpired: boolean) {
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    if (!authExpired) {
      return
    }

    const redirectPath = buildAdminLoginRedirectPath(pathname || ADMIN_ROUTES.home)
    const timer = window.setTimeout(() => {
      router.replace(redirectPath)
    }, 500)

    return () => {
      window.clearTimeout(timer)
    }
  }, [authExpired, pathname, router])
}
