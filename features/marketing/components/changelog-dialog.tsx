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
            <ol className="space-y-0">
              {items.map((entry, index) => (
                <li key={entry.id} className="grid grid-cols-[24px_minmax(0,1fr)] gap-4">
                  <div className="relative flex justify-center">
                    <span className="mt-2 h-3 w-3 rounded-full border-2 border-background bg-primary shadow-[0_0_0_4px_oklch(0.72_0.18_245/0.18)] dark:border-background dark:shadow-[0_0_0_4px_oklch(0.78_0.16_245/0.18)]" />
                    {index < items.length - 1 ? (
                      <span className="absolute bottom-0 top-6 w-px bg-border/80 dark:bg-white/14" />
                    ) : null}
                  </div>
                  <div className="pb-4 sm:pb-5">
                    <header className="flex justify-between items-center gap-x-3 gap-y-1 pt-0.5">
                      <h3 className="text-base font-semibold tracking-tight text-foreground">{entry.title}</h3>
                      <time className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
                        <CalendarDays className="h-3.5 w-3.5" />
                        {formatDate(entry.publishedAt) || entry.logDate}
                      </time>
                    </header>
                    <article className="mt-3 rounded-xl border border-border/60 bg-surface-2 px-4 py-4 dark:border-white/10 dark:bg-white/5 sm:px-5">
                      <MarkdownContent content={entry.summaryMarkdown} className="space-y-3 leading-6" />
                    </article>
                  </div>
                </li>
              ))}
            </ol>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  )
}
