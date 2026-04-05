"use client"

import type { ReactNode } from "react"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

export function PageSection({
  title,
  description,
  action,
  children,
}: {
  title: string
  description?: string
  action?: ReactNode
  children: ReactNode
}) {
  return (
    <section className="rounded-2xl border border-border bg-card">
      <div className="flex flex-col gap-3 border-b border-border px-4 py-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h2 className="text-base font-semibold text-foreground">{title}</h2>
          {description ? <p className="mt-1 text-sm text-muted-foreground">{description}</p> : null}
        </div>
        {action}
      </div>
      <div className="p-4">{children}</div>
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
    <Badge variant={active ? "success" : "warning"} size="sm">
      {active ? activeLabel : inactiveLabel}
    </Badge>
  )
}

export function MetricCard({
  label,
  value,
  hint,
}: {
  label: string
  value: string | number
  hint: string
}) {
  return (
    <div className="rounded-xl border border-border bg-card px-4 py-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-3 text-2xl font-semibold tracking-tight text-foreground">{value}</p>
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

export function JsonPreview({ value }: { value: unknown }) {
  return (
    <pre className="max-h-80 overflow-auto rounded-xl border border-border bg-muted/30 p-3 text-xs text-foreground">
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
