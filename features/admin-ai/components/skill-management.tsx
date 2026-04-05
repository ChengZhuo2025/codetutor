"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { Plus, RefreshCw, Search } from "lucide-react"
import type {
  AdminAIAgentSkillBindingListItem,
  AdminAIAgentSkillBindingListResponseData,
  AdminAISkillListResponseData,
} from "@/lib/api/contracts/admin-ai"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { StatePanel } from "@/components/ui/state-panel"
import { AdminListPaginationFooter } from "@/features/admin-shell/components/admin-list-pagination-footer"
import { useAdminSessionExpiryRedirect } from "@/features/admin-shell/lib/use-admin-session-expiry-redirect"
import {
  adminRequestData,
  getAdminApiErrorMessage,
  isAdminSessionExpiredError,
} from "@/lib/api/admin-bff-client"
import { SkillBindingSheet } from "./skill-binding-sheet"
import { ActiveStateBadge, ListFilterCard, ListPageHeader } from "./shared"

export function SkillManagement() {
  const [skillData, setSkillData] = useState<AdminAISkillListResponseData | null>(null)
  const [bindingData, setBindingData] = useState<AdminAIAgentSkillBindingListResponseData | null>(null)
  const [keyword, setKeyword] = useState("")
  const [keywordApplied, setKeywordApplied] = useState("")
  const [skillPage, setSkillPage] = useState(1)
  const [skillLimit, setSkillLimit] = useState("20")
  const [bindingKeyword, setBindingKeyword] = useState("")
  const [bindingKeywordApplied, setBindingKeywordApplied] = useState("")
  const [bindingPage, setBindingPage] = useState(1)
  const [bindingLimit, setBindingLimit] = useState("20")
  const [editingItem, setEditingItem] = useState<AdminAIAgentSkillBindingListItem | null>(null)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [authExpired, setAuthExpired] = useState(false)

  useAdminSessionExpiryRedirect(authExpired)

  const skillTotalPages = Math.max(1, Math.ceil((skillData?.total ?? 0) / (Number.parseInt(skillLimit, 10) || 20)) || 1)
  const bindingTotalPages = Math.max(1, Math.ceil((bindingData?.total ?? 0) / (Number.parseInt(bindingLimit, 10) || 20)) || 1)

  const fetchAll = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const skillParams = new URLSearchParams({
        page: String(skillPage),
        limit: skillLimit,
      })
      if (keywordApplied) {
        skillParams.set("keyword", keywordApplied)
      }

      const bindingParams = new URLSearchParams({
        page: String(bindingPage),
        limit: bindingLimit,
      })
      if (bindingKeywordApplied) {
        bindingParams.set("keyword", bindingKeywordApplied)
      }

      const [skills, bindings] = await Promise.all([
        adminRequestData<AdminAISkillListResponseData>(`/admin/ai/skills?${skillParams.toString()}`, { method: "GET" }, "获取 Skill 列表失败"),
        adminRequestData<AdminAIAgentSkillBindingListResponseData>(`/admin/ai/agent-skill-bindings?${bindingParams.toString()}`, { method: "GET" }, "获取 Skill 绑定失败"),
      ])
      setSkillData(skills)
      setBindingData(bindings)
    } catch (fetchError) {
      setAuthExpired(isAdminSessionExpiredError(fetchError))
      setError(getAdminApiErrorMessage(fetchError, "获取 Skill 管理数据失败"))
    } finally {
      setIsLoading(false)
    }
  }, [bindingKeywordApplied, bindingLimit, bindingPage, keywordApplied, skillLimit, skillPage])

  useEffect(() => {
    void fetchAll()
  }, [fetchAll])

  const bindingOptions = useMemo(() => {
    if (!bindingData) {
      return null
    }
    return {
      agentOptions: bindingData.agentOptions,
      skillOptions: bindingData.skillOptions,
    }
  }, [bindingData])

  const applySkillSearch = () => {
    setSkillPage(1)
    setKeywordApplied(keyword.trim())
  }

  const applyBindingSearch = () => {
    setBindingPage(1)
    setBindingKeywordApplied(bindingKeyword.trim())
  }

  return (
    <>
      <div className="space-y-6">
        <ListPageHeader
          title="Skill 管理"
          description="查看 Skill registry，并通过抽屉维护 `agent_skill_bindings`。不在线编辑 Skill 文件内容。"
          action={
            <Button type="button" variant="outline" className="gap-1.5" onClick={() => void fetchAll()}>
              <RefreshCw className="h-4 w-4" />
              刷新
            </Button>
          }
        />

        {error && !skillData && !bindingData ? (
          <StatePanel status="error" title="获取 Skill 管理数据失败" description={error} actionLabel="重试" onAction={() => void fetchAll()} />
        ) : (
          <>
            <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <h2 className="text-base font-semibold text-foreground">Skill Registry</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  当前项目中已登记的 Skill 包。
                  {typeof skillData?.total === "number" ? ` · 当前筛选共 ${skillData.total} 条` : ""}
                </p>
              </div>
            </div>
            <ListFilterCard>
              <div className="flex flex-col gap-3 md:flex-row">
                <div className="relative flex-1 min-w-32 max-w-md">
                  <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={keyword}
                    onChange={(event) => setKeyword(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        applySkillSearch()
                      }
                    }}
                    placeholder="关键词：code / name / source / trust"
                    className="h-9 w-full rounded-md border border-border bg-background pl-8 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                  />
                </div>
                <Button type="button" variant="secondary" size="sm" className="h-9" onClick={applySkillSearch}>
                  搜索
                </Button>
              </div>
            </ListFilterCard>
            <div className="overflow-hidden rounded-xl border border-border bg-card">
              {isLoading && !skillData ? (
                <div className="grid gap-3 p-4 xl:grid-cols-2">
                  {[1, 2, 3, 4].map((item) => (
                    <div key={item} className="h-20 animate-pulse rounded-xl border border-border bg-muted/40" />
                  ))}
                </div>
              ) : skillData?.items.length ? (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[1200px] table-fixed">
                    <thead className="bg-muted/40">
                      <tr className="border-b border-border">
                        <th className="w-[28%] px-4 py-3 text-left text-xs font-medium text-muted-foreground">Skill</th>
                        <th className="w-[12%] px-4 py-3 text-left text-xs font-medium text-muted-foreground">来源</th>
                        <th className="w-[16%] px-4 py-3 text-left text-xs font-medium text-muted-foreground">信任级别</th>
                        <th className="w-[10%] px-4 py-3 text-left text-xs font-medium text-muted-foreground">关联 Agent</th>
                        <th className="w-[10%] px-4 py-3 text-left text-xs font-medium text-muted-foreground">状态</th>
                        <th className="w-[38%] px-4 py-3 text-left text-xs font-medium text-muted-foreground">资源路径</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {skillData.items.map((item) => (
                        <tr key={item.skillId} className="transition-colors hover:bg-muted/20">
                          <td className="px-4 py-4 align-top">
                            <p className="text-sm font-medium text-foreground">{item.name}</p>
                            <p className="mt-1 font-mono text-[11px] text-muted-foreground">{item.code}</p>
                          </td>
                          <td className="px-4 py-4 align-top text-sm text-foreground">{item.sourceType}</td>
                          <td className="px-4 py-4 align-top text-sm text-foreground">{item.trustLevel}</td>
                          <td className="px-4 py-4 align-top text-sm text-foreground">{item.linkedAgentCount}</td>
                          <td className="px-4 py-4 align-top">
                            <ActiveStateBadge active={item.isActive} />
                          </td>
                          <td className="px-4 py-4 align-top break-all text-xs text-muted-foreground">{item.entryResourcePath ?? item.manifestPath}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="p-4">
                  <StatePanel status="empty" title="暂无 Skill" description="当前筛选条件下没有匹配的 Skill。" />
                </div>
              )}

              <AdminListPaginationFooter
                limit={skillLimit}
                onLimitChange={(value) => {
                  setSkillLimit(value)
                  setSkillPage(1)
                }}
                page={skillPage}
                totalPages={skillTotalPages}
                total={skillData?.total ?? 0}
                canPrev={skillPage > 1}
                canNext={skillPage < skillTotalPages}
                isLoading={isLoading}
                onPrevPage={() => setSkillPage((prev) => Math.max(1, prev - 1))}
                onNextPage={() => setSkillPage((prev) => Math.min(skillTotalPages, prev + 1))}
                centerContent={<span>当前页显示 {skillData?.items.length ?? 0} 条</span>}
              />
            </div>

            <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <h2 className="text-base font-semibold text-foreground">Skill 绑定</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  维护 Agent 到 Skill 的上下文挂载关系。
                  {typeof bindingData?.total === "number" ? ` · 当前筛选共 ${bindingData.total} 条` : ""}
                </p>
              </div>
              <Button
                type="button"
                className="gap-1.5"
                onClick={() => {
                  setEditingItem(null)
                  setSheetOpen(true)
                }}
              >
                <Plus className="h-4 w-4" />
                新建绑定
              </Button>
            </div>
            <ListFilterCard>
              <div className="flex flex-col gap-3 md:flex-row">
                <div className="relative min-w-0 flex-1">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={bindingKeyword}
                    onChange={(event) => setBindingKeyword(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        applyBindingSearch()
                      }
                    }}
                    placeholder="关键词：agent / skill"
                    className="h-9 pl-9"
                  />
                </div>
                <Button type="button" variant="secondary" size="sm" className="h-9" onClick={applyBindingSearch}>
                  搜索
                </Button>
              </div>
            </ListFilterCard>
            <div className="overflow-hidden rounded-xl border border-border bg-card">
              {isLoading && !bindingData ? (
                <div className="space-y-3 p-4">
                  {[1, 2, 3].map((item) => (
                    <div key={item} className="h-24 animate-pulse rounded-xl border border-border bg-muted/40" />
                  ))}
                </div>
              ) : bindingData?.items.length ? (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[1100px] table-fixed">
                    <thead className="bg-muted/40">
                      <tr className="border-b border-border">
                        <th className="w-[22%] px-4 py-3 text-left text-xs font-medium text-muted-foreground">Agent</th>
                        <th className="w-[22%] px-4 py-3 text-left text-xs font-medium text-muted-foreground">Skill</th>
                        <th className="w-[12%] px-4 py-3 text-left text-xs font-medium text-muted-foreground">优先级</th>
                        <th className="w-[12%] px-4 py-3 text-left text-xs font-medium text-muted-foreground">必选</th>
                        <th className="w-[12%] px-4 py-3 text-left text-xs font-medium text-muted-foreground">预算</th>
                        <th className="w-[10%] px-4 py-3 text-left text-xs font-medium text-muted-foreground">状态</th>
                        <th className="w-[10%] px-4 py-3 text-right text-xs font-medium text-muted-foreground">操作</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {bindingData.items.map((item) => (
                        <tr key={item.bindingId} className="transition-colors hover:bg-muted/20">
                          <td className="px-4 py-4 align-top">
                            <p className="text-sm font-medium text-foreground">{item.agentName}</p>
                          </td>
                          <td className="px-4 py-4 align-top">
                            <p className="text-sm text-foreground">{item.skillName}</p>
                            <p className="mt-1 text-xs text-muted-foreground">{item.skillCode}</p>
                          </td>
                          <td className="px-4 py-4 align-top text-sm text-foreground">{item.priority}</td>
                          <td className="px-4 py-4 align-top text-sm text-foreground">{item.isRequired ? "必需" : "可选"}</td>
                          <td className="px-4 py-4 align-top text-sm text-foreground">{item.contextBudgetTokens ?? "未设置"}</td>
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
                  <StatePanel status="empty" title="暂无 Skill 绑定" description="当前筛选条件下没有匹配的 Skill 绑定。" />
                </div>
              )}

              <AdminListPaginationFooter
                limit={bindingLimit}
                onLimitChange={(value) => {
                  setBindingLimit(value)
                  setBindingPage(1)
                }}
                page={bindingPage}
                totalPages={bindingTotalPages}
                total={bindingData?.total ?? 0}
                canPrev={bindingPage > 1}
                canNext={bindingPage < bindingTotalPages}
                isLoading={isLoading}
                onPrevPage={() => setBindingPage((prev) => Math.max(1, prev - 1))}
                onNextPage={() => setBindingPage((prev) => Math.min(bindingTotalPages, prev + 1))}
                centerContent={<span>当前页显示 {bindingData?.items.length ?? 0} 条</span>}
              />
            </div>
          </>
        )}
      </div>

      <SkillBindingSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        bindingItem={editingItem}
        options={bindingOptions}
        onSaved={fetchAll}
        onAuthExpired={() => setAuthExpired(true)}
      />
    </>
  )
}
