import test from "node:test"
import assert from "node:assert/strict"

import { createLearningAttachmentPostHandler } from "../server/modules/learning/route-handler.ts"

function createFormRequest(formData: FormData) {
  return {
    formData: async () => formData,
  }
}

test("learning attachment route returns 401 when unauthenticated", async () => {
  const handler = createLearningAttachmentPostHandler({
    getRequestAuth: async () => null,
    getRequestAuthHelpText: () => "请先登录后再继续。",
    createLearningMessageAttachment: async () => {
      throw new Error("should not upload without auth")
    },
  })

  const formData = new FormData()
  formData.set("kind", "image")
  formData.set("file", new File(["image"], "screen.png", { type: "image/png" }))

  const response = await handler(createFormRequest(formData))

  assert.equal(response.status, 401)
  assert.deepEqual(await response.json(), {
    code: "AUTH_REQUIRED",
    message: "请先登录后再继续。",
    data: null,
  })
})

test("learning attachment route rejects unsupported image type", async () => {
  const handler = createLearningAttachmentPostHandler({
    getRequestAuth: async () => ({ userId: "user-1" }),
    getRequestAuthHelpText: () => "ignored",
    createLearningMessageAttachment: async () => {
      throw new Error("should not upload invalid file")
    },
  })

  const formData = new FormData()
  formData.set("kind", "image")
  formData.set("file", new File(["image"], "screen.gif", { type: "image/gif" }))

  const response = await handler(createFormRequest(formData))

  assert.equal(response.status, 422)
  assert.deepEqual(await response.json(), {
    code: "VALIDATION_FAILED",
    message: "图片仅支持 JPG、PNG、WebP 格式。",
    data: null,
  })
})

test("learning attachment route rejects audio longer than 60 seconds", async () => {
  const handler = createLearningAttachmentPostHandler({
    getRequestAuth: async () => ({ userId: "user-1" }),
    getRequestAuthHelpText: () => "ignored",
    createLearningMessageAttachment: async () => {
      throw new Error("should not upload too long audio")
    },
  })

  const formData = new FormData()
  formData.set("kind", "audio")
  formData.set("durationMs", "61000")
  formData.set("file", new File(["audio"], "voice.webm", { type: "audio/webm" }))

  const response = await handler(createFormRequest(formData))

  assert.equal(response.status, 422)
  assert.deepEqual(await response.json(), {
    code: "VALIDATION_FAILED",
    message: "单条语音不能超过 60 秒。",
    data: null,
  })
})

test("learning attachment route passes valid image metadata to service", async () => {
  const handler = createLearningAttachmentPostHandler({
    getRequestAuth: async () => ({ userId: "user-1" }),
    getRequestAuthHelpText: () => "ignored",
    createLearningMessageAttachment: async (userId, input) => {
      assert.equal(userId, "user-1")
      assert.equal(input.kind, "image")
      assert.equal(input.file.name, "screen.png")
      assert.equal(input.sessionId, "session-1")
      assert.equal(input.width, 1200)
      assert.equal(input.height, 800)
      return {
        attachment: {
          id: "attachment-1",
          kind: "image",
          processingStatus: "pending",
          originalFilename: "screen.png",
          mimeType: "image/png",
          sizeBytes: 5,
          durationMs: null,
          width: 1200,
          height: 800,
          createdAt: "2026-05-13T00:00:00.000Z",
        },
      }
    },
  })

  const formData = new FormData()
  formData.set("kind", "image")
  formData.set("sessionId", "session-1")
  formData.set("width", "1200")
  formData.set("height", "800")
  formData.set("file", new File(["image"], "screen.png", { type: "image/png" }))

  const response = await handler(createFormRequest(formData))
  const payload = await response.json()

  assert.equal(response.status, 200)
  assert.equal(payload.code, "OK")
  assert.equal(payload.data.attachment.id, "attachment-1")
})
