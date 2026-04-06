import "server-only"

import { createSupabaseAdminClient } from "@/lib/supabase/admin"
import {
  buildStructuredLearningMessageContent,
  parseStoredStructuredLearningMessageContent,
} from "@/lib/learning/structured-message"
import type {
  LearningInputType,
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
import { LearningAIProviderError, LearningValidationError } from "./errors.ts"
import { buildLearningOutputFormatGuide } from "./output-format.ts"
import {
  buildIdempotentReplayResponse,
  deriveTaskPatch,
  parseStoredTaskPatchMetadata,
  shouldPersistTaskPatch,
  taskPatchStatusToPersistentStatus,
} from "./logic.ts"
import { buildIdempotentReplaySSEEvents } from "./http-logic.ts"
import {
  invokeAIProvider,
  streamAIProvider,
  type AIChatMessage,
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
  providerMessages: AIChatMessage[]
}

export type LearningInteractionType =
  | "teaching"
  | "blocked_help"
  | "task_review"
  | "completion_feedback"
  | "path_guidance"

const textEncoder = new TextEncoder()

function resolveInteractionType(
  requested: string | null | undefined,
  content: string,
  taskStatus: TaskRow["status"],
): LearningInteractionType {
  if (
    requested === "teaching"
    || requested === "blocked_help"
    || requested === "task_review"
    || requested === "completion_feedback"
    || requested === "path_guidance"
  ) {
    return requested
  }

  if (taskStatus === "blocked") {
    return "blocked_help"
  }

  if (/(卡住|报错|错误|error|failed|失败)/i.test(content)) {
    return "blocked_help"
  }

  if (/(复盘|回顾|review|总结)/i.test(content)) {
    return "task_review"
  }

  if (/(下一步|接下来|继续学|继续做)/i.test(content)) {
    return "path_guidance"
  }

  return "teaching"
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
    input.agent.system_prompt_template,
    input.agent.developer_prompt_template ?? "",
    "你服务于 AI 编程学习教练产品，回答必须中文、直接、具体。",
    "不要虚构用户已经完成的结果，不要脱离当前关卡目标扩展过多。",
    "优先给当前一步、验证方式和下一步，而不是泛泛而谈。",
    "除非用户明确要求，否则不要输出 JSON。",
    "",
    "# 当前学习上下文",
    `工具：${input.tool.name} (${input.tool.code})`,
    `学习模式：${input.path.selection_mode}`,
    `学习等级：${input.path.learning_level}`,
    `路径：${input.path.path_name_snapshot} (${input.path.path_code_snapshot})`,
    `当前关卡：第 ${input.step.step_no} 关 - ${input.step.title}`,
    `关卡目标：${input.step.goal}`,
    `关卡摘要：${input.step.focus ?? input.step.summary}`,
    `完成标准：${input.step.completion_criteria ?? input.step.goal}`,
    `任务状态：${input.task.status}`,
    `本次交互类型：${input.interactionType}`,
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
      "id, template_path_id, tool_id, path_code_snapshot, path_name_snapshot, learning_level, selection_mode, status, current_task_id",
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
          .select("id, step_no, title, summary, focus, goal, completion_criteria")
          .eq("path_id", path.template_path_id)
          .order("step_no", { ascending: true })
      : supabase
          .from("path_steps")
          .select("id, step_no, title, summary, focus, goal, completion_criteria")
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

  const candidates = (await loadAIAgentBindingsSnapshot<AgentBindingRow>())
    .filter((binding) => binding.interaction_type === input.interactionType)
    .filter((binding) => binding.is_active)
    .filter((binding) => {
      if (binding.tool_id && binding.tool_id !== input.tool.id) {
        return false
      }

      if (binding.learning_level && binding.learning_level !== input.path.learning_level) {
        return false
      }

      if (binding.selection_mode && binding.selection_mode !== input.path.selection_mode) {
        return false
      }

      if (binding.path_id && binding.path_id !== input.path.template_path_id) {
        return false
      }

      if (binding.step_no && binding.step_no !== input.step.step_no) {
        return false
      }

      return true
    })
    .sort((left, right) => {
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

  return agent
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
  const interactionType = resolveInteractionType(
    request.interactionType,
    request.content,
    task.status,
  )
  const agent = await resolveAgentTemplate({
    supabase,
    tool,
    path,
    step,
    interactionType,
  })
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
      content: request.content.trim(),
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
      content_text: input.request.content.trim(),
      content_json: {},
      metadata: {
        inputType: input.request.inputType,
        interactionType: input.interactionType,
        clientContext: input.request.clientContext ?? null,
      },
      created_at: input.now,
    })
    .select("id")
    .single()

  assertSupabaseSuccess(userMessageError, "failed to insert conversation user message")
  if (!userMessageData) {
    throw new LearningValidationError("用户消息写入后未返回主键。")
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
  const presentation = buildAssistantPresentation(
    input.interactionType,
    input.providerResult.content,
    input.request.inputType,
  )
  const structuredContent = buildStructuredLearningMessageContent({
    title: presentation.title,
    kind: presentation.kind,
    interactionType: input.interactionType,
    content: presentation.content,
    taskPatch: input.taskPatch,
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
        interactionType: input.interactionType,
        agentCode: input.agent.code,
        title: presentation.title,
        kind: presentation.kind,
        taskPatchStatus: input.taskPatch?.status ?? null,
        taskPatchSuggestedNextAction: input.taskPatch?.suggestedNextAction ?? null,
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
    const { presentation, structuredContent } = await persistAssistantResult({
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
      structuredContent,
      taskPatch,
    })
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown AI provider error"

    await persistFailedInvocation({
      ...prepared,
      userId,
      now,
      userMessageId,
      errorMessage: message,
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

        const { assistantMessageId, presentation, structuredContent } = await persistAssistantResult({
          ...prepared,
          userId,
          request,
          now,
          userMessageId,
          userSequenceNo,
          providerResult,
          taskPatch,
        })

        send("assistant_done", {
          messageId: assistantMessageId,
          title: presentation.title,
          kind: presentation.kind,
          structuredContent,
          finishReason: providerResult.finishReason,
          usage: providerResult.usage,
        })
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Unknown AI provider stream error"

        await persistFailedInvocation({
          ...prepared,
          userId,
          now,
          userMessageId,
          errorMessage: message,
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
