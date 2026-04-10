"use client"

import { Bell } from "lucide-react"
import { usePathname } from "next/navigation"
import { ThemeToggle } from "@/components/layout/theme-toggle"
import type { AdminSessionResponseData } from "@/lib/api/contracts/admin"
import { AdminAccountMenu } from "./admin-account-menu"

const breadcrumbMap: Record<string, string> = {
  "/admin": "总览看板",
  "/admin/users": "用户运营",
  "/admin/feedback": "反馈工单",
  "/admin/learning": "学习运营",
  "/admin/ai": "AI 运营 / 概览",
  "/admin/ai/providers": "AI 运营 / Provider 管理",
  "/admin/ai/models": "AI 运营 / Model 管理",
  "/admin/ai/agents": "AI 运营 / Agent 管理",
  "/admin/ai/bindings": "AI 运营 / 命中规则",
  "/admin/ai/skills": "AI 运营 / Skill 管理",
  "/admin/ai/invocations": "AI 运营 / 调用日志",
  "/admin/ai/test": "AI 运营 / 测试调试",
  "/admin/settings": "系统设置",
}

type AdminHeaderProps = {
  session: AdminSessionResponseData
}

export function AdminHeader({ session }: AdminHeaderProps) {
  const pathname = usePathname()

  let title = breadcrumbMap[pathname] ?? "管理后台"
  if (!breadcrumbMap[pathname]) {
    const matchedPrefix = Object.keys(breadcrumbMap)
      .filter((key) => pathname.startsWith(`${key}/`))
      .sort((left, right) => right.length - left.length)[0]

    if (matchedPrefix) {
      title = `${breadcrumbMap[matchedPrefix]} / 详情`
    }
  }

  return (
    <header className="flex h-14 shrink-0 items-center justify-between gap-4 border-b border-border bg-background px-6">
      <div className="min-w-0">
        <p className="text-sm font-medium text-foreground truncate">{title}</p>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <ThemeToggle className="size-9 rounded-full hover:bg-brand/10" />
        <button
          type="button"
          className="relative mr-3 flex size-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-brand/10 hover:text-foreground dark:hover:bg-primary/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/45 focus-visible:ring-offset-2 focus-visible:ring-offset-background active:bg-brand/10 dark:active:bg-primary/15"
          aria-label="通知"
        >
          <Bell className="size-4" aria-hidden />
          <span className="absolute right-1.5 top-1.5 size-1.5 rounded-full bg-destructive ring-2 ring-background" />
        </button>
        <AdminAccountMenu session={session} />
      </div>
    </header>
  )
}
