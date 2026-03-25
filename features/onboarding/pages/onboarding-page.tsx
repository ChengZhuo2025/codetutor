"use client"

import { useMemo, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { APP_EVENTS } from "@/constants/events"
import { ROUTES } from "@/constants/routes"
import { LevelSelectionStep } from "@/features/onboarding/components/level-selection-step"
import { OnboardingHeader } from "@/features/onboarding/components/onboarding-header"
import { PathSelectionStep } from "@/features/onboarding/components/path-selection-step"
import { ToolSelectionStep } from "@/features/onboarding/components/tool-selection-step"
import type { Level, OnboardingSelectionMode, OnboardingStep } from "@/features/onboarding/types"
import { getOnboardingPageMock, getOnboardingPathOptionsMock } from "@/lib/api/mock"
import { useAppEventTracker } from "@/providers/app-providers"

export function OnboardingPage() {
  const router = useRouter()
  const { trackEvent } = useAppEventTracker()
  const [step, setStep] = useState<OnboardingStep>(1)
  const [selectedToolCode, setSelectedToolCode] = useState<string | null>(null)
  const [level, setLevel] = useState<Level | null>(null)
  const [selectionMode, setSelectionMode] = useState<OnboardingSelectionMode | null>(null)
  const [selectedPathId, setSelectedPathId] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const { colorMap, levels, selectedBorderMap, toolGroups, tools } = getOnboardingPageMock()

  const selectedTool = useMemo(
    () => tools.find((tool) => tool.code === selectedToolCode) ?? null,
    [selectedToolCode, tools],
  )

  const selectedLevel = useMemo(
    () => levels.find((item) => item.id === level) ?? null,
    [level, levels],
  )

  const pathOptions =
    selectedToolCode && level ? getOnboardingPathOptionsMock(selectedToolCode, level) : null

  const goToStep = (nextStep: OnboardingStep) => {
    startTransition(() => {
      setStep(nextStep)
    })
  }

  const handleToolSelect = (toolCode: string) => {
    setSelectedToolCode(toolCode)
    setSelectionMode(null)
    setSelectedPathId(null)
  }

  const handleLevelSelect = (nextLevel: Level) => {
    setLevel(nextLevel)
    setSelectionMode(null)
    setSelectedPathId(null)
  }

  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-background">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,oklch(0.78_0.15_180/0.08),transparent_26%),radial-gradient(circle_at_bottom_right,oklch(0.8_0.18_60/0.08),transparent_20%)]" />

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
                name: "自学模式",
                sourceType: "self_directed",
                summary: "先完成上一步后再选择你的学习方式。",
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

              trackEvent(APP_EVENTS.onboardingSubmit, {
                step: 3,
                selectedToolCode,
                level,
                selectionMode,
                selectedPathId,
              })
              router.push(ROUTES.learn)
            }}
          />
        </div>
      </div>
    </div>
  )
}
