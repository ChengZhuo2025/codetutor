"use client"

import { useEffect, useMemo, useState } from "react"
import {
  Bell,
  BookOpen,
  CreditCard,
  Eye,
  FileQuestion,
  GraduationCap,
  HelpCircle,
  History,
  Lightbulb,
  Loader2,
  MapIcon,
  MessageSquare,
  Pencil,
  Plus,
  Route,
  Save,
  Settings,
  ShieldQuestion,
  Sparkles,
  Trophy,
  UserRound,
  type LucideIcon,
} from "lucide-react"
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
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { StatePanel } from "@/components/ui/state-panel"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { useAppToast } from "@/components/app-feedback/app-toast-provider"
import { useAdminSessionExpiryRedirect } from "@/features/admin-shell/lib/use-admin-session-expiry-redirect"
import { MarkdownContent } from "@/features/site/components/markdown-content"
import { DEFAULT_HELP_CENTER } from "@/features/site/data/default-site"
import type {
  AdminSiteHelpCategoryListResponseData,
  AdminSiteHelpCategoryResponseData,
  AdminSiteHelpItemListResponseData,
  AdminSiteHelpItemResponseData,
  CreateSiteHelpCategoryRequest,
  CreateSiteHelpItemRequest,
  UpdateSiteHelpCategoryRequest,
  UpdateSiteHelpItemRequest,
} from "@/lib/api/contracts/admin-site"
import {
  adminRequestData,
  getAdminApiErrorMessage,
  isAdminSessionExpiredError,
} from "@/lib/api/admin-bff-client"
import { cn } from "@/lib/utils"

type CategoryForm = {
  title: string
  description: string
  iconKey: string
  displayOrder: string
  enabled: boolean
}

type ItemForm = {
  question: string
  answerMarkdown: string
  displayOrder: string
  enabled: boolean
}

type ItemSheetMode = "view" | "edit"

const NEW_CATEGORY_ID = "__new_category__"
const NEW_ITEM_ID = "__new_item__"

const HELP_CENTER_ICON_OPTIONS = [
  { key: "sparkles", label: "开始", icon: Sparkles },
  { key: "history", label: "记录", icon: History },
  { key: "credit-card", label: "订单", icon: CreditCard },
  { key: "message-square", label: "反馈", icon: MessageSquare },
  { key: "help-circle", label: "帮助", icon: HelpCircle },
  { key: "book-open", label: "文档", icon: BookOpen },
  { key: "map", label: "地图", icon: MapIcon },
  { key: "trophy", label: "成就", icon: Trophy },
  { key: "user-round", label: "账号", icon: UserRound },
  { key: "bell", label: "提醒", icon: Bell },
  { key: "settings", label: "设置", icon: Settings },
  { key: "lightbulb", label: "提示", icon: Lightbulb },
  { key: "shield-question", label: "安全", icon: ShieldQuestion },
  { key: "file-question", label: "问题", icon: FileQuestion },
  { key: "route", label: "路径", icon: Route },
  { key: "graduation-cap", label: "学习", icon: GraduationCap },
] satisfies Array<{ key: string; label: string; icon: LucideIcon }>

const HELP_CENTER_ICON_MAP = new Map(
  HELP_CENTER_ICON_OPTIONS.map((option) => [option.key, option.icon]),
)

function getHelpCenterIcon(iconKey: string | null | undefined) {
  return HELP_CENTER_ICON_MAP.get(iconKey ?? "") ?? HelpCircle
}

function toCategoryForm(category: AdminSiteHelpCategoryResponseData): CategoryForm {
  return {
    title: category.title,
    description: category.description ?? "",
    iconKey: category.iconKey,
    displayOrder: String(category.displayOrder),
    enabled: category.enabled,
  }
}

function toItemForm(item: AdminSiteHelpItemResponseData): ItemForm {
  return {
    question: item.question,
    answerMarkdown: item.answerMarkdown,
    displayOrder: String(item.displayOrder),
    enabled: item.enabled,
  }
}

function createEmptyCategoryForm(nextOrder: number): CategoryForm {
  return {
    title: "",
    description: "",
    iconKey: "help-circle",
    displayOrder: String(nextOrder),
    enabled: true,
  }
}

function createEmptyItemForm(nextOrder: number): ItemForm {
  return {
    question: "",
    answerMarkdown: "",
    displayOrder: String(nextOrder),
    enabled: true,
  }
}

function toOrder(value: string) {
  const numeric = Number(value)
  return Number.isInteger(numeric) && numeric >= 0 ? numeric : 0
}

function formatDateTime(iso: string | null) {
  if (!iso) return "暂无"

  return new Intl.DateTimeFormat("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso))
}

function getFallbackCategories(): AdminSiteHelpCategoryResponseData[] {
  return DEFAULT_HELP_CENTER.categories.map((category) => ({
    ...category,
    updatedByAdminId: null,
  }))
}

function getFallbackItems(): AdminSiteHelpItemResponseData[] {
  return DEFAULT_HELP_CENTER.categories.flatMap((category) =>
    category.items.map((item) => ({
      ...item,
      updatedByAdminId: null,
    })),
  )
}

function StatusPill({ enabled }: { enabled: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex rounded-full border px-2 py-0.5 text-xs font-medium",
        enabled
          ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
          : "border-border bg-muted/60 text-muted-foreground",
      )}
    >
      {enabled ? "已启用" : "已停用"}
    </span>
  )
}

export function SiteHelpCenterPage() {
  const toast = useAppToast()
  const [authExpired, setAuthExpired] = useState(false)
  useAdminSessionExpiryRedirect(authExpired)

  const [categories, setCategories] = useState<AdminSiteHelpCategoryResponseData[]>(getFallbackCategories)
  const [items, setItems] = useState<AdminSiteHelpItemResponseData[]>(getFallbackItems)
  const [activeCategoryId, setActiveCategoryId] = useState<string>(DEFAULT_HELP_CENTER.categories[0]?.id ?? "")
  const [editingCategoryId, setEditingCategoryId] = useState<string>(NEW_CATEGORY_ID)
  const [editingItemId, setEditingItemId] = useState<string>(NEW_ITEM_ID)
  const [categoryForm, setCategoryForm] = useState<CategoryForm>(() => toCategoryForm(getFallbackCategories()[0]))
  const [itemForm, setItemForm] = useState<ItemForm>(() => toItemForm(getFallbackItems()[0]))
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false)
  const [itemSheetOpen, setItemSheetOpen] = useState(false)
  const [itemSheetMode, setItemSheetMode] = useState<ItemSheetMode>("view")
  const [loading, setLoading] = useState(true)
  const [savingCategory, setSavingCategory] = useState(false)
  const [savingItem, setSavingItem] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const activeCategory = useMemo(
    () => categories.find((category) => category.id === activeCategoryId) ?? null,
    [categories, activeCategoryId],
  )
  const activeItems = useMemo(
    () => items.filter((item) => item.categoryId === activeCategoryId),
    [items, activeCategoryId],
  )
  const activeItem = useMemo(
    () => items.find((item) => item.id === editingItemId) ?? null,
    [editingItemId, items],
  )
  const answerCharacterCount = itemForm.answerMarkdown.length

  const selectCategory = (categoryId: string, nextCategories = categories) => {
    if (!nextCategories.some((category) => category.id === categoryId)) return
    setActiveCategoryId(categoryId)
  }

  const load = async () => {
    setLoading(true)
    setError(null)
    try {
      const [categoryResult, itemResult] = await Promise.all([
        adminRequestData<AdminSiteHelpCategoryListResponseData>(
          "/admin/site/help/categories",
          undefined,
          "获取帮助分类失败",
        ),
        adminRequestData<AdminSiteHelpItemListResponseData>(
          "/admin/site/help/items",
          undefined,
          "获取帮助内容失败",
        ),
      ])

      const nextCategories = categoryResult.items
      setCategories(nextCategories)
      setItems(itemResult.items)
      setActiveCategoryId((current) =>
        nextCategories.some((category) => category.id === current)
          ? current
          : nextCategories[0]?.id ?? "",
      )
    } catch (loadError) {
      setAuthExpired(isAdminSessionExpiredError(loadError))
      setError(getAdminApiErrorMessage(loadError, "获取帮助中心失败"))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [])

  const updateCategoryForm = <Field extends keyof CategoryForm>(field: Field, value: CategoryForm[Field]) => {
    setCategoryForm((prev) => ({
      ...prev,
      [field]: value,
    }))
  }

  const updateItemForm = <Field extends keyof ItemForm>(field: Field, value: ItemForm[Field]) => {
    setItemForm((prev) => ({
      ...prev,
      [field]: value,
    }))
  }

  const openCategoryDialog = (category?: AdminSiteHelpCategoryResponseData) => {
    if (category) {
      setEditingCategoryId(category.id)
      setCategoryForm(toCategoryForm(category))
    } else {
      const maxOrder = Math.max(0, ...categories.map((entry) => entry.displayOrder))
      setEditingCategoryId(NEW_CATEGORY_ID)
      setCategoryForm(createEmptyCategoryForm(maxOrder + 10))
    }
    setCategoryDialogOpen(true)
  }

  const openItemSheet = (mode: ItemSheetMode, item?: AdminSiteHelpItemResponseData) => {
    if (item) {
      setEditingItemId(item.id)
      setItemForm(toItemForm(item))
    } else {
      const maxOrder = Math.max(0, ...activeItems.map((entry) => entry.displayOrder))
      setEditingItemId(NEW_ITEM_ID)
      setItemForm(createEmptyItemForm(maxOrder + 10))
    }
    setItemSheetMode(mode)
    setItemSheetOpen(true)
  }

  const saveCategory = async () => {
    const payload: CreateSiteHelpCategoryRequest | UpdateSiteHelpCategoryRequest = {
      title: categoryForm.title,
      description: categoryForm.description.trim() || null,
      iconKey: categoryForm.iconKey,
      displayOrder: toOrder(categoryForm.displayOrder),
      enabled: categoryForm.enabled,
    }

    setSavingCategory(true)
    try {
      const result = await adminRequestData<AdminSiteHelpCategoryResponseData>(
        editingCategoryId === NEW_CATEGORY_ID
          ? "/admin/site/help/categories"
          : `/admin/site/help/categories/${editingCategoryId}`,
        {
          method: editingCategoryId === NEW_CATEGORY_ID ? "POST" : "PATCH",
          body: JSON.stringify(payload),
        },
        "保存帮助分类失败",
      )

      const nextCategories =
        editingCategoryId === NEW_CATEGORY_ID
          ? [...categories, result].sort((a, b) => a.displayOrder - b.displayOrder)
          : categories
              .map((category) => (category.id === result.id ? result : category))
              .sort((a, b) => a.displayOrder - b.displayOrder)

      setCategories(nextCategories)
      selectCategory(result.id, nextCategories)
      setCategoryDialogOpen(false)
      toast.success("帮助分类已保存")
    } catch (saveError) {
      setAuthExpired(isAdminSessionExpiredError(saveError))
      toast.error(getAdminApiErrorMessage(saveError, "保存帮助分类失败"))
    } finally {
      setSavingCategory(false)
    }
  }

  const toggleCategoryEnabled = async (
    category: AdminSiteHelpCategoryResponseData,
    enabled: boolean,
  ) => {
    setSavingCategory(true)
    try {
      const result = await adminRequestData<AdminSiteHelpCategoryResponseData>(
        `/admin/site/help/categories/${category.id}`,
        {
          method: "PATCH",
          body: JSON.stringify({ enabled }),
        },
        "更新帮助分类状态失败",
      )

      const nextCategories = categories
        .map((entry) => (entry.id === result.id ? result : entry))
        .sort((a, b) => a.displayOrder - b.displayOrder)

      setCategories(nextCategories)
      toast.success(result.enabled ? "帮助分类已启用" : "帮助分类已停用")
    } catch (saveError) {
      setAuthExpired(isAdminSessionExpiredError(saveError))
      toast.error(getAdminApiErrorMessage(saveError, "更新帮助分类状态失败"))
    } finally {
      setSavingCategory(false)
    }
  }

  const saveItem = async () => {
    if (!activeCategory) {
      toast.error("请先保存帮助分类")
      return
    }

    const payload: CreateSiteHelpItemRequest | UpdateSiteHelpItemRequest = {
      categoryId: activeCategory.id,
      question: itemForm.question,
      answerMarkdown: itemForm.answerMarkdown,
      displayOrder: toOrder(itemForm.displayOrder),
      enabled: itemForm.enabled,
    }

    setSavingItem(true)
    try {
      const result = await adminRequestData<AdminSiteHelpItemResponseData>(
        editingItemId === NEW_ITEM_ID
          ? "/admin/site/help/items"
          : `/admin/site/help/items/${editingItemId}`,
        {
          method: editingItemId === NEW_ITEM_ID ? "POST" : "PATCH",
          body: JSON.stringify(payload),
        },
        "保存帮助内容失败",
      )

      const nextItems =
        editingItemId === NEW_ITEM_ID
          ? [...items, result].sort((a, b) => a.displayOrder - b.displayOrder)
          : items
              .map((item) => (item.id === result.id ? result : item))
              .sort((a, b) => a.displayOrder - b.displayOrder)

      setItems(nextItems)
      setEditingItemId(result.id)
      setItemForm(toItemForm(result))
      setItemSheetOpen(false)
      toast.success("帮助内容已保存")
    } catch (saveError) {
      setAuthExpired(isAdminSessionExpiredError(saveError))
      toast.error(getAdminApiErrorMessage(saveError, "保存帮助内容失败"))
    } finally {
      setSavingItem(false)
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
        title="获取帮助中心失败"
        description={error}
      />
    )
  }

  return (
    <>
      <div className="space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-2">
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">帮助中心</h1>
            <p className="text-sm text-muted-foreground">
              维护用户端帮助弹窗中的分类与常见问题，编辑动作集中在弹窗和右侧抽屉中完成。
            </p>
          </div>
          <Button variant="secondary" onClick={() => openCategoryDialog()}>
            <Plus className="h-4 w-4" />
            新建分类
          </Button>
        </div>

        <div className="grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)]">
          <aside className="space-y-4 rounded-xl border border-border bg-card p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold">分类</h2>
                <p className="mt-1 text-xs text-muted-foreground">{categories.length} 个分类</p>
              </div>
            </div>

            <div className="space-y-2">
              {categories.map((category) => {
                const CategoryIcon = getHelpCenterIcon(category.iconKey)

                return (
                  <div
                    key={category.id}
                    className={cn(
                      "rounded-xl border transition-colors",
                      activeCategoryId === category.id
                        ? "border-brand/40 bg-brand/10"
                        : "border-border bg-surface-2 hover:border-brand/30",
                    )}
                  >
                    <div className="flex items-center gap-2 px-3 py-3">
                      <button
                        type="button"
                        onClick={() => selectCategory(category.id)}
                        className="flex min-w-0 flex-1 items-center gap-3 text-left"
                      >
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-background text-muted-foreground">
                          <CategoryIcon className="h-4 w-4" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-semibold text-foreground">{category.title}</span>
                          <span className="mt-0.5 block text-xs text-muted-foreground">
                            排序 {category.displayOrder}
                          </span>
                        </span>
                      </button>
                      <Switch
                        checked={category.enabled}
                        disabled={savingCategory}
                        aria-label={`${category.title}启用状态`}
                        onCheckedChange={(checked) => void toggleCategoryEnabled(category, checked)}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 shrink-0"
                        aria-label={`编辑${category.title}`}
                        onClick={() => openCategoryDialog(category)}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                )
              })}
              {!categories.length ? (
                <div className="rounded-xl border border-dashed border-border bg-muted/20 px-4 py-8 text-center text-sm text-muted-foreground">
                  暂无分类
                </div>
              ) : null}
            </div>
          </aside>

          <section className="overflow-hidden rounded-xl border border-border bg-card">
            <div className="flex flex-col gap-3 border-b border-border px-5 py-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-base font-semibold">{activeCategory?.title ?? "未选择分类"}</h2>
                  {activeCategory ? <StatusPill enabled={activeCategory.enabled} /> : null}
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  当前分类下的问题：{activeItems.length} 个
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={!activeCategory}
                  onClick={() => activeCategory && openCategoryDialog(activeCategory)}
                >
                  <Pencil className="h-4 w-4" />
                  编辑分类
                </Button>
                <Button
                  type="button"
                  size="sm"
                  disabled={!activeCategory}
                  onClick={() => openItemSheet("edit")}
                >
                  <Plus className="h-4 w-4" />
                  新建问题
                </Button>
              </div>
            </div>

            {activeItems.length ? (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[820px] table-fixed" aria-label="当前分类下的问题">
                  <thead className="bg-muted/40">
                    <tr className="border-b border-border">
                      <th className="w-[38%] px-4 py-3 text-left text-xs font-medium text-muted-foreground">问题</th>
                      <th className="w-[12%] px-4 py-3 text-left text-xs font-medium text-muted-foreground">排序</th>
                      <th className="w-[14%] px-4 py-3 text-left text-xs font-medium text-muted-foreground">状态</th>
                      <th className="w-[14%] px-4 py-3 text-left text-xs font-medium text-muted-foreground">最近更新</th>
                      <th className="w-[22%] px-4 py-3 text-right text-xs font-medium text-muted-foreground">操作</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {activeItems.map((item) => (
                      <tr key={item.id} className="transition-colors hover:bg-muted/20">
                        <td className="px-4 py-4 align-top">
                          <p className="line-clamp-2 text-sm font-medium text-foreground">{item.question}</p>
                          <p className="mt-1 text-xs text-muted-foreground">{item.answerMarkdown.length} 字符</p>
                        </td>
                        <td className="px-4 py-4 align-top text-sm text-foreground">{item.displayOrder}</td>
                        <td className="px-4 py-4 align-top">
                          <StatusPill enabled={item.enabled} />
                        </td>
                        <td className="px-4 py-4 align-top text-sm text-muted-foreground">{formatDateTime(item.updatedAt)}</td>
                        <td className="px-4 py-4 align-top">
                          <div className="flex flex-nowrap items-center justify-end gap-2">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="h-8 px-2.5"
                              onClick={() => openItemSheet("view", item)}
                            >
                              <Eye className="h-3.5 w-3.5" />
                              查看
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              className="h-8 px-2.5"
                              onClick={() => openItemSheet("edit", item)}
                            >
                              <Pencil className="h-3.5 w-3.5" />
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
              <div className="p-5">
                <StatePanel
                  status="empty"
                  title={activeCategory ? "暂无问题" : "暂无分类"}
                  description={activeCategory ? "当前分类下还没有帮助问题。" : "请先新建帮助分类，再添加问题。"}
                  actionLabel={activeCategory ? "新建问题" : "新建分类"}
                  onAction={() => {
                    if (activeCategory) {
                      openItemSheet("edit")
                    } else {
                      openCategoryDialog()
                    }
                  }}
                />
              </div>
            )}
          </section>
        </div>
      </div>

      <Dialog open={categoryDialogOpen} onOpenChange={setCategoryDialogOpen}>
        <DialogContent className="p-0 sm:max-w-[560px]">
          <DialogHeader className="border-b border-border px-6 py-5">
            <DialogTitle>分类设置</DialogTitle>
            <DialogDescription>
              停用分类后，该分类下所有问题都不会在用户端展示。
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 px-6 py-5 md:grid-cols-[minmax(0,1fr)_140px]">
            <div className="space-y-2">
              <Label htmlFor="help-category-title">分类名称</Label>
              <Input
                id="help-category-title"
                value={categoryForm.title}
                onChange={(event) => updateCategoryForm("title", event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="help-category-order">排序</Label>
              <Input
                id="help-category-order"
                type="number"
                min={0}
                value={categoryForm.displayOrder}
                onChange={(event) => updateCategoryForm("displayOrder", event.target.value)}
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>分类图标</Label>
              <div className="grid grid-cols-4 gap-2 sm:grid-cols-8">
                {HELP_CENTER_ICON_OPTIONS.map((option) => {
                  const Icon = option.icon
                  const selected = categoryForm.iconKey === option.key

                  return (
                    <Button
                      key={option.key}
                      type="button"
                      variant={selected ? "secondary" : "outline"}
                      size="icon"
                      className={cn("h-10 w-full", selected && "border-brand/50 text-brand")}
                      aria-label={`选择${option.label}图标`}
                      title={option.label}
                      onClick={() => updateCategoryForm("iconKey", option.key)}
                    >
                      <Icon className="h-4 w-4" />
                    </Button>
                  )
                })}
              </div>
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="help-category-description">分类描述</Label>
              <Input
                id="help-category-description"
                value={categoryForm.description}
                onChange={(event) => updateCategoryForm("description", event.target.value)}
              />
            </div>
            <div className="flex items-center justify-between gap-4 rounded-xl border border-border bg-surface-2 px-4 py-3 md:col-span-2">
              <div>
                <p className="text-sm font-medium text-foreground">启用分类</p>
                <p className="mt-1 text-xs text-muted-foreground">关闭后前台不展示该分类及其问题。</p>
              </div>
              <Switch checked={categoryForm.enabled} onCheckedChange={(checked) => updateCategoryForm("enabled", checked)} />
            </div>
          </div>
          <DialogFooter className="border-t border-border bg-muted/15 px-6 py-4">
            <Button type="button" variant="outline" onClick={() => setCategoryDialogOpen(false)} disabled={savingCategory}>
              取消
            </Button>
            <Button type="button" onClick={() => void saveCategory()} disabled={savingCategory}>
              {savingCategory ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              保存分类
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Sheet open={itemSheetOpen} onOpenChange={setItemSheetOpen}>
        <SheetContent side="right" className="w-full sm:max-w-xl xl:max-w-[42vw]">
          <SheetHeader className="border-b border-border px-6 py-5">
            <SheetTitle>问题详情</SheetTitle>
            <SheetDescription>
              {activeCategory ? `当前分类：${activeCategory.title}` : "查看或编辑帮助中心问题。"}
            </SheetDescription>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto px-6 py-5">
            {itemSheetMode === "view" ? (
              <div className="space-y-5">
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusPill enabled={activeItem?.enabled ?? itemForm.enabled} />
                    <span className="text-xs text-muted-foreground">排序 {activeItem?.displayOrder ?? itemForm.displayOrder}</span>
                  </div>
                  <h3 className="text-lg font-semibold leading-7 text-foreground">{activeItem?.question ?? itemForm.question}</h3>
                  <p className="text-xs text-muted-foreground">
                    上次更新：{formatDateTime(activeItem?.updatedAt ?? null)}
                  </p>
                </div>
                <div className="rounded-xl border border-border bg-surface-2 p-4">
                  <div className="mb-4 flex items-center justify-between gap-3 border-b border-border pb-3">
                    <h4 className="text-sm font-semibold">Markdown 预览</h4>
                    <span className="rounded-full bg-muted px-3 py-1 text-xs text-muted-foreground">
                      {activeItem?.answerMarkdown.length ?? itemForm.answerMarkdown.length} 字符
                    </span>
                  </div>
                  <MarkdownContent content={(activeItem?.answerMarkdown ?? itemForm.answerMarkdown) || " "} />
                </div>
              </div>
            ) : (
              <div className="space-y-5">
                <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_140px]">
                  <div className="space-y-2">
                    <Label htmlFor="help-item-question">问题</Label>
                    <Input
                      id="help-item-question"
                      value={itemForm.question}
                      onChange={(event) => updateItemForm("question", event.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="help-item-order">排序</Label>
                    <Input
                      id="help-item-order"
                      type="number"
                      min={0}
                      value={itemForm.displayOrder}
                      onChange={(event) => updateItemForm("displayOrder", event.target.value)}
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between gap-4 rounded-xl border border-border bg-surface-2 px-4 py-3">
                  <div>
                    <p className="text-sm font-medium text-foreground">启用问题</p>
                    <p className="mt-1 text-xs text-muted-foreground">关闭后仅隐藏当前问题。</p>
                  </div>
                  <Switch checked={itemForm.enabled} onCheckedChange={(checked) => updateItemForm("enabled", checked)} />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-3">
                    <Label htmlFor="help-item-answer">Markdown 内容</Label>
                    <span className="text-xs text-muted-foreground">{answerCharacterCount} 字符</span>
                  </div>
                  <Textarea
                    id="help-item-answer"
                    value={itemForm.answerMarkdown}
                    onChange={(event) => updateItemForm("answerMarkdown", event.target.value)}
                    variant="code"
                    rows={16}
                    spellCheck={false}
                  />
                </div>

                <div className="rounded-xl border border-border bg-surface-2 p-4">
                  <div className="mb-4 flex items-center justify-between gap-3 border-b border-border pb-3">
                    <h4 className="text-sm font-semibold">预览</h4>
                    <span className="rounded-full bg-muted px-3 py-1 text-xs text-muted-foreground">Markdown</span>
                  </div>
                  <div className="max-h-[360px] overflow-y-auto pr-1">
                    <MarkdownContent content={itemForm.answerMarkdown || " "} />
                  </div>
                </div>
              </div>
            )}
          </div>

          <SheetFooter className="border-t border-border px-6 py-4 sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" onClick={() => setItemSheetOpen(false)} disabled={savingItem}>
              关闭
            </Button>
            {itemSheetMode === "view" ? (
              <Button
                type="button"
                onClick={() => {
                  if (activeItem) {
                    setItemForm(toItemForm(activeItem))
                    setItemSheetMode("edit")
                  }
                }}
              >
                <Pencil className="h-4 w-4" />
                编辑
              </Button>
            ) : (
              <Button type="button" onClick={() => void saveItem()} disabled={savingItem || !activeCategory}>
                {savingItem ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                保存问题
              </Button>
            )}
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </>
  )
}
