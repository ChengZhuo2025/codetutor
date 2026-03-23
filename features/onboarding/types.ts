export type Level = "beginner" | "intermediate" | "advanced"

export type ToolColor = "brand" | "chart-3" | "chart-5" | "gold"

export type OnboardingTool = {
  id: string
  name: string
  category: string
  desc: string
  popular: boolean
  color: ToolColor
}

export type OnboardingLevel = {
  id: Level
  label: string
  desc: string
}
