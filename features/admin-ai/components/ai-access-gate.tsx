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
        description="AI 运营模块仅对超级管理员和 AI 运营管理员开放。"
      />
    )
  }

  return <>{children}</>
}
