import type {
  LearningCurrentSessionResponseData,
  LearningInputType,
  LearningMessageRequest,
  LearningMessageResponseData,
  LearningTaskState,
} from "@/lib/api/contracts/learning"
import type { ProfileMeResponseData } from "@/lib/api/contracts/auth"
import { createSupabaseAdminClient } from "@/lib/supabase/admin"
import { assertSupabaseSuccess, toIsoDate } from "@/server/lib/supabase"
import type { Message } from "@/features/learning/types"

type JsonRecord = Record<string, unknown>

type ProfileRow = {
  user_id: string
  nickname: string | null
  learning_level: "beginner" | "intermediate" | "advanced"
  current_score: number
  current_rank_code: string
  streak_days: number
  last_learning_at: string | null
}

type ToolRow = {
  id: string
  code: string
  name: string
}

type ActivePathRow = {
  id: string
  tool_id: string
  path_name_snapshot: string
  path_summary_snapshot: string | null
  learning_level: "beginner" | "intermediate" | "advanced"
  selection_mode: "self_directed" | "preset_training"
  total_steps: number
  completed_steps: number
  current_task_id: string | null
  last_activity_at: string | null
  template_path_id: string | null
}

type TaskRow = {
  id: string
  path_step_id: string
  status: "not_started" | "in_progress" | "blocked" | "completed" | "archived"
  started_at: string | null
  completed_at: string | null
  created_at: string
  score_awarded: number
}

type StepRow = {
  id: string
  step_no: number
  title: string
  summary: string
  focus: string | null
  goal: string
  completion_criteria: string | null
  review_summary: string | null
  estimated_minutes: number | null
  reward_score: number
  knowledge_points: unknown
  key_points: unknown
  pitfalls: unknown
}

const LEVEL_LABEL_MAP: Record<string, string> = {
  beginner: "完全入门",
  intermediate: "有一定基础",
  advanced: "进阶提升",
}

const MODE_LABEL_MAP: Record<string, string> = {
  self_directed: "自由模式",
  preset_training: "平台训练模式",
}

const RANK_LABEL_MAP: Record<string, string> = {
  rookie: "萌新码农",
  apprentice: "AI 学徒",
  vibe_coder: "Vibe Coder",
  builder: "AI 建造者",
  master: "AI 编程大师",
}

const KNOWLEDGE_TAG_COLORS = [
  "text-brand bg-brand-dim border-brand/20",
  "text-chart-3 bg-chart-3/10 border-chart-3/20",
  "text-chart-5 bg-chart-5/10 border-chart-5/20",
]

function toStringArray(input: unknown) {
  if (!Array.isArray(input)) {
    return [] as string[]
  }

  return input.filter((item): item is string => typeof item === "string")
}

function toPitfalls(input: unknown) {
  if (!Array.isArray(input)) {
    return [] as Array<{ text: string; isTrap?: boolean }>
  }

  return input
    .map((item) => {
      if (!item || typeof item !== "object") {
        return null
      }

      const record = item as JsonRecord
      if (typeof record.text !== "string") {
        return null
      }

      const isTrap = typeof record.isTrap === "boolean" ? record.isTrap : undefined

      return {
        text: record.text,
        ...(isTrap === undefined ? {} : { isTrap }),
      }
    })
    .filter((item): item is { text: string; isTrap?: boolean } => Boolean(item))
}

function getRelativeLastSeenLabel(input: string | null) {
  if (!input) {
    return "刚刚"
  }

  const diffMinutes = Math.max(
    1,
    Math.round((Date.now() - new Date(input).getTime()) / 60000),
  )

  if (diffMinutes < 60) {
    return `上次停留在 ${diffMinutes} 分钟前`
  }

  const diffHours = Math.round(diffMinutes / 60)
  if (diffHours < 24) {
    return `上次停留在 ${diffHours} 小时前`
  }

  const diffDays = Math.round(diffHours / 24)
  return `上次停留在 ${diffDays} 天前`
}

function mapTaskState(status: TaskRow["status"]): LearningTaskState {
  if (status === "completed") {
    return "completed"
  }

  if (status === "in_progress") {
    return "in_progress"
  }

  if (status === "blocked") {
    return "blocked"
  }

  return "pending"
}

async function loadLearningState(userId: string) {
  const supabase = createSupabaseAdminClient()

  const { data: profile, error: profileError } = await supabase
    .from("user_profiles")
    .select("user_id, nickname, learning_level, current_score, current_rank_code, streak_days, last_learning_at")
    .eq("user_id", userId)
    .maybeSingle()

  assertSupabaseSuccess(profileError, "failed to load learning profile")

  const { data: activePath, error: activePathError } = await supabase
    .from("user_learning_paths")
    .select("id, tool_id, path_name_snapshot, path_summary_snapshot, learning_level, selection_mode, total_steps, completed_steps, current_task_id, last_activity_at, template_path_id")
    .eq("user_id", userId)
    .eq("status", "active")
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle()

  assertSupabaseSuccess(activePathError, "failed to load current learning path")

  if (!profile || !activePath) {
    return null
  }

  const { data: tool, error: toolError } = await supabase
    .from("learning_tools")
    .select("id, code, name")
    .eq("id", activePath.tool_id)
    .maybeSingle()

  assertSupabaseSuccess(toolError, "failed to load learning tool")

  const { data: tasks, error: taskError } = await supabase
    .from("user_tasks")
    .select("id, path_step_id, status, started_at, completed_at, created_at, score_awarded")
    .eq("user_learning_path_id", activePath.id)

  assertSupabaseSuccess(taskError, "failed to load learning tasks")

  const { data: steps, error: stepError } =
    activePath.template_path_id === null
      ? { data: [] as StepRow[], error: null }
      : await supabase
          .from("path_steps")
          .select("id, step_no, title, summary, focus, goal, completion_criteria, review_summary, estimated_minutes, reward_score, knowledge_points, key_points, pitfalls")
          .eq("path_id", activePath.template_path_id)
          .order("step_no", { ascending: true })

  assertSupabaseSuccess(stepError, "failed to load path steps")

  if (!tool) {
    return null
  }

  return {
    profile: profile as ProfileRow,
    tool: tool as ToolRow,
    activePath: activePath as ActivePathRow,
    tasks: (tasks ?? []) as TaskRow[],
    steps: (steps ?? []) as StepRow[],
  }
}

function toProfileData(
  profile: ProfileRow,
  tool: ToolRow,
  completedTaskCount: number,
): ProfileMeResponseData {
  return {
    userId: profile.user_id,
    nickname: profile.nickname ?? "学员",
    primaryTool: {
      code: tool.code,
      name: tool.name,
    },
    learningLevel: profile.learning_level,
    currentScore: profile.current_score,
    currentRank: RANK_LABEL_MAP[profile.current_rank_code] ?? profile.current_rank_code,
    streakDays: profile.streak_days,
    completedTaskCount,
    lastLearningAt: toIsoDate(profile.last_learning_at),
  }
}

export async function getLearningCurrentSessionData(
  userId: string,
): Promise<LearningCurrentSessionResponseData | null> {
  const state = await loadLearningState(userId)

  if (!state) {
    return null
  }

  const completedTaskCount = state.tasks.filter((task) => task.status === "completed").length
  const taskByStepId = new Map(state.tasks.map((task) => [task.path_step_id, task]))
  const orderedSteps = state.steps
  const currentTask =
    state.tasks.find((task) => task.id === state.activePath.current_task_id) ??
    state.tasks.find((task) => task.status === "in_progress") ??
    state.tasks.find((task) => task.status === "blocked") ??
    state.tasks.find((task) => task.status === "not_started") ??
    state.tasks[0]

  if (!currentTask) {
    return null
  }

  const currentStep =
    orderedSteps.find((step) => step.id === currentTask.path_step_id) ?? orderedSteps[0]

  if (!currentStep) {
    return null
  }

  const nextStep = orderedSteps.find((step) => step.step_no === currentStep.step_no + 1) ?? null
  const knowledgePoints = toStringArray(currentStep.knowledge_points)
  const masteryPoints = toStringArray(currentStep.key_points)
  const pitfalls = toPitfalls(currentStep.pitfalls)
  const totalSteps = Math.max(state.activePath.total_steps, orderedSteps.length)
  const currentProgressPercent =
    totalSteps > 0
      ? Math.round(((state.activePath.completed_steps + (currentTask.status === "in_progress" ? 0.5 : 0)) / totalSteps) * 100)
      : 0

  return {
    conversationId: `session-${state.activePath.id}`,
    task: {
      taskId: currentTask.id,
      title: currentStep.title,
      status: mapTaskState(currentTask.status),
    },
    profile: toProfileData(state.profile, state.tool, completedTaskCount),
    planSummary: {
      selectedToolName: state.tool.name,
      learningLevelLabel: LEVEL_LABEL_MAP[state.activePath.learning_level] ?? state.activePath.learning_level,
      selectionModeLabel:
        MODE_LABEL_MAP[state.activePath.selection_mode] ?? state.activePath.selection_mode,
      pathName: state.activePath.path_name_snapshot,
    },
    resume: {
      title: "继续上次学习",
      summary: currentStep.summary,
      lastSeenLabel: getRelativeLastSeenLabel(
        state.activePath.last_activity_at ?? state.profile.last_learning_at,
      ),
      ctaLabel: "继续这一关",
    },
    mission: {
      title: currentStep.title,
      tool: state.tool.name,
      stageLabel: `第 ${currentStep.step_no} 关 / 共 ${totalSteps} 关`,
      goal: currentStep.goal,
      summary: currentStep.focus ?? currentStep.summary,
      estimatedTime: `约 ${currentStep.estimated_minutes ?? 10} 分钟`,
      reward: `+${currentStep.reward_score} XP`,
      progressLabel: `${state.activePath.completed_steps} / ${totalSteps} 关已完成`,
      progressPercent: currentProgressPercent,
      coachCue:
        currentStep.focus ?? "先把任务做小，只验证当前这一关的核心能力，不要一次扩展太多。",
      nextUnlockTitle: nextStep?.title ?? "完成当前路径",
      nextUnlockSummary:
        nextStep?.summary ?? "完成这一关后，你可以回到地图查看新的路径状态。",
    },
    messages: [
      {
        id: 1,
        role: "system",
        kind: "system_goal",
        title: "系统目标说明",
        content: [
          `本关只验证一件事：${currentStep.goal}`,
          "",
          `1. 先完成「${currentStep.title}」`,
          `2. 对照完成标准检查是否达成`,
          "3. 把你的结果、截图或报错贴给我",
        ].join("\n"),
      },
      {
        id: 2,
        role: "ai",
        kind: "coach",
        title: "AI 教练引导",
        content:
          currentStep.focus ??
          "先从一个最小实验开始，不要求一次理解全部概念。做完后把结果发给我，我们再判断下一步。",
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
        content: [
          "很好，这一步已经完成。",
          "",
          "**你已经确认了当前关卡的关键能力：**",
          `- ${currentStep.title}`,
          nextStep ? `- 接下来可以进入 ${nextStep.title}` : "- 当前路径已接近完成",
        ].join("\n"),
        xp: currentStep.reward_score,
        nextStep: nextStep ? `进入下一关：${nextStep.title}` : "回到地图查看路径状态",
      },
      {
        trigger: "帮我拆细一点",
        kind: "coach",
        title: "拆小当前步骤",
        content: [
          "我们把这一步再缩小。",
          "",
          `1. 先只完成「${currentStep.title}」里最小的一次尝试`,
          "2. 不追求一步到位，只要拿到第一个可验证结果",
          "3. 再把结果发给我，我帮你判断下一步",
        ].join("\n"),
      },
      {
        trigger: "给我一点提示",
        kind: "coach",
        title: "轻量提示",
        content:
          currentStep.focus ??
          "先用结果导向的话描述你要达成什么，而不是试图一次写完整规范。",
      },
      {
        trigger: "给我一个例子",
        kind: "coach",
        title: "最小示例",
        content: [
          "你可以先尝试这个最小表达：",
          "",
          `**请帮我完成「${currentStep.title}」，目标是：${currentStep.goal}**`,
          "",
          "先验证一次最小结果，再决定是否扩展。",
        ].join("\n"),
      },
    ],
    rightPanel: {
      currentStep: currentStep.title,
      whyThisStep: currentStep.focus ?? currentStep.summary,
      completionCriteria: currentStep.completion_criteria ?? currentStep.goal,
      hintIfStuck:
        "如果不知道怎么描述，就先提交一句结果导向的话，再把报错或结果贴回来。",
      knowledgePoints,
      masteryPoints: masteryPoints.length > 0 ? masteryPoints : knowledgePoints,
      cautions: pitfalls,
      nextStepPreview:
        nextStep?.summary ?? "完成当前关卡后，可以继续回到地图查看下一步。",
    },
    recentPracticeRounds: orderedSteps.slice(0, 3).map((step) => {
      const task = taskByStepId.get(step.id)
      const status = task?.status ?? "not_started"
      return {
        id: `practice-round-${String(step.step_no).padStart(3, "0")}`,
        taskTitle: step.title,
        stageLabel: `第 ${step.step_no} 关`,
        lastActiveLabel:
          status === "completed"
            ? "已完成"
            : status === "in_progress"
              ? "进行中"
              : "待开始",
        status:
          status === "completed"
            ? "completed"
            : status === "in_progress"
              ? "in_progress"
              : "paused",
      }
    }),
    tasks: orderedSteps.map((step) => {
      const task = taskByStepId.get(step.id)
      const status = task?.status ?? "not_started"
      return {
        id: step.step_no,
        label: step.title,
        done: status === "completed",
        current: step.id === currentStep.id,
        locked: status === "not_started" && step.step_no > currentStep.step_no,
      }
    }),
    knowledgeTags: knowledgePoints.map((label, index) => ({
      label,
      color: KNOWLEDGE_TAG_COLORS[index % KNOWLEDGE_TAG_COLORS.length],
    })),
    tips: [
      {
        title: "先完成最小验证，不急着扩展",
        body: "当前关卡只需要验证一个核心动作，先跑通最小结果，再继续追问更深的问题。",
      },
      {
        title: "卡住时优先贴结果和报错",
        body: "相比抽象描述，把你看到的代码、截图或报错发出来，AI 更容易给到准确建议。",
      },
      {
        title: "学会判断下一步，而不是一次做完全部",
        body: "每一关都在训练你和 AI 的协作节奏，先判断当前一步，再推进后续工作。",
      },
    ],
  }
}

function guessReply(
  input: string,
  session: LearningCurrentSessionResponseData,
): Message {
  const normalized = input.trim()
  const completedReply = session.responseSamples.find((item) => item.trigger === "我完成了")
  const breakdownReply = session.responseSamples.find((item) => item.trigger === "帮我拆细一点")
  const hintReply = session.responseSamples.find((item) => item.trigger === "给我一点提示")
  const exampleReply = session.responseSamples.find((item) => item.trigger === "给我一个例子")

  if (normalized.includes("完成") && completedReply) {
    return {
      id: Date.now(),
      role: "ai",
      kind: completedReply.kind,
      title: completedReply.title,
      content: completedReply.content,
      xp: completedReply.xp,
      nextStep: completedReply.nextStep,
    }
  }

  if ((normalized.includes("拆") || normalized.includes("卡住")) && breakdownReply) {
    return {
      id: Date.now(),
      role: "ai",
      kind: breakdownReply.kind,
      title: breakdownReply.title,
      content: breakdownReply.content,
    }
  }

  if (normalized.includes("例子") && exampleReply) {
    return {
      id: Date.now(),
      role: "ai",
      kind: exampleReply.kind,
      title: exampleReply.title,
      content: exampleReply.content,
    }
  }

  if ((normalized.includes("提示") || normalized.includes("怎么")) && hintReply) {
    return {
      id: Date.now(),
      role: "ai",
      kind: hintReply.kind,
      title: hintReply.title,
      content: hintReply.content,
    }
  }

  return {
    id: Date.now(),
    role: "ai",
    kind: "coach",
    title: "下一步建议",
    content: [
      "我已经收到你的当前反馈。",
      "",
      `先继续围绕「${session.task.title}」做最小验证，把这一步的结果、截图或报错贴给我，我再帮你判断下一步。`,
    ].join("\n"),
  }
}

export async function sendLearningMessage(
  userId: string,
  request: LearningMessageRequest,
): Promise<LearningMessageResponseData | null> {
  const session = await getLearningCurrentSessionData(userId)

  if (!session) {
    return null
  }

  const inputType: LearningInputType = request.inputType ?? "text"
  const content = request.content.trim()
  const message = guessReply(content, session)

  return {
    conversationId: session.conversationId,
    taskId: session.task.taskId,
    message: {
      ...message,
      content:
        inputType === "code"
          ? `${message.content}\n\n如果你已经有代码片段，可以继续直接贴出来，我会按代码上下文继续帮你判断。`
          : message.content,
    },
    taskState: session.task.status,
  }
}
