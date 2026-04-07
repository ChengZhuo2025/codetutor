"use client"

import { useMemo } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { DIALOG_DARK_PANEL_CLASS } from "@/components/ui/surface-styles"
import { MaterialPlanPanel } from "@/features/learning/components/material-plan-panel"
import { cn } from "@/lib/utils"

type MaterialPlanDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSessionRefresh: () => void
  initialLinks?: string[]
}

export function MaterialPlanDialog({
  open,
  onOpenChange,
  onSessionRefresh,
  initialLinks,
}: MaterialPlanDialogProps) {
  const initialLinksText = useMemo(
    () => (initialLinks && initialLinks.length > 0 ? initialLinks.join("\n") : ""),
    [initialLinks],
  )
  const panelKey = `${open ? "open" : "closed"}:${initialLinksText}`

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          DIALOG_DARK_PANEL_CLASS,
          "max-h-[85vh] overflow-y-auto rounded-2xl border-white/20 ring-1 ring-white/10 p-0 sm:max-w-[760px]",
        )}
      >
        <div className="border-b border-white/10 px-5 pt-5 pb-4">
          <DialogHeader className="text-left">
            <DialogTitle className="text-base">生成学习计划</DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">
              粘贴 1 条教程链接，让 AI 帮你生成一份可执行的学习计划预览。
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="px-5 pb-5">
          <MaterialPlanPanel
            key={panelKey}
            onSessionRefresh={onSessionRefresh}
            defaultLinksText={initialLinksText}
            onDone={() => onOpenChange(false)}
          />
        </div>
      </DialogContent>
    </Dialog>
  )
}

