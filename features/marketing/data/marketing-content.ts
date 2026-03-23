import { Bot, Trophy, Upload } from "lucide-react"
import type {
  MarketingAudience,
  MarketingPlan,
  MarketingStep,
  MarketingTool,
} from "@/features/marketing/types"

export const marketingSteps: MarketingStep[] = [
  {
    step: "01",
    icon: Upload,
    title: "粘贴你想学的内容",
    description:
      "支持教程链接、视频链接、代码片段或直接提问。把你在 B 站、YouTube、公众号收藏的内容交给 AI。",
    color: "text-brand",
    bg: "bg-brand-dim border-brand/20",
  },
  {
    step: "02",
    icon: Bot,
    title: "AI 拆解成今天能做的步骤",
    description:
      "AI 导师识别你的水平，把内容转化为明确的下一步。用提问和引导带你推进，而不是直接给答案。",
    color: "text-chart-3",
    bg: "bg-chart-3/10 border-chart-3/20",
  },
  {
    step: "03",
    icon: Trophy,
    title: "完成步骤，积累段位",
    description:
      "每完成一步获得学分，从萌新码农进阶到 AI 编程大师。连续打卡保持学习节奏，清楚看到自己的成长。",
    color: "text-gold",
    bg: "bg-gold-dim border-gold/20",
  },
]

export const marketingTools: MarketingTool[] = [
  { name: "Cursor", tag: "图形化 IDE", color: "text-brand", dot: "bg-brand" },
  { name: "Claude Code", tag: "CLI 工具", color: "text-chart-3", dot: "bg-chart-3" },
  { name: "Codex CLI", tag: "CLI 工具", color: "text-chart-5", dot: "bg-chart-5" },
  { name: "Trae", tag: "图形化 IDE", color: "text-brand", dot: "bg-brand" },
  { name: "Windsurf", tag: "图形化 IDE", color: "text-chart-3", dot: "bg-chart-3" },
  { name: "Bolt.new", tag: "在线工具", color: "text-gold", dot: "bg-gold" },
  { name: "Lovable", tag: "在线工具", color: "text-gold", dot: "bg-gold" },
  { name: "Kiro", tag: "图形化 IDE", color: "text-chart-5", dot: "bg-chart-5" },
]

export const marketingAudiences: MarketingAudience[] = [
  { label: "产品经理", desc: "零代码基础，想用 AI 做出产品原型" },
  { label: "设计师", desc: "掌握前端实现，让设计稿真正跑起来" },
  { label: "创业者", desc: "快速验证 MVP，自己实现核心功能" },
  { label: "后端开发者", desc: "用 AI 工具提升全栈效率" },
]

export const marketingPlans: MarketingPlan[] = [
  {
    name: "免费版",
    price: "¥0",
    period: "",
    desc: "探索产品核心体验",
    highlight: false,
    features: [
      "每月 30 次 AI 对话",
      "工具选择与学习路径",
      "基础学分与段位系统",
      "学习进度追踪",
    ],
    cta: "免费开始",
    href: "/login",
  },
  {
    name: "个人版",
    price: "¥39",
    period: "/月",
    desc: "无限学习，持续陪练",
    highlight: true,
    features: [
      "无限 AI 导师对话",
      "完整学习进度追踪",
      "全部工具学习路径",
      "段位 + 连续打卡激励",
      "历史会话与知识点回顾",
    ],
    cta: "立即订阅",
    href: "/login",
  },
  {
    name: "专业版",
    price: "¥99",
    period: "/月",
    desc: "项目实战陪跑",
    highlight: false,
    features: [
      "个人版全部功能",
      "项目实战陪跑",
      "优先响应支持",
      "高级学习路径模版",
      "专属工具推荐",
    ],
    cta: "联系咨询",
    href: "/login",
  },
]
