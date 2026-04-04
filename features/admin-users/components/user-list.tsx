"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Image from "next/image"
import Link from "next/link"
import {
  Download,
  Flame,
  FolderKanban,
  Search,
  ShieldAlert,
  UserCheck,
  Users,
} from "lucide-react"
import type {
  AdminUserDetailResponseData,
  AdminUserListItem,
  AdminUserListResponseData,
} from "@/lib/api/contracts/admin-users"
import { StatePanel } from "@/components/ui/state-panel"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { AdminListPaginationFooter } from "@/features/admin-shell/components/admin-list-pagination-footer"
import { useAdminSessionExpiryRedirect } from "@/features/admin-shell/lib/use-admin-session-expiry-redirect"
import {
  adminBffFetch,
  adminRequestData,
  getAdminApiErrorMessage,
  isAdminSessionExpiredError,
} from "@/lib/api/admin-bff-client"
import { ADMIN_ROUTES } from "@/constants/routes"
import { buildUserListStats, getUserTaskCompletionPercent } from "../lib/view-model"

function shortUserId(id: string) {
  return `${id.replace(/-/g, "").slice(0, 8)}…`
}

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

function getOnboardingMeta(onboardingCompleted: boolean | null) {
  if (onboardingCompleted) {
    return {
      label: "已完成",
      className: "border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
    }
  }

  return {
    label: "未完成",
    className: "border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-300",
  }
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

function ListStatCard({
  label,
  value,
  hint,
  icon: Icon,
}: {
  label: string
  value: number
  hint: string
  icon: typeof Users
}) {
  return (
    <div className="rounded-xl border border-border bg-card px-4 py-3">
      <div className="flex items-center gap-2 text-muted-foreground">
        <Icon className="h-4 w-4" />
        <p className="text-xs">{label}</p>
      </div>
      <p className="mt-3 text-2xl font-semibold tracking-tight text-foreground">{value}</p>
      <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
    </div>
  )
}

function ListRowActions({
  item,
  deletingUserId,
  onSoftDelete,
}: {
  item: AdminUserListItem
  deletingUserId: string | null
  onSoftDelete: (userId: string) => Promise<void>
}) {
  const feedbackHref = `${ADMIN_ROUTES.feedback}?userId=${encodeURIComponent(item.userId)}`

  return (
    <div className="flex flex-wrap items-center justify-end gap-2">
      <Button type="button" variant="outline" size="sm" className="h-8 px-2.5" asChild>
        <Link href={`${ADMIN_ROUTES.users}/${item.userId}`}>详情</Link>
      </Button>
      <Button type="button" variant="ghost" size="sm" className="h-8 px-2.5" asChild>
        <Link href={feedbackHref}>工单</Link>
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="h-8 px-2.5 text-destructive hover:bg-destructive/10 hover:text-destructive"
        disabled={Boolean(item.deletedAt) || deletingUserId === item.userId}
        onClick={() => void onSoftDelete(item.userId)}
      >
        {item.deletedAt ? "已软删" : deletingUserId === item.userId ? "处理中…" : "软删"}
      </Button>
    </div>
  )
}

export function UserList() {
  const [data, setData] = useState<AdminUserListResponseData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [accountStatus, setAccountStatus] = useState<string>("active")
  const [onboardingFilter, setOnboardingFilter] = useState<string>("all")
  const [pathFilter, setPathFilter] = useState<string>("all")
  const [keyword, setKeyword] = useState("")
  const [keywordApplied, setKeywordApplied] = useState("")
  const [limit, setLimit] = useState("20")
  const [page, setPage] = useState(1)
  const [exporting, setExporting] = useState(false)
  const [authExpired, setAuthExpired] = useState(false)
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null)

  useAdminSessionExpiryRedirect(authExpired)

  const listItems = data?.items ?? []
  const total = data?.total ?? 0
  const pageSize = Number.parseInt(limit, 10) || 20
  const totalPages = Math.max(1, Math.ceil(total / pageSize) || 1)
  const listStats = useMemo(() => buildUserListStats(data?.items ?? [], total), [data?.items, total])

  const fetchList = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams()
      if (accountStatus !== "active") {
        params.append("accountStatus", accountStatus)
      }
      if (onboardingFilter === "true") {
        params.append("onboardingCompleted", "true")
      } else if (onboardingFilter === "false") {
        params.append("onboardingCompleted", "false")
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
  }, [accountStatus, keywordApplied, limit, onboardingFilter, page, pathFilter])

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
      if (onboardingFilter === "true") {
        params.append("onboardingCompleted", "true")
      } else if (onboardingFilter === "false") {
        params.append("onboardingCompleted", "false")
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
      window.alert(getAdminApiErrorMessage(exportError, "导出失败"))
    } finally {
      setExporting(false)
    }
  }

  const handleSoftDeleteUser = async (userId: string) => {
    const reason = window.prompt("软删除原因（可选）")
    if (reason === null) {
      return
    }
    if (!window.confirm("确认软删除该用户？其将无法再使用主站功能。")) {
      return
    }
    setDeletingUserId(userId)
    try {
      await adminRequestData<AdminUserDetailResponseData>(
        `/admin/users/${userId}/soft-delete`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ reason: reason.trim() || null }),
        },
        "软删除失败",
      )
      await fetchList()
    } catch (softDeleteError) {
      setAuthExpired(isAdminSessionExpiredError(softDeleteError))
      window.alert(getAdminApiErrorMessage(softDeleteError, "软删除失败"))
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
          <p className="mt-1 text-sm text-muted-foreground">
            当前筛选共 {total} 人。列表聚焦引导状态、学习计划活跃度与最近学习表现。
          </p>
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

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <ListStatCard
          label="当前筛选用户"
          value={listStats.totalMatchingUsers}
          hint="符合当前搜索与筛选条件"
          icon={Users}
        />
        <ListStatCard
          label="本页样本"
          value={listStats.visibleUsers}
          hint="当前分页实际载入人数"
          icon={ShieldAlert}
        />
        <ListStatCard
          label="本页已完成引导"
          value={listStats.onboardingCompletedUsers}
          hint="可直接进入学习主链路"
          icon={UserCheck}
        />
        <ListStatCard
          label="本页有进行中计划"
          value={listStats.activePlanUsers}
          hint="已有 active path 的用户"
          icon={FolderKanban}
        />
        <ListStatCard
          label="本页连续打卡"
          value={listStats.streakingUsers}
          hint={`已软删 ${listStats.deletedUsers} 人`}
          icon={Flame}
        />
      </div>

      <div className="rounded-xl border border-border bg-card p-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-56 flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
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
              className="pl-9"
            />
          </div>
          <Button type="button" variant="secondary" size="sm" className="h-9" onClick={applySearch}>
            搜索
          </Button>
          <select
            value={accountStatus}
            onChange={(event) => {
              setPage(1)
              setAccountStatus(event.target.value)
            }}
            className="h-9 rounded-md border border-border bg-background px-3 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring/40"
          >
            <option value="active">未软删</option>
            <option value="deleted">已软删</option>
            <option value="all">全部账号</option>
          </select>
          <select
            value={onboardingFilter}
            onChange={(event) => {
              setPage(1)
              setOnboardingFilter(event.target.value)
            }}
            className="h-9 rounded-md border border-border bg-background px-3 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring/40"
          >
            <option value="all">全部引导状态</option>
            <option value="true">已完成引导</option>
            <option value="false">未完成引导</option>
          </select>
          <select
            value={pathFilter}
            onChange={(event) => {
              setPage(1)
              setPathFilter(event.target.value)
            }}
            className="h-9 rounded-md border border-border bg-background px-3 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring/40"
          >
            <option value="all">全部计划状态</option>
            <option value="true">有进行中计划</option>
            <option value="false">无进行中计划</option>
          </select>
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
                  <th className="w-[26%] px-4 py-3 text-left text-xs font-medium text-muted-foreground">
                    用户
                  </th>
                  <th className="w-[10%] px-4 py-3 text-left text-xs font-medium text-muted-foreground">
                    引导
                  </th>
                  <th className="w-[20%] px-4 py-3 text-left text-xs font-medium text-muted-foreground">
                    当前计划
                  </th>
                  <th className="w-[9%] px-4 py-3 text-left text-xs font-medium text-muted-foreground">
                    连续打卡
                  </th>
                  <th className="w-[13%] px-4 py-3 text-left text-xs font-medium text-muted-foreground">
                    任务完成率
                  </th>
                  <th className="w-[11%] px-4 py-3 text-left text-xs font-medium text-muted-foreground">
                    积分 / 段位
                  </th>
                  <th className="w-[11%] px-4 py-3 text-left text-xs font-medium text-muted-foreground">
                    最近学习
                  </th>
                  <th className="w-[20%] px-4 py-3 text-right text-xs font-medium text-muted-foreground">
                    操作
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {listItems.map((item) => {
                  const onboardingMeta = getOnboardingMeta(item.onboardingCompleted)
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
                                <span className="rounded-full border border-destructive/20 bg-destructive/10 px-2 py-0.5 text-[10px] font-medium text-destructive">
                                  已软删
                                </span>
                              ) : null}
                            </div>
                            <p className="truncate font-mono text-[11px] text-muted-foreground">
                              {shortUserId(item.userId)}
                            </p>
                            <p className="truncate text-xs text-muted-foreground">
                              {item.contactEmail || item.authEmail || item.authPhone || "暂无联系方式"}
                            </p>
                            <p className="truncate text-xs text-muted-foreground">
                              主工具：{item.primaryToolName ?? "未设置"}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4 align-top">
                        <span
                          className={`inline-flex rounded-full border px-2 py-1 text-[11px] font-medium ${onboardingMeta.className}`}
                        >
                          {onboardingMeta.label}
                        </span>
                      </td>
                      <td className="px-4 py-4 align-top">
                        <div className="space-y-2">
                          <span
                            className={`inline-flex rounded-full border px-2 py-1 text-[11px] font-medium ${planStatusMeta.className}`}
                          >
                            {planStatusMeta.label}
                          </span>
                          <div>
                            <p className="truncate text-sm font-medium text-foreground">
                              {item.activePathName ?? "暂无进行中计划"}
                            </p>
                            <p className="truncate text-xs text-muted-foreground">
                              {item.activePathLearningLevel ?? "未标注等级"}
                              {item.activePathSelectionMode ? ` · ${item.activePathSelectionMode}` : ""}
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
                            <p className="text-sm font-medium text-foreground">{item.streakDays ?? 0}</p>
                            <p className="text-[11px] text-muted-foreground">连续天数</p>
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
                        <p className="text-xs text-muted-foreground">{item.currentRankCode ?? "未定级"}</p>
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
            centerContent={<span>本页显示 {listStats.visibleUsers} 人</span>}
          />
        </div>
      ) : (
        <StatePanel status="empty" title="暂无用户" description="尝试调整筛选条件或关键词。" />
      )}
    </div>
  )
}
