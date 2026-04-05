import type {
  NotificationInAppListResponseData,
  NotificationMutationResponseData,
  NotificationSettingsData,
  UpdateNotificationSettingsRequest,
} from "@/lib/api/contracts/notifications"
import {
  parseNotificationSettingsBody,
  parseRequiredRouteId,
} from "@/server/lib/request-validation"
import { jsonAuthRequired, jsonError, jsonSuccess } from "@/server/lib/route-response"

type RequestLike = {
  json: () => Promise<unknown>
}

export function createNotificationSettingsGetHandler(dependencies: {
  getRequestAuth: (request: unknown) => Promise<{ userId: string } | null>
  getRequestAuthHelpText: () => string
  getNotificationSettings: (userId: string) => Promise<NotificationSettingsData>
}) {
  return async function GET(request: unknown) {
    try {
      const auth = await dependencies.getRequestAuth(request)

      if (!auth) {
        return jsonAuthRequired(dependencies.getRequestAuthHelpText())
      }

      const data = await dependencies.getNotificationSettings(auth.userId)
      return jsonSuccess(data)
    } catch (error) {
      return jsonError(
        "INTERNAL_ERROR",
        error instanceof Error ? error.message : "读取通知设置失败",
        500,
      )
    }
  }
}

export function createNotificationSettingsPatchHandler(dependencies: {
  getRequestAuth: (request: unknown) => Promise<{ userId: string } | null>
  getRequestAuthHelpText: () => string
  updateNotificationSettings: (
    userId: string,
    input: UpdateNotificationSettingsRequest,
  ) => Promise<NotificationSettingsData>
}) {
  return async function PATCH(request: RequestLike) {
    try {
      const auth = await dependencies.getRequestAuth(request)

      if (!auth) {
        return jsonAuthRequired(dependencies.getRequestAuthHelpText())
      }

      const input = parseNotificationSettingsBody(await request.json())

      if (!input.ok) {
        return jsonError(input.code, input.message, 400)
      }

      const data = await dependencies.updateNotificationSettings(auth.userId, input.data)
      return jsonSuccess(data, "notification settings updated")
    } catch (error) {
      return jsonError(
        "INTERNAL_ERROR",
        error instanceof Error ? error.message : "保存通知设置失败",
        500,
      )
    }
  }
}

export function createInAppNotificationListGetHandler(dependencies: {
  getRequestAuth: (request: unknown) => Promise<{ userId: string } | null>
  getRequestAuthHelpText: () => string
  listInAppNotifications: (userId: string) => Promise<NotificationInAppListResponseData>
}) {
  return async function GET(request: unknown) {
    try {
      const auth = await dependencies.getRequestAuth(request)

      if (!auth) {
        return jsonAuthRequired(dependencies.getRequestAuthHelpText())
      }

      const data = await dependencies.listInAppNotifications(auth.userId)
      return jsonSuccess(data)
    } catch (error) {
      return jsonError(
        "INTERNAL_ERROR",
        error instanceof Error ? error.message : "读取站内提醒失败",
        500,
      )
    }
  }
}

export function createNotificationReadPostHandler(dependencies: {
  getRequestAuth: (request: unknown) => Promise<{ userId: string } | null>
  getRequestAuthHelpText: () => string
  markNotificationRead: (
    userId: string,
    notificationId: string,
  ) => Promise<NotificationMutationResponseData | null>
}) {
  return async function POST(
    request: unknown,
    context: { params: Promise<{ id?: string }> },
  ) {
    try {
      const auth = await dependencies.getRequestAuth(request)

      if (!auth) {
        return jsonAuthRequired(dependencies.getRequestAuthHelpText())
      }

      const params = await context.params
      const id = parseRequiredRouteId(params.id, "通知 ID 不合法。")

      if (!id.ok) {
        return jsonError(id.code, id.message, 400)
      }

      const data = await dependencies.markNotificationRead(auth.userId, id.data)
      if (!data) {
        return jsonError("NOT_FOUND", "当前通知不存在。", 404)
      }

      return jsonSuccess(data, "notification read")
    } catch (error) {
      return jsonError(
        "INTERNAL_ERROR",
        error instanceof Error ? error.message : "更新通知状态失败",
        500,
      )
    }
  }
}

export function createNotificationDismissPostHandler(dependencies: {
  getRequestAuth: (request: unknown) => Promise<{ userId: string } | null>
  getRequestAuthHelpText: () => string
  dismissNotification: (
    userId: string,
    notificationId: string,
  ) => Promise<NotificationMutationResponseData | null>
}) {
  return async function POST(
    request: unknown,
    context: { params: Promise<{ id?: string }> },
  ) {
    try {
      const auth = await dependencies.getRequestAuth(request)

      if (!auth) {
        return jsonAuthRequired(dependencies.getRequestAuthHelpText())
      }

      const params = await context.params
      const id = parseRequiredRouteId(params.id, "通知 ID 不合法。")

      if (!id.ok) {
        return jsonError(id.code, id.message, 400)
      }

      const data = await dependencies.dismissNotification(auth.userId, id.data)
      if (!data) {
        return jsonError("NOT_FOUND", "当前通知不存在。", 404)
      }

      return jsonSuccess(data, "notification dismissed")
    } catch (error) {
      return jsonError(
        "INTERNAL_ERROR",
        error instanceof Error ? error.message : "忽略通知失败",
        500,
      )
    }
  }
}
