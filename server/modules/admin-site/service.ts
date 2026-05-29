import type { AdminAuditAction } from "@/lib/api/contracts/admin"
import {
  SITE_ARTICLE_SLUGS,
  type AdminSiteHelpCategoryListResponseData,
  type AdminSiteHelpCategoryResponseData,
  type AdminSiteHelpItemListResponseData,
  type AdminSiteHelpItemResponseData,
  type AdminSiteArticleListResponseData,
  type AdminSiteArticleResponseData,
  type AdminSiteInformationResponseData,
  type CreateSiteHelpCategoryRequest,
  type CreateSiteHelpItemRequest,
  type PublicSiteArticle,
  type PublicSiteHelpCategory,
  type PublicSiteHelpItem,
  type PublicSiteResponseData,
  type SiteArticleSlug,
  type UpdateSiteArticleRequest,
  type UpdateSiteHelpCategoryRequest,
  type UpdateSiteHelpItemRequest,
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

type SiteHelpCategoryRow = {
  id: string
  title: string
  description: string | null
  icon_key: string | null
  display_order: number
  enabled: boolean
  updated_at: string | null
  updated_by_admin_id: string | null
}

type SiteHelpItemRow = {
  id: string
  category_id: string
  question: string
  answer_markdown: string
  display_order: number
  enabled: boolean
  updated_at: string | null
  updated_by_admin_id: string | null
}

type SupabaseErrorLike = {
  code?: string
  message?: string
  details?: string
}

function createNamedError(name: "VALIDATION_FAILED" | "NOT_FOUND" | "CONFLICT", message: string) {
  const error = new Error(message)
  error.name = name
  return error
}

function isNoRowsError(error: SupabaseErrorLike | null | undefined) {
  return error?.code === "PGRST116" || error?.message?.includes("no rows")
}

function isForeignKeyError(error: SupabaseErrorLike | null | undefined) {
  return error?.code === "23503" || error?.message?.includes("foreign key constraint")
}

function throwSiteHelpMutationError(
  error: SupabaseErrorLike | null | undefined,
  context: string,
  notFoundMessage = "帮助内容不存在。",
): never {
  if (isNoRowsError(error)) {
    throw createNamedError("NOT_FOUND", notFoundMessage)
  }
  if (isForeignKeyError(error)) {
    throw createNamedError("CONFLICT", "帮助分类不存在或已不可用。")
  }
  throw new Error(`${context}: ${error?.message ?? "unknown error"}`)
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

function mapHelpCategoryRow(row: SiteHelpCategoryRow): AdminSiteHelpCategoryResponseData {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    iconKey: row.icon_key ?? "help-circle",
    displayOrder: row.display_order,
    enabled: row.enabled,
    updatedAt: row.updated_at,
    updatedByAdminId: row.updated_by_admin_id,
  }
}

function mapHelpItemRow(row: SiteHelpItemRow): AdminSiteHelpItemResponseData {
  return {
    id: row.id,
    categoryId: row.category_id,
    question: row.question,
    answerMarkdown: row.answer_markdown,
    displayOrder: row.display_order,
    enabled: row.enabled,
    updatedAt: row.updated_at,
    updatedByAdminId: row.updated_by_admin_id,
  }
}

function toPublicHelpItem(item: AdminSiteHelpItemResponseData): PublicSiteHelpItem {
  return {
    id: item.id,
    categoryId: item.categoryId,
    question: item.question,
    answerMarkdown: item.answerMarkdown,
    displayOrder: item.displayOrder,
    enabled: item.enabled,
    updatedAt: item.updatedAt,
  }
}

function toPublicHelpCategory(category: AdminSiteHelpCategoryResponseData & { items?: AdminSiteHelpItemResponseData[] }): PublicSiteHelpCategory {
  return {
    id: category.id,
    title: category.title,
    description: category.description,
    iconKey: category.iconKey,
    displayOrder: category.displayOrder,
    enabled: category.enabled,
    updatedAt: category.updatedAt,
    items: (category.items ?? []).map(toPublicHelpItem),
  }
}

async function writeSiteAudit(input: {
  adminAccountId: string
  action: Extract<
    AdminAuditAction,
    | "site_information_update"
    | "site_article_update"
    | "site_help_category_create"
    | "site_help_category_update"
    | "site_help_item_create"
    | "site_help_item_update"
    | "site_logo_upload"
  >
  targetType: "site_information" | "site_article" | "site_help_category" | "site_help_item"
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

export async function loadSiteHelpCategories(): Promise<AdminSiteHelpCategoryListResponseData> {
  const supabase = createSupabaseAdminClient()
  const { data, error } = await supabase
    .from("site_help_categories")
    .select("*")
    .order("display_order", { ascending: true })
    .order("updated_at", { ascending: false })

  assertSupabaseSuccess(error, "failed to load site help categories")

  return {
    items: ((data ?? []) as SiteHelpCategoryRow[]).map(mapHelpCategoryRow),
  }
}

export async function createSiteHelpCategory(
  adminAccountId: string,
  input: CreateSiteHelpCategoryRequest,
): Promise<AdminSiteHelpCategoryResponseData> {
  if (!isUuid(adminAccountId)) {
    const error = new Error("管理员ID无效")
    error.name = "VALIDATION_FAILED"
    throw error
  }

  const supabase = createSupabaseAdminClient()
  const { data, error } = await supabase
    .from("site_help_categories")
    .insert({
      title: input.title,
      description: input.description ?? null,
      icon_key: input.iconKey ?? "help-circle",
      display_order: input.displayOrder ?? 0,
      enabled: input.enabled ?? true,
      updated_by_admin_id: adminAccountId,
    })
    .select("*")
    .single()

  assertSupabaseSuccess(error, "failed to create site help category")

  const after = mapHelpCategoryRow(data as SiteHelpCategoryRow)
  await writeSiteAudit({
    adminAccountId,
    action: "site_help_category_create",
    targetType: "site_help_category",
    targetId: after.id,
    beforeSnapshot: null,
    afterSnapshot: after,
  })

  return after
}

export async function loadSiteHelpCategory(id: string): Promise<AdminSiteHelpCategoryResponseData> {
  const supabase = createSupabaseAdminClient()
  const { data, error } = await supabase
    .from("site_help_categories")
    .select("*")
    .eq("id", id)
    .maybeSingle()

  if (error) {
    if (isNoRowsError(error)) {
      throw createNamedError("NOT_FOUND", "帮助分类不存在。")
    }
    assertSupabaseSuccess(error, "failed to load site help category")
  }

  if (!data) {
    throw createNamedError("NOT_FOUND", "帮助分类不存在。")
  }

  return mapHelpCategoryRow(data as SiteHelpCategoryRow)
}

export async function updateSiteHelpCategory(
  adminAccountId: string,
  id: string,
  input: UpdateSiteHelpCategoryRequest,
): Promise<AdminSiteHelpCategoryResponseData> {
  if (!isUuid(adminAccountId) || !isUuid(id)) {
    const error = new Error("ID无效")
    error.name = "VALIDATION_FAILED"
    throw error
  }

  const before = await loadSiteHelpCategory(id)
  const updatePayload: Record<string, unknown> = {
    updated_by_admin_id: adminAccountId,
  }

  if (input.title !== undefined) updatePayload.title = input.title
  if (input.description !== undefined) updatePayload.description = input.description
  if (input.iconKey !== undefined) updatePayload.icon_key = input.iconKey
  if (input.displayOrder !== undefined) updatePayload.display_order = input.displayOrder
  if (input.enabled !== undefined) updatePayload.enabled = input.enabled

  const supabase = createSupabaseAdminClient()
  const { data, error } = await supabase
    .from("site_help_categories")
    .update(updatePayload)
    .eq("id", id)
    .select("*")
    .single()

  if (error) {
    throwSiteHelpMutationError(error, "failed to update site help category", "帮助分类不存在。")
  }

  const after = mapHelpCategoryRow(data as SiteHelpCategoryRow)
  await writeSiteAudit({
    adminAccountId,
    action: "site_help_category_update",
    targetType: "site_help_category",
    targetId: id,
    beforeSnapshot: before,
    afterSnapshot: after,
  })

  return after
}

export async function loadSiteHelpItems(categoryId?: string | null): Promise<AdminSiteHelpItemListResponseData> {
  const supabase = createSupabaseAdminClient()
  let query = supabase
    .from("site_help_items")
    .select("*")
    .order("display_order", { ascending: true })
    .order("updated_at", { ascending: false })

  if (categoryId) {
    query = query.eq("category_id", categoryId)
  }

  const { data, error } = await query
  assertSupabaseSuccess(error, "failed to load site help items")

  return {
    items: ((data ?? []) as SiteHelpItemRow[]).map(mapHelpItemRow),
  }
}

export async function createSiteHelpItem(
  adminAccountId: string,
  input: CreateSiteHelpItemRequest,
): Promise<AdminSiteHelpItemResponseData> {
  if (!isUuid(adminAccountId) || !isUuid(input.categoryId)) {
    throw createNamedError("VALIDATION_FAILED", "ID无效")
  }

  try {
    await loadSiteHelpCategory(input.categoryId)
  } catch (error) {
    if (error instanceof Error && error.name === "NOT_FOUND") {
      throw createNamedError("VALIDATION_FAILED", "帮助分类不存在。")
    }
    throw error
  }

  const supabase = createSupabaseAdminClient()
  const { data, error } = await supabase
    .from("site_help_items")
    .insert({
      category_id: input.categoryId,
      question: input.question,
      answer_markdown: input.answerMarkdown,
      display_order: input.displayOrder ?? 0,
      enabled: input.enabled ?? true,
      updated_by_admin_id: adminAccountId,
    })
    .select("*")
    .single()

  if (error) {
    throwSiteHelpMutationError(error, "failed to create site help item")
  }

  const after = mapHelpItemRow(data as SiteHelpItemRow)
  await writeSiteAudit({
    adminAccountId,
    action: "site_help_item_create",
    targetType: "site_help_item",
    targetId: after.id,
    beforeSnapshot: null,
    afterSnapshot: after,
  })

  return after
}

export async function loadSiteHelpItem(id: string): Promise<AdminSiteHelpItemResponseData> {
  const supabase = createSupabaseAdminClient()
  const { data, error } = await supabase
    .from("site_help_items")
    .select("*")
    .eq("id", id)
    .maybeSingle()

  if (error) {
    if (isNoRowsError(error)) {
      throw createNamedError("NOT_FOUND", "帮助内容不存在。")
    }
    assertSupabaseSuccess(error, "failed to load site help item")
  }

  if (!data) {
    throw createNamedError("NOT_FOUND", "帮助内容不存在。")
  }

  return mapHelpItemRow(data as SiteHelpItemRow)
}

export async function updateSiteHelpItem(
  adminAccountId: string,
  id: string,
  input: UpdateSiteHelpItemRequest,
): Promise<AdminSiteHelpItemResponseData> {
  if (!isUuid(adminAccountId) || !isUuid(id)) {
    throw createNamedError("VALIDATION_FAILED", "ID无效")
  }

  if (input.categoryId !== undefined && !isUuid(input.categoryId)) {
    throw createNamedError("VALIDATION_FAILED", "帮助分类ID无效")
  }

  if (input.categoryId !== undefined) {
    try {
      await loadSiteHelpCategory(input.categoryId)
    } catch (error) {
      if (error instanceof Error && error.name === "NOT_FOUND") {
        throw createNamedError("VALIDATION_FAILED", "帮助分类不存在。")
      }
      throw error
    }
  }

  const before = await loadSiteHelpItem(id)
  const updatePayload: Record<string, unknown> = {
    updated_by_admin_id: adminAccountId,
  }

  if (input.categoryId !== undefined) updatePayload.category_id = input.categoryId
  if (input.question !== undefined) updatePayload.question = input.question
  if (input.answerMarkdown !== undefined) updatePayload.answer_markdown = input.answerMarkdown
  if (input.displayOrder !== undefined) updatePayload.display_order = input.displayOrder
  if (input.enabled !== undefined) updatePayload.enabled = input.enabled

  const supabase = createSupabaseAdminClient()
  const { data, error } = await supabase
    .from("site_help_items")
    .update(updatePayload)
    .eq("id", id)
    .select("*")
    .single()

  if (error) {
    throwSiteHelpMutationError(error, "failed to update site help item")
  }

  const after = mapHelpItemRow(data as SiteHelpItemRow)
  await writeSiteAudit({
    adminAccountId,
    action: "site_help_item_update",
    targetType: "site_help_item",
    targetId: id,
    beforeSnapshot: before,
    afterSnapshot: after,
  })

  return after
}

export async function loadPublicHelpCenter(): Promise<PublicSiteResponseData["helpCenter"]> {
  const [categoryList, itemList] = await Promise.all([
    loadSiteHelpCategories(),
    loadSiteHelpItems(),
  ])

  const enabledItemsByCategory = new Map<string, AdminSiteHelpItemResponseData[]>()
  for (const item of itemList.items) {
    if (!item.enabled) continue
    const current = enabledItemsByCategory.get(item.categoryId) ?? []
    current.push(item)
    enabledItemsByCategory.set(item.categoryId, current)
  }

  const categories = categoryList.items
    .filter((category) => category.enabled)
    .map((category) => ({
      ...category,
      items: enabledItemsByCategory.get(category.id) ?? [],
    }))
    .filter((category) => category.items.length > 0)
    .map(toPublicHelpCategory)

  return { categories }
}

export async function loadPublicSite(): Promise<PublicSiteResponseData> {
  const [information, articleList, helpCenter] = await Promise.all([
    loadSiteInformation(),
    loadSiteArticleList(),
    loadPublicHelpCenter(),
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
    helpCenter,
  }
}
