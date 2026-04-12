"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import {
  ArrowDownToLine,
  Copy,
  ExternalLink,
  Loader2,
  Play,
  RefreshCw,
  Search,
  Trash2,
} from "lucide-react"
import type {
  AdminAIAgentBindingListResponseData,
  AdminAIAgentListItem,
  AdminAIAgentListResponseData,
  AdminAIResolvePreviewResponseData,
  AdminAITestResponseData,
  AdminAIModelListResponseData,
  AdminAIProviderListResponseData,
} from "@/lib/api/contracts/admin-ai"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { StatePanel } from "@/components/ui/state-panel"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { useAppToast } from "@/components/app-feedback/app-toast-provider"
import {
  getLearningLevelLabel,
  getSelectionModeLabel,
} from "@/constants/learning-taxonomy"
import { AdminSelect } from "@/features/admin-shell/components/admin-select"
import { useAdminSessionExpiryRedirect } from "@/features/admin-shell/lib/use-admin-session-expiry-redirect"
import {
  adminRequestData,
  getAdminApiErrorMessage,
  isAdminSessionExpiredError,
} from "@/lib/api/admin-bff-client"
import { JsonPreview, ListPageHeader, PageSection } from "./shared"
import {
  formatNumber,
  getAdminAIInteractionTypeLabel,
  getInvocationStatusMeta,
} from "@/features/admin-ai/lib/view-model"

const DEFAULT_PROMPT =
  "请给我一个最小可执行的 CLI 工作流建议，并说明如何验证结果。"
const DEFAULT_CHANGE_REASON = "联调测试"

const INTERACTION_OPTIONS: Array<{ value: string; label: string }> = [
  { value: "teaching", label: getAdminAIInteractionTypeLabel("teaching") },
  { value: "blocked_help", label: getAdminAIInteractionTypeLabel("blocked_help") },
  { value: "task_review", label: getAdminAIInteractionTypeLabel("task_review") },
  { value: "completion_feedback", label: getAdminAIInteractionTypeLabel("completion_feedback") },
  { value: "path_guidance", label: getAdminAIInteractionTypeLabel("path_guidance") },
]

const PREVIEW_LEARNING_LEVEL_OPTIONS = [
  { value: "", label: "全部等级" },
  { value: "beginner", label: getLearningLevelLabel("beginner", "short") },
  { value: "intermediate", label: getLearningLevelLabel("intermediate", "short") },
  { value: "advanced", label: getLearningLevelLabel("advanced", "short") },
]

const PREVIEW_SELECTION_MODE_OPTIONS = [
  { value: "", label: "全部模式" },
  { value: "self_directed", label: getSelectionModeLabel("self_directed", "short") },
  { value: "preset_training", label: getSelectionModeLabel("preset_training", "short") },
]

const PREVIEW_FORM_INITIAL = {
  interactionType: "teaching",
  toolId: "",
  learningLevel: "",
  selectionMode: "",
  pathId: "",
  stepNo: "",
}

function pickModelForAgent(
  agent: AdminAIAgentListItem,
  models: AdminAIModelListResponseData | null | undefined,
): string {
  const list = models?.items.filter((m) => m.providerCode === agent.providerCode) ?? []
  if (list.some((m) => m.code === agent.modelCode)) return agent.modelCode
  return list[0]?.code ?? ""
}

const TEST_CONSOLE_SELECT_TRIGGER = "h-10 w-full min-w-0 bg-muted/45 shadow-none border-border/90"

export function AITestConsole() {
  const toast = useAppToast()
  const [agentData, setAgentData] = useState<AdminAIAgentListResponseData | null>(null)
  const [providerData, setProviderData] = useState<AdminAIProviderListResponseData | null>(null)
  const [modelData, setModelData] = useState<AdminAIModelListResponseData | null>(null)
  const [bindingData, setBindingData] = useState<AdminAIAgentBindingListResponseData | null>(null)
  const [previewResult, setPreviewResult] = useState<AdminAIResolvePreviewResponseData | null>(null)
  const [testResult, setTestResult] = useState<AdminAITestResponseData | null>(null)
  const [previewForm, setPreviewForm] = useState(PREVIEW_FORM_INITIAL)
  const [testForm, setTestForm] = useState({
    agentCode: "",
    providerCode: "",
    modelCode: "",
    prompt: DEFAULT_PROMPT,
    stream: false,
    changeReason: DEFAULT_CHANGE_REASON,
  })
  const [loading, setLoading] = useState(true)
  const [previewLoading, setPreviewLoading] = useState(false)
  const [testLoading, setTestLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [authExpired, setAuthExpired] = useState(false)

  useAdminSessionExpiryRedirect(authExpired)

  const modelsForProvider = useMemo(() => {
    if (!modelData || !testForm.providerCode) return []
    return modelData.items.filter((m) => m.providerCode === testForm.providerCode)
  }, [modelData, testForm.providerCode])

  const previewToolOptions = useMemo(
    () => [
      { value: "", label: "全部 Tool" },
      ...(bindingData?.toolOptions?.map((item) => ({
        value: item.id,
        label: `${item.name} (${item.code})`,
      })) ?? []),
    ],
    [bindingData?.toolOptions],
  )

  const previewPathOptions = useMemo(
    () => [
      { value: "", label: "全部 Path" },
      ...(bindingData?.pathOptions?.map((item) => ({
        value: item.id,
        label: `${item.name} (${item.code})`,
      })) ?? []),
    ],
    [bindingData?.pathOptions],
  )

  const testAgentOptions = useMemo(
    () => [
      { value: "", label: "请选择 Agent" },
      ...(agentData?.items.map((item) => ({
        value: item.code,
        label: `${item.name} (${item.code})`,
      })) ?? []),
    ],
    [agentData?.items],
  )

  const testProviderOptions = useMemo(
    () => [
      { value: "", label: "请选择 Provider" },
      ...(providerData?.items.map((item) => ({
        value: item.code,
        label: `${item.name} (${item.code})`,
      })) ?? []),
    ],
    [providerData?.items],
  )

  const testModelOptions = useMemo(() => {
    const emptyLabel = testForm.providerCode ? "请选择 Model" : "先选择 Provider"
    return [
      { value: "", label: emptyLabel },
      ...modelsForProvider.map((item) => ({
        value: item.code,
        label: `${item.displayName} (${item.code})${item.supportsStream ? "" : " · 无流式"}`,
      })),
    ]
  }, [testForm.providerCode, modelsForProvider])

  const selectedModel = useMemo(
    () => modelsForProvider.find((m) => m.code === testForm.modelCode),
    [modelsForProvider, testForm.modelCode],
  )

  const selectedAgent = useMemo(
    () => agentData?.items.find((a) => a.code === testForm.agentCode),
    [agentData, testForm.agentCode],
  )

  const testFormValid =
    Boolean(testForm.agentCode.trim()) &&
    Boolean(testForm.providerCode.trim()) &&
    Boolean(testForm.modelCode.trim()) &&
    Boolean(testForm.prompt.trim()) &&
    Boolean(testForm.changeReason.trim())

  const canRunTest = testFormValid && !testLoading

  const copyText = useCallback(
    async (text: string, label = "已复制到剪贴板") => {
      try {
        await navigator.clipboard.writeText(text)
        toast.success(label)
      } catch {
        toast.error("复制失败，请手动选择文本复制")
      }
    },
    [toast],
  )

  const fetchReferenceData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [agents, providers, models, bindings] = await Promise.all([
        adminRequestData<AdminAIAgentListResponseData>(
          "/admin/ai/agents?status=active&page=1&limit=100",
          { method: "GET" },
          "获取 Agent 选项失败",
        ),
        adminRequestData<AdminAIProviderListResponseData>(
          "/admin/ai/providers?status=active&page=1&limit=100",
          { method: "GET" },
          "获取 Provider 选项失败",
        ),
        adminRequestData<AdminAIModelListResponseData>(
          "/admin/ai/models?status=active&page=1&limit=100",
          { method: "GET" },
          "获取 Model 选项失败",
        ),
        adminRequestData<AdminAIAgentBindingListResponseData>(
          "/admin/ai/agent-bindings?page=1&limit=100",
          { method: "GET" },
          "获取命中规则选项失败",
        ),
      ])
      setAgentData(agents)
      setProviderData(providers)
      setModelData(models)
      setBindingData(bindings)

      const firstAgent = agents.items[0]
      setTestForm((prev) => {
        if (!firstAgent) {
          return { ...prev, agentCode: "", providerCode: "", modelCode: "" }
        }
        const modelCode = pickModelForAgent(firstAgent, models)
        return {
          ...prev,
          agentCode: prev.agentCode || firstAgent.code,
          providerCode: prev.providerCode || firstAgent.providerCode,
          modelCode: prev.modelCode || modelCode,
        }
      })
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

  useEffect(() => {
    if (!selectedModel?.supportsStream) {
      setTestForm((prev) => (prev.stream ? { ...prev, stream: false } : prev))
    }
  }, [selectedModel])

  const applyAgentSelection = useCallback(
    (agentCode: string) => {
      const agent = agentData?.items.find((a) => a.code === agentCode)
      if (!agent) {
        setTestForm((prev) => ({ ...prev, agentCode }))
        return
      }
      const modelCode = pickModelForAgent(agent, modelData)
      setTestForm((prev) => ({
        ...prev,
        agentCode,
        providerCode: agent.providerCode,
        modelCode,
      }))
    },
    [agentData, modelData],
  )

  const applyProviderSelection = useCallback(
    (providerCode: string) => {
      setTestForm((prev) => {
        const list = modelData?.items.filter((m) => m.providerCode === providerCode) ?? []
        const keep = list.some((m) => m.code === prev.modelCode)
        return {
          ...prev,
          providerCode,
          modelCode: keep ? prev.modelCode : list[0]?.code ?? "",
        }
      })
    },
    [modelData],
  )

  const applyPreviewToTest = useCallback(() => {
    if (!previewResult?.agent) {
      toast.error("当前预览未命中 Agent，无法填入")
      return
    }
    const { code, providerCode, modelCode } = previewResult.agent
    const list = modelData?.items.filter((m) => m.providerCode === providerCode) ?? []
    const resolved =
      list.some((m) => m.code === modelCode) ? modelCode : list[0]?.code ?? modelCode
    setTestForm((prev) => ({
      ...prev,
      agentCode: code,
      providerCode,
      modelCode: resolved,
    }))
    toast.success("已用命中结果填充测试表单")
  }, [previewResult, modelData, toast])

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
      toast.success("命中预览完成")
    } catch (previewError) {
      setAuthExpired(isAdminSessionExpiredError(previewError))
      toast.error(getAdminApiErrorMessage(previewError, "执行命中预览失败"))
    } finally {
      setPreviewLoading(false)
    }
  }

  const runTest = async () => {
    if (!canRunTest) return
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

  const refreshAction = (
    <Button
      type="button"
      variant="outline"
      className="gap-1.5"
      disabled={loading}
      onClick={() => void fetchReferenceData()}
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
      刷新选项
    </Button>
  )

  return (
    <>
      <div className="space-y-6">
        <ListPageHeader
          title="测试调试"
          description="先做命中预览，再发真实 Provider 调用，验证 Agent / Provider / Model 的运行结果与日志写入。"
          action={refreshAction}
        />

        <details className="rounded-xl border border-border bg-muted/20 px-4 py-3 text-sm open:bg-muted/30">
          <summary className="cursor-pointer font-medium text-foreground">使用说明（点击展开）</summary>
          <ul className="mt-3 list-inside list-disc space-y-1.5 text-muted-foreground">
            <li>切换 Agent 时会自动带上该 Agent 的默认 Provider / Model，减少手填出错。</li>
            <li>命中预览成功后可用「填入测试表单」一键同步到下方真实调用。</li>
            <li>真实调用会写入 llm_invocations 与审计日志；流式仅在该 Model 支持时可用。</li>
          </ul>
        </details>

        {error && !agentData ? (
          <StatePanel
            status="error"
            title="获取调试配置失败"
            description={error}
            actionLabel="重试"
            onAction={() => void fetchReferenceData()}
          />
        ) : (
          <>
            <PageSection
              title="命中预览"
              description="模拟当前上下文，看最终会命中哪条规则、哪个 Agent、哪些 Skill。"
              action={
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setPreviewForm(PREVIEW_FORM_INITIAL)
                      toast.success("预览条件已重置")
                    }}
                    disabled={loading || previewLoading}
                  >
                    重置条件
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="gap-1.5 text-muted-foreground"
                    onClick={() => {
                      setPreviewResult(null)
                      toast.success("已清空预览结果")
                    }}
                    disabled={!previewResult}
                  >
                    <Trash2 className="h-4 w-4" />
                    清空结果
                  </Button>
                </div>
              }
            >
              {loading ? (
                <div className="h-48 animate-pulse rounded-xl border border-border bg-muted/30" />
              ) : (
                <div className="space-y-6">
                  <div className="rounded-xl border border-border bg-background/60 p-4">
                    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                      <div className="space-y-2">
                        <Label htmlFor="preview-interaction">交互类型</Label>
                        <AdminSelect
                          id="preview-interaction"
                          value={previewForm.interactionType}
                          onValueChange={(next) =>
                            setPreviewForm((prev) => ({ ...prev, interactionType: next }))
                          }
                          options={INTERACTION_OPTIONS}
                          triggerClassName={TEST_CONSOLE_SELECT_TRIGGER}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="preview-tool">Tool</Label>
                        <AdminSelect
                          id="preview-tool"
                          value={previewForm.toolId}
                          onValueChange={(next) => setPreviewForm((prev) => ({ ...prev, toolId: next }))}
                          options={previewToolOptions}
                          triggerClassName={TEST_CONSOLE_SELECT_TRIGGER}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="preview-level">学习等级</Label>
                        <AdminSelect
                          id="preview-level"
                          value={previewForm.learningLevel}
                          onValueChange={(next) =>
                            setPreviewForm((prev) => ({ ...prev, learningLevel: next }))
                          }
                          options={PREVIEW_LEARNING_LEVEL_OPTIONS}
                          triggerClassName={TEST_CONSOLE_SELECT_TRIGGER}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="preview-mode">学习模式</Label>
                        <AdminSelect
                          id="preview-mode"
                          value={previewForm.selectionMode}
                          onValueChange={(next) =>
                            setPreviewForm((prev) => ({ ...prev, selectionMode: next }))
                          }
                          options={PREVIEW_SELECTION_MODE_OPTIONS}
                          triggerClassName={TEST_CONSOLE_SELECT_TRIGGER}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="preview-path">学习路径</Label>
                        <AdminSelect
                          id="preview-path"
                          value={previewForm.pathId}
                          onValueChange={(next) => setPreviewForm((prev) => ({ ...prev, pathId: next }))}
                          options={previewPathOptions}
                          triggerClassName={TEST_CONSOLE_SELECT_TRIGGER}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="preview-step">步骤序号</Label>
                        <Input
                          id="preview-step"
                          inputMode="numeric"
                          value={previewForm.stepNo}
                          onChange={(event) =>
                            setPreviewForm((prev) => ({ ...prev, stepNo: event.target.value }))
                          }
                          placeholder="留空表示不限制 step"
                        />
                      </div>
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <Button
                        type="button"
                        className="gap-1.5"
                        onClick={() => void runPreview()}
                        disabled={previewLoading}
                      >
                        {previewLoading ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Search className="h-4 w-4" />
                        )}
                        {previewLoading ? "预览中…" : "执行命中预览"}
                      </Button>
                    </div>
                  </div>

                  {previewResult ? (
                    <div className="space-y-4">
                      <div className="flex flex-wrap items-center gap-2">
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          className="gap-1.5"
                          disabled={!previewResult.agent}
                          onClick={applyPreviewToTest}
                        >
                          <ArrowDownToLine className="h-4 w-4" />
                          填入测试表单
                        </Button>
                        {!previewResult.agent ? (
                          <span className="text-xs text-muted-foreground">未命中 Agent 时无法填入</span>
                        ) : null}
                      </div>
                      <div className="grid gap-4 xl:grid-cols-2">
                        <div className="rounded-xl border border-border bg-background/60 p-4">
                          <p className="text-sm font-medium text-foreground">命中结果</p>
                          <div className="mt-3 space-y-2 text-sm text-muted-foreground">
                            <div className="flex flex-wrap items-center gap-2">
                              <span>
                                规则：
                                {previewResult.matchedBinding?.bindingId ?? "未命中"}
                              </span>
                              {previewResult.matchedBinding?.bindingId ? (
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon-sm"
                                  className="size-7"
                                  aria-label="复制规则 ID"
                                  onClick={() =>
                                    void copyText(previewResult.matchedBinding!.bindingId, "已复制规则 ID")
                                  }
                                >
                                  <Copy className="h-3.5 w-3.5" />
                                </Button>
                              ) : null}
                            </div>
                            <p>Agent：{previewResult.agent?.name ?? "未命中"}</p>
                            <p>
                              Provider / Model：
                              {previewResult.agent
                                ? `${previewResult.agent.providerCode} / ${previewResult.agent.modelCode}`
                                : "暂无"}
                            </p>
                            <p>
                              Specificity：
                              {previewResult.matchedBinding?.specificityScore ?? "暂无"}
                            </p>
                          </div>
                        </div>
                        <div className="rounded-xl border border-border bg-background/60 p-4">
                          <p className="text-sm font-medium text-foreground">匹配到的 Skills</p>
                          {previewResult.matchedSkills.length ? (
                            <ul className="mt-3 list-inside list-decimal space-y-1.5 text-sm text-muted-foreground">
                              {previewResult.matchedSkills.map((item) => (
                                <li key={item.bindingId}>
                                  {item.skillName}{" "}
                                  <span className="text-foreground/80">({item.skillCode})</span>
                                  <span className="text-xs"> · 优先级 {item.priority}</span>
                                </li>
                              ))}
                            </ul>
                          ) : (
                            <p className="mt-3 text-sm text-muted-foreground">暂无 Skill 绑定。</p>
                          )}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <StatePanel
                      status="empty"
                      title="尚未执行预览"
                      description="填写上下文并点击「执行命中预览」后，在此查看命中结果。"
                    />
                  )}
                </div>
              )}
            </PageSection>

            <PageSection
              title="真实 AI 测试"
              description="调用真实 Provider，并将结果写入 llm_invocations 与 admin_audit_logs。"
              action={
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="gap-1.5 text-muted-foreground"
                  onClick={() => {
                    setTestResult(null)
                    toast.success("已清空测试结果")
                  }}
                  disabled={!testResult}
                >
                  <Trash2 className="h-4 w-4" />
                  清空结果
                </Button>
              }
            >
              {loading ? (
                <div className="h-48 animate-pulse rounded-xl border border-border bg-muted/30" />
              ) : (
                <div className="space-y-6">
                  <div className="rounded-xl border border-border bg-background/60 p-4">
                    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                      <div className="space-y-2">
                        <Label htmlFor="test-agent">Agent</Label>
                        <AdminSelect
                          id="test-agent"
                          value={testForm.agentCode}
                          onValueChange={applyAgentSelection}
                          options={testAgentOptions}
                          triggerClassName={TEST_CONSOLE_SELECT_TRIGGER}
                        />
                        {selectedAgent ? (
                          <p className="text-xs text-muted-foreground">
                            默认 {selectedAgent.providerCode} / {selectedAgent.modelCode}
                            {selectedAgent.streamEnabled ? "" : " · 关闭流式"}
                          </p>
                        ) : null}
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="test-provider">Provider</Label>
                        <AdminSelect
                          id="test-provider"
                          value={testForm.providerCode}
                          onValueChange={applyProviderSelection}
                          options={testProviderOptions}
                          triggerClassName={TEST_CONSOLE_SELECT_TRIGGER}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="test-model">Model</Label>
                        <AdminSelect
                          id="test-model"
                          value={testForm.modelCode}
                          onValueChange={(next) => setTestForm((prev) => ({ ...prev, modelCode: next }))}
                          options={testModelOptions}
                          disabled={!testForm.providerCode}
                          triggerClassName={TEST_CONSOLE_SELECT_TRIGGER}
                        />
                        {!testForm.providerCode ? (
                          <p className="text-xs text-muted-foreground">选择 Provider 后筛选可用模型</p>
                        ) : modelsForProvider.length === 0 ? (
                          <p className="text-xs text-amber-600 dark:text-amber-400">
                            当前 Provider 下没有可用模型，请检查模型是否启用
                          </p>
                        ) : null}
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="test-stream">流式输出</Label>
                        <div className="flex h-10 items-center gap-3 rounded-md border border-border bg-background px-3">
                          <Switch
                            id="test-stream"
                            checked={testForm.stream}
                            onCheckedChange={(checked) =>
                              setTestForm((prev) => ({ ...prev, stream: checked }))
                            }
                            disabled={!selectedModel?.supportsStream}
                          />
                          <span className="text-sm text-muted-foreground">
                            {selectedModel?.supportsStream
                              ? "开启后走流式接口"
                              : "当前模型不支持流式"}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 space-y-4">
                      <div className="space-y-2">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <Label htmlFor="test-prompt">Prompt</Label>
                          <span className="text-xs text-muted-foreground">
                            {testForm.prompt.length} 字
                          </span>
                        </div>
                        <Textarea
                          id="test-prompt"
                          value={testForm.prompt}
                          onChange={(event) =>
                            setTestForm((prev) => ({ ...prev, prompt: event.target.value }))
                          }
                          className="min-h-40 font-mono text-sm"
                          placeholder="输入要发给模型的内容…"
                        />
                        <div className="flex flex-wrap gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              setTestForm((prev) => ({ ...prev, prompt: DEFAULT_PROMPT }))
                            }
                          >
                            恢复示例 Prompt
                          </Button>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="test-reason">变更原因（写入审计）</Label>
                        <Textarea
                          id="test-reason"
                          value={testForm.changeReason}
                          onChange={(event) =>
                            setTestForm((prev) => ({ ...prev, changeReason: event.target.value }))
                          }
                          className="min-h-20 text-sm"
                          placeholder="说明本次测试目的，便于审计追溯"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            setTestForm((prev) => ({ ...prev, changeReason: DEFAULT_CHANGE_REASON }))
                          }
                        >
                          恢复默认说明
                        </Button>
                      </div>

                      {!testFormValid ? (
                        <p className="text-sm text-amber-600 dark:text-amber-400">
                          请补全 Agent、Provider、Model、Prompt 与变更原因后再执行测试。
                        </p>
                      ) : null}

                      <div className="flex flex-wrap gap-2">
                        <Button
                          type="button"
                          className="gap-1.5"
                          onClick={() => void runTest()}
                          disabled={!canRunTest}
                        >
                          {testLoading ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Play className="h-4 w-4" />
                          )}
                          {testLoading ? "执行中…" : "执行真实 AI 测试"}
                        </Button>
                      </div>
                    </div>
                  </div>

                  {testResult ? (
                    <div className="space-y-4">
                      <div className="rounded-xl border border-border bg-background/60 p-4">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge className={getInvocationStatusMeta(testResult.status).className}>
                            {getInvocationStatusMeta(testResult.status).label}
                          </Badge>
                          <span className="text-sm font-semibold text-foreground">
                            {testResult.agentCode}
                          </span>
                          <div className="ml-auto flex flex-wrap gap-2">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="gap-1.5"
                              onClick={() => void copyText(testResult.invocationId, "已复制 invocationId")}
                            >
                              <Copy className="h-4 w-4" />
                              复制 ID
                            </Button>
                            <Button type="button" variant="outline" size="sm" className="gap-1.5" asChild>
                              <Link href={`/admin/ai/invocations/${testResult.invocationId}`}>
                                <ExternalLink className="h-4 w-4" />
                                调用日志详情
                              </Link>
                            </Button>
                          </div>
                        </div>
                        <div className="mt-3 space-y-1 text-sm text-muted-foreground">
                          <p className="break-all">invocationId：{testResult.invocationId}</p>
                          <p>
                            Provider / Model：{testResult.providerCode} / {testResult.modelCode}
                          </p>
                          <p>耗时：{formatNumber(testResult.latencyMs)} ms</p>
                          <p>
                            Tokens：{formatNumber(testResult.usage.totalTokens)}（prompt{" "}
                            {formatNumber(testResult.usage.promptTokens)} / completion{" "}
                            {formatNumber(testResult.usage.completionTokens)}）
                          </p>
                          <p>finishReason：{testResult.finishReason ?? "暂无"}</p>
                        </div>
                      </div>

                      <div className="rounded-xl border border-border bg-background/60 p-4">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <p className="text-sm font-medium text-foreground">模型返回内容</p>
                          {testResult.content ? (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="gap-1.5 text-muted-foreground"
                              onClick={() => void copyText(testResult.content, "已复制模型输出")}
                            >
                              <Copy className="h-4 w-4" />
                              复制全文
                            </Button>
                          ) : null}
                        </div>
                        <div className="mt-3 max-h-[min(24rem,50vh)] overflow-auto whitespace-pre-wrap rounded-lg border border-border/60 bg-muted/20 p-3 font-mono text-sm leading-6 text-foreground">
                          {testResult.content || "模型未返回内容。"}
                        </div>
                      </div>

                      <div className="grid gap-4 xl:grid-cols-2">
                        <div>
                          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                            <p className="text-sm font-medium text-foreground">Request Payload</p>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-8 gap-1 text-xs text-muted-foreground"
                              onClick={() =>
                                void copyText(
                                  JSON.stringify(testResult.requestPayloadRedacted ?? {}, null, 2),
                                  "已复制 Request JSON",
                                )
                              }
                            >
                              <Copy className="h-3.5 w-3.5" />
                              复制
                            </Button>
                          </div>
                          <JsonPreview value={testResult.requestPayloadRedacted} />
                        </div>
                        <div>
                          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                            <p className="text-sm font-medium text-foreground">Response Payload</p>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-8 gap-1 text-xs text-muted-foreground"
                              onClick={() =>
                                void copyText(
                                  JSON.stringify(testResult.responsePayloadRedacted ?? {}, null, 2),
                                  "已复制 Response JSON",
                                )
                              }
                            >
                              <Copy className="h-3.5 w-3.5" />
                              复制
                            </Button>
                          </div>
                          <JsonPreview value={testResult.responsePayloadRedacted} />
                        </div>
                      </div>
                    </div>
                  ) : (
                    <StatePanel
                      status="empty"
                      title="尚未执行 AI 测试"
                      description="填写 Agent / Provider / Model / Prompt 后执行真实调用，在此查看结果与日志跳转。"
                    />
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
