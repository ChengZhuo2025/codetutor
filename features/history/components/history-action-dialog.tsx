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
  hasActivePlanConflict?: boolean
  isPending?: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: () => void
}

function getDialogCopy(
  item: LearningHistory | null,
  action: HistoryPlanAction | null,
  hasActivePlanConflict = false,
) {
  if (!item || !action) {
    return {
      title: "",
      description: "",
      confirmLabel: "确认",
      cancelLabel: "取消",
      confirmVariant: "default" as const,
    }
  }

  if (action === "abandon") {
    return {
      title: "确认放弃本轮练习？",
      description: `放弃后，「${item.title}」会进入“已放弃”状态。你之后仍可回到历史列表重新激活，或直接删除这条记录。`,
      confirmLabel: "确认放弃",
      cancelLabel: "取消",
      confirmVariant: "destructive" as const,
    }
  }

  if (action === "reactivate") {
    if (hasActivePlanConflict) {
      return {
        title: "需要先处理当前进行中的学习计划",
        description: `你当前已有一条进行中的学习计划，暂时不能同时启用「${item.title}」。如果想切换回来，请先前往当前进行中的计划并将其放弃，然后再回来重新激活这条计划。`,
        confirmLabel: "去处理进行中计划",
        cancelLabel: "暂不处理",
        confirmVariant: "default" as const,
      }
    }

    return {
      title: "重新激活这个学习计划？",
      description: `重新激活后，「${item.title}」会重新回到进行中状态，你可以直接继续当前练习。`,
      confirmLabel: "重新激活",
      cancelLabel: "取消",
      confirmVariant: "default" as const,
    }
  }

  return {
    title: "删除这条学习记录？",
    description: `删除后，「${item.title}」会从历史列表中隐藏。此操作不会影响你之前已经获得的经验值统计。`,
    confirmLabel: "删除记录",
    cancelLabel: "取消",
    confirmVariant: "destructive" as const,
  }
}

export function HistoryActionDialog({
  open,
  item,
  action,
  hasActivePlanConflict = false,
  isPending = false,
  onOpenChange,
  onConfirm,
}: HistoryActionDialogProps) {
  const copy = getDialogCopy(item, action, hasActivePlanConflict)

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
          >
            {copy.cancelLabel}
          </Button>
          <Button
            type="button"
            variant={copy.confirmVariant}
            onClick={onConfirm}
            disabled={isPending}
          >
            {isPending ? "处理中..." : copy.confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
