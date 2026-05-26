"use client"

import { ChevronDown, ChevronUp } from "lucide-react"
import { useState } from "react"
import type { Stage } from "@/features/progress/types"

type MapHeaderProps = {
  pathName: string
  pathSummary: string
  done: number
  total: number
  currentStage: Stage
}

export function MapHeader({
  pathName,
  pathSummary
}: MapHeaderProps) {
  const [collapsed, setCollapsed] = useState(true)

  return (
    <div className="shrink-0 border-b border-border/50 bg-[linear-gradient(180deg,rgba(255,255,255,0.9),rgba(247,249,251,0.82))] px-4 py-5 shadow-[0_14px_38px_-34px_rgba(15,23,42,0.24)] backdrop-blur-sm dark:bg-[linear-gradient(180deg,oklch(0.19_0.012_270/0.92),oklch(0.16_0.01_270/0.82))] sm:px-6">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-xl font-bold tracking-tight sm:text-2xl">{pathName}</h1>
          {!collapsed ? (
            <p className="mt-1 text-sm leading-5 text-muted-foreground">
              {pathSummary}
            </p>
          ) : null}
        </div>
        <button
          type="button"
          onClick={() => setCollapsed((current) => !current)}
          className="flex size-7 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-surface-2 hover:text-foreground dark:hover:bg-white/8 sm:size-8 sm:border sm:border-border/70 sm:bg-surface-1/92"
          aria-label={collapsed ? "展开路径地图标题区" : "收起路径地图标题区"}
          title={collapsed ? "展开标题区" : "收起标题区"}
        >
          {collapsed ? <ChevronDown className="h-5 w-5" /> : <ChevronUp className="h-5 w-5" />}
        </button>
      </div>
    </div>
  )
}
