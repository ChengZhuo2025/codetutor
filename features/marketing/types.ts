import type { LucideIcon } from "lucide-react"

export type MarketingStep = {
  step: string
  icon: LucideIcon
  title: string
  description: string
  color: string
  panelClassName: string
  iconPanelClassName: string
}

export type MarketingTool = {
  name: string
  tag: string
  color: string
  dot: string
}

export type MarketingAudience = {
  label: string
  desc: string
}

export type MarketingConversationMessage = {
  id: string
  speaker: "user" | "ai" | "system"
  title: string
  body: string
  meta?: string
}

export type MarketingFitNote = {
  title: string
  desc: string
}

export type MarketingBenefit = {
  icon: LucideIcon
  title: string
  desc: string
  color: string
  bgColor: string
  borderColor: string
}

export type MarketingPlan = {
  name: string
  price: string
  period: string
  desc: string
  highlight: boolean
  features: string[]
  cta: string
  href: string
}
