"use client"

import { useEffect, useState } from "react"
import { AppShell } from "@/components/layout/app-shell"
import { WorkspaceSidebar } from "@/components/layout/workspace-sidebar"
import { StatePanel } from "@/components/ui/state-panel"
import { ROUTES } from "@/constants/routes"
import { WORKSPACE_ASIDE_WIDTH_CLASS } from "@/constants/workspace-layout"
import { LearnChat } from "@/features/learning/components/chat"
import { LearnRightPanel } from "@/features/learning/components/right-panel"
import type { LearningCurrentSessionResponseData } from "@/lib/api/contracts/learning"
import { requestData } from "@/lib/api/client"
import type { ApiRequestState } from "@/types/api"

export function LearnPage() {
  const [sessionState, setSessionState] =
    useState<ApiRequestState<LearningCurrentSessionResponseData>>({
      status: "loading",
    })

  useEffect(() => {
    let cancelled = false

    async function loadSession() {
      try {
        const data = await requestData<LearningCurrentSessionResponseData>(
          "/learning/current-session",
        )

        if (cancelled) {
          return
        }

        setSessionState({
          status: "success",
          data,
        })
      } catch (error) {
        if (cancelled) {
          return
        }

        setSessionState({
          status:
            error instanceof Error && error.message.includes("NOT_FOUND")
              ? "empty"
              : "error",
          message:
            error instanceof Error ? error.message : "加载当前学习会话失败",
        })
      }
    }

    loadSession()

    return () => {
      cancelled = true
    }
  }, [])

  return (
    <AppShell
      mobileTitle="学习工作台"
      mobileSubtitle="继续上次学习 · 当前一步 · 任务上下文"
      asideLabel="任务上下文"
      renderSidebar={({ mobile }) => (
        <WorkspaceSidebar activeHref={ROUTES.learn} mobile={mobile} />
      )}
      renderAside={() =>
        sessionState.status === "success" ? (
          <LearnRightPanel learningData={sessionState.data} />
        ) : (
          <div className="p-5">
            <StatePanel
              status={sessionState.status}
              title="任务上下文暂不可用"
              description={sessionState.message}
              compact
            />
          </div>
        )
      }
      asideClassName={WORKSPACE_ASIDE_WIDTH_CLASS}
    >
      {sessionState.status === "success" ? (
        <LearnChat learningData={sessionState.data} />
      ) : (
        <div className="flex min-h-0 flex-1 items-center justify-center p-4 sm:p-6">
          <div className="w-full max-w-3xl">
            <StatePanel
              status={sessionState.status}
              title={
                sessionState.status === "loading"
                  ? "正在恢复学习会话"
                  : sessionState.status === "empty"
                    ? "当前还没有学习任务"
                    : "学习工作台加载失败"
              }
              description={
                sessionState.message ??
                "完成 onboarding 并激活一条学习路径后，这里会显示当前学习任务。"
              }
            />
          </div>
        </div>
      )}
    </AppShell>
  )
}
