import type { LucideIcon } from "lucide-react"

export type Message = {
  id: number
  role: "user" | "ai"
  content: string
  xp?: number
  nextStep?: string
}

export type LearnSidebarNavItem = {
  href: string
  label: string
  icon: LucideIcon
  active: boolean
}

export type RecentSession = {
  title: string
  time: string
  done: boolean
}

export type LearningTask = {
  id: number
  label: string
  done: boolean
  current?: boolean
  locked?: boolean
}

export type LearningKnowledgeTag = {
  label: string
  color: string
}
