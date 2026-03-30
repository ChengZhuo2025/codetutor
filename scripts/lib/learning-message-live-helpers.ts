import assert from "node:assert/strict"

import { parseStoredStructuredLearningMessageContent } from "../../lib/learning/structured-message.ts"
import { loadEnvFile } from "./db-env.mjs"

export const DEMO_USER_ID = "c53ca227-d0b9-40f2-8274-cea851f7ad03"

type ActivePathRow = {
  id: string
  current_task_id: string | null
}

type TaskRow = {
  id: string
  status: "not_started" | "in_progress" | "blocked" | "completed" | "archived"
}

type PersistedUserMessageRow = {
  id: string
  session_id: string
  sequence_no: number
  content_text: string | null
}

type PersistedAssistantMessageRow = {
  id: string
  sequence_no: number
  content_text: string | null
  content_json: Record<string, unknown>
  stream_chunk_count: number
  finish_reason: string | null
}

type InvocationRow = {
  status: "streaming" | "succeeded" | "failed" | "cancelled" | "timed_out"
  stream_enabled: boolean
  provider_code: string
  model_code: string
  total_tokens: number | null
  finish_reason: string | null
}

export function hydrateProcessEnv() {
  const env = loadEnvFile()

  for (const [key, value] of Object.entries(env)) {
    if (!process.env[key]) {
      process.env[key] = value
    }
  }
}

export function failOnSupabaseError(
  error: { message?: string } | null,
  label: string,
): asserts error is null {
  if (error) {
    assert.fail(`${label}: ${error.message ?? "unknown supabase error"}`)
  }
}

export async function loadDependencies() {
  const [{ createSupabaseAdminClient }, { sendLearningMessage }, { streamLearningMessage }] =
    await Promise.all([
      import("../../lib/supabase/admin.ts"),
      import("../../server/modules/learning/service.ts"),
      import("../../server/modules/learning/orchestration.ts"),
    ])

  return {
    createSupabaseAdminClient,
    sendLearningMessage,
    streamLearningMessage,
  }
}

export async function resolveActiveTask(
  supabase: ReturnType<
    Awaited<ReturnType<typeof loadDependencies>>["createSupabaseAdminClient"]
  >,
) {
  const { data: activePathData, error: activePathError } = await supabase
    .from("user_learning_paths")
    .select("id, current_task_id")
    .eq("user_id", DEMO_USER_ID)
    .eq("status", "active")
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle()

  failOnSupabaseError(activePathError, "failed to load active learning path")

  const activePath = (activePathData as ActivePathRow | null) ?? null
  assert.ok(activePath, "expected demo user to have an active learning path")

  const { data: taskRows, error: taskError } = await supabase
    .from("user_tasks")
    .select("id, status")
    .eq("user_learning_path_id", activePath.id)
    .order("created_at", { ascending: true })

  failOnSupabaseError(taskError, "failed to load active path tasks")

  const tasks = (taskRows ?? []) as TaskRow[]
  assert.ok(tasks.length > 0, "expected active learning path to contain tasks")

  const task =
    tasks.find((item) => item.id === activePath.current_task_id)
    ?? tasks.find((item) => item.status === "in_progress")
    ?? tasks.find((item) => item.status === "blocked")
    ?? tasks[0]

  assert.ok(task, "expected demo user to have a current task")

  return {
    pathId: activePath.id,
    task,
  }
}

export async function loadPersistedArtifacts(
  supabase: ReturnType<
    Awaited<ReturnType<typeof loadDependencies>>["createSupabaseAdminClient"]
  >,
  clientMessageId: string,
) {
  const { data: userMessageData, error: userMessageError } = await supabase
    .from("conversation_messages")
    .select("id, session_id, sequence_no, content_text")
    .eq("user_id", DEMO_USER_ID)
    .eq("role", "user")
    .eq("client_message_id", clientMessageId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle()

  failOnSupabaseError(userMessageError, "failed to load persisted user message")

  const userMessage = (userMessageData as PersistedUserMessageRow | null) ?? null
  assert.ok(userMessage, `expected user message to be persisted for ${clientMessageId}`)

  const { data: assistantMessageData, error: assistantMessageError } = await supabase
    .from("conversation_messages")
    .select("id, sequence_no, content_text, content_json, stream_chunk_count, finish_reason")
    .eq("session_id", userMessage.session_id)
    .eq("role", "assistant")
    .eq("reply_to_message_id", userMessage.id)
    .order("sequence_no", { ascending: true })
    .limit(1)
    .maybeSingle()

  failOnSupabaseError(
    assistantMessageError,
    "failed to load persisted assistant message",
  )

  const assistantMessage =
    (assistantMessageData as PersistedAssistantMessageRow | null) ?? null
  assert.ok(
    assistantMessage,
    `expected assistant message to be persisted for ${clientMessageId}`,
  )

  const { data: invocationData, error: invocationError } = await supabase
    .from("llm_invocations")
    .select("status, stream_enabled, provider_code, model_code, total_tokens, finish_reason")
    .eq("user_id", DEMO_USER_ID)
    .eq("user_message_id", userMessage.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle()

  failOnSupabaseError(invocationError, "failed to load llm invocation")

  const invocation = (invocationData as InvocationRow | null) ?? null
  assert.ok(invocation, `expected llm invocation to be persisted for ${clientMessageId}`)

  return {
    userMessage,
    assistantMessage,
    invocation,
  }
}

export function parseSSEEventNames(streamText: string) {
  return streamText
    .split("\n\n")
    .map((chunk) => chunk.match(/^event:\s*(.+)$/m)?.[1] ?? null)
    .filter((value): value is string => Boolean(value))
}

export function parseSSEEvents(streamText: string) {
  return streamText
    .split("\n\n")
    .map((chunk) => {
      const event = chunk.match(/^event:\s*(.+)$/m)?.[1] ?? null
      const dataText = chunk
        .split("\n")
        .filter((line) => line.startsWith("data:"))
        .map((line) => line.slice(5).trim())
        .join("")

      if (!event || !dataText) {
        return null
      }

      return {
        event,
        data: JSON.parse(dataText) as Record<string, unknown>,
      }
    })
    .filter((item): item is { event: string; data: Record<string, unknown> } => Boolean(item))
}

export async function assertTaskStatusUnchanged(
  supabase: ReturnType<
    Awaited<ReturnType<typeof loadDependencies>>["createSupabaseAdminClient"]
  >,
  taskId: string,
  beforeTaskStatus: TaskRow["status"],
) {
  const { data: latestTaskData, error: latestTaskError } = await supabase
    .from("user_tasks")
    .select("status")
    .eq("id", taskId)
    .maybeSingle()

  failOnSupabaseError(latestTaskError, "failed to reload task status after live test")

  const latestTask = (latestTaskData as Pick<TaskRow, "status"> | null) ?? null
  assert.ok(latestTask, "expected task to still exist after live test")
  assert.equal(
    latestTask.status,
    beforeTaskStatus,
    "completion_feedback live test should not mutate persisted task status",
  )
}

export async function runJsonLiveAssertions() {
  const { createSupabaseAdminClient, sendLearningMessage } = await loadDependencies()
  const supabase = createSupabaseAdminClient()
  const runtime = await resolveActiveTask(supabase)
  const beforeTaskStatus = runtime.task.status
  const clientMessageId = `learning-live-json-${Date.now()}`

  const response = await sendLearningMessage(DEMO_USER_ID, {
    taskId: runtime.task.id,
    clientMessageId,
    interactionType: "completion_feedback",
    inputType: "text",
    content:
      "我刚完成这一步，请只用两句中文做简短复盘，并给我一个下一步验证点。",
    clientContext: {
      pagePath: "/learn",
    },
  })

  assert.ok(response, "expected json learning response to be returned")
  assert.equal(response.taskId, runtime.task.id)
  assert.equal(response.taskPatch?.status, "completed")
  assert.ok(
    response.message.content.trim().length > 0,
    "expected json assistant content to be non-empty",
  )
  assert.ok(
    response.message.structuredContent,
    "expected json assistant response to include structuredContent",
  )
  assert.equal(
    response.message.structuredContent?.interactionType,
    "completion_feedback",
  )
  assert.ok(
    (response.message.structuredContent?.actions.length ?? 0) > 0,
    "expected json assistant structuredContent to include actions",
  )

  const artifacts = await loadPersistedArtifacts(supabase, clientMessageId)
  assert.equal(artifacts.userMessage.content_text?.includes("简短复盘"), true)
  assert.equal(
    artifacts.assistantMessage.sequence_no,
    artifacts.userMessage.sequence_no + 1,
  )
  assert.ok(
    (artifacts.assistantMessage.content_text ?? "").trim().length > 0,
    "expected persisted assistant json message to be non-empty",
  )
  assert.equal(artifacts.invocation.status, "succeeded")
  assert.equal(artifacts.invocation.stream_enabled, false)
  assert.ok(artifacts.invocation.provider_code.length > 0)
  assert.ok(artifacts.invocation.model_code.length > 0)
  assert.ok(
    parseStoredStructuredLearningMessageContent(
      artifacts.assistantMessage.content_json?.structuredContent ?? null,
    ),
    "expected persisted assistant json message to store structuredContent",
  )
  assert.equal(
    parseStoredStructuredLearningMessageContent(
      artifacts.assistantMessage.content_json?.structuredContent ?? null,
    )?.interactionType,
    "completion_feedback",
  )
  assert.ok(
    (
      parseStoredStructuredLearningMessageContent(
        artifacts.assistantMessage.content_json?.structuredContent ?? null,
      )?.actions.length ?? 0
    ) > 0,
    "expected persisted assistant json message to store structured actions",
  )

  await assertTaskStatusUnchanged(supabase, runtime.task.id, beforeTaskStatus)
}

export async function runSseLiveAssertions() {
  const { createSupabaseAdminClient, streamLearningMessage } = await loadDependencies()
  const supabase = createSupabaseAdminClient()
  const runtime = await resolveActiveTask(supabase)
  const beforeTaskStatus = runtime.task.status
  const clientMessageId = `learning-live-sse-${Date.now()}`

  const stream = await streamLearningMessage(DEMO_USER_ID, {
    taskId: runtime.task.id,
    clientMessageId,
    interactionType: "completion_feedback",
    inputType: "text",
    content:
      "继续给我一个简短的完成反馈，请只输出很短的中文，并指出下一步应该验证什么。",
    stream: true,
    clientContext: {
      pagePath: "/learn",
    },
  })

  assert.ok(stream, "expected sse learning response stream to be returned")

  const streamText = await new Response(stream).text()
  const eventNames = parseSSEEventNames(streamText)
  const events = parseSSEEvents(streamText)
  const assistantDone = events.find((event) => event.event === "assistant_done") ?? null
  assert.ok(
    eventNames.includes("session_started"),
    "expected sse stream to emit session_started",
  )
  assert.ok(
    eventNames.includes("assistant_delta"),
    "expected sse stream to emit assistant_delta",
  )
  assert.ok(
    eventNames.includes("assistant_done"),
    "expected sse stream to emit assistant_done",
  )
  assert.equal(
    eventNames.includes("error"),
    false,
    `did not expect provider stream error, got events: ${eventNames.join(", ")}`,
  )
  assert.ok(assistantDone, "expected sse stream to emit assistant_done payload")
  assert.equal(typeof assistantDone?.data.title, "string")
  assert.ok(
    assistantDone?.data.kind === "coach" || assistantDone?.data.kind === "task_feedback",
    "expected assistant_done to include message kind",
  )
  assert.ok(
    parseStoredStructuredLearningMessageContent(assistantDone?.data.structuredContent ?? null),
    "expected assistant_done to include structuredContent payload",
  )
  assert.equal(
    parseStoredStructuredLearningMessageContent(
      assistantDone?.data.structuredContent ?? null,
    )?.interactionType,
    "completion_feedback",
  )
  assert.ok(
    (
      parseStoredStructuredLearningMessageContent(
        assistantDone?.data.structuredContent ?? null,
      )?.actions.length ?? 0
    ) > 0,
    "expected assistant_done structuredContent to include actions",
  )

  const artifacts = await loadPersistedArtifacts(supabase, clientMessageId)
  assert.equal(artifacts.invocation.status, "succeeded")
  assert.equal(artifacts.invocation.stream_enabled, true)
  assert.ok(
    artifacts.assistantMessage.stream_chunk_count > 0,
    "expected streamed assistant message to persist chunk count",
  )
  assert.ok(
    (artifacts.assistantMessage.content_text ?? "").trim().length > 0,
    "expected streamed assistant content to be non-empty",
  )
  assert.ok(
    parseStoredStructuredLearningMessageContent(
      artifacts.assistantMessage.content_json?.structuredContent ?? null,
    ),
    "expected persisted streamed assistant message to store structuredContent",
  )
  assert.equal(
    parseStoredStructuredLearningMessageContent(
      artifacts.assistantMessage.content_json?.structuredContent ?? null,
    )?.interactionType,
    "completion_feedback",
  )
  assert.ok(
    (
      parseStoredStructuredLearningMessageContent(
        artifacts.assistantMessage.content_json?.structuredContent ?? null,
      )?.actions.length ?? 0
    ) > 0,
    "expected persisted streamed assistant message to store structured actions",
  )

  await assertTaskStatusUnchanged(supabase, runtime.task.id, beforeTaskStatus)
}
