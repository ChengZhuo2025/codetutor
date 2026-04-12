import type { ApiSuccessResponse } from "@/lib/api/types"
import {
  getLearningLevelLabel,
  getSelectionModeLabel,
} from "@/constants/learning-taxonomy"
import type {
  LearningCurrentSessionResponseData,
  LearningMessageResponseData,
} from "@/lib/api/contracts/learning"
import { mockProfileMeResponse } from "@/features/auth/data/login-data"
import { currentLearningPlan } from "@/lib/mocks/current-learning-plan"

const currentStage =
  currentLearningPlan.stages.find((stage) => stage.status === "current") ??
  currentLearningPlan.stages[0]
const nextStage =
  currentLearningPlan.stages.find((stage) => stage.id > currentStage.id) ?? currentStage

const knowledgeTagColors = [
  "text-brand bg-brand-dim border-brand/20",
  "text-chart-3 bg-chart-3/10 border-chart-3/20",
  "text-chart-5 bg-chart-5/10 border-chart-5/20",
]

export const mockLearningCurrentSessionResponse: ApiSuccessResponse<LearningCurrentSessionResponseData> =
  {
    code: "OK",
    message: "success",
    data: {
      conversationId: "conversation-cursor-003",
      historyPagination: {
        hasMore: false,
        nextBeforeSequenceNo: null,
      },
      pendingMaterialPlanDraft: null,
      path: {
        id: "path-instance-cursor-003",
        status: "in_progress",
      },
      task: {
        taskId: currentStage.taskId,
        title: currentStage.title,
        status: "in_progress",
      },
      profile: mockProfileMeResponse.data,
      planSummary: {
        selectedToolName: currentLearningPlan.tool.label,
        learningLevelLabel: getLearningLevelLabel("beginner"),
        selectionModeLabel: getSelectionModeLabel("preset_training"),
        selectionMode: "preset_training",
        pathName: currentLearningPlan.pathName,
      },
      resume: {
        title: "继续上次学习",
        summary: "你已经完成了基础安装与第一次提问，现在继续验证 Ask 与 Agent 的职责边界。",
        lastSeenLabel: "上次停留在 18 分钟前",
        ctaLabel: "继续这一关",
      },
      mission: {
        title: currentStage.title,
        tool: currentLearningPlan.tool.label,
        stageLabel: `第 ${currentStage.id} 关 / 共 ${currentLearningPlan.stages.length} 关`,
        goal: currentStage.goal,
        summary: currentStage.focus,
        estimatedTime: `约 ${currentStage.estimatedTime}`,
        reward: `+${currentStage.xp} XP`,
        progressLabel: "1 / 3 步",
        progressPercent: 36,
        coachCue: "先把任务做小，只验证 Agent 是否比 Ask 更适合生成完整文件。",
        nextUnlockTitle: nextStage.title,
        nextUnlockSummary: nextStage.summary,
      },
      messages: [
        {
          id: 1,
          role: "system",
          kind: "system_goal",
          title: "系统目标说明",
          content:
            "本关只验证一件事：Agent 是否更适合生成完整文件。\n\n1. 打开 Cursor\n2. 按 Cmd+I 打开 Agent\n3. 输入「创建一个显示当前时间的 React 组件」\n4. 观察 AI 生成的完整代码",
        },
        {
          id: 2,
          role: "ai",
          kind: "coach",
          title: "AI 教练引导",
          content:
            "先不要急着理解所有 React 语法。你现在只需要完成一次最小实验，看看 Agent 如何把一句中文描述转成完整组件。做完之后，把结果或报错贴给我。",
        },
      ],
      quickActions: [
        {
          label: "我完成了",
          tone: "primary",
          helper: "推进任务",
          category: "progress",
        },
        {
          label: "帮我拆细一点",
          tone: "secondary",
          helper: "拆小当前步骤",
          category: "help",
        },
        {
          label: "我卡住了",
          tone: "warning",
          helper: "分层求助",
          category: "help",
        },
        {
          label: "给我一个例子",
          tone: "secondary",
          helper: "最小示例",
          category: "hint",
        },
      ],
      supportOptions: [
        {
          mode: "hint",
          label: "给我一点提示",
          description: "只提醒关键方向，不直接把答案展开。",
          prompt: "给我一点提示",
        },
        {
          mode: "breakdown",
          label: "帮我缩小问题",
          description: "把当前任务拆成更小的一步，先做最容易完成的部分。",
          prompt: "帮我拆细一点",
        },
        {
          mode: "minimal_example",
          label: "给我最小示例",
          description: "提供一个最小可运行例子，帮助你先跑通一次。",
          prompt: "给我一个例子",
        },
      ],
      responseSamples: [
        {
          trigger: "我完成了",
          kind: "task_feedback",
          title: "任务反馈",
          content:
            `很好，这一步已经完成。\n\n**你刚刚确认了两件事：**\n- Agent 更适合生成完整文件或功能块\n- Ask 更适合解释概念、追问细节和排查思路\n\n接下来进入第 ${nextStage.id} 关，开始练习${nextStage.title}。`,
          xp: currentStage.xp,
          nextStep: `进入第 ${nextStage.id} 关：${nextStage.title}`,
        },
        {
          trigger: "帮我拆细一点",
          kind: "coach",
          title: "拆小当前步骤",
          content:
            "我们把这一步再缩小。\n\n**你现在只需要做这 2 件事：**\n1. 打开 Agent 面板，不急着输入 Prompt\n2. 复制这句最简单描述：「创建一个显示当前时间的 React 组件」\n\n先验证面板能打开，再继续下一步。",
        },
        {
          trigger: "给我一点提示",
          kind: "coach",
          title: "轻量提示",
          content:
            "你现在不需要提前懂 React 细节。把需求写成结果导向的中文就够了，例如：\n- 创建一个 React 组件\n- 用大字体显示当前时间\n- 每秒自动更新一次\n\n你的任务不是手写代码，而是观察 AI 生成结果并验证它。",
        },
        {
          trigger: "给我一个例子",
          kind: "coach",
          title: "最小示例",
          content:
            "你可以直接把这句发给 Agent：\n\n**创建一个 React 组件，用大字体显示当前时间，并且每秒自动更新一次。**\n\n先不要扩展样式，不要加别的功能。你的目标只是观察 Agent 是否能一次性生成完整组件。",
        },
      ],
      rightPanel: {
        currentStep: "用 Agent 生成一个 React 时钟组件",
        whyThisStep: currentStage.focus,
        completionCriteria: currentStage.completionCriteria,
        hintIfStuck: "如果不知道怎么描述，就先提交一句结果导向的话，而不是试图写完整规范。",
        knowledgePoints: currentStage.tags,
        masteryPoints: currentStage.keyPoints,
        cautions: currentStage.pitfalls,
        nextStepPreview: `下一步会进入 ${nextStage.title}，继续建立更完整的 Cursor 协作工作流。`,
      },
      recentPracticeRounds: currentLearningPlan.stages.slice(0, 3).map((stage, index) => ({
        id: `practice-round-${String(index + 1).padStart(3, "0")}`,
        taskTitle: stage.title,
        stageLabel: `第 ${stage.id} 关`,
        lastActiveLabel: stage.status === "current" ? "18 分钟前" : index === 0 ? "今天" : "昨天",
        status: stage.status === "done" ? "completed" : "in_progress",
      })),
      tasks: currentLearningPlan.stages.map((stage) => ({
        id: stage.id,
        label: stage.title,
        done: stage.status === "done",
        current: stage.status === "current",
        locked: stage.status === "locked",
      })),
      knowledgeTags: currentStage.tags.map((label, index) => ({
        label,
        color: knowledgeTagColors[index % knowledgeTagColors.length],
      })),
    },
  }

export const mockLearningMessageResponse: ApiSuccessResponse<LearningMessageResponseData> = {
  code: "OK",
  message: "success",
  data: {
    conversationId: "conversation-cursor-003",
    taskId: currentStage.taskId,
    message: {
      id: 3,
      role: "ai",
      kind: "coach",
      title: "下一步建议",
      content:
        "先让 Agent 生成一个 React 时钟组件，确认它更适合整块代码生成。遇到问题时，把报错或生成结果直接贴给我。",
    },
    taskState: "in_progress",
  },
}
