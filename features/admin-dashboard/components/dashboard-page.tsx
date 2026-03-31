"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { DashboardOverview } from "./dashboard-overview"

export default function DashboardPage() {
  const router = useRouter()

  useEffect(() => {
    async function checkAuth() {
      try {
        const response = await fetch("/api/admin/auth/session")
        const result = await response.json()
        if (result.code !== "OK") {
          router.push("/admin/login")
        }
      } catch {
        router.push("/admin/login")
      }
    }
    checkAuth()
  }, [router])

  return <DashboardOverview />
}
