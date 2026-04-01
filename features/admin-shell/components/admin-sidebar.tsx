"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { usePathname } from "next/navigation"
import { ADMIN_ROUTES } from "@/constants/routes"
import { menuItems, brandIcon } from "../data/menu-config"
import { cn } from "@/lib/utils"
import { useState } from "react"
import { LogOut, ChevronDown, ChevronRight } from "lucide-react"
import { useAdminSession } from "./admin-shell-client"

const BrandIcon = brandIcon

export function AdminSidebar() {
  const router = useRouter()
  const pathname = usePathname()
  const [aiExpanded, setAiExpanded] = useState(pathname.startsWith(`${ADMIN_ROUTES.home}/ai`))
  const { session } = useAdminSession()

  const handleLogout = async () => {
    try {
      await fetch("/api/admin/auth/logout", { method: "POST" })
    } catch {
      console.error("管理员登出审计写入失败")
    }

    router.replace(ADMIN_ROUTES.login)
    router.refresh()
  }

  return (
    <aside className="w-56 flex-shrink-0 bg-sidebar border-r border-sidebar-border flex flex-col">
      {/* Logo */}
      <div className="h-14 flex items-center gap-2.5 px-4 border-b border-sidebar-border">
        <div className="w-7 h-7 rounded-md bg-primary flex items-center justify-center flex-shrink-0">
          <BrandIcon className="w-4 h-4 text-primary-foreground" />
        </div>
        <div className="flex flex-col min-w-0">
          <span className="text-sm font-semibold text-sidebar-foreground leading-tight truncate">
            AI 编程教练
          </span>
          <span className="text-[10px] text-muted-foreground leading-tight">管理后台</span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-3 px-2">
        <ul className="space-y-0.5">
          {menuItems.map((item) => {
            const isActive = item.href === ADMIN_ROUTES.home
              ? pathname === ADMIN_ROUTES.home
              : pathname.startsWith(item.href) && item.href !== ADMIN_ROUTES.home
            const Icon = item.icon

            // 跳过未激活的菜单项
            if (!item.active && item.href !== ADMIN_ROUTES.home) {
              return null
            }

            if (item.children) {
              return (
                <li key={item.href}>
                  <button
                    onClick={() => setAiExpanded(!aiExpanded)}
                    className={cn(
                      "w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-colors",
                      "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                      isActive && "bg-sidebar-accent text-sidebar-accent-foreground"
                    )}
                  >
                    <Icon className="w-4 h-4 flex-shrink-0" />
                    <span className="flex-1 text-left">{item.label}</span>
                    {aiExpanded
                      ? <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
                      : <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
                    }
                  </button>
                  {aiExpanded && (
                    <ul className="mt-0.5 ml-3 pl-3 border-l border-sidebar-border space-y-0.5">
                      {item.children.map((child) => {
                        const isChildActive = child.href === `${ADMIN_ROUTES.home}/ai`
                          ? pathname === `${ADMIN_ROUTES.home}/ai`
                          : pathname.startsWith(child.href) && child.href !== `${ADMIN_ROUTES.home}/ai`
                        const ChildIcon = child.icon

                        // 跳过未激活的子菜单
                        if (!child.active) {
                          return null
                        }

                        return (
                          <li key={child.href}>
                            <Link
                              href={child.href}
                              className={cn(
                                "flex items-center gap-2 px-2 py-1.5 rounded-md text-xs transition-colors",
                                "text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                                isChildActive && "bg-sidebar-accent text-sidebar-foreground font-medium"
                              )}
                            >
                              <ChildIcon className="w-3.5 h-3.5 flex-shrink-0" />
                              {child.label}
                            </Link>
                          </li>
                        )
                      })}
                    </ul>
                  )}
                </li>
              )
            }

            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    "flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-colors",
                    "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                    isActive && "bg-primary/15 text-primary font-medium"
                  )}
                >
                  <Icon className={cn("w-4 h-4 flex-shrink-0", isActive && "text-primary")} />
                  {item.label}
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>

      {/* Bottom user info */}
      <div className="border-t border-sidebar-border p-3">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
            <span className="text-xs font-semibold text-primary">
              {session?.displayName?.charAt(0).toUpperCase() || "A"}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-sidebar-foreground truncate">
              {session?.displayName || "管理员"}
            </p>
            <p className="text-[10px] text-muted-foreground">
              {session?.roles?.[0] || "super_admin"}
            </p>
          </div>
          <button
            onClick={handleLogout}
            className="text-muted-foreground hover:text-sidebar-foreground transition-colors"
            title="登出"
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </aside>
  )
}
