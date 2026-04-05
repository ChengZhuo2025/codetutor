import test from "node:test"
import assert from "node:assert/strict"
import type { User } from "@supabase/supabase-js"

import {
  createAnalyticsTrackEventPostHandler,
} from "../server/modules/analytics/route-handler.ts"
import {
  createAuthLoginPostHandler,
  createProfileAvatarPostHandler,
  createProfileMeGetHandler,
  createProfileMePatchHandler,
} from "../server/modules/auth/route-handler.ts"
import {
  createAdminFeedbackBatchDeletePostHandler,
  createAdminFeedbackDetailGetHandler,
  createAdminFeedbackListGetHandler,
  createAdminReplyFeedbackPostHandler,
  createAdminFeedbackUserSnapshotGetHandler,
  createAdminUpdateFeedbackStatusPostHandler,
  createCreateFeedbackPostHandler,
  createMyFeedbackDetailGetHandler,
} from "../server/modules/feedback/route-handler.ts"
import {
  createHistoryDetailGetHandler,
  createRecentHistoryGetHandler,
  createUpdateHistoryStatusPostHandler,
} from "../server/modules/history/route-handler.ts"
import { createLearningMessagesGetHandler } from "../server/modules/learning/route-handler.ts"
import {
  createCompleteOnboardingPostHandler,
  createOnboardingPathOptionsGetHandler,
} from "../server/modules/onboarding/route-handler.ts"
import {
  createInAppNotificationListGetHandler,
  createNotificationDismissPostHandler,
  createNotificationReadPostHandler,
  createNotificationSettingsPatchHandler,
} from "../server/modules/notifications/route-handler.ts"
import {
  createCompleteTaskPostHandler,
  createUpdateTaskStatusPostHandler,
} from "../server/modules/tasks/route-handler.ts"

function createJsonRequest(url: string, body: string) {
  return new Request(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body,
  }) as never
}

function createPatchJsonRequest(url: string, body: string) {
  return new Request(url, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body,
  }) as never
}

function createFormRequest(url: string, formData: FormData) {
  return new Request(url, {
    method: "POST",
    body: formData,
  }) as never
}

test("analytics track route rejects invalid controlled event names", async () => {
  const handler = createAnalyticsTrackEventPostHandler({
    getRequestAuth: async () => null,
    trackAnalyticsEvent: async () => {
      throw new Error("should not write analytics event when payload is invalid")
    },
  })

  const response = await handler(
    createJsonRequest(
      "http://localhost:3000/api/analytics/event",
      JSON.stringify({ eventName: "bad_event" }),
    ),
  )

  assert.equal(response.status, 400)
  assert.deepEqual(await response.json(), {
    code: "VALIDATION_FAILED",
    message: "eventName 不合法。",
    data: null,
  })
})

test("notification settings patch route returns validation errors for malformed time fields", async () => {
  const handler = createNotificationSettingsPatchHandler({
    getRequestAuth: async () => ({ userId: "user-1" }),
    getRequestAuthHelpText: () => "ignored",
    updateNotificationSettings: async () => {
      throw new Error("should not update settings when payload is invalid")
    },
  })

  const response = await handler(
    createPatchJsonRequest(
      "http://localhost:3000/api/notifications/settings",
      JSON.stringify({
        checkinReminder: true,
        checkinTime: "9:00",
        progressPush: true,
        remindMethods: { app: true, email: false, wechat: false },
        doNotDisturb: false,
        doNotDisturbStart: "22:00",
        doNotDisturbEnd: "08:00",
      }),
    ),
  )

  assert.equal(response.status, 400)
  assert.deepEqual(await response.json(), {
    code: "VALIDATION_FAILED",
    message: "checkinTime 必须是 HH:mm 格式。",
    data: null,
  })
})

test("notification list route still requires auth", async () => {
  const handler = createInAppNotificationListGetHandler({
    getRequestAuth: async () => null,
    getRequestAuthHelpText: () => "请先登录。",
    listInAppNotifications: async () => {
      throw new Error("should not list notifications without auth")
    },
  })

  const response = await handler(
    new Request("http://localhost:3000/api/notifications/in-app", {
      method: "GET",
    }) as never,
  )

  assert.equal(response.status, 401)
  assert.deepEqual(await response.json(), {
    code: "AUTH_REQUIRED",
    message: "请先登录。",
    data: null,
  })
})

test("notification read route returns 404 when the notification does not belong to the user", async () => {
  const handler = createNotificationReadPostHandler({
    getRequestAuth: async () => ({ userId: "user-1" }),
    getRequestAuthHelpText: () => "ignored",
    markNotificationRead: async () => null,
  })

  const response = await handler(
    new Request("http://localhost:3000/api/notifications/notice-1/read", {
      method: "POST",
    }) as never,
    {
      params: Promise.resolve({
        id: "notice-1",
      }),
    },
  )

  assert.equal(response.status, 404)
  assert.deepEqual(await response.json(), {
    code: "NOT_FOUND",
    message: "当前通知不存在。",
    data: null,
  })
})

test("notification dismiss route validates route params before calling the service", async () => {
  const handler = createNotificationDismissPostHandler({
    getRequestAuth: async () => ({ userId: "user-1" }),
    getRequestAuthHelpText: () => "ignored",
    dismissNotification: async () => {
      throw new Error("should not dismiss when route id is invalid")
    },
  })

  const response = await handler(
    new Request("http://localhost:3000/api/notifications//dismiss", {
      method: "POST",
    }) as never,
    {
      params: Promise.resolve({
        id: "   ",
      }),
    },
  )

  assert.equal(response.status, 400)
  assert.deepEqual(await response.json(), {
    code: "BAD_REQUEST",
    message: "通知 ID 不合法。",
    data: null,
  })
})

test("task complete route returns 422 when request body is invalid", async () => {
  const handler = createCompleteTaskPostHandler({
    getRequestAuth: async () => ({ userId: "user-1" }),
    getRequestAuthHelpText: () => "ignored",
    completeTask: async () => {
      throw new Error("should not call service when request body is invalid")
    },
  })

  const response = await handler(
    createJsonRequest("http://localhost:3000/api/task/complete", JSON.stringify({ taskId: "" })),
  )

  assert.equal(response.status, 422)
  assert.deepEqual(await response.json(), {
    code: "VALIDATION_FAILED",
    message: "taskId 不合法。",
    data: null,
  })
})

test("task update-status route keeps business validation errors at 400", async () => {
  const handler = createUpdateTaskStatusPostHandler({
    getRequestAuth: async () => ({ userId: "user-1" }),
    getRequestAuthHelpText: () => "ignored",
    updateTaskStatus: async () => {
      throw new Error("只能更新当前正在进行的关卡状态")
    },
  })

  const response = await handler(
    createJsonRequest(
      "http://localhost:3000/api/task/update-status",
      JSON.stringify({ taskId: "task-1", status: "blocked" }),
    ),
  )

  assert.equal(response.status, 400)
  assert.deepEqual(await response.json(), {
    code: "VALIDATION_FAILED",
    message: "只能更新当前正在进行的关卡状态",
    data: null,
  })
})

test("feedback route returns stable validation message for short title", async () => {
  const handler = createCreateFeedbackPostHandler({
    getRequestAuth: async () => ({ userId: "user-1" }),
    getRequestAuthHelpText: () => "ignored",
    createFeedbackTicket: async () => {
      throw new Error("should not create feedback when body validation fails")
    },
  })

  const response = await handler(
    createJsonRequest(
      "http://localhost:3000/api/feedback",
      JSON.stringify({
        feedbackType: "issue_report",
        title: "abc",
        content: "这是一段足够长的反馈内容。",
      }),
    ),
  )

  assert.equal(response.status, 400)
  assert.deepEqual(await response.json(), {
    code: "VALIDATION_FAILED",
    message: "标题至少需要 4 个字符。",
    data: null,
  })
})

test("history status route preserves conflict mapping after shared validation migration", async () => {
  const handler = createUpdateHistoryStatusPostHandler({
    getRequestAuth: async () => ({ userId: "user-1" }),
    getRequestAuthHelpText: () => "ignored",
    updateHistoryPlanStatus: async () => {
      const error = new Error("当前已有进行中的学习计划")
      error.name = "CONFLICT"
      throw error
    },
  })

  const response = await handler(
    createJsonRequest(
      "http://localhost:3000/api/history/path-1/status",
      JSON.stringify({ action: "archive" }),
    ),
    {
      params: Promise.resolve({
        id: "path-1",
      }),
    },
  )

  assert.equal(response.status, 409)
  assert.deepEqual(await response.json(), {
    code: "CONFLICT",
    message: "当前已有进行中的学习计划",
    data: null,
  })
})

test("auth login route still requires auth before processing shared body schema", async () => {
  const handler = createAuthLoginPostHandler({
    getRequestAuth: async () => null,
    getRequestAuthHelpText: () => "请先登录后再试。",
    finalizeAuthLogin: async () => {
      throw new Error("should not finalize login without auth")
    },
  })

  const response = await handler(
    createJsonRequest(
      "http://localhost:3000/api/auth/login",
      JSON.stringify({ loginType: "phone" }),
    ),
  )

  assert.equal(response.status, 401)
  assert.deepEqual(await response.json(), {
    code: "AUTH_REQUIRED",
    message: "请先登录后再试。",
    data: null,
  })
})

test("auth login route keeps shared validation error for invalid loginType", async () => {
  const handler = createAuthLoginPostHandler({
    getRequestAuth: async () => ({
      user: {
        id: "user-1",
      } as User,
    }),
    getRequestAuthHelpText: () => "ignored",
    finalizeAuthLogin: async () => {
      throw new Error("should not finalize login with invalid payload")
    },
  })

  const response = await handler(
    createJsonRequest(
      "http://localhost:3000/api/auth/login",
      JSON.stringify({ loginType: "email" }),
    ),
  )

  assert.equal(response.status, 400)
  assert.deepEqual(await response.json(), {
    code: "BAD_REQUEST",
    message: "loginType 不合法。",
    data: null,
  })
})

test("profile me get route preserves not-found mapping", async () => {
  const handler = createProfileMeGetHandler({
    getRequestAuth: async () => ({ userId: "user-1" }),
    getRequestAuthHelpText: () => "ignored",
    getProfileMe: async () => null,
  })

  const response = await handler(
    new Request("http://localhost:3000/api/profile/me", {
      method: "GET",
    }) as never,
  )

  assert.equal(response.status, 404)
  assert.deepEqual(await response.json(), {
    code: "NOT_FOUND",
    message: "当前用户档案不存在。",
    data: null,
  })
})

test("profile me patch route returns shared validation message for invalid nickname", async () => {
  const handler = createProfileMePatchHandler({
    getRequestAuth: async () => ({ userId: "user-1" }),
    getRequestAuthHelpText: () => "ignored",
    updateProfileMe: async () => {
      throw new Error("should not update profile when payload is invalid")
    },
  })

  const response = await handler(
    createPatchJsonRequest(
      "http://localhost:3000/api/profile/me",
      JSON.stringify({
        nickname: "a",
      }),
    ),
  )

  assert.equal(response.status, 400)
  assert.deepEqual(await response.json(), {
    code: "VALIDATION_FAILED",
    message: "昵称至少需要 2 个字符。",
    data: null,
  })
})

test("onboarding complete route preserves 422 for invalid enum payload", async () => {
  const handler = createCompleteOnboardingPostHandler({
    getRequestAuth: async () => ({ userId: "user-1" }),
    getRequestAuthHelpText: () => "ignored",
    completeOnboarding: async () => {
      throw new Error("should not complete onboarding with invalid payload")
    },
  })

  const response = await handler(
    createJsonRequest(
      "http://localhost:3000/api/onboarding/complete",
      JSON.stringify({
        toolCode: "cursor",
        learningLevel: "expert",
        selectionMode: "preset_training",
      }),
    ),
  )

  assert.equal(response.status, 422)
  assert.deepEqual(await response.json(), {
    code: "VALIDATION_FAILED",
    message: "learningLevel 或 selectionMode 不合法。",
    data: null,
  })
})

test("onboarding path-options route keeps bad request message for invalid query", async () => {
  const handler = createOnboardingPathOptionsGetHandler({
    getOnboardingPathOptionsData: async () => {
      throw new Error("should not load options when query is invalid")
    },
  })

  const response = await handler(
    new Request("http://localhost:3000/api/onboarding/path-options?toolCode=cursor", {
      method: "GET",
    }) as never,
  )

  assert.equal(response.status, 400)
  assert.deepEqual(await response.json(), {
    code: "BAD_REQUEST",
    message: "缺少合法的 toolCode 或 learningLevel。",
    data: null,
  })
})

test("admin feedback list route preserves validation message for invalid limit", async () => {
  const handler = createAdminFeedbackListGetHandler({
    getRequestAdmin: () => ({
      ok: true,
      adminId: "admin-1",
    }),
    getAdminFeedbackList: async () => {
      throw new Error("should not query admin feedback list with invalid query")
    },
  })

  const response = await handler(
    new Request("http://localhost:3000/api/admin/feedback?limit=101", {
      method: "GET",
    }) as never,
  )

  assert.equal(response.status, 400)
  assert.deepEqual(await response.json(), {
    code: "VALIDATION_FAILED",
    message: "limit 必须在 1 到 100 之间。",
    data: null,
  })
})

test("admin reply route keeps validation-failed message for short reply content", async () => {
  const handler = createAdminReplyFeedbackPostHandler({
    getRequestAdmin: () => ({
      ok: true,
      adminId: "admin-1",
    }),
    adminReplyFeedback: async () => {
      throw new Error("should not reply when payload is invalid")
    },
  })

  const response = await handler(
    createJsonRequest(
      "http://localhost:3000/api/admin/feedback/ticket-1/reply",
      JSON.stringify({
        content: "a",
      }),
    ),
    {
      params: Promise.resolve({
        id: "ticket-1",
      }),
    },
  )

  assert.equal(response.status, 400)
  assert.deepEqual(await response.json(), {
    code: "VALIDATION_FAILED",
    message: "回复内容至少需要 2 个字符。",
    data: null,
  })
})

test("admin status route keeps generic bad request response for invalid body shape", async () => {
  const handler = createAdminUpdateFeedbackStatusPostHandler({
    getRequestAdmin: () => ({
      ok: true,
      adminId: "admin-1",
    }),
    adminUpdateFeedbackStatus: async () => {
      throw new Error("should not update status when payload is invalid")
    },
  })

  const response = await handler(
    createJsonRequest(
      "http://localhost:3000/api/admin/feedback/ticket-1/status",
      JSON.stringify({
        status: "pending",
      }),
    ),
    {
      params: Promise.resolve({
        id: "ticket-1",
      }),
    },
  )

  assert.equal(response.status, 400)
  assert.deepEqual(await response.json(), {
    code: "BAD_REQUEST",
    message: "管理员状态更新请求体不合法。",
    data: null,
  })
})

test("learning messages route preserves 422 for invalid conversationId query", async () => {
  const handler = createLearningMessagesGetHandler({
    getRequestAuth: async () => ({ userId: "user-1" }),
    getRequestAuthHelpText: () => "ignored",
    getLearningMessagesPage: async () => {
      throw new Error("should not load messages when query is invalid")
    },
  })

  const response = await handler(
    new Request("http://localhost:3000/api/learning/messages?conversationId=bad-id", {
      method: "GET",
    }) as never,
  )

  assert.equal(response.status, 422)
  assert.deepEqual(await response.json(), {
    code: "VALIDATION_FAILED",
    message: "conversationId 不合法。",
    data: null,
  })
})

test("my feedback detail route preserves route id validation", async () => {
  const handler = createMyFeedbackDetailGetHandler({
    getRequestAuth: async () => ({ userId: "user-1" }),
    getRequestAuthHelpText: () => "ignored",
    getMyFeedbackDetail: async () => {
      throw new Error("should not load detail when route id is invalid")
    },
  })

  const response = await handler(
    new Request("http://localhost:3000/api/feedback/mine/%20", {
      method: "GET",
    }) as never,
    {
      params: Promise.resolve({
        id: "   ",
      }),
    },
  )

  assert.equal(response.status, 400)
  assert.deepEqual(await response.json(), {
    code: "BAD_REQUEST",
    message: "反馈单 ID 不合法。",
    data: null,
  })
})

test("admin feedback detail route preserves route id validation", async () => {
  const handler = createAdminFeedbackDetailGetHandler({
    getRequestAdmin: () => ({
      ok: true,
      adminId: "admin-1",
    }),
    getAdminFeedbackDetail: async () => {
      throw new Error("should not load admin detail when route id is invalid")
    },
  })

  const response = await handler(
    new Request("http://localhost:3000/api/admin/feedback/%20", {
      method: "GET",
    }) as never,
    {
      params: Promise.resolve({
        id: "   ",
      }),
    },
  )

  assert.equal(response.status, 400)
  assert.deepEqual(await response.json(), {
    code: "BAD_REQUEST",
    message: "反馈单 ID 不合法。",
    data: null,
  })
})

test("admin feedback user-snapshot route preserves route id validation", async () => {
  const handler = createAdminFeedbackUserSnapshotGetHandler({
    getRequestAdmin: () => ({
      ok: true,
      adminId: "admin-1",
    }),
    getAdminFeedbackUserSnapshot: async () => {
      throw new Error("should not load user snapshot when route id is invalid")
    },
  })

  const response = await handler(
    new Request("http://localhost:3000/api/admin/feedback/%20/user-snapshot", {
      method: "GET",
    }) as never,
    {
      params: Promise.resolve({
        id: "   ",
      }),
    },
  )

  assert.equal(response.status, 400)
  assert.deepEqual(await response.json(), {
    code: "BAD_REQUEST",
    message: "反馈单 ID 不合法。",
    data: null,
  })
})

test("admin feedback batch-delete route preserves validation message for empty ids", async () => {
  const handler = createAdminFeedbackBatchDeletePostHandler({
    getRequestAdmin: () => ({
      ok: true,
      adminId: "admin-1",
    }),
    adminBatchDeleteFeedback: async () => {
      throw new Error("should not batch delete when payload is invalid")
    },
  })

  const response = await handler(
    createJsonRequest(
      "http://localhost:3000/api/admin/feedback/batch-delete",
      JSON.stringify({
        ids: [],
      }),
    ),
  )

  assert.equal(response.status, 400)
  assert.deepEqual(await response.json(), {
    code: "VALIDATION_FAILED",
    message: "至少选择 1 条工单。",
    data: null,
  })
})

test("history detail route preserves not-found mapping", async () => {
  const handler = createHistoryDetailGetHandler({
    getRequestAuth: async () => ({ userId: "user-1" }),
    getRequestAuthHelpText: () => "ignored",
    getHistoryDetail: async () => null,
  })

  const response = await handler(
    new Request("http://localhost:3000/api/history/path-1", {
      method: "GET",
    }) as never,
    {
      params: Promise.resolve({
        id: "path-1",
      }),
    },
  )

  assert.equal(response.status, 404)
  assert.deepEqual(await response.json(), {
    code: "NOT_FOUND",
    message: "学习计划不存在。",
    data: null,
  })
})

test("history recent route still requires auth", async () => {
  const handler = createRecentHistoryGetHandler({
    getRequestAuth: async () => null,
    getRequestAuthHelpText: () => "请先登录后再试。",
    getRecentHistoryData: async () => {
      throw new Error("should not load history without auth")
    },
  })

  const response = await handler(
    new Request("http://localhost:3000/api/history/recent?page=2&pageSize=10", {
      method: "GET",
    }) as never,
  )

  assert.equal(response.status, 401)
  assert.deepEqual(await response.json(), {
    code: "AUTH_REQUIRED",
    message: "请先登录后再试。",
    data: null,
  })
})

test("profile avatar route returns shared file validation message", async () => {
  const handler = createProfileAvatarPostHandler({
    getRequestAuth: async () => ({ userId: "user-1" }),
    getRequestAuthHelpText: () => "ignored",
    uploadProfileAvatar: async () => {
      throw new Error("should not upload invalid avatar")
    },
  })

  const formData = new FormData()
  formData.set("file", new File(["avatar"], "avatar.txt", { type: "text/plain" }))

  const response = await handler(
    createFormRequest("http://localhost:3000/api/profile/avatar", formData),
  )

  assert.equal(response.status, 400)
  assert.deepEqual(await response.json(), {
    code: "VALIDATION_FAILED",
    message: "头像仅支持 JPG、PNG、WebP 格式。",
    data: null,
  })
})
