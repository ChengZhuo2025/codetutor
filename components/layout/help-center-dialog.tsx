"use client"

import { useMemo, useState } from "react"
import {
  Bell,
  BookOpen,
  ChevronDown,
  CreditCard,
  FileQuestion,
  GraduationCap,
  HelpCircle,
  History,
  Lightbulb,
  MapIcon,
  MessageSquare,
  Route,
  Settings,
  ShieldQuestion,
  Sparkles,
  Trophy,
  UserRound,
  type LucideIcon,
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
import { refreshPublicSiteWhenDialogOpens } from "@/features/site/lib/public-site-refresh"
import { usePublicSite } from "@/features/site/providers/public-site-provider"
import type { PublicSiteHelpItem } from "@/lib/api/contracts/admin-site"
import { cn } from "@/lib/utils"

type HelpCenterDialogProps = {
  triggerLabel?: string
  triggerClassName?: string
}

type HelpCenterFaqItem = PublicSiteHelpItem & {
  category: string
  iconKey: string
}

const helpCenterIconMap: Record<string, LucideIcon> = {
  bell: Bell,
  "book-open": BookOpen,
  "credit-card": CreditCard,
  "file-question": FileQuestion,
  "graduation-cap": GraduationCap,
  "help-circle": HelpCircle,
  history: History,
  lightbulb: Lightbulb,
  map: MapIcon,
  "message-square": MessageSquare,
  route: Route,
  settings: Settings,
  "shield-question": ShieldQuestion,
  sparkles: Sparkles,
  trophy: Trophy,
  "user-round": UserRound,
}

function getCategoryIcon(iconKey: string) {
  return helpCenterIconMap[iconKey] ?? HelpCircle
}

export function HelpCenterDialog({
  triggerLabel = "帮助中心",
  triggerClassName,
}: HelpCenterDialogProps) {
  const { site, refreshPublicSite } = usePublicSite()
  const helpCenter = site.helpCenter ?? DEFAULT_HELP_CENTER
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
              iconKey: category.iconKey,
            })),
        ),
    [helpCenter],
  )
  const [expandedId, setExpandedId] = useState<string>("")
  const currentExpandedId = helpCenterFaqItems.some((item) => item.id === expandedId)
    ? expandedId
    : helpCenterFaqItems[0]?.id ?? ""

  return (
    <Dialog
      onOpenChange={(open) => {
        void refreshPublicSiteWhenDialogOpens(open, refreshPublicSite)
      }}
    >
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
              const CategoryIcon = getCategoryIcon(item.iconKey)

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
                      "grid transition-[grid-template-rows,opacity] duration-300 ease-out",
                      isExpanded ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
                    )}
                  >
                    <div className="min-h-0 overflow-hidden">
                      <div className="border-t border-brand/15 px-4 pb-4 pt-3 dark:border-brand/25 sm:pl-[4.25rem]">
                        <div className="max-h-[42vh] overflow-y-auto pr-1">
                          <MarkdownContent content={item.answerMarkdown} className="space-y-3 text-sm leading-6" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
            {helpCenterFaqItems.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border bg-surface-2 px-4 py-8 text-center text-sm text-muted-foreground">
                暂无帮助内容
              </div>
            ) : null}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
