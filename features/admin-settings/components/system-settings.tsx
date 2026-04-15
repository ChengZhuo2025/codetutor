"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Image from "next/image"
import {
  Activity,
  BadgeCheck,
  Database,
  KeyRound,
  Lock,
  Search,
  Server,
  Shield,
  UserCog,
  UserPen,
  Users,
} from "lucide-react"
import type { AdminRoleCode } from "@/lib/api/contracts/admin"
import type {
  AdminSettingsAdminAccountListItem,
  AdminSettingsAdminAccountListResponseData,
  AdminSettingsAuditLogListItem,
  AdminSettingsAuditLogListResponseData,
  AdminSettingsOverviewResponseData,
} from "@/lib/api/contracts/admin-settings"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { StatePanel } from "@/components/ui/state-panel"
import { useAppConfirm } from "@/components/app-feedback/app-confirm-provider"
import { useAppToast } from "@/components/app-feedback/app-toast-provider"
import { AdminListPaginationFooter } from "@/features/admin-shell/components/admin-list-pagination-footer"
import { AdminListTag } from "@/features/admin-shell/components/admin-list-tag"
import { AdminSelect } from "@/features/admin-shell/components/admin-select"
import { useAdminSessionExpiryRedirect } from "@/features/admin-shell/lib/use-admin-session-expiry-redirect"
import {
  adminRequestData,
  getAdminApiErrorMessage,
  isAdminSessionExpiredError,
} from "@/lib/api/admin-bff-client"
import { AdminChangePasswordDialog } from "@/features/admin-shell/components/admin-change-password-dialog"
import { AdminProfileEditDialog } from "@/features/admin-shell/components/admin-profile-edit-dialog"
import { cn } from "@/lib/utils"

type SettingsTab =
  | "profile"
  | "security"
  | "accounts"
  | "roles"
  | "audit"
  | "system"

const TABS: Array<{ id: SettingsTab; label: string }> = [
  { id: "profile", label: "我的资料" },
  { id: "security", label: "安全设置" },
  { id: "accounts", label: "管理员账号" },
  { id: "roles", label: "角色权限" },
  { id: "audit", label: "操作审计" },
  { id: "system", label: "系统信息" },
]

const ROLE_LABELS: Record<AdminRoleCode, string> = {
  super_admin: "超级管理员",
  support_admin: "客服管理员",
  ops_admin: "运营管理员",
  ai_ops_admin: "AI 运营管理员",
}

const ROLE_BADGE_CLASS: Record<AdminRoleCode, string> = {
  super_admin: "border-rose-500/20 bg-rose-500/10 text-rose-700 dark:text-rose-300",
  support_admin: "border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  ops_admin: "border-violet-500/20 bg-violet-500/10 text-violet-700 dark:text-violet-300",
  ai_ops_admin: "border-sky-500/20 bg-sky-500/10 text-sky-700 dark:text-sky-300",
}

function formatDateTime(value: string | null) {
  if (!value) {
    return "暂无"
  }

  return new Intl.DateTimeFormat("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value))
}

function getStatusLabel(status: string) {
  switch (status) {
    case "active":
      return "启用"
    case "inactive":
      return "停用"
    case "suspended":
      return "冻结"
    default:
      return status
  }
}

function getStatusBadgeClass(status: string) {
  switch (status) {
    case "active":
      return "border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
    case "inactive":
      return "border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-300"
    case "suspended":
      return "border-rose-500/20 bg-rose-500/10 text-rose-700 dark:text-rose-300"
    default:
      return "border-border bg-muted/60 text-muted-foreground"
  }
}

function getAuditActionLabel(action: string) {
  switch (action) {
    case "login":
      return "登录"
    case "logout":
      return "登出"
    case "password_change":
      return "修改密码"
    case "admin_account_activate":
      return "启用管理员"
    case "admin_account_deactivate":
      return "停用管理员"
    case "user_profile_update":
      return "更新用户资料"
    case "user_soft_delete":
      return "软删除用户"
    case "user_restore":
      return "恢复用户"
    case "learning_path_status_update":
      return "学习计划状态调整"
    default:
      return action
  }
}

function RoleBadge({ role }: { role: AdminRoleCode }) {
  return (
    <AdminListTag className={ROLE_BADGE_CLASS[role]}>
      {ROLE_LABELS[role]}
    </AdminListTag>
  )
}

function MetricCard({
  label,
  value,
  icon: Icon,
  valueClassName,
}: {
  label: string
  value: number
  icon: typeof Users
  valueClassName?: string
}) {
  return (
    <div className="rounded-xl border border-border bg-card px-4 py-3">
      <div className="flex items-center gap-2 text-muted-foreground">
        <Icon className="h-4 w-4" />
        <p className="text-xs">{label}</p>
      </div>
      <p className={cn("mt-3 text-2xl font-semibold tracking-tight text-foreground", valueClassName)}>{value}</p>
    </div>
  )
}

function AccountRowActions({
  canManage,
  currentAdminAccountId,
  item,
  actingId,
  onToggleStatus,
}: {
  canManage: boolean
  currentAdminAccountId: string
  item: AdminSettingsAdminAccountListItem
  actingId: string | null
  onToggleStatus: (item: AdminSettingsAdminAccountListItem) => Promise<void>
}) {
  const isSelf = currentAdminAccountId === item.adminAccountId
  const disabled = actingId === item.adminAccountId || isSelf || !canManage

  return (
    <div className="flex items-center justify-end gap-2">
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="h-8 px-2.5"
        disabled={disabled}
        onClick={() => void onToggleStatus(item)}
      >
        {item.status === "active"
          ? actingId === item.adminAccountId
            ? "停用中…"
            : "停用"
          : actingId === item.adminAccountId
            ? "启用中…"
            : "启用"}
      </Button>
    </div>
  )
}

function EmptyHint({ text }: { text: string }) {
  return <StatePanel status="empty" title="暂无数据" description={text} />
}

export function SystemSettings() {
  const confirm = useAppConfirm()
  const toast = useAppToast()
  const [activeTab, setActiveTab] = useState<SettingsTab>("accounts")
  const [overview, setOverview] = useState<AdminSettingsOverviewResponseData | null>(null)
  const [overviewLoading, setOverviewLoading] = useState(true)
  const [overviewError, setOverviewError] = useState<string | null>(null)
  const [profileDialogOpen, setProfileDialogOpen] = useState(false)
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false)
  const [authExpired, setAuthExpired] = useState(false)

  const [accountKeyword, setAccountKeyword] = useState("")
  const [accountKeywordApplied, setAccountKeywordApplied] = useState("")
  const [accountStatus, setAccountStatus] = useState("all")
  const [accountPage, setAccountPage] = useState(1)
  const [accountLimit, setAccountLimit] = useState("20")
  const [accountsLoading, setAccountsLoading] = useState(false)
  const [accountsError, setAccountsError] = useState<string | null>(null)
  const [accountData, setAccountData] = useState<AdminSettingsAdminAccountListResponseData | null>(null)
  const [actingAdminAccountId, setActingAdminAccountId] = useState<string | null>(null)

  const [auditKeyword, setAuditKeyword] = useState("")
  const [auditKeywordApplied, setAuditKeywordApplied] = useState("")
  const [auditAction, setAuditAction] = useState("all")
  const [auditTargetType, setAuditTargetType] = useState("all")
  const [auditPage, setAuditPage] = useState(1)
  const [auditLimit, setAuditLimit] = useState("20")
  const [auditLoading, setAuditLoading] = useState(false)
  const [auditError, setAuditError] = useState<string | null>(null)
  const [auditData, setAuditData] = useState<AdminSettingsAuditLogListResponseData | null>(null)

  useAdminSessionExpiryRedirect(authExpired)

  const canManageAccounts = overview?.currentAdmin.roles.includes("super_admin") ?? false

  const refreshOverview = useCallback(async () => {
    setOverviewLoading(true)
    setOverviewError(null)
    try {
      const result = await adminRequestData<AdminSettingsOverviewResponseData>(
        "/admin/settings/overview",
        { method: "GET" },
        "获取系统设置概览失败",
      )
      setOverview(result)
    } catch (error) {
      setAuthExpired(isAdminSessionExpiredError(error))
      setOverviewError(getAdminApiErrorMessage(error, "获取系统设置概览失败"))
    } finally {
      setOverviewLoading(false)
    }
  }, [])

  const refreshAccounts = useCallback(async () => {
    setAccountsLoading(true)
    setAccountsError(null)
    try {
      const params = new URLSearchParams()
      params.set("status", accountStatus)
      params.set("limit", accountLimit)
      params.set("page", String(accountPage))
      if (accountKeywordApplied) {
        params.set("keyword", accountKeywordApplied)
      }
      const result = await adminRequestData<AdminSettingsAdminAccountListResponseData>(
        `/admin/settings/admin-accounts?${params.toString()}`,
        { method: "GET" },
        "获取管理员账号列表失败",
      )
      setAccountData(result)
    } catch (error) {
      setAuthExpired(isAdminSessionExpiredError(error))
      setAccountsError(getAdminApiErrorMessage(error, "获取管理员账号列表失败"))
    } finally {
      setAccountsLoading(false)
    }
  }, [accountKeywordApplied, accountLimit, accountPage, accountStatus])

  const refreshAuditLogs = useCallback(async () => {
    setAuditLoading(true)
    setAuditError(null)
    try {
      const params = new URLSearchParams()
      params.set("action", auditAction)
      params.set("targetType", auditTargetType)
      params.set("limit", auditLimit)
      params.set("page", String(auditPage))
      if (auditKeywordApplied) {
        params.set("keyword", auditKeywordApplied)
      }
      const result = await adminRequestData<AdminSettingsAuditLogListResponseData>(
        `/admin/settings/audit-logs?${params.toString()}`,
        { method: "GET" },
        "获取操作审计失败",
      )
      setAuditData(result)
    } catch (error) {
      setAuthExpired(isAdminSessionExpiredError(error))
      setAuditError(getAdminApiErrorMessage(error, "获取操作审计失败"))
    } finally {
      setAuditLoading(false)
    }
  }, [auditAction, auditKeywordApplied, auditLimit, auditPage, auditTargetType])

  useEffect(() => {
    void refreshOverview()
  }, [refreshOverview])

  useEffect(() => {
    if (activeTab === "accounts") {
      void refreshAccounts()
    }
  }, [activeTab, refreshAccounts])

  useEffect(() => {
    if (activeTab === "audit") {
      void refreshAuditLogs()
    }
  }, [activeTab, refreshAuditLogs])

  const accountTotalPages = Math.max(
    1,
    Math.ceil((accountData?.total ?? 0) / (Number.parseInt(accountLimit, 10) || 20)) || 1,
  )

  const auditTotalPages = Math.max(
    1,
    Math.ceil((auditData?.total ?? 0) / (Number.parseInt(auditLimit, 10) || 20)) || 1,
  )

  const currentAdminInitial = useMemo(
    () => overview?.currentAdmin.displayName?.slice(0, 1) || "管",
    [overview?.currentAdmin.displayName],
  )

  const handleToggleAccountStatus = async (item: AdminSettingsAdminAccountListItem) => {
    const nextAction = item.status === "active" ? "deactivate" : "activate"
    const result = await confirm.prompt({
      title: nextAction === "deactivate" ? "确认停用该管理员？" : "确认启用该管理员？",
      description:
        nextAction === "deactivate"
          ? "停用后该管理员将无法继续登录管理后台。"
          : "启用后该管理员可继续使用已有权限登录管理后台。",
      confirmText: nextAction === "deactivate" ? "确认停用" : "确认启用",
      cancelText: "取消",
      destructive: nextAction === "deactivate",
      input: {
        label: "原因（可选）",
        placeholder: "可填写本次账号状态调整原因",
        defaultValue: "",
        multiline: true,
      },
    })

    if (!result.confirmed) {
      return
    }

    setActingAdminAccountId(item.adminAccountId)

    try {
      await adminRequestData(
        `/admin/settings/admin-accounts/${item.adminAccountId}/status`,
        {
          method: "POST",
          body: JSON.stringify({
            action: nextAction,
            reason: result.value.trim() || null,
          }),
        },
        "更新管理员账号状态失败",
      )
      toast.success(nextAction === "deactivate" ? "管理员账号已停用" : "管理员账号已启用")
      await Promise.all([refreshOverview(), refreshAccounts(), activeTab === "audit" ? refreshAuditLogs() : Promise.resolve()])
    } catch (error) {
      setAuthExpired(isAdminSessionExpiredError(error))
      toast.error(getAdminApiErrorMessage(error, "更新管理员账号状态失败"))
    } finally {
      setActingAdminAccountId(null)
    }
  }

  const renderProfileTab = () => {
    if (overviewLoading) {
      return <div className="rounded-xl border border-border bg-card px-5 py-6 text-sm text-muted-foreground">加载中…</div>
    }

    if (overviewError || !overview) {
      return <StatePanel status="error" title="获取系统设置失败" description={overviewError ?? "请稍后再试。"} />
    }

    return (
      <div className="space-y-4">
        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-4">
              <div className="relative flex h-16 w-16 items-center justify-center overflow-hidden rounded-full border border-border bg-muted">
                {overview.currentAdmin.avatarUrl ? (
                  <Image
                    src={overview.currentAdmin.avatarUrl}
                    alt=""
                    width={64}
                    height={64}
                    className="h-full w-full object-cover"
                    unoptimized
                  />
                ) : (
                  <span className="text-lg font-semibold text-primary">{currentAdminInitial}</span>
                )}
              </div>
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-lg font-semibold text-foreground">{overview.currentAdmin.displayName}</h2>
                  <AdminListTag className={getStatusBadgeClass(overview.currentAdmin.status)}>
                    {getStatusLabel(overview.currentAdmin.status)}
                  </AdminListTag>
                </div>
                <p className="text-sm text-muted-foreground">{overview.currentAdmin.email ?? "暂无联系邮箱"}</p>
                <div className="flex flex-wrap gap-2">
                  {overview.currentAdmin.roles.map((role) => (
                    <RoleBadge key={role} role={role} />
                  ))}
                </div>
              </div>
            </div>
            <Button type="button" onClick={() => setProfileDialogOpen(true)}>
              <UserPen className="h-4 w-4" />
              资料编辑
            </Button>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="flex items-start gap-3">
            <BadgeCheck className="mt-1 h-4 w-4 text-primary" />
            <div className="space-y-2">
              <h3 className="text-sm font-medium text-foreground">资料说明</h3>
              <p className="text-sm leading-6 text-muted-foreground">
                这里维护的是管理后台展示用资料，包括显示名、头像和联系邮箱，不影响终端用户个人资料。
              </p>
              <p className="text-sm text-muted-foreground">
                最近登录：{formatDateTime(overview.currentAdmin.lastLoginAt)}
              </p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const renderSecurityTab = () => (
    <div className="space-y-4">
      <div className="rounded-2xl border border-border bg-card p-5">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Lock className="h-4 w-4 text-primary" />
              <h2 className="text-lg font-semibold text-foreground">登录安全</h2>
            </div>
            <p className="text-sm leading-6 text-muted-foreground">
              管理员登录通过 Supabase Auth 与 `admin_accounts` 双重校验。修改密码后需要重新登录管理后台。
            </p>
          </div>
          <Button type="button" variant="outline" onClick={() => setPasswordDialogOpen(true)}>
            <KeyRound className="h-4 w-4" />
            修改密码
          </Button>
        </div>
      </div>
      <div className="rounded-2xl border border-border bg-card p-5 text-sm leading-6 text-muted-foreground">
        <p>当前后台写操作会记录操作审计，敏感账号治理能力仅对具备足够角色权限的管理员开放。</p>
      </div>
    </div>
  )

  const renderAccountsTab = () => {
    const stats = accountData?.stats ?? overview?.stats
    const listItems = accountData?.items ?? []

    return (
      <div className="space-y-4">
        <div className="grid gap-3 md:grid-cols-4">
          <MetricCard label="管理员总数" value={stats?.totalAdminAccounts ?? 0} icon={Users} />
          <MetricCard label="启用中" value={stats?.activeAdminAccounts ?? 0} icon={Shield} valueClassName="text-emerald-600 dark:text-emerald-400" />
          <MetricCard label="已停用" value={stats?.inactiveAdminAccounts ?? 0} icon={UserCog} valueClassName="text-amber-600 dark:text-amber-400" />
          <MetricCard label="已冻结" value={stats?.suspendedAdminAccounts ?? 0} icon={Lock} valueClassName="text-rose-600 dark:text-rose-400" />
        </div>

        <div className="rounded-2xl border border-border bg-card">
          <div className="flex flex-col gap-3 border-b border-border px-4 py-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-1 flex-col gap-3 md:flex-row md:items-center">
              <div className="relative flex-1 min-w-32 max-w-md">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={accountKeyword}
                  onChange={(event) => setAccountKeyword(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      setAccountPage(1)
                      setAccountKeywordApplied(accountKeyword.trim())
                    }
                  }}
                  className="h-9 w-full rounded-md border border-border bg-background pl-8 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                  placeholder="搜索管理员姓名、邮箱、用户 ID"
                />
              </div>
              <AdminSelect
                value={accountStatus}
                onValueChange={(next) => {
                  setAccountStatus(next)
                  setAccountPage(1)
                }}
                options={[
                  { value: "all", label: "全部状态" },
                  { value: "active", label: "启用" },
                  { value: "inactive", label: "停用" },
                  { value: "suspended", label: "冻结" },
                ]}
                triggerClassName="h-10 min-w-[7rem] shrink-0"
              />
              <Button type="button" variant="outline" onClick={() => {
                setAccountPage(1)
                setAccountKeywordApplied(accountKeyword.trim())
              }}>
                搜索
              </Button>
              {!canManageAccounts ? (
                <span className="text-xs text-muted-foreground">仅超级管理员可操作</span>
              ) : null}
            </div>
          </div>

          {accountsError ? (
            <div className="px-4 py-6">
              <StatePanel status="error" title="获取管理员账号列表失败" description={accountsError} />
            </div>
          ) : accountsLoading && !accountData ? (
            <div className="px-4 py-6 text-sm text-muted-foreground">加载中…</div>
          ) : listItems.length === 0 ? (
            <div className="px-4 py-6">
              <EmptyHint text="暂无符合条件的管理员账号。" />
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/30 text-left text-xs text-muted-foreground">
                      <th className="px-4 py-3">账号</th>
                      <th className="px-4 py-3">邮箱</th>
                      <th className="px-4 py-3">角色权限</th>
                      <th className="px-4 py-3">状态</th>
                      <th className="px-4 py-3">最后登录</th>
                      <th className="px-4 py-3">创建时间</th>
                      <th className="px-4 py-3 text-right">操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {listItems.map((item) => (
                      <tr key={item.adminAccountId} className="border-b border-border/80 last:border-b-0">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="relative flex h-10 w-10 items-center justify-center overflow-hidden rounded-full border border-border bg-muted">
                              {item.avatarUrl ? (
                                <Image
                                  src={item.avatarUrl}
                                  alt=""
                                  width={40}
                                  height={40}
                                  className="h-full w-full object-cover"
                                  unoptimized
                                />
                              ) : (
                                <span className="text-sm font-semibold text-primary">
                                  {item.displayName.slice(0, 1)}
                                </span>
                              )}
                            </div>
                            <div className="space-y-0.5">
                              <p className="font-medium text-foreground">{item.displayName}</p>
                              <p className="font-mono text-[11px] text-muted-foreground">{item.userId}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">{item.email ?? "暂无邮箱"}</td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-2">
                            {item.roles.map((role) => (
                              <RoleBadge key={role} role={role} />
                            ))}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <AdminListTag className={getStatusBadgeClass(item.status)}>
                            {getStatusLabel(item.status)}
                          </AdminListTag>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">{formatDateTime(item.lastLoginAt)}</td>
                        <td className="px-4 py-3 text-muted-foreground">{formatDateTime(item.createdAt)}</td>
                        <td className="px-4 py-3">
                          {overview ? (
                            <AccountRowActions
                              canManage={canManageAccounts}
                              currentAdminAccountId={overview.currentAdmin.adminAccountId}
                              item={item}
                              actingId={actingAdminAccountId}
                              onToggleStatus={handleToggleAccountStatus}
                            />
                          ) : null}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <AdminListPaginationFooter
                limit={accountLimit}
                onLimitChange={(value) => {
                  setAccountLimit(value)
                  setAccountPage(1)
                }}
                page={accountPage}
                totalPages={accountTotalPages}
                total={accountData?.total ?? 0}
                canPrev={accountPage > 1}
                canNext={accountPage < accountTotalPages}
                isLoading={accountsLoading}
                onPrevPage={() => setAccountPage((page) => Math.max(1, page - 1))}
                onNextPage={() => setAccountPage((page) => Math.min(accountTotalPages, page + 1))}
              />
            </>
          )}
        </div>
      </div>
    )
  }

  const renderRolesTab = () => {
    if (overviewLoading) {
      return <div className="rounded-xl border border-border bg-card px-5 py-6 text-sm text-muted-foreground">加载中…</div>
    }

    if (overviewError || !overview) {
      return <StatePanel status="error" title="获取角色权限失败" description={overviewError ?? "请稍后再试。"} />
    }

    return (
      <div className="space-y-4">
        {overview.roleDefinitions.map((role) => (
          <div key={role.code} className="rounded-2xl border border-border bg-card p-5">
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <RoleBadge role={role.code} />
                  <span className="text-sm font-medium text-foreground">{role.name}</span>
                  <span className="text-xs text-muted-foreground">共 {role.accountCount} 个账号</span>
                </div>
                <p className="text-sm leading-6 text-muted-foreground">
                  {role.description ?? "当前角色描述暂未补充。"}
                </p>
              </div>
            </div>
          </div>
        ))}
        <div className="rounded-2xl border border-border bg-card p-5 text-sm leading-6 text-muted-foreground">
          当前角色权限由代码和服务端守卫控制，本轮系统设置只提供角色权限说明，不支持后台自定义角色或在线改权限。
        </div>
      </div>
    )
  }

  const renderAuditTab = () => {
    const items = auditData?.items ?? []

    return (
      <div className="space-y-4">
        <div className="rounded-2xl border border-border bg-card">
          <div className="flex flex-col gap-3 border-b border-border px-4 py-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-1 flex-col gap-3 md:flex-row md:items-center">
              <div className="relative max-w-md flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={auditKeyword}
                  onChange={(event) => setAuditKeyword(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      setAuditPage(1)
                      setAuditKeywordApplied(auditKeyword.trim())
                    }
                  }}
                  className="pl-9"
                  placeholder="搜索操作审计、原因、目标类型"
                />
              </div>
              <AdminSelect
                value={auditAction}
                onValueChange={(next) => {
                  setAuditAction(next)
                  setAuditPage(1)
                }}
                options={[
                  { value: "all", label: "全部操作" },
                  { value: "login", label: "登录" },
                  { value: "logout", label: "登出" },
                  { value: "password_change", label: "修改密码" },
                  { value: "admin_account_activate", label: "启用管理员" },
                  { value: "admin_account_deactivate", label: "停用管理员" },
                  { value: "user_profile_update", label: "更新用户资料" },
                  { value: "user_soft_delete", label: "软删除用户" },
                  { value: "user_restore", label: "恢复用户" },
                  { value: "learning_path_status_update", label: "学习计划状态调整" },
                ]}
                triggerClassName="h-10 min-w-[9rem] max-w-[14rem] shrink-0"
              />
              <AdminSelect
                value={auditTargetType}
                onValueChange={(next) => {
                  setAuditTargetType(next)
                  setAuditPage(1)
                }}
                options={[
                  { value: "all", label: "全部目标类型" },
                  { value: "admin_account", label: "管理员账号" },
                  { value: "user_profile", label: "用户资料" },
                  { value: "user_learning_path", label: "学习计划" },
                ]}
                triggerClassName="h-10 min-w-[9rem] shrink-0"
              />
            </div>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setAuditPage(1)
                setAuditKeywordApplied(auditKeyword.trim())
              }}
            >
              搜索
            </Button>
          </div>

          {auditError ? (
            <div className="px-4 py-6">
              <StatePanel status="error" title="获取操作审计失败" description={auditError} />
            </div>
          ) : auditLoading && !auditData ? (
            <div className="px-4 py-6 text-sm text-muted-foreground">加载中…</div>
          ) : items.length === 0 ? (
            <div className="px-4 py-6">
              <EmptyHint text="暂无符合条件的操作审计记录。" />
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/30 text-left text-xs text-muted-foreground">
                      <th className="px-4 py-3">操作</th>
                      <th className="px-4 py-3">操作人</th>
                      <th className="px-4 py-3">目标类型</th>
                      <th className="px-4 py-3">原因</th>
                      <th className="px-4 py-3">时间</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item: AdminSettingsAuditLogListItem) => (
                      <tr key={item.id} className="border-b border-border/80 last:border-b-0">
                        <td className="px-4 py-3">
                          <div className="space-y-0.5">
                            <p className="font-medium text-foreground">{getAuditActionLabel(item.action)}</p>
                            <p className="font-mono text-[11px] text-muted-foreground">{item.id}</p>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">{item.actorDisplayName}</td>
                        <td className="px-4 py-3 text-muted-foreground">{item.targetType}</td>
                        <td className="px-4 py-3 text-muted-foreground">{item.reason ?? "暂无原因"}</td>
                        <td className="px-4 py-3 text-muted-foreground">{formatDateTime(item.createdAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <AdminListPaginationFooter
                limit={auditLimit}
                onLimitChange={(value) => {
                  setAuditLimit(value)
                  setAuditPage(1)
                }}
                page={auditPage}
                totalPages={auditTotalPages}
                total={auditData?.total ?? 0}
                canPrev={auditPage > 1}
                canNext={auditPage < auditTotalPages}
                isLoading={auditLoading}
                onPrevPage={() => setAuditPage((page) => Math.max(1, page - 1))}
                onNextPage={() => setAuditPage((page) => Math.min(auditTotalPages, page + 1))}
              />
            </>
          )}
        </div>
      </div>
    )
  }

  const renderSystemTab = () => {
    if (overviewLoading) {
      return <div className="rounded-xl border border-border bg-card px-5 py-6 text-sm text-muted-foreground">加载中…</div>
    }

    if (overviewError || !overview) {
      return <StatePanel status="error" title="获取系统信息失败" description={overviewError ?? "请稍后再试。"} />
    }

    return (
      <div className="space-y-4">
        <div className="grid gap-3 md:grid-cols-3">
          <MetricCard label="7 日操作审计" value={overview.stats.auditLogCountLast7Days} icon={Activity} />
          <MetricCard label="启用管理员" value={overview.stats.activeAdminAccounts} icon={Users} />
          <MetricCard label="角色数" value={overview.roleDefinitions.length} icon={Shield} />
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-2xl border border-border bg-card p-5">
            <div className="mb-4 flex items-center gap-2">
              <Server className="h-4 w-4 text-primary" />
              <h2 className="text-sm font-medium text-foreground">应用信息</h2>
            </div>
            <dl className="space-y-3 text-sm">
              <div className="flex items-center justify-between gap-4">
                <dt className="text-muted-foreground">应用名称</dt>
                <dd className="text-foreground">{overview.systemInfo.appName}</dd>
              </div>
              <div className="flex items-center justify-between gap-4">
                <dt className="text-muted-foreground">版本</dt>
                <dd className="font-mono text-foreground">{overview.systemInfo.appVersion}</dd>
              </div>
              <div className="flex items-center justify-between gap-4">
                <dt className="text-muted-foreground">运行环境</dt>
                <dd className="font-mono text-foreground">{overview.systemInfo.environment}</dd>
              </div>
              <div className="flex items-center justify-between gap-4">
                <dt className="text-muted-foreground">Next.js</dt>
                <dd className="font-mono text-foreground">{overview.systemInfo.nextVersion ?? "未知"}</dd>
              </div>
              <div className="flex items-center justify-between gap-4">
                <dt className="text-muted-foreground">React</dt>
                <dd className="font-mono text-foreground">{overview.systemInfo.reactVersion ?? "未知"}</dd>
              </div>
            </dl>
          </div>

          <div className="rounded-2xl border border-border bg-card p-5">
            <div className="mb-4 flex items-center gap-2">
              <Database className="h-4 w-4 text-primary" />
              <h2 className="text-sm font-medium text-foreground">基础设施</h2>
            </div>
            <dl className="space-y-3 text-sm">
              <div className="flex items-center justify-between gap-4">
                <dt className="text-muted-foreground">管理员认证</dt>
                <dd className="text-right text-foreground">{overview.systemInfo.adminAuthMode}</dd>
              </div>
              <div className="flex items-center justify-between gap-4">
                <dt className="text-muted-foreground">数据库</dt>
                <dd className="text-right text-foreground">{overview.systemInfo.database}</dd>
              </div>
              <div className="flex items-center justify-between gap-4">
                <dt className="text-muted-foreground">对象存储</dt>
                <dd className="text-right text-foreground">{overview.systemInfo.storage}</dd>
              </div>
              <div className="flex items-center justify-between gap-4">
                <dt className="text-muted-foreground">用户认证</dt>
                <dd className="text-right text-foreground">{overview.systemInfo.auth}</dd>
              </div>
            </dl>
          </div>
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="space-y-6">
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">系统设置</h1>
          <p className="text-sm text-muted-foreground">
            管理员治理设置，包括我的资料、安全设置、管理员账号、角色权限、操作审计和系统信息。
          </p>
        </div>

        <div className="flex flex-wrap gap-2 border-b border-border pb-3">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === "profile" ? renderProfileTab() : null}
        {activeTab === "security" ? renderSecurityTab() : null}
        {activeTab === "accounts" ? renderAccountsTab() : null}
        {activeTab === "roles" ? renderRolesTab() : null}
        {activeTab === "audit" ? renderAuditTab() : null}
        {activeTab === "system" ? renderSystemTab() : null}
      </div>

      <AdminProfileEditDialog
        open={profileDialogOpen}
        onOpenChange={setProfileDialogOpen}
        onSaved={() => void refreshOverview()}
      />
      <AdminChangePasswordDialog open={passwordDialogOpen} onOpenChange={setPasswordDialogOpen} />
    </>
  )
}
