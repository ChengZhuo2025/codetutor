import type { NextRequest } from "next/server"
import { getRequestAdmin } from "@/server/lib/request-admin"
import { createAdminFinanceOrderSyncPostHandler } from "@/server/modules/payments/route-handler"
import { syncAdminFinanceOrder } from "@/server/modules/payments/service"

const handler = createAdminFinanceOrderSyncPostHandler({
  getRequestAdmin: (request) => getRequestAdmin(request as NextRequest),
  syncAdminFinanceOrder,
})

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ orderNo: string }> },
) {
  return handler(request, context)
}
