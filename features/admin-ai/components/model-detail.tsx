"use client"

import { useCallback, useEffect, useState } from "react"
import { Pencil, RefreshCw } from "lucide-react"
import type { AdminAIModelDetailResponseData } from "@/lib/api/contracts/admin-ai"
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
import { adminAiModelBffDetailUrl } from "@/features/admin-ai/lib/model-admin-urls"
import {
  getAdminAIModelConnectionTestModeLabel,
  getAdminAIModelFamilyLabel,
  getAdminAIModelRuntimeCapabilityLabel,
} from "@/features/admin-ai/lib/view-model"
import { DetailPageHeader, JsonPreview, PageSection } from "./shared"
import { ModelFormSheet } from "./model-form-sheet"

type ModelDetailProps = {
  modelId: string
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2.5">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="max-w-[65%] text-right text-sm text-foreground">{value}</dd>
    </div>
  )
}

export function ModelDetail({ modelId }: ModelDetailProps) {
  const [data, setData] = useState<AdminAIModelDetailResponseData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [authExpired, setAuthExpired] = useState(false)
  const [editOpen, setEditOpen] = useState(false)

  useAdminSessionExpiryRedirect(authExpired)

  const fetchDetail = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const result = await adminRequestData<AdminAIModelDetailResponseData>(
        adminAiModelBffDetailUrl(modelId),
        { method: "GET" },
        "获取 Model 详情失败",
      )
      setData(result)
    } catch (fetchError) {
      setAuthExpired(isAdminSessionExpiredError(fetchError))
      setError(getAdminApiErrorMessage(fetchError, "获取 Model 详情失败"))
    } finally {
      setIsLoading(false)
    }
  }, [modelId])

  useEffect(() => {
    void fetchDetail()
  }, [fetchDetail])

  if (error) {
    return <StatePanel status="error" title="获取 Model 详情失败" description={error} actionLabel="重试" onAction={() => void fetchDetail()} />
  }

  return (
    <div className="space-y-6">
      <DetailPageHeader
        backHref={`${ADMIN_ROUTES.ai}/models`}
        title={data?.model.displayName ?? "Model 详情"}
        description={data ? `${data.model.code} · ${data.model.providerCode} / ${data.model.modelName}` : "查看模型能力、默认输出和关联 Agent。"}
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
          <PageSection title="基础信息" description="当前 Model 的核心能力和开关。">
            <dl className="divide-y divide-border">
              <InfoRow label="Provider" value={data.model.providerCode} />
              <InfoRow label="Code" value={data.model.code} />
              <InfoRow label="展示名" value={data.model.displayName} />
              <InfoRow label="真实模型名" value={data.model.modelName} />
              <InfoRow label="模型类别" value={getAdminAIModelFamilyLabel(data.model.modelFamily)} />
              <InfoRow label="运行时用途" value={data.model.runtimeCapabilities.length ? data.model.runtimeCapabilities.map(getAdminAIModelRuntimeCapabilityLabel).join(" / ") : "无"} />
              <InfoRow label="连接测试模式" value={getAdminAIModelConnectionTestModeLabel(data.model.connectionTestMode)} />
              <InfoRow label="推理模式" value={data.model.reasoningEnabled ? "是" : "否"} />
              <InfoRow label="配置分组" value={data.model.profileGroup ?? "暂无"} />
              <InfoRow label="管理备注" value={data.model.notes ?? "暂无"} />
              <InfoRow label="最大上下文" value={String(data.model.maxContextTokens)} />
              <InfoRow label="默认输出上限" value={String(data.model.defaultMaxOutputTokens)} />
              <InfoRow label="推荐温度" value={data.model.recommendedTemperature == null ? "暂无" : String(data.model.recommendedTemperature)} />
              <InfoRow label="支持流式" value={data.model.supportsStream ? "是" : "否"} />
              <InfoRow label="支持 JSON Mode" value={data.model.supportsJsonMode ? "是" : "否"} />
              <InfoRow label="支持 Tool Calling" value={data.model.supportsToolCalling ? "是" : "否"} />
              <InfoRow label="状态" value={data.model.isActive ? "启用" : "停用"} />
            </dl>
          </PageSection>

          <div className="space-y-6">
            <PageSection title="关联 Agent" description="当前 Model 被哪些 Agent 使用。">
              <div className="flex flex-wrap gap-2">
                {data.linkedAgentCodes.length ? data.linkedAgentCodes.map((item) => (
                  <Badge key={item} variant="outline" size="lg">
                    {item}
                  </Badge>
                )) : <p className="text-sm text-muted-foreground">暂无关联 Agent</p>}
              </div>
            </PageSection>

            <PageSection title="Pricing Metadata" description="模型价格与计费相关扩展字段。">
              <JsonPreview value={data.model.pricingMetadata} />
            </PageSection>

            <PageSection title="高级扩展 Metadata" description="仅展示少量未结构化的补充配置。">
              <JsonPreview value={data.model.metadata} />
            </PageSection>
          </div>
        </div>
      ) : null}

      <ModelFormSheet
        open={editOpen}
        onOpenChange={setEditOpen}
        modelId={modelId}
        onSaved={async () => {
          await fetchDetail()
        }}
        onAuthExpired={() => setAuthExpired(true)}
      />
    </div>
  )
}
