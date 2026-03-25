export type Level = "beginner" | "intermediate" | "advanced"

export type OnboardingStep = 1 | 2 | 3

export type ToolColor = "brand" | "chart-3" | "chart-5" | "gold"

export type OnboardingTool = {
  id: string
  code: string
  name: string
  category: string
  desc: string
  popular: boolean
  color: ToolColor
}

export type OnboardingToolGroup = {
  groupCode: string
  groupName: string
  tools: OnboardingTool[]
}

export type OnboardingLevel = {
  id: Level
  label: string
  desc: string
}

export type OnboardingSelectionMode = "self_directed" | "preset_training"

export type OnboardingSelfStudyOption = {
  id: string
  code: string
  name: string
  sourceType: "self_directed"
  summary: string
  preview: string[]
  inputTypes: string[]
}

export type OnboardingPresetPathOption = {
  pathId: string
  code: string
  name: string
  sourceType: "preset_training"
  stageCount: number
  summary: string
  recommended: boolean
  currentLevelFit: string
  coachAgentLabel: string
  estimatedDuration: string
  tags: string[]
  preview: string[]
}
