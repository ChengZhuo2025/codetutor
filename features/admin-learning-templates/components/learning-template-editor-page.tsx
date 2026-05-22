"use client"

import { use, useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import {
  ArrowLeft,
  Bot,
  Check,
  Loader2,
  Plus,
  Save,
  Trash2,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { StatePanel } from "@/components/ui/state-panel"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { AdminSelect } from "@/features/admin-shell/components/admin-select"
import { useAdminSessionExpiryRedirect } from "@/features/admin-shell/lib/use-admin-session-expiry-redirect"
import {
  adminRequestData,
  getAdminApiErrorMessage,
  isAdminSessionExpiredError,
} from "@/lib/api/admin-bff-client"
import type {
  AdminLearningTemplateDetailResponseData,
  AdminLearningTemplateGenerateResponseData,
  AdminLearningTemplateStepInput,
  AdminLearningTemplateUpsertRequest,
} from "@/lib/api/contracts/admin-learning-templates"
import { ADMIN_ROUTES } from "@/constants/routes"
import { getLevelLabel, joinLines, learningTemplateLevelOptions, splitLines } from "../lib/view-model"

type EditorStep = AdminLearningTemplateStepInput & {
  localId: string
  knowledgePointsText: string
  keyPointsText: string
  pitfallsText: string
  practiceStepsText: string
  checkpointsText: string
}

type EditorState = {
  toolCode: string
  learningLevel: "beginner" | "intermediate" | "advanced"
  code: string
  name: string
  description: string
  previewText: string
  agentCode: string
  isActive: boolean
  changeReason: string
  steps: EditorStep[]
}

const emptyStep = (): EditorStep => ({
  localId: crypto.randomUUID(),
  stepId: null,
  title: "",
  summary: "",
  focus: "",
  goal: "",
  completionCriteria: "",
  reviewSummary: "",
  estimatedMinutes: 30,
  rewardScore: 20,
  knowledgePoints: [],
  keyPoints: [],
  pitfalls: [],
  lessonBrief: "",
  practiceSteps: [],
  submissionGuide: "",
  checkpoints: [],
  knowledgePointsText: "",
  keyPointsText: "",
  pitfallsText: "",
  practiceStepsText: "",
  checkpointsText: "",
})

const initialState: EditorState = {
  toolCode: "",
  learningLevel: "beginner",
  code: "",
  name: "",
  description: "",
  previewText: "",
  agentCode: "",
  isActive: true,
  changeReason: "管理后台保存自学模板",
  steps: [emptyStep()],
}

function toEditorStep(step: AdminLearningTemplateStepInput): EditorStep {
  return {
    ...emptyStep(),
    ...step,
    localId: step.stepId ?? crypto.randomUUID(),
    knowledgePointsText: joinLines(step.knowledgePoints ?? []),
    keyPointsText: joinLines(step.keyPoints ?? []),
    pitfallsText: joinLines(step.pitfalls ?? []),
    practiceStepsText: joinLines(step.practiceSteps ?? []),
    checkpointsText: joinLines(step.checkpoints ?? []),
  }
}

function toRequest(state: EditorState): AdminLearningTemplateUpsertRequest {
  return {
    toolCode: state.toolCode,
    learningLevel: state.learningLevel,
    code: state.code.trim() || null,
    name: state.name,
    description: state.description.trim() || null,
    preview: splitLines(state.previewText),
    agentCode: state.agentCode.trim() || null,
    isActive: state.isActive,
    changeReason: state.changeReason.trim() || "管理后台保存自学模板",
    steps: state.steps.map((step) => ({
      stepId: step.stepId ?? null,
      title: step.title,
      summary: step.summary,
      focus: step.focus || null,
      goal: step.goal,
      completionCriteria: step.completionCriteria || null,
      reviewSummary: step.reviewSummary || null,
      estimatedMinutes: step.estimatedMinutes ?? null,
      rewardScore: step.rewardScore,
      knowledgePoints: splitLines(step.knowledgePointsText),
      keyPoints: splitLines(step.keyPointsText),
      pitfalls: splitLines(step.pitfallsText),
      lessonBrief: step.lessonBrief || null,
      practiceSteps: splitLines(step.practiceStepsText),
      submissionGuide: step.submissionGuide || null,
      checkpoints: splitLines(step.checkpointsText),
    })),
  }
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {children}
    </div>
  )
}

export function LearningTemplateEditorPage({ params }: { params: Promise<{ templateId: string }> }) {
  const { templateId } = use(params)
  const isNew = templateId === "new"
  const router = useRouter()
  const searchParams = useSearchParams()
  const [state, setState] = useState<EditorState>(initialState)
  const [savedTemplateId, setSavedTemplateId] = useState<string | null>(isNew ? null : templateId)
  const [toolOptions, setToolOptions] = useState<Array<{ code: string; name: string }>>([])
  const [isLoading, setIsLoading] = useState(!isNew)
  const [isSaving, setIsSaving] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [generateOpen, setGenerateOpen] = useState(searchParams.get("generate") === "1")
  const [operatorGoal, setOperatorGoal] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [authExpired, setAuthExpired] = useState(false)

  useAdminSessionExpiryRedirect(authExpired)

  const fetchToolOptions = useCallback(async () => {
    const result = await adminRequestData<{ toolOptions: Array<{ code: string; name: string }> }>(
      "/admin/learning/templates?limit=1&page=1",
      { method: "GET" },
      "获取工具选项失败",
    )
    setToolOptions(result.toolOptions)
    if (isNew && result.toolOptions[0]) {
      setState((prev) => ({ ...prev, toolCode: prev.toolCode || result.toolOptions[0]!.code }))
    }
  }, [isNew])

  const fetchDetail = useCallback(async () => {
    if (isNew) {
      return
    }
    setIsLoading(true)
    setError(null)
    try {
      const result = await adminRequestData<AdminLearningTemplateDetailResponseData>(
        `/admin/learning/templates/${templateId}`,
        { method: "GET" },
        "获取模板详情失败",
      )
      setState({
        toolCode: result.template.toolCode,
        learningLevel: result.template.learningLevel,
        code: result.template.code,
        name: result.template.name,
        description: result.template.description ?? "",
        previewText: joinLines(result.template.preview),
        agentCode: result.template.agentCode ?? "",
        isActive: result.template.isActive,
        changeReason: "管理后台保存自学模板",
        steps: result.steps.map(toEditorStep),
      })
    } catch (fetchError) {
      setAuthExpired(isAdminSessionExpiredError(fetchError))
      setError(getAdminApiErrorMessage(fetchError, "获取模板详情失败"))
    } finally {
      setIsLoading(false)
    }
  }, [isNew, templateId])

  useEffect(() => {
    void fetchToolOptions().catch((fetchError) => {
      setAuthExpired(isAdminSessionExpiredError(fetchError))
      setError(getAdminApiErrorMessage(fetchError, "获取工具选项失败"))
    })
    void fetchDetail()
  }, [fetchDetail, fetchToolOptions])

  const selectedToolName = useMemo(
    () => toolOptions.find((item) => item.code === state.toolCode)?.name ?? state.toolCode,
    [state.toolCode, toolOptions],
  )
  const effectiveTemplateId = savedTemplateId ?? (isNew ? null : templateId)

  const updateStep = (localId: string, patch: Partial<EditorStep>) => {
    setState((prev) => ({
      ...prev,
      steps: prev.steps.map((step) => (step.localId === localId ? { ...step, ...patch } : step)),
    }))
  }

  const save = async () => {
    setIsSaving(true)
    setError(null)
    setNotice(null)
    try {
      const payload = toRequest(state)
      const isCreating = !effectiveTemplateId
      const result = await adminRequestData<AdminLearningTemplateDetailResponseData>(
        isCreating ? "/admin/learning/templates" : `/admin/learning/templates/${effectiveTemplateId}`,
        {
          method: isCreating ? "POST" : "PATCH",
          body: JSON.stringify(payload),
        },
        "保存模板失败",
      )
      setNotice("模板已保存。")
      if (isCreating) {
        setSavedTemplateId(result.template.templateId)
        router.replace(`${ADMIN_ROUTES.learningTemplates}/${result.template.templateId}`)
      }
      setState((prev) => ({
        ...prev,
        code: result.template.code,
        steps: result.steps.map(toEditorStep),
      }))
    } catch (saveError) {
      setAuthExpired(isAdminSessionExpiredError(saveError))
      setError(getAdminApiErrorMessage(saveError, "保存模板失败"))
    } finally {
      setIsSaving(false)
    }
  }

  const generate = async () => {
    setIsGenerating(true)
    setError(null)
    setNotice(null)
    try {
      const result = await adminRequestData<AdminLearningTemplateGenerateResponseData>(
        effectiveTemplateId
          ? `/admin/learning/templates/${effectiveTemplateId}/generate`
          : "/admin/learning/templates/generate",
        {
          method: "POST",
          body: JSON.stringify({
            toolCode: state.toolCode,
            learningLevel: state.learningLevel,
            operatorGoal: operatorGoal.trim() || null,
            currentTemplate: toRequest(state),
          }),
        },
        "AI 生成模板失败",
      )
      setState((prev) => ({
        ...prev,
        name: result.generated.name,
        description: result.generated.description,
        previewText: joinLines(result.generated.preview),
        steps: result.generated.steps.map(toEditorStep),
      }))
      setNotice(`AI 草稿已应用，模型 ${result.modelCode}，耗时 ${result.latencyMs}ms。`)
      setGenerateOpen(false)
    } catch (generateError) {
      setAuthExpired(isAdminSessionExpiredError(generateError))
      setError(getAdminApiErrorMessage(generateError, "AI 生成模板失败"))
    } finally {
      setIsGenerating(false)
    }
  }

  if (isLoading) {
    return <StatePanel status="loading" title="正在加载模板" description="请稍候。" />
  }

  if (error && !state.toolCode && !isNew) {
    return (
      <StatePanel
        status="error"
        title="模板加载失败"
        description={error}
        actionLabel="重试"
        onAction={() => void fetchDetail()}
      />
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <Button type="button" variant="ghost" size="sm" className="mb-2 px-0" asChild>
            <Link href={ADMIN_ROUTES.learningTemplates}>
              <ArrowLeft className="h-4 w-4" />
              返回模板列表
            </Link>
          </Button>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            {isNew ? "新建学习路径模板" : state.name || "编辑学习路径模板"}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {selectedToolName} · {getLevelLabel(state.learningLevel)} · 自学模式初始化模板
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" variant="outline" onClick={() => setGenerateOpen(true)}>
            <Bot className="h-4 w-4" />
            AI 生成
          </Button>
          <Button type="button" disabled={isSaving} onClick={() => void save()}>
            {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {isSaving ? "保存中" : "保存模板"}
          </Button>
        </div>
      </div>

      {notice ? <p className="rounded-lg border border-chart-2/20 bg-chart-2/10 px-4 py-3 text-sm text-chart-2">{notice}</p> : null}
      {error ? <p className="rounded-lg border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</p> : null}

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="space-y-4">
          <section className="rounded-2xl border border-border bg-card p-4">
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="工具">
                <AdminSelect
                  value={state.toolCode}
                  onValueChange={(value) => setState((prev) => ({ ...prev, toolCode: value }))}
                  options={toolOptions.map((item) => ({ value: item.code, label: item.name }))}
                  triggerClassName="h-10 w-full"
                />
              </Field>
              <Field label="水平">
                <AdminSelect
                  value={state.learningLevel}
                  onValueChange={(value) => setState((prev) => ({ ...prev, learningLevel: value as EditorState["learningLevel"] }))}
                  options={[...learningTemplateLevelOptions]}
                  triggerClassName="h-10 w-full"
                />
              </Field>
              <Field label="模板名称">
                <Input value={state.name} onChange={(event) => setState((prev) => ({ ...prev, name: event.target.value }))} />
              </Field>
              <Field label="模板 code">
                <Input variant="code" value={state.code} onChange={(event) => setState((prev) => ({ ...prev, code: event.target.value }))} placeholder="留空则自动生成" />
              </Field>
              <div className="md:col-span-2">
                <Field label="简介">
                  <Textarea value={state.description} onChange={(event) => setState((prev) => ({ ...prev, description: event.target.value }))} />
                </Field>
              </div>
              <div className="md:col-span-2">
                <Field label="首屏预览">
                  <Textarea value={state.previewText} onChange={(event) => setState((prev) => ({ ...prev, previewText: event.target.value }))} placeholder="每行一条" />
                </Field>
              </div>
            </div>
          </section>

          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-foreground">学习步骤</h2>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setState((prev) => ({ ...prev, steps: [...prev.steps, emptyStep()] }))}
              >
                <Plus className="h-4 w-4" />
                添加步骤
              </Button>
            </div>
            {state.steps.map((step, index) => (
              <div key={step.localId} className="rounded-2xl border border-border bg-card p-4">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-foreground">第 {index + 1} 步</p>
                    <p className="text-xs text-muted-foreground">{step.stepId ? "已保存步骤" : "新步骤"}</p>
                  </div>
                  <Button
                    type="button"
                    variant="destructiveSoft"
                    size="sm"
                    disabled={state.steps.length === 1}
                    onClick={() => setState((prev) => ({ ...prev, steps: prev.steps.filter((item) => item.localId !== step.localId) }))}
                  >
                    <Trash2 className="h-4 w-4" />
                    删除
                  </Button>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <Field label="标题">
                    <Input value={step.title} onChange={(event) => updateStep(step.localId, { title: event.target.value })} />
                  </Field>
                  <Field label="摘要">
                    <Input value={step.summary} onChange={(event) => updateStep(step.localId, { summary: event.target.value })} />
                  </Field>
                  <Field label="目标">
                    <Textarea value={step.goal} onChange={(event) => updateStep(step.localId, { goal: event.target.value })} />
                  </Field>
                  <Field label="教练提示">
                    <Textarea value={step.focus ?? ""} onChange={(event) => updateStep(step.localId, { focus: event.target.value })} />
                  </Field>
                  <Field label="完成标准">
                    <Textarea value={step.completionCriteria ?? ""} onChange={(event) => updateStep(step.localId, { completionCriteria: event.target.value })} />
                  </Field>
                  <Field label="复盘文案">
                    <Textarea value={step.reviewSummary ?? ""} onChange={(event) => updateStep(step.localId, { reviewSummary: event.target.value })} />
                  </Field>
                  <Field label="任务说明">
                    <Textarea value={step.lessonBrief ?? ""} onChange={(event) => updateStep(step.localId, { lessonBrief: event.target.value })} />
                  </Field>
                  <Field label="提交说明">
                    <Textarea value={step.submissionGuide ?? ""} onChange={(event) => updateStep(step.localId, { submissionGuide: event.target.value })} />
                  </Field>
                  <Field label="预计分钟">
                    <Input type="number" value={step.estimatedMinutes ?? ""} onChange={(event) => updateStep(step.localId, { estimatedMinutes: Number(event.target.value) || null })} />
                  </Field>
                  <Field label="奖励分">
                    <Input type="number" value={step.rewardScore} onChange={(event) => updateStep(step.localId, { rewardScore: Number(event.target.value) || 0 })} />
                  </Field>
                  <Field label="知识点">
                    <Textarea value={step.knowledgePointsText} onChange={(event) => updateStep(step.localId, { knowledgePointsText: event.target.value })} placeholder="每行一条" />
                  </Field>
                  <Field label="掌握点">
                    <Textarea value={step.keyPointsText} onChange={(event) => updateStep(step.localId, { keyPointsText: event.target.value })} placeholder="每行一条" />
                  </Field>
                  <Field label="易错点">
                    <Textarea value={step.pitfallsText} onChange={(event) => updateStep(step.localId, { pitfallsText: event.target.value })} placeholder="每行一条" />
                  </Field>
                  <Field label="练习步骤">
                    <Textarea value={step.practiceStepsText} onChange={(event) => updateStep(step.localId, { practiceStepsText: event.target.value })} placeholder="每行一条" />
                  </Field>
                  <div className="md:col-span-2">
                    <Field label="AI 检查点">
                      <Textarea value={step.checkpointsText} onChange={(event) => updateStep(step.localId, { checkpointsText: event.target.value })} placeholder="每行一条" />
                    </Field>
                  </div>
                </div>
              </div>
            ))}
          </section>
        </div>

        <aside className="space-y-4">
          <section className="rounded-2xl border border-border bg-card p-4">
            <h2 className="text-base font-semibold text-foreground">发布设置</h2>
            <div className="mt-4 flex items-center justify-between gap-3 rounded-lg border border-border bg-background/70 p-3">
              <div>
                <p className="text-sm font-medium text-foreground">启用模板</p>
                <p className="mt-1 text-xs text-muted-foreground">同一工具和水平只能有一个启用模板。</p>
              </div>
              <Switch checked={state.isActive} onCheckedChange={(checked) => setState((prev) => ({ ...prev, isActive: checked }))} />
            </div>
            <div className="mt-4 space-y-2">
              <Label>Agent code</Label>
              <Input value={state.agentCode} onChange={(event) => setState((prev) => ({ ...prev, agentCode: event.target.value }))} placeholder="可选" />
            </div>
            <div className="mt-4 space-y-2">
              <Label>变更原因</Label>
              <Textarea value={state.changeReason} onChange={(event) => setState((prev) => ({ ...prev, changeReason: event.target.value }))} />
            </div>
          </section>
          <section className="rounded-2xl border border-border bg-card p-4">
            <h2 className="text-base font-semibold text-foreground">模板摘要</h2>
            <div className="mt-4 space-y-3 text-sm text-muted-foreground">
              <p>工具：{selectedToolName || "未选择"}</p>
              <p>水平：{getLevelLabel(state.learningLevel)}</p>
              <p>步骤：{state.steps.length} 步</p>
              <p>预览：{splitLines(state.previewText).length} 条</p>
            </div>
          </section>
        </aside>
      </div>

      <Dialog open={generateOpen} onOpenChange={setGenerateOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>AI 生成模板草稿</DialogTitle>
            <DialogDescription>
              后台专用 agent 会返回结构化模板草稿，应用后仍需管理员保存。
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid gap-3 md:grid-cols-2">
              <div className="rounded-lg border border-border bg-muted/30 p-3 text-sm">
                <p className="font-medium text-foreground">工具</p>
                <p className="mt-1 text-muted-foreground">{selectedToolName || "未选择"}</p>
              </div>
              <div className="rounded-lg border border-border bg-muted/30 p-3 text-sm">
                <p className="font-medium text-foreground">水平</p>
                <p className="mt-1 text-muted-foreground">{getLevelLabel(state.learningLevel)}</p>
              </div>
            </div>
            <Field label="运营目标">
              <Textarea value={operatorGoal} onChange={(event) => setOperatorGoal(event.target.value)} placeholder="例如：适合第一次使用 Codex CLI 的非科班用户" />
            </Field>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setGenerateOpen(false)} disabled={isGenerating}>
              取消
            </Button>
            <Button type="button" onClick={() => void generate()} disabled={isGenerating || !state.toolCode}>
              {isGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              {isGenerating ? "生成中" : "生成并应用"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
