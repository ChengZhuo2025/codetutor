"use client"

import { useCallback, useEffect, useState } from "react"
import { Activity, Bot, Cpu, Layers, Server, TriangleAlert } from "lucide-react"
import type { AdminAIOverviewResponseData } from "@/lib/api/contracts/admin-ai"
import { Badge } from "@/components/ui/badge"
import { StatePanel } from "@/components/ui/state-panel"
import { MetricCard, PageSection } from "./shared"
import { formatDateTime, formatPercent } from "@/features/admin-ai/lib/view-model"
import { useAdminSessionExpiryRedirect } from "@/features/admin-shell/lib/use-admin-session-expiry-redirect"
import {
  adminRequestData,
  getAdminApiErrorMessage,
  isAdminSessionExpiredError,
} from "@/lib/api/admin-bff-client"

export function AIOverview() {
  const [data, setData] = useState<AdminAIOverviewResponseData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [authExpired, setAuthExpired] = useState(false)

  useAdminSessionExpiryRedirect(authExpired)

  const refresh = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const result = await adminRequestData<AdminAIOverviewResponseData>(
        "/admin/ai/overview",
        { method: "GET" },
        "获取 AI 运营概览失败",
      )
      setData(result)
    } catch (fetchError) {
      setAuthExpired(isAdminSessionExpiredError(fetchError))
      setError(getAdminApiErrorMessage(fetchError, "获取 AI 运营概览失败"))
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  return (
    <>
      {error && !data ? (
        <StatePanel
          status="error"
          title="获取概览失败"
          description={error}
          actionLabel="重试"
          onAction={() => void refresh()}
        />
      ) : (
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">AI 运营</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              基于真实 AI registry、命中规则、技能绑定和调用日志，查看当前生产配置与健康度。
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard label="Providers" value={data?.stats.totalProviders ?? 0} hint="当前登记 Provider 总数" />
            <MetricCard label="Models" value={data?.stats.totalModels ?? 0} hint="当前登记 Model 总数" />
            <MetricCard label="Agents" value={data?.stats.totalAgents ?? 0} hint="当前登记 Agent 总数" />
            <MetricCard label="Skills" value={data?.stats.totalSkills ?? 0} hint="当前登记 Skill 包总数" />
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard label="近 7 天调用" value={data?.stats.invocationCountLast7Days ?? 0} hint="来源于 llm_invocations" />
            <MetricCard label="近 7 天失败" value={data?.stats.failedInvocationCountLast7Days ?? 0} hint="failed / timed_out / cancelled" />
            <MetricCard label="成功率" value={formatPercent(data?.stats.successRateLast7Days ?? 0)} hint="近 7 天成功调用占比" />
            <MetricCard label="活跃配置" value={`${data?.stats.activeProviders ?? 0}/${data?.stats.activeModels ?? 0}/${data?.stats.activeAgents ?? 0}`} hint="Provider / Model / Agent 启用数" />
          </div>

          <PageSection title="配置健康" description="快速查看当前启用配置规模。">
            {isLoading && !data ? (
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                {[1, 2, 3, 4].map((item) => (
                  <div key={item} className="h-24 animate-pulse rounded-xl border border-border bg-muted/40" />
                ))}
              </div>
            ) : (
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-xl border border-border bg-background/60 p-4">
                  <div className="flex items-center gap-2 text-sm font-medium text-foreground"><Server className="h-4 w-4" /> Providers</div>
                  <p className="mt-2 text-sm text-muted-foreground">启用 {data?.stats.activeProviders ?? 0} / 总数 {data?.stats.totalProviders ?? 0}</p>
                </div>
                <div className="rounded-xl border border-border bg-background/60 p-4">
                  <div className="flex items-center gap-2 text-sm font-medium text-foreground"><Cpu className="h-4 w-4" /> Models</div>
                  <p className="mt-2 text-sm text-muted-foreground">启用 {data?.stats.activeModels ?? 0} / 总数 {data?.stats.totalModels ?? 0}</p>
                </div>
                <div className="rounded-xl border border-border bg-background/60 p-4">
                  <div className="flex items-center gap-2 text-sm font-medium text-foreground"><Bot className="h-4 w-4" /> Agents</div>
                  <p className="mt-2 text-sm text-muted-foreground">启用 {data?.stats.activeAgents ?? 0} / 总数 {data?.stats.totalAgents ?? 0}</p>
                </div>
                <div className="rounded-xl border border-border bg-background/60 p-4">
                  <div className="flex items-center gap-2 text-sm font-medium text-foreground"><Layers className="h-4 w-4" /> Skills</div>
                  <p className="mt-2 text-sm text-muted-foreground">启用 {data?.stats.activeSkills ?? 0} / 总数 {data?.stats.totalSkills ?? 0}</p>
                </div>
              </div>
            )}
          </PageSection>

          <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
            <PageSection title="近 7 天调用最多的 Agent" description="帮助判断当前主要承载的生产策略。">
              {data?.topAgents.length ? (
                <div className="space-y-3">
                  {data.topAgents.map((item) => (
                    <div key={item.agentCode} className="rounded-xl border border-border bg-background/60 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-foreground">{item.agentName}</p>
                          <p className="mt-1 text-xs text-muted-foreground">{item.agentCode}</p>
                        </div>
                        <Badge>
                          调用 {item.invocationCount}
                        </Badge>
                      </div>
                      <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
                        <Activity className="h-3.5 w-3.5" />
                        <span>失败 {item.failedInvocationCount}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <StatePanel status="empty" title="暂无调用数据" description="最近 7 天还没有记录到有效调用日志。" />
              )}
            </PageSection>

            <PageSection title="最近失败" description="定位近 7 天最靠前的失败调用。">
              {data?.recentFailures.length ? (
                <div className="space-y-3">
                  {data.recentFailures.map((item) => (
                    <div key={item.invocationId} className="rounded-xl border border-rose-500/20 bg-rose-500/5 p-4">
                      <div className="flex items-start gap-2">
                        <TriangleAlert className="mt-0.5 h-4 w-4 text-rose-600 dark:text-rose-300" />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold text-foreground">{item.agentCode}</p>
                          <p className="mt-1 text-xs text-muted-foreground">{item.providerCode} / {item.modelCode}</p>
                          <p className="mt-2 text-sm text-foreground">{item.errorMessage ?? "无错误信息"}</p>
                          <p className="mt-2 text-xs text-muted-foreground">{formatDateTime(item.createdAt)}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <StatePanel status="empty" title="暂无失败调用" description="最近 7 天没有失败调用记录。" />
              )}
            </PageSection>
          </div>
        </div>
      )}
    </>
  )
}
