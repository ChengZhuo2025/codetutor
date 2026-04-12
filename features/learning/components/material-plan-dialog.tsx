"use client"

import { useMemo } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { DIALOG_PANEL_CLASS, USER_PANEL_DIVIDER_CLASS } from "@/components/ui/surface-styles"
import { MaterialPlanPanel } from "@/features/learning/components/material-plan-panel"
import { cn } from "@/lib/utils"

type MaterialPlanDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSessionRefresh: () => void
  initialLinks?: string[]
  initialDraftId?: string | null
  /** 在 Radix 完成打开/关闭状态切换后调用，便于在界面已展示后再写 sessionStorage 等 */
  onDialogOpenChange?: (open: boolean) => void
}

export function MaterialPlanDialog({
  open,
  onOpenChange,
  onSessionRefresh,
  initialLinks,
  initialDraftId,
  onDialogOpenChange,
}: MaterialPlanDialogProps) {
  const initialLinksText = useMemo(
    () => (initialLinks && initialLinks.length > 0 ? initialLinks.join("\n") : ""),
    [initialLinks],
  )
  const panelKey = `${open ? "open" : "closed"}:${initialLinksText}:${initialDraftId ?? "new"}`

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        onDialogOpenChange?.(next)
        onOpenChange(next)
      }}
    >
      <DialogContent
        className={cn(
          DIALOG_PANEL_CLASS,
          "max-h-[85vh] min-w-0 overflow-x-hidden overflow-y-auto rounded-2xl p-0 sm:max-w-[760px]",
        )}
      >
        <div className={cn("min-w-0 border-b px-5 pt-5 pb-4", USER_PANEL_DIVIDER_CLASS)}>
          <DialogHeader className="min-w-0 text-left">
            <DialogTitle className="text-base">生成学习计划</DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">
              粘贴 1 条教程链接，让 AI 帮你生成一份可执行的学习计划预览。
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="min-w-0 px-5 pb-5">
          <MaterialPlanPanel
            key={panelKey}
            onSessionRefresh={onSessionRefresh}
            defaultLinksText={initialLinksText}
            defaultDraftId={initialDraftId}
            onDone={() => onOpenChange(false)}
          />
        </div>
      </DialogContent>
    </Dialog>
  )
}
