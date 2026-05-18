import type { AdminAuditAction } from "@/lib/api/contracts/admin"
import {
  SITE_ARTICLE_SLUGS,
  type AdminSiteArticleListResponseData,
  type AdminSiteArticleResponseData,
  type AdminSiteInformationResponseData,
  type PublicSiteArticle,
  type PublicSiteResponseData,
  type SiteArticleSlug,
  type UpdateSiteArticleRequest,
  type UpdateSiteInformationRequest,
} from "@/lib/api/contracts/admin-site"
import { createSupabaseAdminClient } from "@/lib/supabase/admin"
import {
  SITE_ASSET_BUCKET,
  SITE_LOGO_ALLOWED_TYPES,
  SITE_LOGO_MAX_BYTES,
} from "@/lib/supabase/storage"
import { isUuid } from "@/server/lib/identifiers"
import { assertSupabaseSuccess } from "@/server/lib/supabase"

type SiteInformationRow = {
  id: number
  logo_url: string | null
  site_name: string
  site_subtitle: string
  site_slogan: string
  site_description: string
  seo_keywords: unknown
  icp_number: string | null
  copyright: string
  version: string
  updated_at: string | null
  updated_by_admin_id: string | null
}

type SiteArticleRow = {
  slug: SiteArticleSlug
  title: string
  content_markdown: string
  effective_date: string | null
  updated_at: string | null
  updated_by_admin_id: string | null
}

function normalizeKeywords(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean)
}

function mapInformationRow(row: SiteInformationRow): AdminSiteInformationResponseData {
  return {
    logoUrl: row.logo_url,
    siteName: row.site_name,
    siteSubtitle: row.site_subtitle,
    siteSlogan: row.site_slogan,
    siteDescription: row.site_description,
    seoKeywords: normalizeKeywords(row.seo_keywords),
    icpNumber: row.icp_number,
    copyright: row.copyright,
    version: row.version,
    updatedAt: row.updated_at,
    updatedByAdminId: row.updated_by_admin_id,
  }
}

function mapArticleRow(row: SiteArticleRow): AdminSiteArticleResponseData {
  return {
    slug: row.slug,
    title: row.title,
    contentMarkdown: row.content_markdown,
    effectiveDate: row.effective_date,
    updatedAt: row.updated_at,
    updatedByAdminId: row.updated_by_admin_id,
  }
}

function toPublicArticle(article: AdminSiteArticleResponseData): PublicSiteArticle {
  return {
    slug: article.slug,
    title: article.title,
    contentMarkdown: article.contentMarkdown,
    effectiveDate: article.effectiveDate,
    updatedAt: article.updatedAt,
  }
}

async function writeSiteAudit(input: {
  adminAccountId: string
  action: Extract<AdminAuditAction, "site_information_update" | "site_article_update" | "site_logo_upload">
  targetType: "site_information" | "site_article"
  targetId?: string | null
  beforeSnapshot?: Record<string, unknown> | null
  afterSnapshot?: Record<string, unknown> | null
}) {
  const supabase = createSupabaseAdminClient()
  const { error } = await supabase.from("admin_audit_logs").insert({
    admin_user_id: input.adminAccountId,
    action: input.action,
    target_type: input.targetType,
    target_id: input.targetId ?? null,
    before_snapshot: input.beforeSnapshot ?? null,
    after_snapshot: input.afterSnapshot ?? null,
    reason: null,
    request_context: null,
  })

  if (error) {
    console.error("Failed to write site audit log:", error)
  }
}

export async function loadSiteInformation(): Promise<AdminSiteInformationResponseData> {
  const supabase = createSupabaseAdminClient()
  const { data, error } = await supabase
    .from("site_information")
    .select("*")
    .eq("id", 1)
    .single()

  assertSupabaseSuccess(error, "failed to load site information")

  if (!data) {
    throw new Error("SITE_INFORMATION_NOT_FOUND")
  }

  return mapInformationRow(data as SiteInformationRow)
}

export async function updateSiteInformation(
  adminAccountId: string,
  input: UpdateSiteInformationRequest,
): Promise<AdminSiteInformationResponseData> {
  if (!isUuid(adminAccountId)) {
    const error = new Error("管理员ID无效")
    error.name = "VALIDATION_FAILED"
    throw error
  }

  const before = await loadSiteInformation()
  const updatePayload: Record<string, unknown> = {
    updated_by_admin_id: adminAccountId,
  }

  if (input.logoUrl !== undefined) updatePayload.logo_url = input.logoUrl
  if (input.siteName !== undefined) updatePayload.site_name = input.siteName
  if (input.siteSubtitle !== undefined) updatePayload.site_subtitle = input.siteSubtitle
  if (input.siteSlogan !== undefined) updatePayload.site_slogan = input.siteSlogan
  if (input.siteDescription !== undefined) updatePayload.site_description = input.siteDescription
  if (input.seoKeywords !== undefined) updatePayload.seo_keywords = input.seoKeywords
  if (input.icpNumber !== undefined) updatePayload.icp_number = input.icpNumber
  if (input.copyright !== undefined) updatePayload.copyright = input.copyright
  if (input.version !== undefined) updatePayload.version = input.version

  const supabase = createSupabaseAdminClient()
  const { data, error } = await supabase
    .from("site_information")
    .update(updatePayload)
    .eq("id", 1)
    .select("*")
    .single()

  assertSupabaseSuccess(error, "failed to update site information")

  const after = mapInformationRow(data as SiteInformationRow)
  await writeSiteAudit({
    adminAccountId,
    action: "site_information_update",
    targetType: "site_information",
    targetId: null,
    beforeSnapshot: before,
    afterSnapshot: after,
  })

  return after
}

export async function uploadSiteLogo(
  adminAccountId: string,
  file: File,
): Promise<{ logoUrl: string; storagePath: string }> {
  if (!isUuid(adminAccountId)) {
    throw new Error("管理员ID无效")
  }

  if (!SITE_LOGO_ALLOWED_TYPES.includes(file.type as (typeof SITE_LOGO_ALLOWED_TYPES)[number])) {
    throw new Error("网站 Logo 仅支持 JPG、PNG、WebP、SVG 格式")
  }

  if (file.size > SITE_LOGO_MAX_BYTES) {
    throw new Error("网站 Logo 不能超过 2MB")
  }

  const bytes = await file.arrayBuffer()
  const extension = file.name.split(".").pop() || (file.type === "image/svg+xml" ? "svg" : "png")
  const objectPath = `logos/logo-${Date.now()}-${crypto.randomUUID()}.${extension}`
  const supabase = createSupabaseAdminClient()
  const { error: uploadError } = await supabase.storage
    .from(SITE_ASSET_BUCKET)
    .upload(objectPath, bytes, {
      contentType: file.type,
      upsert: true,
    })

  assertSupabaseSuccess(uploadError, "failed to upload site logo")

  const {
    data: { publicUrl },
  } = supabase.storage.from(SITE_ASSET_BUCKET).getPublicUrl(objectPath)

  await writeSiteAudit({
    adminAccountId,
    action: "site_logo_upload",
    targetType: "site_information",
    targetId: null,
    beforeSnapshot: null,
    afterSnapshot: {
      logoUrl: publicUrl,
      storagePath: objectPath,
      mimeType: file.type,
      size: file.size,
    },
  })

  return {
    logoUrl: publicUrl,
    storagePath: objectPath,
  }
}

export async function loadSiteArticle(
  slug: SiteArticleSlug,
): Promise<AdminSiteArticleResponseData> {
  const supabase = createSupabaseAdminClient()
  const { data, error } = await supabase
    .from("site_articles")
    .select("*")
    .eq("slug", slug)
    .single()

  assertSupabaseSuccess(error, "failed to load site article")

  if (!data) {
    throw new Error("SITE_ARTICLE_NOT_FOUND")
  }

  return mapArticleRow(data as SiteArticleRow)
}

export async function loadSiteArticleList(): Promise<AdminSiteArticleListResponseData> {
  const supabase = createSupabaseAdminClient()
  const { data, error } = await supabase
    .from("site_articles")
    .select("*")
    .in("slug", [...SITE_ARTICLE_SLUGS])
    .order("display_order", { ascending: true })

  assertSupabaseSuccess(error, "failed to load site article list")

  return {
    items: ((data ?? []) as SiteArticleRow[]).map(mapArticleRow),
  }
}

export async function updateSiteArticle(
  adminAccountId: string,
  slug: SiteArticleSlug,
  input: UpdateSiteArticleRequest,
): Promise<AdminSiteArticleResponseData> {
  if (!isUuid(adminAccountId)) {
    const error = new Error("管理员ID无效")
    error.name = "VALIDATION_FAILED"
    throw error
  }

  const before = await loadSiteArticle(slug)
  const updatePayload: Record<string, unknown> = {
    updated_by_admin_id: adminAccountId,
  }

  if (input.title !== undefined) updatePayload.title = input.title
  if (input.contentMarkdown !== undefined) updatePayload.content_markdown = input.contentMarkdown
  if (input.effectiveDate !== undefined) updatePayload.effective_date = input.effectiveDate

  const supabase = createSupabaseAdminClient()
  const { data, error } = await supabase
    .from("site_articles")
    .update(updatePayload)
    .eq("slug", slug)
    .select("*")
    .single()

  assertSupabaseSuccess(error, "failed to update site article")

  const after = mapArticleRow(data as SiteArticleRow)
  await writeSiteAudit({
    adminAccountId,
    action: "site_article_update",
    targetType: "site_article",
    targetId: null,
    beforeSnapshot: before,
    afterSnapshot: after,
  })

  return after
}

export async function loadPublicSite(): Promise<PublicSiteResponseData> {
  const [information, articleList] = await Promise.all([
    loadSiteInformation(),
    loadSiteArticleList(),
  ])
  const map = new Map(articleList.items.map((item) => [item.slug, item]))

  const aboutUs = map.get("about_us")
  const userAgreement = map.get("user_agreement")
  const privacyPolicy = map.get("privacy_policy")

  if (!aboutUs || !userAgreement || !privacyPolicy) {
    throw new Error("SITE_ARTICLES_INCOMPLETE")
  }

  return {
    information,
    articles: {
      aboutUs: toPublicArticle(aboutUs),
      userAgreement: toPublicArticle(userAgreement),
      privacyPolicy: toPublicArticle(privacyPolicy),
    },
  }
}
