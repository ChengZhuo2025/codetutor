import type { NextRequest } from "next/server"
import { getRequestAdmin } from "@/server/lib/request-admin"
import { createAdminFinanceStatsGetHandler } from "@/server/modules/payments/route-handler"
import { getAdminFinanceStats } from "@/server/modules/payments/service"

const handler = createAdminFinanceStatsGetHandler({
  getRequestAdmin: (request) => getRequestAdmin(request as NextRequest),
  getAdminFinanceStats,
})

export async function GET(request: NextRequest) {
  return handler(request)
}
