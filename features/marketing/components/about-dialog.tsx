"use client"

import {
  Compass,
  Cpu,
  Handshake,
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

type AboutDialogProps = {
  triggerClassName?: string
  triggerLabel?: string
  onTriggerClick?: () => void
}

const aboutBlocks = [
  {
    icon: Compass,
    title: "为什么做这个平台",
    body: "教程很多，真正缺的是把内容收敛成当下能完成的第一步。",
  },
  {
    icon: Sparkles,
    title: "我们想实现的价值",
    body: "让用户不是围观 demo，而是在 AI 陪练里持续完成自己的任务。",
  },
  {
    icon: Cpu,
    title: "我们强调的技术优势",
    body: "按工具、经验和任务场景动态调整路径，不用一套模板覆盖所有人。",
  },
  {
    icon: Handshake,
    title: "我们的开放合作态度",
    body: "欢迎课程作者、工具方和开发者社区一起共建样例、路径与反馈机制。",
  },
]

export function AboutDialog({
  triggerClassName,
  triggerLabel = "关于",
  onTriggerClick,
}: AboutDialogProps) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <button className={triggerClassName} onClick={onTriggerClick}>
          {triggerLabel}
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl rounded-[32px] border-white/10 bg-[linear-gradient(180deg,oklch(0.22_0.02_235/0.98),oklch(0.17_0.015_250/0.98))] p-0 text-foreground shadow-[0_36px_100px_-48px_rgba(0,0,0,0.88)] sm:max-w-[680px]">
        <div className="overflow-hidden rounded-[32px]">
          <div className="border-b border-white/10 bg-[radial-gradient(circle_at_top_left,oklch(0.78_0.15_180/0.16),transparent_46%)] px-6 py-5 sm:px-8">
            <DialogHeader>
              <DialogTitle className="text-2xl font-semibold tracking-tight">
                关于 CodeTutor
              </DialogTitle>
              <DialogDescription className="max-w-3xl text-sm leading-4 text-muted-foreground">
                我们想把“教程很多、实践很少”的学习断层，变成一个持续推进的 AI 陪练系统。
              </DialogDescription>
            </DialogHeader>
          </div>

          <div className="grid gap-4 px-6 py-5 sm:px-8 md:grid-cols-2">
            {aboutBlocks.map((item) => {
              const Icon = item.icon

              return (
                <div key={item.title} className="py-4">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-brand/20 bg-brand/10">
                    <Icon className="h-5 w-5 text-brand" />
                  </div>
                  <h3 className="mt-3 text-lg font-semibold text-foreground">{item.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">{item.body}</p>
                </div>
              )
            })}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
