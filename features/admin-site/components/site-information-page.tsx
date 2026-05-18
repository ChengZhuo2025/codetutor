"use client"

import Image from "next/image"
import { useEffect, useMemo, useState } from "react"
import { ImageUp, Loader2, Save, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { StatePanel } from "@/components/ui/state-panel"
import { Textarea } from "@/components/ui/textarea"
import { useAppToast } from "@/components/app-feedback/app-toast-provider"
import { useAdminSessionExpiryRedirect } from "@/features/admin-shell/lib/use-admin-session-expiry-redirect"
import { DEFAULT_PUBLIC_SITE } from "@/features/site/data/default-site"
import type {
  AdminSiteInformationResponseData,
  UpdateSiteInformationRequest,
} from "@/lib/api/contracts/admin-site"
import {
  adminRequestData,
  getAdminApiErrorMessage,
  isAdminSessionExpiredError,
} from "@/lib/api/admin-bff-client"

type SiteInformationForm = {
  logoUrl: string
  siteName: string
  siteSubtitle: string
  siteSlogan: string
  siteDescription: string
  seoKeywordsText: string
  icpNumber: string
  copyright: string
  version: string
}

function toForm(data: AdminSiteInformationResponseData): SiteInformationForm {
  return {
    logoUrl: data.logoUrl ?? "",
    siteName: data.siteName,
    siteSubtitle: data.siteSubtitle,
    siteSlogan: data.siteSlogan,
    siteDescription: data.siteDescription,
    seoKeywordsText: data.seoKeywords.join("，"),
    icpNumber: data.icpNumber ?? "",
    copyright: data.copyright,
    version: data.version,
  }
}

function toPayload(form: SiteInformationForm): UpdateSiteInformationRequest {
  return {
    logoUrl: form.logoUrl.trim() || null,
    siteName: form.siteName,
    siteSubtitle: form.siteSubtitle,
    siteSlogan: form.siteSlogan,
    siteDescription: form.siteDescription,
    seoKeywords: form.seoKeywordsText
      .split(/[,，\n]/)
      .map((item) => item.trim())
      .filter(Boolean),
    icpNumber: form.icpNumber.trim() || null,
    copyright: form.copyright,
    version: form.version,
  }
}

export function SiteInformationPage() {
  const toast = useAppToast()
  const [authExpired, setAuthExpired] = useState(false)
  useAdminSessionExpiryRedirect(authExpired)
  const [data, setData] = useState<AdminSiteInformationResponseData | null>(null)
  const [form, setForm] = useState<SiteInformationForm>(() => toForm(DEFAULT_PUBLIC_SITE.information))
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function load() {
      setLoading(true)
      setError(null)
      try {
        const result = await adminRequestData<AdminSiteInformationResponseData>(
          "/admin/site/information",
          undefined,
          "获取站点信息失败",
        )
        if (!cancelled) {
          setData(result)
          setForm(toForm(result))
        }
      } catch (loadError) {
        if (!cancelled) {
          setAuthExpired(isAdminSessionExpiredError(loadError))
          setError(getAdminApiErrorMessage(loadError, "获取站点信息失败"))
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void load()

    return () => {
      cancelled = true
    }
  }, [])

  const keywordCount = useMemo(
    () => toPayload(form).seoKeywords?.length ?? 0,
    [form],
  )

  const updateField = (field: keyof SiteInformationForm, value: string) => {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }))
  }

  const handleLogoUpload = async (file: File | undefined) => {
    if (!file) return

    setUploading(true)
    try {
      const body = new FormData()
      body.append("file", file)
      const result = await adminRequestData<{ logoUrl: string; storagePath: string }>(
        "/admin/site/logo-upload",
        {
          method: "POST",
          body,
        },
        "网站 Logo 上传失败",
      )
      updateField("logoUrl", result.logoUrl)
      toast.success("网站 Logo 上传成功")
    } catch (uploadError) {
      setAuthExpired(isAdminSessionExpiredError(uploadError))
      toast.error(getAdminApiErrorMessage(uploadError, "网站 Logo 上传失败"))
    } finally {
      setUploading(false)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const result = await adminRequestData<AdminSiteInformationResponseData>(
        "/admin/site/information",
        {
          method: "PATCH",
          body: JSON.stringify(toPayload(form)),
        },
        "保存站点信息失败",
      )
      setData(result)
      setForm(toForm(result))
      toast.success("站点信息已保存")
    } catch (saveError) {
      setAuthExpired(isAdminSessionExpiredError(saveError))
      toast.error(getAdminApiErrorMessage(saveError, "保存站点信息失败"))
    } finally {
      setSaving(false)
    }
  }

  if (loading && !data) {
    return (
      <div className="rounded-xl border border-border bg-card px-5 py-6 text-sm text-muted-foreground">
        加载中…
      </div>
    )
  }

  if (error && !data) {
    return (
      <StatePanel
        status="error"
        title="获取站点信息失败"
        description={error}
      />
    )
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">网站信息</h1>
        <p className="text-sm text-muted-foreground">
          管理前台展示的品牌标识、SEO 信息、备案与版本号。保存后首页、登录页和页脚会读取最新配置。
        </p>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-6 rounded-2xl border border-border bg-card p-6">
          <div className="grid gap-5 md:grid-cols-2">
            <div className="space-y-2">
              <Label>站点名称</Label>
              <Input value={form.siteName} onChange={(event) => updateField("siteName", event.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>副标题</Label>
              <Input value={form.siteSubtitle} onChange={(event) => updateField("siteSubtitle", event.target.value)} />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Slogan</Label>
              <Input value={form.siteSlogan} onChange={(event) => updateField("siteSlogan", event.target.value)} />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>网站简介</Label>
              <Textarea
                value={form.siteDescription}
                onChange={(event) => updateField("siteDescription", event.target.value)}
                className="min-h-24"
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <div className="flex items-center justify-between gap-3">
                <Label>SEO 关键词</Label>
                <span className="text-xs text-muted-foreground">{keywordCount} 个关键词</span>
              </div>
              <Textarea
                value={form.seoKeywordsText}
                onChange={(event) => updateField("seoKeywordsText", event.target.value)}
                className="min-h-20"
                placeholder="AI 编程，学习陪练，CodeTutor"
              />
            </div>
            <div className="space-y-2">
              <Label>备案号</Label>
              <Input value={form.icpNumber} onChange={(event) => updateField("icpNumber", event.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>版本号</Label>
              <Input value={form.version} onChange={(event) => updateField("version", event.target.value)} />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>版权信息</Label>
              <Input value={form.copyright} onChange={(event) => updateField("copyright", event.target.value)} />
            </div>
          </div>

          <div className="flex justify-end">
            <Button onClick={handleSave} disabled={saving || uploading}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              保存网站信息
            </Button>
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-2xl border border-border bg-card p-5">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              <h2 className="text-base font-semibold">品牌 Logo</h2>
            </div>
            <div className="mt-5 flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-muted/35 p-6">
              <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-2xl border border-border bg-background">
                {form.logoUrl ? (
                  <Image src={form.logoUrl} alt="网站 Logo" width={96} height={96} className="h-full w-full object-contain" unoptimized />
                ) : (
                  <span className="text-2xl font-semibold text-muted-foreground">
                    {form.siteName.slice(0, 1)}
                  </span>
                )}
              </div>
              <label className="mt-5 inline-flex cursor-pointer items-center gap-2 rounded-md border border-border bg-background px-3 py-2 text-sm font-medium transition-colors hover:bg-muted">
                {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImageUp className="h-4 w-4" />}
                上传 Logo
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/svg+xml"
                  className="hidden"
                  disabled={uploading}
                  onChange={(event) => {
                    void handleLogoUpload(event.target.files?.[0])
                    event.target.value = ""
                  }}
                />
              </label>
              <p className="mt-3 text-center text-xs leading-5 text-muted-foreground">
                支持 JPG、PNG、WebP、SVG，最大 2MB。上传后记得保存网站信息。
              </p>
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card p-5">
            <h2 className="text-base font-semibold">前台预览</h2>
            <div className="mt-4 rounded-2xl border border-border bg-background p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-xl bg-primary text-primary-foreground">
                  {form.logoUrl ? (
                    <Image src={form.logoUrl} alt="网站 Logo" width={40} height={40} className="h-full w-full object-contain" unoptimized />
                  ) : (
                    form.siteName.slice(0, 1)
                  )}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{form.siteName}</p>
                  <p className="truncate text-xs text-muted-foreground">{form.siteSubtitle}</p>
                </div>
              </div>
              <p className="mt-4 text-sm font-medium text-foreground">{form.siteSlogan}</p>
              <p className="mt-2 line-clamp-4 text-xs leading-5 text-muted-foreground">
                {form.siteDescription}
              </p>
            </div>
            {data?.updatedAt ? (
              <p className="mt-3 text-xs text-muted-foreground">
                上次更新：{new Date(data.updatedAt).toLocaleString("zh-CN")}
              </p>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  )
}
