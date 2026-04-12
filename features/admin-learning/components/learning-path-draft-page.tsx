"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { ArrowLeft, ExternalLink, RefreshCw } from "lucide-react"
import type {
  AdminLearningMaterialPlanQualityReport,
  AdminLearningMaterialPlanSnapshot,
} from "@/lib/api/contracts/admin-learning"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { StatePanel } from "@/components/ui/state-panel"
import { useAppToast } from "@/components/app-feedback/app-toast-provider"
import { ADMIN_ROUTES } from "@/constants/routes"
import { useAdminSessionExpiryRedirect } from "@/features/admin-shell/lib/use-admin-session-expiry-redirect"
import {
  adminRequestData,
  getAdminApiErrorMessage,
  isAdminSessionExpiredError,
} from "@/lib/api/admin-bff-client"
import { cn } from "@/lib/utils"
import {
  formatAdminLearningDateTime,
  getAdminLearningDraftStatusLabel,
  getAdminLearningExtractionStageMeta,
  getAdminLearningMaterialSourceTypeLabel,
} from "../lib/view-model"

type LearningPathDraftPageProps = {
  pathId: string
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2.5">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="max-w-[65%] text-right text-sm text-foreground">{value}</dd>
    </div>
  )
}

function getMaterialPlanQualityStatusMeta(status: string) {
  switch (status) {
    case "passed":
      return { label: "已通过", variant: "success" as const }
    case "pilot_fallback":
      return { label: "试点降级", variant: "warning" as const }
    default:
      return { label: status || "未知", variant: "neutral" as const }
  }
}

function getMaterialPlanSelfCheckMeta(
  selfCheck: AdminLearningMaterialPlanQualityReport["selfCheck"],
) {
  switch (selfCheck.decision) {
    case "pass":
      return {
        label: "模型通过",
        variant: "success" as const,
        description: selfCheck.reason ?? "模型复核通过。",
      }
    case "retry":
      return {
        label: "模型建议重试",
        variant: "warning" as const,
        description: selfCheck.reason ?? "模型建议重试或补充证据。",
      }
    case "fallback":
      return {
        label: "模型建议降级",
        variant: "warning" as const,
        description: selfCheck.reason ?? "模型建议收缩为试点计划。",
      }
    case "skipped":
      return {
        label: "自检跳过",
        variant: selfCheck.reason?.includes("低风险") ? "info" as const : "neutral" as const,
        description: selfCheck.reason ?? "模型自检未执行。",
      }
    default:
      return {
        label: "自检未知",
        variant: "neutral" as const,
        description: selfCheck.reason ?? "当前未记录模型自检结果。",
      }
  }
}

export function LearningPathDraftPage({ pathId }: LearningPathDraftPageProps) {
  const toast = useAppToast()
  const [data, setData] = useState<AdminLearningMaterialPlanSnapshot | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [authExpired, setAuthExpired] = useState(false)

  useAdminSessionExpiryRedirect(authExpired)

  const fetchDetail = useCallback(async (opts?: { silent?: boolean }) => {
    const silent = opts?.silent ?? false
    if (!silent) {
      setIsLoading(true)
    }
    setError(null)
    try {
      const result = await adminRequestData<AdminLearningMaterialPlanSnapshot>(
        `/admin/learning-paths/${pathId}/draft`,
        { method: "GET" },
        "获取来源草稿详情失败",
      )
      setData(result)
    } catch (fetchError) {
      setAuthExpired(isAdminSessionExpiredError(fetchError))
      const message = getAdminApiErrorMessage(fetchError, "获取来源草稿详情失败")
      if (silent) {
        toast.error(message)
        throw fetchError
      }
      setError(message)
    } finally {
      if (!silent) {
        setIsLoading(false)
      }
    }
  }, [pathId, toast])

  useEffect(() => {
    void fetchDetail()
  }, [fetchDetail])

  const handleRefresh = async () => {
    setIsRefreshing(true)
    try {
      await fetchDetail({ silent: true })
      toast.success("已刷新来源草稿详情")
    } catch {
      // fetchDetail 已处理提示
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

  if (error && !data) {
    return (
      <div className="space-y-4">
        {backLink}
        <StatePanel
          status="error"
          title="加载失败"
          description={error}
          actionLabel="重试"
          onAction={() => void fetchDetail()}
        />
      </div>
    )
  }

  if (isLoading || !data) {
    return (
      <div className="space-y-4">
        {backLink}
        <div className="h-64 animate-pulse rounded-2xl border border-border bg-card" />
        <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
          <div className="h-96 animate-pulse rounded-2xl border border-border bg-card" />
          <div className="h-96 animate-pulse rounded-2xl border border-border bg-card" />
        </div>
      </div>
    )
  }

  const qualityMeta = getMaterialPlanQualityStatusMeta(data.qualityStatus)
  const selfCheckMeta = data.qualityReport ? getMaterialPlanSelfCheckMeta(data.qualityReport.selfCheck) : null

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
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-semibold tracking-tight text-foreground">来源草稿详情</h1>
              <Badge variant={qualityMeta.variant} size="lg">{qualityMeta.label}</Badge>
              {selfCheckMeta ? <Badge variant={selfCheckMeta.variant} size="lg">{selfCheckMeta.label}</Badge> : null}
            </div>
            <p className="mt-2 text-sm text-muted-foreground">{data.title}</p>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              这里展示该学习路径确认时对应的草稿快照、质量闸门结果，以及每个来源的提取证据明细。
            </p>
          </div>
          <div className="rounded-xl border border-brand/20 bg-brand/6 px-4 py-3 text-sm">
            <p className="font-medium text-foreground">更新时间</p>
            <p className="mt-2 text-muted-foreground">{formatAdminLearningDateTime(data.updatedAt)}</p>
          </div>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[0.92fr_1.08fr]">
        <section className="rounded-2xl border border-border bg-card p-5">
          <h2 className="text-lg font-semibold text-foreground">基础信息</h2>
          <dl className="mt-4">
            <InfoRow label="草稿 ID" value={data.draftId} />
            <Separator />
            <InfoRow label="导入 ID" value={data.intakeId} />
            <Separator />
            <InfoRow label="草稿标题" value={data.title} />
            <Separator />
            <InfoRow label="草稿状态" value={getAdminLearningDraftStatusLabel(data.draftStatus)} />
            <Separator />
            <InfoRow label="修订版本" value={`#${data.revisionNo}`} />
            <Separator />
            <InfoRow label="来源数" value={`${data.sources.length}`} />
          </dl>
        </section>

        <section className="rounded-2xl border border-border bg-card p-5">
          <h2 className="text-lg font-semibold text-foreground">质量闸门</h2>
          {data.qualityReport ? (
            <div className="mt-4 space-y-4">
              <div className="rounded-xl border border-border bg-background/70 px-4 py-3">
                <p className="text-xs text-muted-foreground">模型自检说明</p>
                <p className="mt-2 text-sm text-foreground">{selfCheckMeta?.description ?? "暂无自检说明"}</p>
              </div>
              {data.qualityReport.fallbackReason ? (
                <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 px-4 py-3">
                  <p className="text-xs text-amber-700 dark:text-amber-300">降级原因</p>
                  <p className="mt-2 text-sm text-amber-700 dark:text-amber-200">{data.qualityReport.fallbackReason}</p>
                </div>
              ) : null}
              <div className="space-y-2">
                {data.qualityReport.checks.map((check) => (
                  <div key={check.code} className="flex items-start justify-between gap-3 rounded-xl border border-border bg-background/70 px-4 py-3">
                    <div>
                      <p className="text-sm text-foreground">{check.message}</p>
                      <p className="mt-1 font-mono text-[11px] text-muted-foreground">{check.code}</p>
                    </div>
                    <Badge variant={check.passed ? "success" : "warning"} size="md">
                      {check.passed ? "通过" : "未通过"}
                    </Badge>
                  </div>
                ))}
              </div>
              {data.qualityReport.warnings.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {data.qualityReport.warnings.map((warning) => (
                    <Badge key={warning} variant="outline" size="lg">
                      {warning}
                    </Badge>
                  ))}
                </div>
              ) : null}
            </div>
          ) : (
            <StatePanel status="empty" title="暂无质量闸门快照" description="当前草稿没有记录质量报告。" compact />
          )}
        </section>
      </div>

      <section className="rounded-2xl border border-border bg-card p-5">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-foreground">来源明细</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              展示每个来源的提取轨迹、证据覆盖、模型代码与风险提示。
            </p>
          </div>
          <Badge variant="outline" size="lg">{data.sources.length} 个来源</Badge>
        </div>

        <div className="mt-4 space-y-3">
          {data.sources.map((source, index) => (
            <details key={source.sourceId} className="group rounded-xl border border-border bg-background/70" open={index === 0}>
              <summary className="cursor-pointer list-none px-4 py-4">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-medium text-foreground">{source.title || "未命名来源"}</p>
                      <Badge variant="outline" size="md">{getAdminLearningMaterialSourceTypeLabel(source.sourceType)}</Badge>
                      {source.evidenceCoverage ? (
                        <Badge variant={source.evidenceCoverage.isSufficient ? "success" : "warning"} size="md">
                          {source.evidenceCoverage.isSufficient ? "证据充足" : "证据待补强"}
                        </Badge>
                      ) : null}
                    </div>
                    <p className="mt-2 line-clamp-2 break-all font-mono text-[11px] text-muted-foreground">{source.url}</p>
                  </div>
                  <span className="text-xs text-muted-foreground group-open:hidden">展开详情</span>
                </div>
              </summary>

              <div className="space-y-3 border-t border-border px-4 py-4">
                {source.contentExcerpt ? (
                  <div className="rounded-xl border border-border bg-card px-4 py-3">
                    <p className="text-xs text-muted-foreground">内容摘要</p>
                    <p className="mt-2 text-sm text-foreground">{source.contentExcerpt}</p>
                  </div>
                ) : null}

                <div className="flex flex-wrap gap-2">
                  {source.extractionTrace.map((trace) => (
                    <Badge
                      key={`${source.sourceId}-${trace.stage}`}
                      variant={trace.used ? "success" : trace.attempted ? "warning" : getAdminLearningExtractionStageMeta(trace.stage).variant}
                      size="lg"
                    >
                      {getAdminLearningExtractionStageMeta(trace.stage).label}
                      {trace.used ? "·已命中" : trace.attempted ? "·未命中" : "·跳过"}
                    </Badge>
                  ))}
                </div>

                {source.evidenceCoverage ? (
                  <div className="grid gap-2 sm:grid-cols-3">
                    <div className="rounded-xl border border-border/60 bg-card px-3 py-2">
                      <p className="text-[11px] text-muted-foreground">高置信字符</p>
                      <p className="mt-1 text-sm font-medium text-foreground">{source.evidenceCoverage.highConfidenceChars}</p>
                    </div>
                    <div className="rounded-xl border border-border/60 bg-card px-3 py-2">
                      <p className="text-[11px] text-muted-foreground">有效字符</p>
                      <p className="mt-1 text-sm font-medium text-foreground">{source.evidenceCoverage.totalUsefulChars}</p>
                    </div>
                    <div className="rounded-xl border border-border/60 bg-card px-3 py-2">
                      <p className="text-[11px] text-muted-foreground">Chunk 数</p>
                      <p className="mt-1 text-sm font-medium text-foreground">{source.evidenceCoverage.chunkCount}</p>
                    </div>
                  </div>
                ) : null}

                {source.resolvedModelCodes ? (
                  <div className="flex flex-wrap gap-2">
                    {source.resolvedModelCodes.asr ? <Badge variant="outline" size="md">ASR 模型：{source.resolvedModelCodes.asr}</Badge> : null}
                    {source.resolvedModelCodes.vision ? <Badge variant="outline" size="md">视觉模型：{source.resolvedModelCodes.vision}</Badge> : null}
                    {source.resolvedModelCodes.quality ? <Badge variant="outline" size="md">质检模型：{source.resolvedModelCodes.quality}</Badge> : null}
                  </div>
                ) : null}

                {source.warnings.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {source.warnings.map((warning) => (
                      <Badge key={`${source.sourceId}-${warning}`} variant="outline" size="lg">
                        {warning}
                      </Badge>
                    ))}
                  </div>
                ) : null}

                <Button type="button" variant="outline" size="sm" className="gap-1.5" asChild>
                  <a href={source.url} target="_blank" rel="noreferrer">
                    <ExternalLink className="h-4 w-4" />
                    打开来源链接
                  </a>
                </Button>
              </div>
            </details>
          ))}
        </div>
      </section>
    </div>
  )
}
