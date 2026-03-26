import type { ReactNode } from "react"
import { cn } from "@/lib/utils"

type PageSectionProps = {
  eyebrow?: string
  title: string
  description?: ReactNode
  action?: ReactNode
  children: ReactNode
  className?: string
  bodyClassName?: string
}

export function PageSection({
  eyebrow,
  title,
  description,
  action,
  children,
  className,
  bodyClassName,
}: PageSectionProps) {
  return (
    <section className={cn("rounded-[28px] border border-border/60 bg-surface-2", className)}>
      <div className="flex flex-col gap-3 border-b border-border/50 px-4 py-4 sm:flex-row sm:items-start sm:justify-between sm:px-5">
        <div className="min-w-0">
          {eyebrow ? (
            <p className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground/60">
              {eyebrow}
            </p>
          ) : null}
          <h2 className={cn("text-lg font-semibold text-foreground", eyebrow ? "mt-1" : "")}>
            {title}
          </h2>
          {description ? (
            <p className="mt-1 text-sm leading-5 text-muted-foreground">{description}</p>
          ) : null}
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
      <div className={cn("px-4 py-4 sm:px-5", bodyClassName)}>{children}</div>
    </section>
  )
}
