import { Bot, CheckCircle2, MessageCircle, Trophy, TrendingUp, Upload } from "lucide-react"
import type {
  MarketingAudience,
  MarketingBenefit,
  MarketingConversationMessage,
  MarketingFitNote,
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
      "支持教程链接、视频链接、代码片段、截图或直接提问。把你在抖音、 B站、TikTok、YouTube、公众号收藏的教程内容发给 AI。",
    color: "text-brand",
    panelClassName:
      "border-white/10 bg-[linear-gradient(180deg,oklch(0.27_0.03_205/0.88),oklch(0.2_0.02_240/0.92))] shadow-[0_24px_70px_-45px_oklch(0.78_0.15_180/0.42)]",
    iconPanelClassName: "border-brand/20 bg-brand/12",
  },
  {
    step: "02",
    icon: Bot,
    title: "AI 拆解成今天能做的步骤",
    description:
      "AI 导师识别你的水平，把内容转化为明确的下一步。用提问和引导带你推进，而不是直接给答案。",
    color: "text-chart-3",
    panelClassName:
      "border-white/10 bg-[linear-gradient(180deg,oklch(0.25_0.02_225/0.9),oklch(0.19_0.018_240/0.94))] shadow-[0_24px_70px_-45px_oklch(0.72_0.12_160/0.32)]",
    iconPanelClassName: "border-chart-3/20 bg-chart-3/10",
  },
  {
    step: "03",
    icon: Trophy,
    title: "完成步骤，积累段位",
    description:
      "每完成一步获得学分，从萌新码农进阶到 AI 编程大师。连续打卡保持学习节奏，清楚看到自己的成长。",
    color: "text-gold",
    panelClassName:
      "border-white/10 bg-[linear-gradient(180deg,oklch(0.26_0.02_210/0.9),oklch(0.18_0.015_235/0.95))] shadow-[0_24px_70px_-45px_oklch(0.82_0.12_82/0.24)]",
    iconPanelClassName: "border-gold/20 bg-gold/10",
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

export const marketingConversationMessages: MarketingConversationMessage[] = [
  {
    id: "u-1",
    speaker: "user",
    title: "用户目标",
    body: "我看了一个用 Cursor 做博客后台的教程，但自己一动手就卡住，不知道第一步该做什么。",
    meta: "教程转实践",
  },
  {
    id: "ai-1",
    speaker: "ai",
    title: "AI 陪练",
    body: "先别做完整后台。你今天的目标只收窄成一件事：在本地跑起一个最小页面，并让 Cursor 帮你补一个 API 路由。",
    meta: "拆解今日目标",
  },
  {
    id: "sys-1",
    speaker: "system",
    title: "今日任务",
    body: "1. 打开项目  2. 新建 /api/hello  3. 让 AI 生成返回 JSON 的最小实现",
    meta: "预计 15 分钟",
  },
  {
    id: "u-2",
    speaker: "user",
    title: "执行反馈",
    body: "路由跑起来了，但我不知道怎么继续接数据库，也担心改坏项目结构。",
    meta: "已完成第一步",
  },
  {
    id: "ai-2",
    speaker: "ai",
    title: "AI 陪练",
    body: "先不要上数据库。下一步改成把返回值提取到 mock adapter，这样你先练清楚前后端边界，再决定接真实接口。",
    meta: "保护节奏",
  },
  {
    id: "u-3",
    speaker: "user",
    title: "开发者场景",
    body: "我本身有后端经验，但第一次用 Claude Code，想知道怎样把它放进真实项目流程里。",
    meta: "有技术基础",
  },
  {
    id: "ai-3",
    speaker: "ai",
    title: "AI 陪练",
    body: "那就不从基础语法开始。你的路径会改成：读代码边界、补测试、让 AI 生成第一版实现，再由你 review 和收口。",
    meta: "按经验匹配",
  },
]

export const marketingFitNotes: MarketingFitNote[] = [
  {
    title: "如果你是技术新手",
    desc: "平台会先帮你缩成真正能完成的第一步，比如安装工具、跑起项目、发出第一条 AI 指令。",
  },
  {
    title: "如果你已有开发经验",
    desc: "平台会直接进入项目实战、接口联调、重构、调试和测试补齐，不会强行从零开始重复讲基础概念。",
  },
]

export const marketingBenefits: MarketingBenefit[] = [
  {
    icon: CheckCircle2,
    title: "不再收藏即结束",
    desc: "从看教程到做出成果，每次学习都有可见产出",
    color: "text-brand",
    bgColor: "bg-brand/12",
    borderColor: "border-brand/20"
  },
  {
    icon: MessageCircle,
    title: "卡住时有陪练",
    desc: "AI 导师24/7在线，遇到问题立即获得分层提示",
    color: "text-chart-3",
    bgColor: "bg-chart-3/10",
    borderColor: "border-chart-3/20"
  },
  {
    icon: TrendingUp,
    title: "进度可追踪",
    desc: "清晰的学习路径、任务状态和成长里程碑",
    color: "text-chart-5",
    bgColor: "bg-chart-5/10",
    borderColor: "border-chart-5/20"
  },
  {
    icon: Trophy,
    title: "有成就感",
    desc: "学分、段位、连续打卡让进步看得见",
    color: "text-gold",
    bgColor: "bg-gold/10",
    borderColor: "border-gold/20"
  },
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
