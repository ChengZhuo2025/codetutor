"use client"

import { createContext, useContext, useMemo } from "react"
import { AdminLayout } from "./admin-layout"
import type { AdminSessionResponseData } from "@/lib/api/contracts/admin"

type AdminSessionContextValue = {
  session: AdminSessionResponseData
}

const AdminSessionContext = createContext<AdminSessionContextValue | null>(null)

export function useAdminSession() {
  const context = useContext(AdminSessionContext)

  if (!context) {
    throw new Error("useAdminSession must be used within AdminShellClient")
  }

  return context
}

interface AdminShellClientProps {
  session: AdminSessionResponseData
  children: React.ReactNode
}

export function AdminShellClient({ session, children }: AdminShellClientProps) {
  const contextValue = useMemo(() => {
    return { session }
  }, [session])

  return (
    <AdminSessionContext.Provider value={contextValue}>
      <AdminLayout session={session}>{children}</AdminLayout>
    </AdminSessionContext.Provider>
  )
}
