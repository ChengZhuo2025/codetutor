import type { NextRequest } from "next/server"

const ADMIN_API_SECRET_HEADER = "x-admin-secret"
const ADMIN_ID_HEADER = "x-admin-id"
const DEFAULT_ADMIN_ID = "system-admin"

export type RequestAdminResult =
  | {
      ok: true
      adminId: string
    }
  | {
      ok: false
      reason: "missing-config" | "forbidden"
      message: string
    }

export function getRequestAdmin(request: NextRequest): RequestAdminResult {
  const expectedSecret = process.env.ADMIN_API_SECRET

  if (!expectedSecret) {
    return {
      ok: false,
      reason: "missing-config",
      message: "服务端缺少 ADMIN_API_SECRET，无法校验管理员接口。",
    }
  }

  const providedSecret = request.headers.get(ADMIN_API_SECRET_HEADER)

  if (!providedSecret || providedSecret !== expectedSecret) {
    return {
      ok: false,
      reason: "forbidden",
      message: "管理员凭证无效。",
    }
  }

  const adminId = request.headers.get(ADMIN_ID_HEADER)?.trim() || DEFAULT_ADMIN_ID

  return {
    ok: true,
    adminId,
  }
}
