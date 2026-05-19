"use client"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { MarkdownContent } from "@/features/site/components/markdown-content"
import { usePublicSite } from "@/features/site/providers/public-site-provider"

type AboutDialogProps = {
  triggerClassName?: string
  triggerLabel?: string
  onTriggerClick?: () => void
}

export function AboutDialog({
  triggerClassName,
  triggerLabel = "关于",
  onTriggerClick,
}: AboutDialogProps) {
  const { site } = usePublicSite()
  const article = site.articles.aboutUs

  return (
    <Dialog>
      <DialogTrigger asChild>
        <button className={triggerClassName} onClick={onTriggerClick}>
          {triggerLabel}
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl sm:max-w-[680px] p-0">
        <div className="overflow-hidden">
          <div className="border-b border-border bg-[radial-gradient(circle_at_top_left,oklch(0.62_0.24_270/0.12),transparent_46%)] px-4 py-5 dark:border-white/14 dark:bg-[radial-gradient(circle_at_top_left,oklch(0.73_0.21_270/0.16),transparent_46%)] sm:px-5">
            <DialogHeader>
              <DialogTitle className="text-2xl font-semibold tracking-tight">
                {article.title}
              </DialogTitle>
              <DialogDescription className="max-w-3xl text-sm leading-6 text-muted-foreground">
                {site.information.siteDescription}
              </DialogDescription>
            </DialogHeader>
          </div>

          <div className="max-h-[65vh] overflow-y-auto px-6 py-5 sm:px-8">
            <MarkdownContent content={article.contentMarkdown} />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
