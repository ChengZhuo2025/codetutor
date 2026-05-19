"use client"

import type { ReactNode } from "react"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { EnabledTag } from "@/features/admin-shell/components/admin-tag"
import { cn } from "@/lib/utils"

export function PageSection({
  title,
  description,
  action,
  children,
  className,
  bodyClassName,
}: {
  title: string
  description?: string
  action?: ReactNode
  children: ReactNode
  /** 根节点：用于 h-full、flex 等与栅格等高布局配合 */
  className?: string
  /** 内容区：例如 flex-1 min-h-0 与内部可滚动区域配合 */
  bodyClassName?: string
}) {
  return (
    <section className={cn("flex min-h-0 flex-col rounded-2xl border border-border bg-card", className)}>
      <div className="flex shrink-0 flex-col gap-3 border-b border-border px-4 py-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <h2 className="text-base font-semibold text-foreground">{title}</h2>
          {description ? <p className="mt-1 text-sm text-muted-foreground">{description}</p> : null}
        </div>
        {action ? (
          <div className="flex shrink-0 items-center justify-end gap-2 lg:pt-0.5">{action}</div>
        ) : null}
      </div>
      <div className={cn("min-h-0 p-4", bodyClassName)}>{children}</div>
    </section>
  )
}

export function ListPageHeader({
  title,
  description,
  total,
  totalLabel = "条",
  action,
}: {
  title: string
  description: string
  total?: number | null
  totalLabel?: string
  action?: ReactNode
}) {
  return (
    <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
      <div>
        <h1 className="text-xl font-semibold text-foreground">{title}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {description}
          {typeof total === "number" ? ` · 当前筛选共 ${total} ${totalLabel}` : ""}
        </p>
      </div>
      {action}
    </div>
  )
}

export function ListFilterCard({ children }: { children: ReactNode }) {
  return <div className="rounded-xl border border-border bg-card p-3">{children}</div>
}

export function ActiveStateBadge({
  active,
  activeLabel = "启用",
  inactiveLabel = "停用",
}: {
  active: boolean
  activeLabel?: string
  inactiveLabel?: string
}) {
  return (
    <EnabledTag enabled={active}>
      {active ? activeLabel : inactiveLabel}
    </EnabledTag>
  )
}

export function MetricCard({
  label,
  value,
  hint,
  valueClassName,
}: {
  label: string
  value: string | number
  hint: string
  /** 数值强调色，与 `/admin/feedback` 统计卡片一致的可读分层 */
  valueClassName?: string
}) {
  return (
    <div className="rounded-lg border border-border bg-card px-4 py-3">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p
        className={cn(
          "mt-1 text-xl font-semibold",
          valueClassName ?? "text-foreground",
        )}
      >
        {value}
      </p>
      <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
    </div>
  )
}

export function SaveActionRow({
  isSaving,
  onReset,
  saveLabel = "保存",
}: {
  isSaving: boolean
  onReset: () => void
  saveLabel?: string
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button type="submit" disabled={isSaving}>
        {isSaving ? "保存中…" : saveLabel}
      </Button>
      <Button type="button" variant="outline" onClick={onReset} disabled={isSaving}>
        重置
      </Button>
    </div>
  )
}

export function JsonPreview({ value, className }: { value: unknown; className?: string }) {
  return (
    <pre
      className={cn(
        "max-h-80 overflow-auto rounded-xl border border-border bg-muted/30 p-3 text-xs text-foreground",
        className,
      )}
    >
      {JSON.stringify(value ?? {}, null, 2)}
    </pre>
  )
}

export function DetailPageHeader({
  backHref,
  title,
  description,
  action,
}: {
  backHref: string
  title: string
  description?: string
  action?: ReactNode
}) {
  return (
    <div className="space-y-4">
      <Button type="button" variant="outline" size="sm" className="gap-1.5" asChild>
        <Link href={backHref}>
          <ArrowLeft className="h-4 w-4" />
          返回列表
        </Link>
      </Button>
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">{title}</h1>
          {description ? <p className="mt-1 text-sm text-muted-foreground">{description}</p> : null}
        </div>
        {action}
      </div>
    </div>
  )
}
