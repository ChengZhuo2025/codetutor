"use client"

import { useEffect, useMemo, useState } from "react"
import { Archive, CalendarDays, Eye, FileClock, Loader2, PenLine, RefreshCw, Rocket, Save, Sparkles, Trash2 } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { StatePanel } from "@/components/ui/state-panel"
import { Textarea } from "@/components/ui/textarea"
import { useAppToast } from "@/components/app-feedback/app-toast-provider"
import { useAdminSessionExpiryRedirect } from "@/features/admin-shell/lib/use-admin-session-expiry-redirect"
import { MarkdownContent } from "@/features/site/components/markdown-content"
import type {
  AdminSiteChangelogEntry,
  AdminSiteChangelogListResponseData,
  AdminSiteChangelogUpdateRequest,
  SiteChangelogStatus,
} from "@/lib/api/contracts/admin-site"
import {
  adminRequestData,
  getAdminApiErrorMessage,
  isAdminSessionExpiredError,
} from "@/lib/api/admin-bff-client"
import { cn } from "@/lib/utils"

type StatusFilter = SiteChangelogStatus | "all"
type SheetMode = "view" | "edit"

type ChangelogForm = {
  title: string
  summaryMarkdown: string
}

const STATUS_LABELS: Record<SiteChangelogStatus, string> = {
  draft: "草稿",
  published: "已发布",
  archived: "已归档",
}

const STATUS_BADGES: Record<SiteChangelogStatus, "warning" | "success" | "neutral"> = {
  draft: "warning",
  published: "success",
  archived: "neutral",
}

function todayString() {
  const now = new Date()
  const year = now.getFullYear()
  const month = `${now.getMonth() + 1}`.padStart(2, "0")
  const day = `${now.getDate()}`.padStart(2, "0")
  return `${year}-${month}-${day}`
}

function formatDateTime(value: string | null) {
  return value ? new Date(value).toLocaleString("zh-CN") : "暂无"
}

function toForm(entry: AdminSiteChangelogEntry): ChangelogForm {
  return {
    title: entry.title,
    summaryMarkdown: entry.summaryMarkdown,
  }
}

export function SiteChangelogPage() {
  const toast = useAppToast()
  const [authExpired, setAuthExpired] = useState(false)
  useAdminSessionExpiryRedirect(authExpired)

  const [items, setItems] = useState<AdminSiteChangelogEntry[]>([])
  const [status, setStatus] = useState<StatusFilter>("all")
  const [keyword, setKeyword] = useState("")
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")
  const [generateDate, setGenerateDate] = useState(todayString)
  const [selected, setSelected] = useState<AdminSiteChangelogEntry | null>(null)
  const [form, setForm] = useState<ChangelogForm | null>(null)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [sheetMode, setSheetMode] = useState<SheetMode>("view")
  const [publishTarget, setPublishTarget] = useState<AdminSiteChangelogEntry | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<AdminSiteChangelogEntry | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [saving, setSaving] = useState(false)
  const [publishing, setPublishing] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [archiving, setArchiving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const canEditSelected = Boolean(selected && selected.status !== "archived")
  const hasUnsavedChanges = Boolean(
    selected
    && form
    && selected.status !== "archived"
    && (form.title !== selected.title || form.summaryMarkdown !== selected.summaryMarkdown),
  )

  const queryString = useMemo(() => {
    const params = new URLSearchParams()
    params.set("status", status)
    params.set("limit", "50")
    if (keyword.trim()) params.set("keyword", keyword.trim())
    if (startDate.trim()) params.set("startDate", startDate.trim())
    if (endDate.trim()) params.set("endDate", endDate.trim())
    return params.toString()
  }, [endDate, keyword, startDate, status])

  const load = async (silent = false) => {
    if (silent) setRefreshing(true)
    else setLoading(true)
    setError(null)
    try {
      const result = await adminRequestData<AdminSiteChangelogListResponseData>(
        `/admin/site/changelog?${queryString}`,
        undefined,
        "获取更新日志失败",
      )
      setItems(result.items)
      if (selected) {
        const nextSelected = result.items.find((item) => item.id === selected.id) ?? null
        setSelected(nextSelected)
        if (nextSelected) setForm(toForm(nextSelected))
      }
    } catch (loadError) {
      setAuthExpired(isAdminSessionExpiredError(loadError))
      setError(getAdminApiErrorMessage(loadError, "获取更新日志失败"))
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    void load()
    // eslint-disable-next-line react-hooks/exhaustive-deps -- queryString is the only remote filter dependency
  }, [queryString])

  const openSheet = (entry: AdminSiteChangelogEntry, mode: SheetMode) => {
    setSelected(entry)
    setForm(toForm(entry))
    setSheetMode(mode)
    setSheetOpen(true)
  }

  const openEditSheet = (entry: AdminSiteChangelogEntry) => {
    if (entry.status === "archived") {
      toast.info("已归档日志不可编辑", "如需调整公开内容，请编辑草稿或已发布的更新日志。")
      openSheet(entry, "view")
      return
    }
    openSheet(entry, "edit")
  }

  const mergeEntry = (entry: AdminSiteChangelogEntry) => {
    setItems((prev) => {
      const exists = prev.some((item) => item.id === entry.id)
      const next = exists
        ? prev.map((item) => (item.id === entry.id ? entry : item))
        : [entry, ...prev]
      return next.sort((a, b) => b.logDate.localeCompare(a.logDate))
    })
    setSelected(entry)
    setForm(toForm(entry))
  }

  const removeEntry = (entryId: string) => {
    setItems((prev) => prev.filter((item) => item.id !== entryId))
    setPublishTarget((prev) => prev?.id === entryId ? null : prev)
    if (selected?.id === entryId) {
      setSelected(null)
      setForm(null)
      setSheetOpen(false)
    }
  }

  const handleGenerate = async (regenerate = false) => {
    setGenerating(true)
    try {
      const result = await adminRequestData<AdminSiteChangelogEntry>(
        "/admin/site/changelog/generate",
        {
          method: "POST",
          body: JSON.stringify({ logDate: generateDate, regenerate }),
        },
        "生成更新日志失败",
      )
      mergeEntry(result)
      openSheet(result, "edit")
      toast.success("更新日志草稿已生成")
    } catch (generateError) {
      setAuthExpired(isAdminSessionExpiredError(generateError))
      toast.error(getAdminApiErrorMessage(generateError, "生成更新日志失败"))
    } finally {
      setGenerating(false)
    }
  }

  const handleSave = async () => {
    if (!selected || !form) return
    const payload: AdminSiteChangelogUpdateRequest = {
      title: form.title,
      summaryMarkdown: form.summaryMarkdown,
    }
    setSaving(true)
    try {
      const result = await adminRequestData<AdminSiteChangelogEntry>(
        `/admin/site/changelog/${selected.id}`,
        {
          method: "PATCH",
          body: JSON.stringify(payload),
        },
        "保存更新日志失败",
      )
      mergeEntry(result)
      toast.success("更新日志已保存")
    } catch (saveError) {
      setAuthExpired(isAdminSessionExpiredError(saveError))
      toast.error(getAdminApiErrorMessage(saveError, "保存更新日志失败"))
    } finally {
      setSaving(false)
    }
  }

  const handlePublish = async () => {
    if (!publishTarget) return
    if (hasUnsavedChanges && publishTarget.id === selected?.id) {
      toast.info("保存后发布", "当前编辑内容尚未保存，请先保存草稿再发布。")
      setPublishTarget(null)
      return
    }
    setPublishing(true)
    try {
      const result = await adminRequestData<AdminSiteChangelogEntry>(
        `/admin/site/changelog/${publishTarget.id}/publish`,
        { method: "POST" },
        "发布更新日志失败",
      )
      mergeEntry(result)
      setPublishTarget(null)
      toast.success("更新日志已发布")
    } catch (publishError) {
      setAuthExpired(isAdminSessionExpiredError(publishError))
      toast.error(getAdminApiErrorMessage(publishError, "发布更新日志失败"))
    } finally {
      setPublishing(false)
    }
  }

  const handleArchive = async () => {
    if (!selected) return
    setArchiving(true)
    try {
      const result = await adminRequestData<AdminSiteChangelogEntry>(
        `/admin/site/changelog/${selected.id}/archive`,
        { method: "POST" },
        "归档更新日志失败",
      )
      mergeEntry(result)
      toast.success("更新日志已归档")
    } catch (archiveError) {
      setAuthExpired(isAdminSessionExpiredError(archiveError))
      toast.error(getAdminApiErrorMessage(archiveError, "归档更新日志失败"))
    } finally {
      setArchiving(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await adminRequestData<AdminSiteChangelogEntry>(
        `/admin/site/changelog/${deleteTarget.id}`,
        { method: "DELETE" },
        "删除更新日志失败",
      )
      removeEntry(deleteTarget.id)
      setDeleteTarget(null)
      toast.success("更新日志已删除")
    } catch (deleteError) {
      setAuthExpired(isAdminSessionExpiredError(deleteError))
      toast.error(getAdminApiErrorMessage(deleteError, "删除更新日志失败"))
    } finally {
      setDeleting(false)
    }
  }

  if (loading) {
    return (
      <div className="rounded-xl border border-border bg-card px-5 py-6 text-sm text-muted-foreground">
        加载中…
      </div>
    )
  }

  if (error) {
    return (
      <StatePanel
        status="error"
        title="获取更新日志失败"
        description={error}
      />
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 xl:flex-row xl:items-end">
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">更新日志</h1>
          <p className="text-sm text-muted-foreground">
            从本地 Git 提交生成 AI 草稿，审核编辑后发布到公开更新日志页。
          </p>
        </div>
        <div className="flex flex-wrap items-end gap-3 rounded-xl border border-border bg-card p-3">
          <div className="space-y-1.5">
            <Label className="text-xs">生成日期</Label>
            <Input
              type="date"
              value={generateDate}
              onChange={(event) => setGenerateDate(event.target.value)}
              className="w-[160px]"
            />
          </div>
          <Button onClick={() => void handleGenerate(false)} disabled={generating || !generateDate}>
            {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            生成草稿
          </Button>
          <Button variant="secondary" onClick={() => void handleGenerate(true)} disabled={generating || !generateDate}>
            <RefreshCw className="h-4 w-4" />
            重新生成
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-end gap-3 rounded-xl border border-border bg-card p-4">
        <div className="space-y-1.5">
          <Label className="text-xs">状态</Label>
          <Select value={status} onValueChange={(value) => setStatus(value as StatusFilter)}>
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部</SelectItem>
              <SelectItem value="draft">草稿</SelectItem>
              <SelectItem value="published">已发布</SelectItem>
              <SelectItem value="archived">已归档</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">开始日期</Label>
          <Input type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} className="w-[160px]" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">结束日期</Label>
          <Input type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} className="w-[160px]" />
        </div>
        <div className="min-w-[220px] flex-1 space-y-1.5">
          <Label className="text-xs">关键词</Label>
          <Input value={keyword} onChange={(event) => setKeyword(event.target.value)} placeholder="标题或正文" />
        </div>
        <Button variant="secondary" onClick={() => void load(true)} disabled={refreshing}>
          {refreshing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          刷新
        </Button>
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-border bg-muted/35 text-xs text-muted-foreground">
            <tr>
              <th className="px-4 py-3 font-medium">日期</th>
              <th className="px-4 py-3 font-medium">标题</th>
              <th className="px-4 py-3 font-medium">状态</th>
              <th className="px-4 py-3 font-medium">Commits</th>
              <th className="px-4 py-3 font-medium">模型</th>
              <th className="px-4 py-3 font-medium">最近更新</th>
              <th className="w-[260px] px-4 py-3 text-right font-medium">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {items.map((entry) => (
              <tr key={entry.id} className="hover:bg-muted/20">
                <td className="px-4 py-4 text-muted-foreground">
                  <span className="inline-flex items-center gap-2">
                    <CalendarDays className="h-4 w-4" />
                    {entry.logDate}
                  </span>
                </td>
                <td className="max-w-[360px] px-4 py-4 font-medium text-foreground">
                  <span className="line-clamp-1">{entry.title}</span>
                </td>
                <td className="px-4 py-4">
                  <Badge variant={STATUS_BADGES[entry.status]}>{STATUS_LABELS[entry.status]}</Badge>
                </td>
                <td className="px-4 py-4 text-muted-foreground">{entry.commitCount}</td>
                <td className="px-4 py-4 text-muted-foreground">{entry.modelCodeSnapshot ?? "未生成"}</td>
                <td className="px-4 py-4 text-muted-foreground">{formatDateTime(entry.updatedAt)}</td>
                <td className="px-4 py-4">
                  <div className="flex flex-wrap justify-end gap-2">
                    <Button variant="ghost" size="sm" onClick={() => openSheet(entry, "view")}>
                      <Eye className="h-4 w-4" />
                      查看
                    </Button>
                    <Button variant="secondary" size="sm" onClick={() => openEditSheet(entry)}>
                      <PenLine className="h-4 w-4" />
                      编辑
                    </Button>
                    <Button variant="destructiveSoft" size="sm" onClick={() => setDeleteTarget(entry)}>
                      <Trash2 className="h-4 w-4" />
                      删除
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
            {items.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-14 text-center text-sm text-muted-foreground">
                  暂无更新日志
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent side="right" className="w-full sm:max-w-3xl xl:max-w-[48vw]">
          <SheetHeader className="border-b border-border px-6 py-5">
            <SheetTitle>更新日志详情</SheetTitle>
            <SheetDescription>
              {selected ? `${selected.logDate} · ${STATUS_LABELS[selected.status]}` : "查看草稿、发布内容和生成来源"}
            </SheetDescription>
          </SheetHeader>
          {selected && form ? (
            <div className="h-[calc(100vh-9.5rem)] overflow-y-auto px-6 py-5">
              <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
                <div className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-[1fr_160px]">
                    <div className="space-y-2">
                      <Label>标题</Label>
                      <Input
                        value={form.title}
                        onChange={(event) => setForm((prev) => prev ? { ...prev, title: event.target.value } : prev)}
                        disabled={sheetMode === "view" || !canEditSelected}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>状态</Label>
                      <div className="flex h-10 items-center">
                        <Badge variant={STATUS_BADGES[selected.status]}>{STATUS_LABELS[selected.status]}</Badge>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-3">
                      <Label>Markdown 内容</Label>
                      <span className="text-xs text-muted-foreground">{form.summaryMarkdown.length} 字符</span>
                    </div>
                    <Textarea
                      value={form.summaryMarkdown}
                      onChange={(event) => setForm((prev) => prev ? { ...prev, summaryMarkdown: event.target.value } : prev)}
                      variant="code"
                      rows={20}
                      spellCheck={false}
                      disabled={sheetMode === "view" || !canEditSelected}
                    />
                  </div>
                  <div className="rounded-xl border border-border bg-muted/25 p-4">
                    <div className="flex items-center gap-2 text-sm font-medium">
                      <FileClock className="h-4 w-4 text-primary" />
                      生成来源
                    </div>
                    <dl className="mt-3 grid gap-2 text-xs text-muted-foreground sm:grid-cols-2">
                      <div>Agent：{selected.generatedByAgentCode ?? "未生成"}</div>
                      <div>模型：{selected.modelCodeSnapshot ?? "未生成"}</div>
                      <div>Commit 范围：{selected.commitFromSha ?? "-"} → {selected.commitToSha ?? "-"}</div>
                      <div>调用记录：{selected.llmInvocationId ?? "暂无"}</div>
                    </dl>
                    <div className="mt-4 max-h-48 space-y-2 overflow-y-auto">
                      {selected.sourceCommits.map((commit) => (
                        <div key={commit.sha} className="rounded-lg border border-border bg-background px-3 py-2 text-xs">
                          <div className="font-medium text-foreground">{commit.subject}</div>
                          <div className="mt-1 text-muted-foreground">{commit.shortSha} · {commit.authorName} · {formatDateTime(commit.committedAt)}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-3 border-b border-border pb-3">
                    <h2 className="text-base font-semibold">预览</h2>
                    <span className="rounded-full bg-muted px-3 py-1 text-xs text-muted-foreground">Markdown</span>
                  </div>
                  <div className={cn("max-h-[680px] overflow-y-auto pr-1", sheetMode === "edit" && "rounded-xl border border-border bg-background p-4")}>
                    <MarkdownContent content={form.summaryMarkdown} />
                  </div>
                </div>
              </div>
            </div>
          ) : null}
          <SheetFooter className="border-t border-border px-6 py-4 sm:flex-row sm:justify-between">
            <div className="flex gap-2">
              {selected ? (
                <Button variant="destructiveSoft" onClick={() => setDeleteTarget(selected)} disabled={deleting}>
                  {deleting && deleteTarget?.id === selected.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                  删除
                </Button>
              ) : null}
              {selected?.status !== "archived" ? (
                <Button variant="outline" onClick={() => void handleArchive()} disabled={archiving}>
                  {archiving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Archive className="h-4 w-4" />}
                  归档
                </Button>
              ) : null}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setSheetOpen(false)}>关闭</Button>
              {sheetMode === "view" && selected?.status !== "archived" ? (
                <Button variant="secondary" onClick={() => setSheetMode("edit")}>
                  <PenLine className="h-4 w-4" />
                  编辑
                </Button>
              ) : null}
              {sheetMode === "edit" && selected?.status !== "archived" ? (
                <Button onClick={() => void handleSave()} disabled={saving}>
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  保存
                </Button>
              ) : null}
              {selected?.status === "draft" ? (
                <Button
                  onClick={() => {
                    if (hasUnsavedChanges) {
                      toast.info("保存后发布", "当前编辑内容尚未保存，请先保存草稿再发布。")
                      return
                    }
                    setPublishTarget(selected)
                  }}
                  disabled={saving}
                >
                  <Rocket className="h-4 w-4" />
                  发布
                </Button>
              ) : null}
            </div>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <Dialog open={Boolean(publishTarget)} onOpenChange={(open) => !open && setPublishTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>确认发布更新日志</DialogTitle>
            <DialogDescription>
              发布后，用户将在公开的 /changelog 页面看到这篇更新日志。请确认标题、正文和敏感信息已经审核完成。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPublishTarget(null)} disabled={publishing}>取消</Button>
            <Button onClick={() => void handlePublish()} disabled={publishing}>
              {publishing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Rocket className="h-4 w-4" />}
              确认发布
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(deleteTarget)} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>确认删除更新日志</DialogTitle>
            <DialogDescription>
              删除后，该日志会从管理后台和用户端公开更新日志中移除。此操作不会删除 Git 提交记录。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)} disabled={deleting}>取消</Button>
            <Button variant="destructive" onClick={() => void handleDelete()} disabled={deleting}>
              {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
              确认删除
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
