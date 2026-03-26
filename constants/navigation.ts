import { BookOpen, Map, Trophy } from "lucide-react"
import { MARKETING_SECTIONS, ROUTES } from "@/constants/routes"
import type { DashboardNavItem, NavItem } from "@/types/navigation"

export const MARKETING_NAV_ITEMS: NavItem[] = [
  { label: "首页", href: MARKETING_SECTIONS.home },
  { label: "学习方式", href: MARKETING_SECTIONS.how },
  { label: "工具支持", href: MARKETING_SECTIONS.tools },
  { label: "学习收益", href: MARKETING_SECTIONS.benefits },
  { label: "套餐订阅", href: MARKETING_SECTIONS.pricing },
]

export function getDashboardNavItems(activeHref: string): DashboardNavItem[] {
  return [
    { icon: BookOpen,
      label: "今日练习",
      href: ROUTES.learn,
      active: activeHref === ROUTES.learn },
    { icon: Map,
      label: "闯关地图",
      href: ROUTES.map,
      active: activeHref === ROUTES.map },
    {
      icon: Trophy,
      label: "我的成就",
      href: ROUTES.achievements,
      active: activeHref === ROUTES.achievements,
    },
  ]
}
