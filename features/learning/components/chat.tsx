"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { Send, Zap, RefreshCw, ImagePlus, X } from "lucide-react"
import { cn } from "@/lib/utils"

type Message = {
  id: number
  role: "user" | "ai"
  content: string
  xp?: number
  nextStep?: string
}

const INITIAL_CONTENT =
  "你好！我是你的 AI 编程教练。你正在学习 **Cursor**，目前处于第 3 关：理解 AI Chat 与 Composer 的区别。\n\n**当前目标：** 用 Cursor 的 Composer 功能创建一个简单的 React 组件\n\n**只需要做这一步：** 打开 Cursor，按 Cmd+I 打开 Composer，输入【创建一个显示当前时间的 React 组件】，观察 AI 如何帮你生成完整文件。\n\n你准备好了吗？或者遇到了什么问题？"

const initialMessages: Message[] = [
  {
    id: 1,
    role: "ai",
    content: INITIAL_CONTENT,
  },
]

const suggestions = [
  "我完成了，接下来做什么？",
  "我卡住了，帮我分析一下",
  "能给我一个提示吗？",
]

const aiResponses = [
  {
    content:
      "太棒了！你已经完成了第 3 关的核心步骤！\n\n**你学到了什么：**\n- Composer 适合生成完整文件或功能块\n- Chat 适合提问和代码解释\n\n**下一步（第 4 关）：** 让 Cursor 帮你调试代码——在一个有 bug 的函数上按 Cmd+K，告诉 AI 问题所在。\n\n准备进入下一关了吗？",
    xp: 10,
    nextStep: "进入第 4 关：AI 调试助手",
  },
  {
    content:
      "没关系，让我来帮你！\n\n**可能遇到的卡点：**\n1. Cmd+I 没有反应？试试菜单栏 View → Composer\n2. Composer 打开了但不知道写什么？先用简单中文描述你想要的结果\n3. AI 生成的代码报错了？把错误信息直接贴给我\n\n你目前卡在哪一步？告诉我具体情况，我来帮你分析。",
  },
  {
    content:
      "好的，给你一个提示\n\n**提示：** 你不需要提前知道 React 语法。直接在 Composer 里用中文描述你想要的效果，比如：创建一个 React 组件，用 useState 保存当前时间，每秒更新一次，用大字体居中显示。\n\nCursor 会自动处理所有技术细节。你的任务只是观察它生成了什么，然后试着运行看看。",
  },
]

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
              <img
                src={previewImage}
                alt="待发送截图"
                className="h-20 rounded-xl border border-border/60 object-cover"
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
