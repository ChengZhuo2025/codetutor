"use client"

import { useCallback, useEffect, useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { Download, Flame, FolderKanban, Search, ShieldAlert, Users } from "lucide-react"
import type {
  AdminUserDetailResponseData,
  AdminUserListItem,
  AdminUserListResponseData,
} from "@/lib/api/contracts/admin-users"
import { useAppConfirm } from "@/components/app-feedback/app-confirm-provider"
import { useAppToast } from "@/components/app-feedback/app-toast-provider"
import { Badge } from "@/components/ui/badge"
import { StatePanel } from "@/components/ui/state-panel"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { AdminListPaginationFooter } from "@/features/admin-shell/components/admin-list-pagination-footer"
import { AdminSelect } from "@/features/admin-shell/components/admin-select"
import { useAdminSessionExpiryRedirect } from "@/features/admin-shell/lib/use-admin-session-expiry-redirect"
import {
  adminBffFetch,
  adminRequestData,
  getAdminApiErrorMessage,
  isAdminSessionExpiredError,
} from "@/lib/api/admin-bff-client"
import { cn } from "@/lib/utils"
import { ADMIN_ROUTES } from "@/constants/routes"
import {
  formatAdminLearningLevelLabel,
  formatAdminRankLabel,
  formatAdminSelectionModeLabel,
  getUserTaskCompletionPercent,
} from "../lib/view-model"
import { UserEditSheet } from "./user-edit-sheet"

function formatDateTime(iso: string | null) {
  if (!iso) {
    return "暂无"
  }

  return new Intl.DateTimeFormat("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso))
}

function getPlanStatusMeta(user: AdminUserListItem) {
  if (!user.activePathCode) {
    return {
      label: "无计划",
      className: "border-border bg-muted/70 text-muted-foreground",
    }
  }

  switch (user.activePathStatus) {
    case "active":
      return {
        label: "进行中",
        className: "border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
      }
    case "interrupted":
      return {
        label: "已中断",
        className: "border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-300",
      }
    case "completed":
      return {
        label: "已完成",
        className: "border-sky-500/20 bg-sky-500/10 text-sky-700 dark:text-sky-300",
      }
    case "abandoned":
      return {
        label: "已放弃",
        className: "border-rose-500/20 bg-rose-500/10 text-rose-700 dark:text-rose-300",
      }
    case "archived":
      return {
        label: "已归档",
        className: "border-border bg-muted/70 text-muted-foreground",
      }
    default:
      return {
        label: "有计划",
        className: "border-primary/20 bg-primary/10 text-primary",
      }
    }
}

const listStatValueToneClass = {
  default: "text-foreground",
  chart2: "text-chart-2",
  chart3: "text-chart-3",
  destructive: "text-destructive",
} as const

function ListStatCard({
  label,
  value,
  icon: Icon,
  valueTone = "default",
}: {
  label: string
  value: number
  icon: typeof Users
  valueTone?: keyof typeof listStatValueToneClass
}) {
  return (
    <div className="rounded-lg border border-border bg-card px-4 py-3">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Icon className="h-4 w-4 shrink-0" />
        <p>{label}</p>
      </div>
      <p
        className={cn(
          "mt-1 text-xl font-semibold",
          listStatValueToneClass[valueTone],
        )}
      >
        {value}
      </p>
    </div>
  )
}

function ListRowActions({
  item,
  deletingUserId,
  onEdit,
  onSoftDelete,
}: {
  item: AdminUserListItem
  deletingUserId: string | null
  onEdit: (item: AdminUserListItem) => void
  onSoftDelete: (userId: string) => Promise<void>
}) {
  return (
    <div className="flex flex-wrap items-center justify-end gap-2">
      <Button type="button" variant="outline" size="sm" className="h-8 px-2.5" asChild>
        <Link href={`${ADMIN_ROUTES.users}/${item.userId}`}>详情</Link>
      </Button>
      <Button type="button" size="sm" className="h-8 px-2.5" onClick={() => onEdit(item)}>
        编辑
      </Button>
      <Button
        type="button"
        variant="destructiveSoft"
        size="sm"
        className="h-8 px-2.5"
        disabled={Boolean(item.deletedAt) || deletingUserId === item.userId}
        onClick={() => void onSoftDelete(item.userId)}
      >
        {item.deletedAt ? "已删除" : deletingUserId === item.userId ? "处理中…" : "删除"}
      </Button>
    </div>
  )
}

export function UserList() {
  const confirm = useAppConfirm()
  const toast = useAppToast()
  const [data, setData] = useState<AdminUserListResponseData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [accountStatus, setAccountStatus] = useState<string>("active")
  const [pathFilter, setPathFilter] = useState<string>("all")
  const [keyword, setKeyword] = useState("")
  const [keywordApplied, setKeywordApplied] = useState("")
  const [limit, setLimit] = useState("20")
  const [page, setPage] = useState(1)
  const [exporting, setExporting] = useState(false)
  const [authExpired, setAuthExpired] = useState(false)
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null)
  const [editingUser, setEditingUser] = useState<AdminUserListItem | null>(null)
  const [editSheetOpen, setEditSheetOpen] = useState(false)

  useAdminSessionExpiryRedirect(authExpired)

  const listItems = data?.items ?? []
  const stats = data?.stats ?? {
    totalUsers: 0,
    activePlanUsers: 0,
    streakingUsers: 0,
    deletedUsers: 0,
  }
  const total = data?.total ?? 0
  const pageSize = Number.parseInt(limit, 10) || 20
  const totalPages = Math.max(1, Math.ceil(total / pageSize) || 1)

  const fetchList = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams()
      if (accountStatus !== "active") {
        params.append("accountStatus", accountStatus)
      }
      if (pathFilter === "true") {
        params.append("hasActiveLearningPath", "true")
      } else if (pathFilter === "false") {
        params.append("hasActiveLearningPath", "false")
      }
      if (keywordApplied) {
        params.append("keyword", keywordApplied)
      }
      params.append("limit", limit)
      params.append("page", String(page))
      const result = await adminRequestData<AdminUserListResponseData>(
        `/admin/users?${params.toString()}`,
        { method: "GET" },
        "获取用户列表失败",
      )
      setData(result)
    } catch (fetchError) {
      setAuthExpired(isAdminSessionExpiredError(fetchError))
      setError(getAdminApiErrorMessage(fetchError, "网络请求失败"))
    } finally {
      setIsLoading(false)
    }
  }, [accountStatus, keywordApplied, limit, page, pathFilter])

  useEffect(() => {
    void fetchList()
  }, [fetchList])

  const handleExport = async () => {
    setExporting(true)
    try {
      const params = new URLSearchParams()
      if (accountStatus !== "active") {
        params.append("accountStatus", accountStatus)
      }
      if (pathFilter === "true") {
        params.append("hasActiveLearningPath", "true")
      } else if (pathFilter === "false") {
        params.append("hasActiveLearningPath", "false")
      }
      if (keywordApplied) {
        params.append("keyword", keywordApplied)
      }
      const response = await adminBffFetch(
        `/admin/users/export?${params.toString()}`,
        { method: "GET" },
        "导出失败",
      )
      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const link = document.createElement("a")
      const contentDisposition = response.headers.get("Content-Disposition")
      const match = contentDisposition?.match(/filename="([^"]+)"/)
      link.href = url
      link.download = match?.[1] ?? `admin-users-${Date.now()}.csv`
      link.click()
      URL.revokeObjectURL(url)
    } catch (exportError) {
      setAuthExpired(isAdminSessionExpiredError(exportError))
      toast.error(getAdminApiErrorMessage(exportError, "导出失败"))
    } finally {
      setExporting(false)
    }
  }

  const handleSoftDeleteUser = async (userId: string) => {
    const result = await confirm.prompt({
      title: "确认删除该用户？",
      description: "删除后该用户将无法继续使用主站功能。",
      confirmText: "确认删除",
      cancelText: "取消",
      destructive: true,
      input: {
        label: "删除原因（可选）",
        placeholder: "可填写本次删除原因，留空也可继续",
        defaultValue: "",
        multiline: true,
      },
    })

    if (!result.confirmed) {
      return
    }

    setDeletingUserId(userId)
    try {
      await adminRequestData<AdminUserDetailResponseData>(
        `/admin/users/${userId}/soft-delete`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ reason: result.value.trim() || null }),
        },
        "删除失败",
      )
      await fetchList()
      toast.success("用户已删除")
    } catch (softDeleteError) {
      setAuthExpired(isAdminSessionExpiredError(softDeleteError))
      toast.error(getAdminApiErrorMessage(softDeleteError, "删除失败"))
    } finally {
      setDeletingUserId(null)
    }
  }

  const applySearch = () => {
    setPage(1)
    setKeywordApplied(keyword.trim())
  }

  const canPrev = page > 1
  const canNext = page < totalPages

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages)
    }
  }, [page, totalPages])

  if (error) {
    return <StatePanel status="error" title="获取数据失败" description={error} />
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground">用户运营</h1>
          <p className="mt-1 text-sm text-muted-foreground">当前筛选共 {total} 人</p>
        </div>
        <Button
          type="button"
          variant="outline"
          onClick={() => void handleExport()}
          disabled={exporting}
          className="gap-2 self-start lg:self-auto"
        >
          <Download className="h-4 w-4" />
          {exporting ? "导出中…" : "导出 CSV"}
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <ListStatCard label="总用户数" value={stats.totalUsers} icon={Users} />
        <ListStatCard
          label="进行中计划"
          value={stats.activePlanUsers}
          icon={FolderKanban}
          valueTone="chart2"
        />
        <ListStatCard
          label="连续打卡"
          value={stats.streakingUsers}
          icon={Flame}
          valueTone="chart3"
        />
        <ListStatCard
          label="已删除"
          value={stats.deletedUsers}
          icon={ShieldAlert}
          valueTone="destructive"
        />
      </div>

      <div className="rounded-xl border border-border bg-card p-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-32 max-w-md">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              placeholder="搜索昵称、邮箱、手机号、用户 UUID"
              value={keyword}
              onChange={(event) => setKeyword(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  applySearch()
                }
              }}
              className="h-9 w-full rounded-md border border-border bg-background pl-8 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </div>
          <Button type="button" variant="secondary" size="sm" className="h-9" onClick={applySearch}>
            搜索
          </Button>
          <AdminSelect
            value={accountStatus}
            onValueChange={(next) => {
              setPage(1)
              setAccountStatus(next)
            }}
            options={[
              { value: "active", label: "未删除" },
              { value: "deleted", label: "已删除" },
              { value: "all", label: "全部账号" },
            ]}
            triggerClassName="min-w-[7.5rem]"
          />
          <AdminSelect
            value={pathFilter}
            onValueChange={(next) => {
              setPage(1)
              setPathFilter(next)
            }}
            options={[
              { value: "all", label: "全部计划状态" },
              { value: "true", label: "有进行中计划" },
              { value: "false", label: "无进行中计划" },
            ]}
            triggerClassName="min-w-[10rem]"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((item) => (
            <div key={item} className="h-20 animate-pulse rounded-xl border border-border bg-card" />
          ))}
        </div>
      ) : listItems.length > 0 ? (
        <div className="overflow-hidden rounded-xl border border-border bg-card">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1080px] table-fixed">
              <thead className="bg-muted/40">
                <tr className="border-b border-border">
                  <th className="w-[22%] px-4 py-3 text-left text-xs font-medium text-muted-foreground">
                    用户
                  </th>
                  <th className="w-[22%] px-4 py-3 text-left text-xs font-medium text-muted-foreground">
                    当前计划
                  </th>
                  <th className="w-[8%] px-4 py-3 text-left text-xs font-medium text-muted-foreground">
                    连续打卡
                  </th>
                  <th className="w-[12%] px-4 py-3 text-left text-xs font-medium text-muted-foreground">
                    任务完成率
                  </th>
                  <th className="w-[10%] px-4 py-3 text-left text-xs font-medium text-muted-foreground">
                    积分 / 段位
                  </th>
                  <th className="w-[15%] px-4 py-3 text-left text-xs font-medium text-muted-foreground">
                    最近学习
                  </th>
                  <th className="w-[20%] px-4 py-3 text-right text-xs font-medium text-muted-foreground">
                    操作
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {listItems.map((item) => {
                  const planStatusMeta = getPlanStatusMeta(item)
                  const completionPercent = getUserTaskCompletionPercent(item)

                  return (
                    <tr key={item.userId} className="transition-colors hover:bg-muted/20">
                      <td className="px-4 py-4 align-top">
                        <div className="flex min-w-0 items-start gap-3">
                          {item.avatarUrl ? (
                            <Image
                              src={item.avatarUrl}
                              alt=""
                              width={40}
                              height={40}
                              className="h-10 w-10 shrink-0 rounded-full object-cover"
                              unoptimized
                            />
                          ) : (
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/12 text-sm font-semibold text-primary">
                              {(item.nickname ?? "?").slice(0, 1)}
                            </div>
                          )}
                          <div className="min-w-0 flex-1 space-y-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="truncate text-sm font-medium text-foreground">
                                {item.nickname ?? "未命名用户"}
                              </p>
                              {item.deletedAt ? (
                                <Badge variant="danger" size="sm">
                                  已删除
                                </Badge>
                              ) : null}
                            </div>
                            <p className="truncate font-mono text-[11px] text-muted-foreground">
                              {item.authPhone || "暂无手机号"}
                            </p>
                            <p className="truncate text-xs text-muted-foreground">
                              {item.contactEmail || item.authEmail || item.authPhone || "暂无联系方式"}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4 align-top">
                        <div className="space-y-2">
                          <Badge size="sm" className={planStatusMeta.className}>
                            {planStatusMeta.label}
                          </Badge>
                          <div>
                            <p className="truncate text-sm font-medium text-foreground">
                              {item.activePathName ?? "暂无进行中计划"}
                            </p>
                            <p className="truncate text-xs text-muted-foreground">
                              {item.primaryToolName ?? "未设置工具"} · {formatAdminLearningLevelLabel(item.activePathLearningLevel)} · {formatAdminSelectionModeLabel(item.activePathSelectionMode)}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4 align-top">
                        <div className="flex items-center gap-2">
                          <Flame
                            className={`h-4 w-4 ${(item.streakDays ?? 0) > 0 ? "text-orange-500" : "text-muted-foreground/40"}`}
                          />
                          <div>
                            <p className="text-sm font-medium text-foreground">
                              {item.streakDays ?? 0}
                              <span className="ml-1 text-xs text-muted-foreground">天</span>
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4 align-top">
                        <div className="space-y-2">
                          <div className="h-2 overflow-hidden rounded-full bg-muted">
                            <div
                              className="h-full rounded-full bg-primary"
                              style={{ width: `${completionPercent}%` }}
                            />
                          </div>
                          <div className="flex items-center justify-between text-xs text-muted-foreground">
                            <span>{completionPercent}%</span>
                            <span>{item.activePathCompletedTaskCount} 已完成</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4 align-top">
                        <p className="text-sm font-semibold text-foreground">{item.currentScore ?? 0}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatAdminRankLabel(item.currentRankCode)}
                        </p>
                      </td>
                      <td className="px-4 py-4 align-top">
                        <p className="text-sm text-foreground">{formatDateTime(item.lastLearningAt)}</p>
                        <p className="text-xs text-muted-foreground">
                          资料更新 {formatDateTime(item.profileUpdatedAt)}
                        </p>
                      </td>
                      <td className="px-4 py-4 align-top text-right">
                        <ListRowActions
                          item={item}
                          deletingUserId={deletingUserId}
                          onEdit={(targetUser) => {
                            setEditingUser(targetUser)
                            setEditSheetOpen(true)
                          }}
                          onSoftDelete={handleSoftDeleteUser}
                        />
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <AdminListPaginationFooter
            limit={limit}
            onLimitChange={(value) => {
              setPage(1)
              setLimit(value)
            }}
            page={page}
            totalPages={totalPages}
            total={total}
            canPrev={canPrev}
            canNext={canNext}
            isLoading={isLoading}
            onPrevPage={() => setPage((currentPage) => Math.max(1, currentPage - 1))}
            onNextPage={() => setPage((currentPage) => currentPage + 1)}
            centerContent={<span>当前页显示 {listItems.length} 人</span>}
          />
        </div>
      ) : (
        <StatePanel status="empty" title="暂无用户" description="尝试调整筛选条件或关键词。" />
      )}

      <UserEditSheet
        user={editingUser}
        open={editSheetOpen}
        onOpenChange={(open) => {
          setEditSheetOpen(open)
          if (!open) {
            setEditingUser(null)
          }
        }}
        onSaved={async () => {
          await fetchList()
        }}
        onAuthExpired={() => setAuthExpired(true)}
      />
    </div>
  )
}
