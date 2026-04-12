"use client"

import { useEffect, useLayoutEffect, useRef, useState } from "react"
import { APP_EVENTS } from "@/constants/events"
import { ROUTES } from "@/constants/routes"
import { LearnChatComposer, TEXTAREA_MAX_HEIGHT } from "@/features/learning/components/learn-chat-composer"
import { LearnChatHeader } from "@/features/learning/components/learn-chat-header"
import { LearnChatLinkChoiceDialog } from "@/features/learning/components/learn-chat-link-choice-dialog"
import { LearnChatMessageList } from "@/features/learning/components/learn-chat-message-list"
import { LearnChatRestartDialog } from "@/features/learning/components/learn-chat-restart-dialog"
import {
  parseStructuredContentPayload,
  resolveAssistantInteractionType,
  resolveTaskStateFromPatch,
  STREAMING_PLACEHOLDER,
} from "@/features/learning/components/learn-chat-rich-content"
import type { ConnectionState } from "@/features/learning/components/learn-chat-types"
import type {
  LearningSupportOption,
  Message,
  MessageAttachment,
  QuickAction,
} from "@/features/learning/types"
import {
  buildComposerDraftFromAssistantAction,
  canUseCompletionQuickAction,
  isExplicitTaskCompletionInput,
  mergeAssistantActionIntoInput,
  shouldCompleteCurrentTaskFromAssistantAction,
  shouldRenderLearningResumeCard,
} from "@/features/learning/lib/chat-behavior"
import type {
  LearningCurrentSessionResponseData,
  LearningMessageResponseData,
  LearningMessagesResponseData,
  LearningRestartConversationResponseData,
  LearningTaskPatch,
} from "@/lib/api/contracts/learning"
import type {
  CompleteTaskResponseData,
  UpdateTaskStatusResponseData,
} from "@/lib/api/contracts/task"
import { apiFetch, requestData } from "@/lib/api/client"
import { buildStructuredLearningMessageContent } from "@/lib/learning/structured-message"
import { useAppEventTracker } from "@/providers/app-providers"

const STREAMING_BATCH_SIZE = 16
const STREAMING_BATCH_DELAY_MS = 70

type PendingDraft = {
  text: string
  attachment: MessageAttachment | null
}

type SSEEventHandler = (event: string, data: Record<string, unknown>) => void

function createAttachmentFromFile(file: File): MessageAttachment {
  return {
    type: "image",
    url: URL.createObjectURL(file),
    name: file.name,
  }
}

function parseTaskPatchPayload(
  payload: Record<string, unknown>,
): LearningTaskPatch | null {
  if (typeof payload.taskId !== "string") {
    return null
  }

  if (
    payload.status !== "in_progress" &&
    payload.status !== "blocked" &&
    payload.status !== "completed"
  ) {
    return null
  }

  if (typeof payload.suggestedNextAction !== "string") {
    return null
  }

  return {
    taskId: payload.taskId,
    status: payload.status,
    suggestedNextAction: payload.suggestedNextAction,
  }
}

async function consumeSSE(response: Response, onEvent: SSEEventHandler) {
  if (!response.body) {
    throw new Error("流式响应为空。")
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ""

  while (true) {
    const { value, done } = await reader.read()
    if (done) {
      break
    }

    buffer += decoder.decode(value, { stream: true })

    while (true) {
      const boundary = buffer.indexOf("\n\n")
      if (boundary < 0) {
        break
      }

      const rawEvent = buffer.slice(0, boundary)
      buffer = buffer.slice(boundary + 2)

      const lines = rawEvent.split("\n")
      const eventLine = lines.find((line) => line.startsWith("event:"))
      const dataLines = lines
        .filter((line) => line.startsWith("data:"))
        .map((line) => line.slice(5).trim())

      if (!eventLine || dataLines.length === 0) {
        continue
      }

      const event = eventLine.slice(6).trim()

      let data: Record<string, unknown>
      try {
        data = JSON.parse(dataLines.join("")) as Record<string, unknown>
      } catch (parseError) {
        console.error("Failed to parse SSE data:", parseError)
        continue
      }

      onEvent(event, data)
    }
  }
}

function extractHttpLinks(text: string): string[] {
  const matches = text.match(/https?:\/\/[^\s)]+/g) ?? []
  const normalized = matches
    .map((raw) => raw.replace(/[),.;!?]+$/, "").trim())
    .filter(Boolean)

  return Array.from(new Set(normalized))
}

type LearnChatProps = {
  learningData: LearningCurrentSessionResponseData
  onRequestRefresh: () => void
  onOpenMaterialPlanDialog?: (links?: string[]) => void
}

export function LearnChat({
  learningData,
  onRequestRefresh,
  onOpenMaterialPlanDialog,
}: LearnChatProps) {
  const { trackEvent } = useAppEventTracker()
  const [messages, setMessages] = useState<Message[]>(learningData.messages)
  const [conversationId, setConversationId] = useState<string | null>(
    learningData.conversationId,
  )
  const [input, setInput] = useState("")
  const [isTyping, setIsTyping] = useState(false)
  const [previewAttachment, setPreviewAttachment] =
    useState<MessageAttachment | null>(null)
  const [sendError, setSendError] = useState<string | null>(null)
  const [failedDraft, setFailedDraft] = useState<PendingDraft | null>(null)
  const [connectionState, setConnectionState] =
    useState<ConnectionState>("online")
  const [showSupportOptions, setShowSupportOptions] = useState(false)
  const [taskState, setTaskState] = useState(learningData.task.status)
  const [resumeCardDismissed, setResumeCardDismissed] = useState(false)
  const [historyPagination, setHistoryPagination] = useState(
    learningData.historyPagination,
  )
  const [isLoadingHistory, setIsLoadingHistory] = useState(false)
  const [historyError, setHistoryError] = useState<string | null>(null)
  const [pendingAssistantMessageId, setPendingAssistantMessageId] = useState<
    number | null
  >(null)
  const [linkChoiceOpen, setLinkChoiceOpen] = useState(false)
  const [linkChoiceLinks, setLinkChoiceLinks] = useState<string[]>([])
  const [restartDialogOpen, setRestartDialogOpen] = useState(false)
  const [restartSubmitting, setRestartSubmitting] = useState(false)

  const bottomRef = useRef<HTMLDivElement>(null)
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const nextMessageId = useRef(learningData.messages.length + 1)
  const reconnectTimerRef = useRef<number | null>(null)
  const streamBufferRef = useRef("")
  const streamFlushTimerRef = useRef<number | null>(null)
  const streamTargetMessageIdRef = useRef<number | null>(null)
  const streamHasVisibleContentRef = useRef(false)
  const prependScrollMetricsRef = useRef<{
    previousScrollHeight: number
    previousScrollTop: number
  } | null>(null)

  const { mission, planSummary, resume, rightPanel, supportOptions } =
    learningData
  const hasResume = Boolean(resume)
  const showResumeCard = shouldRenderLearningResumeCard({
    hasResume,
    dismissed: resumeCardDismissed,
  })

  useEffect(() => {
    setResumeCardDismissed(false)
  }, [learningData.path.id, hasResume])

  const canTriggerCompleteQuickAction = canUseCompletionQuickAction({
    taskState,
    messages: messages.map((message) => ({
      role: message.role,
      kind: message.kind,
      content: message.content,
      interactionType:
        message.role === "ai"
          ? resolveAssistantInteractionType(message)
          : null,
      actionLabels:
        message.structuredContent?.actions?.map((action) => action.label) ?? [],
      taskPatchStatus: message.taskPatch?.status ?? null,
    })),
  })

  const scrollToConversationBottom = (behavior: ScrollBehavior = "smooth") => {
    window.requestAnimationFrame(() => {
      bottomRef.current?.scrollIntoView({ behavior })
    })
  }

  const requestSessionRefresh = () => {
    onRequestRefresh()
    window.setTimeout(() => onRequestRefresh(), 180)
  }

  useEffect(() => {
    setMessages(learningData.messages)
    setConversationId(learningData.conversationId)
    setTaskState(learningData.task.status)
    setHistoryPagination(learningData.historyPagination)
    setHistoryError(null)
    setIsLoadingHistory(false)
    setPendingAssistantMessageId(null)
    nextMessageId.current = learningData.messages.length + 1
    streamBufferRef.current = ""
    streamTargetMessageIdRef.current = null
    streamHasVisibleContentRef.current = false
  }, [learningData])

  useEffect(() => {
    const syncConnectionState = () => {
      if (!navigator.onLine) {
        setConnectionState("offline")
        return
      }

      setConnectionState((prev) => {
        if (prev === "offline") {
          if (reconnectTimerRef.current) {
            window.clearTimeout(reconnectTimerRef.current)
          }
          reconnectTimerRef.current = window.setTimeout(() => {
            setConnectionState("online")
            reconnectTimerRef.current = null
          }, 1200)
          return "reconnecting"
        }
        return "online"
      })
    }

    syncConnectionState()
    window.addEventListener("online", syncConnectionState)
    window.addEventListener("offline", syncConnectionState)

    return () => {
      window.removeEventListener("online", syncConnectionState)
      window.removeEventListener("offline", syncConnectionState)
      if (reconnectTimerRef.current) {
        window.clearTimeout(reconnectTimerRef.current)
      }
      if (streamFlushTimerRef.current) {
        window.clearTimeout(streamFlushTimerRef.current)
      }
    }
  }, [])

  useLayoutEffect(() => {
    const container = scrollContainerRef.current
    const metrics = prependScrollMetricsRef.current

    if (container && metrics) {
      const scrollDelta = container.scrollHeight - metrics.previousScrollHeight
      container.scrollTop = metrics.previousScrollTop + scrollDelta
      prependScrollMetricsRef.current = null
      return
    }

    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages, isTyping, sendError, connectionState, showSupportOptions])

  useEffect(() => {
    const element = textareaRef.current
    if (!element) return
    element.style.height = "auto"
    const clamped = Math.min(element.scrollHeight, TEXTAREA_MAX_HEIGHT)
    element.style.height = `${clamped}px`
  }, [input])

  useEffect(() => {
    return () => {
      if (previewAttachment) {
        URL.revokeObjectURL(previewAttachment.url)
      }
    }
  }, [previewAttachment])

  const allocateMessageId = () => {
    const id = nextMessageId.current
    nextMessageId.current += 1
    return id
  }

  const createClientMessageId = () =>
    `msg_client_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`

  const clearStreamFlushTimer = () => {
    if (streamFlushTimerRef.current) {
      window.clearTimeout(streamFlushTimerRef.current)
      streamFlushTimerRef.current = null
    }
  }

  const appendAssistantChunk = (messageId: number, chunk: string) => {
    if (!chunk) {
      return
    }

    setMessages((prev) =>
      prev.map((message) =>
        message.id === messageId
          ? {
              ...message,
              content:
                message.content === STREAMING_PLACEHOLDER
                  ? chunk
                  : `${message.content}${chunk}`,
            }
          : message,
      ),
    )
  }

  const scheduleStreamFlush = (delayMs = STREAMING_BATCH_DELAY_MS) => {
    if (streamFlushTimerRef.current) {
      return
    }

    streamFlushTimerRef.current = window.setTimeout(() => {
      streamFlushTimerRef.current = null

      const messageId = streamTargetMessageIdRef.current
      if (messageId === null) {
        return
      }

      const buffered = streamBufferRef.current
      if (!buffered) {
        return
      }

      let chunk = buffered
      if (buffered.length > STREAMING_BATCH_SIZE) {
        const punctuationIndex = buffered
          .slice(0, STREAMING_BATCH_SIZE + 1)
          .search(/[，。！？；：\n]/)

        chunk =
          punctuationIndex >= 0
            ? buffered.slice(0, punctuationIndex + 1)
            : buffered.slice(0, STREAMING_BATCH_SIZE)
      }

      streamBufferRef.current = buffered.slice(chunk.length)
      appendAssistantChunk(messageId, chunk)

      if (streamBufferRef.current) {
        scheduleStreamFlush()
      }
    }, delayMs)
  }

  const enqueueStreamDelta = (messageId: number, delta: string) => {
    if (!delta) {
      return
    }

    streamTargetMessageIdRef.current = messageId

    if (!streamHasVisibleContentRef.current) {
      streamHasVisibleContentRef.current = true
      appendAssistantChunk(messageId, delta)
      return
    }

    streamBufferRef.current += delta

    if (
      streamBufferRef.current.length >= STREAMING_BATCH_SIZE ||
      /[，。！？；：\n]/.test(streamBufferRef.current)
    ) {
      scheduleStreamFlush(30)
      return
    }

    scheduleStreamFlush()
  }

  const flushRemainingStreamDelta = () => {
    clearStreamFlushTimer()

    const messageId = streamTargetMessageIdRef.current
    const buffered = streamBufferRef.current

    if (messageId !== null && buffered) {
      streamBufferRef.current = ""
      appendAssistantChunk(messageId, buffered)
    }
  }

  const resetStreamState = () => {
    clearStreamFlushTimer()
    streamBufferRef.current = ""
    streamTargetMessageIdRef.current = null
    streamHasVisibleContentRef.current = false
    setPendingAssistantMessageId(null)
  }

  const resetAgent = () => {
    setInput("")
    setPreviewAttachment(null)
    setSendError(null)
    setFailedDraft(null)
    if (textareaRef.current) textareaRef.current.style.height = "auto"
  }

  const appendTaskFeedbackMessage = (data: CompleteTaskResponseData) => {
    const lines = [data.completionSummary]

    if (data.scoreDelta > 0) {
      lines.push("", `本次获得 +${data.scoreDelta} XP，当前累计 ${data.currentScore} XP。`)
    }

    if (data.rankChanged) {
      lines.push(`当前段位已提升为 ${data.currentRank}。`)
    }

    if (data.nextTask) {
      lines.push("", `下一关：${data.nextTask.title}`)
    }

    const message: Message = {
      id: allocateMessageId(),
      role: "ai",
      kind: "task_feedback",
      title: "任务反馈",
      content: lines.join("\n"),
      structuredContent: buildStructuredLearningMessageContent({
        title: "任务反馈",
        kind: "task_feedback",
        interactionType: "completion_feedback",
        content: lines.join("\n"),
        taskPatch: {
          taskId: learningData.task.taskId,
          status: "completed",
          suggestedNextAction: data.nextTask
            ? `进入下一关：${data.nextTask.title}`
            : "回到地图查看本轮学习计划状态",
        },
      }),
      xp: data.scoreDelta > 0 ? data.scoreDelta : undefined,
      nextStep: data.nextTask
        ? `进入下一关：${data.nextTask.title}`
        : "本轮学习计划已完成",
    }

    setMessages((prev) => [...prev, message])
  }

  const syncTaskStatus = async (
    status: "in_progress" | "blocked",
    reason?: string | null,
  ) => {
    const data = await requestData<UpdateTaskStatusResponseData>(
      "/task/update-status",
      {
        method: "POST",
        body: JSON.stringify({
          taskId: learningData.task.taskId,
          status,
          reason,
        }),
      },
    )

    setTaskState(data.taskStatus)
    return data
  }

  const completeCurrentTask = async (userContent?: string) => {
    if (connectionState !== "online") {
      setSendError("当前网络连接不稳定，完成结果尚未提交。恢复后请重试。")
      return
    }

    const userMessage: Message = {
      id: allocateMessageId(),
      role: "user",
      kind: "user_input",
      title: "我的反馈",
      content: userContent?.trim() || "我完成了",
    }

    setMessages((prev) => [...prev, userMessage])
    setShowSupportOptions(false)
    setIsTyping(true)
    setSendError(null)

    try {
      const data = await requestData<CompleteTaskResponseData>("/task/complete", {
        method: "POST",
        body: JSON.stringify({
          taskId: learningData.task.taskId,
          conversationId,
        }),
      })

      setTaskState("completed")
      appendTaskFeedbackMessage(data)
      setFailedDraft(null)
      setInput("")
      setPreviewAttachment(null)
      requestSessionRefresh()
    } catch (error) {
      setSendError(
        error instanceof Error ? error.message : "任务完成失败，请稍后重试。",
      )
    } finally {
      setIsTyping(false)
    }
  }

  const dispatchDraft = async (
    draft: PendingDraft,
    options?: {
      preserveBlockedStatus?: boolean
    },
  ) => {
    if (connectionState !== "online") {
      setFailedDraft(draft)
      setSendError("当前网络连接不稳定，消息尚未发出。恢复后可直接重试。")
      return
    }

    const userMessage: Message = {
      id: allocateMessageId(),
      role: "user",
      kind: "user_input",
      title: "我的反馈",
      content: draft.text || "我上传了一张截图，请帮我定位问题。",
      attachment: draft.attachment ?? undefined,
    }

    trackEvent(APP_EVENTS.learningInputSend, {
      hasAttachment: Boolean(draft.attachment),
      contentLength: draft.text.length,
      taskId: learningData.task.taskId,
    })

    setMessages((prev) => [...prev, userMessage])
    resetAgent()
    setShowSupportOptions(false)
    setIsTyping(true)

    const assistantMessageId = allocateMessageId()
    setPendingAssistantMessageId(assistantMessageId)
    streamTargetMessageIdRef.current = assistantMessageId
    streamBufferRef.current = ""
    streamHasVisibleContentRef.current = false

    try {
      if (taskState === "blocked" && !options?.preserveBlockedStatus) {
        await syncTaskStatus("in_progress")
      }

      const clientMessageId = createClientMessageId()
      let assistantInserted = false

      const ensureAssistantMessage = (
        title = "AI 教练引导",
        initialContent = STREAMING_PLACEHOLDER,
      ) => {
        if (assistantInserted) {
          return
        }

        assistantInserted = true
        setMessages((prev) => [
          ...prev,
          {
            id: assistantMessageId,
            role: "ai",
            kind: "coach",
            title,
            content: initialContent,
          },
        ])
      }

      ensureAssistantMessage()

      const response = await apiFetch("/learning/message", {
        method: "POST",
        headers: {
          Accept: "text/event-stream",
        },
        body: JSON.stringify({
          conversationId,
          taskId: learningData.task.taskId,
          clientMessageId,
          inputType: "text",
          content: draft.text || "我上传了一张截图，请帮我定位问题。",
          stream: true,
          clientContext: {
            pagePath: ROUTES.learn,
          },
        }),
      })

      const contentType = response.headers.get("content-type") ?? ""

      if (contentType.includes("text/event-stream")) {
        await consumeSSE(response, (event, payload) => {
          if (event === "session_started") {
            setConversationId(
              typeof payload.conversationId === "string"
                ? payload.conversationId
                : null,
            )
            return
          }

          if (event === "assistant_delta") {
            const delta = typeof payload.delta === "string" ? payload.delta : ""

            if (!delta) {
              return
            }

            enqueueStreamDelta(assistantMessageId, delta)
            return
          }

          if (event === "task_patch") {
            const taskPatch = parseTaskPatchPayload(payload)
            if (!taskPatch) {
              return
            }

            setTaskState((prev) => resolveTaskStateFromPatch(taskPatch, prev))
            setMessages((prev) =>
              prev.map((message) =>
                message.id === assistantMessageId
                  ? {
                      ...message,
                      taskPatch,
                    }
                  : message,
              ),
            )
            return
          }

          if (event === "assistant_done") {
            flushRemainingStreamDelta()
            const structuredContent = parseStructuredContentPayload(payload)
            const title =
              typeof payload.title === "string" ? payload.title : "AI 教练引导"
            const kind =
              payload.kind === "task_feedback" ? "task_feedback" : "coach"

            setMessages((prev) =>
              prev.map((message) =>
                message.id === assistantMessageId
                  ? {
                      ...message,
                      title,
                      kind,
                      structuredContent,
                    }
                  : message,
              ),
            )
            return
          }

          if (event === "error") {
            throw new Error(
              typeof payload.message === "string"
                ? payload.message
                : "流式消息发送失败，请稍后重试。",
            )
          }
        })
      } else {
        const apiResponse = (await response.json()) as {
          code: string
          message: string
          data: LearningMessageResponseData | null
        }

        if (apiResponse.code !== "OK" || !apiResponse.data) {
          throw new Error(apiResponse.message || "消息发送失败，请稍后重试。")
        }

        const responseData = apiResponse.data
        resetStreamState()
        setConversationId(responseData.conversationId)
        setTaskState(
          resolveTaskStateFromPatch(
            responseData.taskPatch,
            responseData.taskState,
          ),
        )
        setMessages((prev) =>
          prev.map((message) =>
            message.id === assistantMessageId
              ? {
                  ...message,
                  ...responseData.message,
                  id: assistantMessageId,
                }
              : message,
          ),
        )
      }

      setFailedDraft(null)
      setSendError(null)
    } catch (error) {
      resetStreamState()
      setMessages((prev) =>
        prev.filter((message) => message.id !== assistantMessageId),
      )
      setFailedDraft(draft)
      setSendError(
        error instanceof Error ? error.message : "消息发送失败，请稍后重试。",
      )
    } finally {
      flushRemainingStreamDelta()
      resetStreamState()
      setIsTyping(false)
    }
  }

  const handleSend = async () => {
    const draft = {
      text: input.trim(),
      attachment: previewAttachment,
    }

    if ((!draft.text && !draft.attachment) || isTyping) return

    if (!draft.attachment && isExplicitTaskCompletionInput(draft.text)) {
      await completeCurrentTask(draft.text)
      return
    }

    if (
      planSummary.selectionMode === "self_directed" &&
      draft.text &&
      !draft.attachment
    ) {
      const links = extractHttpLinks(draft.text)
      if (links.length > 0) {
        setLinkChoiceLinks(links)
        setLinkChoiceOpen(true)
        return
      }
    }

    await dispatchDraft(draft)
  }

  const handleQuickAction = (action: QuickAction) => {
    if (isTyping) return

    if (action.label === "我卡住了") {
      trackEvent(APP_EVENTS.learningQuickHelp, {
        action: action.label,
        category: action.category,
        taskId: learningData.task.taskId,
      })
      setShowSupportOptions((prev) => !prev)
      return
    }

    if (action.label === "我完成了") {
      trackEvent(APP_EVENTS.taskCompleted, {
        source: "quick_action",
        taskId: learningData.task.taskId,
      })
      void completeCurrentTask()
      return
    }

    if (action.category === "help" || action.category === "hint") {
      trackEvent(APP_EVENTS.learningQuickHelp, {
        action: action.label,
        category: action.category,
        taskId: learningData.task.taskId,
      })

      void (async () => {
        try {
          await syncTaskStatus("blocked", action.label)
          await dispatchDraft(
            { text: action.label, attachment: null },
            { preserveBlockedStatus: true },
          )
        } catch (error) {
          setSendError(
            error instanceof Error
              ? error.message
              : "更新任务状态失败，请稍后重试。",
          )
        }
      })()
      return
    }

    void dispatchDraft({ text: action.label, attachment: null })
  }

  const handleSupportOption = (option: LearningSupportOption) => {
    if (isTyping) return

    trackEvent(APP_EVENTS.stuckHelpRequested, {
      helpMode: option.mode,
      taskId: learningData.task.taskId,
    })

    void (async () => {
      try {
        await syncTaskStatus("blocked", option.label)
        await dispatchDraft(
          { text: option.prompt, attachment: null },
          { preserveBlockedStatus: true },
        )
      } catch (error) {
        setSendError(
          error instanceof Error
            ? error.message
            : "更新任务状态失败，请稍后重试。",
        )
      }
    })()
  }

  const handleAssistantActionPrefill = (inputAction: {
    label: string
    prompt: string
  }) => {
    if (isTyping) return

    const composerDraft = buildComposerDraftFromAssistantAction(inputAction)
    setInput((prev) => mergeAssistantActionIntoInput(prev, composerDraft))
    window.requestAnimationFrame(() => {
      const textarea = textareaRef.current
      if (!textarea) {
        return
      }

      textarea.focus()
      const nextValue = textarea.value
      textarea.setSelectionRange(nextValue.length, nextValue.length)
    })
  }

  const handleAdvanceToNextTask = async (prompt: string) => {
    if (isTyping) return

    if (taskState !== "completed") {
      await completeCurrentTask(prompt)
      return
    }

    requestSessionRefresh()
    scrollToConversationBottom("auto")
  }

  const handleAssistantAction = (
    message: Message,
    action: {
      label: string
      prompt: string
    },
  ) => {
    if (
      shouldCompleteCurrentTaskFromAssistantAction({
        messageKind: message.kind,
        taskPatchStatus: message.taskPatch?.status ?? null,
        actionLabel: action.label,
        nextStep: message.nextStep ?? null,
      })
    ) {
      void handleAdvanceToNextTask(action.prompt || action.label)
      return
    }

    handleAssistantActionPrefill(action)
  }

  const handleNextStepClick = (message: Message) => {
    if (isTyping) return
    void handleAdvanceToNextTask(
      message.nextStep ?? "我已经完成当前这一关，请进入下一关。",
    )
  }

  const handleRetry = () => {
    if (!failedDraft || connectionState !== "online") return
    setSendError(null)
    void dispatchDraft(failedDraft)
  }

  const handleResume = () => {
    trackEvent(APP_EVENTS.sessionResumed, {
      conversationId,
      taskId: learningData.task.taskId,
    })

    if (taskState === "blocked") {
      void syncTaskStatus("in_progress").catch((error) => {
        setSendError(
          error instanceof Error
            ? error.message
            : "恢复任务状态失败，请稍后重试。",
        )
      })
    }

    textareaRef.current?.focus()
    scrollToConversationBottom()
  }

  const handleLoadEarlierMessages = async () => {
    if (
      !conversationId ||
      !historyPagination.hasMore ||
      historyPagination.nextBeforeSequenceNo === null ||
      isLoadingHistory
    ) {
      return
    }

    setIsLoadingHistory(true)
    setHistoryError(null)

    try {
      const query = new URLSearchParams({
        conversationId,
        beforeSequenceNo: String(historyPagination.nextBeforeSequenceNo),
        limit: "20",
      })

      const data = await requestData<LearningMessagesResponseData>(
        `/learning/messages?${query.toString()}`,
      )

      const container = scrollContainerRef.current
      prependScrollMetricsRef.current = container
        ? {
            previousScrollHeight: container.scrollHeight,
            previousScrollTop: container.scrollTop,
          }
        : null

      setMessages((prev) => {
        const existingIds = new Set(prev.map((message) => message.id))
        const incoming = data.messages.filter(
          (message) => !existingIds.has(message.id),
        )
        return [...incoming, ...prev]
      })
      setHistoryPagination(data.pagination)
    } catch (error) {
      setHistoryError(
        error instanceof Error
          ? error.message
          : "加载更早消息失败，请稍后重试。",
      )
    } finally {
      setIsLoadingHistory(false)
    }
  }

  const removePreview = () => {
    if (!previewAttachment) return
    URL.revokeObjectURL(previewAttachment.url)
    setPreviewAttachment(null)
  }

  const handleSelectAttachment = (file: File) => {
    if (previewAttachment) {
      URL.revokeObjectURL(previewAttachment.url)
    }

    setPreviewAttachment(createAttachmentFromFile(file))
  }

  const confirmRestartConversation = async () => {
    if (connectionState !== "online") {
      setSendError("当前网络连接不稳定，请恢复后再试。")
      return
    }

    setRestartSubmitting(true)
    setSendError(null)

    try {
      const data = await requestData<LearningRestartConversationResponseData>(
        "/learning/restart-conversation",
        {
          method: "POST",
          body: JSON.stringify({}),
        },
      )

      resetStreamState()
      resetAgent()
      setRestartDialogOpen(false)

      if (!data.restarted && data.message) {
        setSendError(data.message)
      }

      onRequestRefresh()
    } catch (error) {
      setSendError(
        error instanceof Error ? error.message : "重头开始失败，请稍后重试。",
      )
    } finally {
      setRestartSubmitting(false)
    }
  }

  const handleContinueChatFromLinkChoice = async () => {
    setLinkChoiceOpen(false)
    await dispatchDraft({ text: input.trim(), attachment: null })
  }

  const handleGeneratePlanFromLinkChoice = () => {
    setLinkChoiceOpen(false)
    onOpenMaterialPlanDialog?.(linkChoiceLinks)
  }

  return (
    <div className="contents">
      <LearnChatRestartDialog
        open={restartDialogOpen}
        onOpenChange={setRestartDialogOpen}
        restartSubmitting={restartSubmitting}
        onConfirm={() => {
          void confirmRestartConversation()
        }}
      />

      <LearnChatLinkChoiceDialog
        open={linkChoiceOpen}
        onOpenChange={setLinkChoiceOpen}
        links={linkChoiceLinks}
        onGeneratePlan={handleGeneratePlanFromLinkChoice}
        onContinueChat={handleContinueChatFromLinkChoice}
      />

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <LearnChatHeader
          mission={mission}
          planSummary={planSummary}
          connectionState={connectionState}
          restartSubmitting={restartSubmitting}
          onRestart={() => setRestartDialogOpen(true)}
        />

        <LearnChatMessageList
          scrollContainerRef={scrollContainerRef}
          bottomRef={bottomRef}
          conversationId={conversationId}
          historyPagination={historyPagination}
          isLoadingHistory={isLoadingHistory}
          historyError={historyError}
          onLoadEarlierMessages={handleLoadEarlierMessages}
          showResumeCard={showResumeCard}
          resume={resume}
          onDismissResume={() => setResumeCardDismissed(true)}
          onResume={handleResume}
          mission={mission}
          rightPanel={rightPanel}
          connectionState={connectionState}
          messages={messages}
          isTyping={isTyping}
          pendingAssistantMessageId={pendingAssistantMessageId}
          onAssistantAction={handleAssistantAction}
          onNextStepClick={handleNextStepClick}
        />

        <LearnChatComposer
          sendError={sendError}
          onRetry={handleRetry}
          connectionState={connectionState}
          quickActions={learningData.quickActions}
          canTriggerCompleteQuickAction={canTriggerCompleteQuickAction}
          onQuickAction={handleQuickAction}
          selectionMode={learningData.planSummary.selectionMode}
          hasMaterialPlan={learningData.planSummary.hasMaterialPlan}
          onOpenMaterialPlanDialog={onOpenMaterialPlanDialog}
          isTyping={isTyping}
          showSupportOptions={showSupportOptions}
          supportOptions={supportOptions}
          onCloseSupportOptions={() => setShowSupportOptions(false)}
          onSupportOption={handleSupportOption}
          previewAttachment={previewAttachment}
          onRemovePreview={removePreview}
          onSelectAttachment={handleSelectAttachment}
          fileInputRef={fileInputRef}
          textareaRef={textareaRef}
          input={input}
          onInputChange={setInput}
          onSend={() => {
            void handleSend()
          }}
        />
      </div>
    </div>
  )
}
