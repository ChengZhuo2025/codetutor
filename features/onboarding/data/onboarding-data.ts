import type { ApiSuccessResponse } from "@/lib/api/types"
import type {
  GetOnboardingToolsResponseData,
  OnboardingPresetContract,
  SelectToolResponseData,
} from "@/lib/api/contracts/onboarding"
import type { ToolColor } from "@/features/onboarding/types"

export const mockOnboardingToolsResponse: ApiSuccessResponse<GetOnboardingToolsResponseData> = {
  code: "OK",
  message: "success",
  data: {
    groups: [
      {
        groupCode: "gui",
        groupName: "图形化工具",
        tools: [
          {
            id: "cursor",
            code: "cursor",
            name: "Cursor",
            difficultyLevel: "beginner",
            summary: "AI 原生代码编辑器，最适合入门",
            category: "图形化 IDE",
            popular: true,
            color: "brand",
          },
          {
            id: "trae",
            code: "trae",
            name: "Trae",
            difficultyLevel: "beginner",
            summary: "字节出品，中文支持好",
            category: "图形化 IDE",
            popular: true,
            color: "brand",
          },
          {
            id: "windsurf",
            code: "windsurf",
            name: "Windsurf",
            difficultyLevel: "intermediate",
            summary: "Codeium 出品，Agent 模式强大",
            category: "图形化 IDE",
            popular: false,
            color: "chart-5",
          },
          {
            id: "opencode",
            code: "opencode",
            name: "OpenCode",
            difficultyLevel: "intermediate",
            summary: "开源 AI 编程工具，社区活跃",
            category: "图形化 IDE",
            popular: false,
            color: "chart-3",
          },
        ],
      },
      {
        groupCode: "cli",
        groupName: "CLI 工具",
        tools: [
          {
            id: "claude-code",
            code: "claude-code",
            name: "Claude Code",
            difficultyLevel: "intermediate",
            summary: "Anthropic 官方 CLI，命令行 AI 编程",
            category: "CLI 工具",
            popular: true,
            color: "chart-3",
          },
          {
            id: "codex",
            code: "codex",
            name: "Codex CLI",
            difficultyLevel: "intermediate",
            summary: "OpenAI 官方 CLI，轻量高效",
            category: "CLI 工具",
            popular: false,
            color: "chart-5",
          },
          {
            id: "openclaw",
            code: "openclaw",
            name: "OpenClaw",
            difficultyLevel: "intermediate",
            summary: "开源 AI 编程代理，灵活可扩展",
            category: "CLI 工具",
            popular: true,
            color: "brand",
          },
        ],
      },
      {
        groupCode: "web",
        groupName: "在线工具",
        tools: [
          {
            id: "bolt",
            code: "bolt",
            name: "Bolt.new",
            difficultyLevel: "beginner",
            summary: "浏览器直接运行，零安装门槛",
            category: "在线工具",
            popular: false,
            color: "gold",
          },
          {
            id: "lovable",
            code: "lovable",
            name: "Lovable",
            difficultyLevel: "beginner",
            summary: "前端生成工具，无需编程即可建站",
            category: "在线工具",
            popular: false,
            color: "gold",
          },
        ],
      },
    ],
  },
}

export const mockOnboardingInitialPathResponse: ApiSuccessResponse<SelectToolResponseData> = {
  code: "OK",
  message: "success",
  data: {
    pathId: "path-cursor-beginner",
    currentTaskId: "task-install-cursor",
    initialPreview: ["认识工具界面", "写第一个 Prompt", "生成第一个页面"],
  },
}

export const onboardingPresets: OnboardingPresetContract = {
  levels: [
    { id: "beginner", label: "完全入门", desc: "没有编程基础，想从零开始" },
    { id: "intermediate", label: "有一定基础", desc: "了解基本编程，想提升 AI 工具效率" },
    { id: "advanced", label: "进阶提升", desc: "有项目经验，想系统化 AI 编程方法论" },
  ],
  toolCards: [],
}

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
