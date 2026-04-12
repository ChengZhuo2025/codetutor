"use client"

import type { RefObject } from "react"
import { RefreshCw } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import { StatePanel } from "@/components/ui/state-panel"
import { LearnChatHero } from "@/features/learning/components/learn-chat-hero"
import { LearnChatMessageItem } from "@/features/learning/components/learn-chat-message-item"
import { LearnChatResumeCard } from "@/features/learning/components/learn-chat-resume-card"
import type { ConnectionState } from "@/features/learning/components/learn-chat-types"
import type { Message } from "@/features/learning/types"
import type { LearningCurrentSessionResponseData } from "@/lib/api/contracts/learning"
import { cn } from "@/lib/utils"
import { USER_BUTTON_SECONDARY_CLASS } from "@/components/ui/surface-styles"

type LearnChatMessageListProps = {
  scrollContainerRef: RefObject<HTMLDivElement | null>
  bottomRef: RefObject<HTMLDivElement | null>
  conversationId: string | null
  historyPagination: LearningCurrentSessionResponseData["historyPagination"]
  isLoadingHistory: boolean
  historyError: string | null
  onLoadEarlierMessages: () => void
  showResumeCard: boolean
  resume: LearningCurrentSessionResponseData["resume"]
  onDismissResume: () => void
  onResume: () => void
  mission: LearningCurrentSessionResponseData["mission"]
  rightPanel: LearningCurrentSessionResponseData["rightPanel"]
  connectionState: ConnectionState
  messages: Message[]
  isTyping: boolean
  pendingAssistantMessageId: number | null
  onAssistantAction: (
    message: Message,
    action: {
      label: string
      prompt: string
    },
  ) => void
  onNextStepClick: (message: Message) => void
}

export function LearnChatMessageList({
  scrollContainerRef,
  bottomRef,
  conversationId,
  historyPagination,
  isLoadingHistory,
  historyError,
  onLoadEarlierMessages,
  showResumeCard,
  resume,
  onDismissResume,
  onResume,
  mission,
  rightPanel,
  connectionState,
  messages,
  isTyping,
  pendingAssistantMessageId,
  onAssistantAction,
  onNextStepClick,
}: LearnChatMessageListProps) {
  return (
    <div
      ref={scrollContainerRef}
      className="min-h-0 flex-1 overflow-y-auto scrollbar-none px-4 py-5 sm:px-6 sm:py-6"
    >
      <div className="mx-auto max-w-3xl space-y-4">
        {conversationId && historyPagination.hasMore ? (
          <div className="flex flex-col items-center gap-2">
            <button
              type="button"
              onClick={onLoadEarlierMessages}
              disabled={isLoadingHistory}
              className={cn("px-4 py-2 text-xs font-medium", USER_BUTTON_SECONDARY_CLASS)}
            >
              {isLoadingHistory ? "正在加载更早消息..." : "加载更早消息"}
            </button>
            {historyError ? <p className="text-xs text-destructive">{historyError}</p> : null}
          </div>
        ) : null}

        {showResumeCard && resume ? (
          <LearnChatResumeCard
            resume={resume}
            onDismiss={onDismissResume}
            onResume={onResume}
          />
        ) : null}

        <LearnChatHero mission={mission} rightPanel={rightPanel} />

        {connectionState === "reconnecting" ? (
          <StatePanel
            status="loading"
            title="正在恢复连接"
            description="消息与任务上下文会在几秒内重新同步。"
            compact
          />
        ) : null}

        {messages.length === 0 ? (
          <StatePanel
            status="empty"
            title="还没有对话记录"
            description="先从当前一步开始，或者直接把你卡住的内容发给我。"
          />
        ) : (
          messages.map((message) => (
            <LearnChatMessageItem
              key={message.id}
              message={message}
              isTyping={isTyping}
              pendingAssistantMessageId={pendingAssistantMessageId}
              onAssistantAction={onAssistantAction}
              onNextStepClick={onNextStepClick}
            />
          ))
        )}

        {isTyping && pendingAssistantMessageId === null ? (
          <div className="flex gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand text-xs font-semibold text-brand-foreground">
              AI
            </div>
            <div className="min-w-[220px] rounded-3xl rounded-tl-md border border-brand/15 bg-brand-dim px-4 py-3.5">
              <div className="mb-3 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-brand/80">
                <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                AI 正在整理下一步
              </div>
              <div className="space-y-2">
                <Skeleton className="h-3 w-28 bg-brand/20" />
                <Skeleton className="h-3 w-40 bg-brand/20" />
                <Skeleton className="h-3 w-32 bg-brand/20" />
              </div>
            </div>
          </div>
        ) : null}

        <div ref={bottomRef} />
      </div>
    </div>
  )
}
