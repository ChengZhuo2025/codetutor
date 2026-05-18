import { jsonError, jsonSuccess } from "@/server/lib/route-response"
import {
  parseAdminSiteArticleBody,
  parseAdminSiteInformationBody,
  parseSiteArticleSlug,
} from "@/server/lib/request-validation"
import type {
  SiteArticleSlug,
  UpdateSiteArticleRequest,
  UpdateSiteInformationRequest,
} from "@/lib/api/contracts/admin-site"

type RequestAdminResult =
  | {
      ok: true
      adminId: string
    }
  | {
      ok: false
      reason: "missing-config" | "forbidden"
      message: string
    }

type Awaitable<T> = T | Promise<T>

function toValidationError(error: unknown, fallbackMessage: string) {
  const err = error as Error
  if (err?.name === "VALIDATION_FAILED") {
    return jsonError("VALIDATION_FAILED", err.message, 400)
  }
  return jsonError("INTERNAL_ERROR", err?.message || fallbackMessage, 500)
}

export function createPublicSiteGetHandler(dependencies: {
  loadPublicSite: () => Promise<unknown>
}) {
  return async function GET() {
    try {
      const data = await dependencies.loadPublicSite()
      return jsonSuccess(data, "站点公开信息读取成功")
    } catch (error) {
      console.error("Public site GET error:", error)
      return jsonError("INTERNAL_ERROR", "站点公开信息读取失败", 500)
    }
  }
}

export function createAdminSiteInformationGetHandler(dependencies: {
  getRequestAdmin: (request: unknown) => Awaitable<RequestAdminResult>
  loadSiteInformation: () => Promise<unknown>
}) {
  return async function GET(request: unknown) {
    try {
      const admin = await dependencies.getRequestAdmin(request)
      if (!admin.ok) {
        return jsonError("ADMIN_FORBIDDEN", admin.message, 403)
      }

      const data = await dependencies.loadSiteInformation()
      return jsonSuccess(data, "站点信息读取成功")
    } catch (error) {
      console.error("Admin site information GET error:", error)
      return jsonError("INTERNAL_ERROR", "站点信息读取失败", 500)
    }
  }
}

export function createAdminSiteInformationPatchHandler(dependencies: {
  getRequestAdmin: (request: unknown) => Awaitable<RequestAdminResult>
  updateSiteInformation: (
    adminAccountId: string,
    input: UpdateSiteInformationRequest,
  ) => Promise<unknown>
}) {
  return async function PATCH(request: Request) {
    try {
      const admin = await dependencies.getRequestAdmin(request)
      if (!admin.ok) {
        return jsonError("ADMIN_FORBIDDEN", admin.message, 403)
      }

      let body: unknown
      try {
        body = await request.json()
      } catch {
        return jsonError("BAD_REQUEST", "无效的请求体", 400)
      }

      const parsed = parseAdminSiteInformationBody(body)
      if (!parsed.ok) {
        return jsonError(parsed.code, parsed.message, 400)
      }

      const data = await dependencies.updateSiteInformation(admin.adminId, parsed.data)
      return jsonSuccess(data, "站点信息已更新")
    } catch (error) {
      console.error("Admin site information PATCH error:", error)
      return toValidationError(error, "站点信息更新失败")
    }
  }
}

export function createAdminSiteLogoUploadPostHandler(dependencies: {
  getRequestAdmin: (request: unknown) => Awaitable<RequestAdminResult>
  uploadSiteLogo: (adminAccountId: string, file: File) => Promise<{ logoUrl: string; storagePath: string }>
}) {
  return async function POST(request: Request) {
    try {
      const admin = await dependencies.getRequestAdmin(request)
      if (!admin.ok) {
        return jsonError("ADMIN_FORBIDDEN", admin.message, 403)
      }

      const formData = await request.formData()
      const file = formData.get("file")
      if (!(file instanceof File)) {
        return jsonError("BAD_REQUEST", "未提供文件", 400)
      }

      const data = await dependencies.uploadSiteLogo(admin.adminId, file)
      return jsonSuccess(data, "网站 Logo 上传成功")
    } catch (error) {
      console.error("Admin site logo upload error:", error)
      return toValidationError(error, "网站 Logo 上传失败")
    }
  }
}

export function createAdminSiteArticleListGetHandler(dependencies: {
  getRequestAdmin: (request: unknown) => Awaitable<RequestAdminResult>
  loadSiteArticleList: () => Promise<unknown>
}) {
  return async function GET(request: unknown) {
    try {
      const admin = await dependencies.getRequestAdmin(request)
      if (!admin.ok) {
        return jsonError("ADMIN_FORBIDDEN", admin.message, 403)
      }

      const data = await dependencies.loadSiteArticleList()
      return jsonSuccess(data, "通用文章列表读取成功")
    } catch (error) {
      console.error("Admin site article list GET error:", error)
      return jsonError("INTERNAL_ERROR", "通用文章列表读取失败", 500)
    }
  }
}

export function createAdminSiteArticleGetHandler(dependencies: {
  getRequestAdmin: (request: unknown) => Awaitable<RequestAdminResult>
  loadSiteArticle: (slug: SiteArticleSlug) => Promise<unknown>
}) {
  return async function GET(
    request: unknown,
    routeContext: { params: Promise<{ slug: string }> },
  ) {
    try {
      const admin = await dependencies.getRequestAdmin(request)
      if (!admin.ok) {
        return jsonError("ADMIN_FORBIDDEN", admin.message, 403)
      }

      const { slug: rawSlug } = await routeContext.params
      const slug = parseSiteArticleSlug(rawSlug)
      if (!slug.ok) {
        return jsonError(slug.code, slug.message, 400)
      }

      const data = await dependencies.loadSiteArticle(slug.data)
      return jsonSuccess(data, "通用文章读取成功")
    } catch (error) {
      console.error("Admin site article GET error:", error)
      return jsonError("INTERNAL_ERROR", "通用文章读取失败", 500)
    }
  }
}

export function createAdminSiteArticlePatchHandler(dependencies: {
  getRequestAdmin: (request: unknown) => Awaitable<RequestAdminResult>
  updateSiteArticle: (
    adminAccountId: string,
    slug: SiteArticleSlug,
    input: UpdateSiteArticleRequest,
  ) => Promise<unknown>
}) {
  return async function PATCH(
    request: Request,
    routeContext: { params: Promise<{ slug: string }> },
  ) {
    try {
      const admin = await dependencies.getRequestAdmin(request)
      if (!admin.ok) {
        return jsonError("ADMIN_FORBIDDEN", admin.message, 403)
      }

      const { slug: rawSlug } = await routeContext.params
      const slug = parseSiteArticleSlug(rawSlug)
      if (!slug.ok) {
        return jsonError(slug.code, slug.message, 400)
      }

      let body: unknown
      try {
        body = await request.json()
      } catch {
        return jsonError("BAD_REQUEST", "无效的请求体", 400)
      }

      const parsed = parseAdminSiteArticleBody(body)
      if (!parsed.ok) {
        return jsonError(parsed.code, parsed.message, 400)
      }

      const data = await dependencies.updateSiteArticle(admin.adminId, slug.data, parsed.data)
      return jsonSuccess(data, "通用文章已更新")
    } catch (error) {
      console.error("Admin site article PATCH error:", error)
      return toValidationError(error, "通用文章更新失败")
    }
  }
}
