"use client"

import { useCallback, useEffect, useState } from "react"
import { Pencil, RefreshCw } from "lucide-react"
import type { AdminAIAgentDetailResponseData } from "@/lib/api/contracts/admin-ai"
import { Button } from "@/components/ui/button"
import { StatePanel } from "@/components/ui/state-panel"
import { useAdminSessionExpiryRedirect } from "@/features/admin-shell/lib/use-admin-session-expiry-redirect"
import {
  adminRequestData,
  getAdminApiErrorMessage,
  isAdminSessionExpiredError,
} from "@/lib/api/admin-bff-client"
import { ADMIN_ROUTES } from "@/constants/routes"
import {
  getAdminAIAgentScenarioTypeLabel,
  getAdminAIInteractionTypeLabel,
} from "@/features/admin-ai/lib/view-model"
import { AgentFormSheet } from "./agent-form-sheet"
import { DetailPageHeader, JsonPreview, PageSection } from "./shared"

type AgentDetailProps = {
  agentId: string
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2.5">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="max-w-[65%] text-right text-sm text-foreground">{value}</dd>
    </div>
  )
}

export function AgentDetail({ agentId }: AgentDetailProps) {
  const [data, setData] = useState<AdminAIAgentDetailResponseData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [authExpired, setAuthExpired] = useState(false)
  const [editOpen, setEditOpen] = useState(false)

  useAdminSessionExpiryRedirect(authExpired)

  const fetchDetail = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const result = await adminRequestData<AdminAIAgentDetailResponseData>(
        `/admin/ai/agents/${agentId}`,
        { method: "GET" },
        "获取 Agent 详情失败",
      )
      setData(result)
    } catch (fetchError) {
      setAuthExpired(isAdminSessionExpiredError(fetchError))
      setError(getAdminApiErrorMessage(fetchError, "获取 Agent 详情失败"))
    } finally {
      setIsLoading(false)
    }
  }, [agentId])

  useEffect(() => {
    void fetchDetail()
  }, [fetchDetail])

  if (error) {
    return <StatePanel status="error" title="获取 Agent 详情失败" description={error} actionLabel="重试" onAction={() => void fetchDetail()} />
  }

  return (
    <div className="space-y-6">
      <DetailPageHeader
        backHref={`${ADMIN_ROUTES.ai}/agents`}
        title={data?.agent.name ?? "Agent 详情"}
        description={data ? `${data.agent.code} · ${getAdminAIAgentScenarioTypeLabel(data.agent.scenarioType)}` : "查看 Agent 模板、规则命中和 Skill 绑定。"}
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
        <div className="space-y-6">
          <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
            <PageSection title="基础信息" description="当前 Agent 的运行参数。">
              <dl className="divide-y divide-border">
                <InfoRow label="Code" value={data.agent.code} />
                <InfoRow label="场景类型" value={getAdminAIAgentScenarioTypeLabel(data.agent.scenarioType)} />
                <InfoRow label="默认 Provider" value={data.agent.defaultProviderCode} />
                <InfoRow label="默认 Model" value={data.agent.defaultModelCode} />
                <InfoRow label="上下文消息上限" value={String(data.agent.contextMessageLimit)} />
                <InfoRow label="最大输出 Tokens" value={String(data.agent.maxOutputTokens)} />
                <InfoRow label="Temperature" value={String(data.agent.temperature)} />
                <InfoRow label="Top P" value={data.agent.topP == null ? "暂无" : String(data.agent.topP)} />
                <InfoRow label="流式输出" value={data.agent.streamEnabled ? "启用" : "停用"} />
                <InfoRow label="状态" value={data.agent.isActive ? "启用" : "停用"} />
                <InfoRow label="版本" value={String(data.agent.version)} />
              </dl>
            </PageSection>

            <div className="space-y-6">
              <PageSection title="Prompt 模板" description="当前 Agent 使用的系统与开发 Prompt。">
                <div className="space-y-4">
                  <div>
                    <p className="mb-2 text-sm font-medium text-foreground">System Prompt</p>
                    <div className="rounded-xl border border-border bg-muted/20 p-4 text-sm whitespace-pre-wrap text-foreground">{data.agent.systemPromptTemplate}</div>
                  </div>
                  <div>
                    <p className="mb-2 text-sm font-medium text-foreground">Developer Prompt</p>
                    <div className="rounded-xl border border-border bg-muted/20 p-4 text-sm whitespace-pre-wrap text-foreground">{data.agent.developerPromptTemplate || "暂无"}</div>
                  </div>
                </div>
              </PageSection>
              <PageSection title="Metadata" description="运行时补充字段。">
                <JsonPreview value={data.agent.metadata} />
              </PageSection>
            </div>
          </div>

          <div className="grid gap-6 xl:grid-cols-2">
            <PageSection title="命中规则" description={`共 ${data.bindings.length} 条`}>
              <div className="space-y-3">
                {data.bindings.length ? data.bindings.map((item) => (
                  <div key={item.bindingId} className="rounded-xl border border-border bg-background/60 p-4">
                    <p className="text-sm font-medium text-foreground">{getAdminAIInteractionTypeLabel(item.interactionType)}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      priority {item.priority}
                      {item.toolCode ? ` · ${item.toolCode}` : ""}
                      {item.pathCode ? ` · ${item.pathCode}` : ""}
                      {item.stepNo ? ` · step ${item.stepNo}` : ""}
                    </p>
                  </div>
                )) : <p className="text-sm text-muted-foreground">暂无命中规则</p>}
              </div>
            </PageSection>

            <PageSection title="Skill 绑定" description={`共 ${data.skillBindings.length} 条`}>
              <div className="space-y-3">
                {data.skillBindings.length ? data.skillBindings.map((item) => (
                  <div key={item.bindingId} className="rounded-xl border border-border bg-background/60 p-4">
                    <p className="text-sm font-medium text-foreground">{item.skillName}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {item.skillCode} · priority {item.priority} · {item.isRequired ? "required" : "optional"}
                    </p>
                  </div>
                )) : <p className="text-sm text-muted-foreground">暂无 Skill 绑定</p>}
              </div>
            </PageSection>
          </div>
        </div>
      ) : null}

      <AgentFormSheet
        open={editOpen}
        onOpenChange={setEditOpen}
        agentId={agentId}
        onSaved={async () => {
          await fetchDetail()
        }}
        onAuthExpired={() => setAuthExpired(true)}
      />
    </div>
  )
}
