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
    iconClassName: "text-brand animate-spin",
    iconWrapClassName:
      "border-brand/16 bg-brand/10 dark:border-brand/18 dark:bg-brand/12",
    panelClassName:
      "border-brand/20 bg-brand/8 shadow-[inset_0_1px_0_rgba(255,255,255,0.46)] dark:border-brand/20 dark:bg-brand/10 dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]",
  },
  empty: {
    icon: Inbox,
    iconClassName: "text-brand/80",
    iconWrapClassName:
      "border-brand/16 bg-brand/10 dark:border-brand/18 dark:bg-brand/12",
    panelClassName:
      "border-brand/18 bg-brand/7 shadow-[inset_0_1px_0_rgba(255,255,255,0.42)] dark:border-brand/18 dark:bg-brand/9 dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]",
  },
  error: {
    icon: AlertCircle,
    iconClassName: "text-destructive",
    iconWrapClassName:
      "border-current/10 bg-background/45",
    panelClassName: "border-destructive/20 bg-destructive/10",
  },
  success: {
    icon: CheckCircle2,
    iconClassName: "text-brand",
    iconWrapClassName:
      "border-current/10 bg-background/45",
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
  const actionButtonClassName =
    status === "error"
      ? "border-destructive/20"
      : "border-brand/18 bg-white/72 text-foreground shadow-[inset_0_1px_0_rgba(255,255,255,0.8)] hover:border-brand/30 hover:bg-white/88 dark:border-white/10 dark:bg-white/8 dark:text-foreground dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] dark:hover:bg-white/12"

  return (
    <div
      className={cn(
        "rounded-[28px] border",
        compact ? "p-5" : "p-6",
        meta.panelClassName,
        className,
      )}
    >
      <div className={cn("flex gap-3", compact ? "items-start" : "items-center")}>
        <div
          className={cn(
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border",
            meta.iconWrapClassName,
          )}
        >
          <Icon className={cn("h-5 w-5", meta.iconClassName)} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-foreground">{title}</p>
          {description ? (
            <p className={cn("text-sm leading-5 text-muted-foreground", compact ? "mt-1" : "mt-2")}>
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
            variant="outline"
            onClick={onAction}
            className={cn("rounded-2xl", actionButtonClassName)}
          >
            {actionLabel}
          </Button>
        </div>
      ) : null}
    </div>
  )
}
