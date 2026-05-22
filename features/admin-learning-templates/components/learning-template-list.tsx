"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import {
  Bot,
  FilePlus2,
  Pencil,
  RefreshCw,
  Sparkles,
  Workflow,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { SearchInput } from "@/components/ui/search-input"
import { StatePanel } from "@/components/ui/state-panel"
import { AdminListPaginationFooter } from "@/features/admin-shell/components/admin-list-pagination-footer"
import { AdminSelect } from "@/features/admin-shell/components/admin-select"
import { AdminTag } from "@/features/admin-shell/components/admin-tag"
import { useAdminSessionExpiryRedirect } from "@/features/admin-shell/lib/use-admin-session-expiry-redirect"
import {
  adminRequestData,
  getAdminApiErrorMessage,
  isAdminSessionExpiredError,
} from "@/lib/api/admin-bff-client"
import type {
  AdminLearningTemplateListResponseData,
  AdminLearningTemplateSyncResponseData,
} from "@/lib/api/contracts/admin-learning-templates"
import { ADMIN_ROUTES } from "@/constants/routes"
import { formatTemplateDateTime, learningTemplateLevelOptions } from "../lib/view-model"

export function LearningTemplateList() {
  const [data, setData] = useState<AdminLearningTemplateListResponseData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [status, setStatus] = useState("all")
  const [toolCode, setToolCode] = useState("all")
  const [learningLevel, setLearningLevel] = useState("all")
  const [keyword, setKeyword] = useState("")
  const [keywordApplied, setKeywordApplied] = useState("")
  const [limit, setLimit] = useState("20")
  const [page, setPage] = useState(1)
  const [authExpired, setAuthExpired] = useState(false)
  const [syncingId, setSyncingId] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  useAdminSessionExpiryRedirect(authExpired)

  const listItems = data?.items ?? []
  const total = data?.total ?? 0
  const pageSize = Number.parseInt(limit, 10) || 20
  const totalPages = Math.max(1, Math.ceil(total / pageSize) || 1)

  const fetchList = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams()
      params.set("status", status)
      params.set("limit", limit)
      params.set("page", String(page))
      if (toolCode !== "all") {
        params.set("toolCode", toolCode)
      }
      if (learningLevel !== "all") {
        params.set("learningLevel", learningLevel)
      }
      if (keywordApplied) {
        params.set("keyword", keywordApplied)
      }
      const result = await adminRequestData<AdminLearningTemplateListResponseData>(
        `/admin/learning/templates?${params.toString()}`,
        { method: "GET" },
        "获取学习路径模板失败",
      )
      setData(result)
    } catch (fetchError) {
      setAuthExpired(isAdminSessionExpiredError(fetchError))
      setError(getAdminApiErrorMessage(fetchError, "网络请求失败"))
    } finally {
      setIsLoading(false)
    }
  }, [keywordApplied, learningLevel, limit, page, status, toolCode])

  useEffect(() => {
    void fetchList()
  }, [fetchList])

  const syncTemplate = async (templateId: string) => {
    setSyncingId(templateId)
    setNotice(null)
    setError(null)
    try {
      const result = await adminRequestData<AdminLearningTemplateSyncResponseData>(
        `/admin/learning/templates/${templateId}/sync-unstarted`,
        { method: "POST" },
        "同步未开始路径失败",
      )
      setNotice(`已同步 ${result.syncedPathCount} 条，跳过 ${result.skippedPathCount} 条。`)
      await fetchList()
    } catch (syncError) {
      setAuthExpired(isAdminSessionExpiredError(syncError))
      setError(getAdminApiErrorMessage(syncError, "同步未开始路径失败"))
    } finally {
      setSyncingId(null)
    }
  }

  if (error && !data) {
    return (
      <StatePanel
        status="error"
        title="获取模板失败"
        description={error}
        actionLabel="重试"
        onAction={() => void fetchList()}
      />
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">学习路径模板</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            管理自学模式初始化模板；保存后影响新完成 onboarding 的用户。
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" variant="outline" className="gap-1.5" asChild>
            <Link href={`${ADMIN_ROUTES.learningTemplates}/new`}>
              <FilePlus2 className="h-4 w-4" />
              新建模板
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <div className="rounded-lg border border-border bg-card px-4 py-3">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Workflow className="h-4 w-4" />
            模板总数
          </div>
          <p className="mt-1 text-xl font-semibold text-foreground">{total}</p>
        </div>
        <div className="rounded-lg border border-border bg-card px-4 py-3">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Sparkles className="h-4 w-4" />
            启用模板
          </div>
          <p className="mt-1 text-xl font-semibold text-chart-2">
            {listItems.filter((item) => item.isActive).length}
          </p>
        </div>
        <div className="rounded-lg border border-border bg-card px-4 py-3">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <RefreshCw className="h-4 w-4" />
            可同步路径
          </div>
          <p className="mt-1 text-xl font-semibold text-primary">
            {listItems.reduce((sum, item) => sum + item.syncablePathCount, 0)}
          </p>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card">
        <div className="border-b border-border px-4 py-4">
          <div className="flex flex-col gap-3 md:flex-row">
            <SearchInput
              value={keyword}
              onChange={(event) => setKeyword(event.target.value)}
              placeholder="关键词：模板名称 / code"
            />
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="h-9"
              onClick={() => {
                setPage(1)
                setKeywordApplied(keyword.trim())
              }}
            >
              搜索
            </Button>
            <AdminSelect
              value={status}
              onValueChange={(next) => {
                setPage(1)
                setStatus(next)
              }}
              options={[
                { value: "all", label: "全部状态" },
                { value: "active", label: "启用" },
                { value: "inactive", label: "停用" },
              ]}
              triggerClassName="min-w-[7rem]"
            />
            <AdminSelect
              value={toolCode}
              onValueChange={(next) => {
                setPage(1)
                setToolCode(next)
              }}
              options={[
                { value: "all", label: "全部工具" },
                ...(data?.toolOptions ?? []).map((item) => ({ value: item.code, label: item.name })),
              ]}
              triggerClassName="min-w-[7rem]"
            />
            <AdminSelect
              value={learningLevel}
              onValueChange={(next) => {
                setPage(1)
                setLearningLevel(next)
              }}
              options={[{ value: "all", label: "全部等级" }, ...learningTemplateLevelOptions]}
              triggerClassName="min-w-[7rem]"
            />
          </div>
          {notice ? <p className="mt-3 text-sm text-chart-2">{notice}</p> : null}
          {error ? <p className="mt-3 text-sm text-destructive">{error}</p> : null}
        </div>

        {isLoading && !data ? (
          <div className="space-y-3 p-4">
            {[1, 2, 3].map((item) => (
              <div key={item} className="h-24 animate-pulse rounded-xl border border-border bg-muted/40" />
            ))}
          </div>
        ) : listItems.length === 0 ? (
          <div className="p-4">
            <StatePanel status="empty" title="暂无模板" description="可以新建模板或调整筛选条件。" />
          </div>
        ) : (
          <>
            <div className="space-y-3 p-4">
              {listItems.map((item) => (
                <div key={item.templateId} className="rounded-2xl border border-border bg-background/70 p-4">
                  <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <AdminTag category="enabled" value={item.isActive} />
                        <AdminTag category="tone" value="neutral">{item.toolName}</AdminTag>
                        <AdminTag category="tone" value="neutral">{item.learningLevelLabel}</AdminTag>
                        <AdminTag category="tone" value="info">{item.stageCount} 步</AdminTag>
                      </div>
                      <div className="mt-3 min-w-0">
                        <Link
                          href={`${ADMIN_ROUTES.learningTemplates}/${item.templateId}`}
                          className="truncate text-base font-semibold text-foreground hover:text-primary"
                        >
                          {item.name}
                        </Link>
                        <p className="mt-1 font-mono text-xs text-muted-foreground">{item.code}</p>
                        <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">
                          {item.description || "暂无模板简介"}
                        </p>
                      </div>
                    </div>
                    <div className="flex shrink-0 flex-wrap items-center gap-2 xl:justify-end">
                      <div className="min-w-28 text-xs text-muted-foreground xl:text-right">
                        <p>更新于 {formatTemplateDateTime(item.updatedAt)}</p>
                        <p className="mt-1">可同步 {item.syncablePathCount} 条</p>
                      </div>
                      <Button type="button" variant="outline" size="sm" asChild>
                        <Link href={`${ADMIN_ROUTES.learningTemplates}/${item.templateId}`}>
                          <Pencil className="h-4 w-4" />
                          编辑
                        </Link>
                      </Button>
                      <Button type="button" variant="secondary" size="sm" asChild>
                        <Link href={`${ADMIN_ROUTES.learningTemplates}/${item.templateId}?generate=1`}>
                          <Bot className="h-4 w-4" />
                          AI 生成
                        </Link>
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={syncingId === item.templateId}
                        onClick={() => void syncTemplate(item.templateId)}
                      >
                        <RefreshCw className="h-4 w-4" />
                        {syncingId === item.templateId ? "同步中" : "同步未开始"}
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <AdminListPaginationFooter
              limit={limit}
              onLimitChange={(value) => {
                setLimit(value)
                setPage(1)
              }}
              page={page}
              totalPages={totalPages}
              total={total}
              canPrev={page > 1}
              canNext={page < totalPages}
              isLoading={isLoading}
              onPrevPage={() => setPage((prev) => Math.max(1, prev - 1))}
              onNextPage={() => setPage((prev) => Math.min(totalPages, prev + 1))}
            />
          </>
        )}
      </div>
    </div>
  )
}
