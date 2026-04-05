"use client"

import { useCallback, useEffect, useState } from "react"
import { Play, Search } from "lucide-react"
import type {
  AdminAIAgentBindingListResponseData,
  AdminAIAgentListResponseData,
  AdminAIResolvePreviewResponseData,
  AdminAITestResponseData,
  AdminAIModelListResponseData,
  AdminAIProviderListResponseData,
} from "@/lib/api/contracts/admin-ai"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { StatePanel } from "@/components/ui/state-panel"
import { useAppToast } from "@/components/app-feedback/app-toast-provider"
import { useAdminSessionExpiryRedirect } from "@/features/admin-shell/lib/use-admin-session-expiry-redirect"
import {
  adminRequestData,
  getAdminApiErrorMessage,
  isAdminSessionExpiredError,
} from "@/lib/api/admin-bff-client"
import { JsonPreview, PageSection } from "./shared"
import { formatNumber, getInvocationStatusMeta } from "@/features/admin-ai/lib/view-model"

export function AITestConsole() {
  const toast = useAppToast()
  const [agentData, setAgentData] = useState<AdminAIAgentListResponseData | null>(null)
  const [providerData, setProviderData] = useState<AdminAIProviderListResponseData | null>(null)
  const [modelData, setModelData] = useState<AdminAIModelListResponseData | null>(null)
  const [bindingData, setBindingData] = useState<AdminAIAgentBindingListResponseData | null>(null)
  const [previewResult, setPreviewResult] = useState<AdminAIResolvePreviewResponseData | null>(null)
  const [testResult, setTestResult] = useState<AdminAITestResponseData | null>(null)
  const [previewForm, setPreviewForm] = useState({
    interactionType: "teaching",
    toolId: "",
    learningLevel: "",
    selectionMode: "",
    pathId: "",
    stepNo: "",
  })
  const [testForm, setTestForm] = useState({
    agentCode: "",
    providerCode: "",
    modelCode: "",
    prompt: "请给我一个最小可执行的 CLI 工作流建议，并说明如何验证结果。",
    stream: false,
    changeReason: "联调测试",
  })
  const [loading, setLoading] = useState(true)
  const [previewLoading, setPreviewLoading] = useState(false)
  const [testLoading, setTestLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [authExpired, setAuthExpired] = useState(false)

  useAdminSessionExpiryRedirect(authExpired)

  const fetchReferenceData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [agents, providers, models, bindings] = await Promise.all([
        adminRequestData<AdminAIAgentListResponseData>("/admin/ai/agents?status=active&page=1&limit=100", { method: "GET" }, "获取 Agent 选项失败"),
        adminRequestData<AdminAIProviderListResponseData>("/admin/ai/providers?status=active&page=1&limit=100", { method: "GET" }, "获取 Provider 选项失败"),
        adminRequestData<AdminAIModelListResponseData>("/admin/ai/models?status=active&page=1&limit=100", { method: "GET" }, "获取 Model 选项失败"),
        adminRequestData<AdminAIAgentBindingListResponseData>("/admin/ai/agent-bindings?page=1&limit=100", { method: "GET" }, "获取命中规则选项失败"),
      ])
      setAgentData(agents)
      setProviderData(providers)
      setModelData(models)
      setBindingData(bindings)
      setTestForm((prev) => ({
        ...prev,
        agentCode: prev.agentCode || agents.items[0]?.code || "",
        providerCode: prev.providerCode || providers.items[0]?.code || "",
        modelCode: prev.modelCode || models.items[0]?.code || "",
      }))
    } catch (fetchError) {
      setAuthExpired(isAdminSessionExpiredError(fetchError))
      setError(getAdminApiErrorMessage(fetchError, "获取测试页面选项失败"))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void fetchReferenceData()
  }, [fetchReferenceData])

  const runPreview = async () => {
    setPreviewLoading(true)
    try {
      const result = await adminRequestData<AdminAIResolvePreviewResponseData>(
        "/admin/ai/resolve-preview",
        {
          method: "POST",
          body: JSON.stringify({
            interactionType: previewForm.interactionType,
            toolId: previewForm.toolId || null,
            learningLevel: previewForm.learningLevel || null,
            selectionMode: previewForm.selectionMode || null,
            pathId: previewForm.pathId || null,
            stepNo: previewForm.stepNo ? Number(previewForm.stepNo) : null,
          }),
        },
        "执行命中预览失败",
      )
      setPreviewResult(result)
    } catch (previewError) {
      setAuthExpired(isAdminSessionExpiredError(previewError))
      toast.error(getAdminApiErrorMessage(previewError, "执行命中预览失败"))
    } finally {
      setPreviewLoading(false)
    }
  }

  const runTest = async () => {
    setTestLoading(true)
    try {
      const result = await adminRequestData<AdminAITestResponseData>(
        "/admin/ai/agent/test",
        {
          method: "POST",
          body: JSON.stringify(testForm),
        },
        "执行 AI 测试失败",
      )
      setTestResult(result)
      toast.success("AI 测试完成")
    } catch (testError) {
      setAuthExpired(isAdminSessionExpiredError(testError))
      toast.error(getAdminApiErrorMessage(testError, "执行 AI 测试失败"))
    } finally {
      setTestLoading(false)
    }
  }

  return (
    <>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">测试调试</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            先做命中预览，再发真实 Provider 调用，验证 Agent / Provider / Model 的运行结果与日志写入。
          </p>
        </div>

        {error && !agentData ? (
          <StatePanel status="error" title="获取调试配置失败" description={error} actionLabel="重试" onAction={() => void fetchReferenceData()} />
        ) : (
          <>
            <PageSection title="命中预览" description="模拟当前上下文，看最终会命中哪条规则、哪个 Agent、哪些 Skill。">
              {loading ? (
                <div className="h-48 animate-pulse rounded-xl border border-border bg-muted/30" />
              ) : (
                <div className="space-y-6">
                  <div className="rounded-xl border border-border bg-background/60 p-4">
                    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                      <label className="space-y-1">
                        <span className="text-sm text-muted-foreground">交互类型</span>
                        <select value={previewForm.interactionType} onChange={(event) => setPreviewForm((prev) => ({ ...prev, interactionType: event.target.value }))} className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm text-foreground">
                          <option value="teaching">teaching</option>
                          <option value="blocked_help">blocked_help</option>
                          <option value="task_review">task_review</option>
                          <option value="completion_feedback">completion_feedback</option>
                          <option value="path_guidance">path_guidance</option>
                        </select>
                      </label>
                      <label className="space-y-1">
                        <span className="text-sm text-muted-foreground">Tool</span>
                        <select value={previewForm.toolId} onChange={(event) => setPreviewForm((prev) => ({ ...prev, toolId: event.target.value }))} className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm text-foreground">
                          <option value="">全部 Tool</option>
                          {bindingData?.toolOptions?.map((item) => (
                            <option key={item.id} value={item.id}>{item.name} ({item.code})</option>
                          ))}
                        </select>
                      </label>
                      <label className="space-y-1">
                        <span className="text-sm text-muted-foreground">Learning Level</span>
                        <select value={previewForm.learningLevel} onChange={(event) => setPreviewForm((prev) => ({ ...prev, learningLevel: event.target.value }))} className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm text-foreground">
                          <option value="">全部等级</option>
                          <option value="beginner">beginner</option>
                          <option value="intermediate">intermediate</option>
                          <option value="advanced">advanced</option>
                        </select>
                      </label>
                      <label className="space-y-1">
                        <span className="text-sm text-muted-foreground">Selection Mode</span>
                        <select value={previewForm.selectionMode} onChange={(event) => setPreviewForm((prev) => ({ ...prev, selectionMode: event.target.value }))} className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm text-foreground">
                          <option value="">全部模式</option>
                          <option value="self_directed">self_directed</option>
                          <option value="preset_training">preset_training</option>
                        </select>
                      </label>
                      <label className="space-y-1">
                        <span className="text-sm text-muted-foreground">Path</span>
                        <select value={previewForm.pathId} onChange={(event) => setPreviewForm((prev) => ({ ...prev, pathId: event.target.value }))} className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm text-foreground">
                          <option value="">全部 Path</option>
                          {bindingData?.pathOptions?.map((item) => (
                            <option key={item.id} value={item.id}>{item.name} ({item.code})</option>
                          ))}
                        </select>
                      </label>
                      <label className="space-y-1">
                        <span className="text-sm text-muted-foreground">Step No</span>
                        <Input value={previewForm.stepNo} onChange={(event) => setPreviewForm((prev) => ({ ...prev, stepNo: event.target.value }))} placeholder="留空表示全部 step" />
                      </label>
                    </div>
                    <div className="mt-4">
                      <Button type="button" className="gap-1.5" onClick={() => void runPreview()} disabled={previewLoading}>
                        <Search className="h-4 w-4" />
                        {previewLoading ? "预览中…" : "执行命中预览"}
                      </Button>
                    </div>
                  </div>

                  {previewResult ? (
                    <div className="grid gap-4 xl:grid-cols-2">
                      <div className="rounded-xl border border-border bg-background/60 p-4">
                        <p className="text-sm font-medium text-foreground">命中结果</p>
                        <div className="mt-3 space-y-1 text-sm text-muted-foreground">
                          <p>规则：{previewResult.matchedBinding?.bindingId ?? "未命中"}</p>
                          <p>Agent：{previewResult.agent?.name ?? "未命中"}</p>
                          <p>Provider / Model：{previewResult.agent ? `${previewResult.agent.providerCode} / ${previewResult.agent.modelCode}` : "暂无"}</p>
                          <p>Specificity：{previewResult.matchedBinding?.specificityScore ?? "暂无"}</p>
                        </div>
                      </div>
                      <div className="rounded-xl border border-border bg-background/60 p-4">
                        <p className="text-sm font-medium text-foreground">匹配到的 Skills</p>
                        {previewResult.matchedSkills.length ? (
                          <div className="mt-3 space-y-2 text-sm text-muted-foreground">
                            {previewResult.matchedSkills.map((item) => (
                              <p key={item.bindingId}>{item.priority}. {item.skillName} ({item.skillCode})</p>
                            ))}
                          </div>
                        ) : (
                          <p className="mt-3 text-sm text-muted-foreground">暂无 Skill 绑定。</p>
                        )}
                      </div>
                    </div>
                  ) : (
                    <StatePanel status="empty" title="尚未执行预览" description="填写上下文并点击“执行命中预览”后，在此查看命中结果。" />
                  )}
                </div>
              )}
            </PageSection>

            <PageSection title="真实 AI 测试" description="调用真实 Provider，并将结果写入 llm_invocations 与 admin_audit_logs。">
              {loading ? (
                <div className="h-48 animate-pulse rounded-xl border border-border bg-muted/30" />
              ) : (
                <div className="space-y-6">
                  <div className="rounded-xl border border-border bg-background/60 p-4">
                    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                      <label className="space-y-1">
                        <span className="text-sm text-muted-foreground">Agent</span>
                        <select value={testForm.agentCode} onChange={(event) => setTestForm((prev) => ({ ...prev, agentCode: event.target.value }))} className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm text-foreground">
                          <option value="">请选择 Agent</option>
                          {agentData?.items.map((item) => (
                            <option key={item.agentId} value={item.code}>{item.name} ({item.code})</option>
                          ))}
                        </select>
                      </label>
                      <label className="space-y-1">
                        <span className="text-sm text-muted-foreground">Provider</span>
                        <select value={testForm.providerCode} onChange={(event) => setTestForm((prev) => ({ ...prev, providerCode: event.target.value }))} className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm text-foreground">
                          <option value="">请选择 Provider</option>
                          {providerData?.items.map((item) => (
                            <option key={item.providerId} value={item.code}>{item.name} ({item.code})</option>
                          ))}
                        </select>
                      </label>
                      <label className="space-y-1">
                        <span className="text-sm text-muted-foreground">Model</span>
                        <select value={testForm.modelCode} onChange={(event) => setTestForm((prev) => ({ ...prev, modelCode: event.target.value }))} className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm text-foreground">
                          <option value="">请选择 Model</option>
                          {modelData?.items.map((item) => (
                            <option key={item.modelId} value={item.code}>{item.displayName} ({item.code})</option>
                          ))}
                        </select>
                      </label>
                      <label className="flex items-center gap-2 rounded-xl border border-border bg-background px-3 py-3 text-sm text-foreground">
                        <input type="checkbox" checked={testForm.stream} onChange={(event) => setTestForm((prev) => ({ ...prev, stream: event.target.checked }))} />
                        流式调用
                      </label>
                    </div>

                    <div className="mt-4 space-y-4">
                      <label className="space-y-1">
                        <span className="text-sm text-muted-foreground">Prompt</span>
                        <textarea value={testForm.prompt} onChange={(event) => setTestForm((prev) => ({ ...prev, prompt: event.target.value }))} className="min-h-40 w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground" />
                      </label>

                      <label className="space-y-1">
                        <span className="text-sm text-muted-foreground">变更原因</span>
                        <textarea value={testForm.changeReason} onChange={(event) => setTestForm((prev) => ({ ...prev, changeReason: event.target.value }))} className="min-h-24 w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground" />
                      </label>

                      <Button type="button" className="gap-1.5" onClick={() => void runTest()} disabled={testLoading}>
                        <Play className="h-4 w-4" />
                        {testLoading ? "执行中…" : "执行真实 AI 测试"}
                      </Button>
                    </div>
                  </div>

                  {testResult ? (
                    <div className="space-y-4">
                      <div className="rounded-xl border border-border bg-background/60 p-4">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge className={getInvocationStatusMeta(testResult.status).className}>
                            {getInvocationStatusMeta(testResult.status).label}
                          </Badge>
                          <span className="text-sm font-semibold text-foreground">{testResult.agentCode}</span>
                        </div>
                        <div className="mt-3 space-y-1 text-sm text-muted-foreground">
                          <p>invocationId：{testResult.invocationId}</p>
                          <p>Provider / Model：{testResult.providerCode} / {testResult.modelCode}</p>
                          <p>耗时：{formatNumber(testResult.latencyMs)} ms</p>
                          <p>Tokens：{formatNumber(testResult.usage.totalTokens)}（prompt {formatNumber(testResult.usage.promptTokens)} / completion {formatNumber(testResult.usage.completionTokens)}）</p>
                          <p>finishReason：{testResult.finishReason ?? "暂无"}</p>
                        </div>
                      </div>

                      <div className="rounded-xl border border-border bg-background/60 p-4">
                        <p className="text-sm font-medium text-foreground">模型返回内容</p>
                        <div className="mt-3 whitespace-pre-wrap text-sm leading-6 text-foreground">{testResult.content || "模型未返回内容。"}</div>
                      </div>

                      <div className="grid gap-4 xl:grid-cols-2">
                        <div>
                          <p className="mb-2 text-sm font-medium text-foreground">Request Payload</p>
                          <JsonPreview value={testResult.requestPayloadRedacted} />
                        </div>
                        <div>
                          <p className="mb-2 text-sm font-medium text-foreground">Response Payload</p>
                          <JsonPreview value={testResult.responsePayloadRedacted} />
                        </div>
                      </div>
                    </div>
                  ) : (
                    <StatePanel status="empty" title="尚未执行 AI 测试" description="填写 Agent / Provider / Model / Prompt 后，执行真实调用并在此查看结果。" />
                  )}
                </div>
              )}
            </PageSection>
          </>
        )}
      </div>
    </>
  )
}
