"use client"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  DIALOG_PANEL_CLASS,
  USER_BUTTON_PRIMARY_CLASS,
  USER_PANEL_DIVIDER_CLASS,
  USER_PANEL_OUTLINE_BUTTON_CLASS,
} from "@/components/ui/surface-styles"
import { cn } from "@/lib/utils"

type LearnChatRestartDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  restartSubmitting: boolean
  onConfirm: () => void
  panelClassName?: string
}

export function LearnChatRestartDialog({
  open,
  onOpenChange,
  restartSubmitting,
  onConfirm,
  panelClassName,
}: LearnChatRestartDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          panelClassName ?? DIALOG_PANEL_CLASS,
          "max-h-[75vh] overflow-y-auto rounded-2xl p-0 sm:max-w-[400px]",
        )}
      >
        <div className={cn("border-b px-5 pt-5 pb-6", USER_PANEL_DIVIDER_CLASS)}>
          <DialogHeader className="text-left">
            <DialogTitle className="text-base">重头开始本关对话？</DialogTitle>
            <DialogDescription className="mt-2 text-sm text-muted-foreground">
              当前关卡的聊天记录将从学习页隐藏，并在你下次发送消息时开启新的对话。历史仍保留在服务端，不会用于新对话上下文。
            </DialogDescription>
          </DialogHeader>
        </div>
        <div className="flex flex-col-reverse gap-3 px-5 pb-4 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="outline"
            className={USER_PANEL_OUTLINE_BUTTON_CLASS}
            disabled={restartSubmitting}
            onClick={() => onOpenChange(false)}
          >
            取消
          </Button>
          <Button
            type="button"
            className={USER_BUTTON_PRIMARY_CLASS}
            disabled={restartSubmitting}
            onClick={onConfirm}
          >
            {restartSubmitting ? "处理中…" : "确认重头开始"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
