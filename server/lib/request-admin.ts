import type { NextRequest } from "next/server"
import { getAdminSessionFromRequest } from "@/server/modules/admin-auth/service"

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

export async function getRequestAdmin(request: NextRequest): Promise<RequestAdminResult> {
  const session = await getAdminSessionFromRequest(request)

  if (!session) {
    return {
      ok: false,
      reason: "forbidden",
      message: "管理员登录态无效或已过期。",
    }
  }

  return {
    ok: true,
    adminId: session.adminAccountId,
  }
}
