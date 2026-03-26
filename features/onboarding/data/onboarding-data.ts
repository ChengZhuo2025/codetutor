import { ROUTES } from "@/constants/routes"
import type { ApiSuccessResponse } from "@/lib/api/types"
import type {
  CompleteOnboardingRequest,
  CompleteOnboardingResponseData,
  GetOnboardingPathOptionsResponseData,
  GetOnboardingToolsResponseData,
  OnboardingPresetContract,
  OnboardingToolGroupContract,
} from "@/lib/api/contracts/onboarding"
import type { Level, OnboardingPresetPathOption, ToolColor } from "@/features/onboarding/types"

const toolGroups: OnboardingToolGroupContract[] = [
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
        summary: "Agent 模式强，适合进阶工作流练习",
        category: "图形化 IDE",
        popular: false,
        color: "chart-5",
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
        summary: "Anthropic 官方 CLI，适合系统化训练",
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
        id: "opencode",
        code: "opencode",
        name: "OpenCode",
        difficultyLevel: "intermediate",
        summary: "开源 AI 编程工具，支持多种语言和框架",
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
        id: "stitch",
        code: "stitch",
        name: "Google Stitch",
        difficultyLevel: "beginner",
        summary: "Google 出品，适合快速生成前端高保真页面",
        category: "在线工具",
        popular: true,
        color: "brand",
      },
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
        summary: "更偏产品与页面生成，适合快速试错",
        category: "在线工具",
        popular: false,
        color: "gold",
      }
    ],
  },
]

const levelTemplates: OnboardingPresetContract["levels"] = [
  { id: "beginner", label: "完全入门", desc: "没有编程基础，想从零开始" },
  { id: "intermediate", label: "有一定基础", desc: "了解基本编程，想提升 AI 工具效率" },
  { id: "advanced", label: "进阶提升", desc: "有项目经验，想系统化 AI 编程方法论" },
]

type PathTemplate = {
  code: string
  name: (toolName: string) => string
  summary: (toolName: string) => string
  stageCount: number
  currentLevelFit: string
  coachAgentLabel: string
  estimatedDuration: string
  tags: string[]
  preview: (toolName: string) => string[]
  recommended?: boolean
}

const presetPathCatalog: Record<Level, PathTemplate[]> = {
  beginner: [
    {
      code: "quickstart",
      name: (toolName) => `${toolName} 零基础起步营`,
      summary: (toolName) => `从认识 ${toolName} 界面到完成第一个小作品，适合第一次真正上手。`,
      stageCount: 8,
      currentLevelFit: "适合第一次系统使用该工具的新用户",
      coachAgentLabel: "入门陪练 Agent",
      estimatedDuration: "3-5 天",
      tags: ["界面熟悉", "Prompt 入门", "小作品"],
      preview: (toolName) => [`认识 ${toolName} 工作区`, "写出第一个 Prompt", "完成第一个页面练习"],
      recommended: true,
    },
    {
      code: "prompt-basics",
      name: (toolName) => `${toolName} Prompt 入门闯关`,
      summary: (toolName) => `围绕 ${toolName} 的基础提问、追问和约束表达，建立最小可用 Prompt 手感。`,
      stageCount: 6,
      currentLevelFit: "适合已经敢点开工具，但不知道怎么开口的人",
      coachAgentLabel: "Prompt 训练 Agent",
      estimatedDuration: "2-3 天",
      tags: ["Prompt", "追问", "约束表达"],
      preview: () => ["写第一个任务 Prompt", "学会补充上下文", "学会让 AI 改错"],
    },
    {
      code: "first-project",
      name: (toolName) => `${toolName} 第一个项目训练`,
      summary: (toolName) => `用 ${toolName} 完成一个可展示的小项目，理解从想法到成品的完整节奏。`,
      stageCount: 10,
      currentLevelFit: "适合想尽快做出成果感的入门用户",
      coachAgentLabel: "项目引导 Agent",
      estimatedDuration: "5-7 天",
      tags: ["项目实践", "页面生成", "复盘"],
      preview: () => ["明确项目目标", "生成首屏页面", "补齐交互并复盘"],
    },
  ],
  intermediate: [
    {
      code: "workflow-boost",
      name: (toolName) => `${toolName} 效率工作流训练`,
      summary: (toolName) => `围绕 ${toolName} 的上下文管理、拆任务和连续迭代，建立高频工作流。`,
      stageCount: 9,
      currentLevelFit: "适合已经会写代码，但想更顺地用 AI 协作的人",
      coachAgentLabel: "效率工作流 Agent",
      estimatedDuration: "4-6 天",
      tags: ["任务拆解", "上下文管理", "迭代节奏"],
      preview: () => ["拆解需求", "组织上下文", "连续 3 轮迭代交付"],
      recommended: true,
    },
    {
      code: "debug-lab",
      name: (toolName) => `${toolName} 调试训练营`,
      summary: (toolName) => `练习用 ${toolName} 快速定位问题、给出假设并验证修复。`,
      stageCount: 7,
      currentLevelFit: "适合写得出来，但卡在排错效率上的用户",
      coachAgentLabel: "调试教练 Agent",
      estimatedDuration: "3-4 天",
      tags: ["调试", "定位问题", "验证修复"],
      preview: () => ["复现问题", "定位根因", "输出修复结论"],
    },
    {
      code: "feature-shipping",
      name: (toolName) => `${toolName} 小功能交付路径`,
      summary: (toolName) => `以真实功能交付为主线，练习如何让 ${toolName} 参与需求到上线全过程。`,
      stageCount: 12,
      currentLevelFit: "适合想把 AI 真正接入日常开发的人",
      coachAgentLabel: "交付陪跑 Agent",
      estimatedDuration: "1 周",
      tags: ["需求实现", "联调", "上线准备"],
      preview: () => ["写实现计划", "完成一个功能切片", "联调并验收"],
    },
  ],
  advanced: [
    {
      code: "systematic-build",
      name: (toolName) => `${toolName} 系统化构建路线`,
      summary: (toolName) => `围绕架构、模块拆分和协作节奏，用 ${toolName} 建立更稳定的交付方法论。`,
      stageCount: 14,
      currentLevelFit: "适合已有项目经验、希望系统升级的人",
      coachAgentLabel: "架构陪练 Agent",
      estimatedDuration: "1-2 周",
      tags: ["架构", "协作", "交付方法论"],
      preview: () => ["拆分系统模块", "设计接口契约", "组织分阶段交付"],
      recommended: true,
    },
    {
      code: "multi-agent",
      name: (toolName) => `${toolName} 多 Agent 协作训练`,
      summary: (toolName) => `练习用 ${toolName} 编排多角色协作、并行处理和审阅集成。`,
      stageCount: 11,
      currentLevelFit: "适合已经熟悉单人工作流，想升级协同效率的人",
      coachAgentLabel: "协作编排 Agent",
      estimatedDuration: "5-7 天",
      tags: ["多 Agent", "并行", "审阅集成"],
      preview: () => ["拆分并行任务", "汇总结果", "统一验收口径"],
    },
    {
      code: "refactor-and-ship",
      name: (toolName) => `${toolName} 重构与交付强化`,
      summary: (toolName) => `以中型改造任务为主线，训练如何在复杂上下文里用 ${toolName} 稳定推进。`,
      stageCount: 16,
      currentLevelFit: "适合希望进入复杂项目场景的高级用户",
      coachAgentLabel: "重构策略 Agent",
      estimatedDuration: "1-2 周",
      tags: ["重构", "复杂上下文", "稳定交付"],
      preview: () => ["识别改造边界", "分批推进", "验证并收口"],
    },
  ],
}

const toolCards = toolGroups.flatMap((group) =>
  group.tools.map((tool) => ({
    id: tool.id,
    code: tool.code,
    name: tool.name,
    category: tool.category,
    desc: tool.summary,
    popular: tool.popular,
    color: tool.color,
  })),
)

export const mockOnboardingToolsResponse: ApiSuccessResponse<GetOnboardingToolsResponseData> = {
  code: "OK",
  message: "success",
  data: {
    groups: toolGroups,
  },
}

export const onboardingPresets: OnboardingPresetContract = {
  levels: levelTemplates,
  toolCards,
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

export function getOnboardingToolByCode(toolCode: string) {
  return toolCards.find((tool) => tool.code === toolCode) ?? null
}

function buildPresetPathId(toolCode: string, level: Level, code: string) {
  return `path-${toolCode}-${level}-${code}`
}

function buildPresetPathOptions(toolCode: string, toolName: string, level: Level) {
  return presetPathCatalog[level].map<OnboardingPresetPathOption>((template) => ({
    pathId: buildPresetPathId(toolCode, level, template.code),
    code: `${toolCode}-${level}-${template.code}`,
    name: template.name(toolName),
    sourceType: "preset_training",
    stageCount: template.stageCount,
    summary: template.summary(toolName),
    recommended: template.recommended ?? false,
    currentLevelFit: template.currentLevelFit,
    coachAgentLabel: template.coachAgentLabel,
    estimatedDuration: template.estimatedDuration,
    tags: template.tags,
    preview: template.preview(toolName),
  }))
}

export function getMockOnboardingPathOptionsResponse(
  toolCode: string,
  learningLevel: Level,
): ApiSuccessResponse<GetOnboardingPathOptionsResponseData> {
  const tool = getOnboardingToolByCode(toolCode)

  if (!tool) {
    throw new Error(`Unknown onboarding tool: ${toolCode}`)
  }

  return {
    code: "OK",
    message: "success",
    data: {
      selfStudyOption: {
        id: "self-study",
        code: "self-study",
        name: "自主学习模式",
        sourceType: "self_directed",
        summary: `粘贴你自己的 ${tool.name} 教程、代码片段、网页链接或截图，AI 会按你当前水平拆成可执行练习。`,
        preview: ["粘贴学习内容", "获得当前一步", "卡住时继续追问"],
        inputTypes: ["教程文本", "代码片段", "网页链接", "截图"],
      },
      presetPathOptions: buildPresetPathOptions(toolCode, tool.name, learningLevel),
    },
  }
}

export function getMockCompleteOnboardingResponse(
  request: CompleteOnboardingRequest,
): ApiSuccessResponse<CompleteOnboardingResponseData> {
  const { toolCode, learningLevel, selectedPathId, selectionMode } = request
  const pathOptions = getMockOnboardingPathOptionsResponse(toolCode, learningLevel).data
  const selectedPath = pathOptions.presetPathOptions.find((path) => path.pathId === selectedPathId)

  const initialPreview =
    selectionMode === "self_directed"
      ? pathOptions.selfStudyOption.preview
      : selectedPath?.preview ?? pathOptions.presetPathOptions[0]?.preview ?? pathOptions.selfStudyOption.preview

  return {
    code: "OK",
    message: "success",
    data: {
      onboardingCompleted: true,
      primaryToolCode: toolCode,
      learningLevel,
      selectionMode,
      pathId: selectionMode === "preset_training" ? selectedPathId : undefined,
      currentTaskId:
        selectionMode === "preset_training"
          ? `task-${selectedPathId ?? "preset"}-start`
          : `task-${toolCode}-self-study-start`,
      initialPreview,
      redirectTo: ROUTES.learn,
    },
  }
}
