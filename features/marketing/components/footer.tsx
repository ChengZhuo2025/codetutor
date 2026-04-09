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

type ComingSoonDialogProps = {
  triggerLabel: string
  title: string
  description: string
}

function ComingSoonDialog({ triggerLabel, title, description }: ComingSoonDialogProps) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <button className="cursor-pointer transition-colors hover:text-foreground">
          {triggerLabel}
        </button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription className="leading-6">{description}</DialogDescription>
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
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg border border-border bg-muted/50 dark:border-white/10 dark:bg-white/5">
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
              <span className="text-sm font-medium">{APP_NAME}</span>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-muted-foreground">
              <AboutDialog
                triggerLabel="关于我们"
                triggerClassName="cursor-pointer transition-colors hover:text-foreground"
              />
              <ComingSoonDialog
                triggerLabel="隐私政策"
                title="隐私政策"
                description="隐私政策页面正在整理中，当前可通过联系我们入口咨询数据使用和隐私相关问题。"
              />
              <ComingSoonDialog
                triggerLabel="使用条款"
                title="使用条款"
                description="使用条款页面正在整理中，正式上线前会同步提供完整协议内容。"
              />
              <ContactDialog triggerClassName="cursor-pointer transition-colors hover:text-foreground" />
              <ComingSoonDialog
                triggerLabel="帮助中心"
                title="帮助中心"
                description="帮助中心内容正在建设中，你可以先通过联系我们获取人工支持。"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              © {APP_COPYRIGHT_YEAR} {APP_NAME}. All rights reserved.
            </p>
          </div>
      </footer>
    </>
  )
}
