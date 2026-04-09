"use client"

import { useEffect, useMemo, useState } from "react"
import { Loader2, RefreshCw, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { PageSection } from "@/components/ui/page-section"
import { Textarea } from "@/components/ui/textarea"
import { apiClient } from "@/lib/api/client"
import type {
  LearningPlanDraftPatchRequestContract,
  LearningPlanDraftDetailResponseData,
  MaterialIntakeStatusResponseData,
  PlanDraftConfirmResponseData,
  PlanFromMaterialResponseData,
} from "@/lib/api/contracts/learning"
import { cn } from "@/lib/utils"

type MaterialPlanPanelProps = {
  onSessionRefresh: () => void
  className?: string
  defaultLinksText?: string
  onDone?: () => void
}

const ACTIVE_STATUSES = new Set([
  "queued",
  "extracting",
  "planning",
  "quality_checking",
])

export function MaterialPlanPanel({
  onSessionRefresh,
  className,
  defaultLinksText,
  onDone,
}: MaterialPlanPanelProps) {
  const [linksText, setLinksText] = useState(defaultLinksText ?? "")
  const [userGoal, setUserGoal] = useState("")
  const [weeklyHours, setWeeklyHours] = useState("")
  const [currentConstraints, setCurrentConstraints] = useState("")
  const [intakeStatus, setIntakeStatus] = useState<MaterialIntakeStatusResponseData | null>(null)
  const [draftDetail, setDraftDetail] = useState<LearningPlanDraftDetailResponseData | null>(null)
  const [busyAction, setBusyAction] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

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

  const parseLinks = useMemo(
    () => () =>
      linksText
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean),
    [linksText],
  )

  async function loadDraftDetail(draftId: string) {
    const res = await apiClient.get<LearningPlanDraftDetailResponseData>(
      `/learning/plan-drafts/${draftId}`,
    )

    if (res.code !== "OK" || !res.data) {
      setError(res.message ?? "读取学习计划草稿失败。")
      return
    }

    setDraftDetail(res.data)
  }

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
    setBusyAction(null)

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
  }

  const handleConfirm = async () => {
    if (!draftDetail) {
      return
    }

    setError(null)
    setBusyAction("confirm")
    const res = await apiClient.post<PlanDraftConfirmResponseData>(
      `/learning/plan-drafts/${draftDetail.draftId}/confirm`,
      {},
    )
    setBusyAction(null)

    if (res.code !== "OK" || !res.data) {
      setError(resolveMaterialPlanErrorMessage(res.code, res.message ?? "确认失败。"))
      return
    }

    setDraftDetail(null)
    setIntakeStatus(null)
    onSessionRefresh()
    onDone?.()
  }

  const handleSaveDraft = async () => {
    if (!draftDetail) {
      return
    }

    setError(null)
    setBusyAction("save")
    const body: LearningPlanDraftPatchRequestContract = {
      title: draftDetail.title,
      goal: draftDetail.goal,
      tasks: draftDetail.tasks.map((task) => ({
        id: task.id,
        title: task.title,
        objective: task.objective,
        practiceSteps: task.practiceSteps,
        acceptanceCriteria: task.acceptanceCriteria,
        estimatedMinutes: task.estimatedMinutes,
        recommendedForWeek1: task.recommendedForWeek1,
      })),
    }

    const res = await apiClient.patch<LearningPlanDraftDetailResponseData>(
      `/learning/plan-drafts/${draftDetail.draftId}`,
      body,
    )
    setBusyAction(null)

    if (res.code !== "OK" || !res.data) {
      setError(res.message ?? "保存草稿失败。")
      return
    }

    setDraftDetail(res.data)
  }

  const handleRegenerateDraft = async () => {
    if (!draftDetail) {
      return
    }

    setError(null)
    setBusyAction("regenerate")
    const links = parseLinks()
    const body: {
      links?: string[]
      userGoal?: string
      weeklyHours?: number
    } = {
      userGoal: userGoal.trim() || undefined,
    }
    if (links.length > 0) {
      body.links = links
    }
    const wh = weeklyHours.trim()
    if (wh) {
      const parsed = Number(wh)
      if (Number.isInteger(parsed) && parsed >= 1 && parsed <= 40) {
        body.weeklyHours = parsed
      }
    }

    const res = await apiClient.post<PlanFromMaterialResponseData>(
      `/learning/plan-drafts/${draftDetail.draftId}/regenerate`,
      body,
    )
    setBusyAction(null)

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
  }

  const handleRegenerateTask = async (taskId: string) => {
    if (!draftDetail) {
      return
    }

    setError(null)
    setBusyAction(`task:${taskId}`)
    const res = await apiClient.post<LearningPlanDraftDetailResponseData>(
      `/learning/plan-drafts/${draftDetail.draftId}/tasks/${taskId}/regenerate`,
      {},
    )
    setBusyAction(null)

    if (res.code !== "OK" || !res.data) {
      setError(res.message ?? "单任务重生成失败。")
      return
    }

    setDraftDetail(res.data)
  }

  return (
    <PageSection
      className={cn("shrink-0", className)}
      eyebrow="自学路径"
      title="用教程链接生成学习计划"
      description="提交后会进入异步处理。首版支持 MDN、Next.js、web.dev，以及公开的抖音、小红书、B 站教程链接。确认后会替换当前进行中的自学计划。"
      bodyClassName="space-y-4"
    >
      <div className="space-y-2">
        <p className="text-xs font-medium text-muted-foreground">教程链接（仅 1 条）</p>
        <Textarea
          value={linksText}
          onChange={(e) => setLinksText(e.target.value)}
          placeholder={"https://developer.mozilla.org/..."}
          rows={2}
          disabled={busyAction !== null}
          className="min-h-[88px] resize-y bg-background font-mono text-sm"
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-2 sm:col-span-2">
          <p className="text-xs font-medium text-muted-foreground">学习目标补充（可选）</p>
          <Textarea
            value={userGoal}
            onChange={(e) => setUserGoal(e.target.value)}
            placeholder="例如：希望两周内能独立改一个现有页面的交互。"
            rows={2}
            disabled={busyAction !== null}
            className="resize-y bg-background text-sm"
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
            className="h-10 rounded-xl border-border/70 bg-background text-sm"
            placeholder="例如 6"
          />
        </div>
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground">当前约束（可选）</p>
          <Input
            value={currentConstraints}
            onChange={(e) => setCurrentConstraints(e.target.value)}
            disabled={busyAction !== null}
            className="h-10 rounded-xl border-border/70 bg-background text-sm"
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
              className="bg-brand text-brand-foreground hover:bg-brand/90"
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
                {intakeStatus.progressMessage ?? "处理中"}
              </p>
            </div>
            <p className="text-sm text-muted-foreground">
              {intakeStatus.progressPercent ?? 0}%
            </p>
          </div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-brand transition-all"
              style={{ width: `${intakeStatus.progressPercent ?? 0}%` }}
            />
          </div>
          {intakeStatus.errorMessage ? (
            <p className="mt-3 text-sm text-destructive">{intakeStatus.errorMessage}</p>
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

          <div className="space-y-3">
            {draftDetail.tasks.map((task) => (
              <div key={task.id} className="space-y-3 rounded-2xl border border-border/50 bg-background/70 p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-medium text-foreground">第 {task.taskNo} 关</p>
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
                    重生成此关
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
                  <label className="flex items-center gap-2 rounded-xl border border-border/60 px-3 text-sm text-muted-foreground">
                    <input
                      type="checkbox"
                      checked={task.recommendedForWeek1}
                      onChange={(e) =>
                        setDraftDetail((current) =>
                          current
                            ? {
                                ...current,
                                tasks: current.tasks.map((item) =>
                                  item.id === task.id
                                    ? { ...item, recommendedForWeek1: e.target.checked }
                                    : item,
                                ),
                              }
                            : current,
                        )
                      }
                      disabled={busyAction !== null}
                    />
                    Week 1 推荐
                  </label>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </PageSection>
  )
}
