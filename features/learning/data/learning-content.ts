import type { ApiSuccessResponse } from "@/lib/api/types"
import type {
  LearningCurrentSessionResponseData,
  LearningMessageResponseData,
} from "@/lib/api/contracts/learning"
import { mockProfileMeResponse } from "@/features/auth/data/login-data"

export const mockLearningCurrentSessionResponse: ApiSuccessResponse<LearningCurrentSessionResponseData> =
  {
    code: "OK",
    message: "success",
    data: {
      conversationId: "conversation-cursor-003",
      task: {
        taskId: "task-chat-vs-composer",
        title: "理解 Chat 与 Composer 的区别",
        status: "in_progress",
      },
      profile: mockProfileMeResponse.data,
      mission: {
        title: "理解 Chat 与 Composer 的区别",
        tool: "Cursor",
        stageLabel: "第 3 关 / 共 12 关",
        goal: "用 Cursor 的 Composer 功能创建一个 React 时钟组件",
        summary:
          "只做一个最小实验：打开 Composer，用中文描述想要的组件效果，观察 AI 如何生成完整文件。",
        estimatedTime: "约 8 分钟",
        reward: "+10 XP",
        progressLabel: "1 / 3 步",
        progressPercent: 36,
        coachCue: "先把任务做小，只验证 Composer 是否比 Chat 更适合生成完整文件。",
        nextUnlockTitle: "AI 调试助手",
        nextUnlockSummary: "学会用 Cmd+K 让 Cursor 直接定位并修复代码 bug，不再手动排查错误。",
      },
      messages: [
        {
          id: 1,
          role: "system",
          kind: "system_goal",
          title: "系统目标说明",
          content:
            "本关只验证一件事：Composer 是否更适合生成完整文件。\n\n1. 打开 Cursor\n2. 按 Cmd+I 打开 Composer\n3. 输入「创建一个显示当前时间的 React 组件」\n4. 观察 AI 生成的完整代码",
        },
        {
          id: 2,
          role: "ai",
          kind: "coach",
          title: "AI 教练引导",
          content:
            "先不要急着理解所有 React 语法。你现在只需要完成一次最小实验，看看 Composer 如何把一句中文描述转成完整组件。做完之后，把结果或报错贴给我。",
        },
      ],
      quickActions: [
        {
          label: "我完成了，接下来做什么？",
          tone: "primary",
          helper: "推进任务",
          category: "progress",
        },
        {
          label: "我卡住了，帮我分析一下",
          tone: "warning",
          helper: "请求帮助",
          category: "help",
        },
        {
          label: "能给我一个提示吗？",
          tone: "secondary",
          helper: "轻量提示",
          category: "hint",
        },
      ],
      responseSamples: [
        {
          trigger: "我完成了，接下来做什么？",
          kind: "task_feedback",
          title: "任务反馈",
          content:
            "很好，这一步已经完成。\n\n**你刚刚确认了两件事：**\n- Composer 更适合生成完整文件或功能块\n- Chat 更适合解释概念、追问细节和排查思路\n\n接下来进入第 4 关，开始练习让 Cursor 直接帮你调试代码。",
          xp: 10,
          nextStep: "进入第 4 关：AI 调试助手",
        },
        {
          trigger: "我卡住了，帮我分析一下",
          kind: "coach",
          title: "AI 教练引导",
          content:
            "先别急，我们把问题缩小。\n\n**常见卡点：**\n1. Cmd+I 没有反应：试试菜单栏 View → Composer\n2. 不知道怎么描述：先写「创建一个显示当前时间的 React 组件」\n3. 代码报错：把错误信息或截图直接贴给我\n\n告诉我你卡在哪一步，我继续带你拆。",
        },
        {
          trigger: "能给我一个提示吗？",
          kind: "coach",
          title: "轻量提示",
          content:
            "你现在不需要提前懂 React 细节。把需求写成结果导向的中文就够了，例如：\n- 创建一个 React 组件\n- 用大字体显示当前时间\n- 每秒自动更新一次\n\n你的任务不是手写代码，而是观察 AI 生成结果并验证它。",
        },
      ],
      rightPanel: {
        currentStep: "用 Composer 生成一个 React 时钟组件",
        completionCriteria: "看到一个可运行的时钟组件并理解为何这是 Composer 场景",
        knowledgePoints: ["Composer 模式", "Chat 模式", "AI 上下文"],
      },
      recentHistory: [
        { title: "Cursor 基础配置", time: "今天", done: true },
        { title: "第一次 AI 对话", time: "昨天", done: true },
        { title: "项目结构理解", time: "2 天前", done: false },
      ],
      tasks: [
        { id: 1, label: "安装 Cursor", done: true },
        { id: 2, label: "完成第一次 AI 对话", done: true },
        { id: 3, label: "理解 Chat vs Composer", done: false, current: true },
        { id: 4, label: "AI 调试助手", done: false },
        { id: 5, label: "多文件上下文", done: false, locked: true },
      ],
      knowledgeTags: [
        { label: "Composer 模式", color: "text-brand bg-brand-dim border-brand/20" },
        { label: "Chat 模式", color: "text-chart-3 bg-chart-3/10 border-chart-3/20" },
        { label: "AI 上下文", color: "text-chart-5 bg-chart-5/10 border-chart-5/20" },
      ],
      tips: [
        {
          title: "先看目标，不急着理解全部代码",
          body: "本关的目标是识别 Composer 的使用场景，而不是一次学完 React 组件写法。",
        },
        {
          title: "复杂任务优先 Composer",
          body: "当你要生成整块代码、完整页面或多段逻辑时，先让 Composer 起草初版。",
        },
        {
          title: "概念追问优先 Chat",
          body: "遇到不懂的概念、报错原因或设计选择时，再用 Chat 继续深挖。",
        },
      ],
    },
  }

export const mockLearningMessageResponse: ApiSuccessResponse<LearningMessageResponseData> = {
  code: "OK",
  message: "success",
  data: {
    conversationId: "conversation-cursor-003",
    taskId: "task-chat-vs-composer",
    assistantMessage: {
      messageId: "message-next-step-001",
      currentGoal: "熟悉 Cursor 中 Composer 的工作方式",
      currentStep: "先让 Composer 生成一个 React 时钟组件",
      whyThisStep: "这是当前最小、最容易验证的实验",
      hintIfStuck: "如果 Cmd+I 没反应，试试从 View 菜单打开 Composer",
      knowledgePoints: ["Composer", "Chat", "生成整块代码"],
      nextStepPreview: "下一步会进入 AI 调试助手",
    },
    taskState: "in_progress",
  },
}
