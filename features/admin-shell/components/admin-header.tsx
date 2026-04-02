"use client"

import { Bell, Search } from "lucide-react"
import { usePathname } from "next/navigation"
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
    const segments = pathname.split("/")
    if (segments.length > 3) {
      const parentPath = segments.slice(0, 3).join("/")
      const parentTitle = breadcrumbMap[parentPath]
      if (parentTitle) {
        title = `${parentTitle} / 详情`
      }
    }
  }

  return (
    <header className="flex h-14 shrink-0 items-center justify-between gap-4 border-b border-border bg-background px-6">
      <div className="min-w-0">
        <p className="text-sm font-medium text-foreground truncate">{title}</p>
      </div>
      <div className="flex items-center gap-3 shrink-0">
        <div className="relative hidden md:block">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <input
            type="search"
            placeholder="搜索..."
            className="h-8 pl-8 pr-3 text-xs rounded-md bg-muted border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring w-48"
          />
        </div>
        <button
          type="button"
          className="relative flex size-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted/80 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/45 focus-visible:ring-offset-2 focus-visible:ring-offset-background active:bg-muted/60"
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
