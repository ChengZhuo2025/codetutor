"use client"

import Image from "next/image"
import { useCallback, useEffect, useRef, useState } from "react"
import type { ClipboardEvent, DragEvent, RefObject } from "react"
import { ImagePlus, Lightbulb, Mic, RefreshCw, Send, Square, WifiOff, X } from "lucide-react"
import { StatePanel } from "@/components/ui/state-panel"
import { Textarea } from "@/components/ui/textarea"
import {
  USER_BUTTON_PRIMARY_CLASS,
  USER_BUTTON_SECONDARY_CLASS,
} from "@/components/ui/surface-styles"
import type { ConnectionState } from "@/features/learning/components/learn-chat-types"
import type {
  LearningSupportOption,
  MessageAttachment,
  QuickAction,
} from "@/features/learning/types"
import { cn } from "@/lib/utils"

export const TEXTAREA_MAX_HEIGHT = 24 * 4 + 12
const MAX_AUDIO_RECORDING_MS = 60_000
const ACCEPTED_IMAGE_MIME_TYPES = new Set(["image/png", "image/jpeg", "image/webp"])

const QUICK_ACTION_TONE_CLASS: Record<QuickAction["tone"], string> = {
  primary: USER_BUTTON_PRIMARY_CLASS,
  warning: USER_BUTTON_SECONDARY_CLASS,
  secondary: USER_BUTTON_SECONDARY_CLASS,
}

function getInputHint(
  connectionState: ConnectionState,
  isTyping: boolean,
  previewAttachment: MessageAttachment | null,
  isRecording = false,
) {
  if (isRecording) {
    return "正在录音，点击停止按钮结束录制；最长 60 秒。"
  }

  if (connectionState === "offline") {
    return "你现在处于离线状态，消息会等待网络恢复后重试。"
  }

  if (connectionState === "reconnecting") {
    return "网络恢复中，稍后即可继续发送消息。"
  }

  if (isTyping) {
    return "AI 正在分析你的输入并生成回复..."
  }

  if (previewAttachment) {
    return previewAttachment.type === "audio"
      ? "语音已附上，发送后会先识别为文字再交给 AI 教练。"
      : "截图已附上，适合直接让 AI 帮你定位具体报错。"
  }

  return "把教程、代码、链接或你卡住的地方直接发给我。Enter 发送，Shift+Enter 换行。"
}

function formatRecordingTime(ms: number) {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000))
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes}:${String(seconds).padStart(2, "0")}`
}

function isAcceptedImageFile(file: File) {
  return ACCEPTED_IMAGE_MIME_TYPES.has(file.type)
}

function findImageFile(files: FileList | File[]) {
  return Array.from(files).find(isAcceptedImageFile) ?? null
}

function findImageFileFromItems(items: DataTransferItemList) {
  for (const item of Array.from(items)) {
    if (item.kind !== "file" || !ACCEPTED_IMAGE_MIME_TYPES.has(item.type)) {
      continue
    }

    const file = item.getAsFile()
    if (file) {
      return file
    }
  }

  return null
}

type LearnChatComposerProps = {
  sendError: string | null
  canRetry: boolean
  onRetry: () => void
  connectionState: ConnectionState
  quickActions: QuickAction[]
  canTriggerCompleteQuickAction: boolean
  onQuickAction: (action: QuickAction) => void
  selectionMode: "self_directed" | "preset_training"
  hasMaterialPlan: boolean | undefined
  onOpenMaterialPlanDialog?: (links?: string[]) => void
  isTyping: boolean
  showSupportOptions: boolean
  supportOptions: LearningSupportOption[]
  onCloseSupportOptions: () => void
  onSupportOption: (option: LearningSupportOption) => void
  previewAttachment: MessageAttachment | null
  onRemovePreview: () => void
  onSelectAttachment: (file: File) => void
  onRecordAudio: (file: File, durationMs: number) => void
  onRecordingError: (message: string) => void
  fileInputRef: RefObject<HTMLInputElement | null>
  textareaRef: RefObject<HTMLTextAreaElement | null>
  input: string
  onInputChange: (value: string) => void
  onSend: () => void
}

export function LearnChatComposer({
  sendError,
  canRetry,
  onRetry,
  connectionState,
  quickActions,
  canTriggerCompleteQuickAction,
  onQuickAction,
  selectionMode,
  hasMaterialPlan,
  onOpenMaterialPlanDialog,
  isTyping,
  showSupportOptions,
  supportOptions,
  onCloseSupportOptions,
  onSupportOption,
  previewAttachment,
  onRemovePreview,
  onSelectAttachment,
  onRecordAudio,
  onRecordingError,
  fileInputRef,
  textareaRef,
  input,
  onInputChange,
  onSend,
}: LearnChatComposerProps) {
  const [isRecording, setIsRecording] = useState(false)
  const [recordingElapsedMs, setRecordingElapsedMs] = useState(0)
  const [isDraggingImage, setIsDraggingImage] = useState(false)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const recordingStreamRef = useRef<MediaStream | null>(null)
  const audioChunksRef = useRef<BlobPart[]>([])
  const recordingStartedAtRef = useRef<number>(0)
  const inputHint = getInputHint(connectionState, isTyping, previewAttachment, isRecording)
  const recordingProgress = Math.min(recordingElapsedMs / MAX_AUDIO_RECORDING_MS, 1)
  const recordingRemainingMs = Math.max(MAX_AUDIO_RECORDING_MS - recordingElapsedMs, 0)
  const recordingWaveBars = Array.from({ length: 9 }, (_, index) => {
    const phase = recordingElapsedMs / 145 + index * 0.72
    const secondaryPhase = recordingElapsedMs / 260 + index * 1.13
    return 8 + Math.round((Math.sin(phase) + Math.sin(secondaryPhase) + 2) * 4.5)
  })

  const stopRecording = useCallback(() => {
    mediaRecorderRef.current?.stop()
  }, [])

  const releaseRecordingStream = useCallback(() => {
    recordingStreamRef.current?.getTracks().forEach((track) => track.stop())
    recordingStreamRef.current = null
  }, [])

  useEffect(() => {
    if (!isRecording) {
      return undefined
    }

    const updateElapsed = () => {
      const elapsed = Date.now() - recordingStartedAtRef.current
      setRecordingElapsedMs(Math.min(elapsed, MAX_AUDIO_RECORDING_MS))

      if (elapsed >= MAX_AUDIO_RECORDING_MS) {
        stopRecording()
      }
    }

    updateElapsed()
    const timer = window.setInterval(updateElapsed, 250)

    return () => {
      window.clearInterval(timer)
    }
  }, [isRecording, stopRecording])

  useEffect(() => () => {
    mediaRecorderRef.current?.stop()
    releaseRecordingStream()
  }, [releaseRecordingStream])

  const startRecording = async () => {
    if (isTyping || connectionState !== "online" || previewAttachment) {
      return
    }

    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      onRecordingError("当前浏览器不支持网页录音，请改用文字或截图发送。")
      return
    }

    let stream: MediaStream
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    } catch (error) {
      const message =
        error instanceof DOMException && error.name === "NotAllowedError"
          ? "浏览器没有麦克风权限，请允许访问后再试。"
          : "无法访问麦克风，请检查设备是否可用后再试。"
      onRecordingError(message)
      return
    }

    let recorder: MediaRecorder
    try {
      recorder = new MediaRecorder(stream)
    } catch {
      stream.getTracks().forEach((track) => track.stop())
      onRecordingError("当前浏览器暂时无法创建录音，请改用文字输入。")
      return
    }

    recordingStreamRef.current = stream
    audioChunksRef.current = []
    recordingStartedAtRef.current = Date.now()
    setRecordingElapsedMs(0)
    mediaRecorderRef.current = recorder

    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        audioChunksRef.current.push(event.data)
      }
    }

    recorder.onstop = () => {
      const durationMs = Math.min(Date.now() - recordingStartedAtRef.current, MAX_AUDIO_RECORDING_MS)
      const mimeType = recorder.mimeType || "audio/webm"
      const blob = new Blob(audioChunksRef.current, { type: mimeType })
      const extension = mimeType.includes("ogg") ? "ogg" : mimeType.includes("mp4") ? "m4a" : "webm"
      const file = new File([blob], `learning-voice-${Date.now()}.${extension}`, { type: mimeType })

      releaseRecordingStream()
      mediaRecorderRef.current = null
      setIsRecording(false)
      setRecordingElapsedMs(0)

      if (file.size > 0) {
        onRecordAudio(file, durationMs)
      }
    }

    recorder.start()
    setIsRecording(true)
  }

  const handleRecordClick = () => {
    if (isRecording) {
      stopRecording()
      return
    }

    void startRecording()
  }

  const canSelectImage = !isTyping && !isRecording && !previewAttachment

  const handlePastedOrDroppedImage = useCallback(
    (file: File | null) => {
      if (!file || !canSelectImage) {
        return false
      }

      onSelectAttachment(file)
      return true
    },
    [canSelectImage, onSelectAttachment],
  )

  const handlePaste = useCallback(
    (event: ClipboardEvent<HTMLTextAreaElement>) => {
      const file =
        findImageFileFromItems(event.clipboardData.items) ??
        findImageFile(event.clipboardData.files)

      if (handlePastedOrDroppedImage(file)) {
        event.preventDefault()
      }
    },
    [handlePastedOrDroppedImage],
  )

  const handleDragOver = useCallback(
    (event: DragEvent<HTMLDivElement>) => {
      const hasImage = Boolean(
        findImageFileFromItems(event.dataTransfer.items) ??
          findImageFile(event.dataTransfer.files),
      )

      if (!hasImage || !canSelectImage) {
        event.dataTransfer.dropEffect = "none"
        return
      }

      event.preventDefault()
      event.dataTransfer.dropEffect = "copy"
      setIsDraggingImage(true)
    },
    [canSelectImage],
  )

  const handleDragLeave = useCallback((event: DragEvent<HTMLDivElement>) => {
    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
      setIsDraggingImage(false)
    }
  }, [])

  const handleDrop = useCallback(
    (event: DragEvent<HTMLDivElement>) => {
      const file =
        findImageFileFromItems(event.dataTransfer.items) ??
        findImageFile(event.dataTransfer.files)

      if (handlePastedOrDroppedImage(file)) {
        event.preventDefault()
      }

      setIsDraggingImage(false)
    },
    [handlePastedOrDroppedImage],
  )

  return (
    <div className="shrink-0 border-t border-border/50 bg-surface-1 px-4 pb-4 pt-3 sm:px-6">
      <div className="mx-auto max-w-3xl">
        {sendError ? (
          <StatePanel
            status="error"
            title="消息发送失败"
            description={sendError}
            actionLabel={canRetry ? "重试发送" : undefined}
            onAction={canRetry && connectionState === "online" ? onRetry : undefined}
            compact
            className="mb-3"
            extra={
              connectionState !== "online" ? (
                <div className="flex items-center gap-2 text-xs text-destructive">
                  <WifiOff className="h-3.5 w-3.5" />
                  当前仍处于离线状态
                </div>
              ) : null
            }
          />
        ) : null}

        <div className="mb-3">
          <div className="flex flex-wrap gap-2">
            {quickActions.map((action) => {
              const isCompletionAction = action.label === "我完成了"
              const disabled =
                isTyping ||
                connectionState !== "online" ||
                (isCompletionAction && !canTriggerCompleteQuickAction)

              return (
                <button
                  key={action.label}
                  type="button"
                  onClick={() => onQuickAction(action)}
                  disabled={disabled}
                  title={
                    isCompletionAction && !canTriggerCompleteQuickAction
                      ? "先提交一次结果、代码或问题，再标记当前关卡完成。"
                      : undefined
                  }
                  className={cn(
                    "px-3.5 py-1 text-[12px] font-medium",
                    QUICK_ACTION_TONE_CLASS[action.tone],
                  )}
                >
                  {action.label}
                </button>
              )
            })}
            {selectionMode === "self_directed" && !hasMaterialPlan ? (
              <button
                type="button"
                onClick={() => {
                  onOpenMaterialPlanDialog?.([])
                }}
                disabled={isTyping || connectionState !== "online"}
                className={cn("px-3.5 py-1 text-[12px] font-medium", USER_BUTTON_PRIMARY_CLASS)}
              >
                生成学习计划
              </button>
            ) : null}
          </div>
        </div>

        {showSupportOptions ? (
          <div className="mb-3 rounded-3xl border border-gold/20 bg-gold-dim p-4">
            <div className="mb-3 flex items-start justify-between gap-3">
              <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <Lightbulb className="h-4 w-4 text-gold" />
                先选一种更轻的求助方式
              </div>
              <button
                type="button"
                onClick={onCloseSupportOptions}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-gold/20 bg-background/55 text-muted-foreground transition-colors hover:border-gold/35 hover:text-foreground"
                aria-label="关闭求助方式选择"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="grid gap-2 sm:grid-cols-3">
              {supportOptions.map((option) => (
                <button
                  key={option.mode}
                  type="button"
                  onClick={() => onSupportOption(option)}
                  disabled={isTyping || connectionState !== "online"}
                  className="rounded-2xl border border-gold/20 bg-background/70 px-3 py-3 text-left transition-colors hover:bg-background disabled:opacity-50"
                >
                  <span className="block text-sm font-medium text-foreground">
                    {option.label}
                  </span>
                  <span className="mt-1 block text-xs leading-5 text-muted-foreground">
                    {option.description}
                  </span>
                </button>
              ))}
            </div>
          </div>
        ) : null}

        {previewAttachment ? (
          <div className="relative mb-3 inline-block overflow-hidden rounded-2xl border border-border bg-surface-2">
            {previewAttachment.type === "image" && previewAttachment.url ? (
              <Image
                src={previewAttachment.url}
                alt={previewAttachment.name}
                width={200}
                height={120}
                unoptimized
                className="h-28 w-auto object-cover"
              />
            ) : (
              <div className="flex min-w-64 items-center gap-2 px-3 py-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-3xl bg-brand/75 text-brand-foreground">
                  <Mic className="h-4 w-4" />
                </div>
                <audio
                  src={previewAttachment.url}
                  controls
                  className="overflow-hidden rounded-3xl h-9 max-w-52"
                />
              </div>
            )}
            <div className="flex items-center justify-between gap-3 px-3 py-2 text-xs text-muted-foreground">
              <span className="truncate">{previewAttachment.name}</span>
              <button
                type="button"
                onClick={onRemovePreview}
                className="flex h-5 w-5 items-center justify-center rounded-full bg-surface-4 text-muted-foreground hover:text-foreground"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          </div>
        ) : null}

        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={cn(
            "rounded-4xl border border-border bg-surface-2 px-2.5 py-2 transition-colors focus-within:border-brand/60",
            isDraggingImage && "border-brand/70 bg-brand/6 ring-2 ring-brand/20",
          )}
        >
          <div
            className={cn(
              "flex",
              input.split("\n").length > 1 ? "items-end" : "items-center",
            )}
          >
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isTyping || isRecording || Boolean(previewAttachment)}
              className="mr-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-2xl text-muted-foreground/60 transition-colors hover:bg-surface-3 hover:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-45"
              title="发送截图"
            >
              <ImagePlus className="h-4 w-4" />
            </button>

            <button
              type="button"
              onClick={handleRecordClick}
              disabled={isTyping || Boolean(previewAttachment)}
              className={cn(
                "relative mr-2 flex h-8 w-8 shrink-0 items-center justify-center rounded-2xl transition-colors disabled:cursor-not-allowed disabled:opacity-45",
                isRecording
                  ? "bg-red-500/10 text-red-500 hover:bg-red-500/15"
                  : "text-muted-foreground/60 hover:bg-surface-3 hover:text-muted-foreground",
              )}
              title={isRecording ? "停止录音" : "发送语音"}
            >
              {isRecording ? <Square className="h-3.5 w-3.5" /> : <Mic className="h-4 w-4" />}
            </button>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0]
                if (!file) return

                onSelectAttachment(file)
                event.target.value = ""
              }}
            />

            {isRecording ? (
              <div className="flex min-h-8 flex-1 items-center gap-3 rounded-2xl bg-brand/6 px-4 py-1.5 text-brand">
                <div className="flex h-5 w-10 shrink-0 items-center justify-center gap-0.5" aria-hidden="true">
                  {recordingWaveBars.map((height, index) => (
                    <span
                      key={index}
                      className="w-1.5 rounded-full bg-brand/80 transition-[height,opacity] duration-200 ease-out"
                      style={{
                        height: `${height}px`,
                        opacity: 0.52 + (height / 26) * 0.42,
                      }}
                    />
                  ))}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-3 text-xs font-medium">
                    <span>录音中</span>
                    <span className="tabular-nums">{formatRecordingTime(recordingRemainingMs)}</span>
                  </div>
                  <div className="mt-1 h-1 overflow-hidden rounded-full bg-brand/15">
                    <div
                      className="h-full rounded-full bg-brand transition-[width] duration-300 ease-linear"
                      style={{ width: `${recordingProgress * 100}%` }}
                    />
                  </div>
                </div>
              </div>
            ) : (
              <Textarea
                ref={textareaRef}
                rows={1}
                placeholder="把教程链接、代码片段或你卡住的问题发给我"
                aria-label="消息输入框"
                aria-describedby="input-hint"
                className="scrollbar-none min-h-0 flex-1 resize-none border-0 bg-transparent px-0 py-1 text-sm leading-6 shadow-none focus-visible:ring-0 placeholder:text-muted-foreground/50"
                style={{ maxHeight: `${TEXTAREA_MAX_HEIGHT}px`, overflowY: "auto" }}
                value={input}
                onChange={(event) => onInputChange(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault()
                    onSend()
                  }
                }}
                onPaste={handlePaste}
              />
            )}

            <button
              type="button"
              onClick={onSend}
              disabled={(!input.trim() && !previewAttachment) || isTyping || isRecording}
              className={cn(
                "ml-2 flex h-9 w-9 shrink-0 items-center justify-center rounded-3xl",
                (input.trim() || previewAttachment) && !isTyping && !isRecording
                  ? USER_BUTTON_PRIMARY_CLASS
                  : "text-foreground/20 dark:text-muted-foreground/40",
              )}
            >
              {isTyping ? (
                <RefreshCw className="h-4.5 w-4.5 animate-spin" />
              ) : (
                <Send className="h-4.5 w-4.5" />
              )}
            </button>
          </div>
        </div>

        <p id="input-hint" className="mt-2 text-center text-xs text-muted-foreground/55">
          {inputHint}
        </p>
      </div>
    </div>
  )
}
