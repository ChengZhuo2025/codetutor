import type {
  Level,
  OnboardingLevel,
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

export type SelectToolRequest = {
  learningLevel: Level
  toolCode: string
}

export type SelectToolResponseData = {
  pathId: string
  currentTaskId: string
  initialPreview: string[]
}

export type OnboardingPresetContract = {
  levels: OnboardingLevel[]
  toolCards: OnboardingTool[]
}
