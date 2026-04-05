"use client"

import { useCallback, useEffect, useState } from "react"
import { Pencil, RefreshCw } from "lucide-react"
import type { AdminAIProviderDetailResponseData } from "@/lib/api/contracts/admin-ai"
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
import { ProviderFormSheet } from "./provider-form-sheet"

type ProviderDetailProps = {
  providerId: string
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2.5">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="max-w-[65%] text-right text-sm text-foreground">{value}</dd>
    </div>
  )
}

export function ProviderDetail({ providerId }: ProviderDetailProps) {
  const [data, setData] = useState<AdminAIProviderDetailResponseData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [authExpired, setAuthExpired] = useState(false)
  const [editOpen, setEditOpen] = useState(false)

  useAdminSessionExpiryRedirect(authExpired)

  const fetchDetail = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const result = await adminRequestData<AdminAIProviderDetailResponseData>(
        `/admin/ai/providers/${providerId}`,
        { method: "GET" },
        "获取 Provider 详情失败",
      )
      setData(result)
    } catch (fetchError) {
      setAuthExpired(isAdminSessionExpiredError(fetchError))
      setError(getAdminApiErrorMessage(fetchError, "获取 Provider 详情失败"))
    } finally {
      setIsLoading(false)
    }
  }, [providerId])

  useEffect(() => {
    void fetchDetail()
  }, [fetchDetail])

  if (error) {
    return <StatePanel status="error" title="获取 Provider 详情失败" description={error} actionLabel="重试" onAction={() => void fetchDetail()} />
  }

  return (
    <div className="space-y-6">
      <DetailPageHeader
        backHref={`${ADMIN_ROUTES.ai}/providers`}
        title={data?.provider.name ?? "Provider 详情"}
        description={data ? `${data.provider.code} · ${data.provider.providerType}` : "查看 Provider 基础配置、关联模型和关联 Agent。"}
        action={
          <div className="flex items-center gap-2">
            <Button type="button" variant="outline" className="gap-1.5" onClick={() => void fetchDetail()}>
              <RefreshCw className="h-4 w-4" />
              刷新
            </Button>
            <Button type="button" className="gap-1.5" onClick={() => setEditOpen(true)} disabled={!data}>
              <Pencil className="h-4 w-4" />
              编辑
            </Button>
          </div>
        }
      />

      {isLoading && !data ? (
        <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
          <div className="h-64 animate-pulse rounded-2xl border border-border bg-muted/30" />
          <div className="h-64 animate-pulse rounded-2xl border border-border bg-muted/30" />
        </div>
      ) : data ? (
        <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
          <PageSection title="基础信息" description="当前 Provider 的连接与运行参数。">
            <dl className="divide-y divide-border">
              <InfoRow label="Code" value={data.provider.code} />
              <InfoRow label="名称" value={data.provider.name} />
              <InfoRow label="类型" value={data.provider.providerType} />
              <InfoRow label="鉴权方式" value={data.provider.authMode} />
              <InfoRow label="Base URL" value={data.provider.baseUrl} />
              <InfoRow label="Secret Ref" value={data.provider.secretRef} />
              <InfoRow label="支持流式" value={data.provider.supportsStream ? "是" : "否"} />
              <InfoRow label="支持 JSON Mode" value={data.provider.supportsJsonMode ? "是" : "否"} />
              <InfoRow label="超时" value={`${data.provider.timeoutMs} ms`} />
              <InfoRow label="重试次数" value={String(data.provider.retryCount)} />
              <InfoRow label="状态" value={data.provider.isActive ? "启用" : "停用"} />
            </dl>
          </PageSection>

          <div className="space-y-6">
            <PageSection title="关联引用" description="查看当前 Provider 被哪些模型和 Agent 使用。">
              <div className="space-y-4">
                <div>
                  <p className="text-sm font-medium text-foreground">关联 Models</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {data.linkedModelCodes.length ? data.linkedModelCodes.map((item) => (
                      <Badge key={item} variant="outline" size="lg">
                        {item}
                      </Badge>
                    )) : <p className="text-sm text-muted-foreground">暂无关联模型</p>}
                  </div>
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">关联 Agents</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {data.linkedAgentCodes.length ? data.linkedAgentCodes.map((item) => (
                      <Badge key={item} variant="outline" size="lg">
                        {item}
                      </Badge>
                    )) : <p className="text-sm text-muted-foreground">暂无关联 Agent</p>}
                  </div>
                </div>
              </div>
            </PageSection>

            <PageSection title="Metadata" description="透传配置与运行时补充字段。">
              <JsonPreview value={data.provider.metadata} />
            </PageSection>
          </div>
        </div>
      ) : null}

      <ProviderFormSheet
        open={editOpen}
        onOpenChange={setEditOpen}
        providerId={providerId}
        onSaved={async (detail) => {
          setData(detail)
          await fetchDetail()
        }}
        onAuthExpired={() => setAuthExpired(true)}
      />
    </div>
  )
}
