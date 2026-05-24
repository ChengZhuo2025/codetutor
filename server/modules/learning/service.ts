import type {
  LearningCurrentSessionResponseData,
  LearningMessageRequest,
  LearningMessageResponseData,
  LearningMessagesResponseData,
  LearningRestartConversationResponseData,
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
import { resolveStageReviewSummary } from "@/features/progress/lib/review-navigation"
import { normalizeUuid } from "@/server/lib/identifiers"
import { assertSupabaseSuccess, toIsoDate } from "@/server/lib/supabase"
import { orchestrateLearningMessage } from "./orchestration.ts"
import { hasLearningResumeHistory, parseStoredTaskPatchMetadata } from "./logic.ts"
import {
  buildPersistedLearningMessageId,
  normalizeLearningMessagesPageSize,
  resolveLearningMessagesPage,
} from "./history-logic.ts"
import type { Message, MessageAttachment } from "@/features/learning/types"

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
  created_at?: string | null
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
  metadata: JsonRecord
}

type PendingMaterialPlanDraftRow = {
  id: string
  intake_id: string
  updated_at: string
}

type ActiveMaterialPlanIntakeRow = {
  id: string
  status: "queued" | "extracting" | "planning" | "quality_checking" | "ready" | "failed"
  processing_stage: string | null
  progress_percent: number | null
  progress_message: string | null
  latest_run_id: string | null
  latest_draft_id: string | null
  error_code: string | null
  updated_at: string
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
  metadata: unknown
}

type ConversationSessionRow = {
  id: string
  user_task_id: string | null
  status: string
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

type StoredMessageAttachment = {
  id: string
  kind: "image" | "audio"
  original_filename: string | null
  mime_type: string
  size_bytes: number
  duration_ms: number | null
  processing_status: "pending" | "processing" | "completed" | "failed"
  extracted_text: string | null
  visual_summary: string | null
  transcript_text: string | null
  error_message: string | null
  storage_bucket: string
  storage_path: string
}

function parseStoredMessageAttachments(value: unknown): MessageAttachment[] {
  if (!Array.isArray(value)) {
    return []
  }

  return value
    .filter((item): item is JsonRecord => Boolean(item) && typeof item === "object" && !Array.isArray(item))
    .map((item) => {
      const type = item.kind === "audio" ? "audio" : "image"
      const name =
        typeof item.originalFilename === "string" && item.originalFilename.trim().length > 0
          ? item.originalFilename
          : type === "audio"
            ? "语音消息"
            : "图片附件"

      return {
        id: typeof item.id === "string" ? item.id : undefined,
        type,
        name,
        mimeType: typeof item.mimeType === "string" ? item.mimeType : undefined,
        sizeBytes: typeof item.sizeBytes === "number" ? item.sizeBytes : undefined,
        durationMs: typeof item.durationMs === "number" ? item.durationMs : null,
        processingStatus:
          item.processingStatus === "pending" ||
          item.processingStatus === "processing" ||
          item.processingStatus === "completed" ||
          item.processingStatus === "failed"
            ? item.processingStatus
            : undefined,
        extractedText: typeof item.extractedText === "string" ? item.extractedText : null,
        visualSummary: typeof item.visualSummary === "string" ? item.visualSummary : null,
        transcriptText: typeof item.transcriptText === "string" ? item.transcriptText : null,
        errorMessage: typeof item.errorMessage === "string" ? item.errorMessage : null,
      }
    })
}

const ATTACHMENT_CONTEXT_PREFIXES = [
  "用户随消息附带了以下多媒体附件。",
  "附件 1（",
]

const ATTACHMENT_ONLY_FALLBACK_CONTENT = "用户发送了一条仅包含附件的消息。"

function inferAttachmentOnlyVisibleContent(attachments: MessageAttachment[]) {
  if (attachments.some((attachment) => attachment.type === "audio")) {
    return "我发送了一条语音消息，请帮我解答。"
  }

  if (attachments.some((attachment) => attachment.type === "image")) {
    return "我上传了一张截图，请帮我定位问题。"
  }

  return ATTACHMENT_ONLY_FALLBACK_CONTENT
}

function stripInjectedAttachmentContext(rawContent: string) {
  let boundary = -1

  for (const marker of ATTACHMENT_CONTEXT_PREFIXES) {
    const index = rawContent.indexOf(marker)
    if (index >= 0 && (boundary < 0 || index < boundary)) {
      boundary = index
    }
  }

  if (boundary < 0) {
    return rawContent.trim()
  }

  return rawContent.slice(0, boundary).trim()
}

function resolvePersistedUserVisibleContent(input: {
  contentText: string | null
  metadata: JsonRecord
  attachments: MessageAttachment[]
}) {
  const originalContent =
    typeof input.metadata.originalContent === "string"
      ? input.metadata.originalContent.trim()
      : ""

  if (originalContent.length > 0) {
    return originalContent
  }

  const rawContent = typeof input.contentText === "string" ? input.contentText : ""
  const strippedContent = stripInjectedAttachmentContext(rawContent)

  if (
    strippedContent.length > 0
    && strippedContent !== ATTACHMENT_ONLY_FALLBACK_CONTENT
  ) {
    return strippedContent
  }

  if (input.attachments.length > 0) {
    return inferAttachmentOnlyVisibleContent(input.attachments)
  }

  return strippedContent
}

async function applyAttachmentSignedUrlsToMessages(
  supabase: ReturnType<typeof createSupabaseAdminClient>,
  messages: Message[],
) {
  const attachmentIdSet = new Set<string>()
  for (const message of messages) {
    const attachments = message.attachments?.length
      ? message.attachments
      : message.attachment
        ? [message.attachment]
        : []

    for (const attachment of attachments) {
      if (attachment.id) {
        attachmentIdSet.add(attachment.id)
      }
    }
  }

  const attachmentIds = Array.from(attachmentIdSet)
  if (attachmentIds.length === 0) {
    return messages
  }

  const { data, error } = await supabase
    .from("learning_message_attachments")
    .select(
      "id, kind, original_filename, mime_type, size_bytes, duration_ms, processing_status, extracted_text, visual_summary, transcript_text, error_message, storage_bucket, storage_path",
    )
    .in("id", attachmentIds)

  assertSupabaseSuccess(error, "failed to load persisted learning message attachments")

  const rows = (data ?? []) as StoredMessageAttachment[]
  const signedUrlMap = new Map<string, string>()

  for (const row of rows) {
    const { data: signedUrlData, error: signedUrlError } = await supabase.storage
      .from(row.storage_bucket)
      .createSignedUrl(row.storage_path, 600)

    assertSupabaseSuccess(
      signedUrlError,
      "failed to create signed url for persisted learning message attachment",
    )

    if (signedUrlData?.signedUrl) {
      signedUrlMap.set(row.id, signedUrlData.signedUrl)
    }
  }

  return messages.map((message) => {
    const baseAttachments = message.attachments?.length
      ? message.attachments
      : message.attachment
        ? [message.attachment]
        : []

    if (baseAttachments.length === 0) {
      return message
    }

    const attachments = baseAttachments.map((attachment) => {
      if (!attachment.id) {
        return attachment
      }

      const signedUrl = signedUrlMap.get(attachment.id)
      if (!signedUrl) {
        return attachment
      }

      return {
        ...attachment,
        url: signedUrl,
      }
    })

    return {
      ...message,
      attachment: attachments[0],
      attachments,
    }
  })
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

function readJsonRecord(value: unknown): JsonRecord {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {}
  }
  return value as JsonRecord
}

function readStringFromRecord(record: JsonRecord, key: string): string | null {
  const value = record[key]
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null
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

/** 下一步卡片/侧栏说明：与当前任务 whyThisStep 一致，优先 focus，再 summary / goal 等。 */
function resolveNextStepBodyText(step: StepRow | null): string | null {
  if (!step) {
    return null
  }

  const candidates = [step.focus, step.summary, step.goal, step.completion_criteria]
  for (const value of candidates) {
    if (typeof value === "string") {
      const trimmed = value.trim()
      if (trimmed.length > 0) {
        return trimmed
      }
    }
  }

  return null
}

const FINAL_PATH_STEP_TITLE = "当前已是最后一步"
const FINAL_PATH_STEP_PREVIEW =
  "你正处在本学习计划的最后一步；完成当前任务后，这条路径上的练习即全部结束。之后可到学习地图查看整体进度，或选择新的学习内容。"

const LONG_FOCUS_MIN_LEN = 120

function hasMaterialPlanFromPath(activePath: ActivePathRow): boolean {
  return (
    activePath.selection_mode === "self_directed"
    && typeof (activePath.metadata as JsonRecord | undefined)?.seedSource === "string"
    && (activePath.metadata as JsonRecord).seedSource === "plan_draft_confirmed"
  )
}

function isLongInstructionText(text: string): boolean {
  const t = text.trim()
  if (t.length >= LONG_FOCUS_MIN_LEN) {
    return true
  }

  const clauseBreaks = (t.match(/[；。]/g) ?? []).length
  return clauseBreaks >= 2 && t.length >= 60
}

function resolveCoachCue(input: {
  currentStep: StepRow
  whyThisStep: string
  hasMaterialPlan: boolean
  isCompletedReviewTask: boolean
}): string {
  if (input.isCompletedReviewTask) {
    return "先回看这一步当时的目标、掌握点和对话记录，再总结哪些做法可以复用。"
  }

  const focus =
    typeof input.currentStep.focus === "string" ? input.currentStep.focus.trim() : ""
  const why = input.whyThisStep.trim()

  if (focus.length > 0 && focus === why && isLongInstructionText(focus)) {
    if (input.hasMaterialPlan) {
      return "计划已从你的材料生成。先按上方任务说明完成一小步；卡住时发截图或报错即可。"
    }
    return "先按上方任务说明完成一小步；有结果或疑问随时发给我。"
  }

  if (focus.length > 0) {
    return focus
  }

  return "先把任务做小，只验证当前任务的核心能力，不要一次扩展太多。"
}

function resolveDefaultCoachSeedContent(input: {
  currentStep: StepRow
  whyThisStep: string
  hasMaterialPlan: boolean
}): string {
  const focus =
    typeof input.currentStep.focus === "string" ? input.currentStep.focus.trim() : ""
  const why = input.whyThisStep.trim()

  if (focus.length > 0 && focus === why && isLongInstructionText(focus)) {
    if (input.hasMaterialPlan) {
      return [
        "已从你的材料生成学习任务，练习说明在上方这张任务卡里。",
        "",
        "先按「完成标准」做最小的一步；完成后把你的产出、截图或报错发给我即可。",
      ].join("\n")
    }

    return [
      "练习说明在上方任务卡里，先按完成标准做一小步。",
      "",
      "完成后把结果或报错发给我，我们再一起往下推进。",
    ].join("\n")
  }

  return (
    input.currentStep.focus
    ?? "先从一个最小实验开始，不要求一次理解全部概念。做完后把结果发给我，我们再判断下一步。"
  )
}

async function loadLearningState(userId: string) {
  await reconcileInterruptedLearningPaths(userId)

  const supabase = createSupabaseAdminClient()

  const { data: profile, error: profileError } = await supabase
    .from("user_profiles")
    .select("user_id, nickname, avatar_url, learning_level, current_score, current_rank_code, streak_days, last_learning_at, created_at")
    .eq("user_id", userId)
    .maybeSingle()

  assertSupabaseSuccess(profileError, "failed to load learning profile")

  const { data: activePath, error: activePathError } = await supabase
    .from("user_learning_paths")
    .select("id, tool_id, path_name_snapshot, path_summary_snapshot, learning_level, selection_mode, total_steps, completed_steps, current_task_id, last_activity_at, template_path_id, metadata")
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

  const taskRows = (tasks ?? []) as TaskRow[]
  const taskStepIds = Array.from(new Set(taskRows.map((task) => task.path_step_id)))
  const { data: steps, error: stepError } =
    taskStepIds.length === 0
      ? { data: [] as StepRow[], error: null }
      : await supabase
          .from("path_steps")
          .select("id, step_no, title, summary, focus, goal, completion_criteria, review_summary, estimated_minutes, reward_score, knowledge_points, key_points, pitfalls, metadata")
          .in("id", taskStepIds)
          .order("step_no", { ascending: true })

  assertSupabaseSuccess(stepError, "failed to load path steps")

  const { data: pendingDraft, error: pendingDraftError } =
    activePath.selection_mode !== "self_directed"
      ? { data: null, error: null }
      : await supabase
          .from("learning_plan_drafts")
          .select("id, intake_id, updated_at")
          .eq("user_id", userId)
          .eq("status", "draft")
          .order("updated_at", { ascending: false })
          .limit(1)
          .maybeSingle()

  assertSupabaseSuccess(pendingDraftError, "failed to load pending material plan draft")

  const { data: activeMaterialPlanIntake, error: activeMaterialPlanIntakeError } =
    activePath.selection_mode !== "self_directed"
      ? { data: null, error: null }
      : await supabase
          .from("learning_material_intakes")
          .select("id, status, processing_stage, progress_percent, progress_message, latest_run_id, latest_draft_id, error_code, updated_at")
          .eq("user_id", userId)
          .in("status", ["queued", "extracting", "planning", "quality_checking", "failed"])
          .order("updated_at", { ascending: false })
          .limit(1)
          .maybeSingle()

  assertSupabaseSuccess(
    activeMaterialPlanIntakeError,
    "failed to load active material plan intake",
  )

  if (!tool) {
    return null
  }

  return {
    profile: profile as ProfileRow,
    tool: tool as ToolRow,
    activePath: activePath as ActivePathRow,
    tasks: taskRows,
    steps: (steps ?? []) as StepRow[],
    pendingMaterialPlanDraft: pendingDraft as PendingMaterialPlanDraftRow | null,
    activeMaterialPlanIntake: activeMaterialPlanIntake as ActiveMaterialPlanIntakeRow | null,
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
    createdAt: toIsoDate(profile.created_at),
  }
}

function buildDefaultMessages(input: {
  currentStep: StepRow
  taskStatus: TaskRow["status"]
  hasMaterialPlan?: boolean
  whyThisStep?: string
  practiceSteps?: string[]
  submissionGuide?: string
  checkpoints?: string[]
}): Message[] {
  const currentStep = input.currentStep

  if (input.taskStatus === "completed") {
    const reviewSummary = resolveStageReviewSummary({
      title: currentStep.title,
      reviewSummary: currentStep.review_summary,
      keyPoints: toStringArray(currentStep.key_points),
      summary: currentStep.summary,
      goal: currentStep.goal,
    })

    return [
      {
        id: 1,
        role: "system",
        kind: "system_goal",
        title: "当前任务复盘说明",
        content: [
          `你正在回看「${currentStep.title}」这个任务。`,
          "",
          `复盘重点：${reviewSummary}`,
          "建议先对照右侧的掌握点和注意事项，再回顾你当时的对话记录。",
        ].join("\n"),
        structuredContent: null,
      },
      {
        id: 2,
        role: "ai",
        kind: "coach",
        title: "AI 复盘引导",
        content: reviewSummary,
        structuredContent: buildStructuredLearningMessageContent({
          title: "AI 复盘引导",
          kind: "coach",
          interactionType: "task_review",
          content: reviewSummary,
        }),
    },
  ]
  }

  const coachSeedContent = resolveDefaultCoachSeedContent({
    currentStep,
    whyThisStep: input.whyThisStep ?? "",
    hasMaterialPlan: input.hasMaterialPlan ?? false,
  })

  return [
    {
      id: 1,
      role: "system",
      kind: "system_goal",
      title: "系统目标说明",
      content: [
        `当前任务只验证一件事：${currentStep.goal}`,
        "",
        "先理解方法，再跟着步骤完成练习，最后提交可检查的结果。",
        "",
        `提交说明：${input.submissionGuide ?? "把你的结果、截图或报错贴给我"}`,
      ].join("\n"),
      structuredContent: null,
    },
    {
      id: 2,
      role: "ai",
      kind: "coach",
      title: "AI 教练引导",
      content: coachSeedContent,
      structuredContent: buildStructuredLearningMessageContent({
        title: "AI 教练引导",
        kind: "coach",
        interactionType: "teaching",
        content: coachSeedContent,
      }),
    },
  ]
}

async function resolveConversationForTask(
  userId: string,
  task: TaskRow,
  input?: {
    preferredConversationId?: string | null
    allowClosedSession?: boolean
  },
) {
  const supabase = createSupabaseAdminClient()
  const preferredSessionId = normalizeUuid(
    input?.preferredConversationId ?? task.last_conversation_id,
  )

  if (preferredSessionId) {
    let preferredQuery = supabase
      .from("conversation_sessions")
      .select("id, user_task_id, status")
      .eq("id", preferredSessionId)
      .eq("user_id", userId)
      .eq("is_admin_test", false)
    if (!input?.allowClosedSession) {
      preferredQuery = preferredQuery.eq("status", "active")
    }

    const { data, error } = await preferredQuery.maybeSingle()

    assertSupabaseSuccess(error, "failed to load preferred conversation session")

    const session = (data as ConversationSessionRow | null) ?? null
    if (session && session.user_task_id === task.id) {
      return session
    }
  }

  let query = supabase
    .from("conversation_sessions")
    .select("id, user_task_id, status")
    .eq("user_id", userId)
    .eq("user_task_id", task.id)
    .eq("is_admin_test", false)
    .order("updated_at", { ascending: false })
    .limit(1)

  if (!input?.allowClosedSession) {
    query = query.eq("status", "active")
  }

  const { data, error } = await query.maybeSingle()

  assertSupabaseSuccess(error, "failed to load active conversation session for task")

  return (data as ConversationSessionRow | null) ?? null
}

async function loadConversationSelection(
  userId: string,
  conversationId?: string | null,
) {
  const normalizedConversationId = normalizeUuid(conversationId)

  if (!normalizedConversationId) {
    return null
  }

  const supabase = createSupabaseAdminClient()
  const { data, error } = await supabase
    .from("conversation_sessions")
    .select("id, user_task_id, status")
    .eq("id", normalizedConversationId)
    .eq("user_id", userId)
    .eq("is_admin_test", false)
    .maybeSingle()

  assertSupabaseSuccess(error, "failed to load requested conversation session")

  return (data as ConversationSessionRow | null) ?? null
}

function resolveTaskForSessionView(input: {
  tasks: TaskRow[]
  currentTask: TaskRow
  requestedTaskId?: string | null
  requestedConversationTaskId?: string | null
}) {
  const candidateTaskIds = [
    input.requestedConversationTaskId,
    input.requestedTaskId,
  ]

  for (const candidateTaskId of candidateTaskIds) {
    if (typeof candidateTaskId !== "string") {
      continue
    }

    const normalizedTaskId = candidateTaskId.trim()
    if (normalizedTaskId.length === 0) {
      continue
    }

    const matchedTask = input.tasks.find((task) => task.id === normalizedTaskId)
    if (matchedTask) {
      return matchedTask
    }
  }

  return input.currentTask
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

  const mappedMessages = page.items.map((row) => {
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

      const attachments = parseStoredMessageAttachments(row.content_json?.attachments)
      const userVisibleContent = resolvePersistedUserVisibleContent({
        contentText: row.content_text,
        metadata,
        attachments,
      })

      return {
        id: buildPersistedLearningMessageId(row.sequenceNo),
        speechMessageId: row.role === "assistant" ? row.id : undefined,
        role: row.role === "assistant" ? "ai" : "user",
        kind,
        title,
        content: row.role === "assistant" ? (row.content_text ?? "") : userVisibleContent,
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
        attachment: attachments[0],
        attachments,
      } satisfies Message
    })

  const messagesWithSignedUrls = await applyAttachmentSignedUrlsToMessages(
    supabase,
    mappedMessages,
  )

  return {
    messages: messagesWithSignedUrls,
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
    .select("id, user_task_id, status")
    .eq("id", conversationId)
    .eq("user_id", userId)
    .eq("is_admin_test", false)
    .maybeSingle()

  assertSupabaseSuccess(error, "failed to validate conversation ownership")

  return (data as ConversationSessionRow | null) ?? null
}

export async function restartLearningConversationForCurrentTask(
  userId: string,
): Promise<LearningRestartConversationResponseData | null> {
  const state = await loadLearningState(userId)

  if (!state) {
    return null
  }

  const currentTask =
    state.tasks.find((task) => task.id === state.activePath.current_task_id) ??
    state.tasks.find((task) => task.status === "in_progress") ??
    state.tasks.find((task) => task.status === "blocked") ??
    state.tasks.find((task) => task.status === "not_started") ??
    state.tasks[0]

  if (!currentTask) {
    return null
  }

  const activeConversation = await resolveConversationForTask(userId, currentTask)

  if (!activeConversation) {
    return {
      restarted: false,
      closedSessionId: null,
      message: "当前没有进行中的对话。",
    }
  }

  const supabase = createSupabaseAdminClient()
  const now = new Date().toISOString()

  const { error: sessionError } = await supabase
    .from("conversation_sessions")
    .update({
      status: "archived",
      closed_at: now,
      updated_at: now,
    })
    .eq("id", activeConversation.id)
    .eq("user_id", userId)
    .eq("status", "active")
    .eq("is_admin_test", false)

  assertSupabaseSuccess(sessionError, "failed to archive conversation session")

  const { error: taskError } = await supabase
    .from("user_tasks")
    .update({
      last_conversation_id: null,
      updated_at: now,
    })
    .eq("id", currentTask.id)
    .eq("user_id", userId)

  assertSupabaseSuccess(taskError, "failed to clear task last_conversation_id")

  return {
    restarted: true,
    closedSessionId: activeConversation.id,
  }
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
  input?: {
    sessionId?: string | null
    taskId?: string | null
  },
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

  const requestedConversation = await loadConversationSelection(userId, input?.sessionId)
  const selectedTask = resolveTaskForSessionView({
    tasks: state.tasks,
    currentTask,
    requestedTaskId: input?.taskId,
    requestedConversationTaskId: requestedConversation?.user_task_id ?? null,
  })
  const currentStep =
    orderedSteps.find((step) => step.id === selectedTask.path_step_id) ?? orderedSteps[0]

  if (!currentStep) {
    return null
  }

  const currentStepIndex = orderedSteps.findIndex((step) => step.id === currentStep.id)
  const nextStep =
    currentStepIndex >= 0 && currentStepIndex < orderedSteps.length - 1
      ? orderedSteps[currentStepIndex + 1]!
      : null
  const nextStepBodyText = resolveNextStepBodyText(nextStep)
  const isFinalPathStep = nextStep === null
  const nextUnlockSummaryOrPreview =
    nextStep === null
      ? FINAL_PATH_STEP_PREVIEW
      : nextStepBodyText ?? `完成后进入「${nextStep.title}」，详情可在学习地图查看。`
  const knowledgePoints = toStringArray(currentStep.knowledge_points)
  let masteryPoints = toStringArray(currentStep.key_points)
  let pitfalls = toPitfalls(currentStep.pitfalls)
  const stepMetadata = readJsonRecord(currentStep.metadata)
  const practiceSteps = toStringArray(stepMetadata.practiceSteps)
  const lessonBrief = readStringFromRecord(stepMetadata, "lessonBrief")
    ?? currentStep.focus
    ?? currentStep.summary
  const submissionGuide =
    readStringFromRecord(stepMetadata, "submissionGuide")
    ?? "完成后把你的产出、截图、代码、终端输出或报错信息发给 AI 教练。"
  const checkpoints = toStringArray(stepMetadata.checkpoints)

  // 为自学模式生成的计划提供智能 fallback
  if (masteryPoints.length === 0) {
    if (currentStep.goal) {
      masteryPoints = [
        `理解目标：${currentStep.goal}`,
        `完成这一步：${currentStep.title}`,
        `判断完成标准：${currentStep.completion_criteria || "能够独立演示或解释"}`,
      ]
    } else if (knowledgePoints.length > 0) {
      masteryPoints = knowledgePoints
    } else {
      masteryPoints = [
        "理解当前步骤的核心概念",
        "能够按步骤完成实践操作",
        "知道如何验证自己的学习成果",
      ]
    }
  }

  // 如果数据库中没有 pitfalls，生成通用的学习注意事项
  if (pitfalls.length === 0) {
    pitfalls = [
      { text: "不要急于求成，先理解概念再动手实践", isTrap: false },
      { text: "遇到错误时，先仔细阅读错误信息而不是盲目尝试", isTrap: true },
      { text: "确保当前步骤真正完成后再进入下一步", isTrap: false },
      { text: "遇到困难时可以向 AI 导师求助，但先尝试自己解决", isTrap: false },
    ]
  }
  const reviewSummary = resolveStageReviewSummary({
    title: currentStep.title,
    reviewSummary: currentStep.review_summary,
    keyPoints: masteryPoints,
    summary: currentStep.summary,
    goal: currentStep.goal,
  })
  const isSelectedTaskReview = selectedTask.id !== currentTask.id
  const isCompletedReviewTask = selectedTask.status === "completed"
  const hasMaterialPlan = hasMaterialPlanFromPath(state.activePath)
  const whyThisStep =
    isCompletedReviewTask ? reviewSummary : (currentStep.focus ?? currentStep.summary)
  const baseMessages = buildDefaultMessages({
    currentStep,
    taskStatus: selectedTask.status,
    hasMaterialPlan,
    whyThisStep,
    practiceSteps,
    submissionGuide,
    checkpoints,
  })
  const activeConversation = await resolveConversationForTask(userId, selectedTask, {
    preferredConversationId: requestedConversation?.id ?? input?.sessionId ?? null,
    allowClosedSession:
      selectedTask.status === "completed" || requestedConversation !== null,
  })
  const persistedMessagePage =
    activeConversation
      ? await loadPersistedMessages(activeConversation.id)
      : null
  const persistedMessages = persistedMessagePage?.messages ?? []
  const totalSteps = Math.max(state.activePath.total_steps, orderedSteps.length)
  const currentProgressPercent =
    totalSteps > 0
      ? Math.round(((state.activePath.completed_steps + (selectedTask.status === "in_progress" ? 0.5 : 0)) / totalSteps) * 100)
      : 0
  const shouldExposeResume = hasLearningResumeHistory({
    completedSteps: isSelectedTaskReview ? 0 : state.activePath.completed_steps,
    currentTaskLastConversationId: selectedTask.last_conversation_id,
    persistedMessageCount: persistedMessages.length,
  })
  const quickActions =
    isCompletedReviewTask
      ? []
      : [
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
        ] as LearningCurrentSessionResponseData["quickActions"]
  const supportOptions =
    isCompletedReviewTask
      ? []
      : [
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
        ] as LearningCurrentSessionResponseData["supportOptions"]
  const responseSamples =
    isCompletedReviewTask
      ? []
      : [
          {
            trigger: "我完成了",
            kind: "task_feedback",
            title: "任务反馈",
            content: [
              "很好，这一步已经完成。",
              "",
              "**你已经确认了当前任务的关键能力：**",
              `- ${currentStep.title}`,
              nextStep
                ? `- 接下来可以进入下一关：${nextStep.title}`
                : "- 当前已是本路径最后一步，完成后该路径练习将全部结束",
            ].join("\n"),
            xp: currentStep.reward_score,
            nextStep: nextStep
              ? `进入下一关：${nextStep.title}`
              : "完成当前任务后本路径练习全部结束，可前往学习地图查看进度",
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
        ] as LearningCurrentSessionResponseData["responseSamples"]

  return {
    conversationId: activeConversation?.id ?? null,
    historyPagination: persistedMessagePage?.pagination ?? {
      hasMore: false,
      nextBeforeSequenceNo: null,
    },
    activeMaterialPlanIntake:
      state.activeMaterialPlanIntake && !state.pendingMaterialPlanDraft
        ? {
            intakeId: state.activeMaterialPlanIntake.id,
            status: state.activeMaterialPlanIntake.status,
            processingStage: state.activeMaterialPlanIntake.processing_stage,
            progressPercent: state.activeMaterialPlanIntake.progress_percent,
            progressMessage: state.activeMaterialPlanIntake.progress_message,
            draftId: state.activeMaterialPlanIntake.latest_draft_id,
            runId: state.activeMaterialPlanIntake.latest_run_id,
            errorCode: state.activeMaterialPlanIntake.error_code,
            errorMessage:
              state.activeMaterialPlanIntake.status === "failed"
                ? state.activeMaterialPlanIntake.progress_message
                : null,
            updatedAt: state.activeMaterialPlanIntake.updated_at,
          }
        : null,
    pendingMaterialPlanDraft:
      state.pendingMaterialPlanDraft
        ? {
            draftId: state.pendingMaterialPlanDraft.id,
            intakeId: state.pendingMaterialPlanDraft.intake_id,
            updatedAt: state.pendingMaterialPlanDraft.updated_at,
          }
        : null,
    path: {
      id: state.activePath.id,
      status: "in_progress",
    },
    task: {
      taskId: selectedTask.id,
      title: currentStep.title,
      status: mapTaskState(selectedTask.status),
    },
    profile: toProfileData(state.profile, state.tool, completedTaskCount),
    planSummary: {
      selectedToolName: state.tool.name,
      learningLevelLabel: getLearningLevelLabel(state.activePath.learning_level),
      selectionModeLabel: getSelectionModeLabel(state.activePath.selection_mode),
      selectionMode: state.activePath.selection_mode,
      pathName: state.activePath.path_name_snapshot,
      hasMaterialPlan,
    },
    resume:
      shouldExposeResume && !isSelectedTaskReview
        ? {
            title: "继续上次学习",
            summary: currentStep.summary,
            lastSeenLabel: getRelativeLastSeenLabel(
              state.activePath.last_activity_at ?? state.profile.last_learning_at,
            ),
            ctaLabel: "继续当前任务",
          }
        : null,
    mission: {
      title: currentStep.title,
      tool: state.tool.name,
      stageLabel: `第 ${currentStep.step_no} 步 / 共 ${totalSteps} 步`,
      goal: currentStep.goal,
      summary: isCompletedReviewTask ? reviewSummary : (currentStep.focus ?? currentStep.summary),
      estimatedTime: `约 ${currentStep.estimated_minutes ?? 10} 分钟`,
      reward: `+${currentStep.reward_score} XP`,
      progressLabel: `${state.activePath.completed_steps} / ${totalSteps} 步已完成`,
      progressPercent: currentProgressPercent,
      coachCue: resolveCoachCue({
        currentStep,
        whyThisStep,
        hasMaterialPlan,
        isCompletedReviewTask,
      }),
      nextPreviewIsFinal: isFinalPathStep,
      nextUnlockTitle: isFinalPathStep ? FINAL_PATH_STEP_TITLE : nextStep.title,
      nextUnlockSummary: nextUnlockSummaryOrPreview,
    },
    messages: [...baseMessages, ...persistedMessages],
    quickActions,
    supportOptions,
    responseSamples,
    rightPanel: {
      currentStep: currentStep.title,
      whyThisStep,
      completionCriteria: currentStep.completion_criteria ?? currentStep.goal,
      hintIfStuck:
        isCompletedReviewTask
          ? "如果一时想不起来，就先回看当时的目标、操作结果和 AI 给你的关键建议。"
          : "如果不知道怎么描述，就先提交一句结果导向的话，再把报错或结果贴回来。",
      knowledgePoints,
      masteryPoints: masteryPoints.length > 0 ? masteryPoints : knowledgePoints,
      cautions: pitfalls,
      lessonBrief,
      practiceSteps,
      submissionGuide,
      checkpoints,
      nextStepPreview: nextUnlockSummaryOrPreview,
    },
    recentPracticeRounds: orderedSteps.slice(0, 3).map((step) => {
      const task = taskByStepId.get(step.id)
      const status = task?.status ?? "not_started"
      return {
        id: `practice-round-${String(step.step_no).padStart(3, "0")}`,
        taskTitle: step.title,
        stageLabel: `第 ${step.step_no} 步`,
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
  }
}

export async function sendLearningMessage(
  userId: string,
  request: LearningMessageRequest,
): Promise<LearningMessageResponseData | null> {
  return orchestrateLearningMessage(userId, request)
}
