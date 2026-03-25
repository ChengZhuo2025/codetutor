import type {
  Level,
  OnboardingLevel,
  OnboardingPresetPathOption,
  OnboardingSelectionMode,
  OnboardingSelfStudyOption,
  OnboardingTool,
  ToolColor,
} from "@/features/onboarding/types"

export type OnboardingToolGroupContract = {
  groupCode: string
  groupName: string
  tools: Array<{
    id: string
    code: string
    name: string
    difficultyLevel: Level
    summary: string
    category: string
    popular: boolean
    color: ToolColor
  }>
}

export type GetOnboardingToolsResponseData = {
  groups: OnboardingToolGroupContract[]
}

export type GetOnboardingPathOptionsRequest = {
  toolCode: string
  learningLevel: Level
}

export type GetOnboardingPathOptionsResponseData = {
  selfStudyOption: OnboardingSelfStudyOption
  presetPathOptions: OnboardingPresetPathOption[]
}

export type CompleteOnboardingRequest = {
  toolCode: string
  learningLevel: Level
  selectionMode: OnboardingSelectionMode
  selectedPathId?: string
}

export type CompleteOnboardingResponseData = {
  onboardingCompleted: boolean
  primaryToolCode: string
  learningLevel: Level
  selectionMode: OnboardingSelectionMode
  pathId?: string
  currentTaskId: string
  initialPreview: string[]
  redirectTo: string
}

export type OnboardingPresetContract = {
  levels: OnboardingLevel[]
  toolCards: OnboardingTool[]
}
