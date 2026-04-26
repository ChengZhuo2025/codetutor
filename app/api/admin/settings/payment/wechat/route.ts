import type { NextRequest } from "next/server"
import { getRequestAdmin } from "@/server/lib/request-admin"
import {
  createAdminWechatPaymentSettingsGetHandler,
  createAdminWechatPaymentSettingsPatchHandler,
} from "@/server/modules/payments/route-handler"
import {
  getWechatPaymentSettings,
  updateWechatPaymentSettings,
} from "@/server/modules/payments/service"

const getHandler = createAdminWechatPaymentSettingsGetHandler({
  getRequestAdmin: (request) => getRequestAdmin(request as NextRequest),
  getWechatPaymentSettings,
})

const patchHandler = createAdminWechatPaymentSettingsPatchHandler({
  getRequestAdmin: (request) => getRequestAdmin(request as NextRequest),
  updateWechatPaymentSettings,
})

export async function GET(request: NextRequest) {
  return getHandler(request)
}

export async function PATCH(request: NextRequest) {
  return patchHandler(request)
}
