"use client"

import { Bell, Search } from "lucide-react"
import { usePathname } from "next/navigation"

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

export function AdminHeader() {
  const pathname = usePathname()

  // 处理动态路由��例如 /admin/feedback/123
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
    <header className="h-14 flex items-center justify-between px-6 border-b border-border bg-background flex-shrink-0">
      <div>
        <p className="text-sm font-medium text-foreground">{title}</p>
      </div>
      <div className="flex items-center gap-3">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <input
            type="search"
            placeholder="搜索..."
            className="h-8 pl-8 pr-3 text-xs rounded-md bg-muted border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring w-48"
          />
        </div>
        <button className="relative w-8 h-8 flex items-center justify-center rounded-md hover:bg-accent transition-colors text-muted-foreground">
          <Bell className="w-4 h-4" />
          <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-destructive" />
        </button>
      </div>
    </header>
  )
}
