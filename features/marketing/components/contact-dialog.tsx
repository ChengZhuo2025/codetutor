"use client"

import { useState } from "react"
import type { LucideIcon } from "lucide-react"
import {
  Building2,
  Check,
  Clock3,
  Copy,
  Globe,
  Mail,
  MapPin,
  MessageCircle,
  Smartphone,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { DIALOG_DARK_GRADIENT_PANEL_CLASS } from "@/components/ui/surface-styles"
import { MockQr } from "@/features/marketing/components/mock-qr"
import { cn } from "@/lib/utils"

type ContactDialogProps = {
  triggerClassName?: string
}

type ContactChannel = {
  title: string
  handle: string
  maskedHandle: string
  summary: string
  qrLabel: string
  qrSeed: number
  icon: LucideIcon
  accentClassName: string
  badgeClassName: string
  iconPanelClassName: string
}

type CompanyItem = {
  label: string
  value: string
  icon: LucideIcon
  href?: string
}

const contactChannels: ContactChannel[] = [
  {
    title: "客服微信",
    handle: "18600165902",
    maskedHandle: "186****5902",
    summary: "产品/合作/试用咨询",
    qrLabel: "微信扫码添加",
    qrSeed: 13,
    icon: MessageCircle,
    accentClassName: "text-brand",
    badgeClassName: "border-brand/20 bg-brand/10 text-brand",
    iconPanelClassName: "bg-brand/12 text-brand",
  },
  {
    title: "官方抖音",
    handle: "818740482",
    maskedHandle: "81****82",
    summary: "动态/案例/教程分享",
    qrLabel: "抖音扫码关注",
    qrSeed: 29,
    icon: Smartphone,
    accentClassName: "text-chart-3",
    badgeClassName: "border-chart-3/20 bg-chart-3/10 text-chart-3",
    iconPanelClassName: "bg-chart-3/12 text-chart-3",
  },
]

const companyItems: CompanyItem[] = [
  {
    label: "公司名称",
    value: "上海智酷数能科技有限公司",
    icon: Building2,
  },
  {
    label: "联系地址",
    value: "上海市崇明区长兴镇潘园公路1800号",
    icon: MapPin,
  },
  {
    label: "官方网站",
    value: "https://www.zicool.cn",
    icon: Globe,
    href: "https://www.zicool.cn",
  },
  {
    label: "联系邮箱",
    value: "server@zicool.cn",
    icon: Mail,
    href: "mailto:server@zicool.cn",
  },
  {
    label: "服务时间",
    value: "工作日 10:00-19:00",
    icon: Clock3,
  },
]

async function copyToClipboard(value: string) {
  if (typeof navigator === "undefined" || !navigator.clipboard?.writeText) {
    throw new Error("clipboard-not-supported")
  }

  await navigator.clipboard.writeText(value)
}

export function ContactDialog({ triggerClassName }: ContactDialogProps) {
  const [copiedKey, setCopiedKey] = useState<string | null>(null)

  async function handleCopy(key: string, value: string) {
    try {
      await copyToClipboard(value)
      setCopiedKey(key)
      window.setTimeout(() => {
        setCopiedKey((current) => (current === key ? null : current))
      }, 1800)
    } catch {
      setCopiedKey(null)
    }
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <button className={triggerClassName}>联系我们</button>
      </DialogTrigger>
      <DialogContent className={cn(DIALOG_DARK_GRADIENT_PANEL_CLASS, "w-[min(900px,calc(100vw-1rem))] max-h-[calc(100dvh-1rem)] overflow-hidden rounded-[30px] sm:max-w-[980px]")}>
        <div className="flex max-h-[calc(100dvh-1rem)] flex-col overflow-hidden rounded-[30px]">
          <div className="border-b border-border bg-[radial-gradient(circle_at_top,oklch(0.52_0.12_180/0.1),transparent_52%)] px-5 py-4 dark:border-white/10 dark:bg-[radial-gradient(circle_at_top,oklch(0.78_0.15_180/0.16),transparent_52%)] sm:px-7 sm:py-5">
            <DialogHeader className="gap-3">
              <DialogTitle className="text-2xl font-semibold tracking-tight">联系我们</DialogTitle>
              <DialogDescription className="max-w-2xl text-sm leading-2 text-muted-foreground">
                想了解产品功能、申请试用、洽谈合作，或交流分享Ai编辑经验和心得，可以联系我们。
              </DialogDescription>
            </DialogHeader>
          </div>

          <div className="overflow-y-auto px-5 py-5 sm:px-7 sm:py-6">
            <div className="grid gap-4 xl:grid-cols-[1.12fr_0.88fr]">
              <section className="rounded-[28px] border border-border bg-muted/40 p-4 sm:p-5 dark:border-white/10 dark:bg-[linear-gradient(180deg,rgba(255,255,255,0.05),rgba(255,255,255,0.02))]">
                <div className="flex items-center justify-between gap-3 border-b border-border pb-4 dark:border-white/8">
                  <div>
                    <p className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
                      直接联系
                    </p>
                    <h3 className="mt-1 text-lg font-semibold tracking-tight">
                      微信与抖音入口
                    </h3>
                  </div>
                </div>

                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  {contactChannels.map((channel) => {
                    const Icon = channel.icon
                    const copyKey = `${channel.title}-${channel.handle}`
                    const isCopied = copiedKey === copyKey

                    return (
                      <div key={channel.title}>
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <div
                              className={`flex h-11 w-11 items-center justify-center rounded-2xl ${channel.iconPanelClassName}`}
                            >
                              <Icon className="h-5 w-5" />
                            </div>
                            <div>
                              <div
                                className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold ${channel.badgeClassName}`}
                              >
                                {channel.title}
                              </div>
                              <p className="mt-1 text-sm leading-6 text-muted-foreground">
                                {channel.summary}
                              </p>
                            </div>
                          </div>
                        </div>

                        <div className="mt-4 flex items-center justify-between gap-3 rounded-[12px] border border-border bg-muted/50 px-4 py-3 dark:border-white/8 dark:bg-black/10">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-foreground">
                              {channel.maskedHandle}
                            </p>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-8 rounded-full border border-border bg-muted/80 px-3 text-xs text-foreground hover:bg-muted dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10 dark:hover:text-white"
                            onClick={() => handleCopy(copyKey, channel.handle)}
                          >
                            {isCopied ? <Check className="h-2 w-2" /> : <Copy className="h-2 w-2" />}
                            {isCopied ? "已复制" : "复制"}
                          </Button>
                        </div>

                        <MockQr
                          seed={channel.qrSeed}
                          label={channel.qrLabel}
                          className="mt-4 rounded-[14px] bg-muted/70 p-4 dark:bg-black/18"
                        />
                      </div>
                    )
                  })}
                </div>
              </section>

              <section className="rounded-[28px] border border-border bg-card p-4 sm:p-5 dark:border-white/10 dark:bg-[linear-gradient(180deg,oklch(0.20_0.015_238/0.94),oklch(0.17_0.012_248/0.96))]">
                <div className="border-b border-border pb-4 dark:border-white/8">
                  <p className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
                    企业信息
                  </p>
                  <h3 className="mt-1 text-lg font-semibold tracking-tight">公司与官方联系方式</h3>
                </div>

                <div className="mt-4 space-y-3">
                  {companyItems.map((item) => {
                    const Icon = item.icon

                    return (
                      <div
                        key={item.label}
                        className="flex items-start gap-3 rounded-[14px] border border-border bg-muted/40 px-4 py-3 dark:border-white/8 dark:bg-white/[0.03]"
                      >
                        <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-muted text-muted-foreground dark:bg-white/6">
                          <Icon className="h-4 w-4" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
                            {item.label}
                          </p>
                          {item.href ? (
                            <a
                              href={item.href}
                              target={item.href.startsWith("http") ? "_blank" : undefined}
                              rel={item.href.startsWith("http") ? "noreferrer" : undefined}
                              className="block break-all text-sm font-medium text-foreground transition-colors hover:text-brand"
                            >
                              {item.value}
                            </a>
                          ) : (
                            <p className="text-sm font-medium leading-6 text-foreground">
                              {item.value}
                            </p>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </section>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
