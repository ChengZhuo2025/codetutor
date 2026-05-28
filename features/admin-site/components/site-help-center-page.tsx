"use client"

import { useEffect, useMemo, useState } from "react"
import { FileQuestion, Loader2, Plus, Save } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
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
  displayOrder: string
  enabled: boolean
}

type ItemForm = {
  question: string
  answerMarkdown: string
  displayOrder: string
  enabled: boolean
}

const NEW_CATEGORY_ID = "__new_category__"
const NEW_ITEM_ID = "__new_item__"

function toCategoryForm(category: AdminSiteHelpCategoryResponseData): CategoryForm {
  return {
    title: category.title,
    description: category.description ?? "",
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

export function SiteHelpCenterPage() {
  const toast = useAppToast()
  const [authExpired, setAuthExpired] = useState(false)
  useAdminSessionExpiryRedirect(authExpired)

  const [categories, setCategories] = useState<AdminSiteHelpCategoryResponseData[]>(getFallbackCategories)
  const [items, setItems] = useState<AdminSiteHelpItemResponseData[]>(getFallbackItems)
  const [activeCategoryId, setActiveCategoryId] = useState<string>(DEFAULT_HELP_CENTER.categories[0]?.id ?? NEW_CATEGORY_ID)
  const [activeItemId, setActiveItemId] = useState<string>(DEFAULT_HELP_CENTER.categories[0]?.items[0]?.id ?? NEW_ITEM_ID)
  const [categoryForm, setCategoryForm] = useState<CategoryForm>(() => toCategoryForm(getFallbackCategories()[0]))
  const [itemForm, setItemForm] = useState<ItemForm>(() => toItemForm(getFallbackItems()[0]))
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
    () => items.find((item) => item.id === activeItemId) ?? null,
    [items, activeItemId],
  )
  const answerCharacterCount = useMemo(
    () => itemForm.answerMarkdown.length,
    [itemForm.answerMarkdown],
  )

  const selectCategory = (categoryId: string, nextCategories = categories, nextItems = items) => {
    const category = nextCategories.find((item) => item.id === categoryId)
    if (!category) return

    setActiveCategoryId(category.id)
    setCategoryForm(toCategoryForm(category))

    const firstItem = nextItems.find((item) => item.categoryId === category.id)
    if (firstItem) {
      setActiveItemId(firstItem.id)
      setItemForm(toItemForm(firstItem))
    } else {
      setActiveItemId(NEW_ITEM_ID)
      setItemForm(createEmptyItemForm(10))
    }
  }

  const selectItem = (itemId: string) => {
    const item = items.find((entry) => entry.id === itemId)
    if (!item) return
    setActiveItemId(item.id)
    setItemForm(toItemForm(item))
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
      const nextItems = itemResult.items
      setCategories(nextCategories)
      setItems(nextItems)

      if (nextCategories[0]) {
        selectCategory(nextCategories[0].id, nextCategories, nextItems)
      } else {
        setActiveCategoryId(NEW_CATEGORY_ID)
        setActiveItemId(NEW_ITEM_ID)
        setCategoryForm(createEmptyCategoryForm(10))
        setItemForm(createEmptyItemForm(10))
      }
    } catch (loadError) {
      setAuthExpired(isAdminSessionExpiredError(loadError))
      setError(getAdminApiErrorMessage(loadError, "获取帮助中心失败"))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
    // eslint-disable-next-line react-hooks/exhaustive-deps -- initial load
  }, [])

  const startNewCategory = () => {
    const maxOrder = Math.max(0, ...categories.map((category) => category.displayOrder))
    setActiveCategoryId(NEW_CATEGORY_ID)
    setActiveItemId(NEW_ITEM_ID)
    setCategoryForm(createEmptyCategoryForm(maxOrder + 10))
    setItemForm(createEmptyItemForm(10))
  }

  const startNewItem = () => {
    const maxOrder = Math.max(0, ...activeItems.map((item) => item.displayOrder))
    setActiveItemId(NEW_ITEM_ID)
    setItemForm(createEmptyItemForm(maxOrder + 10))
  }

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

  const saveCategory = async () => {
    const payload: CreateSiteHelpCategoryRequest | UpdateSiteHelpCategoryRequest = {
      title: categoryForm.title,
      description: categoryForm.description.trim() || null,
      displayOrder: toOrder(categoryForm.displayOrder),
      enabled: categoryForm.enabled,
    }

    setSavingCategory(true)
    try {
      const result = await adminRequestData<AdminSiteHelpCategoryResponseData>(
        activeCategoryId === NEW_CATEGORY_ID
          ? "/admin/site/help/categories"
          : `/admin/site/help/categories/${activeCategoryId}`,
        {
          method: activeCategoryId === NEW_CATEGORY_ID ? "POST" : "PATCH",
          body: JSON.stringify(payload),
        },
        "保存帮助分类失败",
      )

      const nextCategories =
        activeCategoryId === NEW_CATEGORY_ID
          ? [...categories, result].sort((a, b) => a.displayOrder - b.displayOrder)
          : categories
              .map((category) => (category.id === result.id ? result : category))
              .sort((a, b) => a.displayOrder - b.displayOrder)

      setCategories(nextCategories)
      selectCategory(result.id, nextCategories, items)
      toast.success("帮助分类已保存")
    } catch (saveError) {
      setAuthExpired(isAdminSessionExpiredError(saveError))
      toast.error(getAdminApiErrorMessage(saveError, "保存帮助分类失败"))
    } finally {
      setSavingCategory(false)
    }
  }

  const saveItem = async () => {
    if (!activeCategory || activeCategoryId === NEW_CATEGORY_ID) {
      toast.error("请先保存帮助分类")
      return
    }

    const payload: CreateSiteHelpItemRequest | UpdateSiteHelpItemRequest = {
      categoryId: activeCategoryId,
      question: itemForm.question,
      answerMarkdown: itemForm.answerMarkdown,
      displayOrder: toOrder(itemForm.displayOrder),
      enabled: itemForm.enabled,
    }

    setSavingItem(true)
    try {
      const result = await adminRequestData<AdminSiteHelpItemResponseData>(
        activeItemId === NEW_ITEM_ID
          ? "/admin/site/help/items"
          : `/admin/site/help/items/${activeItemId}`,
        {
          method: activeItemId === NEW_ITEM_ID ? "POST" : "PATCH",
          body: JSON.stringify(payload),
        },
        "保存帮助内容失败",
      )

      const nextItems =
        activeItemId === NEW_ITEM_ID
          ? [...items, result].sort((a, b) => a.displayOrder - b.displayOrder)
          : items
              .map((item) => (item.id === result.id ? result : item))
              .sort((a, b) => a.displayOrder - b.displayOrder)

      setItems(nextItems)
      setActiveItemId(result.id)
      setItemForm(toItemForm(result))
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
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">帮助中心</h1>
          <p className="text-sm text-muted-foreground">
            管理用户端帮助弹窗中的分类与常见问题，答案使用 Markdown 保存。
          </p>
        </div>
        <Button variant="secondary" onClick={startNewCategory}>
          <Plus className="h-4 w-4" />
          新建分类
        </Button>
      </div>

      <div className="grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)]">
        <div className="space-y-4 rounded-2xl border border-border bg-card p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold">分类</h2>
              <p className="mt-1 text-xs text-muted-foreground">{categories.length} 个分类</p>
            </div>
          </div>

          <div className="space-y-2">
            {categories.map((category) => (
              <button
                key={category.id}
                type="button"
                onClick={() => selectCategory(category.id)}
                className={cn(
                  "flex w-full items-center gap-3 rounded-xl border px-3 py-3 text-left transition-colors",
                  activeCategoryId === category.id
                    ? "border-brand/40 bg-brand/10"
                    : "border-border bg-surface-2 hover:border-brand/30",
                )}
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-background text-muted-foreground">
                  <FileQuestion className="h-4 w-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold text-foreground">{category.title}</span>
                  <span className="mt-0.5 block text-xs text-muted-foreground">
                    排序 {category.displayOrder} · {category.enabled ? "已启用" : "已停用"}
                  </span>
                </span>
              </button>
            ))}

            {activeCategoryId === NEW_CATEGORY_ID ? (
              <div className="rounded-xl border border-dashed border-brand/40 bg-brand/8 px-3 py-3 text-sm font-medium text-foreground">
                新建分类
              </div>
            ) : null}
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-2xl border border-border bg-card p-6">
            <div className="mb-5 flex items-center justify-between gap-3 border-b border-border pb-4">
              <div>
                <h2 className="text-base font-semibold">分类设置</h2>
                <p className="mt-1 text-xs text-muted-foreground">
                  停用分类后，该分类下所有问题都不会在用户端展示。
                </p>
              </div>
              <Button onClick={saveCategory} disabled={savingCategory}>
                {savingCategory ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                保存分类
              </Button>
            </div>

            <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_160px]">
              <div className="space-y-2">
                <Label>分类名称</Label>
                <Input value={categoryForm.title} onChange={(event) => updateCategoryForm("title", event.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>排序</Label>
                <Input
                  type="number"
                  min={0}
                  value={categoryForm.displayOrder}
                  onChange={(event) => updateCategoryForm("displayOrder", event.target.value)}
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>分类描述</Label>
                <Input
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
          </div>

          <div className="grid gap-6 xl:grid-cols-[300px_minmax(0,1fr)]">
            <div className="space-y-4 rounded-2xl border border-border bg-card p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-base font-semibold">问题</h2>
                  <p className="mt-1 text-xs text-muted-foreground">{activeItems.length} 个问题</p>
                </div>
                <Button variant="secondary" size="sm" onClick={startNewItem} disabled={activeCategoryId === NEW_CATEGORY_ID}>
                  <Plus className="h-4 w-4" />
                  新建
                </Button>
              </div>

              <div className="space-y-2">
                {activeItems.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => selectItem(item.id)}
                    className={cn(
                      "w-full rounded-xl border px-3 py-3 text-left transition-colors",
                      activeItemId === item.id
                        ? "border-brand/40 bg-brand/10"
                        : "border-border bg-surface-2 hover:border-brand/30",
                    )}
                  >
                    <span className="block line-clamp-2 text-sm font-semibold text-foreground">{item.question}</span>
                    <span className="mt-1 block text-xs text-muted-foreground">
                      排序 {item.displayOrder} · {item.enabled ? "已启用" : "已停用"}
                    </span>
                  </button>
                ))}

                {activeItemId === NEW_ITEM_ID ? (
                  <div className="rounded-xl border border-dashed border-brand/40 bg-brand/8 px-3 py-3 text-sm font-medium text-foreground">
                    新建问题
                  </div>
                ) : null}
              </div>
            </div>

            <div className="space-y-5 rounded-2xl border border-border bg-card p-6">
              <div className="flex items-center justify-between gap-3 border-b border-border pb-4">
                <div>
                  <h2 className="text-base font-semibold">问题内容</h2>
                  <p className="mt-1 text-xs text-muted-foreground">当前分类：{activeCategory?.title ?? "新建分类"}</p>
                </div>
                <Button onClick={saveItem} disabled={savingItem || activeCategoryId === NEW_CATEGORY_ID}>
                  {savingItem ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  保存问题
                </Button>
              </div>

              <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_160px]">
                <div className="space-y-2">
                  <Label>问题</Label>
                  <Input value={itemForm.question} onChange={(event) => updateItemForm("question", event.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>排序</Label>
                  <Input
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

              <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-3">
                    <Label>Markdown 内容</Label>
                    <span className="text-xs text-muted-foreground">{answerCharacterCount} 字符</span>
                  </div>
                  <Textarea
                    value={itemForm.answerMarkdown}
                    onChange={(event) => updateItemForm("answerMarkdown", event.target.value)}
                    variant="code"
                    rows={18}
                    spellCheck={false}
                  />
                </div>

                <div className="rounded-xl border border-border bg-surface-2 p-4">
                  <div className="mb-4 flex items-center justify-between gap-3 border-b border-border pb-3">
                    <h3 className="text-sm font-semibold">预览</h3>
                    <span className="rounded-full bg-muted px-3 py-1 text-xs text-muted-foreground">Markdown</span>
                  </div>
                  <div className="max-h-[460px] overflow-y-auto pr-1">
                    <MarkdownContent content={itemForm.answerMarkdown || " "} />
                  </div>
                </div>
              </div>

              {activeItem ? (
                <p className="text-xs text-muted-foreground">
                  上次更新：{activeItem.updatedAt ? new Date(activeItem.updatedAt).toLocaleString("zh-CN") : "暂无"}
                </p>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
