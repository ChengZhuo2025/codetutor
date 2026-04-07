import type {
  LearningCurrentSessionResponseData,
  LearningMessageRequest,
  LearningMessageResponseData,
  LearningMessagesResponseData,
  LearningTaskState,
} from "@/lib/api/contracts/learning"
import type { ProfileMeResponseData } from "@/lib/api/contracts/auth"
import {
  getLearningLevelLabel,
  getSelectionModeLabel,
} from "@/constants/learning-taxonomy"
import { getRankName } from "@/constants/ranks"
import { createSupabaseAdminClient } from "@/lib/supabase/admin"
import {
  buildStructuredLearningMessageContent,
  parseStoredStructuredLearningMessageContent,
} from "@/lib/learning/structured-message"
import {
  reconcileInterruptedLearningPaths,
} from "@/server/modules/learning-paths/service"
import { normalizeUuid } from "@/server/lib/identifiers"
import { assertSupabaseSuccess, toIsoDate } from "@/server/lib/supabase"
import { orchestrateLearningMessage } from "./orchestration.ts"
import { parseStoredTaskPatchMetadata } from "./logic.ts"
import {
  buildPersistedLearningMessageId,
  normalizeLearningMessagesPageSize,
  resolveLearningMessagesPage,
} from "./history-logic.ts"
import type { Message } from "@/features/learning/types"

type JsonRecord = Record<string, unknown>

type ProfileRow = {
  user_id: string
  nickname: string | null
  avatar_url: string | null
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
  last_conversation_id: string | null
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

type ConversationSessionRow = {
  id: string
}

type ConversationMessageRow = {
  id: string
  sequence_no: number
  user_task_id: string | null
  role: "user" | "assistant"
  message_type: "plain_text" | "assistant_answer" | "assistant_error"
  content_text: string | null
  content_json: JsonRecord
  metadata: JsonRecord
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
  await reconcileInterruptedLearningPaths(userId)

  const supabase = createSupabaseAdminClient()

  const { data: profile, error: profileError } = await supabase
    .from("user_profiles")
    .select("user_id, nickname, avatar_url, learning_level, current_score, current_rank_code, streak_days, last_learning_at")
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
    .select("id, path_step_id, status, started_at, completed_at, created_at, last_conversation_id, score_awarded")
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
    avatarUrl: profile.avatar_url ?? null,
    phone: null,
    email: null,
    wechat: null,
    bio: null,
    primaryTool: {
      code: tool.code,
      name: tool.name,
    },
    learningLevel: profile.learning_level,
    currentScore: profile.current_score,
    currentRank: getRankName(profile.current_rank_code),
    streakDays: profile.streak_days,
    completedTaskCount,
    lastLearningAt: toIsoDate(profile.last_learning_at),
  }
}

function buildDefaultMessages(currentStep: StepRow): Message[] {
  return [
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
      structuredContent: null,
    },
    {
      id: 2,
      role: "ai",
      kind: "coach",
      title: "AI 教练引导",
      content:
        currentStep.focus ??
        "先从一个最小实验开始，不要求一次理解全部概念。做完后把结果发给我，我们再判断下一步。",
      structuredContent: buildStructuredLearningMessageContent({
        title: "AI 教练引导",
        kind: "coach",
        interactionType: "teaching",
        content:
          currentStep.focus ??
          "先从一个最小实验开始，不要求一次理解全部概念。做完后把结果发给我，我们再判断下一步。",
      }),
    },
  ]
}

async function resolveActiveConversationForTask(
  userId: string,
  task: TaskRow,
) {
  const supabase = createSupabaseAdminClient()
  const preferredSessionId = normalizeUuid(task.last_conversation_id)

  if (preferredSessionId) {
    const { data, error } = await supabase
      .from("conversation_sessions")
      .select("id")
      .eq("id", preferredSessionId)
      .eq("user_id", userId)
      .eq("status", "active")
      .eq("is_admin_test", false)
      .maybeSingle()

    assertSupabaseSuccess(error, "failed to load preferred conversation session")

    const session = (data as ConversationSessionRow | null) ?? null
    if (session) {
      return session
    }
  }

  const { data, error } = await supabase
    .from("conversation_sessions")
    .select("id")
    .eq("user_id", userId)
    .eq("user_task_id", task.id)
    .eq("status", "active")
    .eq("is_admin_test", false)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle()

  assertSupabaseSuccess(error, "failed to load active conversation session for task")

  return (data as ConversationSessionRow | null) ?? null
}

async function loadPersistedMessages(
  conversationId: string,
  limit?: number,
  beforeSequenceNo?: number | null,
): Promise<{
  messages: Message[]
  pagination: {
    hasMore: boolean
    nextBeforeSequenceNo: number | null
  }
}> {
  const pageSize = normalizeLearningMessagesPageSize(limit)
  const supabase = createSupabaseAdminClient()
  let query = supabase
    .from("conversation_messages")
    .select("id, sequence_no, user_task_id, role, message_type, content_text, content_json, metadata")
    .eq("session_id", conversationId)
    .in("role", ["user", "assistant"])
    .order("sequence_no", { ascending: false })
    .limit(pageSize + 1)

  if (typeof beforeSequenceNo === "number" && Number.isFinite(beforeSequenceNo)) {
    query = query.lt("sequence_no", beforeSequenceNo)
  }

  const { data, error } = await query

  assertSupabaseSuccess(error, "failed to load persisted conversation messages")

  const rows = (data ?? []) as ConversationMessageRow[]
  const page = resolveLearningMessagesPage(
    rows.map((row) => ({
      ...row,
      sequenceNo: row.sequence_no,
    })),
    pageSize,
  )

  return {
    messages: page.items.map((row) => {
      const metadata = row.metadata ?? {}
      const title =
        typeof metadata.title === "string"
          ? metadata.title
          : row.role === "assistant"
            ? "AI 教练引导"
            : "我的反馈"
      const kind =
        row.role === "assistant"
          ? metadata.kind === "task_feedback"
            ? "task_feedback"
            : "coach"
          : "user_input"

      return {
        id: buildPersistedLearningMessageId(row.sequenceNo),
        role: row.role === "assistant" ? "ai" : "user",
        kind,
        title,
        content: row.content_text ?? "",
        structuredContent:
          row.role === "assistant"
            ? parseStoredStructuredLearningMessageContent(
                row.content_json?.structuredContent ?? null,
              )
            : null,
        taskPatch:
          row.role === "assistant"
            ? parseStoredTaskPatchMetadata({
                taskId: row.user_task_id ?? "",
                metadata,
              })
            : null,
      } satisfies Message
    }),
    pagination: {
      hasMore: page.hasMore,
      nextBeforeSequenceNo: page.nextBeforeSequenceNo,
    },
  }
}

async function assertConversationBelongsToUser(
  userId: string,
  conversationId: string,
) {
  const supabase = createSupabaseAdminClient()
  const { data, error } = await supabase
    .from("conversation_sessions")
    .select("id")
    .eq("id", conversationId)
    .eq("user_id", userId)
    .eq("is_admin_test", false)
    .maybeSingle()

  assertSupabaseSuccess(error, "failed to validate conversation ownership")

  return (data as ConversationSessionRow | null) ?? null
}

export async function getLearningMessagesPage(
  userId: string,
  input: {
    conversationId: string
    beforeSequenceNo?: number | null
    limit?: number
  },
): Promise<LearningMessagesResponseData | null> {
  const conversation = await assertConversationBelongsToUser(userId, input.conversationId)
  if (!conversation) {
    return null
  }

  const page = await loadPersistedMessages(
    conversation.id,
    input.limit,
    input.beforeSequenceNo,
  )

  return {
    conversationId: conversation.id,
    messages: page.messages,
    pagination: page.pagination,
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
  const baseMessages = buildDefaultMessages(currentStep)
  const activeConversation = await resolveActiveConversationForTask(userId, currentTask)
  const persistedMessagePage =
    activeConversation
      ? await loadPersistedMessages(activeConversation.id)
      : null
  const persistedMessages = persistedMessagePage?.messages ?? []
  const totalSteps = Math.max(state.activePath.total_steps, orderedSteps.length)
  const currentProgressPercent =
    totalSteps > 0
      ? Math.round(((state.activePath.completed_steps + (currentTask.status === "in_progress" ? 0.5 : 0)) / totalSteps) * 100)
      : 0

  return {
    conversationId: activeConversation?.id ?? null,
    historyPagination: persistedMessagePage?.pagination ?? {
      hasMore: false,
      nextBeforeSequenceNo: null,
    },
    path: {
      id: state.activePath.id,
      status: "in_progress",
    },
    task: {
      taskId: currentTask.id,
      title: currentStep.title,
      status: mapTaskState(currentTask.status),
    },
    profile: toProfileData(state.profile, state.tool, completedTaskCount),
    planSummary: {
      selectedToolName: state.tool.name,
      learningLevelLabel: getLearningLevelLabel(state.activePath.learning_level),
      selectionModeLabel: getSelectionModeLabel(state.activePath.selection_mode),
      selectionMode: state.activePath.selection_mode,
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
    messages: [...baseMessages, ...persistedMessages],
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

export async function sendLearningMessage(
  userId: string,
  request: LearningMessageRequest,
): Promise<LearningMessageResponseData | null> {
  return orchestrateLearningMessage(userId, request)
}
