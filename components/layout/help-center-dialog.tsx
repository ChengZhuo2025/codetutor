"use client"

import { useState } from "react"
import {
  ChevronDown,
  CreditCard,
  HelpCircle,
  History,
  MessageSquare,
  Sparkles,
} from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { cn } from "@/lib/utils"

type HelpCenterDialogProps = {
  triggerLabel?: string
  triggerClassName?: string
}

type HelpCenterFaqItem = {
  id: string
  category: "开始学习" | "学习记录" | "订阅订单" | "账号与反馈"
  question: string
  answer: string
}

const helpCenterFaqItems: HelpCenterFaqItem[] = [
  {
    id: "start-new-plan",
    category: "开始学习",
    question: "如何开始一条新的学习计划？",
    answer:
      "进入首页或学习页后，选择适合你的学习目标、当前水平和常用 AI 工具，系统会生成一条可执行的学习路径。已有进行中计划时，建议先继续当前计划，避免学习进度分散。",
  },
  {
    id: "choose-tool",
    category: "开始学习",
    question: "不同 AI 工具可以混合学习吗？",
    answer:
      "可以，但更建议先完成一个工具的核心路径，再切换到另一个工具。这样更容易建立完整工作流，也方便在历史记录里复盘每条计划的目标、任务和完成度。",
  },
  {
    id: "history-retention",
    category: "学习记录",
    question: "学习记录会保存多久？",
    answer:
      "所有学习记录会长期保存，你可以随时回顾已完成的计划、查看任务进度和复盘学习成果。即使订阅过期，历史记录也不会因此被删除。",
  },
  {
    id: "restart-finished-plan",
    category: "学习记录",
    question: "可以重新学习已完成的计划吗？",
    answer:
      "可以。在学习历史中打开已完成计划，使用学习复盘或重新开始相关入口即可再次学习。复盘会帮助你回顾关键任务，但同一计划的 XP 奖励通常只会计算一次。",
  },
  {
    id: "reactivate-plan",
    category: "学习记录",
    question: "中途中断或放弃的计划如何继续？",
    answer:
      "在学习记录里找到“已中断”或“已放弃”的计划，点击重新激活即可继续。若当前已有另一条活跃计划，系统会先阻止冲突操作，避免两条计划同时占用主学习流程。",
  },
  {
    id: "xp-rank",
    category: "学习记录",
    question: "XP 和段位如何计算？",
    answer:
      "完成学习任务可获得基础 XP，连续学习、打卡和达成特定目标会带来额外奖励。XP 累积到对应区间后，系统会自动更新你的段位和成就状态。",
  },
  {
    id: "continue-payment",
    category: "订阅订单",
    question: "待支付订单可以继续支付吗？",
    answer:
      "可以。只要订单还没有过期，你可以在订单列表中点击继续支付，系统会重新展示微信 Native 支付二维码或支付宝扫码支付信息。",
  },
  {
    id: "cancel-order",
    category: "订阅订单",
    question: "取消订单会影响订阅吗？",
    answer:
      "不会。只有已支付订单才会开通或续期订阅权益。取消待支付订单只是关闭本次支付记录，不会改变你当前已经拥有的套餐权益。",
  },
  {
    id: "delete-order",
    category: "订阅订单",
    question: "删除订单后还能恢复吗？",
    answer:
      "用户端删除主要用于隐藏已关闭、已过期或失败的订单。后台仍会保留必要财务记录用于对账和审计，因此删除操作不会影响已支付权益。",
  },
  {
    id: "feedback",
    category: "账号与反馈",
    question: "遇到登录、支付或学习内容问题怎么办？",
    answer:
      "你可以优先在对应页面刷新状态或重新进入当前流程；如果问题仍然存在，请通过“联系我们”或站内反馈入口提交问题现象、发生时间和相关订单号或学习计划名称，方便我们定位处理。",
  },
]

const categoryIcons = {
  开始学习: Sparkles,
  学习记录: History,
  订阅订单: CreditCard,
  账号与反馈: MessageSquare,
} satisfies Record<HelpCenterFaqItem["category"], typeof HelpCircle>

export function HelpCenterDialog({
  triggerLabel = "帮助中心",
  triggerClassName,
}: HelpCenterDialogProps) {
  const [expandedId, setExpandedId] = useState<string>(helpCenterFaqItems[0].id)

  return (
    <Dialog>
      <DialogTrigger asChild>
        <button
          type="button"
          className={cn("cursor-pointer transition-colors hover:text-foreground", triggerClassName)}
        >
          {triggerLabel}
        </button>
      </DialogTrigger>
      <DialogContent className="gap-0 overflow-hidden p-0 sm:max-w-[720px]">
        <div className="border-b border-border bg-[radial-gradient(circle_at_top_left,oklch(0.62_0.24_270/0.12),transparent_46%)] px-4 py-5 dark:border-white/14 dark:bg-[radial-gradient(circle_at_top_left,oklch(0.73_0.21_270/0.16),transparent_46%)] sm:px-5">
          <DialogHeader>
            <DialogTitle className="text-2xl font-semibold tracking-tight">帮助中心</DialogTitle>
            <DialogDescription className="max-w-3xl text-sm leading-6 text-muted-foreground">
              快速了解学习计划、历史记录、订阅订单与反馈处理方式。
              </DialogDescription>
          </DialogHeader>
        </div>

        <div className="max-h-[72vh] overflow-y-auto px-4 py-4 sm:px-6">
          <div className="space-y-3">
            {helpCenterFaqItems.map((item) => {
              const isExpanded = expandedId === item.id
              const CategoryIcon = categoryIcons[item.category]

              return (
                <div
                  key={item.id}
                  className={cn(
                    "overflow-hidden rounded-xl border transition-all duration-300",
                    isExpanded
                      ? "border-brand/25 bg-brand/8 dark:border-brand/50 dark:bg-brand/20"
                      : "border-border/50 bg-surface-2 hover:border-brand/25 hover:bg-brand/6 dark:border-white/14 dark:bg-surface-4 dark:hover:border-brand/30 dark:hover:bg-brand/15",
                  )}
                >
                  <button
                    type="button"
                    aria-expanded={isExpanded}
                    aria-controls={`${item.id}-panel`}
                    onClick={() => setExpandedId(item.id)}
                    className="flex w-full items-center gap-3 px-4 py-3.5 text-left"
                  >
                    <span
                      className={cn(
                        "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border transition-colors",
                        isExpanded
                          ? "border-brand/50 dark:bg-brand/50 dark:text-white"
                          : "border-border/50 bg-background text-foreground/50 dark:bg-white/10",
                      )}
                    >
                      <CategoryIcon className="h-5 w-5" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-[11px] font-medium leading-5 text-muted-foreground">
                        {item.category}
                      </span>
                      <span
                        className={cn(
                          "block text-sm font-semibold leading-5 transition-colors",
                          isExpanded ? "text-foreground" : "text-foreground",
                        )}
                      >
                        {item.question}
                      </span>
                    </span>
                    <ChevronDown
                      className={cn(
                        "h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-300",
                        isExpanded && "rotate-180 text-brand",
                      )}
                    />
                  </button>

                  <div
                    id={`${item.id}-panel`}
                    className={cn(
                      "overflow-hidden transition-all duration-300 ease-out",
                      isExpanded ? "max-h-[220px] opacity-100" : "max-h-0 opacity-0",
                    )}
                  >
                    <div className="border-t border-brand/15 dark:border-brand/25 px-4 pb-4 pt-3 sm:pl-[4.25rem]">
                      <p className="text-sm leading-6 text-muted-foreground">
                        {item.answer}
                      </p>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
