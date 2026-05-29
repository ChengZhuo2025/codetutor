"use client"

import { useMemo, useState } from "react"
import { CalendarDays, Loader2 } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { DIALOG_GRADIENT_PANEL_CLASS } from "@/components/ui/surface-styles"
import { MarkdownContent } from "@/features/site/components/markdown-content"
import type { PublicSiteChangelogEntry, PublicSiteChangelogListResponseData } from "@/lib/api/contracts/admin-site"
import type { ApiResponse } from "@/lib/api/types"
import { unwrapResponse } from "@/lib/api/types"
import { cn } from "@/lib/utils"

type ChangelogDialogProps = {
  triggerClassName?: string
  triggerLabel?: string
}

type ChangelogState =
  | { status: "idle"; items: PublicSiteChangelogEntry[] }
  | { status: "loading"; items: PublicSiteChangelogEntry[] }
  | { status: "success"; items: PublicSiteChangelogEntry[] }
  | { status: "error"; items: PublicSiteChangelogEntry[]; message: string }

function formatDate(value: string | null) {
  return value ? new Date(value).toLocaleDateString("zh-CN") : ""
}

export function ChangelogDialog({
  triggerClassName,
  triggerLabel = "更新日志",
}: ChangelogDialogProps) {
  const [state, setState] = useState<ChangelogState>({ status: "idle", items: [] })

  const items = useMemo(() => state.items, [state.items])

  const loadChangelog = async () => {
    if (state.status === "loading" || state.status === "success") return
    setState((current) => ({ status: "loading", items: current.items }))
    try {
      const response = await fetch("/api/site/changelog?limit=20", {
        cache: "no-store",
      })
      if (!response.ok) {
        throw new Error("更新日志读取失败")
      }

      const json = (await response.json()) as ApiResponse<PublicSiteChangelogListResponseData>
      if (json.code !== "OK") {
        throw new Error(json.message || "更新日志读取失败")
      }

      setState({
        status: "success",
        items: unwrapResponse(json).items,
      })
    } catch (error) {
      setState((current) => ({
        status: "error",
        items: current.items,
        message: error instanceof Error ? error.message : "更新日志读取失败",
      }))
    }
  }

  return (
    <Dialog
      onOpenChange={(open) => {
        if (open) void loadChangelog()
      }}
    >
      <DialogTrigger asChild>
        <button
          type="button"
          className={cn("cursor-pointer transition-colors hover:text-foreground", triggerClassName)}
        >
          {triggerLabel}
        </button>
      </DialogTrigger>
      <DialogContent className={cn(DIALOG_GRADIENT_PANEL_CLASS, "gap-0 overflow-hidden p-0 sm:max-w-[760px]")}>
        <div className="border-b border-border bg-[radial-gradient(circle_at_top_left,oklch(0.62_0.24_270/0.12),transparent_46%)] px-4 py-5 dark:border-white/14 dark:bg-[radial-gradient(circle_at_top_left,oklch(0.73_0.21_270/0.16),transparent_46%)] sm:px-5">
          <DialogHeader>
            <DialogTitle className="text-2xl font-semibold tracking-tight">更新日志</DialogTitle>
            <DialogDescription className="max-w-3xl text-sm leading-6 text-muted-foreground">
              查看 CodeTutor 最近面向用户发布的产品改进、体验优化与问题修复。
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="max-h-[72vh] overflow-y-auto px-4 py-4 sm:px-6">
          {state.status === "loading" ? (
            <div className="flex min-h-48 items-center justify-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              加载更新日志…
            </div>
          ) : null}

          {state.status === "error" ? (
            <div className="rounded-xl border border-dashed border-border bg-surface-2 px-4 py-8 text-center text-sm text-muted-foreground">
              {state.message}
            </div>
          ) : null}

          {state.status === "success" && items.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border bg-surface-2 px-4 py-8 text-center text-sm text-muted-foreground">
              暂无更新日志
            </div>
          ) : null}

          {items.length > 0 ? (
            <div className="space-y-4">
              {items.map((entry) => (
                <article
                  key={entry.id}
                  className="rounded-xl border border-border/60 bg-surface-2 px-4 py-4 dark:border-white/10 dark:bg-white/5 sm:px-5"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h3 className="text-base font-semibold tracking-tight text-foreground">
                        {entry.title}
                      </h3>
                      <div className="mt-2 inline-flex items-center gap-2 text-xs text-muted-foreground">
                        <CalendarDays className="h-3.5 w-3.5" />
                        {formatDate(entry.publishedAt) || entry.logDate}
                      </div>
                    </div>
                  </div>
                  <div className="mt-4">
                    <MarkdownContent content={entry.summaryMarkdown} className="space-y-3 leading-6" />
                  </div>
                </article>
              ))}
            </div>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  )
}
