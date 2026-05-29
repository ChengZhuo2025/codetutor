import { jsonError, jsonSuccess } from "@/server/lib/route-response"
import {
  parseAdminSiteChangelogGenerateBody,
  parseAdminSiteChangelogListQuery,
  parseAdminSiteChangelogUpdateBody,
  parsePublicSiteChangelogListQuery,
  parseSiteChangelogEntryId,
} from "@/server/lib/request-validation"
import type {
  AdminSiteChangelogGenerateRequest,
  AdminSiteChangelogListQuery,
  AdminSiteChangelogUpdateRequest,
  PublicSiteChangelogListQuery,
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

function mapChangelogError(error: unknown, fallbackMessage: string) {
  const err = error as Error
  switch (err?.name) {
    case "GIT_SOURCE_UNAVAILABLE":
      return jsonError("GIT_SOURCE_UNAVAILABLE", err.message, 503)
    case "NO_COMMITS_FOUND":
      return jsonError("NO_COMMITS_FOUND", err.message, 409)
    case "CHANGELOG_ALREADY_PUBLISHED":
      return jsonError("CHANGELOG_ALREADY_PUBLISHED", err.message, 409)
    case "CHANGELOG_DRAFT_EXISTS":
      return jsonError("CHANGELOG_DRAFT_EXISTS", err.message, 409)
    case "AI_MODEL_UNAVAILABLE":
      return jsonError("AI_MODEL_UNAVAILABLE", err.message, 409)
    case "AI_GENERATION_FAILED":
      return jsonError("AI_GENERATION_FAILED", err.message, 502)
    case "INVALID_STATUS_TRANSITION":
      return jsonError("INVALID_STATUS_TRANSITION", err.message, 409)
    default:
      return jsonError("INTERNAL_ERROR", err?.message || fallbackMessage, 500)
  }
}

async function readJsonBody(request: Request) {
  try {
    return await request.json()
  } catch {
    return null
  }
}

export function createAdminSiteChangelogListGetHandler(dependencies: {
  getRequestAdmin: (request: unknown) => Awaitable<RequestAdminResult>
  loadAdminSiteChangelogEntries: (query: AdminSiteChangelogListQuery) => Promise<unknown>
}) {
  return async function GET(request: Request) {
    try {
      const admin = await dependencies.getRequestAdmin(request)
      if (!admin.ok) {
        return jsonError("ADMIN_FORBIDDEN", admin.message, 403)
      }
      const parsed = parseAdminSiteChangelogListQuery(new URL(request.url).searchParams)
      if (!parsed.ok) {
        return jsonError(parsed.code, parsed.message, 400)
      }
      const data = await dependencies.loadAdminSiteChangelogEntries(parsed.data)
      return jsonSuccess(data, "更新日志列表读取成功")
    } catch (error) {
      console.error("Admin site changelog list GET error:", error)
      return mapChangelogError(error, "更新日志列表读取失败")
    }
  }
}

export function createAdminSiteChangelogGeneratePostHandler(dependencies: {
  getRequestAdmin: (request: unknown) => Awaitable<RequestAdminResult>
  generateSiteChangelogDraft: (
    adminAccountId: string,
    input: AdminSiteChangelogGenerateRequest,
  ) => Promise<unknown>
}) {
  return async function POST(request: Request) {
    try {
      const admin = await dependencies.getRequestAdmin(request)
      if (!admin.ok) {
        return jsonError("ADMIN_FORBIDDEN", admin.message, 403)
      }
      const body = await readJsonBody(request)
      if (body === null) {
        return jsonError("BAD_REQUEST", "无效的请求体", 400)
      }
      const parsed = parseAdminSiteChangelogGenerateBody(body)
      if (!parsed.ok) {
        return jsonError(parsed.code, parsed.message, 400)
      }
      const data = await dependencies.generateSiteChangelogDraft(admin.adminId, parsed.data)
      return jsonSuccess(data, "更新日志草稿已生成")
    } catch (error) {
      console.error("Admin site changelog generate POST error:", error)
      return mapChangelogError(error, "更新日志草稿生成失败")
    }
  }
}

export function createAdminSiteChangelogGetHandler(dependencies: {
  getRequestAdmin: (request: unknown) => Awaitable<RequestAdminResult>
  loadAdminSiteChangelogEntry: (entryId: string) => Promise<unknown | null>
}) {
  return async function GET(
    request: Request,
    routeContext: { params: Promise<{ entryId: string }> },
  ) {
    try {
      const admin = await dependencies.getRequestAdmin(request)
      if (!admin.ok) {
        return jsonError("ADMIN_FORBIDDEN", admin.message, 403)
      }
      const { entryId: rawEntryId } = await routeContext.params
      const entryId = parseSiteChangelogEntryId(rawEntryId)
      if (!entryId.ok) {
        return jsonError(entryId.code, entryId.message, 400)
      }
      const data = await dependencies.loadAdminSiteChangelogEntry(entryId.data)
      if (!data) {
        return jsonError("NOT_FOUND", "更新日志不存在", 404)
      }
      return jsonSuccess(data, "更新日志读取成功")
    } catch (error) {
      console.error("Admin site changelog GET error:", error)
      return mapChangelogError(error, "更新日志读取失败")
    }
  }
}

export function createAdminSiteChangelogPatchHandler(dependencies: {
  getRequestAdmin: (request: unknown) => Awaitable<RequestAdminResult>
  updateSiteChangelogEntry: (
    adminAccountId: string,
    entryId: string,
    input: AdminSiteChangelogUpdateRequest,
  ) => Promise<unknown | null>
}) {
  return async function PATCH(
    request: Request,
    routeContext: { params: Promise<{ entryId: string }> },
  ) {
    try {
      const admin = await dependencies.getRequestAdmin(request)
      if (!admin.ok) {
        return jsonError("ADMIN_FORBIDDEN", admin.message, 403)
      }
      const { entryId: rawEntryId } = await routeContext.params
      const entryId = parseSiteChangelogEntryId(rawEntryId)
      if (!entryId.ok) {
        return jsonError(entryId.code, entryId.message, 400)
      }
      const body = await readJsonBody(request)
      if (body === null) {
        return jsonError("BAD_REQUEST", "无效的请求体", 400)
      }
      const parsed = parseAdminSiteChangelogUpdateBody(body)
      if (!parsed.ok) {
        return jsonError(parsed.code, parsed.message, 400)
      }
      const data = await dependencies.updateSiteChangelogEntry(admin.adminId, entryId.data, parsed.data)
      if (!data) {
        return jsonError("NOT_FOUND", "更新日志不存在", 404)
      }
      return jsonSuccess(data, "更新日志已更新")
    } catch (error) {
      console.error("Admin site changelog PATCH error:", error)
      return mapChangelogError(error, "更新日志更新失败")
    }
  }
}

function createEntryActionPostHandler(dependencies: {
  getRequestAdmin: (request: unknown) => Awaitable<RequestAdminResult>
  action: (adminAccountId: string, entryId: string) => Promise<unknown | null>
  successMessage: string
  logLabel: string
}) {
  return async function POST(
    request: Request,
    routeContext: { params: Promise<{ entryId: string }> },
  ) {
    try {
      const admin = await dependencies.getRequestAdmin(request)
      if (!admin.ok) {
        return jsonError("ADMIN_FORBIDDEN", admin.message, 403)
      }
      const { entryId: rawEntryId } = await routeContext.params
      const entryId = parseSiteChangelogEntryId(rawEntryId)
      if (!entryId.ok) {
        return jsonError(entryId.code, entryId.message, 400)
      }
      const data = await dependencies.action(admin.adminId, entryId.data)
      if (!data) {
        return jsonError("NOT_FOUND", "更新日志不存在", 404)
      }
      return jsonSuccess(data, dependencies.successMessage)
    } catch (error) {
      console.error(`Admin site changelog ${dependencies.logLabel} error:`, error)
      return mapChangelogError(error, "更新日志操作失败")
    }
  }
}

export function createAdminSiteChangelogPublishPostHandler(dependencies: {
  getRequestAdmin: (request: unknown) => Awaitable<RequestAdminResult>
  publishSiteChangelogEntry: (adminAccountId: string, entryId: string) => Promise<unknown | null>
}) {
  return createEntryActionPostHandler({
    getRequestAdmin: dependencies.getRequestAdmin,
    action: dependencies.publishSiteChangelogEntry,
    successMessage: "更新日志已发布",
    logLabel: "publish POST",
  })
}

export function createAdminSiteChangelogArchivePostHandler(dependencies: {
  getRequestAdmin: (request: unknown) => Awaitable<RequestAdminResult>
  archiveSiteChangelogEntry: (adminAccountId: string, entryId: string) => Promise<unknown | null>
}) {
  return createEntryActionPostHandler({
    getRequestAdmin: dependencies.getRequestAdmin,
    action: dependencies.archiveSiteChangelogEntry,
    successMessage: "更新日志已归档",
    logLabel: "archive POST",
  })
}

export function createAdminSiteChangelogDeleteHandler(dependencies: {
  getRequestAdmin: (request: unknown) => Awaitable<RequestAdminResult>
  deleteSiteChangelogEntry: (adminAccountId: string, entryId: string) => Promise<unknown | null>
}) {
  return async function DELETE(
    request: Request,
    routeContext: { params: Promise<{ entryId: string }> },
  ) {
    try {
      const admin = await dependencies.getRequestAdmin(request)
      if (!admin.ok) {
        return jsonError("ADMIN_FORBIDDEN", admin.message, 403)
      }
      const { entryId: rawEntryId } = await routeContext.params
      const entryId = parseSiteChangelogEntryId(rawEntryId)
      if (!entryId.ok) {
        return jsonError(entryId.code, entryId.message, 400)
      }
      const data = await dependencies.deleteSiteChangelogEntry(admin.adminId, entryId.data)
      if (!data) {
        return jsonError("NOT_FOUND", "更新日志不存在", 404)
      }
      return jsonSuccess(data, "更新日志已删除")
    } catch (error) {
      console.error("Admin site changelog DELETE error:", error)
      return mapChangelogError(error, "更新日志删除失败")
    }
  }
}

export function createPublicSiteChangelogListGetHandler(dependencies: {
  loadPublicSiteChangelogEntries: (query: PublicSiteChangelogListQuery) => Promise<unknown>
}) {
  return async function GET(request: Request) {
    try {
      const parsed = parsePublicSiteChangelogListQuery(new URL(request.url).searchParams)
      if (!parsed.ok) {
        return jsonError(parsed.code, parsed.message, 400)
      }
      const data = await dependencies.loadPublicSiteChangelogEntries(parsed.data)
      return jsonSuccess(data, "公开更新日志读取成功")
    } catch (error) {
      console.error("Public site changelog list GET error:", error)
      return jsonError("INTERNAL_ERROR", "公开更新日志读取失败", 500)
    }
  }
}

export function createPublicSiteChangelogGetHandler(dependencies: {
  loadPublicSiteChangelogEntry: (entryId: string) => Promise<unknown | null>
}) {
  return async function GET(
    request: Request,
    routeContext: { params: Promise<{ entryId: string }> },
  ) {
    try {
      const { entryId: rawEntryId } = await routeContext.params
      const entryId = parseSiteChangelogEntryId(rawEntryId)
      if (!entryId.ok) {
        return jsonError(entryId.code, entryId.message, 400)
      }
      const data = await dependencies.loadPublicSiteChangelogEntry(entryId.data)
      if (!data) {
        return jsonError("NOT_FOUND", "更新日志不存在", 404)
      }
      return jsonSuccess(data, "公开更新日志读取成功")
    } catch (error) {
      console.error("Public site changelog GET error:", error)
      return jsonError("INTERNAL_ERROR", "公开更新日志读取失败", 500)
    }
  }
}
