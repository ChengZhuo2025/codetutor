"use client"

import type { ReactNode } from "react"
import { StatePanel } from "@/components/ui/state-panel"
import { useAdminSession } from "@/features/admin-shell/components/admin-shell-client"
import { canAccessAdminAI } from "@/features/admin-ai/lib/access"

export function AIAccessGate({ children }: { children: ReactNode }) {
  const { session } = useAdminSession()

  if (!canAccessAdminAI(session.roles)) {
    return (
      <StatePanel
        status="error"
        title="无访问权限"
        description="Ai 管理模块仅对超级管理员和 Ai 管理管理员开放。"
      />
    )
  }

  return <>{children}</>
}
