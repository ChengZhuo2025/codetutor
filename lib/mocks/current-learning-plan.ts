import { getToolName } from "@/constants/tools"

export type CurrentLearningPlanStatus = "done" | "current" | "locked"

export type CurrentLearningPlanPitfall = {
  text: string
  isTrap?: boolean
}

export type CurrentLearningPlanStage = {
  id: number
  taskId: string
  title: string
  summary: string
  focus: string
  goal: string
  completionCriteria: string
  reviewSummary: string
  estimatedTime: string
  xp: number
  status: CurrentLearningPlanStatus
  tags: string[]
  keyPoints: string[]
  pitfalls: CurrentLearningPlanPitfall[]
}

const primaryToolName = getToolName("cursor")

export const currentLearningPlan = {
  tool: {
    id: "cursor",
    label: primaryToolName,
  },
  pathName: `${primaryToolName} 零基础起步营`,
  pathSummary: `从第一次 AI 对话到第一个迷你项目，建立最小但完整的 ${primaryToolName} 入门工作流。`,
  stages: [
    {
      id: 1,
      taskId: "task-install-cursor",
      title: `安装与配置 ${primaryToolName}`,
      summary: "完成安装、登录和基础配置，让 AI 能正常工作。",
      focus: "先把环境准备好，后面的每一关才有真实练习价值。",
      goal: `安装 ${primaryToolName} 并确认 AI 功能可以正常使用。`,
      completionCriteria: "完成安装、登录账号，并能成功打开一个项目目录。",
      reviewSummary: "你已经完成安装与登录配置，后续可以直接进入第一次 AI 协作。",
      estimatedTime: "5 分钟",
      xp: 10,
      status: "done",
      tags: ["环境配置", "编辑器"],
      keyPoints: [
        `先确保 ${primaryToolName} 可以打开本地项目，再进入学习流程。`,
        "登录成功后再验证 AI 功能是否可用，避免后续排查偏题。",
        "环境准备完成比急着提问更重要。",
      ],
      pitfalls: [
        { text: "首次打开项目时如索引较慢，先等待完成，不要频繁重启。", isTrap: true },
        { text: "AI 功能无响应时，优先检查登录状态和网络代理设置。" },
      ],
    },
    {
      id: 2,
      taskId: "task-first-ai-chat",
      title: "完成第一次 AI 对话",
      summary: "用 Ask 面板完成第一次提问，建立最小协作心智。",
      focus: "先体验一次最简单的提问，不要一开始就追求复杂结果。",
      goal: "打开 Ask 面板，完成一次关于当前项目的有效提问。",
      completionCriteria: "成功发出一次提问，并理解 Ask 更适合解释与追问。",
      reviewSummary: "你已经建立了第一次 AI 协作体验，知道 Ask 适合用来提问和理解概念。",
      estimatedTime: "6 分钟",
      xp: 10,
      status: "done",
      tags: ["Ask 模式", "最小实验"],
      keyPoints: [
        "Ask 更适合解释概念、追问细节和理解代码。",
        "问题越具体，AI 的回答越容易转化成行动。",
        "第一次协作重点是建立信心，不是覆盖全部功能。",
      ],
      pitfalls: [
        { text: "不要一上来发一大段模糊需求，先问一个最小问题。", isTrap: true },
        { text: "遇到不理解的回答时，继续追问比换一个新问题更有效。" },
      ],
    },
    {
      id: 3,
      taskId: "task-ask-vs-agent",
      title: "理解 Ask 与 Agent 的区别",
      summary: "先做一个最小实验，判断 Agent 何时比 Ask 更适合。",
      focus: `只做一个最小实验：让 Agent 生成一个 React 时钟组件，理解它和 Ask 的职责边界。`,
      goal: `用 ${primaryToolName} 的 Agent 功能创建一个 React 时钟组件。`,
      completionCriteria: "看到一个可运行的时钟组件，并理解为什么这是 Agent 场景。",
      reviewSummary: "你已经验证了 Ask 与 Agent 的分工差异，下一步可以进入调试协作。",
      estimatedTime: "8 分钟",
      xp: 10,
      status: "current",
      tags: ["Ask 模式", "Agent 模式", "React"],
      keyPoints: [
        "Ask 更适合解释概念、追问细节和帮你拆清思路。",
        "Agent 更适合生成完整文件或连续修改多段代码。",
        "先做一个最小实验，比一次写完整需求更容易验证判断。",
      ],
      pitfalls: [
        { text: "最常见的卡点：明明想生成文件，却还在 Ask 里反复追问。", isTrap: true },
        { text: "本关先验证模式差异，不需要提前把 React 语法全部学完。" },
        { text: "如果 Agent 结果不理想，先缩小任务范围再继续，而不是一次加很多要求。", isTrap: true },
      ],
    },
    {
      id: 4,
      taskId: "task-debug-with-ai",
      title: "AI 调试助手",
      summary: `学会带着错误上下文让 ${primaryToolName} 帮你定位并修复 bug。`,
      focus: "不是让 AI 猜答案，而是提供足够上下文，让它和你一起定位问题。",
      goal: `用报错信息和相关代码，让 ${primaryToolName} 帮你完成一次有效调试。`,
      completionCriteria: "提供错误信息与上下文后，完成一次定位和修复闭环。",
      reviewSummary: "你已经完成了一次 AI 调试闭环，能更有效地描述问题上下文。",
      estimatedTime: "10 分钟",
      xp: 15,
      status: "locked",
      tags: ["调试", "报错定位", "上下文"],
      keyPoints: [
        "调试时要给 AI 错误信息，也要给触发错误的代码上下文。",
        "验证修复结果和拿到修复建议同样重要。",
        "比起直接求答案，更重要的是建立定位问题的顺序。",
      ],
      pitfalls: [
        { text: "只贴报错文本，不贴相关代码，是最常见的低效提问方式。", isTrap: true },
        { text: "拿到修复建议后必须再次运行验证，不能只看文字解释。" },
      ],
    },
    {
      id: 5,
      taskId: "task-multi-file-context",
      title: "多文件上下文",
      summary: `让 ${primaryToolName} 理解项目结构，而不是只盯着单一代码片段。`,
      focus: "学会给 AI 足够但不过量的上下文，让它理解真实项目而不是局部片段。",
      goal: "通过引用多个文件，让 AI 理解一个小项目的结构并协助修改。",
      completionCriteria: "完成一次跨文件上下文协作，并理解何时需要扩大上下文。",
      reviewSummary: "你已经掌握了多文件上下文协作，能更稳地处理真实项目。",
      estimatedTime: "12 分钟",
      xp: 20,
      status: "locked",
      tags: ["多文件", "上下文", "@引用"],
      keyPoints: [
        "上下文越精准，AI 的输出越稳定。",
        "扩大上下文不是越多越好，而是越相关越好。",
        "跨文件修改前先告诉 AI 项目结构，成功率更高。",
      ],
      pitfalls: [
        { text: "一次塞入过多无关文件会稀释重点，让回答变散。", isTrap: true },
        { text: "没有先解释项目结构时，AI 更容易误判文件职责。" },
      ],
    },
    {
      id: 6,
      taskId: "task-first-mini-project",
      title: "完成第一个迷你项目",
      summary: "把前面的提问、生成、调试和上下文能力串成一次完整实战。",
      focus: "通过一个最小项目把前几关串起来，形成可复用的协作节奏。",
      goal: `和 ${primaryToolName} 一起完成一个最小但完整的迷你项目交付。`,
      completionCriteria: "完成从需求、生成、调试到收尾的一个完整协作闭环。",
      reviewSummary: "你已经完成了首个完整实战，具备继续扩展到真实项目的基础。",
      estimatedTime: "30 分钟",
      xp: 30,
      status: "locked",
      tags: ["实战", "综合练习", "最小项目"],
      keyPoints: [
        "完整交付比零散尝试更能形成可迁移的方法。",
        "需求拆小、逐步验证、及时复盘，是稳定协作的基础。",
        "AI 是搭档，不是替你跳过思考的工具。",
      ],
      pitfalls: [
        { text: "项目目标太模糊会导致 AI 反复重做，先收窄范围再开始。", isTrap: true },
        { text: "实战中遇到问题是正常现象，关键是维持推进节奏。" },
      ],
    },
  ] satisfies CurrentLearningPlanStage[],
}
