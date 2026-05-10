import type { NextRequest } from "next/server"
import {
  createAdminSubscriptionPlanDeleteHandler,
  createAdminSubscriptionPlanPatchHandler,
} from "@/server/modules/payments/route-handler"
import {
  archiveAdminSubscriptionPlan,
  updateAdminSubscriptionPlan,
} from "@/server/modules/payments/service"
import { getRequestAdmin } from "@/server/lib/request-admin"

const patchHandler = createAdminSubscriptionPlanPatchHandler({
  getRequestAdmin: (request) => getRequestAdmin(request as NextRequest),
  updateAdminSubscriptionPlan,
})

const deleteHandler = createAdminSubscriptionPlanDeleteHandler({
  getRequestAdmin: (request) => getRequestAdmin(request as NextRequest),
  archiveAdminSubscriptionPlan,
})

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ code: string }> },
) {
  return patchHandler(request, context)
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ code: string }> },
) {
  return deleteHandler(request, context)
}
