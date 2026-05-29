// 管理后台菜单配置
import {
  LayoutDashboard,
  Users,
  MessageSquare,
  Bell,
  BookOpen,
  Route,
  Bot,
  Server,
  Cpu,
  Network,
  Layers,
  Link2,
  Activity,
  FlaskConical,
  FolderCog,
  Image,
  Mic,
  Settings,
  ReceiptText,
  BarChart3,
  Globe2,
  FileText,
  HelpCircle,
  ScrollText,
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
    label: "消息中心",
    href: "/admin/notifications",
    icon: Bell,
    active: true,
  },
  {
    label: "学习运营",
    href: "/admin/learning",
    icon: BookOpen,
    active: true,
    children: [
      { label: "学习记录", href: "/admin/learning", icon: BookOpen, active: true },
      { label: "路径模板", href: "/admin/learning/templates", icon: Route, active: true },
    ],
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
    label: "多媒体管理",
    href: "/admin/ai/media",
    icon: FolderCog,
    active: true,
    children: [
      { label: "转译设置", href: "/admin/ai/media/transcription-settings", icon: Mic, active: true },
      { label: "附件管理", href: "/admin/ai/media/attachments", icon: Image, active: true },
    ],
  },
  {
    label: "财务管理",
    href: "/admin/finance",
    icon: ReceiptText,
    active: true,
    children: [
      { label: "订单列表", href: "/admin/finance/orders", icon: ReceiptText, active: true },
      { label: "财务统计", href: "/admin/finance/stats", icon: BarChart3, active: true },
    ],
  },
  {
    label: "站点信息",
    href: "/admin/site",
    icon: Globe2,
    active: true,
    children: [
      { label: "网站信息", href: "/admin/site/information", icon: Globe2, active: true },
      { label: "通用文章", href: "/admin/site/articles", icon: FileText, active: true },
      { label: "帮助中心", href: "/admin/site/help", icon: HelpCircle, active: true },
      { label: "更新日志", href: "/admin/site/changelog", icon: ScrollText, active: true },
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
