"use client"

import { CheckCircle2, Loader2, XCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export type AdminConnectionTestPhase = "idle" | "loading" | "success" | "error"

const IDLE_CLASS =
  "border border-dashed border-primary/45 bg-primary/5 text-primary shadow-none hover:bg-primary/12 hover:text-primary dark:border-primary/40 dark:bg-primary/10 dark:hover:bg-primary/16"

const LOADING_CLASS =
  "border border-dashed border-muted-foreground/35 bg-muted/25 text-muted-foreground shadow-none"

const SUCCESS_CLASS =
  "border border-solid border-chart-2/55 bg-chart-2/10 text-chart-2 shadow-none hover:bg-chart-2/16 hover:text-chart-2 dark:border-chart-2/45 dark:bg-chart-2/15 dark:hover:bg-chart-2/22"

const ERROR_CLASS =
  "border border-solid border-destructive/50 bg-destructive/10 text-destructive shadow-none hover:bg-destructive/16 hover:text-destructive dark:border-destructive/45 dark:bg-destructive/15"

function errorPhaseLabel(statusMessage: string) {
  return statusMessage.trim() === "连接超时" ? "连接超时" : "连接失败"
}

type AdminConnectionTestButtonProps = {
  phase: AdminConnectionTestPhase
  /** 服务端返回的简短状态（成功为「连接成功」，失败为「连接失败」或「连接超时」）；按钮展示会归一为上述固定文案 */
  statusMessage: string
  onClick: () => void
  /** 除测试进行中外的禁用条件（如 saving、loading） */
  disabled: boolean
}

export function AdminConnectionTestButton({
  phase,
  statusMessage,
  onClick,
  disabled,
}: AdminConnectionTestButtonProps) {
  const isLoading = phase === "loading"
  const surfaceClass =
    phase === "success" ? SUCCESS_CLASS : phase === "error" ? ERROR_CLASS : isLoading ? LOADING_CLASS : IDLE_CLASS

  const title =
    phase === "success"
      ? "连接成功"
      : phase === "error"
        ? errorPhaseLabel(statusMessage)
        : isLoading
          ? "正在测试连接…"
          : "测试当前配置与上游的连通性"

  return (
    <Button
      type="button"
      variant="ghost"
      className={cn(
        "max-w-[min(100%,280px)] justify-center gap-2 px-4 shadow-none",
        surfaceClass,
      )}
      onClick={onClick}
      disabled={disabled || isLoading}
      title={title}
    >
      {isLoading ? (
        <>
          <Loader2 className="h-4 w-4 shrink-0 animate-spin" aria-hidden />
          <span className="min-w-0 truncate">测试中…</span>
        </>
      ) : null}
      {phase === "success" ? (
        <>
          <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden />
          <span className="min-w-0 truncate">连接成功</span>
        </>
      ) : null}
      {phase === "error" ? (
        <>
          <XCircle className="h-4 w-4 shrink-0" aria-hidden />
          <span className="min-w-0 truncate">{errorPhaseLabel(statusMessage)}</span>
        </>
      ) : null}
      {phase === "idle" ? <span className="truncate">连接测试</span> : null}
    </Button>
  )
}
