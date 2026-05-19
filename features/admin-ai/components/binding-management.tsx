"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { Plus, RefreshCw } from "lucide-react"
import type {
  AdminAIAgentBindingListItem,
  AdminAIAgentBindingListResponseData,
} from "@/lib/api/contracts/admin-ai"
import { Button } from "@/components/ui/button"
import { SearchInput } from "@/components/ui/search-input"
import { StatePanel } from "@/components/ui/state-panel"
import { AdminListPaginationFooter } from "@/features/admin-shell/components/admin-list-pagination-footer"
import { AdminSelect } from "@/features/admin-shell/components/admin-select"
import { useAdminSessionExpiryRedirect } from "@/features/admin-shell/lib/use-admin-session-expiry-redirect"
import {
  adminRequestData,
  getAdminApiErrorMessage,
  isAdminSessionExpiredError,
} from "@/lib/api/admin-bff-client"
import {
  getAdminAIInteractionTypeLabel,
  getAdminAILearningLevelLabel,
  getAdminAISelectionModeLabel,
} from "@/features/admin-ai/lib/view-model"
import { SELECTION_MODE_DEFINITIONS } from "@/constants/learning-taxonomy"
import { BindingFormSheet } from "./binding-form-sheet"
import { ActiveStateBadge, ListFilterCard, ListPageHeader } from "./shared"

function renderBindingScopeValue(value: string | null | undefined, fallbackLabel: string) {
  return value ?? fallbackLabel
}

const INTERACTION_TYPE_OPTIONS = [
  { value: "", label: "全部交互类型" },
  { value: "teaching", label: "教学对话" },
  { value: "blocked_help", label: "卡关求助" },
  { value: "task_review", label: "任务点评" },
  { value: "completion_feedback", label: "完成反馈" },
  { value: "path_guidance", label: "路径引导" },
  { value: "concept_qa", label: "概念问答" },
  { value: "media_vision_extract", label: "图片理解" },
  { value: "media_audio_transcribe", label: "语音转写" },
]

export function BindingManagement() {
  const [data, setData] = useState<AdminAIAgentBindingListResponseData | null>(null)
  const [keyword, setKeyword] = useState("")
  const [keywordApplied, setKeywordApplied] = useState("")
  const [interactionType, setInteractionType] = useState("")
  const [interactionTypeApplied, setInteractionTypeApplied] = useState("")
  const [toolId, setToolId] = useState("")
  const [toolIdApplied, setToolIdApplied] = useState("")
  const [selectionMode, setSelectionMode] = useState("")
  const [selectionModeApplied, setSelectionModeApplied] = useState("")
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState("20")
  const [editingItem, setEditingItem] = useState<AdminAIAgentBindingListItem | null>(null)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [authExpired, setAuthExpired] = useState(false)

  useAdminSessionExpiryRedirect(authExpired)

  const totalPages = Math.max(1, Math.ceil((data?.total ?? 0) / (Number.parseInt(limit, 10) || 20)) || 1)

  const fetchList = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams()
      params.set("page", String(page))
      params.set("limit", limit)
      if (keywordApplied) {
        params.set("keyword", keywordApplied)
      }
      if (interactionTypeApplied) {
        params.set("interactionType", interactionTypeApplied)
      }
      if (toolIdApplied) {
        params.set("toolId", toolIdApplied)
      }
      if (selectionModeApplied) {
        params.set("selectionMode", selectionModeApplied)
      }
      const result = await adminRequestData<AdminAIAgentBindingListResponseData>(
        `/admin/ai/agent-bindings?${params.toString()}`,
        { method: "GET" },
        "获取命中规则失败",
      )
      setData(result)
    } catch (fetchError) {
      setAuthExpired(isAdminSessionExpiredError(fetchError))
      setError(getAdminApiErrorMessage(fetchError, "获取命中规则失败"))
    } finally {
      setIsLoading(false)
    }
  }, [interactionTypeApplied, keywordApplied, limit, page, selectionModeApplied, toolIdApplied])

  useEffect(() => {
    void fetchList()
  }, [fetchList])

  const options = useMemo(() => {
    if (!data) {
      return null
    }
    return {
      agentOptions: data.agentOptions,
      toolOptions: data.toolOptions,
      pathOptions: data.pathOptions,
    }
  }, [data])

  const applySearch = () => {
    setPage(1)
    setKeywordApplied(keyword.trim())
    setInteractionTypeApplied(interactionType.trim())
    setToolIdApplied(toolId.trim())
    setSelectionModeApplied(selectionMode.trim())
  }

  return (
    <>
      <div className="space-y-6">
        <ListPageHeader
          title="命中规则"
          description="直接维护 `agent_bindings`，决定不同工具、路径、等级与交互类型下命中的 Agent。"
          total={data?.total}
          action={
            <div className="flex flex-wrap items-center gap-2">
              <Button type="button" variant="outline" className="gap-1.5" onClick={() => void fetchList()}>
                <RefreshCw className="h-4 w-4" />
                刷新
              </Button>
              <Button
                type="button"
                className="gap-1.5"
                onClick={() => {
                  setEditingItem(null)
                  setSheetOpen(true)
                }}
              >
                <Plus className="h-4 w-4" />
                新建规则
              </Button>
            </div>
          }
        />

        {error && !data ? (
          <StatePanel status="error" title="获取命中规则失败" description={error} actionLabel="重试" onAction={() => void fetchList()} />
        ) : (
          <>
            <ListFilterCard>
              <div className="grid gap-3 lg:grid-cols-[minmax(0,1.4fr)_repeat(3,minmax(0,0.9fr))_auto]">
                <SearchInput
                  value={keyword}
                  onChange={(event) => setKeyword(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      applySearch()
                    }
                  }}
                  placeholder="关键词：agent / tool / path / interaction"
                  wrapperClassName="max-w-none"
                />
                <AdminSelect
                  value={interactionType}
                  onValueChange={setInteractionType}
                  options={INTERACTION_TYPE_OPTIONS}
                  triggerClassName="w-full min-w-0"
                />
                <AdminSelect
                  value={toolId}
                  onValueChange={setToolId}
                  options={[
                    { value: "", label: "全部编程工具" },
                    ...(data?.toolOptions?.map((item) => ({
                      value: item.id,
                      label: `${item.name} (${item.code})`,
                    })) ?? []),
                  ]}
                  triggerClassName="w-full min-w-0"
                />
                <AdminSelect
                  value={selectionMode}
                  onValueChange={setSelectionMode}
                  options={[
                    { value: "", label: "全部学习模式" },
                    ...SELECTION_MODE_DEFINITIONS.map((item) => ({
                      value: item.code,
                      label: item.shortLabel,
                    })),
                  ]}
                  triggerClassName="w-full min-w-0"
                />
                <div className="flex gap-2 lg:justify-end">
                  <Button type="button" variant="secondary" size="sm" className="h-9" onClick={applySearch}>
                    搜索
                  </Button>
                </div>
              </div>
            </ListFilterCard>

            <div className="overflow-hidden rounded-xl border border-border bg-card">
              {isLoading && !data ? (
                <div className="space-y-3 p-4">
                  {[1, 2, 3].map((item) => (
                    <div key={item} className="h-24 animate-pulse rounded-xl border border-border bg-muted/40" />
                  ))}
                </div>
              ) : data?.items.length ? (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[1100px] table-fixed">
                    <thead className="bg-muted/40">
                      <tr className="border-b border-border">
                        <th className="w-[15%] px-4 py-3 text-left text-xs font-medium text-muted-foreground">Agent</th>
                        <th className="w-[8%] px-4 py-3 text-left text-xs font-medium text-muted-foreground">交互类型</th>
                        <th className="w-[10%] px-4 py-3 text-left text-xs font-medium text-muted-foreground">Tool</th>
                        <th className="w-[16%] px-4 py-3 text-left text-xs font-medium text-muted-foreground">路径</th>
                        <th className="w-[8%] px-4 py-3 text-left text-xs font-medium text-muted-foreground">等级</th>
                        <th className="w-[8%] px-4 py-3 text-left text-xs font-medium text-muted-foreground">模式</th>
                        <th className="w-[8%] px-4 py-3 text-left text-xs font-medium text-muted-foreground">Step</th>
                        <th className="w-[6%] px-4 py-3 text-left text-xs font-medium text-muted-foreground">优先级</th>
                        <th className="w-[6%] px-4 py-3 text-left text-xs font-medium text-muted-foreground">状态</th>
                        <th className="w-[7%] px-4 py-3 text-right text-xs font-medium text-muted-foreground">操作</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {data.items.map((item) => (
                        <tr key={item.bindingId} className="transition-colors hover:bg-muted/20">
                          <td className="px-4 py-4 align-top">
                            <p className="text-sm font-medium text-foreground">{item.agentName}</p>
                          </td>
                          <td className="px-4 py-4 align-top">
                            <p className="text-sm text-foreground">{getAdminAIInteractionTypeLabel(item.interactionType)}</p>
                          </td>
                          <td className="px-4 py-4 align-top">
                            <p className="text-sm text-foreground">{renderBindingScopeValue(item.toolName, "全部 Tool")}</p>
                          </td>
                          <td className="px-4 py-4 align-top">
                            <p className="text-sm text-foreground line-clamp-1">{renderBindingScopeValue(item.pathName, "全部 Path")}</p>
                          </td>
                          <td className="px-4 py-4 align-top">
                            <p className="text-sm text-foreground">{getAdminAILearningLevelLabel(item.learningLevel, "全部等级")}</p>
                          </td>
                          <td className="px-4 py-4 align-top">
                            <p className="text-sm text-foreground">{getAdminAISelectionModeLabel(item.selectionMode, "全部模式")}</p>
                          </td>
                          <td className="px-4 py-4 align-top">
                            <p className="text-sm text-foreground">{item.stepNo == null ? "全部 Step" : `Step ${item.stepNo}`}</p>
                          </td>
                          <td className="px-4 py-4 align-top">
                            <p className="text-sm text-foreground">{item.priority}</p>
                          </td>
                          <td className="px-4 py-4 align-top">
                            <ActiveStateBadge active={item.isActive} />
                          </td>
                          <td className="px-4 py-4 align-top">
                            <div className="flex items-center justify-end gap-2">
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="h-8 px-2.5"
                                onClick={() => {
                                  setEditingItem(item)
                                  setSheetOpen(true)
                                }}
                              >
                                编辑
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="p-4">
                  <StatePanel status="empty" title="暂无命中规则" description="当前筛选条件下没有匹配的命中规则。" />
                </div>
              )}

              <AdminListPaginationFooter
                limit={limit}
                onLimitChange={(value) => {
                  setLimit(value)
                  setPage(1)
                }}
                page={page}
                totalPages={totalPages}
                total={data?.total ?? 0}
                canPrev={page > 1}
                canNext={page < totalPages}
                isLoading={isLoading}
                onPrevPage={() => setPage((prev) => Math.max(1, prev - 1))}
                onNextPage={() => setPage((prev) => Math.min(totalPages, prev + 1))}
                centerContent={<span>当前页显示 {data?.items.length ?? 0} 条</span>}
              />
            </div>
          </>
        )}
      </div>

      <BindingFormSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        bindingItem={editingItem}
        options={options}
        onSaved={fetchList}
        onAuthExpired={() => setAuthExpired(true)}
      />
    </>
  )
}
