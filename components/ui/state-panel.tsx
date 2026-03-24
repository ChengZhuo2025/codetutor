import {
  AlertCircle,
  CheckCircle2,
  Inbox,
  LoaderCircle,
} from "lucide-react"
import type { ReactNode } from "react"
import type { ViewStateStatus } from "@/types/api"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

type StatePanelProps = {
  status: ViewStateStatus
  title: string
  description?: string
  actionLabel?: string
  onAction?: () => void
  compact?: boolean
  className?: string
  extra?: ReactNode
}

const statePanelMeta = {
  loading: {
    icon: LoaderCircle,
    iconClassName: "text-chart-3 animate-spin",
    panelClassName: "border-chart-3/20 bg-chart-3/10",
  },
  empty: {
    icon: Inbox,
    iconClassName: "text-muted-foreground",
    panelClassName: "border-border/60 bg-surface-2",
  },
  error: {
    icon: AlertCircle,
    iconClassName: "text-destructive",
    panelClassName: "border-destructive/20 bg-destructive/10",
  },
  success: {
    icon: CheckCircle2,
    iconClassName: "text-brand",
    panelClassName: "border-brand/20 bg-brand-dim/55",
  },
} as const

export function StatePanel({
  status,
  title,
  description,
  actionLabel,
  onAction,
  compact = false,
  className,
  extra,
}: StatePanelProps) {
  const meta = statePanelMeta[status]
  const Icon = meta.icon

  return (
    <div
      className={cn(
        "rounded-[28px] border",
        compact ? "px-4 py-3" : "px-5 py-5",
        meta.panelClassName,
        className,
      )}
    >
      <div className={cn("flex gap-3", compact ? "items-start" : "items-center")}>
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-current/10 bg-background/45">
          <Icon className={cn("h-5 w-5", meta.iconClassName)} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-foreground">{title}</p>
          {description ? (
            <p className={cn("text-sm leading-6 text-muted-foreground", compact ? "mt-1" : "mt-2")}>
              {description}
            </p>
          ) : null}
          {extra ? <div className={cn(compact ? "mt-2" : "mt-3")}>{extra}</div> : null}
        </div>
      </div>
      {actionLabel && onAction ? (
        <div className={cn(compact ? "mt-3" : "mt-4")}>
          <Button
            type="button"
            variant={status === "error" ? "outline" : "secondary"}
            onClick={onAction}
            className="rounded-2xl"
          >
            {actionLabel}
          </Button>
        </div>
      ) : null}
    </div>
  )
}
