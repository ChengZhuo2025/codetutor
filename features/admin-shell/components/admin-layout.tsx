"use client"

import { useCallback, useSyncExternalStore } from "react"
import type { AdminSessionResponseData } from "@/lib/api/contracts/admin"
import { AdminHeader } from "./admin-header"
import { AdminSidebar } from "./admin-sidebar"

const SIDEBAR_COLLAPSED_KEY = "admin-sidebar-collapsed"
const COLLAPSE_EVENT = "admin-sidebar-collapsed-changed"

function readCollapsedFromStorage(): boolean {
  if (typeof window === "undefined") {
    return false
  }
  try {
    return window.localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === "1"
  } catch {
    return false
  }
}

function subscribeCollapsed(onStoreChange: () => void) {
  if (typeof window === "undefined") {
    return () => {}
  }
  const handler = () => onStoreChange()
  window.addEventListener(COLLAPSE_EVENT, handler)
  window.addEventListener("storage", handler)
  return () => {
    window.removeEventListener(COLLAPSE_EVENT, handler)
    window.removeEventListener("storage", handler)
  }
}

interface AdminLayoutProps {
  session: AdminSessionResponseData
  children: React.ReactNode
}

export function AdminLayout({ session, children }: AdminLayoutProps) {
  const sidebarCollapsed = useSyncExternalStore(
    subscribeCollapsed,
    readCollapsedFromStorage,
    () => false,
  )

  const toggleSidebarCollapsed = useCallback(() => {
    if (typeof window === "undefined") {
      return
    }
    const next = !readCollapsedFromStorage()
    try {
      window.localStorage.setItem(SIDEBAR_COLLAPSED_KEY, next ? "1" : "0")
      window.dispatchEvent(new Event(COLLAPSE_EVENT))
    } catch {
      /* ignore */
    }
  }, [])

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <AdminSidebar collapsed={sidebarCollapsed} onToggleCollapsed={toggleSidebarCollapsed} />
      <div className="flex flex-col flex-1 overflow-hidden min-w-0">
        <AdminHeader session={session} />
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  )
}
