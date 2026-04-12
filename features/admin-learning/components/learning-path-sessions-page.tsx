"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { ArrowLeft, MessageSquareText, RefreshCw } from "lucide-react"
import type {
  AdminLearningPathSessionDetailResponseData,
  AdminLearningPathSessionListResponseData,
} from "@/lib/api/contracts/admin-learning"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { StatePanel } from "@/components/ui/state-panel"
import { ADMIN_ROUTES } from "@/constants/routes"
import { AdminListPaginationFooter } from "@/features/admin-shell/components/admin-list-pagination-footer"
import { useAdminSessionExpiryRedirect } from "@/features/admin-shell/lib/use-admin-session-expiry-redirect"
import {
  adminRequestData,
  getAdminApiErrorMessage,
  isAdminSessionExpiredError,
} from "@/lib/api/admin-bff-client"
import { cn } from "@/lib/utils"
import {
  formatAdminLearningDateTime,
  formatAdminLearningTokenCount,
  getAdminLearningSessionStatusMeta,
} from "../lib/view-model"

type LearningPathSessionsPageProps = {
  pathId: string
  initialSessionId?: string
}

function SessionStat({
  label,
  value,
}: {
  label: string
  value: string
}) {
  return (
    <div className="rounded-xl border border-border bg-background/70 px-3 py-3">
      <p className="text-[11px] text-muted-foreground">{label}</p>
      <p className="mt-1 text-sm font-medium text-foreground">{value}</p>
    </div>
  )
}

export function LearningPathSessionsPage({
  pathId,
  initialSessionId,
}: LearningPathSessionsPageProps) {
  const router = useRouter()
  const pathname = usePathname()
  const [listData, setListData] = useState<AdminLearningPathSessionListResponseData | null>(null)
  const [detailData, setDetailData] = useState<AdminLearningPathSessionDetailResponseData | null>(null)
  const [listLoading, setListLoading] = useState(true)
  const [detailLoading, setDetailLoading] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [listError, setListError] = useState<string | null>(null)
  const [detailError, setDetailError] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState("20")
  const [selectedSessionId, setSelectedSessionId] = useState(initialSessionId ?? "")
  const [authExpired, setAuthExpired] = useState(false)

  useAdminSessionExpiryRedirect(authExpired)

  const totalPages = Math.max(1, Math.ceil((listData?.total ?? 0) / (Number.parseInt(limit, 10) || 20)) || 1)

  const syncSelectedSession = useCallback((sessionId: string) => {
    setSelectedSessionId(sessionId)
    const params = new URLSearchParams()
    params.set("sessionId", sessionId)
    router.replace(`${pathname}?${params.toString()}`, { scroll: false })
  }, [pathname, router])

  const fetchList = useCallback(async () => {
    setListLoading(true)
    setListError(null)
    try {
      const result = await adminRequestData<AdminLearningPathSessionListResponseData>(
        `/admin/learning-paths/${pathId}/sessions?page=${page}&limit=${limit}`,
        { method: "GET" },
        "获取会话列表失败",
      )
      setListData(result)
      const targetSessionId =
        (selectedSessionId && result.items.some((item) => item.sessionId === selectedSessionId) ? selectedSessionId : "")
        || (initialSessionId && result.items.some((item) => item.sessionId === initialSessionId) ? initialSessionId : "")
        || result.items[0]?.sessionId
        || ""

      if (targetSessionId && targetSessionId !== selectedSessionId) {
        syncSelectedSession(targetSessionId)
      } else if (!targetSessionId && selectedSessionId) {
        setSelectedSessionId("")
        setDetailData(null)
        router.replace(pathname, { scroll: false })
      }

      return { result, targetSessionId }
    } catch (fetchError) {
      setAuthExpired(isAdminSessionExpiredError(fetchError))
      setListError(getAdminApiErrorMessage(fetchError, "获取会话列表失败"))
    } finally {
      setListLoading(false)
    }
    return null
  }, [initialSessionId, limit, page, pathId, pathname, router, selectedSessionId, syncSelectedSession])

  const fetchDetail = useCallback(async (sessionId: string) => {
    if (!sessionId) {
      setDetailData(null)
      return
    }

    setDetailLoading(true)
    setDetailError(null)
    try {
      const result = await adminRequestData<AdminLearningPathSessionDetailResponseData>(
        `/admin/learning-paths/${pathId}/sessions/${sessionId}`,
        { method: "GET" },
        "获取会话详情失败",
      )
      setDetailData(result)
    } catch (fetchError) {
      setAuthExpired(isAdminSessionExpiredError(fetchError))
      setDetailError(getAdminApiErrorMessage(fetchError, "获取会话详情失败"))
    } finally {
      setDetailLoading(false)
    }
  }, [pathId])

  useEffect(() => {
    void fetchList()
  }, [fetchList])

  useEffect(() => {
    if (selectedSessionId) {
      void fetchDetail(selectedSessionId)
    }
  }, [fetchDetail, selectedSessionId])

  const handleRefresh = async () => {
    setIsRefreshing(true)
    try {
      const refreshed = await fetchList()
      const targetSessionId = refreshed?.targetSessionId ?? selectedSessionId
      if (targetSessionId) {
        await fetchDetail(targetSessionId)
      }
    } finally {
      setIsRefreshing(false)
    }
  }

  const backLink = (
    <Link
      href={`${ADMIN_ROUTES.learning}/${pathId}`}
      className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
    >
      <ArrowLeft className="h-4 w-4" />
      返回学习路径详情
    </Link>
  )

  const selectedSession = useMemo(
    () => listData?.items.find((item) => item.sessionId === selectedSessionId) ?? null,
    [listData?.items, selectedSessionId],
  )

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {backLink}
        <Button type="button" variant="outline" size="sm" className="gap-1.5" onClick={() => void handleRefresh()} disabled={isRefreshing}>
          <RefreshCw className={cn("h-4 w-4", isRefreshing && "animate-spin")} />
          刷新
        </Button>
      </div>

      <section className="rounded-2xl border border-border bg-card p-5">
        <div className="flex flex-col gap-2 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">全部会话</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              左侧浏览该学习路径的历史会话，右侧查看完整消息与 token 消耗。
            </p>
          </div>
          {selectedSession ? (
            <Badge className={getAdminLearningSessionStatusMeta(selectedSession.status).className}>
              当前选中：{getAdminLearningSessionStatusMeta(selectedSession.status).label}
            </Badge>
          ) : null}
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
        <section className="rounded-2xl border border-border bg-card p-4">
          <div className="flex items-center gap-2">
            <MessageSquareText className="h-4 w-4 text-muted-foreground" />
            <h2 className="text-lg font-semibold text-foreground">会话列表</h2>
          </div>

          <div className="mt-4 space-y-3">
            {listError && !listData ? (
              <StatePanel status="error" title="获取会话列表失败" description={listError} actionLabel="重试" onAction={() => void fetchList()} compact />
            ) : listLoading && !listData ? (
              [1, 2, 3].map((item) => (
                <div key={item} className="h-32 animate-pulse rounded-xl border border-border bg-muted/40" />
              ))
            ) : listData?.items.length ? (
              listData.items.map((session) => {
                const statusMeta = getAdminLearningSessionStatusMeta(session.status)
                return (
                  <button
                    key={session.sessionId}
                    type="button"
                    onClick={() => syncSelectedSession(session.sessionId)}
                    className={cn(
                      "w-full rounded-xl border px-4 py-4 text-left transition-colors",
                      session.sessionId === selectedSessionId
                        ? "border-primary/30 bg-primary/8"
                        : "border-border bg-background/70 hover:bg-muted/30",
                    )}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-mono text-[11px] text-muted-foreground">{session.sessionId}</p>
                      <Badge className={statusMeta.className}>{statusMeta.label}</Badge>
                    </div>
                    <div className="mt-3 space-y-2">
                      <p className="text-sm text-foreground">
                        <span className="text-muted-foreground">用户：</span>
                        {session.latestUserSummary || "暂无用户消息"}
                      </p>
                      <p className="text-sm text-foreground">
                        <span className="text-muted-foreground">AI：</span>
                        {session.latestAssistantSummary || "暂无 AI 消息"}
                      </p>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted-foreground">
                      <span>消息 {session.messageCount}</span>
                      <span>总 Tokens {formatAdminLearningTokenCount(session.tokenUsage?.totalTokens)}</span>
                      <span>{formatAdminLearningDateTime(session.lastMessageAt ?? session.startedAt)}</span>
                    </div>
                  </button>
                )
              })
            ) : (
              <StatePanel status="empty" title="暂无会话" description="该学习路径还没有沉淀会话记录。" compact />
            )}
          </div>

          <div className="mt-4">
            <AdminListPaginationFooter
              limit={limit}
              onLimitChange={(value) => {
                setLimit(value)
                setPage(1)
              }}
              page={page}
              totalPages={totalPages}
              total={listData?.total ?? 0}
              canPrev={page > 1}
              canNext={page < totalPages}
              isLoading={listLoading}
              onPrevPage={() => setPage((prev) => Math.max(1, prev - 1))}
              onNextPage={() => setPage((prev) => Math.min(totalPages, prev + 1))}
              centerContent={<span>当前页 {listData?.items.length ?? 0} 条</span>}
            />
          </div>
        </section>

        <section className="rounded-2xl border border-border bg-card p-5">
          {!selectedSessionId ? (
            <StatePanel status="empty" title="请选择会话" description="从左侧列表选择一条会话后，在这里查看完整消息。" compact />
          ) : detailError && !detailData ? (
            <StatePanel status="error" title="获取会话详情失败" description={detailError} actionLabel="重试" onAction={() => void fetchDetail(selectedSessionId)} compact />
          ) : detailLoading && !detailData ? (
            <div className="space-y-4">
              <div className="h-28 animate-pulse rounded-xl border border-border bg-muted/40" />
              <div className="h-96 animate-pulse rounded-xl border border-border bg-muted/40" />
            </div>
          ) : detailData ? (
            <div className="space-y-5">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-lg font-semibold text-foreground">会话详情</h2>
                    <Badge className={getAdminLearningSessionStatusMeta(detailData.session.status).className}>
                      {getAdminLearningSessionStatusMeta(detailData.session.status).label}
                    </Badge>
                  </div>
                  <p className="mt-2 font-mono text-xs text-muted-foreground">{detailData.session.sessionId}</p>
                </div>
                <div className="grid grid-cols-2 gap-2 lg:min-w-[320px]">
                  <SessionStat label="消息数" value={String(detailData.session.messageCount)} />
                  <SessionStat label="总 Tokens" value={formatAdminLearningTokenCount(detailData.session.tokenUsage?.totalTokens)} />
                  <SessionStat label="Prompt Tokens" value={formatAdminLearningTokenCount(detailData.session.tokenUsage?.promptTokens)} />
                  <SessionStat label="Completion Tokens" value={formatAdminLearningTokenCount(detailData.session.tokenUsage?.completionTokens)} />
                </div>
              </div>

              <div className="grid gap-2 md:grid-cols-2">
                <SessionStat label="开始时间" value={formatAdminLearningDateTime(detailData.session.startedAt)} />
                <SessionStat label="最后消息" value={formatAdminLearningDateTime(detailData.session.lastMessageAt)} />
              </div>

              <div className="space-y-3">
                {detailData.messages.map((message) => (
                  <div
                    key={message.messageId}
                    className={cn(
                      "rounded-2xl border px-4 py-4",
                      message.role === "user"
                        ? "border-border bg-background/70"
                        : "border-primary/20 bg-primary/8",
                    )}
                  >
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex items-center gap-2">
                        <Badge variant={message.role === "user" ? "outline" : "primary"} size="md">
                          {message.role === "user" ? "用户" : "AI"}
                        </Badge>
                        <span className="text-xs text-muted-foreground">#{message.sequenceNo}</span>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                        {message.tokenUsage ? <span>总 Tokens {formatAdminLearningTokenCount(message.tokenUsage.totalTokens)}</span> : null}
                        <span>{formatAdminLearningDateTime(message.createdAt)}</span>
                      </div>
                    </div>
                    <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-foreground">
                      {message.contentText || "暂无文本内容"}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </section>
      </div>
    </div>
  )
}
