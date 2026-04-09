"use client"

import { useState } from "react"
import { ChevronDown, ChevronUp, HelpCircle, MessageSquare } from "lucide-react"
import { FeedbackDialog } from "@/components/layout/feedback-dialog"
import { PageSection } from "@/components/ui/page-section"
import { Button } from "@/components/ui/button"
import { USER_PANEL_OUTLINE_BUTTON_CLASS } from "@/components/ui/surface-styles"
import { cn } from "@/lib/utils"
import type { FaqItem } from "@/features/history/types"

interface HistorySidebarPanelsProps {
  faqItems: FaqItem[]
}

export function HistorySidebarPanels({ faqItems }: HistorySidebarPanelsProps) {
  const [expandedId, setExpandedId] = useState<string | null>(faqItems[0]?.id ?? null)
  const [feedbackOpen, setFeedbackOpen] = useState(false)

  const toggleFaq = (id: string) => {
    setExpandedId((current) => (current === id ? null : id))
  }

  return (
    <>
      <PageSection
        eyebrow="常见问题"
        title="使用帮助"
        description="关于学习记录的常见问题和解答"
        action={<HelpCircle className="h-4 w-4 text-muted-foreground" />}
        bodyClassName="space-y-3"
      >
        {faqItems.map((faq) => {
          const isExpanded = expandedId === faq.id
          const ChevronIcon = isExpanded ? ChevronUp : ChevronDown

          return (
            <div
              key={faq.id}
              className={cn(
                "overflow-hidden rounded-2xl border transition-colors",
                isExpanded
                  ? "border-brand/20 bg-brand/5"
                  : "border-border/40 bg-surface-3 hover:border-border/60",
              )}
            >
              <button
                type="button"
                onClick={() => toggleFaq(faq.id)}
                className="flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left"
              >
                <span
                  className={cn(
                    "text-sm font-medium transition-colors",
                    isExpanded ? "text-brand" : "text-foreground",
                  )}
                >
                  {faq.question}
                </span>
                <ChevronIcon
                  className={cn(
                    "h-4 w-4 shrink-0 transition-colors",
                    isExpanded ? "text-brand" : "text-muted-foreground",
                  )}
                />
              </button>

              <div
                className={cn(
                  "overflow-hidden transition-all duration-300 ease-in-out",
                  isExpanded ? "max-h-40 opacity-100" : "max-h-0 opacity-0",
                )}
              >
                <div className="border-t border-border/20 px-4 pb-4 pt-3">
                  <p className="text-sm leading-6 text-muted-foreground">
                    {faq.answer}
                  </p>
                </div>
              </div>
            </div>
          )
        })}

        {/* 反馈按钮 */}
        <div className="mt-4 border-t border-border/20 pt-4">
          <Button
            variant="outline"
            size="lg"
            onClick={() => setFeedbackOpen(true)}
            className={cn("w-full gap-2", USER_PANEL_OUTLINE_BUTTON_CLASS)}
          >
            <MessageSquare className="h-4 w-4" />
            建议反馈
          </Button>
        </div>
      </PageSection>

      <FeedbackDialog
        open={feedbackOpen}
        onOpenChange={setFeedbackOpen}
        source="history_sidebar"
      />
    </>
  )
}
