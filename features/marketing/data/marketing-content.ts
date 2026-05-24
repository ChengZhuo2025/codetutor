import { Bot, CheckCircle2, MessageCircle, Trophy, TrendingUp, Upload } from "lucide-react"
import { getRankName } from "@/constants/ranks"
import { getToolName } from "@/constants/tools"
import type {
  MarketingAudience,
  MarketingBenefit,
  MarketingConversationMessage,
  MarketingFitNote,
  MarketingPlan,
  MarketingStep,
  MarketingTool,
} from "@/features/marketing/types"

const firstRankName = getRankName("rookie")
const lastRankName = getRankName("master")
const cursorToolName = getToolName("cursor")
const claudeCodeToolName = getToolName("claude-code")
const FALLBACK_FREE_PLAN_AI_CHAT_QUOTA_LABEL = "每月 30 次 AI 对话"

export const marketingSteps: MarketingStep[] = [
  {
    step: "01",
    icon: Upload,
    title: "粘贴你想学的内容",
    description:
      "支持教程链接、视频链接、代码片段、截图或直接提问。把你在抖音、 B站、TikTok、YouTube、公众号收藏的教程内容发给 AI。",
    color: "text-brand",
    panelClassName:
      "border-brand/30 bg-brand/5 shadow-lg shadow-brand/10 dark:bg-[linear-gradient(180deg,oklch(0.24_0.04_270/0.94),oklch(0.16_0.015_270/0.98))] dark:shadow-[0_24px_80px_-42px_oklch(0.75_0.24_270/0.28)]",
    iconPanelClassName: "border-brand/20 bg-brand/12",
  },
  {
    step: "02",
    icon: Bot,
    title: "AI 拆解成今天能做的步骤",
    description:
      "AI 导师识别你的水平，把内容转化为明确的下一步。用提问和引导带你推进，而不是直接给答案。",
    color: "text-chart-5",
    panelClassName:
      "border-brand/30 bg-brand/5 shadow-lg shadow-brand/10 dark:bg-[linear-gradient(180deg,oklch(0.24_0.04_270/0.94),oklch(0.16_0.015_270/0.98))] dark:shadow-[0_24px_80px_-42px_oklch(0.75_0.24_270/0.28)]",
    iconPanelClassName: "border-chart-5/20 bg-chart-5/10",
  },
  {
    step: "03",
    icon: Trophy,
    title: "完成步骤，积累段位",
    description:
      `每完成一步获得学分，从 ${firstRankName} 进阶到 ${lastRankName}。连续打卡保持学习节奏，清楚看到自己的成长。`,
    color: "text-gold",
    panelClassName:
      "border-brand/30 bg-brand/5 shadow-lg shadow-brand/10 dark:bg-[linear-gradient(180deg,oklch(0.24_0.04_270/0.94),oklch(0.16_0.015_270/0.98))] dark:shadow-[0_24px_80px_-42px_oklch(0.75_0.24_270/0.28)]",
    iconPanelClassName: "border-gold/20 bg-gold/10",
  },
]

export const marketingTools: MarketingTool[] = [
  {
    name: getToolName("claude-code"),
    tag: "CLI 工具",
    color: "text-chart-3",
    dot: "bg-chart-3",
    exampleGoal: "把 Claude Code 放进真实仓库工作流",
    firstTask: "读项目结构，生成一份修改前检查清单",
    outcome: "能用终端完成一次小改动、测试和自查",
    fit: "适合已有代码基础、想练命令行协作的人",
    downloadUrl: "https://docs.anthropic.com/en/docs/claude-code/getting-started",
    logoSrc: "/tool-logos/claude-code.png",
    featuredInFooter: true,
  },
  {
    name: getToolName("cursor"),
    tag: "图形化 IDE",
    color: "text-brand",
    dot: "bg-brand",
    exampleGoal: "用 Cursor 跑起一个最小页面",
    firstTask: "打开本地项目，让 AI 补一个 /api/hello 路由",
    outcome: "完成第一次从教程到本地项目的可见产出",
    fit: "适合新手或想用图形化 IDE 起步的人",
    downloadUrl: "https://cursor.com/downloads/",
    logoSrc: "/tool-logos/cursor.png",
    featuredInFooter: true,
  },
  {
    name: getToolName("codex"),
    tag: "CLI 工具",
    color: "text-chart-5",
    dot: "bg-chart-5",
    exampleGoal: "用 Codex CLI 修改一个已有功能",
    firstTask: "让 AI 阅读相关文件，给出最小改动计划",
    outcome: "掌握命令行里提需求、看 diff、跑验证的闭环",
    fit: "适合想把 AI 接入日常代码仓库的人",
    downloadUrl: "https://github.com/openai/codex",
    logoSrc: "/tool-logos/codex-cli.png",
    featuredInFooter: true,
  },
  {
    name: getToolName("trae"),
    tag: "图形化 IDE",
    color: "text-brand",
    dot: "bg-brand",
    exampleGoal: "用 Trae 做出一个前端小功能",
    firstTask: "选一个组件，让 AI 拆成页面、状态和样式步骤",
    outcome: "从中文需求推进到可运行界面",
    fit: "适合偏中文环境、想降低起步成本的人",
    downloadUrl: "https://www.trae.ai/download",
    logoSrc: "/tool-logos/trae.png",
    featuredInFooter: true,
  },
  {
    name: getToolName("windsurf"),
    tag: "图形化 IDE",
    color: "text-brand",
    dot: "bg-brand",
    exampleGoal: "用 Windsurf 处理跨文件任务",
    firstTask: "让 AI 先找影响范围，再分步骤改动",
    outcome: "理解多文件修改时如何控风险",
    fit: "适合已有项目、想练复杂任务拆解的人",
    downloadUrl: "https://windsurf.com/download",
    logoSrc: "/tool-logos/windsurf.png",
    featuredInFooter: true,
  },
  {
    name: getToolName("opencode"),
    tag: "开源 AI 编程工具",
    color: "text-gold",
    dot: "bg-gold",
    exampleGoal: "用 OpenCode 建立可复用 AI 工作流",
    firstTask: "配置一个仓库任务，并让 AI 输出验证命令",
    outcome: "知道如何把开源工具接入自己的项目节奏",
    fit: "适合关注开源和可控环境的人",
  },
  {
    name: getToolName("lovable"),
    tag: "在线工具",
    color: "text-gold",
    dot: "bg-gold",
    exampleGoal: "用 Lovable 快速验证产品页面",
    firstTask: "把一个产品想法拆成页面结构和首个交互",
    outcome: "先看到可点击原型，再决定是否深入开发",
    fit: "适合产品、创业者和前端原型验证",
    downloadUrl: "https://docs.lovable.dev/introduction/getting-started",
    logoSrc: "/tool-logos/lovable.jpeg",
    featuredInFooter: true,
  },
  {
    name: getToolName("stitch"),
    tag: "在线工具 前端设计",
    color: "text-chart-5",
    dot: "bg-chart-5",
    exampleGoal: "用 Google Stitch 生成界面方向",
    firstTask: "输入页面目标，比较两版视觉方案",
    outcome: "把设计灵感转成可继续实现的界面草稿",
    fit: "适合设计师和想快速定 UI 方向的人",
  },
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
    body: `我看了一个用 ${cursorToolName} 做博客后台的教程，但自己一动手就卡住，不知道第一步该做什么。`,
    meta: "教程转实践",
  },
  {
    id: "ai-1",
    speaker: "ai",
    title: "AI 陪练",
    body: `先别做完整后台。你今天的目标只收窄成一件事：在本地跑起一个最小页面，并让 ${cursorToolName} 帮你补一个 API 路由。`,
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
    body: `我本身有后端经验，但第一次用 ${claudeCodeToolName}，想知道怎样把它放进真实项目流程里。`,
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
    desc: "闯关进阶，学分/段位激励，连续打卡让进步看得见",
    color: "text-gold",
    bgColor: "bg-gold/10",
    borderColor: "border-gold/20"
  },
]

export const marketingPlans: MarketingPlan[] = [
  {
    name: "免费版",
    price: "¥0.00",
    period: "",
    desc: "探索产品核心体验",
    highlight: false,
    features: [
      FALLBACK_FREE_PLAN_AI_CHAT_QUOTA_LABEL,
      "工具选择与学习路径",
      "基础学分与段位系统",
      "学习进度追踪",
    ],
    cta: "免费开始",
    href: "/login",
    purchasable: false,
  },
  {
    name: "个人版",
    price: "¥39.00",
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
    purchasable: true,
  },
  {
    name: "专业版",
    price: "¥99.00",
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
    cta: "立即订阅",
    href: "/login",
    purchasable: true,
  },
]

export const FALLBACK_FREE_PLAN_FEATURE_LABEL = FALLBACK_FREE_PLAN_AI_CHAT_QUOTA_LABEL
