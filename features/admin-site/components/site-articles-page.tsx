"use client"

import { useEffect, useMemo, useState } from "react"
import { Loader2, Save } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { StatePanel } from "@/components/ui/state-panel"
import { Textarea } from "@/components/ui/textarea"
import { useAppToast } from "@/components/app-feedback/app-toast-provider"
import { useAdminSessionExpiryRedirect } from "@/features/admin-shell/lib/use-admin-session-expiry-redirect"
import { MarkdownContent } from "@/features/site/components/markdown-content"
import { DEFAULT_PUBLIC_SITE } from "@/features/site/data/default-site"
import type {
  AdminSiteArticleListResponseData,
  AdminSiteArticleResponseData,
  SiteArticleSlug,
  UpdateSiteArticleRequest,
} from "@/lib/api/contracts/admin-site"
import {
  adminRequestData,
  getAdminApiErrorMessage,
  isAdminSessionExpiredError,
} from "@/lib/api/admin-bff-client"
import { cn } from "@/lib/utils"

const ARTICLE_TABS: Array<{ slug: SiteArticleSlug; label: string }> = [
  { slug: "about_us", label: "关于我们" },
  { slug: "user_agreement", label: "用户协议" },
  { slug: "privacy_policy", label: "隐私政策" },
]

type ArticleForm = {
  title: string
  effectiveDate: string
  contentMarkdown: string
}

function getDefaultArticle(slug: SiteArticleSlug): AdminSiteArticleResponseData {
  const publicArticle =
    slug === "about_us"
      ? DEFAULT_PUBLIC_SITE.articles.aboutUs
      : slug === "user_agreement"
        ? DEFAULT_PUBLIC_SITE.articles.userAgreement
        : DEFAULT_PUBLIC_SITE.articles.privacyPolicy

  return {
    ...publicArticle,
    updatedByAdminId: null,
  }
}

function toForm(article: AdminSiteArticleResponseData): ArticleForm {
  return {
    title: article.title,
    effectiveDate: article.effectiveDate ?? "",
    contentMarkdown: article.contentMarkdown,
  }
}

export function SiteArticlesPage() {
  const toast = useAppToast()
  const [authExpired, setAuthExpired] = useState(false)
  useAdminSessionExpiryRedirect(authExpired)
  const [activeSlug, setActiveSlug] = useState<SiteArticleSlug>("about_us")
  const [articles, setArticles] = useState<Record<SiteArticleSlug, AdminSiteArticleResponseData>>({
    about_us: getDefaultArticle("about_us"),
    user_agreement: getDefaultArticle("user_agreement"),
    privacy_policy: getDefaultArticle("privacy_policy"),
  })
  const [forms, setForms] = useState<Record<SiteArticleSlug, ArticleForm>>({
    about_us: toForm(getDefaultArticle("about_us")),
    user_agreement: toForm(getDefaultArticle("user_agreement")),
    privacy_policy: toForm(getDefaultArticle("privacy_policy")),
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function load() {
      setLoading(true)
      setError(null)
      try {
        const result = await adminRequestData<AdminSiteArticleListResponseData>(
          "/admin/site/articles",
          undefined,
          "获取通用文章失败",
        )
        if (cancelled) return

        const nextArticles = { ...articles }
        for (const item of result.items) {
          nextArticles[item.slug] = item
        }

        setArticles(nextArticles)
        setForms({
          about_us: toForm(nextArticles.about_us),
          user_agreement: toForm(nextArticles.user_agreement),
          privacy_policy: toForm(nextArticles.privacy_policy),
        })
      } catch (loadError) {
        if (!cancelled) {
          setAuthExpired(isAdminSessionExpiredError(loadError))
          setError(getAdminApiErrorMessage(loadError, "获取通用文章失败"))
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void load()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- initial fallback state is only used before remote load
  }, [])

  const form = forms[activeSlug]
  const article = articles[activeSlug]
  const characterCount = useMemo(() => form.contentMarkdown.length, [form.contentMarkdown])

  const updateForm = (field: keyof ArticleForm, value: string) => {
    setForms((prev) => ({
      ...prev,
      [activeSlug]: {
        ...prev[activeSlug],
        [field]: value,
      },
    }))
  }

  const handleSave = async () => {
    const payload: UpdateSiteArticleRequest = {
      title: form.title,
      effectiveDate: form.effectiveDate.trim() || null,
      contentMarkdown: form.contentMarkdown,
    }

    setSaving(true)
    try {
      const result = await adminRequestData<AdminSiteArticleResponseData>(
        `/admin/site/articles/${activeSlug}`,
        {
          method: "PATCH",
          body: JSON.stringify(payload),
        },
        "保存通用文章失败",
      )
      setArticles((prev) => ({
        ...prev,
        [activeSlug]: result,
      }))
      setForms((prev) => ({
        ...prev,
        [activeSlug]: toForm(result),
      }))
      toast.success("通用文章已保存")
    } catch (saveError) {
      setAuthExpired(isAdminSessionExpiredError(saveError))
      toast.error(getAdminApiErrorMessage(saveError, "保存通用文章失败"))
    } finally {
      setSaving(false)
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
        title="获取通用文章失败"
        description={error}
      />
    )
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">通用文章</h1>
        <p className="text-sm text-muted-foreground">
          管理首页与登录页弹窗中的关于我们、用户协议和隐私政策，正文使用 Markdown 保存。
        </p>
      </div>

      <div className="flex flex-wrap gap-2 border-b border-border pb-3">
        {ARTICLE_TABS.map((tab) => (
          <button
            key={tab.slug}
            type="button"
            onClick={() => setActiveSlug(tab.slug)}
            className={cn(
              "rounded-full px-4 py-2 text-sm font-medium transition-colors",
              activeSlug === tab.slug
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground",
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
        <div className="space-y-5 rounded-2xl border border-border bg-card p-6">
          <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_180px]">
            <div className="space-y-2">
              <Label>文章标题</Label>
              <Input value={form.title} onChange={(event) => updateForm("title", event.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>生效日期</Label>
              <Input
                value={form.effectiveDate}
                onChange={(event) => updateForm("effectiveDate", event.target.value)}
                placeholder="2026-04-17"
              />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between gap-3">
              <Label>Markdown 内容</Label>
              <span className="text-xs text-muted-foreground">{characterCount} 字符</span>
            </div>
            <Textarea
              value={form.contentMarkdown}
              onChange={(event) => updateForm("contentMarkdown", event.target.value)}
              className="min-h-[520px] font-mono text-sm leading-6"
              spellCheck={false}
            />
          </div>

          <div className="flex justify-between gap-3 text-xs text-muted-foreground">
            <span>
              当前文章：{article.title}，上次更新：
              {article.updatedAt ? new Date(article.updatedAt).toLocaleString("zh-CN") : "暂无"}
            </span>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              保存文章
            </Button>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-6">
          <div className="flex items-center justify-between gap-3 border-b border-border pb-4">
            <div>
              <h2 className="text-base font-semibold">预览</h2>
              <p className="mt-1 text-xs text-muted-foreground">前台弹窗会使用同一份 Markdown 内容。</p>
            </div>
            <span className="rounded-full bg-muted px-3 py-1 text-xs text-muted-foreground">
              Markdown
            </span>
          </div>
          <div className="mt-5 max-h-[650px] overflow-y-auto pr-1">
            <MarkdownContent content={form.contentMarkdown} />
          </div>
        </div>
      </div>
    </div>
  )
}
