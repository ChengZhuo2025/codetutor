import type { NextRequest } from "next/server"
import {
  createAdminSubscriptionPlansGetHandler,
  createAdminSubscriptionPlansPostHandler,
} from "@/server/modules/payments/route-handler"
import {
  createAdminSubscriptionPlan,
  getAdminSubscriptionPlans,
} from "@/server/modules/payments/service"
import { getRequestAdmin } from "@/server/lib/request-admin"

const getHandler = createAdminSubscriptionPlansGetHandler({
  getRequestAdmin: (request) => getRequestAdmin(request as NextRequest),
  getAdminSubscriptionPlans,
})

const postHandler = createAdminSubscriptionPlansPostHandler({
  getRequestAdmin: (request) => getRequestAdmin(request as NextRequest),
  createAdminSubscriptionPlan,
})

export async function GET(request: NextRequest) {
  return getHandler(request)
}

export async function POST(request: NextRequest) {
  return postHandler(request)
}
