"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { APP_EVENTS } from "@/constants/events"
import { ROUTES } from "@/constants/routes"
import { OnboardingHeader } from "@/features/onboarding/components/onboarding-header"
import { LevelSelectionStep } from "@/features/onboarding/components/level-selection-step"
import { ToolSelectionStep } from "@/features/onboarding/components/tool-selection-step"
import type { Level } from "@/features/onboarding/types"
import { useAppEventTracker } from "@/providers/app-providers"

export function OnboardingPage() {
  const router = useRouter()
  const { trackEvent } = useAppEventTracker()
  const [step, setStep] = useState<1 | 2>(1)
  const [selectedTools, setSelectedTools] = useState<string[]>([])
  const [level, setLevel] = useState<Level | null>(null)
  const [isPending, startTransition] = useTransition()

  const toggleTool = (id: string) => {
    setSelectedTools((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    )
  }

  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-background">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,oklch(0.78_0.15_180/0.08),transparent_26%),radial-gradient(circle_at_bottom_right,oklch(0.8_0.18_60/0.08),transparent_20%)]" />

      <OnboardingHeader step={step} />

      <div className="relative z-10 flex-1 overflow-hidden scrollbar-none">
        <div
          className="flex h-full overflow-hidden transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]"
          style={{
            transform: step === 1 ? "translateX(0%)" : "translateX(-50%)",
            width: "200%",
          }}
        >
          <ToolSelectionStep
            selectedTools={selectedTools}
            onToggleTool={toggleTool}
            onNext={() =>
              selectedTools.length > 0 &&
              startTransition(() => {
                trackEvent(APP_EVENTS.onboardingSubmit, {
                  step: 1,
                  selectedToolCount: selectedTools.length,
                })
                setStep(2)
              })
            }
          />
          <LevelSelectionStep
            selectedTools={selectedTools}
            level={level}
            isPending={isPending}
            onSelectLevel={setLevel}
            onBack={() =>
              startTransition(() => {
                setStep(1)
              })
            }
            onFinish={() => {
              if (!level) return

              trackEvent(APP_EVENTS.onboardingSubmit, {
                step: 2,
                selectedToolCount: selectedTools.length,
                level,
              })
              router.push(ROUTES.learn)
            }}
          />
        </div>
      </div>
    </div>
  )
}
