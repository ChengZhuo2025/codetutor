"use client"

import { useEffect, useMemo, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { APP_EVENTS } from "@/constants/events"
import { ROUTES } from "@/constants/routes"
import { StatePanel } from "@/components/ui/state-panel"
import { LevelSelectionStep } from "@/features/onboarding/components/level-selection-step"
import { OnboardingHeader } from "@/features/onboarding/components/onboarding-header"
import { PathSelectionStep } from "@/features/onboarding/components/path-selection-step"
import { ToolSelectionStep } from "@/features/onboarding/components/tool-selection-step"
import type {
  Level,
  OnboardingSelectionMode,
  OnboardingStep,
  OnboardingToolGroup,
} from "@/features/onboarding/types"
import {
  colorMap,
  onboardingPresets,
  selectedBorderMap,
} from "@/features/onboarding/data/onboarding-data"
import type {
  GetOnboardingPathOptionsResponseData,
  GetOnboardingToolsResponseData,
} from "@/lib/api/contracts/onboarding"
import type { LearningCurrentSessionResponseData } from "@/lib/api/contracts/learning"
import { requestData } from "@/lib/api/client"
import { createSupabaseBrowserClient } from "@/lib/supabase/client"
import { useAppEventTracker } from "@/providers/app-providers"
import type { ApiRequestState } from "@/types/api"

export function OnboardingPage() {
  const router = useRouter()
  const { trackEvent } = useAppEventTracker()
  const [step, setStep] = useState<OnboardingStep>(1)
  const [selectedToolCode, setSelectedToolCode] = useState<string | null>(null)
  const [level, setLevel] = useState<Level | null>(null)
  const [selectionMode, setSelectionMode] = useState<OnboardingSelectionMode | null>(null)
  const [selectedPathId, setSelectedPathId] = useState<string | null>(null)
  const [toolGroupsState, setToolGroupsState] =
    useState<ApiRequestState<GetOnboardingToolsResponseData>>({
      status: "loading",
    })
  const [pathOptionsState, setPathOptionsState] =
    useState<ApiRequestState<GetOnboardingPathOptionsResponseData>>({
      status: "empty",
      message: "请先选好主工具与基础水平，再查看可选路线。",
    })
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const [isCheckingAccess, setIsCheckingAccess] = useState(true)

  const levels = onboardingPresets.levels
  const toolGroups: OnboardingToolGroup[] =
    toolGroupsState.status === "success"
      ? toolGroupsState.data.groups.map((group) => ({
          groupCode: group.groupCode,
          groupName: group.groupName,
          tools: group.tools.map((tool) => ({
            id: tool.id,
            code: tool.code,
            name: tool.name,
            category: tool.category,
            desc: tool.summary,
            popular: tool.popular,
            color: tool.color,
          })),
        }))
      : []
  const tools = toolGroups.flatMap((group) =>
    group.tools.map((tool) => ({
      id: tool.id,
      code: tool.code,
      name: tool.name,
      category: tool.category,
      desc: tool.desc,
      popular: tool.popular,
      color: tool.color,
    })),
  )

  const selectedTool = useMemo(
    () => tools.find((tool) => tool.code === selectedToolCode) ?? null,
    [selectedToolCode, tools],
  )

  const selectedLevel = useMemo(
    () => levels.find((item) => item.id === level) ?? null,
    [level, levels],
  )

  const pathOptions = pathOptionsState.status === "success" ? pathOptionsState.data : null

  useEffect(() => {
    let cancelled = false

    async function checkExistingActivePlan() {
      try {
        const supabase = createSupabaseBrowserClient()
        const {
          data: { session },
        } = await supabase.auth.getSession()

        if (!session?.access_token) {
          if (!cancelled) {
            setIsCheckingAccess(false)
          }
          return
        }

        await requestData<LearningCurrentSessionResponseData>("/learning/current-session")

        if (!cancelled) {
          router.replace(ROUTES.learn)
        }
      } catch {
        if (!cancelled) {
          setIsCheckingAccess(false)
        }
      }
    }

    void checkExistingActivePlan()

    return () => {
      cancelled = true
    }
  }, [router])

  useEffect(() => {
    if (isCheckingAccess) {
      return
    }

    let cancelled = false

    async function loadToolGroups() {
      try {
        const data = await requestData<GetOnboardingToolsResponseData>("/onboarding/tools")

        if (cancelled) {
          return
        }

        setToolGroupsState(
          data.groups.length > 0
            ? {
                status: "success",
                data,
              }
            : {
                status: "empty",
                message: "暂无可用的学习工具，请稍后再试。若持续出现，请联系管理员。",
              },
        )
      } catch (error) {
        if (cancelled) {
          return
        }

        setToolGroupsState({
          status: "error",
          message: error instanceof Error ? error.message : "工具列表加载失败，请检查网络后重试。",
        })
      }
    }

    loadToolGroups()

    return () => {
      cancelled = true
    }
  }, [isCheckingAccess])

  useEffect(() => {
    if (isCheckingAccess) {
      return
    }

    let cancelled = false

    if (!selectedToolCode || !level) {
      return
    }

    const toolCode = selectedToolCode
    const learningLevel = level

    async function loadPathOptions() {
      try {
        if (!cancelled) {
          setPathOptionsState({
            status: "loading",
          })
        }

        const searchParams = new URLSearchParams({
          toolCode,
          learningLevel,
        })
        const data = await requestData<GetOnboardingPathOptionsResponseData>(
          `/onboarding/path-options?${searchParams.toString()}`,
        )

        if (cancelled) {
          return
        }

        setPathOptionsState({
          status: "success",
          data,
        })
      } catch (error) {
        if (cancelled) {
          return
        }

        setPathOptionsState({
          status: "error",
          message: error instanceof Error ? error.message : "路线加载失败，请稍后重试。",
        })
      }
    }

    loadPathOptions()

    return () => {
      cancelled = true
    }
  }, [isCheckingAccess, level, selectedToolCode])

  const goToStep = (nextStep: OnboardingStep) => {
    startTransition(() => {
      setStep(nextStep)
    })
  }

  const handleToolSelect = (toolCode: string) => {
    setSelectedToolCode(toolCode)
    setSelectionMode(null)
    setSelectedPathId(null)
    setSubmitError(null)
    setPathOptionsState({
      status: "empty",
      message: "请先选好主工具与基础水平，再查看可选路线。",
    })
  }

  const handleLevelSelect = (nextLevel: Level) => {
    setLevel(nextLevel)
    setSelectionMode(null)
    setSelectedPathId(null)
    setSubmitError(null)
    setPathOptionsState({
      status: "empty",
      message: "正在加载可选路线…",
    })
  }

  if (isCheckingAccess || toolGroupsState.status !== "success") {
    return (
      <div className="relative flex min-h-screen flex-col overflow-hidden bg-background">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,oklch(0.73_0.21_261/0.08),transparent_26%),radial-gradient(circle_at_bottom_right,oklch(0.8_0.18_60/0.08),transparent_20%)]" />

        <OnboardingHeader step={step} />

        <div className="relative z-10 flex flex-1 items-center justify-center px-6 py-10">
          <div className="w-full max-w-xl">
            <StatePanel
              status={isCheckingAccess ? "loading" : toolGroupsState.status}
              title={
                isCheckingAccess
                  ? "正在检查当前学习计划"
                  : toolGroupsState.status === "loading"
                  ? "正在加载工具列表"
                  : toolGroupsState.status === "error"
                    ? "工具列表加载失败"
                    : "暂无可选工具"
              }
              description={
                isCheckingAccess
                  ? "如果你已有进行中的学习计划，将直接回到学习工作台。"
                  : toolGroupsState.message
              }
              actionLabel={
                !isCheckingAccess && toolGroupsState.status === "error" ? "重试" : undefined
              }
              onAction={
                !isCheckingAccess && toolGroupsState.status === "error"
                  ? () => window.location.reload()
                  : undefined
              }
            />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-background">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,oklch(0.73_0.21_261/0.08),transparent_26%),radial-gradient(circle_at_bottom_right,oklch(0.8_0.18_60/0.08),transparent_20%)]" />

      <OnboardingHeader step={step} />

      <div className="relative z-10 flex-1 overflow-hidden scrollbar-none">
        <div
          className="flex h-full overflow-hidden transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]"
          style={{
            transform: `translateX(-${((step - 1) * 100) / 3}%)`,
            width: "300%",
          }}
        >
          <ToolSelectionStep
            toolGroups={toolGroups}
            colorMap={colorMap}
            selectedBorderMap={selectedBorderMap}
            selectedToolCode={selectedToolCode}
            onSelectTool={handleToolSelect}
            onNext={() => {
              if (!selectedToolCode) return

              trackEvent(APP_EVENTS.onboardingSubmit, {
                step: 1,
                selectedToolCode,
              })
              goToStep(2)
            }}
          />

          <LevelSelectionStep
            selectedTool={selectedTool}
            levels={levels}
            level={level}
            colorMap={colorMap}
            isPending={isPending}
            onSelectLevel={handleLevelSelect}
            onBack={() => goToStep(1)}
            onNext={() => {
              if (!selectedToolCode || !level) return

              trackEvent(APP_EVENTS.onboardingSubmit, {
                step: 2,
                selectedToolCode,
                level,
              })
              goToStep(3)
            }}
          />

          <PathSelectionStep
            selectedTool={selectedTool}
            levelLabel={selectedLevel?.label ?? "未选择"}
            selfStudyOption={
              pathOptions?.selfStudyOption ?? {
                id: "self-study",
                code: "self-study",
                name: "自主学习模式",
                sourceType: "self_directed",
                summary:
                  pathOptionsState.status === "loading"
                    ? "正在加载可选路线，请稍候…"
                    : pathOptionsState.status === "error"
                      ? pathOptionsState.message ?? "路线加载失败，请稍后重试。"
                      : "请先完成上一步（主工具 + 基础），再在这里选怎么学。",
                preview: [],
                inputTypes: [],
              }
            }
            presetPathOptions={pathOptions?.presetPathOptions ?? []}
            colorMap={colorMap}
            selectionMode={selectionMode}
            selectedPathId={selectedPathId}
            isPending={isPending}
            onSelectSelfStudy={() => {
              setSelectionMode("self_directed")
              setSelectedPathId(null)
            }}
            onSelectPresetPath={(pathId) => {
              setSelectionMode("preset_training")
              setSelectedPathId(pathId)
            }}
            onBack={() => goToStep(2)}
            onFinish={() => {
              if (!selectedToolCode || !level || !selectionMode) return

              startTransition(async () => {
                try {
                  setSubmitError(null)

                  const data = await requestData<{
                    redirectTo: string
                  }>("/onboarding/complete", {
                    method: "POST",
                    body: JSON.stringify({
                      toolCode: selectedToolCode,
                      learningLevel: level,
                      selectionMode,
                      selectedPathId: selectionMode === "preset_training" ? selectedPathId ?? undefined : undefined,
                    }),
                  })

                  trackEvent(APP_EVENTS.onboardingSubmit, {
                    step: 3,
                    selectedToolCode,
                    level,
                    selectionMode,
                    selectedPathId,
                  })

                  router.push(data.redirectTo ?? ROUTES.learn)
                } catch (error) {
                  setSubmitError(
                    error instanceof Error ? error.message : "保存你的选择失败，请稍后重试。",
                  )
                }
              })
            }}
          />
        </div>
        {submitError ? (
          <div className="pointer-events-none absolute inset-x-0 bottom-4 z-20 flex justify-center px-4">
            <div className="pointer-events-auto w-full max-w-xl">
              <StatePanel
                status="error"
                title="未能创建学习路线"
                description={submitError}
                compact
              />
            </div>
          </div>
        ) : null}
      </div>
    </div>
  )
}
