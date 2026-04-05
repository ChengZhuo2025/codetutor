"use client"

import type { ReactNode } from "react"
import { AIAccessGate } from "@/features/admin-ai/components/ai-access-gate"

export default function AdminAILayout({ children }: { children: ReactNode }) {
  return <AIAccessGate>{children}</AIAccessGate>
}
