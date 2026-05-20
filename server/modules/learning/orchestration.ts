import "server-only"

import { Buffer } from "node:buffer"

import { createSupabaseAdminClient } from "@/lib/supabase/admin"
import {
  buildStructuredLearningMessageContent,
  parseStoredStructuredLearningMessageContent,
} from "@/lib/learning/structured-message"
import type {
  LearningInputType,
  LearningMessageAttachment,
  LearningMessageAttachmentKind,
  LearningMessageRequest,
  LearningMessageResponseData,
  LearningTaskPatch,
} from "@/lib/api/contracts/learning"
import {
  loadAIAgentBindingsSnapshot,
  loadAIAgentsSnapshot,
  loadAIModelsSnapshot,
  loadAIProvidersSnapshot,
} from "@/server/modules/ai/config-cache"
import { assertSupabaseSuccess } from "@/server/lib/supabase"
import { normalizeUuid } from "@/server/lib/identifiers"
import { touchLearningPathActivity } from "@/server/modules/learning-paths/service"
import { emitAdminNotification } from "@/server/modules/admin-notifications/service"
import {
  invokeMaterialAudioTranscription,
  invokeMaterialPipelineModel,
} from "@/server/modules/learning-materials/providers"
import { resolveLearningMediaTranscriptionModels } from "@/server/modules/admin-ai/media-service"
import { LearningAIProviderError, LearningValidationError } from "./errors.ts"
import { buildLearningOutputFormatGuide } from "./output-format.ts"
import {
  buildIdempotentReplayResponse,
  doesAgentBindingMatchLearningScene,
  deriveTaskPatch,
  finalizeAssistantTaskPatch,
  parseStoredTaskPatchMetadata,
  resolveAgentBindingInteractionFallbacks,
  resolveAssistantInteractionType,
  resolveLearningUserInteractionType,
  shouldPersistTaskPatch,
  taskPatchStatusToPersistentStatus,
} from "./logic.ts"
import { buildIdempotentReplaySSEEvents } from "./http-logic.ts"
import {
  invokeAIProvider,
  streamAIProvider,
  type AIChatMessage,
  type AIChatContentPart,
  type AIProviderResult,
} from "./provider.ts"
import { loadAgentSkillContexts } from "./skills.ts"

type JsonRecord = Record<string, unknown>

type ToolRow = {
  id: string
  code: string
  name: string
}

type PathRow = {
  id: string
  template_path_id: string | null
  tool_id: string
  path_code_snapshot: string
  path_name_snapshot: string
  learning_level: "beginner" | "intermediate" | "advanced"
  selection_mode: "self_directed" | "preset_training"
  status: "active" | "interrupted" | "completed" | "abandoned" | "archived"
  current_task_id: string | null
  metadata: JsonRecord | null
}

type TaskRow = {
  id: string
  user_learning_path_id: string
  path_step_id: string
  status: "not_started" | "in_progress" | "blocked" | "completed" | "archived"
  last_conversation_id: string | null
}

type StepRow = {
  id: string
  step_no: number
  title: string
  summary: string
  focus: string | null
  goal: string
  completion_criteria: string | null
  key_points: unknown
  pitfalls: unknown
  metadata: JsonRecord | null
}

type AgentBindingRow = {
  agent_code: string
  interaction_type: LearningInteractionType
  tool_id: string | null
  learning_level: "beginner" | "intermediate" | "advanced" | null
  selection_mode: "self_directed" | "preset_training" | null
  path_id: string | null
  step_no: number | null
  priority: number
  is_active: boolean
}

type AgentTemplateRow = {
  code: string
  name: string
  system_prompt_template: string
  developer_prompt_template: string | null
  default_provider_code: string
  default_model_code: string
  context_message_limit: number
  max_output_tokens: number
  temperature: number
  is_active: boolean
}

type ProviderRow = {
  code: string
  provider_type: "siliconflow" | "openai_compatible" | "anthropic"
  base_url: string
  auth_mode: "bearer" | "api_key_header"
  secret_ref: string | null
  secret_ciphertext: string | null
  secret_iv: string | null
  secret_auth_tag: string | null
  secret_key_version: string | null
  timeout_ms: number
  retry_count: number
  is_active: boolean
}

type ModelRow = {
  code: string
  model_name: string
  runtime_capabilities?: string[] | null
  is_active: boolean
}

type ConversationSessionRow = {
  id: string
  message_count: number
  status: "active" | "completed" | "interrupted" | "failed" | "archived"
}

type ConversationHistoryRow = {
  id: string
  role: "user" | "assistant"
  content_text: string | null
}

type LearningMessageAttachmentRow = {
  id: string
  user_id: string
  session_id: string | null
  message_id: string | null
  kind: LearningMessageAttachmentKind
  processing_status: LearningMessageAttachment["processingStatus"]
  storage_bucket: string
  storage_path: string
  original_filename: string | null
  mime_type: string
  size_bytes: number
  duration_ms: number | null
  width: number | null
  height: number | null
  extracted_text: string | null
  visual_summary: string | null
  transcript_text: string | null
  error_message: string | null
  created_at: string
}

type NormalizedLearningAttachment = LearningMessageAttachmentRow & {
  signedUrl: string | null
  dataUrl: string | null
}

type PreparedLearningInvocation = {
  supabase: ReturnType<typeof createSupabaseAdminClient>
  tool: ToolRow
  path: PathRow
  task: TaskRow
  step: StepRow
  interactionType: LearningInteractionType
  agent: AgentTemplateRow
  provider: ProviderRow
  model: ModelRow
  session: ConversationSessionRow
  clientMessageId: string | null
  skills: Array<{ code: string; name: string; content: string }>
  attachments: NormalizedLearningAttachment[]
  userVisibleContent: string
  normalizedUserContent: string
  providerMessages: AIChatMessage[]
}

export type LearningInteractionType =
  | "teaching"
  | "blocked_help"
  | "task_review"
  | "completion_feedback"
  | "path_guidance"
  | "concept_qa"

const textEncoder = new TextEncoder()
const LEARNING_AI_NOTIFICATION_DEDUPE_WINDOW_MS = 10 * 60_000

async function emitLearningAIAdminNotification(input: {
  severity?: "info" | "warning" | "critical"
  category?: "ai" | "system"
  title: string
  content: string
  sourceType: string
  dedupeKey: string
  payload?: Record<string, unknown>
}) {
  await emitAdminNotification({
    severity: input.severity ?? "warning",
    category: input.category ?? "ai",
    title: input.title,
    content: input.content,
    sourceType: input.sourceType,
    payload: {
      ...(input.payload ?? {}),
      dedupeKey: input.dedupeKey,
    },
    dedupeKey: input.dedupeKey,
    dedupeWindowMs: LEARNING_AI_NOTIFICATION_DEDUPE_WINDOW_MS,
  })
}

function buildAssistantPresentation(
  interactionType: LearningInteractionType,
  content: string,
  inputType: LearningInputType,
): {
  title: string
  kind: "coach" | "task_feedback"
  content: string
} {
  const title =
    interactionType === "blocked_help"
      ? "排查建议"
      : interactionType === "task_review"
        ? "复盘建议"
        : interactionType === "path_guidance"
          ? "下一步建议"
          : interactionType === "completion_feedback"
            ? "完成反馈"
            : interactionType === "concept_qa"
              ? "概念解答"
              : "AI 教练引导"

  const kind = interactionType === "completion_feedback" ? "task_feedback" : "coach"

  return {
    title,
    kind,
    content:
      inputType === "code"
        ? `${content}\n\n如果你愿意，可以继续补充相关代码片段，我会按当前上下文继续判断。`
        : content,
  }
}

function buildSkillContextText(
  skills: Array<{ code: string; name: string; content: string }>,
) {
  if (skills.length === 0) {
    return "当前没有额外技能包上下文。"
  }

  return skills
    .map((skill) =>
      [
        `## ${skill.name} (${skill.code})`,
        skill.content,
      ].join("\n"),
    )
    .join("\n\n")
}

function readStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return []
  }
  return value.filter((item): item is string => typeof item === "string")
}

function readCautionTexts(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return []
  }
  return value
    .map((item) => {
      if (!item || typeof item !== "object" || Array.isArray(item)) {
        return null
      }
      const text = (item as JsonRecord).text
      return typeof text === "string" && text.trim().length > 0 ? text.trim() : null
    })
    .filter((item): item is string => Boolean(item))
}

function readStringMetadata(metadata: JsonRecord | null, key: string): string | null {
  const value = metadata?.[key]
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null
}

function buildSystemPrompt(
  input: {
    agent: AgentTemplateRow
    tool: ToolRow
    path: PathRow
    step: StepRow
    task: TaskRow
    interactionType: LearningInteractionType
    skillsText: string
  },
) {
  return [
    // 🎯 角色身份
    input.agent.system_prompt_template,
    input.agent.developer_prompt_template ?? "",
    "你是用户的私人编程教练，既是导师也是答疑伙伴。",
    "你服务于 AI 编程学习教练产品，回答必须使用中文，语气直接、具体、简洁。",
    "",
    // 📋 当前学习上下文（所有决策的依据）
    "# 当前学习上下文",
    `工具：${input.tool.name} (${input.tool.code})`,
    `学习模式：${input.path.selection_mode}`,
    `学习等级：${input.path.learning_level}`,
    `路径：${input.path.path_name_snapshot} (${input.path.path_code_snapshot})`,
    `当前关卡：第 ${input.step.step_no} 关 - ${input.step.title}`,
    `关卡目标：${input.step.goal}`,
    `先理解方法：${readStringMetadata(input.step.metadata, "lessonBrief") ?? input.step.focus ?? input.step.summary}`,
    `跟着做：${readStringArray(input.step.metadata?.practiceSteps).map((step, index) => `${index + 1}. ${step}`).join("；") || input.step.summary}`,
    `提交说明：${readStringMetadata(input.step.metadata, "submissionGuide") ?? "完成后提交产出、截图、代码、终端输出、Prompt、报错信息或文字描述。"}`,
    `验收检查点：${readStringArray(input.step.metadata?.checkpoints).join("；") || input.step.completion_criteria || input.step.goal}`,
    `本关要掌握：${readStringArray(input.step.key_points).join("；") || "无"}`,
    `注意事项：${readCautionTexts(input.step.pitfalls).join("；") || "无"}`,
    `完成标准：${input.step.completion_criteria ?? input.step.goal}`,
    `任务状态：${input.task.status}`,
    `本次交互类型：${input.interactionType}`,
    "",
    // ⚡ 行为准则
    "# 行为准则",
    "",
    "常规教学：必须先教方法，再布置练习。回复顺序应为：1）用新手能懂的话解释本关方法；2）给出当前最小可执行步骤；3）说明用户做完应提交什么证据；4）说明 AI 会按哪些检查点验收。不要一开始就只要求用户反馈结果。",
    "",
    "验收与纠偏：当用户提交结果时，必须对照提交说明、验收检查点和完成标准判断是否通过；未通过时给一个最小修正动作，通过后再总结方法并推进。",
    "",
    "概念问答：如果用户主动询问技术概念、工具、术语解释、经验判断或与编程相关的扩展知识（如“什么是字段映射”“你是否了解 cc-switch”“如何优化提示词”），应先直接回答用户问题，不必拘泥于关卡范围；如果内容和当前关卡有关，再用一句话补充如何连接到当前练习。",
    "",
    "关卡编号规则：系统里的“第 N 关”只指数据库中记录的真实关卡。在当前关卡内部继续推进多项练习时，只能称为“下一步 / 下一项练习 / 下一个技巧”，严禁自行发明“第4关 / 第5关 / 下一关”等新编号。除非当前交互类型是 completion_feedback，或者你已明确确认用户满足当前关卡完成标准，否则不要建议“进入下一关”，也不要生成“第 N 关已完成”这类表述。",
    "",
    "输出规范：除非用户明确要求，否则不要输出 JSON。",
    "",
    ...buildLearningOutputFormatGuide(input.interactionType),
    "",
    "# Skills",
    input.skillsText,
  ]
    .filter(Boolean)
    .join("\n")
}

async function loadRuntimeState(userId: string, taskId?: string | null) {
  const supabase = createSupabaseAdminClient()

  const { data: pathData, error: pathError } = await supabase
      .from("user_learning_paths")
      .select(
        "id, template_path_id, tool_id, path_code_snapshot, path_name_snapshot, learning_level, selection_mode, status, current_task_id, metadata",
      )
    .eq("user_id", userId)
    .eq("status", "active")
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle()

  assertSupabaseSuccess(pathError, "failed to load active learning path")

  const path = (pathData as PathRow | null) ?? null
  if (!path) {
    return null
  }

  const { data: toolData, error: toolError } = await supabase
    .from("learning_tools")
    .select("id, code, name")
    .eq("id", path.tool_id)
    .maybeSingle()

  assertSupabaseSuccess(toolError, "failed to load learning tool")

  const { data: taskRows, error: taskError } = await supabase
    .from("user_tasks")
    .select("id, user_learning_path_id, path_step_id, status, last_conversation_id")
    .eq("user_learning_path_id", path.id)

  assertSupabaseSuccess(taskError, "failed to load path tasks")

  const tasks = (taskRows ?? []) as TaskRow[]
  const resolvedTaskId = normalizeUuid(taskId)

  const task =
    (resolvedTaskId
      ? tasks.find((item) => item.id === resolvedTaskId)
      : null)
    ?? tasks.find((item) => item.id === path.current_task_id)
    ?? tasks.find((item) => item.status === "in_progress")
    ?? tasks.find((item) => item.status === "blocked")
    ?? tasks[0]

  if (!task) {
    return null
  }

  if (task.user_learning_path_id !== path.id) {
    throw new LearningValidationError("taskId 不属于当前进行中的学习计划。")
  }

  const stepQuery =
    path.template_path_id
      ? supabase
          .from("path_steps")
          .select("id, step_no, title, summary, focus, goal, completion_criteria, key_points, pitfalls, metadata")
          .eq("path_id", path.template_path_id)
          .order("step_no", { ascending: true })
      : supabase
          .from("path_steps")
          .select("id, step_no, title, summary, focus, goal, completion_criteria, key_points, pitfalls, metadata")
          .eq("id", task.path_step_id)

  const { data: stepRows, error: stepError } = await stepQuery
  assertSupabaseSuccess(stepError, "failed to load path steps")

  const steps = (stepRows ?? []) as StepRow[]
  const step = steps.find((item) => item.id === task.path_step_id) ?? steps[0] ?? null

  if (!step || !toolData) {
    return null
  }

  return {
    supabase,
    tool: toolData as ToolRow,
    path,
    task,
    step,
  }
}

function scoreBindingSpecificity(binding: AgentBindingRow) {
  return [
    binding.tool_id,
    binding.learning_level,
    binding.selection_mode,
    binding.path_id,
    binding.step_no,
  ].filter((value) => value !== null).length
}

async function resolveAgentTemplate(
  input: {
    supabase: ReturnType<typeof createSupabaseAdminClient>
    tool: ToolRow
    path: PathRow
    step: StepRow
    interactionType: LearningInteractionType
  },
) {
  void input.supabase

  const interactionTypes = resolveAgentBindingInteractionFallbacks(input.interactionType)
  const candidates = (await loadAIAgentBindingsSnapshot<AgentBindingRow>())
    .filter((binding) => interactionTypes.includes(binding.interaction_type))
    .filter((binding) => binding.is_active)
    .filter((binding) =>
      doesAgentBindingMatchLearningScene(binding, {
        tool: input.tool,
        path: input.path,
        step: input.step,
      }),
    )
    .sort((left, right) => {
      const leftInteractionRank = interactionTypes.indexOf(left.interaction_type)
      const rightInteractionRank = interactionTypes.indexOf(right.interaction_type)
      if (leftInteractionRank !== rightInteractionRank) {
        return leftInteractionRank - rightInteractionRank
      }

      if (left.priority !== right.priority) {
        return left.priority - right.priority
      }

      return scoreBindingSpecificity(right) - scoreBindingSpecificity(left)
    })

  const binding = candidates[0]
  if (!binding) {
    throw new LearningValidationError("当前学习场景未命中可用的教学 agent。")
  }

  const agent =
    (await loadAIAgentsSnapshot<AgentTemplateRow>())
      .find((item) => item.code === binding.agent_code && item.is_active) ?? null
  if (!agent) {
    throw new LearningValidationError("命中的教学 agent 不存在或已停用。")
  }

  return {
    agent,
    interactionType: binding.interaction_type,
  }
}

async function loadProviderRuntime(
  supabase: ReturnType<typeof createSupabaseAdminClient>,
  agent: AgentTemplateRow,
) {
  void supabase

  const providerData =
    (await loadAIProvidersSnapshot<ProviderRow>())
      .find((item) => item.code === agent.default_provider_code && item.is_active) ?? null

  const modelData =
    (await loadAIModelsSnapshot<ModelRow>())
      .find((item) => item.code === agent.default_model_code && item.is_active) ?? null

  if (!providerData || !modelData) {
    throw new LearningValidationError("当前 agent 缺少可用的 provider 或 model 配置。")
  }

  return {
    provider: providerData as ProviderRow,
    model: modelData as ModelRow,
  }
}

async function resolveConversationSession(
  input: {
    supabase: ReturnType<typeof createSupabaseAdminClient>
    userId: string
    conversationId?: string | null
    tool: ToolRow
    path: PathRow
    task: TaskRow
    agent: AgentTemplateRow
    provider: ProviderRow
    model: ModelRow
    step: StepRow
  },
) {
  const preferredConversationId = normalizeUuid(input.conversationId)
  const candidateIds = [
    preferredConversationId,
    normalizeUuid(input.task.last_conversation_id),
  ].filter((value): value is string => Boolean(value))

  for (const candidateId of candidateIds) {
    const { data, error } = await input.supabase
      .from("conversation_sessions")
      .select("id, message_count, status")
      .eq("id", candidateId)
      .eq("user_id", input.userId)
      .maybeSingle()

    assertSupabaseSuccess(error, "failed to load conversation session")

    const session = (data as ConversationSessionRow | null) ?? null
    if (session && session.status === "active") {
      return session
    }
  }

  const { data: existingData, error: existingError } = await input.supabase
    .from("conversation_sessions")
    .select("id, message_count, status")
    .eq("user_id", input.userId)
    .eq("user_task_id", input.task.id)
    .eq("status", "active")
    .eq("is_admin_test", false)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle()

  assertSupabaseSuccess(existingError, "failed to load active conversation session by task")

  const existingSession = (existingData as ConversationSessionRow | null) ?? null
  if (existingSession) {
    return existingSession
  }

  const now = new Date().toISOString()
  const { data: insertedData, error: insertError } = await input.supabase
    .from("conversation_sessions")
    .insert({
      user_id: input.userId,
      user_learning_path_id: input.path.id,
      user_task_id: input.task.id,
      selection_mode: input.path.selection_mode,
      tool_id: input.tool.id,
      agent_code_snapshot: input.agent.code,
      provider_code_snapshot: input.provider.code,
      model_code_snapshot: input.model.code,
      status: "active",
      message_count: 0,
      started_at: now,
      last_message_at: now,
      metadata: {
        pathCode: input.path.path_code_snapshot,
        stepNo: input.step.step_no,
      },
    })
    .select("id, message_count, status")
    .single()

  assertSupabaseSuccess(insertError, "failed to create conversation session")

  return insertedData as ConversationSessionRow
}

async function loadConversationHistory(
  supabase: ReturnType<typeof createSupabaseAdminClient>,
  sessionId: string,
  limit: number,
) {
  const { data, error } = await supabase
    .from("conversation_messages")
    .select("id, role, content_text")
    .eq("session_id", sessionId)
    .in("role", ["user", "assistant"])
    .order("sequence_no", { ascending: false })
    .limit(limit)

  assertSupabaseSuccess(error, "failed to load conversation history")

  return ((data ?? []) as ConversationHistoryRow[]).reverse()
}

function historyToProviderMessages(history: ConversationHistoryRow[]): AIChatMessage[] {
  return history
    .filter((row) => row.content_text && (row.role === "user" || row.role === "assistant"))
    .map((row) => ({
      role: row.role,
      content: row.content_text ?? "",
    }))
}

function normalizeAttachmentIds(value: string[] | undefined) {
  if (!Array.isArray(value)) {
    return []
  }

  return Array.from(
    new Set(
      value
        .map((item) => normalizeUuid(item))
        .filter((item): item is string => Boolean(item)),
    ),
  )
}

function attachmentToContract(
  attachment: LearningMessageAttachmentRow,
): LearningMessageAttachment {
  return {
    id: attachment.id,
    kind: attachment.kind,
    processingStatus: attachment.processing_status,
    originalFilename: attachment.original_filename,
    mimeType: attachment.mime_type,
    sizeBytes: attachment.size_bytes,
    durationMs: attachment.duration_ms,
    width: attachment.width,
    height: attachment.height,
    extractedText: attachment.extracted_text,
    visualSummary: attachment.visual_summary,
    transcriptText: attachment.transcript_text,
    errorMessage: attachment.error_message,
    createdAt: attachment.created_at,
  }
}

function buildAttachmentContextText(attachments: NormalizedLearningAttachment[]) {
  if (attachments.length === 0) {
    return ""
  }

  const lines = attachments.map((attachment, index) => {
    const label = attachment.kind === "image" ? "图片" : "语音"
    const name = attachment.original_filename ? `，文件名：${attachment.original_filename}` : ""
    const status = `，识别状态：${attachment.processing_status}`
    const extracted = attachment.extracted_text ? `\nOCR 文本：${attachment.extracted_text}` : ""
    const visual = attachment.visual_summary ? `\n图片摘要：${attachment.visual_summary}` : ""
    const transcript = attachment.transcript_text ? `\n语音转写：${attachment.transcript_text}` : ""
    const error = attachment.error_message ? `\n识别错误：${attachment.error_message}` : ""

    return `附件 ${index + 1}（${label}${name}${status}）${extracted}${visual}${transcript}${error}`
  })

  return [
    "用户随消息附带了以下多媒体附件。请结合这些信息回答；如果附件尚未完成识别或识别失败，请明确说明你暂时无法读取附件内容，并引导用户补充文字描述。",
    ...lines,
  ].join("\n")
}

function parseVisionSummaryContent(content: string) {
  try {
    const parsed = JSON.parse(content.trim()) as {
      visualSummary?: string
      extractedText?: string
      summary?: string
      text?: string
    }

    return {
      visualSummary: (parsed.visualSummary ?? parsed.summary ?? "").trim(),
      extractedText: (parsed.extractedText ?? parsed.text ?? "").trim(),
    }
  } catch {
    return {
      visualSummary: content.trim(),
      extractedText: "",
    }
  }
}

async function preprocessLearningMessageAttachments(input: {
  supabase: ReturnType<typeof createSupabaseAdminClient>
  attachments: NormalizedLearningAttachment[]
  userText: string
}) {
  if (input.attachments.length === 0) {
    return [] as NormalizedLearningAttachment[]
  }

  const pipelineModels = await resolveLearningMediaTranscriptionModels()
  const processed: NormalizedLearningAttachment[] = []

  for (const attachment of input.attachments) {
    if (attachment.processing_status === "completed" || attachment.processing_status === "failed") {
      processed.push(attachment)
      continue
    }

    if (!attachment.signedUrl && !attachment.dataUrl) {
      processed.push({
        ...attachment,
        processing_status: "failed",
        error_message: "附件临时访问地址生成失败。",
      })
      continue
    }

    const { error: processingError } = await input.supabase
      .from("learning_message_attachments")
      .update({
        processing_status: "processing",
      })
      .eq("id", attachment.id)

    assertSupabaseSuccess(processingError, "failed to mark attachment processing")

    try {
      if (attachment.kind === "audio") {
        if (!pipelineModels.asr) {
          throw new LearningValidationError("当前未配置 ASR 模型，暂时无法识别语音消息。")
        }
        if (!attachment.signedUrl) {
          throw new LearningValidationError("附件临时访问地址生成失败。")
        }

        const result = await invokeMaterialAudioTranscription({
          runtime: pipelineModels.asr,
          mediaUrl: attachment.signedUrl,
          prompt: "这是一段学习对话语音，请转写为中文或原语言文本，保留技术术语。",
        })
        const transcriptText = result.text.trim()

        if (!transcriptText) {
          throw new LearningValidationError("语音识别未返回有效文本，请重试或补充文字说明。")
        }

        const updated = {
          ...attachment,
          processing_status: "completed" as const,
          transcript_text: transcriptText,
          error_message: null,
        }

        const { error } = await input.supabase
          .from("learning_message_attachments")
          .update({
            processing_status: "completed",
            transcript_text: transcriptText,
            error_message: null,
          })
          .eq("id", attachment.id)

        assertSupabaseSuccess(error, "failed to persist audio transcript")
        processed.push(updated)
        continue
      }

      if (!pipelineModels.vision) {
        processed.push(attachment)
        continue
      }

      const imageUrl = attachment.dataUrl || attachment.signedUrl
      if (!imageUrl) {
        throw new LearningValidationError("附件临时访问地址生成失败。")
      }

      const result = await invokeMaterialPipelineModel({
        runtime: pipelineModels.vision,
        systemPrompt: "你是学习对话截图理解助手。只输出 JSON：{\"visualSummary\":\"...\",\"extractedText\":\"...\"}。只描述图片中可见内容，不要编造。",
        userContent: [
          {
            type: "text",
            text: [
              `用户文字：${input.userText || "未提供"}`,
              `文件名：${attachment.original_filename ?? "未提供"}`,
              "请识别截图、报错、代码、界面元素和可见文字，帮助 AI 教练回答用户问题。",
            ].join("\n"),
          },
          {
            type: "image_url",
            image_url: {
              url: imageUrl,
            },
          },
        ],
        temperature: 0,
        maxOutputTokens: 1200,
      })
      const parsed = parseVisionSummaryContent(result.content)
      const updated = {
        ...attachment,
        processing_status: "completed" as const,
        visual_summary: parsed.visualSummary || null,
        extracted_text: parsed.extractedText || null,
        error_message: null,
      }

      const { error } = await input.supabase
        .from("learning_message_attachments")
        .update({
          processing_status: "completed",
          visual_summary: updated.visual_summary,
          extracted_text: updated.extracted_text,
          error_message: null,
        })
        .eq("id", attachment.id)

      assertSupabaseSuccess(error, "failed to persist image understanding")
      processed.push(updated)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "附件识别失败。"
      const { error: updateError } = await input.supabase
        .from("learning_message_attachments")
        .update({
          processing_status: "failed",
          error_message: errorMessage,
        })
        .eq("id", attachment.id)

      assertSupabaseSuccess(updateError, "failed to persist attachment processing failure")

      processed.push({
        ...attachment,
        processing_status: "failed",
        error_message: errorMessage,
      })
    }
  }

  const audioFailures = processed.filter((attachment) => (
    attachment.kind === "audio" && attachment.processing_status === "failed"
  ))
  if (audioFailures.length > 0 && !input.userText.trim()) {
    throw new LearningValidationError(audioFailures[0]?.error_message ?? "语音识别失败，请重试或补充文字说明。")
  }

  return processed
}

function buildNormalizedUserContent(
  request: LearningMessageRequest,
  attachments: NormalizedLearningAttachment[],
) {
  const content = request.content.trim()
  const attachmentContext = buildAttachmentContextText(attachments)

  if (!attachmentContext) {
    return content
  }

  return [content || "用户发送了一条仅包含附件的消息。", attachmentContext]
    .filter(Boolean)
    .join("\n\n")
}

function buildUserVisibleContent(
  request: LearningMessageRequest,
  attachments: NormalizedLearningAttachment[],
) {
  const content = request.content.trim()
  if (content.length > 0) {
    return content
  }

  if (attachments.some((attachment) => attachment.kind === "audio")) {
    return "我发送了一条语音消息，请帮我解答。"
  }

  if (attachments.some((attachment) => attachment.kind === "image")) {
    return "我上传了一张截图，请帮我定位问题。"
  }

  return "我补充了一条消息。"
}

function modelSupportsCapability(model: ModelRow, capability: string) {
  return Array.isArray(model.runtime_capabilities)
    && model.runtime_capabilities.includes(capability)
}

async function loadAttachmentDataUrl(input: {
  supabase: ReturnType<typeof createSupabaseAdminClient>
  attachment: LearningMessageAttachmentRow
}) {
  if (input.attachment.kind !== "image") {
    return null
  }

  const { data, error } = await input.supabase.storage
    .from(input.attachment.storage_bucket)
    .download(input.attachment.storage_path)

  assertSupabaseSuccess(error, "failed to download learning image attachment")

  if (!data) {
    return null
  }

  const buffer = Buffer.from(await data.arrayBuffer())
  return `data:${input.attachment.mime_type};base64,${buffer.toString("base64")}`
}

async function loadLearningMessageAttachments(input: {
  supabase: ReturnType<typeof createSupabaseAdminClient>
  userId: string
  sessionId: string
  attachmentIds?: string[]
}): Promise<NormalizedLearningAttachment[]> {
  const attachmentIds = normalizeAttachmentIds(input.attachmentIds)

  if (attachmentIds.length === 0) {
    return []
  }

  if (attachmentIds.length > 3) {
    throw new LearningValidationError("单条消息最多只能包含 3 个附件。")
  }

  const { data, error } = await input.supabase
    .from("learning_message_attachments")
    .select(
      "id, user_id, session_id, message_id, kind, processing_status, storage_bucket, storage_path, original_filename, mime_type, size_bytes, duration_ms, width, height, extracted_text, visual_summary, transcript_text, error_message, created_at",
    )
    .eq("user_id", input.userId)
    .in("id", attachmentIds)

  assertSupabaseSuccess(error, "failed to load learning message attachments")

  const rows = (data ?? []) as LearningMessageAttachmentRow[]
  if (rows.length !== attachmentIds.length) {
    throw new LearningValidationError("存在不可用的学习附件。")
  }

  const imageCount = rows.filter((row) => row.kind === "image").length
  const audioCount = rows.filter((row) => row.kind === "audio").length

  if (imageCount > 3) {
    throw new LearningValidationError("单条消息最多只能包含 3 张图片。")
  }

  if (audioCount > 1) {
    throw new LearningValidationError("单条消息最多只能包含 1 条语音。")
  }

  if (imageCount > 0 && audioCount > 0) {
    throw new LearningValidationError("第一版暂不支持图片和语音混合发送。")
  }

  for (const row of rows) {
    if (row.message_id) {
      throw new LearningValidationError("附件已被其他消息使用，请重新上传。")
    }

    if (row.session_id && row.session_id !== input.sessionId) {
      throw new LearningValidationError("附件不属于当前学习会话。")
    }
  }

  return Promise.all(
    rows.map(async (row) => {
      const { data: signedUrlData, error: signedUrlError } = await input.supabase.storage
        .from(row.storage_bucket)
        .createSignedUrl(row.storage_path, 600)

      assertSupabaseSuccess(signedUrlError, "failed to create learning attachment signed url")

      return {
        ...row,
        signedUrl: signedUrlData?.signedUrl ?? null,
        dataUrl: await loadAttachmentDataUrl({
          supabase: input.supabase,
          attachment: row,
        }),
      }
    }),
  )
}

function buildProviderUserMessageContent(input: {
  normalizedUserContent: string
  attachments: NormalizedLearningAttachment[]
  model: ModelRow
}): string | AIChatContentPart[] {
  const visionImages = input.attachments.filter((attachment) => (
    attachment.kind === "image" &&
    (attachment.dataUrl || attachment.signedUrl) &&
    modelSupportsCapability(input.model, "vision")
  ))

  if (visionImages.length === 0) {
    return input.normalizedUserContent
  }

  return [
    {
      type: "text",
      text: input.normalizedUserContent,
    },
    ...visionImages.map((attachment) => ({
      type: "image_url" as const,
      image_url: {
        url: (attachment.dataUrl || attachment.signedUrl) as string,
      },
    })),
  ]
}

async function tryGetIdempotentResponse(
  supabase: ReturnType<typeof createSupabaseAdminClient>,
  sessionId: string,
  clientMessageId: string | null,
  task: TaskRow,
): Promise<LearningMessageResponseData | null> {
  if (!clientMessageId) {
    return null
  }

  const { data: existingUserData, error: existingUserError } = await supabase
    .from("conversation_messages")
    .select("id")
    .eq("session_id", sessionId)
    .eq("client_message_id", clientMessageId)
    .eq("role", "user")
    .maybeSingle()

  assertSupabaseSuccess(existingUserError, "failed to check user message idempotency")

  const existingUser = (existingUserData as { id: string } | null) ?? null
  if (!existingUser) {
    return null
  }

  const { data: assistantData, error: assistantError } = await supabase
    .from("conversation_messages")
    .select("id, content_text, content_json, metadata")
    .eq("session_id", sessionId)
    .eq("reply_to_message_id", existingUser.id)
    .eq("role", "assistant")
    .order("sequence_no", { ascending: true })
    .limit(1)
    .maybeSingle()

  assertSupabaseSuccess(assistantError, "failed to load idempotent assistant response")

  const assistant =
    (assistantData as {
      id: string
      content_text: string | null
      content_json: JsonRecord
      metadata: JsonRecord
    } | null)
    ?? null

  if (!assistant) {
    return null
  }

  const metadata = assistant.metadata ?? {}
  const title =
    typeof metadata.title === "string" ? metadata.title : "AI 教练引导"
  const kind =
    metadata.kind === "task_feedback" ? "task_feedback" : "coach"

  return buildIdempotentReplayResponse({
    conversationId: sessionId,
    taskId: task.id,
    taskStatus: task.status,
    assistantTitle: title,
    assistantKind: kind,
    assistantContent: assistant.content_text ?? "",
    speechMessageId: assistant.id,
    structuredContent: parseStoredStructuredLearningMessageContent(
      assistant.content_json?.structuredContent ?? null,
    ),
    taskPatch: parseStoredTaskPatchMetadata({
      taskId: task.id,
      metadata,
    }),
  })
}

async function persistTaskPatch(
  input: PreparedLearningInvocation & {
    userId: string
    now: string
    taskPatch: LearningTaskPatch
    request: LearningMessageRequest
  },
) {
  const nextStatus = taskPatchStatusToPersistentStatus(input.taskPatch.status)
  const blockReason =
    nextStatus === "blocked"
      ? input.request.content.trim() || input.taskPatch.suggestedNextAction
      : null

  const { error: taskError } = await input.supabase
    .from("user_tasks")
    .update({
      status: nextStatus,
      started_at: input.task.status === "not_started" ? input.now : undefined,
      blocked_at: nextStatus === "blocked" ? input.now : null,
      block_reason: blockReason,
      updated_at: input.now,
    })
    .eq("id", input.task.id)
    .eq("user_id", input.userId)

  assertSupabaseSuccess(taskError, "failed to persist task patch status")

  const { error: pathError } = await input.supabase
    .from("user_learning_paths")
    .update({
      current_task_id: input.task.id,
      last_activity_at: input.now,
      updated_at: input.now,
    })
    .eq("id", input.path.id)
    .eq("user_id", input.userId)

  assertSupabaseSuccess(pathError, "failed to touch learning path after task patch")

  const { error: profileError } = await input.supabase
    .from("user_profiles")
    .update({
      last_learning_at: input.now,
      last_active_task_id: input.task.id,
      updated_at: input.now,
    })
    .eq("user_id", input.userId)

  assertSupabaseSuccess(profileError, "failed to touch profile after task patch")

  return nextStatus
}

async function resolveTaskPatchState(
  input: PreparedLearningInvocation & {
    userId: string
    now: string
    request: LearningMessageRequest
  },
): Promise<{
  taskPatch: LearningTaskPatch | null
  taskStatus: TaskRow["status"]
}> {
  const taskPatch = deriveTaskPatch({
    taskId: input.task.id,
    interactionType: input.interactionType,
    currentStatus: input.task.status,
    content: input.request.content,
  })

  if (!shouldPersistTaskPatch(taskPatch, input.task.status)) {
    return {
      taskPatch,
      taskStatus: input.task.status,
    }
  }

  if (!taskPatch) {
    return {
      taskPatch: null,
      taskStatus: input.task.status,
    }
  }

  return {
    taskPatch,
    taskStatus: await persistTaskPatch({
      ...input,
      taskPatch,
    }),
  }
}

function encodeSSEEvent(event: string, data: Record<string, unknown>) {
  return textEncoder.encode(
    `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`,
  )
}

async function prepareLearningInvocation(
  userId: string,
  request: LearningMessageRequest,
): Promise<PreparedLearningInvocation | null> {
  const runtime = await loadRuntimeState(userId, request.taskId)
  if (!runtime) {
    return null
  }

  const { supabase, tool, path, task, step } = runtime
  const requestedInteractionType = resolveLearningUserInteractionType({
    requestedInteractionType: request.interactionType,
    content: request.content,
    taskStatus: task.status,
  })
  const agentSelection = await resolveAgentTemplate({
    supabase,
    tool,
    path,
    step,
    interactionType: requestedInteractionType,
  })
  const { agent, interactionType } = agentSelection
  const { provider, model } = await loadProviderRuntime(supabase, agent)
  const session = await resolveConversationSession({
    supabase,
    userId,
    conversationId: request.conversationId,
    tool,
    path,
    task,
    step,
    agent,
    provider,
    model,
  })
  const clientMessageId =
    typeof request.clientMessageId === "string" && request.clientMessageId.trim().length > 0
      ? request.clientMessageId.trim()
      : null
  const history = await loadConversationHistory(
    supabase,
    session.id,
    Math.max(2, agent.context_message_limit),
  )
  const skills = await loadAgentSkillContexts(supabase, agent.code)
  const loadedAttachments = await loadLearningMessageAttachments({
    supabase,
    userId,
    sessionId: session.id,
    attachmentIds: request.attachmentIds,
  })
  const attachments = await preprocessLearningMessageAttachments({
    supabase,
    attachments: loadedAttachments,
    userText: request.content,
  })
  const userVisibleContent = buildUserVisibleContent(request, attachments)
  const normalizedUserContent = buildNormalizedUserContent(request, attachments)
  const systemPrompt = buildSystemPrompt({
    agent,
    tool,
    path,
    step,
    task,
    interactionType,
    skillsText: buildSkillContextText(skills),
  })
  const providerMessages: AIChatMessage[] = [
    {
      role: "system",
      content: systemPrompt,
    },
    ...historyToProviderMessages(history),
    {
      role: "user",
      content: buildProviderUserMessageContent({
        normalizedUserContent,
        attachments,
        model,
      }),
    },
  ]

  return {
    supabase,
    tool,
    path,
    task,
    step,
    interactionType,
    agent,
    provider,
    model,
    session,
    clientMessageId,
    skills,
    attachments,
    userVisibleContent,
    normalizedUserContent,
    providerMessages,
  }
}

async function insertUserMessage(
  input: PreparedLearningInvocation & {
    userId: string
    request: LearningMessageRequest
    now: string
  },
) {
  const userSequenceNo = input.session.message_count + 1

  const { data: userMessageData, error: userMessageError } = await input.supabase
    .from("conversation_messages")
    .insert({
      session_id: input.session.id,
      user_id: input.userId,
      user_task_id: input.task.id,
      role: "user",
      message_type: "plain_text",
      sequence_no: userSequenceNo,
      client_message_id: input.clientMessageId,
      content_text: input.userVisibleContent,
      content_json: {
        attachments: input.attachments.map(attachmentToContract),
      },
      metadata: {
        inputType: input.request.inputType,
        interactionType: input.interactionType,
        clientContext: input.request.clientContext ?? null,
        originalContent: input.request.content.trim(),
        attachmentIds: input.attachments.map((attachment) => attachment.id),
      },
      created_at: input.now,
    })
    .select("id")
    .single()

  assertSupabaseSuccess(userMessageError, "failed to insert conversation user message")
  if (!userMessageData) {
    throw new LearningValidationError("用户消息写入后未返回主键。")
  }

  if (input.attachments.length > 0) {
    const { error: attachmentUpdateError } = await input.supabase
      .from("learning_message_attachments")
      .update({
        session_id: input.session.id,
        message_id: userMessageData.id,
        updated_at: input.now,
      })
      .in("id", input.attachments.map((attachment) => attachment.id))
      .eq("user_id", input.userId)

    assertSupabaseSuccess(
      attachmentUpdateError,
      "failed to link learning attachments to user message",
    )
  }

  const { error: sessionUserUpdateError } = await input.supabase
    .from("conversation_sessions")
    .update({
      message_count: userSequenceNo,
      last_user_message_at: input.now,
      last_message_at: input.now,
      updated_at: input.now,
    })
    .eq("id", input.session.id)

  assertSupabaseSuccess(
    sessionUserUpdateError,
    "failed to update conversation session after user message",
  )

  const { error: taskConversationError } = await input.supabase
    .from("user_tasks")
    .update({
      last_conversation_id: input.session.id,
      updated_at: input.now,
    })
    .eq("id", input.task.id)
    .eq("user_id", input.userId)

  assertSupabaseSuccess(taskConversationError, "failed to update task last conversation")

  return {
    userMessageId: userMessageData.id,
    userSequenceNo,
  }
}

async function persistAssistantResult(
  input: PreparedLearningInvocation & {
    userId: string
    request: LearningMessageRequest
    now: string
    userMessageId: string
    userSequenceNo: number
    providerResult: AIProviderResult
    taskPatch: LearningTaskPatch | null
  },
) {
  const assistantSequenceNo = input.userSequenceNo + 1
  const assistantInteractionType = resolveAssistantInteractionType({
    requestedInteractionType: input.interactionType,
    assistantContent: input.providerResult.content,
  })
  const finalTaskPatch = finalizeAssistantTaskPatch({
    taskId: input.task.id,
    initialTaskPatch: input.taskPatch,
    assistantContent: input.providerResult.content,
  })
  const presentation = buildAssistantPresentation(
    assistantInteractionType,
    input.providerResult.content,
    input.request.inputType,
  )
  const structuredContent = buildStructuredLearningMessageContent({
    title: presentation.title,
    kind: presentation.kind,
    interactionType: assistantInteractionType,
    content: presentation.content,
    taskPatch: finalTaskPatch,
  })

  const { data: assistantMessageData, error: assistantMessageError } = await input.supabase
    .from("conversation_messages")
    .insert({
      session_id: input.session.id,
      user_id: input.userId,
      user_task_id: input.task.id,
      role: "assistant",
      message_type: "assistant_answer",
      sequence_no: assistantSequenceNo,
      reply_to_message_id: input.userMessageId,
      content_text: presentation.content,
      content_json: {
        structuredContent,
      },
      provider_code: input.provider.code,
      model_code: input.model.code,
      input_tokens: input.providerResult.usage.promptTokens,
      output_tokens: input.providerResult.usage.completionTokens,
      stream_chunk_count: input.providerResult.streamChunkCount,
      finish_reason: input.providerResult.finishReason,
      metadata: {
        interactionType: assistantInteractionType,
        agentCode: input.agent.code,
        title: presentation.title,
        kind: presentation.kind,
        taskPatchStatus: finalTaskPatch?.status ?? null,
        taskPatchSuggestedNextAction: finalTaskPatch?.suggestedNextAction ?? null,
      },
      created_at: input.now,
    })
    .select("id")
    .single()

  assertSupabaseSuccess(
    assistantMessageError,
    "failed to insert assistant conversation message",
  )
  if (!assistantMessageData) {
    throw new LearningValidationError("助手消息写入后未返回主键。")
  }

  const { error: invocationError } = await input.supabase
    .from("llm_invocations")
    .insert({
      session_id: input.session.id,
      assistant_message_id: assistantMessageData.id,
      user_message_id: input.userMessageId,
      user_id: input.userId,
      provider_code: input.provider.code,
      model_code: input.model.code,
      agent_code: input.agent.code,
      status: "succeeded",
      stream_enabled: input.providerResult.streamChunkCount > 0,
      prompt_tokens: input.providerResult.usage.promptTokens,
      completion_tokens: input.providerResult.usage.completionTokens,
      total_tokens: input.providerResult.usage.totalTokens,
      finish_reason: input.providerResult.finishReason,
      request_payload_redacted: input.providerResult.requestPayloadRedacted,
      response_payload_redacted: input.providerResult.responsePayloadRedacted,
      created_at: input.now,
    })

  assertSupabaseSuccess(invocationError, "failed to insert llm invocation")

  const { error: sessionAssistantUpdateError } = await input.supabase
    .from("conversation_sessions")
    .update({
      message_count: assistantSequenceNo,
      last_assistant_message_at: input.now,
      last_message_at: input.now,
      updated_at: input.now,
    })
    .eq("id", input.session.id)

  assertSupabaseSuccess(
    sessionAssistantUpdateError,
    "failed to update conversation session after assistant message",
  )

  await touchLearningPathActivity(input.userId, input.path.id, input.now)

  return {
    presentation,
    structuredContent,
    assistantMessageId: assistantMessageData.id,
    taskPatch: finalTaskPatch,
  }
}

async function persistFailedInvocation(
  input: PreparedLearningInvocation & {
    userId: string
    now: string
    userMessageId: string
    errorMessage: string
  },
) {
  const { error } = await input.supabase
    .from("llm_invocations")
    .insert({
      session_id: input.session.id,
      assistant_message_id: null,
      user_message_id: input.userMessageId,
      user_id: input.userId,
      provider_code: input.provider.code,
      model_code: input.model.code,
      agent_code: input.agent.code,
      status: "failed",
      stream_enabled: false,
      error_code: "AI_PROVIDER_ERROR",
      error_message: input.errorMessage,
      request_payload_redacted: {
        model: input.model.model_name,
        interactionType: input.interactionType,
        clientMessageId: input.clientMessageId,
        skillCodes: input.skills.map((skill) => skill.code),
      },
      response_payload_redacted: {
        error: input.errorMessage,
      },
      created_at: input.now,
    })

  assertSupabaseSuccess(error, "failed to insert failed llm invocation")
}

export async function orchestrateLearningMessage(
  userId: string,
  request: LearningMessageRequest,
): Promise<LearningMessageResponseData | null> {
  const prepared = await prepareLearningInvocation(userId, request)
  if (!prepared) {
    return null
  }

  const {
    supabase,
    task,
    session,
    clientMessageId,
    provider,
    model,
    agent,
  } = prepared

  const existingResponse = await tryGetIdempotentResponse(
    supabase,
    session.id,
    clientMessageId,
    task,
  )
  if (existingResponse) {
    return existingResponse
  }

  const now = new Date().toISOString()
  const { userMessageId, userSequenceNo } = await insertUserMessage({
    ...prepared,
    userId,
    request,
    now,
  })
  const { taskPatch, taskStatus } = await resolveTaskPatchState({
    ...prepared,
    userId,
    request,
    now,
  })

  try {
    const providerResult = await invokeAIProvider({
      provider: {
        code: provider.code,
        providerType: provider.provider_type,
        baseUrl: provider.base_url,
        authMode: provider.auth_mode,
        envSecretRef: provider.secret_ref,
        secretCiphertext: provider.secret_ciphertext,
        secretIv: provider.secret_iv,
        secretAuthTag: provider.secret_auth_tag,
        secretKeyVersion: provider.secret_key_version,
        timeoutMs: provider.timeout_ms,
        retryCount: provider.retry_count,
      },
      model: {
        code: model.code,
        modelName: model.model_name,
      },
      messages: prepared.providerMessages,
      temperature: agent.temperature,
      maxOutputTokens: agent.max_output_tokens,
    })
    const {
      presentation,
      structuredContent,
      taskPatch: finalTaskPatch,
      assistantMessageId,
    } = await persistAssistantResult({
      ...prepared,
      userId,
      request,
      now,
      userMessageId,
      userSequenceNo,
      providerResult,
      taskPatch,
    })

    return buildIdempotentReplayResponse({
      conversationId: session.id,
      taskId: task.id,
      taskStatus,
      assistantTitle: presentation.title,
      assistantKind: presentation.kind,
      assistantContent: presentation.content,
      speechMessageId: assistantMessageId,
      structuredContent,
      taskPatch: finalTaskPatch,
    })
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown AI provider error"
    const timedOut = /timed out|超时/i.test(message)
    const rateLimited = /429|rate limit|too many requests|限流/i.test(message)
    const missingSecret = /missing required provider secret|api key|密钥/i.test(message)

    await persistFailedInvocation({
      ...prepared,
      userId,
      now,
      userMessageId,
      errorMessage: message,
    })
    void emitLearningAIAdminNotification({
      severity: timedOut ? "warning" : "critical",
      category: missingSecret ? "system" : "ai",
      title: missingSecret
        ? "AI Provider 密钥不可用"
        : rateLimited
          ? "AI 调用触发限流"
          : timedOut
            ? "AI 调用超时"
            : "AI 调用失败",
      content: `${provider.code}/${model.code}：${message}`,
      sourceType: "learning_ai_invocation",
      dedupeKey: `ai:learning:${provider.code}:${model.code}:${missingSecret ? "secret" : rateLimited ? "rate-limit" : timedOut ? "timeout" : "failed"}`,
      payload: {
        providerCode: provider.code,
        modelCode: model.code,
        agentCode: agent.code,
        sessionId: session.id,
        userId,
        taskId: task.id,
        status: missingSecret ? "config_missing" : rateLimited ? "rate_limited" : timedOut ? "timed_out" : "failed",
        errorMessage: message,
      },
    })

    if (error instanceof LearningAIProviderError) {
      throw error
    }

    throw new LearningAIProviderError(message)
  }
}

export async function streamLearningMessage(
  userId: string,
  request: LearningMessageRequest,
): Promise<ReadableStream<Uint8Array> | null> {
  const prepared = await prepareLearningInvocation(userId, request)
  if (!prepared) {
    return null
  }

  const { supabase, task, session, clientMessageId, agent, model, provider } = prepared

  const existingResponse = await tryGetIdempotentResponse(
    supabase,
    session.id,
    clientMessageId,
    task,
  )

  if (existingResponse) {
    return new ReadableStream<Uint8Array>({
      start(controller) {
        const replayEvents = buildIdempotentReplaySSEEvents({
          conversationId: session.id,
          interactionType: prepared.interactionType,
          agentCode: agent.code,
          modelCode: model.code,
          providerCode: provider.code,
          messageTitle: existingResponse.message.title ?? "AI 教练引导",
          messageKind: existingResponse.message.kind,
          messageId: existingResponse.message.speechMessageId,
          messageContent: existingResponse.message.content,
          structuredContent: existingResponse.message.structuredContent ?? null,
          taskPatch: existingResponse.taskPatch,
        })

        for (const event of replayEvents) {
          controller.enqueue(encodeSSEEvent(event.event, event.data))
        }

        controller.close()
      },
    })
  }

  const now = new Date().toISOString()
  const { userMessageId, userSequenceNo } = await insertUserMessage({
    ...prepared,
    userId,
    request,
    now,
  })
  const { taskPatch } = await resolveTaskPatchState({
    ...prepared,
    userId,
    request,
    now,
  })

  return new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (event: string, data: Record<string, unknown>) => {
        controller.enqueue(encodeSSEEvent(event, data))
      }

      try {
        send("session_started", {
          conversationId: session.id,
          interactionType: prepared.interactionType,
          agentCode: agent.code,
          modelCode: model.code,
          providerCode: provider.code,
        })
        if (taskPatch) {
          send("task_patch", taskPatch)
        }

        const providerResult = await streamAIProvider({
          provider: {
            code: provider.code,
            providerType: provider.provider_type,
            baseUrl: provider.base_url,
            authMode: provider.auth_mode,
            envSecretRef: provider.secret_ref,
            secretCiphertext: provider.secret_ciphertext,
            secretIv: provider.secret_iv,
            secretAuthTag: provider.secret_auth_tag,
            secretKeyVersion: provider.secret_key_version,
            timeoutMs: provider.timeout_ms,
            retryCount: provider.retry_count,
          },
          model: {
            code: model.code,
            modelName: model.model_name,
          },
          messages: prepared.providerMessages,
          temperature: agent.temperature,
          maxOutputTokens: agent.max_output_tokens,
          onTextDelta(delta) {
            send("assistant_delta", { delta })
          },
        })

        const {
          assistantMessageId,
          presentation,
          structuredContent,
          taskPatch: finalTaskPatch,
        } = await persistAssistantResult({
          ...prepared,
          userId,
          request,
          now,
          userMessageId,
          userSequenceNo,
          providerResult,
          taskPatch,
        })

        if (
          finalTaskPatch
          && (
            !taskPatch
            || taskPatch.status !== finalTaskPatch.status
            || taskPatch.suggestedNextAction !== finalTaskPatch.suggestedNextAction
          )
        ) {
          send("task_patch", finalTaskPatch)
        }

        send("assistant_done", {
          messageId: assistantMessageId,
          title: presentation.title,
          kind: presentation.kind,
          content: presentation.content,
          structuredContent,
          finishReason: providerResult.finishReason,
          usage: providerResult.usage,
        })
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Unknown AI provider stream error"
        const timedOut = /timed out|超时/i.test(message)
        const rateLimited = /429|rate limit|too many requests|限流/i.test(message)
        const missingSecret = /missing required provider secret|api key|密钥/i.test(message)

        await persistFailedInvocation({
          ...prepared,
          userId,
          now,
          userMessageId,
          errorMessage: message,
        })
        void emitLearningAIAdminNotification({
          severity: timedOut ? "warning" : "critical",
          category: missingSecret ? "system" : "ai",
          title: missingSecret
            ? "AI Provider 密钥不可用"
            : rateLimited
              ? "AI 流式调用触发限流"
              : timedOut
                ? "AI 流式调用超时"
                : "AI 流式调用失败",
          content: `${provider.code}/${model.code}：${message}`,
          sourceType: "learning_ai_stream_invocation",
          dedupeKey: `ai:learning-stream:${provider.code}:${model.code}:${missingSecret ? "secret" : rateLimited ? "rate-limit" : timedOut ? "timeout" : "failed"}`,
          payload: {
            providerCode: provider.code,
            modelCode: model.code,
            agentCode: agent.code,
            sessionId: session.id,
            userId,
            taskId: task.id,
            status: missingSecret ? "config_missing" : rateLimited ? "rate_limited" : timedOut ? "timed_out" : "failed",
            errorMessage: message,
          },
        })

        send("error", {
          code: "AI_PROVIDER_ERROR",
          message,
        })
      } finally {
        controller.close()
      }
    },
  })
}
