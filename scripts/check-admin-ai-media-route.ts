import test from "node:test"
import assert from "node:assert/strict"

import {
  createAdminAIMediaAttachmentListGetHandler,
  createAdminAIMediaTranscriptionSettingDetailPatchHandler,
  createAdminAIMediaTranscriptionSettingListGetHandler,
} from "../server/modules/admin-ai/route-handler.ts"

const okAdmin = { ok: true as const, adminId: "admin-1" }
const forbiddenAdmin = {
  ok: false as const,
  reason: "forbidden" as const,
  message: "no access",
}

test("media transcription settings route returns 403 when admin lacks access", async () => {
  const handler = createAdminAIMediaTranscriptionSettingListGetHandler({
    getRequestAdmin: async () => forbiddenAdmin,
    getAdminAIMediaTranscriptionSettings: async () => {
      throw new Error("should not call service")
    },
  })

  const response = await handler(new Request("http://localhost/api/admin/ai/media/transcription-settings") as never)

  assert.equal(response.status, 403)
  assert.deepEqual(await response.json(), {
    code: "ADMIN_FORBIDDEN",
    message: "no access",
    data: null,
  })
})

test("media transcription settings route returns service data", async () => {
  const handler = createAdminAIMediaTranscriptionSettingListGetHandler({
    getRequestAdmin: async () => okAdmin,
    getAdminAIMediaTranscriptionSettings: async (adminAccountId) => {
      assert.equal(adminAccountId, "admin-1")
      return {
        items: [],
        modelOptions: [],
      }
    },
  })

  const response = await handler(new Request("http://localhost/api/admin/ai/media/transcription-settings") as never)
  const payload = await response.json()

  assert.equal(response.status, 200)
  assert.equal(payload.code, "OK")
  assert.deepEqual(payload.data, {
    items: [],
    modelOptions: [],
  })
})

test("media transcription setting patch validates body and delegates update", async () => {
  const handler = createAdminAIMediaTranscriptionSettingDetailPatchHandler({
    getRequestAdmin: async () => okAdmin,
    updateAdminAIMediaTranscriptionSetting: async (adminAccountId, settingId, input) => {
      assert.equal(adminAccountId, "admin-1")
      assert.equal(settingId, "setting-1")
      assert.deepEqual(input, {
        modelId: "model-1",
        isEnabled: true,
        speechSpeed: 1.12,
        version: 3,
        changeReason: "切换图片模型",
      })
      return {
        setting: {
          settingId: "setting-1",
          mediaType: "text_to_speech",
          label: "文本转语音",
          description: "用户端 AI 回复播读",
          requiredCapability: "tts",
          modelId: "model-1",
          modelCode: "qwen3-6-flash",
          modelDisplayName: "Qwen3.6 Flash",
          providerCode: "aliyuncs",
          providerName: "Aliyun Bailian",
          isEnabled: true,
          speechSpeed: null,
          version: 4,
          metadata: {},
          createdAt: "2026-05-13T00:00:00.000Z",
          updatedAt: "2026-05-13T01:00:00.000Z",
        },
      }
    },
  })

  const response = await handler(
    new Request("http://localhost/api/admin/ai/media/transcription-settings/setting-1", {
      method: "PATCH",
      body: JSON.stringify({
        modelId: " model-1 ",
        isEnabled: true,
        speechSpeed: 1.12,
        version: 3,
        changeReason: " 切换图片模型 ",
      }),
    }) as never,
    { params: Promise.resolve({ settingId: "setting-1" }) },
  )
  const payload = await response.json()

  assert.equal(response.status, 200)
  assert.equal(payload.data.setting.version, 4)
})

test("media attachments route parses kind and date range filter", async () => {
  const handler = createAdminAIMediaAttachmentListGetHandler({
    getRequestAdmin: async () => okAdmin,
    getAdminAIMediaAttachments: async (filters) => {
      assert.deepEqual(filters, {
        adminAccountId: "admin-1",
        kind: "audio",
        dateRange: "30d",
        page: 2,
        limit: 10,
      })
      return {
        items: [],
        total: 0,
        page: 2,
        limit: 10,
      }
    },
  })

  const response = await handler(
    new Request("http://localhost/api/admin/ai/media/attachments?kind=audio&dateRange=30d&page=2&limit=10") as never,
  )
  const payload = await response.json()

  assert.equal(response.status, 200)
  assert.equal(payload.data.page, 2)
})
