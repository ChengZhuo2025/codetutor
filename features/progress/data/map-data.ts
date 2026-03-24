import type { ApiSuccessResponse } from "@/lib/api/types"
import type {
  ProgressCurrentResponseData,
  ProgressMapResponseData,
} from "@/lib/api/contracts/progress"

export const mockProgressCurrentResponse: ApiSuccessResponse<ProgressCurrentResponseData> = {
  code: "OK",
  message: "success",
  data: {
    currentTool: {
      id: "cursor",
      label: "Cursor",
    },
    currentPathName: "Cursor 入门路径",
    currentTaskTitle: "Chat vs Composer",
    currentScore: 120,
    currentRank: "萌新码农",
    streakDays: 7,
    checkedInToday: true,
    summary: {
      totalXP: 120,
      currentRank: "萌新码农",
      nextRank: "AI 学徒",
      remainingXPToNextRank: 60,
      streakDays: 7,
    },
  },
}

export const mockProgressMapResponse: ApiSuccessResponse<ProgressMapResponseData> = {
  code: "OK",
  message: "success",
  data: {
    pathName: "Cursor 入门路径",
    totalSteps: 7,
    completedSteps: 2,
    currentStageId: 3,
    tools: [
      { id: "cursor", label: "Cursor" },
      { id: "claude", label: "Claude Code" },
      { id: "trae", label: "Trae" },
    ],
    stages: [
      {
        id: 1,
        title: "安装与配置",
        desc: "下载 Cursor，完成基础环境配置",
        xp: 10,
        status: "done",
        tags: ["环境配置"],
        estimatedTime: "5 分钟",
        focus: "确认本地环境准备完成，AI 功能可以正常使用。",
        keyPoints: [
          "从 cursor.com 下载对应系统版本",
          "安装后需登录账号激活 AI 功能",
          "建议在安装时勾选「迁移 VS Code 插件」",
        ],
        pitfalls: [
          { text: "首次打开可能需要等待模型索引，约 1-2 分钟，不要关闭", isTrap: true },
          { text: "如果 AI 功能不响应，检查网络代理设置" },
        ],
      },
      {
        id: 2,
        title: "第一次 AI 对话",
        desc: "用 Chat 面板与 AI 进行首次交流",
        xp: 10,
        status: "done",
        tags: ["Chat 模式"],
        estimatedTime: "6 分钟",
        focus: "完成一次最小提问，理解 Chat 的基本使用场景。",
        keyPoints: [
          "快捷键 Cmd+L（Mac）/ Ctrl+L（Win）打开 Chat",
          "可以直接问「这段代码是什么意思」",
          "AI 回复中的代码块可一键插入编辑器",
        ],
        pitfalls: [
          { text: "Chat 模式不会自动修改文件，只是对话解释" },
          { text: "问题越具体，AI 回答越准确，避免模糊提问", isTrap: true },
        ],
      },
      {
        id: 3,
        title: "Chat vs Composer",
        desc: "理解两种模式的场景差异",
        xp: 10,
        status: "current",
        tags: ["Chat 模式", "Composer"],
        estimatedTime: "8 分钟",
        focus: "先完成一次最小实验，确认什么时候该用 Composer，什么时候继续用 Chat。",
        keyPoints: [
          "Chat（Cmd+L）：问答、解释、代码建议，不直接写入文件",
          "Composer（Cmd+I）：直接生成/修改文件，适合大段代码创建",
          "Composer 支持同时操作多个文件",
        ],
        pitfalls: [
          { text: "最常见的卡点：用 Chat 想要生成文件，结果 AI 只给了代码片段", isTrap: true },
          { text: "遇到需要新建文件时，优先选 Composer" },
          { text: "Composer 生成后记得点 Accept 才会真正写入" },
        ],
      },
      {
        id: 4,
        title: "AI 调试助手",
        desc: "用 Cmd+K 定位并修复代码 bug",
        xp: 10,
        status: "available",
        tags: ["调试", "Cmd+K"],
        estimatedTime: "10 分钟",
        focus: "学会把错误信息和上下文一起交给 AI，而不是只复制报错文本。",
        keyPoints: [
          "选中报错代码后按 Cmd+K 可快速询问 AI",
          "直接把终端报错粘贴给 AI 效果最好",
          "AI 会给出原因分析 + 修复建议",
        ],
        pitfalls: [
          { text: "不要只粘贴报错信息，要一起粘贴相关代码上下文", isTrap: true },
          { text: "修复后记得验证：运行看看是否真的解决了" },
        ],
      },
      {
        id: 5,
        title: "多文件上下文",
        desc: "让 AI 理解整个项目结构",
        xp: 20,
        status: "locked",
        tags: ["上下文", "@引用"],
        estimatedTime: "12 分钟",
        focus: "让 AI 在更大的上下文里工作，而不是只盯着单一文件。",
        keyPoints: [
          "用 @filename 在对话中引用具体文件",
          "@codebase 让 AI 理解整个项目",
          "Cursor Rules 文件可配置全局项目说明",
        ],
        pitfalls: [
          { text: "引用文件过多会导致 AI 回答质量下降，精准引用更重要", isTrap: true },
          { text: "大型项目建议先告诉 AI 项目整体架构" },
        ],
      },
      {
        id: 6,
        title: "自定义 Rules",
        desc: "配置专属编码风格规则",
        xp: 20,
        status: "locked",
        tags: ["Rules", "个性化"],
        estimatedTime: "10 分钟",
        focus: "把你的常见偏好写成可复用规则，减少每次重复说明。",
        keyPoints: [
          "在 .cursorrules 文件中定义 AI 行为规范",
          "可指定语言偏好、代码风格、禁止事项",
          "Rules 对当前项目所有对话生效",
        ],
        pitfalls: [
          { text: "Rules 写得太长会被截断，保持简洁精炼" },
          { text: "避免在 Rules 里写矛盾的要求", isTrap: true },
        ],
      },
      {
        id: 7,
        title: "完整项目实战",
        desc: "用 Cursor 完成一个完整的迷你项目",
        xp: 100,
        status: "locked",
        tags: ["实战", "综合"],
        estimatedTime: "45 分钟",
        focus: "把前面学到的提问、生成、调试和上下文管理串成完整工作流。",
        keyPoints: [
          "从项目初始化到功能完整交付",
          "练习拆解需求、逐步提示 AI",
          "学会 Review AI 代码而非盲目接受",
        ],
        pitfalls: [
          { text: "最大卡点：需求太模糊导致 AI 反复重来，要先想清楚再开始", isTrap: true },
          { text: "实战中遇到问题是正常的，带着问题继续，不要卡住放弃" },
        ],
      },
    ],
  },
}
