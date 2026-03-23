"use client"

import Image from "next/image"
import { useState, useRef, useEffect, useCallback } from "react"
import { Send, Zap, RefreshCw, ImagePlus, X } from "lucide-react"
import {
  aiResponses,
  initialMessages,
  suggestions,
} from "@/features/learning/data/learning-content"
import type { Message } from "@/features/learning/types"
import { cn } from "@/lib/utils"

export function LearnChat() {
  const [messages, setMessages] = useState<Message[]>(initialMessages)
  const [input, setInput] = useState("")
  const [isTyping, setIsTyping] = useState(false)
  const [previewImage, setPreviewImage] = useState<string | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const responseIndex = useRef(0)
  const nextMessageId = useRef(initialMessages.length + 1)

  const allocateMessageId = () => {
    const id = nextMessageId.current
    nextMessageId.current += 1
    return id
  }

  // Auto-resize textarea up to 3 lines
  const LINE_HEIGHT = 24
  const MAX_LINES = 3
  const adjustHeight = useCallback(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = "auto"
    const clamped = Math.min(el.scrollHeight, LINE_HEIGHT * MAX_LINES + 16)
    el.style.height = `${clamped}px`
  }, [])

  useEffect(() => { adjustHeight() }, [input, adjustHeight])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages, isTyping])

  const sendMessage = (text: string) => {
    if ((!text.trim() && !previewImage) || isTyping) return
    const userMsg: Message = {
      id: allocateMessageId(),
      role: "user",
      content: text || "[发送了一张截图]",
    }
    setMessages((prev) => [...prev, userMsg])
    setInput("")
    setPreviewImage(null)
    if (textareaRef.current) textareaRef.current.style.height = "auto"
    setIsTyping(true)
    setTimeout(() => {
      const resp = aiResponses[responseIndex.current % aiResponses.length]
      responseIndex.current++
      setMessages((prev) => [
        ...prev,
        {
          id: allocateMessageId(),
          role: "ai",
          content: resp.content,
          xp: resp.xp,
          nextStep: resp.nextStep,
        },
      ])
      setIsTyping(false)
    }, 1400)
  }

  const renderContent = (text: string) => {
    const lines = text.split("\n")
    return lines.map((line, i) => {
      if (line.startsWith("**") && line.endsWith("**")) {
        return (
          <p key={i} className="font-semibold text-foreground">
            {line.slice(2, -2)}
          </p>
        )
      }
      if (line.startsWith("- ")) {
        return (
          <li key={i} className="ml-4 list-disc text-muted-foreground">
            {line.slice(2)}
          </li>
        )
      }
      if (line.match(/^\d+\. /)) {
        return (
          <li key={i} className="ml-4 list-decimal text-muted-foreground">
            {line.replace(/^\d+\. /, "")}
          </li>
        )
      }
      const boldParts = line.split(/\*\*(.*?)\*\*/g)
      return (
        <p key={i} className={line === "" ? "h-2" : "text-foreground/90"}>
          {boldParts.map((part, j) =>
            j % 2 === 1 ? <strong key={j}>{part}</strong> : part
          )}
        </p>
      )
    })
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {/* Chat header */}
      <div className="flex items-center justify-between border-b border-border/50 bg-surface-1/80 px-6 py-4 backdrop-blur-sm">
        <div>
          <h2 className="font-semibold">AI 导师</h2>
          <p className="text-xs text-muted-foreground">Cursor · 第 3 关 / 共 12 关</p>
        </div>
        <button className="flex items-center gap-2 rounded-lg border border-border/60 bg-surface-2 px-3 py-2 text-xs text-muted-foreground transition-colors hover:border-border hover:text-foreground">
          <RefreshCw className="h-3 w-3" />
          重新开始本关
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-6">
        <div className="mx-auto max-w-2xl space-y-5">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={cn(
                "flex gap-3",
                msg.role === "user" ? "flex-row-reverse" : "flex-row"
              )}
            >
              <div
                className={cn(
                  "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-semibold",
                  msg.role === "user"
                    ? "bg-surface-4 text-muted-foreground"
                    : "bg-brand text-brand-foreground"
                )}
              >
                {msg.role === "user" ? "我" : "AI"}
              </div>

              <div className="flex max-w-[85%] flex-col gap-2">
                <div
                  className={cn(
                    "rounded-2xl px-4 py-3.5 text-sm leading-relaxed",
                    msg.role === "user"
                      ? "rounded-tr-sm bg-surface-3 text-foreground"
                      : "rounded-tl-sm border border-brand/15 bg-brand-dim"
                  )}
                >
                  <div className="space-y-1.5">{renderContent(msg.content)}</div>
                </div>

                {msg.xp && (
                  <div className="flex items-center gap-2 rounded-xl border border-gold/20 bg-gold-dim px-3 py-2">
                    <Zap className="h-4 w-4 text-gold" />
                    <span className="text-sm font-semibold text-gold">+{msg.xp} XP</span>
                    <span className="text-xs text-muted-foreground">任务步骤完成</span>
                  </div>
                )}
                {msg.nextStep && (
                  <button className="flex items-center gap-2 self-start rounded-xl border border-brand/30 bg-brand-dim px-3 py-2 text-sm font-medium text-brand transition-colors hover:bg-brand/20">
                    <Zap className="h-3.5 w-3.5" />
                    {msg.nextStep}
                  </button>
                )}
              </div>
            </div>
          ))}

          {isTyping && (
            <div className="flex gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand text-xs font-semibold text-brand-foreground">
                AI
              </div>
              <div className="flex items-center gap-1 rounded-2xl rounded-tl-sm border border-brand/15 bg-brand-dim px-4 py-3.5">
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    className="h-2 w-2 animate-bounce rounded-full bg-brand/60"
                    style={{ animationDelay: `${i * 0.15}s` }}
                  />
                ))}
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>
      </div>

      {/* Quick suggestions */}
      <div className="border-t border-border/50 bg-surface-1 px-6 pb-1 pt-3">
        <div className="mx-auto flex max-w-2xl gap-2 overflow-x-auto pb-2">
          {suggestions.map((s) => (
            <button
              key={s}
              onClick={() => sendMessage(s)}
              disabled={isTyping}
              className="shrink-0 rounded-full border border-border/60 bg-surface-2 px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:border-border hover:text-foreground disabled:opacity-50"
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Input bar */}
      <div className="border-t border-border/50 bg-surface-1 px-6 pb-6 pt-3">
        <div className="mx-auto max-w-2xl">
          {/* Image preview */}
          {previewImage && (
            <div className="relative mb-2 inline-block">
              <Image
                src={previewImage}
                alt="待发送截图"
                width={160}
                height={80}
                unoptimized
                className="h-20 w-auto rounded-xl border border-border/60 object-cover"
              />
              <button
                onClick={() => setPreviewImage(null)}
                className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-surface-4 text-muted-foreground hover:text-foreground"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          )}

          <div
            className={cn(
              "flex rounded-2xl border border-border/60 bg-surface-2 px-3 py-2.5 transition-colors focus-within:border-brand/60",
              input.split("\n").length > 1 ? "items-end" : "items-center"
            )}
          >
            {/* Image upload */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="mr-2 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground/60 transition-colors hover:bg-surface-3 hover:text-muted-foreground"
              title="发送截图"
            >
              <ImagePlus className="h-4 w-4" />
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (!file) return
                const url = URL.createObjectURL(file)
                setPreviewImage(url)
                e.target.value = ""
              }}
            />

            <textarea
              ref={textareaRef}
              rows={1}
              placeholder="粘贴教程内容、代码片段、链接，或直接提问..."
              className="flex-1 resize-none bg-transparent py-0.5 text-sm leading-6 text-foreground outline-none placeholder:text-muted-foreground/50"
              style={{ maxHeight: `${24 * 3 + 16}px`, overflowY: "auto" }}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault()
                  sendMessage(input)
                }
              }}
            />

            {/* Send */}
            <button
              onClick={() => sendMessage(input)}
              disabled={(!input.trim() && !previewImage) || isTyping}
              className={cn(
                "ml-2 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-all",
                (input.trim() || previewImage) && !isTyping
                  ? "bg-brand text-brand-foreground hover:bg-brand/90"
                  : "bg-surface-4 text-muted-foreground/40"
              )}
            >
              <Send className="h-4 w-4" />
            </button>
          </div>

          <p className="mt-2 text-center text-xs text-muted-foreground/50">
            按 Enter 发送 · Shift+Enter 换行
          </p>
        </div>
      </div>
    </div>
  )
}
