"use client"

import { useEffect, useRef, useState } from "react"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { ChevronRight, KeyRound, LogOut, UserPen } from "lucide-react"
import type { AdminSessionResponseData } from "@/lib/api/contracts/admin"
import { ADMIN_ROUTES } from "@/constants/routes"
import { FLOATING_LIGHT_PANEL_CLASS } from "@/components/ui/surface-styles"
import { cn } from "@/lib/utils"
import { AdminProfileEditDialog } from "./admin-profile-edit-dialog"
import { AdminChangePasswordDialog } from "./admin-change-password-dialog"

type AdminAccountMenuProps = {
  session: AdminSessionResponseData
}

const ADMIN_ROLE_LABELS: Record<string, string> = {
  super_admin: "超级管理员",
  support_admin: "客服管理员",
  ops_admin: "运营管理员",
  ai_ops_admin: "Ai 管理管理员",
}

function MenuRow({
  icon: Icon,
  label,
  onClick,
  destructive,
}: {
  icon: typeof UserPen
  label: string
  onClick: () => void
  destructive?: boolean
}) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      className={cn(
        "group flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-sm transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:ring-offset-1 focus-visible:ring-offset-popover",
        destructive
          ? "text-destructive hover:bg-destructive/10"
          : "text-foreground hover:bg-muted/80",
      )}
    >
      <Icon
        className={cn(
          "size-4 shrink-0",
          destructive ? "text-destructive/90" : "text-muted-foreground group-hover:text-foreground/90",
        )}
        aria-hidden
      />
      <span className="min-w-0 flex-1 truncate font-medium">{label}</span>
      <ChevronRight
        className={cn(
          "size-3.5 shrink-0 opacity-50 transition-opacity group-hover:opacity-80",
          destructive ? "text-destructive/70" : "text-muted-foreground",
        )}
        aria-hidden
      />
    </button>
  )
}

export function AdminAccountMenu({ session }: AdminAccountMenuProps) {
  const router = useRouter()
  const [menuOpen, setMenuOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const [passwordOpen, setPasswordOpen] = useState(false)
  const wrapRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handlePointerDown(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }

    if (menuOpen) {
      document.addEventListener("mousedown", handlePointerDown)
    }

    return () => document.removeEventListener("mousedown", handlePointerDown)
  }, [menuOpen])

  const handleLogout = async () => {
    setMenuOpen(false)
    try {
      await fetch("/api/admin/auth/logout", { method: "POST" })
    } catch {
      console.error("管理员登出审计写入失败")
    }
    router.replace(ADMIN_ROUTES.login)
    router.refresh()
  }

  const initial = session.displayName?.charAt(0).toUpperCase() || "A"
  const roleLabel = session.roles.length
    ? session.roles.map((roleCode) => ADMIN_ROLE_LABELS[roleCode] ?? roleCode).join(" / ")
    : "未分配角色"

  return (
    <div className="relative" ref={wrapRef}>
      <button
        type="button"
        onClick={() => setMenuOpen((o) => !o)}
        className={cn(
            "group flex max-w-[200px] items-center gap-2 rounded-lg border border-transparent px-2 py-1.5 text-left text-sm text-foreground",
            "transition-[background-color,border-color,box-shadow,transform] duration-150 ease-out",
            "hover:bg-muted/60 hover:border-border/70 hover:shadow-sm",
            "active:scale-[0.985]",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
            menuOpen && "bg-muted/70 border-border/80 shadow-sm",
        )}
        aria-expanded={menuOpen}
        aria-haspopup="menu"
      >
        <span className="relative size-8 shrink-0 overflow-hidden rounded-full bg-muted ring-1 ring-border/50 transition-transform duration-150 ease-out group-hover:scale-[1.02]">
          {session.avatarUrl ? (
            <Image
              src={session.avatarUrl}
              alt=""
              width={32}
              height={32}
              className="size-full object-cover"
              unoptimized
            />
          ) : (
            <span className="flex size-full items-center justify-center text-xs font-semibold text-muted-foreground">
              {initial}
            </span>
          )}
        </span>
          <span className="hidden max-w-36 text-left sm:flex sm:flex-col sm:items-start sm:leading-tight">
            <span className="w-full truncate font-medium text-foreground transition-colors duration-150 group-hover:text-foreground/95">
            {session.displayName || "管理员"}
          </span>
          <span className="mt-0.5 w-full truncate text-[11px] text-muted-foreground">
            {roleLabel}
          </span>
        </span>
      </button>

      {menuOpen ? (
        <div
          className={cn(
            FLOATING_LIGHT_PANEL_CLASS,
            "absolute right-0 top-[calc(100%+10px)] z-50 w-44 min-w-42 overflow-hidden rounded-lg p-1",
          )}
          role="menu"
        >
          <MenuRow
            icon={UserPen}
            label="资料编辑"
            onClick={() => {
              setMenuOpen(false)
              setProfileOpen(true)
            }}
          />
          <MenuRow
            icon={KeyRound}
            label="修改密码"
            onClick={() => {
              setMenuOpen(false)
              setPasswordOpen(true)
            }}
          />
          <div className="my-1 h-px bg-border/80" role="separator" />
          <MenuRow
            icon={LogOut}
            label="退出登录"
            destructive
            onClick={() => void handleLogout()}
          />
        </div>
      ) : null}

      <AdminProfileEditDialog
        open={profileOpen}
        onOpenChange={setProfileOpen}
        onSaved={() => router.refresh()}
      />
      <AdminChangePasswordDialog open={passwordOpen} onOpenChange={setPasswordOpen} />
    </div>
  )
}
