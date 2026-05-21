"use client"

import { useEffect, useMemo, useState } from "react"
import { Loader2, RefreshCw, Sparkles } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { CheckboxField } from "@/components/ui/checkbox"
import { USER_BUTTON_PRIMARY_CLASS } from "@/components/ui/surface-styles"
import { Input } from "@/components/ui/input"
import { PageSection } from "@/components/ui/page-section"
import { Textarea } from "@/components/ui/textarea"
import { apiClient } from "@/lib/api/client"
import type {
  LearningPlanDraftPatchRequestContract,
  LearningPlanDraftDetailResponseData,
  MaterialIntakeStatusResponseData,
  PlanDraftConfirmResponseData,
  PlanDraftRegenerateRequestContract,
  PlanFromMaterialResponseData,
} from "@/lib/api/contracts/learning"
import { cn } from "@/lib/utils"
import {
  isTransientMaterialPlanDraftLoadError,
  resolveMaterialPlanDraftLoadErrorMessage,
  resolveMaterialPlanStatusDisplay,
} from "@/features/learning/lib/material-plan-messages"

type MaterialPlanPanelProps = {
  onSessionRefresh: () => void
  className?: string
  defaultLinksText?: string
  defaultDraftId?: string | null
  defaultIntakeStatus?: MaterialIntakeStatusResponseData | null
  onDone?: () => void
  onGeneratingChange?: (isGenerating: boolean) => void
}

const ACTIVE_STATUSES = new Set([
  "queued",
  "extracting",
  "planning",
  "quality_checking",
])

function serializeCautions(
  cautions: Array<{ text: string; isTrap?: boolean }>,
) {
  return cautions
    .map((caution) => `${caution.isTrap ? "! " : ""}${caution.text}`)
    .join("\n")
}

function parseCautionsInput(value: string) {
  return value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const isTrap = line.startsWith("!")
      const text = (isTrap ? line.slice(1) : line).trim()
      return {
        text,
        ...(isTrap ? { isTrap: true } : {}),
      }
    })
}

function getQualityStatusMeta(status: string) {
  switch (status) {
    case "passed":
      return {
        label: "已通过",
        variant: "success" as const,
        description: "规则闸门已通过，计划可继续编辑或确认。",
      }
    case "pilot_fallback":
      return {
        label: "试点降级",
        variant: "warning" as const,
        description: "质量闸门建议先收缩为试点计划，避免基于弱证据生成过长路径。",
      }
    default:
      return {
        label: status || "未知",
        variant: "neutral" as const,
        description: "当前质量状态尚未完成判定。",
      }
  }
}

function getSelfCheckMeta(
  selfCheck: LearningPlanDraftDetailResponseData["qualityReport"] extends infer T
    ? T extends { selfCheck: infer S }
      ? S
      : never
    : never,
) {
  switch (selfCheck.decision) {
    case "pass":
      return {
        label: "模型自检通过",
        variant: "success" as const,
        description: selfCheck.reason ?? "小模型复核通过，未要求重试或收缩计划。",
      }
    case "retry":
      return {
        label: "模型建议重试",
        variant: "warning" as const,
        description: selfCheck.reason ?? "小模型认为计划仍需重试或补充证据。",
      }
    case "fallback":
      return {
        label: "模型建议降级",
        variant: "warning" as const,
        description: selfCheck.reason ?? "小模型建议直接收缩为试点计划。",
      }
    case "skipped":
      if (selfCheck.reason?.includes("低风险计划")) {
        return {
          label: "低风险跳过",
          variant: "info" as const,
          description: selfCheck.reason,
        }
      }

      if (selfCheck.reason?.includes("未配置")) {
        return {
          label: "未配置自检",
          variant: "neutral" as const,
          description: selfCheck.reason,
        }
      }

      return {
        label: "自检已跳过",
        variant: "warning" as const,
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

function getDraftTaskValidationError(
  draftDetail: LearningPlanDraftDetailResponseData,
) {
  for (const task of draftDetail.tasks) {
    if (task.lessonBrief.trim().length < 20) {
      return `第 ${task.taskNo} 步“先理解方法”需要写成可读的新手教案。`
    }

    if (task.submissionGuide.trim().length < 10) {
      return `第 ${task.taskNo} 步“提交说明”需要明确用户做完后提交什么。`
    }

    const checkpointCount = task.checkpoints.filter((item) => item.trim().length > 0).length
    if (checkpointCount < 2) {
      return `第 ${task.taskNo} 步“AI 检查点”至少保留 2 条。`
    }

    const masteryPointCount = task.masteryPoints.filter((item) => item.trim().length > 0).length
    if (masteryPointCount < 2) {
      return `第 ${task.taskNo} 步“当前任务要掌握”至少保留 2 条。`
    }

    const cautionCount = task.cautions.filter((item) => item.text.trim().length > 0).length
    if (cautionCount < 1) {
      return `第 ${task.taskNo} 步“注意事项”至少保留 1 条。`
    }
  }

  return null
}

export function MaterialPlanPanel({
  onSessionRefresh,
  className,
  defaultLinksText,
  defaultDraftId,
  defaultIntakeStatus,
  onDone,
  onGeneratingChange,
}: MaterialPlanPanelProps) {
  const [linksText, setLinksText] = useState(defaultLinksText ?? "")
  const [userGoal, setUserGoal] = useState("")
  const [weeklyHours, setWeeklyHours] = useState("")
  const [currentConstraints, setCurrentConstraints] = useState("")
  const [intakeStatus, setIntakeStatus] = useState<MaterialIntakeStatusResponseData | null>(
    defaultIntakeStatus ?? null,
  )
  const [draftDetail, setDraftDetail] = useState<LearningPlanDraftDetailResponseData | null>(null)
  const [busyAction, setBusyAction] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [displayProgressPercent, setDisplayProgressPercent] = useState(0)

  const isIntakeGenerating = intakeStatus
    ? ACTIVE_STATUSES.has(intakeStatus.status)
    : false
  const isGeneratingPlan =
    isIntakeGenerating || busyAction === "generate" || busyAction === "regenerate"
  const sourceProgressPercent = intakeStatus?.progressPercent ?? 0
  const cappedSourceProgressPercent = isIntakeGenerating
    ? Math.min(95, sourceProgressPercent)
    : sourceProgressPercent
  const renderedProgressPercent = isGeneratingPlan
    ? displayProgressPercent
    : sourceProgressPercent
  const loadingProgressMessage =
    intakeStatus?.progressMessage ?? "AI 正在整理教程内容和学习步骤"
  const statusDisplay = resolveMaterialPlanStatusDisplay({
    status: intakeStatus?.status,
    progressMessage: intakeStatus?.progressMessage,
    errorCode: intakeStatus?.errorCode,
    errorMessage: intakeStatus?.errorMessage,
  })
  const shouldShowIntakeError =
    !draftDetail && intakeStatus?.status === "failed"

  const resolveMaterialPlanErrorMessage = (
    code: string | undefined,
    fallback: string,
  ) => {
    switch (code) {
      case "MATERIAL_SINGLE_LINK_ONLY":
        return "一次仅支持 1 条教程链接。请保留最核心的一条后再生成。"
      case "MATERIAL_LINK_INVALID_URL":
        return "链接格式不正确，请粘贴完整的 http(s) 教程链接。"
      case "MATERIAL_UNSUPPORTED_SOURCE":
        return "当前首版支持 MDN、Next.js、web.dev，以及公开的抖音、小红书、B 站教程链接。"
      default:
        return fallback
    }
  }

  const resolveUnknownMaterialPlanErrorMessage = (error: unknown, fallback: string) =>
    error instanceof Error ? error.message : fallback

  const parseLinks = useMemo(
    () => () =>
      linksText
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean),
    [linksText],
  )

  async function loadDraftDetail(draftId: string) {
    const retryDelays = [800, 1600, 2400]
    let res = await apiClient.get<LearningPlanDraftDetailResponseData>(
      `/learning/plan-drafts/${draftId}`,
    )

    for (const delay of retryDelays) {
      if (res.code === "OK" || !isTransientMaterialPlanDraftLoadError(res.code, res.message)) {
        break
      }

      setError(resolveMaterialPlanDraftLoadErrorMessage(res.code, res.message))
      await new Promise((resolve) => {
        window.setTimeout(resolve, delay)
      })
      res = await apiClient.get<LearningPlanDraftDetailResponseData>(
        `/learning/plan-drafts/${draftId}`,
      )
    }

    if (res.code !== "OK" || !res.data) {
      setError(resolveMaterialPlanDraftLoadErrorMessage(res.code, res.message))
      return
    }

    setLinksText(res.data.inputContext.links.join("\n"))
    setUserGoal(res.data.inputContext.userGoal ?? "")
    setWeeklyHours(
      res.data.inputContext.weeklyHours !== null
        ? String(res.data.inputContext.weeklyHours)
        : "",
    )
    setCurrentConstraints(res.data.inputContext.currentConstraints ?? "")
    setError(null)
    setDraftDetail(res.data)
  }

  useEffect(() => {
    if (!defaultDraftId || draftDetail) {
      return
    }

    const timer = window.setTimeout(() => {
      void loadDraftDetail(defaultDraftId)
    }, 0)

    return () => {
      window.clearTimeout(timer)
    }
  }, [defaultDraftId, draftDetail])

  useEffect(() => {
    if (!defaultIntakeStatus || draftDetail) {
      return
    }

    if (defaultIntakeStatus.status === "ready" && defaultIntakeStatus.draftId) {
      const timer = window.setTimeout(() => {
        void loadDraftDetail(defaultIntakeStatus.draftId as string)
      }, 0)

      return () => {
        window.clearTimeout(timer)
      }
    }
  }, [defaultIntakeStatus, draftDetail])

  useEffect(() => {
    onGeneratingChange?.(isGeneratingPlan)

    return () => {
      onGeneratingChange?.(false)
    }
  }, [isGeneratingPlan, onGeneratingChange])

  useEffect(() => {
    if (!isGeneratingPlan) {
      return
    }

    const syncTimer = window.setTimeout(() => {
      setDisplayProgressPercent((current) =>
        Math.max(current, Math.min(95, cappedSourceProgressPercent)),
      )
    }, 0)

    const timer = window.setInterval(() => {
      setDisplayProgressPercent((current) => {
        const floor = Math.min(95, cappedSourceProgressPercent)
        const base = Math.max(current, floor)

        if (base >= 95) {
          return 95
        }

        const increment = base < 35 ? 2 : base < 70 ? 1 : 0.35
        return Math.min(95, Number((base + increment).toFixed(2)))
      })
    }, 900)

    return () => {
      window.clearTimeout(syncTimer)
      window.clearInterval(timer)
    }
  }, [cappedSourceProgressPercent, isGeneratingPlan])

  useEffect(() => {
    if (!intakeStatus || !ACTIVE_STATUSES.has(intakeStatus.status)) {
      return
    }

    const timer = window.setInterval(async () => {
      const res = await apiClient.get<MaterialIntakeStatusResponseData>(
        `/learning/material-intakes/${intakeStatus.intakeId}`,
      )

      if (res.code !== "OK" || !res.data) {
        setError(resolveMaterialPlanErrorMessage(res.code, res.message ?? "读取进度失败。"))
        return
      }

      setIntakeStatus(res.data)

      if (res.data.status === "ready" && res.data.draftId) {
        window.clearInterval(timer)
        await loadDraftDetail(res.data.draftId)
      }
    }, 1500)

    return () => {
      window.clearInterval(timer)
    }
  }, [intakeStatus])

  const handleGenerate = async () => {
    setError(null)
    const links = parseLinks()
    if (links.length === 0) {
      setError("请至少粘贴一条 http(s) 教程链接（每行一条）。")
      return
    }
    if (links.length > 1) {
      setError("一次仅支持使用 1 条教程链接生成学习计划。")
      return
    }

    const wh = weeklyHours.trim()
    let weekly: number | undefined
    if (wh) {
      const parsed = Number(wh)
      if (!Number.isInteger(parsed) || parsed < 1 || parsed > 40) {
        setError("每周学时需为 1–40 的整数，或留空。")
        return
      }
      weekly = parsed
    }

    try {
      setBusyAction("generate")
      setDraftDetail(null)
      const res = await apiClient.post<PlanFromMaterialResponseData>(
        "/learning/plan-from-material",
        {
          links,
          userGoal: userGoal.trim() || undefined,
          weeklyHours: weekly,
          currentConstraints: currentConstraints.trim() || undefined,
        },
      )

      if (res.code !== "OK" || !res.data) {
        setError(resolveMaterialPlanErrorMessage(res.code, res.message ?? "生成失败，请稍后重试。"))
        return
      }

      setIntakeStatus({
        intakeId: res.data.intakeId,
        status: res.data.status,
        processingStage: res.data.status,
        progressPercent: 0,
        progressMessage: "已提交，等待开始处理。",
        draftId: res.data.draftId,
        runId: res.data.runId,
        errorCode: null,
        errorMessage: null,
      })

      if (res.data.status === "ready" && res.data.draftId) {
        await loadDraftDetail(res.data.draftId)
      }
    } catch (error) {
      setError(resolveUnknownMaterialPlanErrorMessage(error, "生成失败，请稍后重试。"))
    } finally {
      setBusyAction(null)
    }
  }

  const handleConfirm = async () => {
    if (!draftDetail) {
      return
    }

    try {
      setError(null)
      setBusyAction("confirm")
      const res = await apiClient.post<PlanDraftConfirmResponseData>(
        `/learning/plan-drafts/${draftDetail.draftId}/confirm`,
        {},
      )

      if (res.code !== "OK" || !res.data) {
        setError(resolveMaterialPlanErrorMessage(res.code, res.message ?? "确认失败。"))
        return
      }

      setDraftDetail(null)
      setIntakeStatus(null)
      onSessionRefresh()
      onDone?.()
    } catch (error) {
      setError(resolveUnknownMaterialPlanErrorMessage(error, "确认失败。"))
    } finally {
      setBusyAction(null)
    }
  }

  const handleSaveDraft = async () => {
    if (!draftDetail) {
      return
    }

    const validationError = getDraftTaskValidationError(draftDetail)
    if (validationError) {
      setError(validationError)
      return
    }

    try {
      setError(null)
      setBusyAction("save")
      const body: LearningPlanDraftPatchRequestContract = {
        title: draftDetail.title,
        goal: draftDetail.goal,
        tasks: draftDetail.tasks.map((task) => ({
          id: task.id,
          title: task.title,
          objective: task.objective,
          lessonBrief: task.lessonBrief,
          practiceSteps: task.practiceSteps,
          submissionGuide: task.submissionGuide,
          checkpoints: task.checkpoints,
          acceptanceCriteria: task.acceptanceCriteria,
          estimatedMinutes: task.estimatedMinutes,
          masteryPoints: task.masteryPoints,
          cautions: task.cautions,
          recommendedForWeek1: task.recommendedForWeek1,
        })),
      }

      const res = await apiClient.patch<LearningPlanDraftDetailResponseData>(
        `/learning/plan-drafts/${draftDetail.draftId}`,
        body,
      )

      if (res.code !== "OK" || !res.data) {
        setError(res.message ?? "保存草稿失败。")
        return
      }

      setDraftDetail(res.data)
    } catch (error) {
      setError(resolveUnknownMaterialPlanErrorMessage(error, "保存草稿失败。"))
    } finally {
      setBusyAction(null)
    }
  }

  const handleRegenerateDraft = async () => {
    if (!draftDetail) {
      return
    }

    try {
      setError(null)
      setBusyAction("regenerate")
      const links = parseLinks()
      if (links.length > 1) {
        setError("一次仅支持使用 1 条教程链接生成学习计划。")
        return
      }

      const body: PlanDraftRegenerateRequestContract = {
        userGoal: userGoal.trim() || undefined,
        currentConstraints: currentConstraints.trim() || undefined,
      }
      if (links.length > 0) {
        body.links = links
      }
      const wh = weeklyHours.trim()
      if (wh) {
        const parsed = Number(wh)
        if (!Number.isInteger(parsed) || parsed < 1 || parsed > 40) {
          setError("每周学时需为 1–40 的整数，或留空。")
          return
        }
        body.weeklyHours = parsed
      }

      const res = await apiClient.post<PlanFromMaterialResponseData>(
        `/learning/plan-drafts/${draftDetail.draftId}/regenerate`,
        body,
      )

      if (res.code !== "OK" || !res.data) {
        setError(resolveMaterialPlanErrorMessage(res.code, res.message ?? "重新生成失败。"))
        return
      }

      setDraftDetail(null)
      setIntakeStatus({
        intakeId: res.data.intakeId,
        status: res.data.status,
        processingStage: res.data.status,
        progressPercent: 0,
        progressMessage: "已提交重生成任务，等待开始处理。",
        draftId: res.data.draftId,
        runId: res.data.runId,
        errorCode: null,
        errorMessage: null,
      })
    } catch (error) {
      setError(resolveUnknownMaterialPlanErrorMessage(error, "重新生成失败。"))
    } finally {
      setBusyAction(null)
    }
  }

  const handleRegenerateTask = async (taskId: string) => {
    if (!draftDetail) {
      return
    }

    try {
      setError(null)
      setBusyAction(`task:${taskId}`)
      const res = await apiClient.post<LearningPlanDraftDetailResponseData>(
        `/learning/plan-drafts/${draftDetail.draftId}/tasks/${taskId}/regenerate`,
        {},
      )

      if (res.code !== "OK" || !res.data) {
        setError(res.message ?? "单任务重生成失败。")
        return
      }

      setDraftDetail(res.data)
    } catch (error) {
      setError(resolveUnknownMaterialPlanErrorMessage(error, "单任务重生成失败。"))
    } finally {
      setBusyAction(null)
    }
  }

  return (
    <PageSection
      className={cn("relative max-w-full min-w-0 shrink-0", className)}
      eyebrow="自学路径"
      title="用教程链接生成学习计划"
      description="提交后会进入异步处理。首版支持 MDN、Next.js、web.dev，以及公开的抖音、小红书、B 站教程链接。确认后会替换当前进行中的自学计划。"
      bodyClassName="space-y-4"
      aria-busy={isGeneratingPlan}
    >
      {isGeneratingPlan ? (
        <div className="absolute inset-0 z-20 flex items-start justify-center rounded-2xl border border-brand/12 bg-[linear-gradient(135deg,oklch(0.985_0.004_270/0.82),oklch(0.94_0.018_178/0.78)_46%,oklch(0.985_0.004_270/0.86))] px-4 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.7)] backdrop-blur-sm dark:border-brand/18 dark:bg-[linear-gradient(135deg,oklch(0.13_0.012_270/0.9),oklch(0.18_0.03_178/0.84)_48%,oklch(0.12_0.01_270/0.9))] sm:py-6">
          <div className="pointer-events-none absolute inset-0 rounded-2xl bg-[linear-gradient(to_right,oklch(0.55_0.03_270/0.08)_1px,transparent_1px),linear-gradient(to_bottom,oklch(0.55_0.03_270/0.08)_1px,transparent_1px)] bg-[size:28px_28px] opacity-45 dark:opacity-20" />
          <div className="sticky top-4 w-full max-w-md rounded-2xl border border-brand/20 bg-surface-1/96 p-5 shadow-[0_24px_80px_-42px_rgba(15,23,42,0.55)] ring-1 ring-black/[0.04] dark:border-brand/18 dark:bg-[oklch(0.18_0.012_270/0.96)] dark:ring-white/10 sm:top-6">
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-brand/24 bg-brand/12 text-brand">
                <Loader2 className="size-5 animate-spin" aria-hidden />
              </div>
              <div className="min-w-0">
                <p className="text-base font-semibold text-foreground">正在生成学习计划</p>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">
                  {loadingProgressMessage}
                </p>
              </div>
            </div>

            <div className="mt-5 flex items-center justify-between gap-3">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                生成进度
              </p>
              <p className="text-sm font-medium text-foreground">
                {Math.round(renderedProgressPercent)}%
              </p>
            </div>
            <div className="relative mt-2 h-2.5 overflow-hidden rounded-full bg-muted">
              <div
                className="relative h-full overflow-hidden rounded-full bg-brand transition-all duration-700 ease-out"
                style={{ width: `${renderedProgressPercent}%` }}
              >
                <div className="absolute inset-y-0 w-16 animate-[material-plan-progress-shine_1.4s_ease-in-out_infinite] bg-white/35 blur-[1px]" />
              </div>
            </div>
            <p className="mt-3 text-xs leading-5 text-muted-foreground">
              生成会在后台继续处理。你可以先关闭弹框，回到学习工作台后会自动恢复进度。
            </p>
          </div>
        </div>
      ) : null}

      <div className="min-w-0 space-y-2">
        <p className="text-xs font-medium text-muted-foreground">教程链接（仅 1 条）</p>
        <Textarea
          value={linksText}
          onChange={(e) => setLinksText(e.target.value)}
          placeholder={"https://developer.mozilla.org/..."}
          rows={2}
          disabled={busyAction !== null}
          variant="code"
        />
      </div>

      <div className="grid min-w-0 gap-3 sm:grid-cols-2">
        <div className="space-y-2 sm:col-span-2">
          <p className="text-xs font-medium text-muted-foreground">学习目标补充（可选）</p>
          <Textarea
            value={userGoal}
            onChange={(e) => setUserGoal(e.target.value)}
          placeholder="例如：希望两周内能独立改一个现有页面的交互。"
          rows={2}
          disabled={busyAction !== null}
        />
        </div>
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground">每周可投入（小时，可选）</p>
          <Input
            type="number"
            min={1}
            max={40}
            value={weeklyHours}
            onChange={(e) => setWeeklyHours(e.target.value)}
            disabled={busyAction !== null}
            placeholder="例如 6"
          />
        </div>
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground">当前约束（可选）</p>
          <Input
            value={currentConstraints}
            onChange={(e) => setCurrentConstraints(e.target.value)}
            disabled={busyAction !== null}
            placeholder="例如 2 周内完成、优先项目实战"
          />
        </div>
      </div>

      {error ? (
        <p className="rounded-xl border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          size="lg"
          onClick={() => void handleGenerate()}
          disabled={busyAction !== null}
        >
          {busyAction === "generate" ? (
            <Loader2 className="size-4 animate-spin" aria-hidden />
          ) : (
            <Sparkles className="size-4" aria-hidden />
          )}
          提交生成
        </Button>

        {draftDetail ? (
          <>
            <Button
              type="button"
              size="lg"
              variant="secondary"
              onClick={() => void handleSaveDraft()}
              disabled={busyAction !== null}
            >
              {busyAction === "save" ? (
                <Loader2 className="size-4 animate-spin" aria-hidden />
              ) : null}
              保存草稿
            </Button>
            <Button
              type="button"
              size="lg"
              variant="secondary"
              onClick={() => void handleRegenerateDraft()}
              disabled={busyAction !== null}
            >
              {busyAction === "regenerate" ? (
                <Loader2 className="size-4 animate-spin" aria-hidden />
              ) : (
                <RefreshCw className="size-4" aria-hidden />
              )}
              全量重生成
            </Button>
            <Button
              type="button"
              size="lg"
              className={USER_BUTTON_PRIMARY_CLASS}
              onClick={() => void handleConfirm()}
              disabled={busyAction !== null}
            >
              {busyAction === "confirm" ? (
                <Loader2 className="size-4 animate-spin" aria-hidden />
              ) : null}
              启用这个计划
            </Button>
          </>
        ) : null}
      </div>

      {intakeStatus ? (
        <div className="rounded-2xl border border-border/50 bg-surface-1/80 p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                异步进度
              </p>
              <p className="mt-1 text-sm font-medium text-foreground">
                {statusDisplay.progressMessage}
              </p>
            </div>
            <p className="text-sm text-muted-foreground">
              {Math.round(renderedProgressPercent)}%
            </p>
          </div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-brand transition-all"
              style={{ width: `${renderedProgressPercent}%` }}
            />
          </div>
          {shouldShowIntakeError ? (
            <p className="mt-3 text-sm text-destructive">{statusDisplay.errorMessage}</p>
          ) : null}
        </div>
      ) : null}

      {draftDetail ? (
        <div className="space-y-4 rounded-2xl border border-border/50 bg-surface-1/80 p-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <p className="text-xs font-medium text-muted-foreground">计划标题</p>
              <Input
                value={draftDetail.title}
                onChange={(e) =>
                  setDraftDetail((current) =>
                    current ? { ...current, title: e.target.value } : current,
                  )
                }
                disabled={busyAction !== null}
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <p className="text-xs font-medium text-muted-foreground">计划目标</p>
              <Textarea
                value={draftDetail.goal ?? ""}
                onChange={(e) =>
                  setDraftDetail((current) =>
                    current ? { ...current, goal: e.target.value } : current,
                  )
                }
                rows={2}
                disabled={busyAction !== null}
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
            <span>revision #{draftDetail.revisionNo}</span>
            <span>质量：{draftDetail.qualityStatus}</span>
            <span>状态：{draftDetail.status}</span>
          </div>

          {draftDetail.qualityReport ? (
            <div className="space-y-3 rounded-2xl border border-border/50 bg-background/70 p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-foreground">质量闸门</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    区分规则检查结果、模型自检状态，以及是否触发试点降级。
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Badge
                    variant={getQualityStatusMeta(draftDetail.qualityReport.status).variant}
                    size="lg"
                  >
                    {getQualityStatusMeta(draftDetail.qualityReport.status).label}
                  </Badge>
                  <Badge
                    variant={getSelfCheckMeta(draftDetail.qualityReport.selfCheck).variant}
                    size="lg"
                  >
                    {getSelfCheckMeta(draftDetail.qualityReport.selfCheck).label}
                  </Badge>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-border/50 bg-surface-1/70 p-3">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    规则结论
                  </p>
                  <p className="mt-2 text-sm text-foreground">
                    {getQualityStatusMeta(draftDetail.qualityReport.status).description}
                  </p>
                </div>
                <div className="rounded-2xl border border-border/50 bg-surface-1/70 p-3">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    模型自检
                  </p>
                  <p className="mt-2 text-sm text-foreground">
                    {getSelfCheckMeta(draftDetail.qualityReport.selfCheck).description}
                  </p>
                </div>
              </div>

              {draftDetail.qualityReport.fallbackReason ? (
                <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 p-3">
                  <p className="text-xs font-medium uppercase tracking-wide text-amber-700 dark:text-amber-300">
                    降级原因
                  </p>
                  <p className="mt-2 text-sm text-amber-700 dark:text-amber-200">
                    {draftDetail.qualityReport.fallbackReason}
                  </p>
                </div>
              ) : null}

              <div className="grid gap-2">
                {draftDetail.qualityReport.checks.map((check) => (
                  <div
                    key={check.code}
                    className="flex items-start justify-between gap-3 rounded-2xl border border-border/50 bg-surface-1/70 px-3 py-2"
                  >
                    <div>
                      <p className="text-sm font-medium text-foreground">{check.message}</p>
                      <p className="mt-1 text-[11px] uppercase tracking-wide text-muted-foreground">
                        {check.code}
                      </p>
                    </div>
                    <Badge variant={check.passed ? "success" : "warning"} size="md">
                      {check.passed ? "通过" : "未通过"}
                    </Badge>
                  </div>
                ))}
              </div>

              {draftDetail.qualityReport.warnings.length > 0 ? (
                <div className="space-y-2">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    质量提示
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {draftDetail.qualityReport.warnings.map((warning) => (
                      <Badge key={warning} variant="outline" size="lg">
                        {warning}
                      </Badge>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}

          <div className="space-y-3">
            {draftDetail.tasks.map((task) => (
              <div key={task.id} className="space-y-3 rounded-2xl border border-border/50 bg-background/70 p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-medium text-foreground">第 {task.taskNo} 步</p>
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    onClick={() => void handleRegenerateTask(task.id)}
                    disabled={busyAction !== null}
                  >
                    {busyAction === `task:${task.id}` ? (
                      <Loader2 className="size-4 animate-spin" aria-hidden />
                    ) : (
                      <RefreshCw className="size-4" aria-hidden />
                    )}
                    重生成此步
                  </Button>
                </div>

                <Input
                  value={task.title}
                  onChange={(e) =>
                    setDraftDetail((current) =>
                      current
                        ? {
                            ...current,
                            tasks: current.tasks.map((item) =>
                              item.id === task.id ? { ...item, title: e.target.value } : item,
                            ),
                          }
                        : current,
                    )
                  }
                  disabled={busyAction !== null}
                />

                <Textarea
                  value={task.objective}
                  onChange={(e) =>
                    setDraftDetail((current) =>
                      current
                        ? {
                            ...current,
                            tasks: current.tasks.map((item) =>
                              item.id === task.id ? { ...item, objective: e.target.value } : item,
                            ),
                          }
                        : current,
                    )
                  }
                  rows={2}
                  disabled={busyAction !== null}
                />

                <Textarea
                  value={task.lessonBrief}
                  onChange={(e) =>
                    setDraftDetail((current) =>
                      current
                        ? {
                            ...current,
                            tasks: current.tasks.map((item) =>
                              item.id === task.id ? { ...item, lessonBrief: e.target.value } : item,
                            ),
                          }
                        : current,
                    )
                  }
                  rows={3}
                  disabled={busyAction !== null}
                  placeholder="先理解方法：把教程干货改写成新手能理解的教案"
                />

                <Textarea
                  value={task.practiceSteps.join("\n")}
                  onChange={(e) =>
                    setDraftDetail((current) =>
                      current
                        ? {
                            ...current,
                            tasks: current.tasks.map((item) =>
                              item.id === task.id
                                ? {
                                    ...item,
                                    practiceSteps: e.target.value
                                      .split(/\r?\n/)
                                      .map((step) => step.trim())
                                      .filter(Boolean),
                                  }
                                : item,
                            ),
                          }
                        : current,
                    )
                  }
                  rows={3}
                  disabled={busyAction !== null}
                />

                <Textarea
                  value={task.submissionGuide}
                  onChange={(e) =>
                    setDraftDetail((current) =>
                      current
                        ? {
                            ...current,
                            tasks: current.tasks.map((item) =>
                              item.id === task.id
                                ? { ...item, submissionGuide: e.target.value }
                                : item,
                            ),
                          }
                        : current,
                    )
                  }
                  rows={2}
                  disabled={busyAction !== null}
                  placeholder="提交说明：告诉用户做完后该提交截图、代码、输出、Prompt 还是报错"
                />

                <Textarea
                  value={task.checkpoints.join("\n")}
                  onChange={(e) =>
                    setDraftDetail((current) =>
                      current
                        ? {
                            ...current,
                            tasks: current.tasks.map((item) =>
                              item.id === task.id
                                ? {
                                    ...item,
                                    checkpoints: e.target.value
                                      .split(/\r?\n/)
                                      .map((point) => point.trim())
                                      .filter(Boolean),
                                  }
                                : item,
                            ),
                          }
                        : current,
                    )
                  }
                  rows={3}
                  disabled={busyAction !== null}
                  placeholder={"AI 检查点（每行一条）\n例如：能看到成功运行截图\n例如：提交的 Prompt 包含目标和约束"}
                />

                <Textarea
                  value={task.acceptanceCriteria}
                  onChange={(e) =>
                    setDraftDetail((current) =>
                      current
                        ? {
                            ...current,
                            tasks: current.tasks.map((item) =>
                              item.id === task.id
                                ? { ...item, acceptanceCriteria: e.target.value }
                                : item,
                            ),
                          }
                        : current,
                    )
                  }
                  rows={2}
                  disabled={busyAction !== null}
                />

                <div className="grid gap-3 lg:grid-cols-2">
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-muted-foreground">当前任务要掌握（每行一条）</p>
                    <Textarea
                      value={task.masteryPoints.join("\n")}
                      onChange={(e) =>
                        setDraftDetail((current) =>
                          current
                            ? {
                                ...current,
                                tasks: current.tasks.map((item) =>
                                  item.id === task.id
                                    ? {
                                        ...item,
                                        masteryPoints: e.target.value
                                          .split(/\r?\n/)
                                          .map((point) => point.trim())
                                          .filter(Boolean),
                                      }
                                    : item,
                                ),
                              }
                            : current,
                        )
                      }
                      rows={4}
                      disabled={busyAction !== null}
                      placeholder={"例如：知道这一步要验证什么\n例如：能独立判断是否完成"}
                    />
                  </div>
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-muted-foreground">
                      注意事项（每行一条，`!` 开头表示卡点提醒）
                    </p>
                    <Textarea
                      value={serializeCautions(task.cautions)}
                      onChange={(e) =>
                        setDraftDetail((current) =>
                          current
                            ? {
                                ...current,
                                tasks: current.tasks.map((item) =>
                                  item.id === task.id
                                    ? {
                                        ...item,
                                        cautions: parseCautionsInput(e.target.value),
                                      }
                                    : item,
                                ),
                              }
                            : current,
                        )
                      }
                      rows={4}
                      disabled={busyAction !== null}
                      placeholder={"! 不要一上来大改结构\n先完成最小可验证结果"}
                    />
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <Input
                    type="number"
                    min={15}
                    max={240}
                    value={task.estimatedMinutes ?? ""}
                    onChange={(e) =>
                      setDraftDetail((current) =>
                        current
                          ? {
                              ...current,
                              tasks: current.tasks.map((item) =>
                                item.id === task.id
                                  ? {
                                      ...item,
                                      estimatedMinutes: e.target.value
                                        ? Number(e.target.value)
                                        : null,
                                    }
                                  : item,
                              ),
                            }
                          : current,
                      )
                    }
                    disabled={busyAction !== null}
                    placeholder="预计分钟数"
                  />
                  <CheckboxField
                    checked={task.recommendedForWeek1}
                    onCheckedChange={(checked) =>
                        setDraftDetail((current) =>
                          current
                            ? {
                                ...current,
                                tasks: current.tasks.map((item) =>
                                  item.id === task.id
                                    ? { ...item, recommendedForWeek1: checked }
                                    : item,
                                ),
                              }
                            : current,
                        )
                      }
                    disabled={busyAction !== null}
                    className="border-border/60 text-muted-foreground"
                  >
                    Week 1 推荐
                  </CheckboxField>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </PageSection>
  )
}
