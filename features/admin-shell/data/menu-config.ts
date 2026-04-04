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
    label: "用户运营",
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
    label: "学习运营",
    href: "/admin/learning",
    icon: BookOpen,
    active: false,
  },
  {
    label: "AI 运营",
    href: "/admin/ai",
    icon: Bot,
    active: false,
    children: [
      { label: "AI 概览", href: "/admin/ai", icon: Activity, active: false },
      { label: "Provider 管理", href: "/admin/ai/providers", icon: Server, active: false },
      { label: "Model 管理", href: "/admin/ai/models", icon: Cpu, active: false },
      { label: "Agent 管理", href: "/admin/ai/agents", icon: Network, active: false },
      { label: "命中规则", href: "/admin/ai/bindings", icon: Link2, active: false },
      { label: "Skill 管理", href: "/admin/ai/skills", icon: Layers, active: false },
      { label: "调用日志", href: "/admin/ai/invocations", icon: Activity, active: false },
      { label: "测试调试", href: "/admin/ai/test", icon: FlaskConical, active: false },
    ],
  },
  {
    label: "系统设置",
    href: "/admin/settings",
    icon: Settings,
    active: false,
  },
]

export const brandIcon = Zap
