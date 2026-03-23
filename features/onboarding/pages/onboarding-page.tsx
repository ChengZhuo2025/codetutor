"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { ROUTES } from "@/constants/routes"
import { OnboardingHeader } from "@/features/onboarding/components/onboarding-header"
import { LevelSelectionStep } from "@/features/onboarding/components/level-selection-step"
import { ToolSelectionStep } from "@/features/onboarding/components/tool-selection-step"
import type { Level } from "@/features/onboarding/types"

export function OnboardingPage() {
  const router = useRouter()
  const [step, setStep] = useState<1 | 2>(1)
  const [selectedTools, setSelectedTools] = useState<string[]>([])
  const [level, setLevel] = useState<Level | null>(null)

  const toggleTool = (id: string) => {
    setSelectedTools((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    )
  }

  return (
    <div className="flex min-h-screen flex-col overflow-hidden bg-background">
      <OnboardingHeader step={step} />

      <div className="flex-1 overflow-hidden">
        <div
          className="flex h-full transition-transform duration-500 ease-in-out"
          style={{
            transform: step === 1 ? "translateX(0%)" : "translateX(-50%)",
            width: "200%",
          }}
        >
          <ToolSelectionStep
            selectedTools={selectedTools}
            onToggleTool={toggleTool}
            onNext={() => selectedTools.length > 0 && setStep(2)}
          />
          <LevelSelectionStep
            selectedTools={selectedTools}
            level={level}
            onSelectLevel={setLevel}
            onBack={() => setStep(1)}
            onFinish={() => level && router.push(ROUTES.learn)}
          />
        </div>
      </div>
    </div>
  )
}
