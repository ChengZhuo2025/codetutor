"use client"

import { useCallback, useEffect, useState } from "react"
import { RefreshCw } from "lucide-react"
import type { AdminAIInvocationDetailResponseData } from "@/lib/api/contracts/admin-ai"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { StatePanel } from "@/components/ui/state-panel"
import { useAdminSessionExpiryRedirect } from "@/features/admin-shell/lib/use-admin-session-expiry-redirect"
import {
  adminRequestData,
  getAdminApiErrorMessage,
  isAdminSessionExpiredError,
} from "@/lib/api/admin-bff-client"
import { ADMIN_ROUTES } from "@/constants/routes"
import { DetailPageHeader, JsonPreview, PageSection } from "./shared"
import { formatDateTime, formatNumber, getInvocationStatusMeta } from "@/features/admin-ai/lib/view-model"

type InvocationDetailProps = {
  invocationId: string
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2.5">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="max-w-[65%] text-right text-sm text-foreground">{value}</dd>
    </div>
  )
}

export function InvocationDetail({ invocationId }: InvocationDetailProps) {
  const [data, setData] = useState<AdminAIInvocationDetailResponseData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [authExpired, setAuthExpired] = useState(false)

  useAdminSessionExpiryRedirect(authExpired)

  const fetchDetail = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const result = await adminRequestData<AdminAIInvocationDetailResponseData>(
        `/admin/ai/invocations/${invocationId}`,
        { method: "GET" },
        "获取调用详情失败",
      )
      setData(result)
    } catch (fetchError) {
      setAuthExpired(isAdminSessionExpiredError(fetchError))
      setError(getAdminApiErrorMessage(fetchError, "获取调用详情失败"))
    } finally {
      setIsLoading(false)
    }
  }, [invocationId])

  useEffect(() => {
    void fetchDetail()
  }, [fetchDetail])

  if (error) {
    return <StatePanel status="error" title="获取调用详情失败" description={error} actionLabel="重试" onAction={() => void fetchDetail()} />
  }

  const meta = data ? getInvocationStatusMeta(data.invocation.status) : null

  return (
    <div className="space-y-6">
      <DetailPageHeader
        backHref={`${ADMIN_ROUTES.ai}/invocations`}
        title="调用日志详情"
        description={data ? `${data.invocation.agentCode} · ${data.invocation.providerCode} / ${data.invocation.modelCode}` : "查看脱敏后的请求 / 响应 payload 与耗时、Token 明细。"}
        action={
          <Button type="button" variant="outline" className="gap-1.5" onClick={() => void fetchDetail()}>
            <RefreshCw className="h-4 w-4" />
            刷新
          </Button>
        }
      />

      {isLoading && !data ? (
        <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
          <div className="h-64 animate-pulse rounded-2xl border border-border bg-muted/30" />
          <div className="h-64 animate-pulse rounded-2xl border border-border bg-muted/30" />
        </div>
      ) : data ? (
        <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
          <div className="space-y-6">
            <PageSection title="基础信息" description="本次调用的主体、状态与会话定位。">
              <div className="mb-4">
                {meta ? (
                  <Badge className={meta.className}>{meta.label}</Badge>
                ) : null}
              </div>
              <dl className="divide-y divide-border">
                <InfoRow label="Invocation ID" value={data.invocation.invocationId} />
                <InfoRow label="Session ID" value={data.invocation.sessionId} />
                <InfoRow label="User ID" value={data.invocation.userId} />
                <InfoRow label="Provider" value={data.invocation.providerCode} />
                <InfoRow label="Model" value={data.invocation.modelCode} />
                <InfoRow label="Agent" value={data.invocation.agentCode} />
                <InfoRow label="时间" value={formatDateTime(data.invocation.createdAt)} />
                <InfoRow label="流式输出" value={data.invocation.streamEnabled ? "是" : "否"} />
              </dl>
            </PageSection>

            <PageSection title="Token 与耗时" description="统计当前调用的耗时、首包和 Token 用量。">
              <dl className="divide-y divide-border">
                <InfoRow label="Prompt Tokens" value={formatNumber(data.invocation.promptTokens)} />
                <InfoRow label="Completion Tokens" value={formatNumber(data.invocation.completionTokens)} />
                <InfoRow label="Total Tokens" value={formatNumber(data.invocation.totalTokens)} />
                <InfoRow label="Latency" value={`${formatNumber(data.invocation.latencyMs)} ms`} />
                <InfoRow label="First Chunk Latency" value={`${formatNumber(data.invocation.firstChunkLatencyMs)} ms`} />
                <InfoRow label="Finish Reason" value={data.invocation.finishReason ?? "暂无"} />
                <InfoRow label="Error Code" value={data.invocation.errorCode ?? "暂无"} />
                <InfoRow label="Error Message" value={data.invocation.errorMessage ?? "暂无"} />
              </dl>
            </PageSection>
          </div>

          <div className="space-y-6">
            <PageSection title="Request Payload" description="脱敏后的请求载荷。">
              <JsonPreview value={data.invocation.requestPayloadRedacted} />
            </PageSection>
            <PageSection title="Response Payload" description="脱敏后的响应载荷。">
              <JsonPreview value={data.invocation.responsePayloadRedacted} />
            </PageSection>
          </div>
        </div>
      ) : null}
    </div>
  )
}
