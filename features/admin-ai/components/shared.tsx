"use client"

import type { ReactNode } from "react"
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
