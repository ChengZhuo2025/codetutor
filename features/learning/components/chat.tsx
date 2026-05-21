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
  isAdvanceNextTaskIntent,
  isExplicitTaskCompletionInput,
  mergeAssistantActionIntoInput,
  resolveAssistantActionIntent,
  shouldAutoAdvanceFromAdvanceIntent,
  shouldRenderLearningResumeCard,
  type StableAssistantAction,
} from "@/features/learning/lib/chat-behavior"
import type {
  LearningCurrentSessionResponseData,
  LearningAttachmentCreateResponseData,
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
import { splitSpeechTextIntoSegments } from "@/lib/learning/speech-text"
import { useAppEventTracker } from "@/providers/app-providers"
import { useWorkspaceSidebarData } from "@/providers/workspace-sidebar-provider"
import { useAppToast } from "@/components/app-feedback/app-toast-provider"

type PendingDraft = {
  text: string
  attachment: DraftAttachment | null
}

type UploadedDraftAttachment = {
  attachmentIds: string[]
  attachment: MessageAttachment | null
}

type PendingRetry =
  | {
      kind: "message"
      draft: PendingDraft
      clientMessageId: string
      uploadedAttachment?: UploadedDraftAttachment
      appendUserMessage: boolean
    }
  | {
      kind: "complete_task"
      userContent?: string
      appendUserMessage: boolean
    }

type SpeechStatus = "idle" | "loading" | "playing" | "paused"

type SSEEventHandler = (event: string, data: Record<string, unknown>) => void

type DraftAttachment = MessageAttachment & {
  file: File
  localUrl: string
}

function createImageAttachmentFromFile(file: File): DraftAttachment {
  const localUrl = URL.createObjectURL(file)

  return {
    type: "image",
    url: localUrl,
    localUrl,
    name: file.name,
    mimeType: file.type,
    sizeBytes: file.size,
    file,
  }
}

function createAudioAttachmentFromFile(file: File, durationMs: number | null): DraftAttachment {
  const localUrl = URL.createObjectURL(file)

  return {
    type: "audio",
    url: localUrl,
    localUrl,
    name: file.name,
    mimeType: file.type,
    sizeBytes: file.size,
    durationMs,
    file,
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
  const { refresh: refreshWorkspaceSidebar } = useWorkspaceSidebarData()
  const toast = useAppToast()
  const [messages, setMessages] = useState<Message[]>(learningData.messages)
  const [conversationId, setConversationId] = useState<string | null>(
    learningData.conversationId,
  )
  const [input, setInput] = useState("")
  const [isTyping, setIsTyping] = useState(false)
  const [previewAttachment, setPreviewAttachment] =
    useState<DraftAttachment | null>(null)
  const [sendError, setSendError] = useState<string | null>(null)
  const [pendingRetry, setPendingRetry] = useState<PendingRetry | null>(null)
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
  const [activeSpeechMessageId, setActiveSpeechMessageId] = useState<number | null>(null)
  const [speechStatus, setSpeechStatus] = useState<SpeechStatus>("idle")

  const bottomRef = useRef<HTMLDivElement>(null)
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const nextMessageId = useRef(learningData.messages.length + 1)
  const reconnectTimerRef = useRef<number | null>(null)
  const streamBufferRef = useRef("")
  const streamFlushFrameRef = useRef<number | null>(null)
  const streamTargetMessageIdRef = useRef<number | null>(null)
  const streamHasVisibleContentRef = useRef(false)
  const prependScrollMetricsRef = useRef<{
    previousScrollHeight: number
    previousScrollTop: number
  } | null>(null)
  const speechAudioRef = useRef<HTMLAudioElement | null>(null)
  const speechObjectUrlsRef = useRef<string[]>([])
  const speechRequestTokenRef = useRef(0)
  const messageAttachmentObjectUrlsRef = useRef<string[]>([])

  const { mission, planSummary, resume, rightPanel, supportOptions } =
    learningData
  const isFinalTask = mission?.nextPreviewIsFinal ?? false
  const nextTaskTitle = isFinalTask ? null : mission?.nextUnlockTitle ?? null
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
    void refreshWorkspaceSidebar()
    window.setTimeout(() => onRequestRefresh(), 180)
    window.setTimeout(() => {
      void refreshWorkspaceSidebar()
    }, 180)
  }

  useEffect(() => {
    for (const objectUrl of messageAttachmentObjectUrlsRef.current) {
      URL.revokeObjectURL(objectUrl)
    }
    messageAttachmentObjectUrlsRef.current = []
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
      if (streamFlushFrameRef.current !== null) {
        window.cancelAnimationFrame(streamFlushFrameRef.current)
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
        URL.revokeObjectURL(previewAttachment.localUrl)
      }
    }
  }, [previewAttachment])

  useEffect(() => {
    return () => {
      speechRequestTokenRef.current += 1
      if (speechAudioRef.current) {
        speechAudioRef.current.pause()
        speechAudioRef.current = null
      }
      for (const objectUrl of speechObjectUrlsRef.current) {
        URL.revokeObjectURL(objectUrl)
      }
      speechObjectUrlsRef.current = []
      for (const objectUrl of messageAttachmentObjectUrlsRef.current) {
        URL.revokeObjectURL(objectUrl)
      }
      messageAttachmentObjectUrlsRef.current = []
    }
  }, [])

  const allocateMessageId = () => {
    const id = nextMessageId.current
    nextMessageId.current += 1
    return id
  }

  const resetSpeechPlayback = () => {
    speechRequestTokenRef.current += 1
    if (speechAudioRef.current) {
      speechAudioRef.current.pause()
      speechAudioRef.current = null
    }
    for (const objectUrl of speechObjectUrlsRef.current) {
      URL.revokeObjectURL(objectUrl)
    }
    speechObjectUrlsRef.current = []
    setActiveSpeechMessageId(null)
    setSpeechStatus("idle")
  }

  const requestSpeechBlob = async (message: Message, text: string) => {
    const response = await apiFetch("/learning/message-speech", {
      method: "POST",
      body: JSON.stringify({
        messageId: message.speechMessageId,
        text,
      }),
    })

    if (!response.ok) {
      let errorMessage = "生成语音播读失败，请稍后再试。"
      try {
        const payload = (await response.json()) as { message?: string }
        errorMessage = payload.message ?? errorMessage
      } catch {
        // ignore non-json error body
      }
      throw new Error(errorMessage)
    }

    return response.blob()
  }

  const playSpeechBlob = async (blob: Blob, requestToken: number) => {
    if (speechRequestTokenRef.current !== requestToken) {
      return
    }

    const objectUrl = URL.createObjectURL(blob)
    speechObjectUrlsRef.current.push(objectUrl)
    const audio = new Audio(objectUrl)
    speechAudioRef.current = audio

    await new Promise<void>((resolve, reject) => {
      audio.addEventListener("ended", () => resolve(), { once: true })
      audio.addEventListener("error", () => reject(new Error("浏览器暂时无法播放这段语音。")), { once: true })
      audio.play()
        .then(() => {
          if (speechRequestTokenRef.current === requestToken) {
            setSpeechStatus("playing")
          }
        })
        .catch(reject)
    })
  }

  const playSpeechSegments = async (
    message: Message,
    segments: string[],
    requestToken: number,
  ) => {
    let nextBlobPromise: Promise<Blob> | null = requestSpeechBlob(message, segments[0])

    for (let index = 0; index < segments.length; index += 1) {
      if (speechRequestTokenRef.current !== requestToken || !nextBlobPromise) {
        return
      }

      const currentBlob = await nextBlobPromise
      nextBlobPromise = index + 1 < segments.length
        ? requestSpeechBlob(message, segments[index + 1])
        : null

      await playSpeechBlob(currentBlob, requestToken)
    }

    if (speechRequestTokenRef.current === requestToken) {
      resetSpeechPlayback()
    }
  }

  const handleToggleSpeech = async (message: Message) => {
    if (message.role !== "ai" || !message.content.trim()) {
      return
    }

    if (!message.speechMessageId) {
      toast.error("语音播读不可用", "这条 AI 回复还没有可播读的消息 ID，请刷新后再试。")
      return
    }

    if (activeSpeechMessageId === message.id && speechAudioRef.current) {
      if (speechStatus === "playing") {
        speechAudioRef.current.pause()
        setSpeechStatus("paused")
        return
      }

      if (speechStatus === "paused") {
        try {
          await speechAudioRef.current.play()
          setSpeechStatus("playing")
        } catch {
          toast.error("播放失败", "浏览器暂时无法播放这段语音。")
        }
        return
      }
    }

    resetSpeechPlayback()
    const speechSegments = splitSpeechTextIntoSegments(message.content)
    if (speechSegments.length === 0) {
      toast.error("语音播读不可用", "这条 AI 回复没有可播读的正文内容。")
      return
    }

    const requestToken = speechRequestTokenRef.current + 1
    speechRequestTokenRef.current = requestToken
    setActiveSpeechMessageId(message.id)
    setSpeechStatus("loading")

    try {
      await playSpeechSegments(message, speechSegments, requestToken)
    } catch (error) {
      if (speechRequestTokenRef.current === requestToken) {
        resetSpeechPlayback()
        toast.error("语音播读不可用", error instanceof Error ? error.message : "请稍后再试。")
      }
    }
  }

  const createClientMessageId = () =>
    `msg_client_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`

  const createMessageAttachmentObjectUrl = (attachment: DraftAttachment) => {
    const objectUrl = URL.createObjectURL(attachment.file)
    messageAttachmentObjectUrlsRef.current.push(objectUrl)
    return objectUrl
  }

  const uploadDraftAttachment = async (
    attachment: DraftAttachment | null,
  ): Promise<UploadedDraftAttachment> => {
    if (!attachment) {
      return {
        attachmentIds: [],
        attachment: null,
      }
    }

    const formData = new FormData()
    formData.set("file", attachment.file)
    formData.set("kind", attachment.type)
    if (conversationId) {
      formData.set("sessionId", conversationId)
    }
    if (typeof attachment.durationMs === "number") {
      formData.set("durationMs", String(Math.round(attachment.durationMs)))
    }

    const response = await apiFetch("/learning/attachments", {
      method: "POST",
      body: formData,
    })
    const apiResponse = (await response.json()) as {
      code: string
      message: string
      data: LearningAttachmentCreateResponseData | null
    }

    if (apiResponse.code !== "OK" || !apiResponse.data) {
      throw new Error(apiResponse.message || "附件上传失败，请稍后重试。")
    }

    const uploaded = apiResponse.data.attachment
    const messageAttachment: MessageAttachment = {
      id: uploaded.id,
      type: uploaded.kind,
      url: createMessageAttachmentObjectUrl(attachment),
      name: uploaded.originalFilename ?? attachment.name,
      mimeType: uploaded.mimeType,
      sizeBytes: uploaded.sizeBytes,
      durationMs: uploaded.durationMs,
      processingStatus: uploaded.processingStatus,
      extractedText: uploaded.extractedText,
      visualSummary: uploaded.visualSummary,
      transcriptText: uploaded.transcriptText,
      errorMessage: uploaded.errorMessage,
    }

    return {
      attachmentIds: [uploaded.id],
      attachment: messageAttachment,
    }
  }

  const clearStreamFlushTimer = () => {
    if (streamFlushFrameRef.current !== null) {
      window.cancelAnimationFrame(streamFlushFrameRef.current)
      streamFlushFrameRef.current = null
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

  const scheduleStreamFlush = () => {
    if (streamFlushFrameRef.current !== null) {
      return
    }

    streamFlushFrameRef.current = window.requestAnimationFrame(() => {
      streamFlushFrameRef.current = null

      const messageId = streamTargetMessageIdRef.current
      if (messageId === null) {
        return
      }

      const buffered = streamBufferRef.current
      if (!buffered) {
        return
      }

      streamBufferRef.current = ""
      appendAssistantChunk(messageId, buffered)
    })
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
    setPendingRetry(null)
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
      lines.push("", `下一步：${data.nextTask.title}`)
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
            ? `进入下一步：${data.nextTask.title}`
            : "回到地图查看本轮学习计划状态",
        },
      }),
      xp: data.scoreDelta > 0 ? data.scoreDelta : undefined,
      nextStep: data.nextTask
        ? `进入下一步：${data.nextTask.title}`
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

  const completeCurrentTask = async (
    userContent?: string,
    options?: {
      appendUserMessage?: boolean
    },
  ) => {
    if (connectionState !== "online") {
      setPendingRetry({
        kind: "complete_task",
        userContent,
        appendUserMessage: options?.appendUserMessage ?? true,
      })
      setSendError("当前网络连接不稳定，完成结果尚未提交。恢复后请重试。")
      return
    }

    const shouldAppendUserMessage = options?.appendUserMessage ?? true
    if (shouldAppendUserMessage) {
      const userMessage: Message = {
        id: allocateMessageId(),
        role: "user",
        kind: "user_input",
        title: "我的反馈",
        content: userContent?.trim() || "我完成了",
      }

      setMessages((prev) => [...prev, userMessage])
    }

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
      setPendingRetry(null)
      setInput("")
      setPreviewAttachment(null)
      requestSessionRefresh()
    } catch (error) {
      setPendingRetry({
        kind: "complete_task",
        userContent,
        appendUserMessage: false,
      })
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
      clientMessageId?: string
      uploadedAttachment?: UploadedDraftAttachment
      appendUserMessage?: boolean
    },
  ) => {
    const clientMessageId = options?.clientMessageId ?? createClientMessageId()
    let uploadedAttachment = options?.uploadedAttachment
    let appendUserMessage = options?.appendUserMessage ?? true

    if (connectionState !== "online") {
      setPendingRetry({
        kind: "message",
        draft,
        clientMessageId,
        uploadedAttachment,
        appendUserMessage,
      })
      setSendError("当前网络连接不稳定，消息尚未发出。恢复后可直接重试。")
      return
    }

    trackEvent(APP_EVENTS.learningInputSend, {
      hasAttachment: Boolean(draft.attachment),
      contentLength: draft.text.length,
      taskId: learningData.task.taskId,
    })

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

      uploadedAttachment ??= await uploadDraftAttachment(draft.attachment)
      const userVisibleContent =
        draft.text ||
        (draft.attachment?.type === "audio"
          ? "我发送了一条语音消息，请帮我解答。"
          : "我上传了一张截图，请帮我定位问题。")

      if (appendUserMessage) {
        const userMessage: Message = {
          id: allocateMessageId(),
          role: "user",
          kind: "user_input",
          title: "我的反馈",
          content: userVisibleContent,
          attachment: uploadedAttachment.attachment ?? undefined,
          attachments: uploadedAttachment.attachment ? [uploadedAttachment.attachment] : [],
        }

        setMessages((prev) => [...prev, userMessage])
        appendUserMessage = false
      }

      resetAgent()

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
          content: userVisibleContent,
          attachmentIds: uploadedAttachment.attachmentIds,
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
            const speechMessageId =
              typeof payload.messageId === "string" ? payload.messageId : undefined
            const finalContent =
              typeof payload.content === "string" && payload.content.trim().length > 0
                ? payload.content
                : null

            setMessages((prev) =>
              prev.map((message) =>
                message.id === assistantMessageId
                  ? {
                      ...message,
                      content: finalContent ?? message.content,
                      speechMessageId,
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

      setPendingRetry(null)
      setSendError(null)
    } catch (error) {
      resetStreamState()
      setMessages((prev) =>
        prev.filter((message) => message.id !== assistantMessageId),
      )
      setPendingRetry({
        kind: "message",
        draft,
        clientMessageId,
        uploadedAttachment,
        appendUserMessage,
      })
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
      !draft.attachment &&
      draft.text &&
      isAdvanceNextTaskIntent(draft.text) &&
      shouldAutoAdvanceFromAdvanceIntent({
        taskState,
        messages: messages.map((message) => ({
          role: message.role,
          kind: message.kind,
          content: message.content,
          interactionType:
            message.role === "ai"
              ? resolveAssistantInteractionType(message)
              : null,
          taskPatchStatus: message.taskPatch?.status ?? null,
        })),
      })
    ) {
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
      handleAssistantActionPrefill({
        label: action.label,
        prompt: action.label,
      })
      return
    }

    handleAssistantActionPrefill({
      label: action.label,
      prompt: action.label,
    })
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
    action: StableAssistantAction,
  ) => {
    const intent = resolveAssistantActionIntent({
      actionKind: action.kind,
      messageKind: message.kind,
      taskPatchStatus: message.taskPatch?.status ?? null,
      actionLabel: action.label,
      nextStep: message.nextStep ?? null,
    })

    if (intent === "advance_next_task") {
      void handleAdvanceToNextTask(action.prompt || action.label)
      return
    }

    handleAssistantActionPrefill(action)
  }

  const handleNextStepClick = (message: Message) => {
    if (isTyping) return
    void handleAdvanceToNextTask(
      message.nextStep ?? "我已经完成当前任务，请进入下一步。",
    )
  }

  const retryPendingOperation = () => {
    if (!pendingRetry || connectionState !== "online") return

    const retry = pendingRetry
    setSendError(null)
    setPendingRetry(null)

    if (retry.kind === "complete_task") {
      void completeCurrentTask(retry.userContent, {
        appendUserMessage: retry.appendUserMessage,
      })
      return
    }

    void dispatchDraft(retry.draft, {
      clientMessageId: retry.clientMessageId,
      uploadedAttachment: retry.uploadedAttachment,
      appendUserMessage: retry.appendUserMessage,
    })
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
    URL.revokeObjectURL(previewAttachment.localUrl)
    setPreviewAttachment(null)
  }

  const handleSelectAttachment = (file: File) => {
    if (previewAttachment) {
      URL.revokeObjectURL(previewAttachment.localUrl)
    }

    setPreviewAttachment(createImageAttachmentFromFile(file))
  }

  const handleRecordAudio = (file: File, durationMs: number) => {
    if (previewAttachment) {
      URL.revokeObjectURL(previewAttachment.localUrl)
    }

    setPreviewAttachment(createAudioAttachmentFromFile(file, durationMs))
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
          onToggleSpeech={handleToggleSpeech}
          taskState={taskState}
          canTriggerCompleteQuickAction={canTriggerCompleteQuickAction}
          isFinalTask={isFinalTask}
          nextTaskTitle={nextTaskTitle}
          activeSpeechMessageId={activeSpeechMessageId}
          speechStatus={speechStatus}
        />

        <LearnChatComposer
          sendError={sendError}
          canRetry={Boolean(pendingRetry)}
          onRetry={retryPendingOperation}
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
          onRecordAudio={handleRecordAudio}
          onRecordingError={(message) => {
            toast.error("无法开始录音", message)
          }}
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
