"use client"

import { useCallback, useState } from "react"
import { Loader2, RefreshCw, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { PageSection } from "@/components/ui/page-section"
import { Textarea } from "@/components/ui/textarea"
import { apiClient } from "@/lib/api/client"
import type {
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

export function MaterialPlanPanel({
  onSessionRefresh,
  className,
  defaultLinksText,
  onDone,
}: MaterialPlanPanelProps) {
  const [linksText, setLinksText] = useState(defaultLinksText ?? "")
  const [userGoal, setUserGoal] = useState("")
  const [weeklyHours, setWeeklyHours] = useState("")
  const [draftId, setDraftId] = useState<string | null>(null)
  const [preview, setPreview] = useState<PlanFromMaterialResponseData["preview"] | null>(
    null,
  )
  const [busy, setBusy] = useState<"generate" | "confirm" | "regenerate" | null>(null)
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
      case "MATERIAL_UNSUPPORTED_DOMAIN":
        return "当前仅支持 developer.mozilla.org、nextjs.org、web.dev。"
      default:
        return fallback
    }
  }

  const parseLinks = useCallback(() => {
    return linksText
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
  }, [linksText])

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
      const n = Number(wh)
      if (!Number.isInteger(n) || n < 1 || n > 40) {
        setError("每周学时需为 1–40 的整数，或留空。")
        return
      }
      weekly = n
    }

    setBusy("generate")
    const res = await apiClient.post<PlanFromMaterialResponseData>(
      "/learning/plan-from-material",
      {
        links,
        userGoal: userGoal.trim() || undefined,
        weeklyHours: weekly,
      },
    )
    setBusy(null)

    if (res.code !== "OK" || !res.data) {
      setError(resolveMaterialPlanErrorMessage(res.code, res.message ?? "生成失败，请稍后重试。"))
      return
    }

    setDraftId(res.data.draftId)
    setPreview(res.data.preview)
  }

  const handleConfirm = async () => {
    if (!draftId) {
      return
    }
    setError(null)
    setBusy("confirm")
    const res = await apiClient.post<PlanDraftConfirmResponseData>(
      `/learning/plan-drafts/${draftId}/confirm`,
      {},
    )
    setBusy(null)

    if (res.code !== "OK" || !res.data) {
      setError(resolveMaterialPlanErrorMessage(res.code, res.message ?? "确认失败。"))
      return
    }

    setDraftId(null)
    setPreview(null)
    onSessionRefresh()
    onDone?.()
  }

  const handleRegenerate = async () => {
    if (!draftId) {
      return
    }
    setError(null)
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
      const n = Number(wh)
      if (Number.isInteger(n) && n >= 1 && n <= 40) {
        body.weeklyHours = n
      }
    }

    setBusy("regenerate")
    const res = await apiClient.post<PlanFromMaterialResponseData>(
      `/learning/plan-drafts/${draftId}/regenerate`,
      body,
    )
    setBusy(null)

    if (res.code !== "OK" || !res.data) {
      setError(resolveMaterialPlanErrorMessage(res.code, res.message ?? "重新生成失败。"))
      return
    }

    setDraftId(res.data.draftId)
    setPreview(res.data.preview)
  }

  return (
    <PageSection
      className={cn("shrink-0", className)}
      eyebrow="自学路径"
      title="用教程链接生成学习计划"
      description="当前仅支持 developer.mozilla.org、nextjs.org、web.dev。确认后会替换当前进行中的自学计划。"
      bodyClassName="space-y-4"
    >
      <div className="space-y-2">
        <p className="text-xs font-medium text-muted-foreground">教程链接（仅 1 条）</p>
        <Textarea
          value={linksText}
          onChange={(e) => setLinksText(e.target.value)}
          placeholder={"https://developer.mozilla.org/..."}
          rows={2}
          disabled={busy !== null}
          className="min-h-[88px] resize-y font-mono text-sm bg-background"
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
            disabled={busy !== null}
            className="resize-y text-sm bg-background"
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
            disabled={busy !== null}
            className="h-10 rounded-xl border-border/70 bg-background text-sm"
            placeholder="例如 6"
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
          disabled={busy !== null}
        >
          {busy === "generate" ? (
            <Loader2 className="size-4 animate-spin" aria-hidden />
          ) : (
            <Sparkles className="size-4" aria-hidden />
          )}
          生成计划预览
        </Button>
        {draftId && preview ? (
          <>
            <Button
              type="button"
              size="lg"
              variant="secondary"
              onClick={() => void handleRegenerate()}
              disabled={busy !== null}
            >
              {busy === "regenerate" ? (
                <Loader2 className="size-4 animate-spin" aria-hidden />
              ) : (
                <RefreshCw className="size-4" aria-hidden />
              )}
              重新生成
            </Button>
            <Button
              type="button"
              size="lg"
              variant="default"
              className="bg-brand text-brand-foreground hover:bg-brand/90"
              onClick={() => void handleConfirm()}
              disabled={busy !== null}
            >
              {busy === "confirm" ? (
                <Loader2 className="size-4 animate-spin" aria-hidden />
              ) : null}
              启用这个计划
            </Button>
          </>
        ) : null}
      </div>

      {preview ? (
        <div className="space-y-3 rounded-2xl border border-border/50 bg-surface-1/80 p-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              计划预览
            </p>
            <h3 className="mt-1 text-base font-semibold text-foreground">{preview.title}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{preview.goal}</p>
          </div>
          <ol className="list-decimal space-y-3 pl-5 text-sm">
            {preview.tasks.map((task) => (
              <li key={task.taskNo} className="marker:font-medium">
                <span className="font-medium text-foreground">{task.title}</span>
                <p className="mt-1 text-muted-foreground">{task.objective}</p>
                <ul className="mt-1 list-disc pl-4 text-muted-foreground">
                  {task.practiceSteps.map((step, i) => (
                    <li key={i}>{step}</li>
                  ))}
                </ul>
                <p className="mt-1 text-xs text-muted-foreground">
                  验收：{task.acceptanceCriteria}
                </p>
              </li>
            ))}
          </ol>
        </div>
      ) : null}
    </PageSection>
  )
}
