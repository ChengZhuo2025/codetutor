"use client"

import Image from "next/image"
import { Code2 } from "lucide-react"
import { APP_COPYRIGHT_YEAR, APP_NAME } from "@/constants/app"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { HelpCenterDialog } from "@/components/layout/help-center-dialog"
import {
  PRIVACY_POLICY_CONTENT,
  USER_AGREEMENT_CONTENT,
  withLegalMeta,
} from "@/features/legal/data/legal-content"
import { marketingTools } from "@/features/marketing/data/marketing-content"
import type { MarketingTool } from "@/features/marketing/types"
import { AboutDialog } from "./about-dialog"
import { ContactDialog } from "./contact-dialog"

type FooterMarketingTool = MarketingTool & {
  downloadUrl: string
  logoSrc: string
}

const featuredFooterTools = marketingTools.filter(
  (tool): tool is FooterMarketingTool =>
    Boolean(tool.featuredInFooter && tool.downloadUrl && tool.logoSrc)
)

type LegalDialogProps = {
  triggerLabel: string
  title: string
  content: string
}

function LegalDialog({ triggerLabel, title, content }: LegalDialogProps) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <button className="cursor-pointer transition-colors hover:text-foreground">
          {triggerLabel}
        </button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription asChild>
            <div className="max-h-[65vh] overflow-y-auto whitespace-pre-line pr-1 text-sm leading-6 text-muted-foreground">
              {content}
            </div>
          </DialogDescription>
        </DialogHeader>
      </DialogContent>
    </Dialog>
  )
}

export function LandingFooter() {
  return (
    <>
      <footer className="pt-10">
        <div className="mx-auto max-w-6xl">
          <div>
            <div className="flex items-center justify-center gap-4">
              <div className="h-px flex-1 bg-gradient-to-r from-transparent to-border dark:to-white/14" />
              <p className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
                相关应用下载
              </p>
              <div className="h-px flex-1 bg-gradient-to-l from-transparent to-border dark:to-white/14" />
            </div>

            <div className="mt-10 pb-6 flex flex-wrap items-center justify-center gap-10 gap-y-5">
              {featuredFooterTools.map((tool) => (
                <a
                  key={tool.name}
                  href={tool.downloadUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="group flex items-center gap-3 transition-transform hover:-translate-y-0.5"
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-border bg-muted/50 dark:border-white/10 dark:bg-white/5">
                    <Image
                      src={tool.logoSrc}
                      alt={`${tool.name} logo`}
                      width={32}
                      height={32}
                      className="rounded-md object-contain"
                    />
                  </div>

                  <div className="min-w-0">
                    <p className="text-sm font-semibold leading-5 text-foreground transition-colors group-hover:text-brand">
                      {tool.name}
                    </p>
                    <p className="text-xs leading-5 text-muted-foreground">{tool.tag}</p>
                  </div>
                </a>
              ))}
            </div>
          </div>
        </div>
        <div className="mt-8 px-26 py-6 border-t border-border/50 bg-surface-2 flex flex-col items-center justify-between gap-6 md:flex-row">
            <div className="flex items-center gap-2 text-muted-foreground">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand text-brand-foreground">
                <Code2 className="h-3.5 w-3.5" />
              </div>
              <span className="text-sm font-semibold">{APP_NAME}</span>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-muted-foreground">
              <AboutDialog
                triggerLabel="关于我们"
                triggerClassName="cursor-pointer transition-colors hover:text-foreground"
              />
              <LegalDialog
                triggerLabel="隐私政策"
                title="隐私政策"
                content={withLegalMeta(PRIVACY_POLICY_CONTENT)}
              />
              <LegalDialog
                triggerLabel="用户协议"
                title="用户协议"
                content={withLegalMeta(USER_AGREEMENT_CONTENT)}
              />
              <ContactDialog triggerClassName="cursor-pointer transition-colors hover:text-foreground" />
              <HelpCenterDialog />
            </div>
            <div className="text-xs text-muted-foreground text-center md:text-right space-y-0.5">
              <p>© {APP_COPYRIGHT_YEAR} {APP_NAME}. All rights reserved.</p>
              <a
                href="https://beian.miit.gov.cn"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-foreground transition-colors hover:underline"
              >
                沪ICP备2026015857号-2
              </a>
            </div>
          </div>
      </footer>
    </>
  )
}
