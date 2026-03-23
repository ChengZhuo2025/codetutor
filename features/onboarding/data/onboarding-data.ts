import type {
  OnboardingLevel,
  OnboardingTool,
  ToolColor,
} from "@/features/onboarding/types"

export const tools: OnboardingTool[] = [
  { id: "cursor", name: "Cursor", category: "图形化 IDE", desc: "AI 原生代码编辑器，最适合入门", popular: true, color: "brand" },
  { id: "claude-code", name: "Claude Code", category: "CLI 工具", desc: "Anthropic 官方 CLI，命令行 AI 编程", popular: false, color: "chart-3" },
  { id: "trae", name: "Trae", category: "图形化 IDE", desc: "字节出品，中文支持好", popular: true, color: "brand" },
  { id: "windsurf", name: "Windsurf", category: "图形化 IDE", desc: "Codeium 出品，Agent 模式强大", popular: false, color: "chart-5" },
  { id: "bolt", name: "Bolt.new", category: "在线工具", desc: "浏览器直接运行，零安装门槛", popular: false, color: "gold" },
  { id: "codex", name: "Codex CLI", category: "CLI 工具", desc: "OpenAI 官方 CLI，轻量高效", popular: false, color: "chart-5" },
  { id: "lovable", name: "Lovable", category: "在线工具", desc: "前端生成工具，无需编程即可建站", popular: false, color: "gold" },
  { id: "kiro", name: "Kiro", category: "图形化 IDE", desc: "AWS 出品，规格文档驱动开发", popular: false, color: "chart-3" },
]

export const levels: OnboardingLevel[] = [
  { id: "beginner", label: "完全入门", desc: "没有编程基础，想从零开始" },
  { id: "intermediate", label: "有一定基础", desc: "了解基本编程，想提升 AI 工具效率" },
  { id: "advanced", label: "进阶提升", desc: "有项目经验，想系统化 AI 编程方法论" },
]

export const colorMap: Record<ToolColor, string> = {
  brand: "border-brand/40 bg-brand-dim text-brand",
  "chart-3": "border-chart-3/40 bg-chart-3/10 text-chart-3",
  "chart-5": "border-chart-5/40 bg-chart-5/10 text-chart-5",
  gold: "border-gold/40 bg-gold-dim text-gold",
}

export const selectedBorderMap: Record<ToolColor, string> = {
  brand: "border-brand",
  "chart-3": "border-chart-3",
  "chart-5": "border-chart-5",
  gold: "border-gold",
}
