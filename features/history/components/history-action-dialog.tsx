"use client"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import type { HistoryPlanAction, LearningHistory } from "@/features/history/types"

type HistoryActionDialogProps = {
  open: boolean
  item: LearningHistory | null
  action: HistoryPlanAction | null
  isPending?: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: () => void
}

function getDialogCopy(item: LearningHistory | null, action: HistoryPlanAction | null) {
  if (!item || !action) {
    return {
      title: "",
      description: "",
      confirmLabel: "确认",
      confirmVariant: "default" as const,
    }
  }

  if (action === "abandon") {
    return {
      title: "确认放弃本轮练习？",
      description: `放弃后，「${item.title}」会进入“已放弃”状态，之后不能再重新激活，但你仍可保留或删除这条记录。`,
      confirmLabel: "确认放弃",
      confirmVariant: "destructive" as const,
    }
  }

  if (action === "reactivate") {
    return {
      title: "重新激活这个学习计划？",
      description: `重新激活后，「${item.title}」会重新回到进行中状态，你可以直接继续当前练习。`,
      confirmLabel: "重新激活",
      confirmVariant: "default" as const,
    }
  }

  return {
    title: "删除这条学习记录？",
    description: `删除后，「${item.title}」会从历史列表中隐藏。此操作不会影响你之前已经获得的经验值统计。`,
    confirmLabel: "删除记录",
    confirmVariant: "destructive" as const,
  }
}

export function HistoryActionDialog({
  open,
  item,
  action,
  isPending = false,
  onOpenChange,
  onConfirm,
}: HistoryActionDialogProps) {
  const copy = getDialogCopy(item, action)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{copy.title}</DialogTitle>
          <DialogDescription className="mt-2 leading-6">
            {copy.description}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isPending}
            className="rounded-xl"
          >
            取消
          </Button>
          <Button
            type="button"
            variant={copy.confirmVariant}
            onClick={onConfirm}
            disabled={isPending}
            className="rounded-xl"
          >
            {isPending ? "处理中..." : copy.confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
