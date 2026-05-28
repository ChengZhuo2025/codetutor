"use client"

import { useMemo, useState } from "react"
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
import { MarkdownContent } from "@/features/site/components/markdown-content"
import { DEFAULT_HELP_CENTER } from "@/features/site/data/default-site"
import { usePublicSite } from "@/features/site/providers/public-site-provider"
import type { PublicSiteHelpItem } from "@/lib/api/contracts/admin-site"
import { cn } from "@/lib/utils"

type HelpCenterDialogProps = {
  triggerLabel?: string
  triggerClassName?: string
}

type HelpCenterFaqItem = PublicSiteHelpItem & {
  category: string
}

const categoryIcons = {
  开始学习: Sparkles,
  学习记录: History,
  订阅订单: CreditCard,
  账号与反馈: MessageSquare,
} satisfies Record<string, typeof HelpCircle>

function getCategoryIcon(category: string) {
  return (categoryIcons as Record<string, typeof HelpCircle>)[category] ?? HelpCircle
}

export function HelpCenterDialog({
  triggerLabel = "帮助中心",
  triggerClassName,
}: HelpCenterDialogProps) {
  const { site } = usePublicSite()
  const helpCenter = site.helpCenter?.categories?.length ? site.helpCenter : DEFAULT_HELP_CENTER
  const helpCenterFaqItems = useMemo<HelpCenterFaqItem[]>(
    () =>
      helpCenter.categories
        .filter((category) => category.enabled)
        .flatMap((category) =>
          category.items
            .filter((item) => item.enabled)
            .map((item) => ({
              ...item,
              category: category.title,
            })),
        ),
    [helpCenter],
  )
  const [expandedId, setExpandedId] = useState<string>("")
  const currentExpandedId = helpCenterFaqItems.some((item) => item.id === expandedId)
    ? expandedId
    : helpCenterFaqItems[0]?.id ?? ""

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
              const isExpanded = currentExpandedId === item.id
              const CategoryIcon = getCategoryIcon(item.category)

              return (
                <div
                  key={item.id}
                  className={cn(
                    "overflow-hidden rounded-xl border transition-all duration-300",
                    isExpanded
                      ? "border-brand/25 bg-brand/8 dark:border-brand/50 dark:bg-brand/20"
                      : "border-border/50 bg-surface-2 hover:border-brand/25 hover:bg-brand/6 dark:border-white/10 dark:hover:border-brand/30 dark:hover:bg-brand/15",
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
                      <MarkdownContent content={item.answerMarkdown} className="space-y-3 text-sm leading-6" />
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
