import type { NextRequest } from "next/server"
import { getRequestAdmin } from "@/server/lib/request-admin"
import { createAdminFinanceOrdersGetHandler } from "@/server/modules/payments/route-handler"
import { getAdminFinanceOrders } from "@/server/modules/payments/service"

const handler = createAdminFinanceOrdersGetHandler({
  getRequestAdmin: (request) => getRequestAdmin(request as NextRequest),
  getAdminFinanceOrders,
})

export async function GET(request: NextRequest) {
  return handler(request)
}
