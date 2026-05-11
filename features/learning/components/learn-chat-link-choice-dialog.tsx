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
  USER_PANEL_OUTLINE_BUTTON_CLASS,
  USER_PANEL_SECTION_CLASS,
  USER_PANEL_DIVIDER_CLASS,
} from "@/components/ui/surface-styles"
import { cn } from "@/lib/utils"

type LearnChatLinkChoiceDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  links: string[]
  onGeneratePlan: () => void
  onContinueChat: () => Promise<void> | void
  panelClassName?: string
}

export function LearnChatLinkChoiceDialog({
  open,
  onOpenChange,
  links,
  onGeneratePlan,
  onContinueChat,
  panelClassName,
}: LearnChatLinkChoiceDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          panelClassName ?? DIALOG_PANEL_CLASS,
          "max-h-[75vh] overflow-y-auto rounded-2xl p-0 sm:max-w-[520px]",
        )}
      >
        <div className={cn("border-b px-5 pt-5 pb-4", USER_PANEL_DIVIDER_CLASS)}>
          <DialogHeader className="text-left">
            <DialogTitle className="text-base">检测到教程链接</DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">
              你想用这些链接生成学习计划，还是继续发给 AI 导师聊一聊？
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="space-y-4 px-5 py-4">
          <div
            className={cn(
              "rounded-2xl px-3 py-2 text-sm text-muted-foreground",
              USER_PANEL_SECTION_CLASS,
            )}
          >
            {links.map((link) => (
              <div key={link} className="truncate">
                {link}
              </div>
            ))}
          </div>

          {links.length > 1 ? (
            <p className="rounded-xl border border-gold/25 bg-gold-dim px-3 py-2 text-xs text-gold">
              当前一次学习计划仅支持 1
              条教程链接。请删减为单条后再生成计划，或继续把消息发给导师讨论。
            </p>
          ) : null}

          <div className="grid grid-cols-2 gap-3">
            <Button
              type="button"
              variant="outline"
              className={USER_PANEL_OUTLINE_BUTTON_CLASS}
              disabled={links.length !== 1}
              onClick={onGeneratePlan}
            >
              生成学习计划
            </Button>
            <Button type="button" onClick={() => void onContinueChat()}>
              继续发给导师
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
