// 管理后台菜单配置
import {
  LayoutDashboard,
  Users,
  MessageSquare,
  BookOpen,
  Bot,
  Server,
  Cpu,
  Network,
  Layers,
  Link2,
  Activity,
  FlaskConical,
  Settings,
  Zap,
} from "lucide-react"
import type { MenuItem } from "../types"

export const menuItems: MenuItem[] = [
  {
    label: "总览看板",
    href: "/admin",
    icon: LayoutDashboard,
    active: true,
  },
  {
    label: "用户管理",
    href: "/admin/users",
    icon: Users,
    active: true,
  },
  {
    label: "反馈工单",
    href: "/admin/feedback",
    icon: MessageSquare,
    active: true,
  },
  {
    label: "学习记录",
    href: "/admin/learning",
    icon: BookOpen,
    active: true,
  },
  {
    label: "Ai 管理",
    href: "/admin/ai",
    icon: Bot,
    active: true,
    children: [
      { label: "AI 概览", href: "/admin/ai", icon: Activity, active: true },
      { label: "Provider 管理", href: "/admin/ai/providers", icon: Server, active: true },
      { label: "Model 管理", href: "/admin/ai/models", icon: Cpu, active: true },
      { label: "Agent 管理", href: "/admin/ai/agents", icon: Network, active: true },
      { label: "命中规则", href: "/admin/ai/bindings", icon: Link2, active: true },
      { label: "Skill 管理", href: "/admin/ai/skills", icon: Layers, active: true },
      { label: "调用日志", href: "/admin/ai/invocations", icon: Activity, active: true },
      { label: "测试调试", href: "/admin/ai/test", icon: FlaskConical, active: true },
    ],
  },
  {
    label: "系统设置",
    href: "/admin/settings",
    icon: Settings,
    active: true,
  },
]

export const brandIcon = Zap
