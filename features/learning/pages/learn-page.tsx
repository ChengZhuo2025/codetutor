"use client"

import { useCallback, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { AppShell } from "@/components/layout/app-shell"
import { WorkspaceSidebar } from "@/components/layout/workspace-sidebar"
import { StatePanel } from "@/components/ui/state-panel"
import { ROUTES } from "@/constants/routes"
import { WORKSPACE_ASIDE_WIDTH_CLASS } from "@/constants/workspace-layout"
import { LearnChat } from "@/features/learning/components/chat"
import { MaterialPlanDialog } from "@/features/learning/components/material-plan-dialog"
import { LearnRightPanel } from "@/features/learning/components/right-panel"
import { resolveAuthenticatedRedirectTo } from "@/lib/auth/client-session"
import { apiClient } from "@/lib/api/client"
import type { LearningCurrentSessionResponseData } from "@/lib/api/contracts/learning"
import type { ApiRequestState } from "@/types/api"

export function LearnPage() {
  const router = useRouter()
  const [refreshNonce, setRefreshNonce] = useState(0)
  const [materialDialog, setMaterialDialog] = useState({
    open: false,
    initialLinks: [] as string[],
    initialDraftId: null as string | null,
  })
  const [sessionState, setSessionState] =
    useState<ApiRequestState<LearningCurrentSessionResponseData>>({
      status: "loading",
    })

  useEffect(() => {
    let cancelled = false

    async function loadSession() {
      const response = await apiClient.get<LearningCurrentSessionResponseData>(
        "/learning/current-session",
      )

      if (cancelled) {
        return
      }

      if (response.code === "OK") {
        setSessionState({
          status: "success",
          data: response.data,
        })
        return
      }

      if (response.code === "AUTH_REQUIRED") {
        router.replace(ROUTES.login)
        return
      }

      if (response.code === "NOT_FOUND") {
        setSessionState({
          status: "loading",
          message: "当前没有进行中的学习计划，正在为你跳转。",
        })

        const redirectTo = await resolveAuthenticatedRedirectTo()

        if (cancelled) {
          return
        }

        if (redirectTo && redirectTo !== ROUTES.learn) {
          router.replace(redirectTo)
          return
        }

        setSessionState({
          status: "empty",
          message: response.message,
        })
        return
      }

      setSessionState({
        status: "error",
        message: response.message,
      })
    }

    void loadSession()

    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshNonce])

  useEffect(() => {
    if (sessionState.status !== "success") return
    if (sessionState.data.planSummary.selectionMode !== "self_directed") return
    if (!sessionState.data.pendingMaterialPlanDraft) return
    if (typeof window === "undefined") return

    const userId = sessionState.data.profile.userId
    const draftId = sessionState.data.pendingMaterialPlanDraft.draftId
    const key = `learn:self_directed_pending_draft_prompted:${userId}:${draftId}`

    try {
      if (window.sessionStorage?.getItem(key) === "1") return
      window.sessionStorage?.setItem(key, "1")
      window.setTimeout(() => setMaterialDialog({
        open: true,
        initialLinks: [],
        initialDraftId: draftId,
      }), 0)
    } catch (error) {
      console.warn("Failed to access sessionStorage:", error)
      window.setTimeout(() => setMaterialDialog({
        open: true,
        initialLinks: [],
        initialDraftId: draftId,
      }), 0)
    }
  }, [sessionState])

  useEffect(() => {
    if (sessionState.status !== "success") return
    if (sessionState.data.planSummary.selectionMode !== "self_directed") return
    if (sessionState.data.planSummary.hasMaterialPlan) return
    if (sessionState.data.pendingMaterialPlanDraft) return
    if (typeof window === "undefined") return

    const userId = sessionState.data.profile.userId
    const pathId = sessionState.data.path.id
    const key = `learn:self_directed_plan_prompted:${userId}:${pathId}`

    try {
      if (window.sessionStorage?.getItem(key) === "1") return
      window.setTimeout(() => setMaterialDialog((prev) => ({ ...prev, open: true })), 0)
    } catch (error) {
      console.warn("Failed to access sessionStorage:", error)
      window.setTimeout(() => setMaterialDialog((prev) => ({ ...prev, open: true })), 0)
    }
  }, [sessionState])

  const handleSessionRefresh = useCallback(() => {
    setRefreshNonce((current) => current + 1)
  }, [])

  const handleMaterialDialogOpenChange = useCallback((open: boolean) => {
    setMaterialDialog((prev) => ({ ...prev, open }))
  }, [])

  const handleMaterialPlanDialogOpened = useCallback(
    (open: boolean) => {
      if (!open) return
      if (sessionState.status !== "success") return
      if (sessionState.data.planSummary.selectionMode !== "self_directed") return
      if (sessionState.data.planSummary.hasMaterialPlan) return

      const userId = sessionState.data.profile.userId
      const pathId = sessionState.data.path.id
      const key = `learn:self_directed_plan_prompted:${userId}:${pathId}`

      try {
        window.sessionStorage?.setItem(key, "1")
      } catch (error) {
        console.warn("Failed to access sessionStorage:", error)
      }
    },
    [sessionState],
  )

  const handleOpenMaterialPlanDialog = useCallback((links?: string[]) => {
    setMaterialDialog({
      open: true,
      initialLinks: links ?? [],
      initialDraftId: null,
    })
  }, [])

  return (
    <AppShell
      workspacePage="learn"
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
        <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-4 overflow-hidden">
          {sessionState.data.planSummary.selectionMode === "self_directed" ? (
            <MaterialPlanDialog
              open={materialDialog.open}
              onOpenChange={handleMaterialDialogOpenChange}
              onDialogOpenChange={handleMaterialPlanDialogOpened}
              onSessionRefresh={handleSessionRefresh}
              initialLinks={materialDialog.initialLinks}
              initialDraftId={materialDialog.initialDraftId}
            />
          ) : null}
          <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
            <LearnChat
              learningData={sessionState.data}
              onRequestRefresh={handleSessionRefresh}
              onOpenMaterialPlanDialog={handleOpenMaterialPlanDialog}
            />
          </div>
        </div>
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
