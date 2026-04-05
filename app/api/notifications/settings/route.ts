import type { NextRequest } from "next/server"
import { withNoStoreHeaders } from "@/server/lib/response-cache"
import { getRequestAuth, getRequestAuthHelpText } from "@/server/lib/request-auth"
import {
  createNotificationSettingsGetHandler,
  createNotificationSettingsPatchHandler,
} from "@/server/modules/notifications/route-handler"
import {
  getNotificationSettings,
  updateNotificationSettings,
} from "@/server/modules/notifications/service"

const getHandler = createNotificationSettingsGetHandler({
  getRequestAuth: (request) => getRequestAuth(request as NextRequest),
  getRequestAuthHelpText,
  getNotificationSettings,
})

const patchHandler = createNotificationSettingsPatchHandler({
  getRequestAuth: (request) => getRequestAuth(request as NextRequest),
  getRequestAuthHelpText,
  updateNotificationSettings,
})

export async function GET(request: NextRequest) {
  return withNoStoreHeaders(await getHandler(request))
}

export async function PATCH(request: NextRequest) {
  return withNoStoreHeaders(await patchHandler(request))
}
