import type { NextRequest } from "next/server"
import { getRequestAdmin } from "@/server/lib/request-admin"
import { createAdminFinanceOrderDetailGetHandler } from "@/server/modules/payments/route-handler"
import { getAdminFinanceOrderDetail } from "@/server/modules/payments/service"

const handler = createAdminFinanceOrderDetailGetHandler({
  getRequestAdmin: (request) => getRequestAdmin(request as NextRequest),
  getAdminFinanceOrderDetail,
})

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ orderNo: string }> },
) {
  return handler(request, context)
}
