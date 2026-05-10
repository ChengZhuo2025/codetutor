import type { NextRequest } from "next/server"
import {
  createAdminAlipayPaymentSettingsGetHandler,
  createAdminAlipayPaymentSettingsPatchHandler,
} from "@/server/modules/payments/route-handler"
import { getRequestAdmin } from "@/server/lib/request-admin"
import {
  getAlipayPaymentSettings,
  updateAlipayPaymentSettings,
} from "@/server/modules/payments/service"

const getHandler = createAdminAlipayPaymentSettingsGetHandler({
  getRequestAdmin: (request) => getRequestAdmin(request as NextRequest),
  getAlipayPaymentSettings,
})

const patchHandler = createAdminAlipayPaymentSettingsPatchHandler({
  getRequestAdmin: (request) => getRequestAdmin(request as NextRequest),
  updateAlipayPaymentSettings,
})

export async function GET(request: NextRequest) {
  return getHandler(request)
}

export async function PATCH(request: NextRequest) {
  return patchHandler(request)
}
