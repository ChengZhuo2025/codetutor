"use client"

import type { LucideIcon } from "lucide-react"
import {
  Clock3,
  MessageCircle,
  QrCode,
  Smartphone,
} from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { MockQr } from "@/features/marketing/components/mock-qr"

type ContactDialogProps = {
  triggerClassName?: string
}

type ContactChannel = {
  title: string
  value: string
  description: string
  icon: LucideIcon
  accentClassName: string
  badgeClassName: string
  panelClassName?: string
}

type QrChannel = {
  title: string
  description: string
  label: string
  seed: number
  accentClassName: string
  badgeClassName: string
}

const contactChannels: ContactChannel[] = [
  {
    title: "微信咨询",
    value: "CodeTutor_Helper",
    description: "适合产品体验反馈、课程内容建议与合作沟通。",
    icon: MessageCircle,
    accentClassName: "text-brand",
    badgeClassName: "border-brand/20 bg-brand/10 text-brand",
  },
  {
    title: "抖音号",
    value: "CodeTutor_Lab",
    description: "适合跟进产品动态、案例更新和 AI 学习方法分享。",
    icon: Smartphone,
    accentClassName: "text-chart-3",
    badgeClassName: "border-chart-3/20 bg-chart-3/10 text-chart-3",
  },
  {
    title: "联系时间",
    value: "工作日 10:00-19:00",
    description: "周末 14:00-18:00，如未即时回复，可先留言说明来意。",
    icon: Clock3,
    accentClassName: "text-gold",
    badgeClassName: "border-gold/25 bg-gold/10 text-gold",
    panelClassName:
      "border-gold/18 bg-[linear-gradient(180deg,oklch(0.24_0.03_52/0.4),oklch(0.19_0.02_32/0.65))]",
  },
]

const qrChannels: QrChannel[] = [
  {
    title: "微信二维码",
    description: "扫码添加微信，适合咨询体验、合作和团队试用。",
    label: "添加微信",
    seed: 13,
    accentClassName: "text-brand",
    badgeClassName: "border-brand/20 bg-brand/10 text-brand",
  },
  {
    title: "抖音二维码",
    description: "扫码关注账号，后续同步更新案例和学习内容。",
    label: "关注抖音",
    seed: 29,
    accentClassName: "text-chart-3",
    badgeClassName: "border-chart-3/20 bg-chart-3/10 text-chart-3",
  },
]

export function ContactDialog({ triggerClassName }: ContactDialogProps) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <button className={triggerClassName}>联系我们</button>
      </DialogTrigger>
      <DialogContent className="w-[min(920px,calc(100vw-1rem))] max-h-[calc(100dvh-1rem)] overflow-hidden rounded-[30px] border-white/10 bg-[linear-gradient(180deg,oklch(0.22_0.02_235/0.98),oklch(0.17_0.015_250/0.98))] p-0 text-foreground shadow-[0_36px_100px_-48px_rgba(0,0,0,0.88)] sm:max-w-[920px]">
        <div className="flex max-h-[calc(100dvh-1rem)] flex-col overflow-hidden rounded-[30px]">
          <div className="border-b border-white/10 bg-[radial-gradient(circle_at_top,oklch(0.78_0.15_180/0.18),transparent_48%)] px-5 py-4 sm:px-7 sm:py-5">
            <DialogHeader>
              <DialogTitle className="text-2xl font-semibold tracking-tight">联系我们</DialogTitle>
              <DialogDescription className="max-w-3xl text-sm leading-6 text-muted-foreground">
                欢迎咨询产品体验、内测合作、内容共建或企业团队试用。微信、抖音和联系时间都整理在这里，方便一次看全。
              </DialogDescription>
            </DialogHeader>
          </div>

          <div className="overflow-y-auto px-5 py-4 sm:px-7 sm:py-5">
            <div className="grid gap-3 lg:grid-cols-3">
              {contactChannels.map((channel) => {
                const Icon = channel.icon

                return (
                  <div
                    key={channel.title}
                    className={`relative overflow-hidden rounded-[24px] border border-white/10 bg-white/5 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] ${channel.panelClassName ?? ""}`}
                  >
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.06),transparent_46%)]" />
                    <div className="relative flex h-full flex-col">
                      <div className={`inline-flex w-fit items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold ${channel.badgeClassName}`}>
                        <Icon className={`h-3.5 w-3.5 ${channel.accentClassName}`} />
                        {channel.title}
                      </div>
                      <p className="mt-4 text-base font-semibold text-foreground">{channel.value}</p>
                      <p className="mt-2 text-sm leading-6 text-muted-foreground">
                        {channel.description}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>

            <div className="mt-3 grid gap-3 md:grid-cols-2">
              {qrChannels.map((channel) => (
                <div
                  key={channel.title}
                  className="rounded-[24px] border border-white/10 bg-[linear-gradient(180deg,oklch(0.22_0.016_235/0.92),oklch(0.18_0.014_250/0.96))] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold ${channel.badgeClassName}`}>
                        <QrCode className={`h-3.5 w-3.5 ${channel.accentClassName}`} />
                        {channel.title}
                      </div>
                      <p className="mt-3 text-sm leading-6 text-muted-foreground">
                        {channel.description}
                      </p>
                    </div>
                  </div>
                  <MockQr
                    seed={channel.seed}
                    label={channel.label}
                    className="mx-auto mt-4 w-full max-w-[188px] rounded-[24px] bg-black/25 p-3"
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
