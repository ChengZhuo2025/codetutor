"use client"

import { useState, useEffect, useMemo } from "react"
import Image from "next/image"
import type { LucideIcon } from "lucide-react"
import type { AdminSiteContactResponseData } from "@/lib/api/contracts/admin-settings"
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
import {
  DIALOG_GRADIENT_PANEL_CLASS,
  USER_PANEL_OUTLINE_BUTTON_CLASS,
} from "@/components/ui/surface-styles"
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
  qrSeed?: number
  qrImageUrl?: string | null
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

// contactChannels and companyItems are now dynamically loaded from /api/contact
// (populated from site_contact_settings table managed in /admin/settings)

async function copyToClipboard(value: string) {
  if (typeof navigator === "undefined" || !navigator.clipboard?.writeText) {
    throw new Error("clipboard-not-supported")
  }

  await navigator.clipboard.writeText(value)
}

export function ContactDialog({ triggerClassName }: ContactDialogProps) {
  const [copiedKey, setCopiedKey] = useState<string | null>(null)
  const [brokenQrImageKeys, setBrokenQrImageKeys] = useState<Set<string>>(new Set())
  const [contactData, setContactData] = useState<AdminSiteContactResponseData | null>(null)
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)

  useEffect(() => {
    const loadContact = async () => {
      try {
        const response = await fetch("/api/contact")
        const result = await response.json()
        if (!response.ok) {
          throw new Error(result.message || "Failed to fetch contact info")
        }
        const data = result.data || result
        setContactData(data)
      } catch (err) {
        console.error("Failed to load contact data:", err)
        setFetchError("联系方式加载失败，使用内置默认值")
      } finally {
        setLoading(false)
      }
    }
    loadContact()
  }, [])

  const contactChannels: ContactChannel[] = useMemo(() => {
    if (loading || !contactData?.contactChannels?.length) {
      // Fallback to original hardcoded data for resilience during initial rollout
      return [
        {
          title: "客服微信",
          handle: "18600165902",
          maskedHandle: "186****5902",
          summary: "产品/合作/试用咨询",
          qrLabel: "微信扫码添加",
          qrSeed: 13,
          icon: MessageCircle,
          accentClassName: "text-brand",
          badgeClassName: "text-brand",
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
          badgeClassName: "text-chart-3",
          iconPanelClassName: "bg-chart-3/12 text-chart-3",
        },
      ]
    }

    return contactData.contactChannels.map((ch) => {
      const isWechat = ch.type === "wechat"
      return {
        title: ch.title,
        handle: ch.handle,
        maskedHandle: ch.maskedHandle || ch.handle.replace(/(\d{3})\d{4}(\d{3,4})/, "$1****$2"),
        summary: ch.summary,
        qrLabel: ch.qrLabel,
        qrSeed: ch.qrSeed || (isWechat ? 13 : 29),
        qrImageUrl: ch.qrImageUrl || null, // real uploaded QR (takes precedence)
        icon: isWechat ? MessageCircle : Smartphone,
        accentClassName: isWechat ? "text-brand" : "text-chart-3",
        badgeClassName: isWechat
          ? "text-brand"
          : "text-chart-3",
        iconPanelClassName: isWechat
          ? "bg-brand/12 text-brand"
          : "bg-chart-3/12 text-chart-3",
      }
    })
  }, [contactData, loading])

  const companyItems: CompanyItem[] = useMemo(() => {
    if (loading || !contactData) {
      return [
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
    }

    return [
      {
        label: "公司名称",
        value: contactData.companyName,
        icon: Building2,
      },
      {
        label: "联系地址",
        value: contactData.address,
        icon: MapPin,
      },
      {
        label: "官方网站",
        value: contactData.website,
        icon: Globe,
        href: contactData.website,
      },
      {
        label: "联系邮箱",
        value: contactData.contactEmail,
        icon: Mail,
        href: `mailto:${contactData.contactEmail}`,
      },
      {
        label: "服务时间",
        value: contactData.serviceHours,
        icon: Clock3,
      },
    ]
  }, [contactData, loading])

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
      <DialogContent className={cn(DIALOG_GRADIENT_PANEL_CLASS, "w-[min(900px,calc(100vw-1rem))] max-h-[calc(100dvh-1rem)] p-0 sm:max-w-[980px]")}>
        <div className="flex flex-col overflow-hidden">
        <div className="border-b border-border bg-[radial-gradient(circle_at_top_left,oklch(0.62_0.24_270/0.12),transparent_46%)] px-4 py-5 dark:border-white/14 dark:bg-[radial-gradient(circle_at_top_left,oklch(0.73_0.21_270/0.16),transparent_46%)] sm:px-5">
            <DialogHeader>
              <DialogTitle className="text-2xl font-semibold tracking-tight">联系我们</DialogTitle>
              <DialogDescription className="max-w-3xl text-sm leading-6 text-muted-foreground">
                想了解产品功能、申请试用、洽谈合作，或交流分享Ai编辑经验和心得，可以联系我们。
                {fetchError && <span className="text-amber-400 block mt-1 text-xs">({fetchError})</span>}
              </DialogDescription>
            </DialogHeader>
          </div>

          <div className="overflow-y-auto px-5 py-5 sm:px-7 sm:py-6">
            {loading ? (
              <div className="flex h-64 items-center justify-center text-muted-foreground">加载联系方式...</div>
            ) : (
              <div className="grid gap-4 xl:grid-cols-[1.12fr_0.88fr]">
                <section className="rounded-[28px] border border-border bg-surface-2 p-4 sm:p-5 dark:border-white/10">
                  <div className="flex items-center justify-between gap-3 border-b border-border/60 pb-4 dark:border-white/10">
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
                      const hasUsableQrImage = Boolean(
                        channel.qrImageUrl && !brokenQrImageKeys.has(copyKey),
                      )

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
                                  className={`inline-flex text-sm font-semibold ${channel.badgeClassName}`}
                                >
                                  {channel.title}
                                </div>
                                <p className="text-sm leading-6 text-muted-foreground">
                                  {channel.summary}
                                </p>
                              </div>
                            </div>
                          </div>

                          <div className="mt-4 flex items-center justify-between gap-3 rounded-[12px] border border-border bg-muted/50 p-4 dark:border-white/10 dark:bg-black/10">
                            <div className="min-w-0">
                              <p className="truncate text-sm font-semibold text-foreground">
                                {channel.maskedHandle}
                              </p>
                            </div>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className={cn("h-8 px-3 text-xs", USER_PANEL_OUTLINE_BUTTON_CLASS)}
                              onClick={() => handleCopy(copyKey, channel.handle)}
                            >
                              {isCopied ? <Check className="h-2 w-2" /> : <Copy className="h-2 w-2" />}
                              {isCopied ? "已复制" : "复制"}
                            </Button>
                          </div>

                          {hasUsableQrImage ? (
                            <div className="mt-4 rounded-[14px] overflow-hidden border border-border bg-white p-3">
                              <Image
                                src={channel.qrImageUrl!}
                                alt={channel.qrLabel}
                                width={320}
                                height={320}
                                className="w-full h-auto max-h-[200px] object-contain mx-auto rounded"
                                unoptimized
                                onError={() => {
                                  setBrokenQrImageKeys((prev) => new Set(prev).add(copyKey))
                                  console.warn("QR image failed to load, falling back to mock")
                                }}
                              />
                              <p className="text-center text-[10px] text-muted-foreground mt-3 font-medium">{channel.qrLabel}</p>
                            </div>
                          ) : (
                            <MockQr
                              seed={channel.qrSeed || 13}
                              label={channel.qrLabel}
                              className="mt-4 rounded-[14px] bg-muted/70 p-4 dark:bg-black/18"
                            />
                          )}
                        </div>
                      )
                    })}
                  </div>
                </section>

                <section className="rounded-[28px] border border-border/70 bg-surface-2 p-4 sm:p-5 dark:border-white/10">
                  <div className="border-b border-border/60 pb-4 dark:border-white/10">
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
                          className="flex items-start gap-3 rounded-[14px] border border-border bg-surface-3 px-4 py-3 dark:border-white/10"
                        >
                          <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-white/50 text-muted-foreground dark:bg-white/8">
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
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
