"use client"

import { usePathname } from "next/navigation"
import { ThemeToggle } from "@/components/layout/theme-toggle"
import type { AdminSessionResponseData } from "@/lib/api/contracts/admin"
import { AdminNotificationCenter } from "@/features/admin-notifications/components/admin-notification-center"
import { AdminAccountMenu } from "./admin-account-menu"

const breadcrumbMap: Record<string, string> = {
  "/admin": "总览看板",
  "/admin/users": "用户运营",
  "/admin/notifications": "消息中心",
  "/admin/feedback": "反馈工单",
  "/admin/learning": "学习运营 / 学习记录",
  "/admin/learning/templates": "学习运营 / 路径模板",
  "/admin/ai": "Ai 管理 / 概览",
  "/admin/ai/providers": "Ai 管理 / Provider 管理",
  "/admin/ai/models": "Ai 管理 / Model 管理",
  "/admin/ai/agents": "Ai 管理 / Agent 管理",
  "/admin/ai/bindings": "Ai 管理 / 命中规则",
  "/admin/ai/skills": "Ai 管理 / Skill 管理",
  "/admin/ai/invocations": "Ai 管理 / 调用日志",
  "/admin/ai/test": "Ai 管理 / 测试调试",
  "/admin/ai/media/transcription-settings": "Ai 管理 / 多媒体管理 / 转译设置",
  "/admin/ai/media/attachments": "Ai 管理 / 多媒体管理 / 附件管理",
  "/admin/site": "站点信息",
  "/admin/site/information": "站点信息 / 网站信息",
  "/admin/site/articles": "站点信息 / 通用文章",
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
        <AdminNotificationCenter />
        <AdminAccountMenu session={session} />
      </div>
    </header>
  )
}
