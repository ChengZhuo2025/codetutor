import type { LucideIcon } from "lucide-react"

export type MarketingStep = {
  step: string
  icon: LucideIcon
  title: string
  description: string
  color: string
  bg: string
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
