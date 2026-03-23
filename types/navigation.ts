import type { LucideIcon } from "lucide-react"

export type NavItem = {
  href: string
  label: string
}

export type DashboardNavItem = NavItem & {
  icon: LucideIcon
  active?: boolean
}
